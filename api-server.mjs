import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

function loadLocalEnv() {
  if (!existsSync('.env.local')) return;
  const lines = readFileSync('.env.local', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const PORT = Number(process.env.PORT || process.env.API_PORT || 5174);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const IMAGE_API_PROVIDER = process.env.IMAGE_API_PROVIDER || (GEMINI_API_KEY ? 'gemini' : OPENAI_API_KEY ? 'openai' : 'gemini');
const MAX_BODY_BYTES = 18 * 1024 * 1024;
const GENERATED_IMAGE_DIR = resolve(process.env.GENERATED_IMAGE_DIR || 'generated-images');
const EXPORT_DIR = resolve(process.env.EXPORT_DIR || 'exports');
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on('data', (chunk) => {
      size += chunk.byteLength;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });

    request.on('error', reject);
  });
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('sourceImageDataUrl must be a base64 data URL');
  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  return new Blob([buffer], { type: mimeType });
}

function dataUrlToInlineData(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('sourceImageDataUrl must be a base64 data URL');
  return {
    mimeType: match[1],
    base64: match[2]
  };
}

async function imageInputToInlineData(input) {
  const value = typeof input === 'string'
    ? input
    : input?.dataUrl || input?.sourceImageDataUrl || input?.imageDataUrl || input?.imageUrl || '';
  if (!value) throw new Error('Image input is empty');
  if (value.startsWith('data:')) return dataUrlToInlineData(value);
  const response = await fetch(value);
  if (!response.ok) throw new Error(`Unable to read image URL: ${value}`);
  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    mimeType,
    base64: buffer.toString('base64')
  };
}

async function imageInputToBlob(input) {
  const { mimeType, base64 } = await imageInputToInlineData(input);
  return new Blob([Buffer.from(base64, 'base64')], { type: mimeType });
}

function getImageExtension(mimeType = 'image/jpeg') {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function createStoredZip(entries = []) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = getDosDateTime();

  entries.forEach((entry) => {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const checksum = crc32(data);
    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(dosTime),
      uint16(dosDate),
      uint32(checksum),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBuffer.length),
      uint16(0),
      nameBuffer
    ]);
    localParts.push(localHeader, data);
    centralParts.push(Buffer.concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(dosTime),
      uint16(dosDate),
      uint32(checksum),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBuffer.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      nameBuffer
    ]));
    offset += localHeader.length + data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0)
  ]);
  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function sanitizeFilenamePart(value = '') {
  return String(value || '')
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'image';
}

function saveGeneratedImageFile({ imageDataUrl, projectName, slotId, runId }) {
  const match = /^data:(.+?);base64,(.+)$/.exec(imageDataUrl || '');
  if (!match) throw new Error('imageDataUrl must be a base64 data URL');
  const [, mimeType, base64] = match;
  mkdirSync(GENERATED_IMAGE_DIR, { recursive: true });
  const extension = getImageExtension(mimeType);
  const filename = [
    sanitizeFilenamePart(projectName || 'listingflow'),
    `slot-${String(slotId || 'x').padStart(2, '0')}`,
    sanitizeFilenamePart(runId || Date.now())
  ].join('-') + `.${extension}`;
  const filePath = join(GENERATED_IMAGE_DIR, filename);
  writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return {
    filename,
    filePath,
    imageUrl: `${PUBLIC_BASE_URL}/generated/${encodeURIComponent(filename)}`
  };
}

function serveGeneratedImage(request, response) {
  const url = new URL(request.url, PUBLIC_BASE_URL);
  const rawName = decodeURIComponent(url.pathname.replace('/generated/', ''));
  const filename = rawName.replace(/[\\/]/g, '');
  const filePath = resolve(GENERATED_IMAGE_DIR, filename);
  if (!filePath.startsWith(GENERATED_IMAGE_DIR) || !existsSync(filePath)) {
    sendJson(response, 404, { ok: false, error: 'Generated image not found' });
    return;
  }
  const extension = extname(filePath).toLowerCase();
  const contentType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  response.writeHead(200, {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': contentType
  });
  response.end(readFileSync(filePath));
}

function saveExportFile({ filename, content = '', mimeType = 'text/plain;charset=utf-8' }) {
  mkdirSync(EXPORT_DIR, { recursive: true });
  const extension = extname(filename || '') || '.txt';
  const baseName = sanitizeFilenamePart(String(filename || 'export').replace(extension, ''));
  const safeFilename = `${baseName}${extension.toLowerCase()}`;
  const filePath = resolve(EXPORT_DIR, safeFilename);
  if (!filePath.startsWith(EXPORT_DIR)) {
    throw new Error('Invalid export filename');
  }
  writeFileSync(filePath, String(content), 'utf8');
  return {
    filename: safeFilename,
    filePath,
    fileUrl: `${PUBLIC_BASE_URL}/exports/${encodeURIComponent(safeFilename)}`,
    mimeType
  };
}

function serveExportFile(request, response) {
  const url = new URL(request.url, PUBLIC_BASE_URL);
  const rawName = decodeURIComponent(url.pathname.replace('/exports/', ''));
  const filename = rawName.replace(/[\\/]/g, '');
  const filePath = resolve(EXPORT_DIR, filename);
  if (!filePath.startsWith(EXPORT_DIR) || !existsSync(filePath)) {
    sendJson(response, 404, { ok: false, error: 'Export file not found' });
    return;
  }
  response.writeHead(200, {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Type': filename.endsWith('.zip')
      ? 'application/zip'
      : filename.endsWith('.csv')
        ? 'text/csv;charset=utf-8'
        : filename.endsWith('.json')
          ? 'application/json;charset=utf-8'
          : 'text/plain;charset=utf-8'
  });
  response.end(readFileSync(filePath));
}

function getGeneratedImagePathFromPayload(image = {}) {
  const candidates = [
    image.imageFilePath,
    image.filePath,
    image.imageFilename ? join(GENERATED_IMAGE_DIR, image.imageFilename) : '',
    image.filename ? join(GENERATED_IMAGE_DIR, image.filename) : ''
  ].filter(Boolean);

  if (image.imageUrl || image.imageSrc) {
    try {
      const url = new URL(image.imageUrl || image.imageSrc);
      if (url.pathname.startsWith('/generated/')) {
        const filename = decodeURIComponent(url.pathname.replace('/generated/', '')).replace(/[\\/]/g, '');
        candidates.push(join(GENERATED_IMAGE_DIR, filename));
      }
    } catch {
      // Ignore non-URL values.
    }
  }

  const found = candidates
    .map((candidate) => resolve(candidate))
    .find((candidate) => candidate.startsWith(GENERATED_IMAGE_DIR) && existsSync(candidate));
  if (!found) return null;
  return found;
}

function saveImagesZipFile({ projectName = 'listingflow', images = [] }) {
  mkdirSync(EXPORT_DIR, { recursive: true });
  const entries = images.map((image, index) => {
    const filePath = getGeneratedImagePathFromPayload(image);
    if (!filePath) return null;
    const extension = extname(filePath).toLowerCase() || '.jpg';
    const slot = String(image.slotId || index + 1).padStart(2, '0');
    const title = sanitizeFilenamePart(image.title || image.slotTitle || `image-${slot}`);
    return {
      name: `${slot}-${title}${extension}`,
      data: readFileSync(filePath)
    };
  }).filter(Boolean);

  if (!entries.length) {
    throw new Error('No saved generated images found for ZIP export');
  }

  const zipBuffer = createStoredZip(entries);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${sanitizeFilenamePart(projectName)}-images-${timestamp}.zip`;
  const filePath = resolve(EXPORT_DIR, filename);
  if (!filePath.startsWith(EXPORT_DIR)) {
    throw new Error('Invalid ZIP export filename');
  }
  writeFileSync(filePath, zipBuffer);
  return {
    filename,
    filePath,
    fileUrl: `${PUBLIC_BASE_URL}/exports/${encodeURIComponent(filename)}`,
    count: entries.length
  };
}

function extractJsonObject(text = '') {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('AI did not return text.');
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  const candidate = fenced?.[1] || trimmed;
  const start = candidate.indexOf('{');
  if (start === -1) {
    throw new Error('AI response did not contain a JSON object.');
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < candidate.length; index += 1) {
    const char = candidate[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return JSON.parse(candidate.slice(start, index + 1));
    }
  }
  throw new Error('AI response JSON object was incomplete.');
}

function normalizeStringArray(value, limit = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeBrandColorList(colors = []) {
  if (!Array.isArray(colors)) return [];
  return colors
    .map((color) => {
      if (typeof color === 'string') return color.trim();
      const hex = String(color?.hex || '').trim().toUpperCase();
      const ratio = Number(color?.ratio || 0);
      if (!/^#[0-9A-F]{6}$/.test(hex)) return '';
      return `${hex} ${Math.min(100, Math.max(1, ratio || 1))}%`;
    })
    .filter(Boolean)
    .slice(0, 8);
}

function formatBrandPaletteForPrompt(brand = {}) {
  const colors = normalizeBrandColorList(brand.colors);
  return colors.length ? colors.join(', ') : 'no brand colors configured';
}

function getDefaultVisualProof(visualType = 'benefits', primaryClaim = '') {
  const claimText = primaryClaim ? `"${primaryClaim}"` : 'the primary claim';
  const map = {
    main: 'Use the clean white-background product view to prove real product appearance and structure only.',
    benefits: `Use visible product parts, layout callouts, or simple comparison cues to prove ${claimText}; do not rely on text alone.`,
    lifestyle: `Use a physically believable real use scene to prove ${claimText} through product placement, scale, action, and context.`,
    detail: `Use a close-up of the exact material, part, texture, finish, accessory, or construction detail that proves ${claimText}.`,
    state: `Use a confirmed product state, operation, before/after, fold/open, storage, or setup view to prove ${claimText}.`,
    structure: `Use real product structure, labels, component relationships, or supported cutaway-style layout to prove ${claimText}.`,
    dimensions: `Use confirmed dimensions, capacity, package contents, or accessory layout to prove ${claimText}; do not invent numbers.`
  };
  return map[visualType] || `Make the image visually prove ${claimText}, not merely mention it as text.`;
}

const slotQualityGuardrails = {
  main: 'Primary image must preserve the original product as the hero on pure white, with no text, props, badges, lifestyle scene, colored background, or added accessories.',
  benefits: 'Core benefits image may use no more than three short English callouts; each must point to a visible product feature or visually demonstrated benefit, not become a text poster.',
  lifestyle: 'Lifestyle image must prove the primary claim through real use, believable scale, natural contact points, and correct product placement.',
  detail: 'Detail image must show the exact part, material, texture, finish, accessory, or construction detail that proves the primary claim; do not invent hidden layers or parts.',
  state: 'Function-state image may only show states proven by uploaded references or confirmed facts; never invent open, folded, assembled, transformed, or storage states.',
  structure: 'Structure image labels must point to real visible components and must not use unsupported performance or safety claims as component labels.',
  dimensions: 'Dimensions image may only show confirmed dimensions, capacity, counts, and included items; never invent numbers, sizes, weights, temperatures, or compatibility.'
};
const roleTypeToVisualType = {
  main: 'main',
  hero_with_claim: 'benefits',
  feature_callout: 'benefits',
  scale_human_ref: 'lifestyle',
  dimension_spec: 'dimensions',
  material_macro: 'detail',
  use_scenario: 'lifestyle',
  comparison: 'structure',
  before_after: 'state',
  bundle_contents: 'dimensions',
  durability_proof: 'structure',
  cleaning_ease: 'lifestyle',
  safety_cert: 'structure',
  benefits: 'benefits',
  lifestyle: 'lifestyle',
  detail: 'detail',
  state: 'state',
  structure: 'structure',
  dimensions: 'dimensions'
};
const visualTypeFallbackOrder = ['main', 'benefits', 'lifestyle', 'detail', 'state', 'structure', 'dimensions'];

function normalizeVisualType(slot = {}, index = 0) {
  const raw = String(slot.roleType || slot.visualType || '').trim();
  if (roleTypeToVisualType[raw]) return roleTypeToVisualType[raw];
  if (slotQualityGuardrails[raw]) return raw;
  return visualTypeFallbackOrder[index] || 'benefits';
}

function getSlotQualityGuardrailText(visualType = 'benefits') {
  return slotQualityGuardrails[visualType] || slotQualityGuardrails.benefits;
}

function getNoPrimaryClaimInstruction(visualType = 'benefits') {
  if (visualType === 'dimensions') {
    return 'No confirmed specification claim is assigned. Do not create dimension numbers; use a spec-free internal review layout only.';
  }
  if (visualType === 'state') {
    return 'No confirmed function-state claim is assigned. Do not invent open, closed, folded, assembled, transformed, or storage states.';
  }
  if (visualType === 'structure') {
    return 'No confirmed structure claim is assigned. Keep labels limited to visible product parts only.';
  }
  return 'No primary claim is assigned yet. Keep the concept conservative and avoid unsupported visible copy.';
}

const listingImageStrategyRules = [
  'First principle: each image must visually prove the selected selling point. Use scene, product detail, physical state, comparison, scale, or structure as evidence before relying on explanatory text.',
  'Minimize visible explanatory copy. Text is allowed when it improves clarity, but the image must not become a text poster. Prefer one short English title or a few short labels over paragraphs.',
  'Blocked or forbidden claims must not be stated, suggested, implied, staged, symbolized, or visually hinted as a benefit. Neutral factual product appearance or ordinary use is allowed only when it does not communicate the blocked claim.',
  'For standard listing images, if an image includes a title, place the title consistently at the top of the image. A+ content is an exception: title placement may follow the module layout and does not have to be at the top.',
  'Across all seven standard listing images, maintain one unified visual system: consistent typography, title placement, label style, spacing, icon/callout treatment, lighting quality, and ecommerce art direction. A+ should follow the selected brand system but may use richer section layouts.'
];

function getListingImageStrategyText() {
  return listingImageStrategyRules.join(' ');
}

function normalizeStoryboardPlan(plan, payload) {
  const slots = Array.isArray(plan?.slots) ? plan.slots : [];
  if (slots.length !== 7) throw new Error('AI plan must contain exactly 7 slots.');
  const outputPresetId = payload?.outputPresetId || payload?.projectForm?.planOutputPresetId || 'main-image';
  const isAPlusOutput = outputPresetId === 'aplus';
  const blockedClaims = normalizeStringArray(payload?.ledgerFacts
    ?.filter((fact) => fact.state === 'blocked' || fact.allowed === false)
    ?.map((fact) => fact.claim), 12);

  return slots.map((slot, index) => {
    const id = index + 1;
    const usableClaims = normalizeStringArray(slot.usableClaims, isAPlusOutput ? 3 : id === 1 ? 1 : 3);
    const needsEvidence = normalizeStringArray(slot.needsEvidence, 3);
    const reviewClaims = normalizeStringArray(slot.reviewClaims, 3);
    const guardrails = normalizeStringArray(slot.guardrails, 4);
    const visualType = !isAPlusOutput && id === 1 ? 'main' : normalizeVisualType(slot, index);
    const roleType = String(slot.roleType || slot.visualType || visualType).trim();
    const primaryClaim = String(slot.primaryClaim || usableClaims[0] || needsEvidence[0] || '').trim();
    const visualProof = String(slot.visualProof || slot.evidenceScene || '').trim()
      || getDefaultVisualProof(visualType, primaryClaim);
    const status = needsEvidence.length || reviewClaims.length
      ? 'needs_review'
      : usableClaims.length || (!isAPlusOutput && id === 1)
        ? 'ready'
        : 'needs_claims';
    const title = String(slot.title || `Image ${id}`).trim();
    const goal = String(slot.goal || '图片方案').trim();
    const composition = String(slot.composition || '根据产品参考图和 Ledger 生成电商图片。').trim();
    return {
      id,
      title,
      goal,
      composition,
      outputPresetId,
      outputPresetLabel: payload?.outputPresetLabel || (isAPlusOutput ? 'A+' : '主图'),
      outputPresetSize: payload?.outputPresetSize || (isAPlusOutput ? '1464 x 600' : '2000 x 2000'),
      roleType,
      visualType,
      productType: String(plan?.productType || 'ai-detected-product').trim(),
      brandId: String(payload?.brandProfile?.id || payload?.projectForm?.brandId || 'none').trim(),
      brandName: String(payload?.brandProfile?.name || payload?.projectForm?.brandName || '').trim(),
      productName: String(plan?.productName || payload?.projectForm?.productName || payload?.projectForm?.projectName || 'Current product').trim(),
      usableClaims,
      needsEvidence,
      primaryClaim,
      visualProof,
      reviewClaims,
      blockedClaims,
      status,
      guardrails: guardrails.length ? guardrails : ['产品结构必须与参考图一致', '不使用 Ledger 之外的卖点'],
      promptBrief: [
        `Use the locked original product reference for ${plan?.productName || payload?.projectForm?.productName || payload?.projectForm?.projectName || 'the product'}.`,
        isAPlusOutput
          ? 'Output type: Amazon A+ content module. Do not use the primary white-background rule. Headings may follow the module layout. Related allowed Ledger claims may be combined into richer content blocks.'
          : 'Output type: Standard Amazon listing image set. Slot 01 is the white-background main image; standard listing images keep title placement and visual system consistent.',
        `Listing image strategy rules: ${getListingImageStrategyText()}`,
        composition,
        primaryClaim ? `Primary claim to prove visually: ${primaryClaim}.` : getNoPrimaryClaimInstruction(visualType),
        `Visual proof plan: ${visualProof}`,
        `Slot quality guardrail: ${getSlotQualityGuardrailText(visualType)}.`,
        usableClaims.length ? `Allowed claims: ${usableClaims.join('; ')}.` : 'No allowed claims assigned yet.',
        needsEvidence.length ? `Claims needing evidence before final export: ${needsEvidence.join('; ')}.` : '',
        blockedClaims.length ? `Do not mention or imply: ${blockedClaims.join('; ')}.` : '',
        guardrails.join('; ')
      ].filter(Boolean).join(' '),
      plannerSource: 'gemini'
    };
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeReviewStatus(value) {
  return ['pass', 'warn', 'fail'].includes(value) ? value : 'warn';
}

function normalizeAiImageReview(review = {}) {
  const checks = review.checks && typeof review.checks === 'object' ? review.checks : {};
  const normalizedChecks = {
    productConsistency: normalizeReviewStatus(checks.productConsistency),
    scalePhysicalLogic: normalizeReviewStatus(checks.scalePhysicalLogic),
    claimAccuracy: normalizeReviewStatus(checks.claimAccuracy),
    textRisk: normalizeReviewStatus(checks.textRisk),
    aesthetics: normalizeReviewStatus(checks.aesthetics)
  };
  const failCount = Object.values(normalizedChecks).filter((status) => status === 'fail').length;
  const warnCount = Object.values(normalizedChecks).filter((status) => status === 'warn').length;
  const explicitVerdict = ['pass', 'warn', 'fail'].includes(review.verdict) ? review.verdict : '';
  const verdict = failCount ? 'fail' : warnCount ? 'warn' : explicitVerdict || 'pass';
  return {
    verdict,
    score: clampNumber(review.score, 0, 100, verdict === 'pass' ? 82 : verdict === 'warn' ? 58 : 32),
    summary: String(review.summary || '').trim() || 'AI 已完成预审，请结合人工判断确认。',
    checks: normalizedChecks,
    issues: normalizeStringArray(review.issues, 8),
    recommendedAction: String(review.recommendedAction || '').trim() || (verdict === 'pass' ? '可进入人工复核。' : '建议先修改或重生候选图。')
  };
}

function buildStoryboardPlannerPrompt(payload) {
  const project = payload.projectForm || {};
  const brand = payload.brandProfile || {};
  const ledgerFacts = Array.isArray(payload.ledgerFacts) ? payload.ledgerFacts : [];
  const strategyRules = normalizeStringArray(payload.strategyRules, 8);
  const outputPresetId = payload.outputPresetId || project.planOutputPresetId || 'main-image';
  const isAPlusOutput = outputPresetId === 'aplus';
  const ledgerText = ledgerFacts.map((fact, index) => (
    `${index + 1}. ${fact.claim} | state=${fact.state || 'review'} | allowed=${fact.allowed !== false} | source=${fact.source || 'unknown'} | owner=${fact.owner || 'unknown'}`
  )).join('\n');

  return [
    'You are an Amazon ecommerce image strategist.',
    isAPlusOutput
      ? 'Generate a product-specific 7-module Amazon A+ content plan from the uploaded product image and the Ledger facts.'
      : 'Generate a product-specific 7-image listing plan from the uploaded product image and the Ledger facts.',
    `Selected output type: ${payload.outputPresetLabel || (isAPlusOutput ? 'A+' : '主图')} ${payload.outputPresetSize || (isAPlusOutput ? '1464 x 600' : '2000 x 2000')}.`,
    strategyRules.length ? `User-defined listing strategy rules: ${strategyRules.join(' ')}` : `Default listing strategy rules: ${getListingImageStrategyText()}`,
    isAPlusOutput
      ? 'Use an A+ module strategy: all seven slots are A+ content modules. Slot 1 is not a white-background main image; it should be a brand/product hero module or strongest content opening.'
      : 'Use an anchor + dynamic role strategy: slot 1 is fixed as the Amazon white-background main image; slots 2-7 must be selected dynamically from the role pool that best fits this product and Ledger.',
    isAPlusOutput
      ? 'Role pool for A+ modules: brand_hero, benefit_story, lifestyle_module, detail_proof, function_module, structure_specs, bundle_contents, comparison, care_guide, trust_proof.'
      : 'Role pool for slots 2-7: hero_with_claim, feature_callout, scale_human_ref, dimension_spec, material_macro, use_scenario, comparison, before_after, bundle_contents, durability_proof, cleaning_ease, safety_cert.',
    'Do not force fixed image roles such as benefits/lifestyle/details/dimensions unless they genuinely fit the product and Ledger.',
    'Infer the actual product category from the image, product name, category, and claims, then choose the most useful six secondary image roles for this product.',
    'The plan must work for any product category. If the product is cookware, furniture, toy, tool, home decor, pet, outdoor, electronics, apparel, storage, lighting, beauty, or another category, adapt the image roles accordingly.',
    'Use only facts from the Ledger and visible product image. Do not invent dimensions, certifications, compatibility, materials, safety claims, included accessories, or performance claims.',
    'Ledger facts and user keywords may be written in Chinese, English, or mixed language. Understand them semantically.',
    'Core strategy for every slot: prove the selling point primarily through the image itself. The visual evidence may be the product detail, scene action, physical state, scale, structure, comparison, or verified specification layout.',
    'Use as little visible explanatory copy as possible while preserving clarity. Text is allowed, but the image should not become a poster full of words.',
    'If any final image slot includes visible copy, labels, badges, callouts, or claim text, that visible copy must be natural Amazon-ready English only. Never plan Chinese visible text for generated images.',
    isAPlusOutput
      ? 'For A+ output, headings are optional and may follow the module layout; they do not have to be at the top. Plan richer editorial modules with brand consistency, product evidence, and clean hierarchy.'
      : 'For standard listing output, if a slot uses a title, the title must sit at the top of the image.',
    isAPlusOutput
      ? 'A+ modules may combine related allowed Ledger claims, use allowed claims not assigned to the selected slot, and create richer content modules rather than strict one-claim listing images.'
      : 'Plan one unified 7-image visual system for standard listing output: consistent font style, font weight, title placement, label/callout treatment, spacing, lighting quality, icon style, and ecommerce art direction across the full set.',
    'Plan text as part of the generated image composition itself. Typography, callout positions, arrows, badges, and label hierarchy must be designed together with the product and scene, not added later as a separate overlay.',
    'Visible text must point to, sit near, or clearly relate to the product feature, scene action, measurement, or visual evidence it describes.',
    'Blocked claims are not workaround opportunities. Do not state, imply, hint, symbolize, stage, or visually suggest blocked claims as benefits. You may only show neutral factual product appearance or ordinary use when it does not communicate a blocked claim.',
    'Every slot should be visually different in intent. Avoid seven duplicate product-only images or repeated role types.',
    'Do not cram unlimited claims into images. Treat the Ledger as the raw source, then select a concise image claim pool.',
    'If there are more than 7 useful claims, cluster related claims into benefit themes and assign only the strongest themes to the 7 slots.',
    isAPlusOutput
      ? 'Each A+ module must have one anchor primaryClaim plus up to two related supporting usableClaims when they strengthen the content story.'
      : 'Each image slot must have exactly one primaryClaim that the image is designed to prove, plus at most two supporting usableClaims.',
    'Every slot must include visualProof: a concrete explanation of how the composition, scene, detail, state, or layout visually proves the primaryClaim. The image should prove the benefit, not merely decorate the product or display text.',
    'When a dimensions/specifications image is useful, it may only use confirmed dimensions, capacity, counts, package contents, or included accessories. If none exist, choose a different image role instead of forcing a dimensions slot.',
    'When a function-state image is useful, it may only use confirmed open, folded, assembled, stored, installed, or operation facts. If none exist, choose a different image role instead of forcing a state slot.',
    'When details or structure images are useful, prefer visible parts and construction facts over broad marketing claims.',
    isAPlusOutput
      ? 'A+ mode: no slot is required to be product-only on pure white. Backgrounds may use brand color fields, lifestyle scenes, detail panels, comparison bands, or editorial layouts when they support allowed claims.'
      : 'Only slot 1, the Amazon primary image, must be product-only on a pure white background with no text, props, badges, scene, or colored background.',
    isAPlusOutput
      ? 'A+ modules should feel richer than standard listing images while staying readable, truthful, and product-led.'
      : 'Slots 2-7 are secondary listing images. They may use clean backgrounds, brand color backgrounds, soft layout blocks, or realistic use-scene backgrounds when the background helps communicate a supported selling point.',
    'A realistic scene must match the actual product use case and physical scale. Do not use decorative stock-like backgrounds that do not explain a benefit.',
    'Return JSON only. No markdown.',
    '',
    `Project name: ${project.projectName || ''}`,
    `Product name: ${project.productName || ''}`,
    `Category: ${project.category || ''}`,
    `SKU: ${project.sku || ''}`,
    '',
    'Brand profile:',
    `Brand: ${brand.name || project.brandName || 'No brand selected'}`,
    `Visual tone: ${brand.tone || 'not specified'}`,
    `Internal HEX color palette with usage ratios, not visible content: ${formatBrandPaletteForPrompt(brand)}`,
    'When planning brand-mode images, use the configured HEX colors only as hidden art-direction constraints for intentional background blocks, labels, icons, callouts, and graphic accents. Do not invent extra brand colors; neutral text colors are allowed only for legibility.',
    'Never plan visible palette displays. Do not render HEX codes, color percentages, color swatch cards, palette legends, design-token labels, or style-guide panels in the final image.',
    `Background policy: ${brand.backgroundPolicy || 'not specified'}`,
    `Preferred scenes: ${Array.isArray(brand.scenes) ? brand.scenes.join(', ') : brand.scenes || 'not specified'}`,
    `Forbidden visual styles: ${Array.isArray(brand.forbiddenStyles) ? brand.forbiddenStyles.join(', ') : brand.forbiddenStyles || 'not specified'}`,
    `Logo usage: ${brand.logoPolicy || 'Logo is allowed only in A+ mode. Never plan a logo for main-image output or non-A+ listing images.'}`,
    'If a logo exists, it may be planned only for A+ output. For all non-A+ listing images, do not display, imitate, or invent a logo.',
    `Style rules: ${Array.isArray(brand.styleRules) ? brand.styleRules.join('; ') : brand.styleRules || 'Keep ecommerce visuals clean, realistic, and product-led.'}`,
    '',
    'Ledger facts:',
    ledgerText || 'No Ledger facts provided.',
    '',
    'JSON shape:',
    JSON.stringify({
      productType: 'short detected category',
      productName: 'clean product name',
      slots: [
        {
          id: 1,
          title: 'short English title',
          goal: 'short Chinese goal',
          roleType: 'main | hero_with_claim | feature_callout | scale_human_ref | dimension_spec | material_macro | use_scenario | comparison | before_after | bundle_contents | durability_proof | cleaning_ease | safety_cert | brand_hero | benefit_story | lifestyle_module | detail_proof | function_module | structure_specs | care_guide | trust_proof',
          visualType: 'main | benefits | lifestyle | detail | state | structure | dimensions',
          composition: 'Chinese visual direction',
          primaryClaim: 'single most important claim this slot proves',
          visualProof: 'Chinese explanation of how the image visually proves the primary claim',
          usableClaims: ['claims allowed in image'],
          needsEvidence: ['claims that need evidence before final export'],
          reviewClaims: ['uncertain claims to review'],
          guardrails: ['specific restrictions for this slot']
        }
      ]
    })
  ].join('\n');
}

async function planStoryboardWithGemini(payload) {
  if (!GEMINI_API_KEY) {
    return {
      ok: false,
      status: 401,
      error: '本地 API 服务没有配置 GEMINI_API_KEY。请先在 .env.local 里设置 Gemini API key。'
    };
  }

  const { sourceImageDataUrl } = payload;
  if (!sourceImageDataUrl) {
    return {
      ok: false,
      status: 400,
      error: '缺少产品参考图，无法生成 7 图方案。'
    };
  }

  const { mimeType, base64 } = dataUrlToInlineData(sourceImageDataUrl);
  const startedAt = Date.now();
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: buildStoryboardPlannerPrompt(payload) },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    }
  );
  const requestId = geminiResponse.headers.get('x-request-id') || geminiResponse.headers.get('x-goog-request-id');
  const result = await geminiResponse.json().catch(() => ({}));

  if (!geminiResponse.ok) {
    return {
      ok: false,
      status: geminiResponse.status,
      requestId,
      error: result?.error?.message || 'Gemini planner API returned an error.'
    };
  }

  const text = result?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || '';
  const plan = extractJsonObject(text);
  return {
    ok: true,
    status: 200,
    provider: 'gemini',
    requestId,
    model: GEMINI_TEXT_MODEL,
    durationMs: Date.now() - startedAt,
    productType: plan.productType || '',
    productName: plan.productName || '',
    briefs: normalizeStoryboardPlan(plan, payload)
  };
}

function buildImageReviewPrompt(payload) {
  const brief = payload.brief || {};
  const run = payload.run || {};
  const isAPlusOutput = String(run.outputPresetId || '').includes('aplus') || String(run.outputPresetLabel || '').includes('A+');
  const isWhiteMainImage = Number(run.slotId || brief.id || 0) === 1 && String(run.outputPresetLabel || '').includes('主图');
  return [
    'You are an AI pre-reviewer for Amazon ecommerce image production.',
    'Compare the generated candidate image against the uploaded original product reference images and the slot brief.',
    'Act as a strict production gate, not a helpful copywriter. A false pass is worse than a false rejection.',
    'Your job is to flag every visible risk before humans spend time reviewing. Be strict about product drift, impossible physics, wrong scale, invented parts, unsupported claims, non-English visible copy, garbled text, and internal prompt leakage.',
    'Judge the candidate image itself. Prompt intent cannot excuse a visual mismatch. If you are uncertain, use warn or fail, never pass.',
    'Do not approve an image just because it looks attractive. Product consistency, physical logic, and visual proof come first.',
    'Return JSON only. No markdown.',
    '',
    `Slot: ${run.slotTitle || brief.title || ''}`,
    `Output preset: ${run.outputPresetLabel || ''} ${run.outputPresetSize || ''}`,
    `Goal: ${brief.goal || ''}`,
    `Composition: ${brief.composition || ''}`,
    `Primary claim: ${brief.primaryClaim || ''}`,
    `Visual proof requirement: ${brief.visualProof || ''}`,
    `Allowed claims: ${normalizeStringArray(brief.usableClaims, 8).join('; ') || 'none'}`,
    `Needs evidence: ${normalizeStringArray(brief.needsEvidence, 8).join('; ') || 'none'}`,
    `Blocked claims: ${normalizeStringArray(brief.blockedClaims, 12).join('; ') || 'none'}`,
    `Prompt snapshot: ${String(run.prompt || payload.prompt || '').slice(0, 1800)}`,
    '',
    isAPlusOutput
      ? 'Background/layout rule: this is A+ content, not the Amazon primary image. It does not need a pure white background, and headings do not have to sit at the top. Richer editorial layout, brand color fields, lifestyle context, detail crops, and combined related allowed claims are acceptable if truthful and visually supported.'
      : isWhiteMainImage
      ? 'Background rule: slot 1 primary image must be product-only on pure white background, with no visible copy, props, badges, scene, or colored background. Non-white background, visible copy, added props, heavy shadow, crop, or product deformation is a fail.'
      : 'Background rule: this is a secondary listing image. Clean backgrounds, brand color backgrounds, soft layout blocks, or realistic use-scene backgrounds are allowed if they support a verified selling point and remain physically believable.',
    '',
    'Strict pass/fail policy:',
    '- PASS only if every check is pass and there are no visible concerns.',
    '- WARN if the image is mostly usable but has any uncertainty, weak visual proof, minor style issue, or possible mismatch.',
    '- FAIL if any core issue appears: product drift, impossible physical logic, invented/missing parts, unsupported or blocked claim, unreadable or risky text, internal prompt metadata, or main-image rule violation.',
    '- If any check is fail, the overall verdict must be fail. If no check fails but any check is warn, the overall verdict must be warn. Only all-pass checks may return pass.',
    '- Score bands: pass = 80-100, warn = 45-79, fail = 0-44.',
    '',
    'Review dimensions:',
    '1. productConsistency: Does the candidate preserve product silhouette, part count, structure, material, color family, hardware, fold/open state, and proportions from the references? Changed shape, missing/extra parts, wrong material/color, or wrong product identity is a fail.',
    '2. scalePhysicalLogic: Are scale, contact points, shadows, scene placement, use state, and physical logic believable? Floating parts, object intersections, impossible supports, strange perspective, wrong human/product scale, or arrows that imply impossible motion are fail/warn risks.',
    '3. claimAccuracy: Are visible claims and visual implications supported by the brief/Ledger, and does the image actually prove the primary claim instead of merely stating it as text? Invented numbers, certifications, accessories, dimensions, blocked claims, or unproven benefits are fail risks.',
    '4. textRisk: Is any visible text, badge, logo, number, or claim garbled, misspelled, too tiny, invented, non-English, or risky? Final generated image copy must be short English only; Chinese visible text is a fail unless it is part of a photographed product label in the original reference.',
    '4b. promptLeakRisk: Visible internal prompt metadata is a fail. Fail textRisk if the image shows HEX color codes, color usage percentages, palette swatches, color cards, design-token labels, style-guide panels, prompt words, model notes, or generation instructions.',
    '5. aesthetics: Is the composition commercially usable without being too plain, cluttered, cheap-looking, badly cropped, off-brand, inconsistent with the image set, or polluted by internal design-guide graphics?',
    '',
    'Common failures to actively catch:',
    '- The product looks like a different SKU, has changed legs/handles/lid/frame/fasteners/fabric/finish, or no longer matches the reference.',
    '- The scene does not logically prove the selling point; it only uses a title or decorative callout.',
    '- The image contains color palette blocks, HEX codes, percentages, prompt fragments, model notes, or other behind-the-scenes production marks.',
    isAPlusOutput
      ? '- A+ layout failures: the module is cluttered, unreadable, visually cheap, uses unsupported claims, or combines unrelated claims without a clear content story.'
      : '- The layout is visually messy, the product is too small, important parts are cut off, or the set style/font/title placement is inconsistent.',
    isAPlusOutput
      ? '- Do not fail A+ just because it is not white-background or because its heading is not at the top; judge whether the richer module is truthful, readable, and commercially polished.'
      : '- Main image contains anything other than the product on a clean white background.',
    '',
    'Use status pass/warn/fail for each check and list every visible issue in the issues array. Avoid vague praise such as "looks good" unless all checks truly pass.',
    '',
    'JSON shape:',
    JSON.stringify({
      verdict: 'pass | warn | fail',
      score: 0,
      summary: 'one short Chinese sentence',
      checks: {
        productConsistency: 'pass | warn | fail',
        scalePhysicalLogic: 'pass | warn | fail',
        claimAccuracy: 'pass | warn | fail',
        textRisk: 'pass | warn | fail',
        aesthetics: 'pass | warn | fail'
      },
      issues: ['short Chinese issue labels'],
      recommendedAction: 'short Chinese next action'
    })
  ].join('\n');
}

async function reviewImageWithGemini(payload) {
  if (!GEMINI_API_KEY) {
    return {
      ok: false,
      status: 401,
      error: '本地 API 服务没有配置 GEMINI_API_KEY。请先在 .env.local 里设置 Gemini API key。'
    };
  }

  const { generatedImageDataUrl, sourceImages = [], sourceImageDataUrl } = payload;
  if (!generatedImageDataUrl || (!sourceImageDataUrl && !sourceImages.length)) {
    return {
      ok: false,
      status: 400,
      error: '缺少生成图或原始参考图，无法进行 AI 预审。'
    };
  }

  const normalizedImages = Array.isArray(sourceImages) && sourceImages.length
    ? sourceImages
    : [{ label: '主参考图', dataUrl: sourceImageDataUrl }];
  const referencePartGroups = await Promise.all(normalizedImages.map(async (image, index) => {
    const { mimeType, base64 } = await imageInputToInlineData(image);
    return [
      { text: `Original product reference ${index + 1}: ${image.label || image.name || 'product reference'}.` },
      {
        inline_data: {
          mime_type: mimeType,
          data: base64
        }
      }
    ];
  }));
  const referenceParts = referencePartGroups.flat();
  const generated = await imageInputToInlineData(generatedImageDataUrl);
  const startedAt = Date.now();
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: buildImageReviewPrompt(payload) },
            ...referenceParts,
            { text: 'Generated candidate image to review:' },
            {
              inline_data: {
                mime_type: generated.mimeType,
                data: generated.base64
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    }
  );
  const requestId = geminiResponse.headers.get('x-request-id') || geminiResponse.headers.get('x-goog-request-id');
  const result = await geminiResponse.json().catch(() => ({}));

  if (!geminiResponse.ok) {
    return {
      ok: false,
      status: geminiResponse.status,
      requestId,
      error: result?.error?.message || 'Gemini review API returned an error.'
    };
  }

  const text = result?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || '';
  const review = normalizeAiImageReview(extractJsonObject(text));
  return {
    ok: true,
    status: 200,
    provider: 'gemini',
    requestId,
    model: GEMINI_TEXT_MODEL,
    durationMs: Date.now() - startedAt,
    review
  };
}

async function generateWithGemini(payload) {
  if (!GEMINI_API_KEY) {
    return {
      ok: false,
      status: 401,
      error: '本地 API 服务没有配置 GEMINI_API_KEY。请先在 .env.local 里设置 Gemini API key。'
    };
  }

  const {
    prompt,
    sourceImageDataUrl,
    sourceImages = []
  } = payload;

  if (!prompt || (!sourceImageDataUrl && !sourceImages.length)) {
    return {
      ok: false,
      status: 400,
      error: '缺少 prompt 或 source image。'
    };
  }

  const normalizedImages = Array.isArray(sourceImages) && sourceImages.length
    ? sourceImages
    : [{ label: '主参考图', dataUrl: sourceImageDataUrl }];
  const imagePartGroups = await Promise.all(normalizedImages.map(async (image, index) => {
    const { mimeType, base64 } = await imageInputToInlineData(image);
    return [
      { text: `Reference image ${index + 1}: ${image.label || image.name || 'product reference'}. It shows the same product and must not be mixed into a new structure.` },
      {
        inline_data: {
          mime_type: mimeType,
          data: base64
        }
      }
    ];
  }));
  const imageParts = imagePartGroups.flat();
  const startedAt = Date.now();
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_IMAGE_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            ...imageParts
          ]
        }]
      })
    }
  );
  const requestId = geminiResponse.headers.get('x-request-id') || geminiResponse.headers.get('x-goog-request-id');
  const result = await geminiResponse.json().catch(() => ({}));

  if (!geminiResponse.ok) {
    return {
      ok: false,
      status: geminiResponse.status,
      requestId,
      error: result?.error?.message || 'Gemini image API returned an error.'
    };
  }

  const parts = result?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;
  const imageBase64 = inlineData?.data;
  const imageMimeType = inlineData?.mimeType || inlineData?.mime_type || 'image/png';
  const textPart = parts.find((part) => part.text)?.text || '';

  if (!imageBase64) {
    return {
      ok: false,
      status: 502,
      requestId,
      error: textPart || 'Gemini did not return an image.'
    };
  }

  return {
    ok: true,
    status: 200,
    provider: 'gemini',
    requestId,
    model: GEMINI_IMAGE_MODEL,
    durationMs: Date.now() - startedAt,
    imageDataUrl: `data:${imageMimeType};base64,${imageBase64}`,
    imageUrl: null,
    text: textPart
  };
}

async function generateWithOpenAI(payload) {
  if (!OPENAI_API_KEY) {
    return {
      ok: false,
      status: 401,
      error: '本地 API 服务没有配置 OPENAI_API_KEY。请先在 .env.local 里设置 OpenAI API key。'
    };
  }

  const {
    prompt,
    sourceImageDataUrl,
    sourceImages = [],
    slotTitle = 'amazon-listing-image',
    size = '1024x1024',
    quality = 'low'
  } = payload;

  if (!prompt || (!sourceImageDataUrl && !sourceImages.length)) {
    return {
      ok: false,
      status: 400,
      error: '缺少 prompt 或 source image。'
    };
  }

  const formData = new FormData();
  formData.append('model', IMAGE_MODEL);
  formData.append('prompt', prompt);
  formData.append('size', size);
  formData.append('quality', quality);
  const normalizedImages = Array.isArray(sourceImages) && sourceImages.length
    ? sourceImages
    : [{ label: 'main', dataUrl: sourceImageDataUrl }];
  for (const [index, image] of normalizedImages.entries()) {
    formData.append('image', await imageInputToBlob(image), `${slotTitle.replace(/\W+/g, '-').toLowerCase()}-${index + 1}.png`);
  }

  const startedAt = Date.now();
  const openaiResponse = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: formData
  });
  const requestId = openaiResponse.headers.get('x-request-id');
  const result = await openaiResponse.json().catch(() => ({}));

  if (!openaiResponse.ok) {
    return {
      ok: false,
      status: openaiResponse.status,
      requestId,
      error: result?.error?.message || 'OpenAI image API returned an error.'
    };
  }

  const firstImage = result?.data?.[0];
  const b64 = firstImage?.b64_json;
  const url = firstImage?.url;

  return {
    ok: true,
    status: 200,
    provider: 'openai',
    requestId,
    model: IMAGE_MODEL,
    durationMs: Date.now() - startedAt,
    imageDataUrl: b64 ? `data:image/png;base64,${b64}` : null,
    imageUrl: url || null
  };
}

async function generateImage(payload) {
  if (IMAGE_API_PROVIDER === 'openai') {
    return generateWithOpenAI(payload);
  }
  return generateWithGemini(payload);
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      provider: IMAGE_API_PROVIDER,
      model: IMAGE_API_PROVIDER === 'openai' ? IMAGE_MODEL : GEMINI_IMAGE_MODEL,
      plannerModel: GEMINI_TEXT_MODEL,
      reviewModel: GEMINI_TEXT_MODEL,
      hasApiKey: IMAGE_API_PROVIDER === 'openai' ? Boolean(OPENAI_API_KEY) : Boolean(GEMINI_API_KEY)
    });
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/generated/')) {
    serveGeneratedImage(request, response);
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/exports/')) {
    serveExportFile(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/plan-storyboard') {
    try {
      const payload = await readJsonBody(request);
      const result = await planStoryboardWithGemini(payload);
      sendJson(response, result.status || 200, result);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/api/review-image') {
    try {
      const payload = await readJsonBody(request);
      const result = await reviewImageWithGemini(payload);
      sendJson(response, result.status || 200, result);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/api/save-generated-image') {
    try {
      const payload = await readJsonBody(request);
      const result = saveGeneratedImageFile(payload);
      sendJson(response, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/api/save-export') {
    try {
      const payload = await readJsonBody(request);
      const result = saveExportFile(payload);
      sendJson(response, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/api/export-images-zip') {
    try {
      const payload = await readJsonBody(request);
      const result = saveImagesZipFile(payload);
      sendJson(response, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/generate-image') {
    sendJson(response, 404, { ok: false, error: 'Not found' });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const result = await generateImage(payload);
    sendJson(response, result.status || 200, result);
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown server error'
    });
  }
});

server.listen(PORT, () => {
  console.log(`ListingFlow image API server listening on port ${PORT}`);
  console.log(`Public API base URL: ${PUBLIC_BASE_URL}`);
});
