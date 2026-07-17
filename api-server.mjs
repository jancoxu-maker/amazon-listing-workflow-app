import http from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createDatabase } from './server/database.mjs';
import { createStage1Store, getBearerToken, Stage1Error } from './server/stage1-store.mjs';
import { createAssetStorage } from './server/asset-storage.mjs';
import { createGenerationTaskStore } from './server/generation-task-store.mjs';
import { createBrandStore } from './server/brand-store.mjs';
import { applyAuthoritativeProjectContext, ProjectBrandContextError } from './server/project-brand-context.mjs';
import {
  getProjectStatusAfterBrandUpgrade,
  invalidateProjectDataForBrandUpgrade
} from './server/project-brand-upgrade.mjs';
import {
  getShortCopyDescription,
  getVisibleCopyLanguageInstruction,
  normalizeProjectLanguageFields
} from './shared/output-language.mjs';
import {
  formatStoryboardSlotContract,
  normalizeStoryboardSlotContract
} from './shared/storyboard-contract.mjs';

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
const GEMINI_PLANNER_TIMEOUT_MS = Number(process.env.GEMINI_PLANNER_TIMEOUT_MS || 60000);
const GEMINI_REVIEW_TIMEOUT_MS = Number(process.env.GEMINI_REVIEW_TIMEOUT_MS || 45000);
const GEMINI_IMAGE_TIMEOUT_MS = Number(process.env.GEMINI_IMAGE_TIMEOUT_MS || 120000);
const GENERATED_IMAGE_DIR = resolve(process.env.GENERATED_IMAGE_DIR || 'generated-images');
const EXPORT_DIR = resolve(process.env.EXPORT_DIR || 'exports');
const INVITE_CLAIMS_FILE = resolve(process.env.INVITE_CLAIMS_FILE || 'data/invite-claims.json');
const EVENT_LOG_DIR = resolve(process.env.EVENT_LOG_DIR || 'logs');
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const MAX_EVENT_BATCH_SIZE = 100;
const REQUIRE_DURABLE_ASSET_STORAGE = String(process.env.REQUIRE_DURABLE_ASSET_STORAGE || '').toLowerCase() === 'true';
const database = createDatabase();
const stage1Store = createStage1Store(database);
const assetStorage = createAssetStorage({ publicBaseUrl: PUBLIC_BASE_URL });
const generationTaskStore = createGenerationTaskStore(database);
const brandStore = createBrandStore(database);
const INVITE_ACCESS_CODES = [
  { label: '内测邀请码 01', role: 'tester', hash: '48f3e317987ea2d51b3ca8dfd17c95eddbeb5f186715be4cf2d0f8709f0519db' },
  { label: '内测邀请码 02', role: 'tester', hash: 'fc59c6c106d2378251a1873a68652192541fa07477f69f44af7b8ccb57d8edb3' },
  { label: '内测邀请码 03', role: 'tester', hash: '20fefd0ca681e1f439db7e70fd007b05972172acde4628ac95093b99aa767dbf' },
  { label: '内测邀请码 04', role: 'tester', hash: '9b058607078caec1266439fbbe95bcc2dca4f67984d86f586dcd5cb8732f63a0' },
  { label: '内测邀请码 05', role: 'tester', hash: 'b1d010aad39db84d7a2bdd55513180c74e8febb7514a29f76a4c276b5e9f409e' },
  { label: '管理员码', role: 'admin', hash: '2e803afc924afa7fbf912b121e74b26286e00b96995173acde634f58534b7cca' }
];

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  });
  response.end(JSON.stringify(payload));
}

function sendStage1Error(response, error) {
  const status = error instanceof Stage1Error ? error.status : error?.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 500;
  sendJson(response, status, {
    ok: false,
    code: error instanceof Stage1Error ? error.code : error?.code || 'STAGE1_UNAVAILABLE',
    error: error instanceof Error ? error.message : '共享账号与项目服务暂时不可用。'
  });
}

async function getOptionalStage1Actor(request) {
  if (!database.configured) return null;
  const token = getBearerToken(request.headers.authorization);
  if (!token) return null;
  return stage1Store.getSession(token);
}

async function requireStage1Actor(request) {
  const token = getBearerToken(request.headers.authorization);
  return stage1Store.requireSession(token);
}

async function requireProjectAction(request, payload, options) {
  const session = await requireStage1Actor(request);
  const project = await stage1Store.requireProjectAccess(session.user, payload?.projectId, options);
  return { session, project };
}

async function auditProjectAction(actor, projectId, eventName, payload = {}) {
  await stage1Store.appendAuditEvents({
    event: eventName,
    projectId,
    step: payload.step || '',
    traceId: payload.traceId || '',
    payload
  }, actor);
}

function getAuthoritativeProjectPayload(payload, project, options = {}) {
  try {
    return applyAuthoritativeProjectContext(payload, project, options);
  } catch (error) {
    if (error instanceof ProjectBrandContextError) {
      throw new Stage1Error(error.message, error.status, error.code);
    }
    throw error;
  }
}

function getRequestedBrandId(payload = {}) {
  return String(
    payload?.brandSnapshot?.brandId
      || payload?.projectData?.form?.brandId
      || payload?.projectData?.form?.selectedBrandId
      || 'none'
  ).trim();
}

async function attachBrandSnapshot(payload = {}, currentSnapshot = null) {
  const brandId = getRequestedBrandId(payload);
  const outputPresetId = payload?.brandSnapshot?.outputPresetId
    || payload?.projectData?.form?.planOutputPresetId
    || (payload.outputType === 'a-plus' ? 'a-plus' : 'main-image');
  if (!brandId || brandId === 'none') {
    return { ...payload, brandSnapshot: { brandId: 'none', outputPresetId } };
  }
  if (currentSnapshot?.brandId === brandId && currentSnapshot?.brandVersion) {
    return { ...payload, brandSnapshot: { ...currentSnapshot, outputPresetId } };
  }
  const snapshot = await brandStore.getBrandSnapshot(brandId);
  return { ...payload, brandSnapshot: { ...snapshot, outputPresetId } };
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

function normalizeInviteHash(hash = '') {
  return String(hash || '').trim().toLowerCase();
}

function readInviteClaims() {
  try {
    if (!existsSync(INVITE_CLAIMS_FILE)) return { version: 1, claims: {} };
    const parsed = JSON.parse(readFileSync(INVITE_CLAIMS_FILE, 'utf8') || '{}');
    return {
      version: 1,
      claims: parsed?.claims && typeof parsed.claims === 'object' ? parsed.claims : {}
    };
  } catch {
    return { version: 1, claims: {} };
  }
}

function writeInviteClaims(record) {
  mkdirSync(resolve(INVITE_CLAIMS_FILE, '..'), { recursive: true });
  writeFileSync(INVITE_CLAIMS_FILE, JSON.stringify(record, null, 2), 'utf8');
}

function getClientIp(request) {
  return String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || '')
    .split(',')[0]
    .trim()
    .slice(0, 80);
}

function cleanEventPayload(value, depth = 0) {
  if (depth > 5) return '[truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 80).map((item) => cleanEventPayload(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 80).map(([key, item]) => [
      key,
      cleanEventPayload(item, depth + 1)
    ]));
  }
  return String(value);
}

function normalizeEvent(rawEvent = {}, request) {
  const now = new Date();
  const eventName = String(rawEvent.event || rawEvent.name || 'app.unknown').trim().slice(0, 120);
  return {
    ts: rawEvent.ts || now.toISOString(),
    receivedAt: now.toISOString(),
    event: eventName || 'app.unknown',
    level: ['debug', 'info', 'warn', 'error'].includes(rawEvent.level) ? rawEvent.level : 'info',
    sessionId: String(rawEvent.sessionId || rawEvent.session_id || '').slice(0, 120),
    userHint: String(rawEvent.userHint || rawEvent.user_hint || '').slice(0, 120),
    projectId: String(rawEvent.projectId || rawEvent.project_id || '').slice(0, 120),
    step: rawEvent.step ?? '',
    traceId: String(rawEvent.traceId || rawEvent.trace_id || '').slice(0, 120),
    payload: cleanEventPayload(rawEvent.payload || {}),
    client: cleanEventPayload(rawEvent.client || {}),
    server: {
      ip: getClientIp(request),
      userAgent: String(request.headers['user-agent'] || '').slice(0, 240)
    }
  };
}

function appendEventLog(events = [], request) {
  const safeEvents = events
    .slice(0, MAX_EVENT_BATCH_SIZE)
    .map((event) => normalizeEvent(event, request));
  if (!safeEvents.length) return { count: 0 };
  mkdirSync(EVENT_LOG_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const filePath = resolve(EVENT_LOG_DIR, `events-${date}.jsonl`);
  if (!filePath.startsWith(EVENT_LOG_DIR)) {
    throw new Error('Invalid event log path');
  }
  appendFileSync(filePath, `${safeEvents.map((event) => JSON.stringify(event)).join('\n')}\n`, 'utf8');
  return {
    count: safeEvents.length,
    filePath
  };
}

function claimInviteAccess(payload = {}, request) {
  const hash = normalizeInviteHash(payload.hash);
  const invite = INVITE_ACCESS_CODES.find((item) => item.hash === hash);
  if (!invite) {
    return {
      ok: false,
      status: 403,
      error: '邀请码不正确，请检查后重试。'
    };
  }

  if (invite.role === 'admin') {
    return {
      ok: true,
      status: 200,
      role: invite.role,
      label: invite.label,
      reusable: true,
      claimedAt: new Date().toISOString()
    };
  }

  const record = readInviteClaims();
  if (record.claims[hash]) {
    return {
      ok: false,
      status: 409,
      error: '这个邀请码已经被激活，请联系管理员更换新的邀请码。',
      label: invite.label,
      claimedAt: record.claims[hash].claimedAt || ''
    };
  }

  const claimedAt = new Date().toISOString();
  record.claims[hash] = {
    label: invite.label,
    role: invite.role,
    claimedAt,
    userAgent: String(request.headers['user-agent'] || '').slice(0, 240)
  };
  writeInviteClaims(record);
  return {
    ok: true,
    status: 200,
    role: invite.role,
    label: invite.label,
    reusable: false,
    claimedAt
  };
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

function extractGeminiImageParts(result = {}) {
  const parts = result?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;
  return {
    parts,
    imageBase64: inlineData?.data || '',
    imageMimeType: inlineData?.mimeType || inlineData?.mime_type || 'image/png',
    textPart: parts.find((part) => part.text)?.text || '',
    finishReason: result?.candidates?.[0]?.finishReason || '',
    safetyRatings: result?.candidates?.[0]?.safetyRatings || []
  };
}

function getGeminiNoImageError(result = {}, fallback = 'Gemini 本次没有返回图片。') {
  const { textPart, finishReason, safetyRatings } = extractGeminiImageParts(result);
  const details = [
    textPart ? `模型返回：${String(textPart).slice(0, 300)}` : '',
    finishReason ? `结束原因：${finishReason}` : '',
    safetyRatings?.length ? `安全判断：${safetyRatings.map((rating) => `${rating.category}:${rating.probability}`).join(', ')}` : ''
  ].filter(Boolean).join('；');
  return details ? `${fallback}${details}` : fallback;
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

async function saveGeneratedImageFile({ imageDataUrl, projectId, projectName, slotId, runId }) {
  const match = /^data:(.+?);base64,(.+)$/.exec(imageDataUrl || '');
  if (!match) throw new Error('imageDataUrl must be a base64 data URL');
  const [, mimeType, base64] = match;
  const extension = getImageExtension(mimeType);
  const filename = [
    sanitizeFilenamePart(projectName || 'listingflow'),
    `slot-${String(slotId || 'x').padStart(2, '0')}`,
    sanitizeFilenamePart(runId || Date.now())
  ].join('-') + `.${extension}`;
  const storageKey = `projects/${sanitizeFilenamePart(projectId || 'unassigned')}/generated/${filename}`;
  const stored = await assetStorage.putObject({
    key: storageKey,
    data: Buffer.from(base64, 'base64'),
    contentType: mimeType
  });
  return {
    filename,
    filePath: stored.filePath,
    storageKey: stored.storageKey,
    storageMode: stored.mode,
    imageUrl: stored.url
  };
}

function parseInlineImage(imageDataUrl) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(imageDataUrl || ''));
  if (!match) throw new Stage1Error('图片格式不受支持，请上传 PNG、JPG 或 WebP。', 400, 'INVALID_IMAGE_DATA');
  const data = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!data.length) throw new Stage1Error('图片内容为空。', 400, 'INVALID_IMAGE_DATA');
  return { contentType: match[1].toLowerCase(), data };
}

function assertAssetStorageReady() {
  if (REQUIRE_DURABLE_ASSET_STORAGE && !assetStorage.configured) {
    throw new Stage1Error('生产对象存储尚未配置，暂时不能上传图片。', 503, 'OBJECT_STORAGE_REQUIRED');
  }
}

async function saveUploadedAsset({ imageDataUrl, storageKey }) {
  assertAssetStorageReady();
  const { contentType, data } = parseInlineImage(imageDataUrl);
  const maxAssetBytes = Math.max(1024 * 1024, Number(process.env.MAX_UPLOADED_ASSET_BYTES || 15 * 1024 * 1024));
  if (data.length > maxAssetBytes) {
    throw new Stage1Error('图片文件过大，请压缩后重新上传。', 413, 'ASSET_TOO_LARGE');
  }
  return assetStorage.putObject({ key: storageKey, data, contentType });
}

function getAssetContentType(storageKey = '') {
  const extension = extname(storageKey).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.zip') return 'application/zip';
  if (extension === '.csv') return 'text/csv;charset=utf-8';
  if (extension === '.json') return 'application/json;charset=utf-8';
  return 'application/octet-stream';
}

function serveLocalAsset(request, response) {
  if (assetStorage.mode !== 'filesystem') {
    sendJson(response, 404, { ok: false, error: 'Asset not found' });
    return;
  }
  const url = new URL(request.url, PUBLIC_BASE_URL);
  const storageKey = decodeURIComponent(url.pathname.replace('/assets/', ''));
  const data = assetStorage.readLocalObject(storageKey);
  if (!data) {
    sendJson(response, 404, { ok: false, error: 'Asset not found' });
    return;
  }
  response.writeHead(200, {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Cache-Control': 'private, max-age=300',
    'Content-Type': getAssetContentType(storageKey)
  });
  response.end(data);
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

async function saveExportFile({ projectId, filename, content = '', mimeType = 'text/plain;charset=utf-8' }) {
  const extension = extname(filename || '') || '.txt';
  const baseName = sanitizeFilenamePart(String(filename || 'export').replace(extension, ''));
  const safeFilename = `${baseName}${extension.toLowerCase()}`;
  const storageKey = `projects/${sanitizeFilenamePart(projectId || 'unassigned')}/exports/${safeFilename}`;
  const stored = await assetStorage.putObject({
    key: storageKey,
    data: Buffer.from(String(content), 'utf8'),
    contentType: mimeType,
    contentDisposition: `attachment; filename="${safeFilename}"`
  });
  return {
    filename: safeFilename,
    filePath: stored.filePath,
    storageKey: stored.storageKey,
    storageMode: stored.mode,
    fileUrl: stored.url,
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

async function getGeneratedImageBuffer(image = {}) {
  if (image.storageKey) {
    const stored = await assetStorage.getObject(image.storageKey);
    return stored.data;
  }
  const filePath = getGeneratedImagePathFromPayload(image);
  return filePath ? readFileSync(filePath) : null;
}

async function saveImagesZipFile({ projectId, projectName = 'listingflow', images = [] }) {
  const entries = (await Promise.all(images.map(async (image, index) => {
    const data = await getGeneratedImageBuffer(image);
    if (!data) return null;
    const extension = extname(image.storageKey || image.imageFilename || image.filename || image.imageFilePath || '').toLowerCase() || '.jpg';
    const slot = String(image.slotId || index + 1).padStart(2, '0');
    const title = sanitizeFilenamePart(image.title || image.slotTitle || `image-${slot}`);
    return {
      name: `${slot}-${title}${extension}`,
      data
    };
  }))).filter(Boolean);

  if (!entries.length) {
    throw new Error('No saved generated images found for ZIP export');
  }

  const zipBuffer = createStoredZip(entries);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${sanitizeFilenamePart(projectName)}-images-${timestamp}.zip`;
  if (assetStorage.mode === 'cloudinary') {
    mkdirSync(EXPORT_DIR, { recursive: true });
    const filePath = resolve(EXPORT_DIR, filename);
    writeFileSync(filePath, zipBuffer);
    const cleanupTimer = setTimeout(() => rmSync(filePath, { force: true }), 30 * 60 * 1000);
    cleanupTimer.unref?.();
    return {
      filename,
      filePath,
      storageKey: '',
      storageMode: 'ephemeral-export',
      fileUrl: `${PUBLIC_BASE_URL}/exports/${encodeURIComponent(filename)}`,
      count: entries.length
    };
  }
  const storageKey = `projects/${sanitizeFilenamePart(projectId || 'unassigned')}/exports/${filename}`;
  const stored = await assetStorage.putObject({
    key: storageKey,
    data: zipBuffer,
    contentType: 'application/zip',
    contentDisposition: `attachment; filename="${filename}"`
  });
  return {
    filename,
    filePath: stored.filePath,
    storageKey: stored.storageKey,
    storageMode: stored.mode,
    fileUrl: stored.url,
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

// Keep the visual-review response small and machine-readable. A fixed schema
// prevents verbose model explanations from truncating the JSON payload.
const imageReviewResponseSchema = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', enum: ['pass', 'warn', 'fail'] },
    score: { type: 'INTEGER' },
    summary: { type: 'STRING' },
    checks: {
      type: 'OBJECT',
      properties: {
        productConsistency: { type: 'STRING', enum: ['pass', 'warn', 'fail'] },
        scalePhysicalLogic: { type: 'STRING', enum: ['pass', 'warn', 'fail'] },
        claimAccuracy: { type: 'STRING', enum: ['pass', 'warn', 'fail'] },
        textRisk: { type: 'STRING', enum: ['pass', 'warn', 'fail'] },
        aesthetics: { type: 'STRING', enum: ['pass', 'warn', 'fail'] }
      },
      required: ['productConsistency', 'scalePhysicalLogic', 'claimAccuracy', 'textRisk', 'aesthetics']
    },
    issues: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      maxItems: 6
    },
    recommendedAction: { type: 'STRING' }
  },
  required: ['verdict', 'score', 'summary', 'checks', 'issues', 'recommendedAction']
};

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

const brandArrowStylePromptMap = {
  'minimal-line': 'Use thin clean line arrows with small arrowheads, minimal curves, no heavy shadows, and restrained brand-color accents.',
  'soft-rounded': 'Use soft rounded arrows with gentle curves, medium stroke weight, subtle shadows, and friendly brand-color accents.',
  'bold-callout': 'Use bold ecommerce callout arrows with clear direction, simple geometry, high contrast, and no cartoon exaggeration.',
  'no-arrows': 'Avoid arrows whenever possible. Prefer proximity, crops, labels, circles, subtle lines, or composition to connect text and product features.'
};

function getBrandArrowStylePrompt(brand = {}) {
  return brandArrowStylePromptMap[brand.arrowStyle] || brandArrowStylePromptMap['minimal-line'];
}

function normalizePromptHexColor(value = '') {
  const color = String(value || '').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(color) ? color : '#18211F';
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
  benefits: 'Core benefits image may use no more than three short callouts in the project target language; each must point to a visible product feature or visually demonstrated benefit, not become a text poster.',
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
  'Minimize visible explanatory copy. Text is allowed when it improves clarity, but the image must not become a text poster. Prefer one short title or a few short labels in the project target language over paragraphs.',
  'Blocked or forbidden claims must not be stated, suggested, implied, staged, symbolized, or visually hinted as a benefit. Neutral factual product appearance or ordinary use is allowed only when it does not communicate the blocked claim.',
  'For standard listing images, if an image includes a title, place the title consistently at the top of the image. A+ content is an exception: title placement may follow the module layout and does not have to be at the top.',
  'Across the full standard listing image set, maintain one unified visual system: consistent typography, title placement, label style, spacing, icon/callout treatment, lighting quality, and ecommerce art direction.',
  'A+ modules may use richer and more varied section layouts, but the full A+ set must still share one brand visual system: consistent font style, heading hierarchy, title color, spacing rhythm, arrow/callout style, graphic blocks, image treatment, and ecommerce art direction.'
];

function getListingImageStrategyText() {
  return listingImageStrategyRules.join(' ');
}

function normalizeStoryboardPlan(plan, payload) {
  const slots = Array.isArray(plan?.slots) ? plan.slots : [];
  const outputPresetId = payload?.outputPresetId || payload?.projectForm?.planOutputPresetId || 'main-image';
  const isAPlusOutput = outputPresetId === 'aplus';
  const targetSlotCount = isAPlusOutput
    ? Math.min(7, Math.max(4, Number(payload?.targetSlotCount) || 5))
    : Math.min(9, Math.max(1, Number(payload?.targetSlotCount) || 7));
  if (slots.length !== targetSlotCount) {
    throw new Error(`AI plan must contain exactly ${targetSlotCount} slots.`);
  }
  const blockedClaims = normalizeStringArray(payload?.ledgerFacts
    ?.filter((fact) => fact.state === 'blocked' || fact.allowed === false)
    ?.map((fact) => fact.claim), 12);
  const languageFields = normalizeProjectLanguageFields(payload?.projectForm || {});

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
    const outputPresetSize = payload?.outputPresetSize || (isAPlusOutput ? '1464 x 600' : '2000 x 2000');
    const slotContract = normalizeStoryboardSlotContract({
      slot,
      id,
      visualType,
      primaryClaim,
      visualProof,
      composition,
      outputPresetId,
      outputPresetSize,
      projectForm: payload?.projectForm || {},
      brand: payload?.brandProfile || {},
      blockedClaims,
      guardrails
    });
    return {
      id,
      title,
      goal,
      composition,
      outputPresetId,
      outputPresetLabel: payload?.outputPresetLabel || (isAPlusOutput ? 'A+' : '主图'),
      outputPresetSize,
      ...languageFields,
      ...slotContract,
      roleType,
      visualType,
      productType: String(plan?.productType || 'ai-detected-product').trim(),
      brandId: String(payload?.brandProfile?.id || payload?.projectForm?.brandId || 'none').trim(),
      brandName: String(payload?.brandProfile?.name || payload?.projectForm?.brandName || '').trim(),
      brandVersion: Number(payload?.brandProfile?.version || payload?.brandVersion || 0),
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
        getVisibleCopyLanguageInstruction(payload?.projectForm || {}),
        composition,
        primaryClaim ? `Primary claim to prove visually: ${primaryClaim}.` : getNoPrimaryClaimInstruction(visualType),
        `Visual proof plan: ${visualProof}`,
        formatStoryboardSlotContract(slotContract),
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

async function fetchGeminiWithTimeout(url, options, timeoutMs = GEMINI_PLANNER_TIMEOUT_MS, requestLabel = '方案') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error(`Gemini ${requestLabel}请求超过 ${Math.round(timeoutMs / 1000)} 秒未返回。`);
      timeoutError.code = 'AI_REQUEST_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
  const visibleCopyLanguageInstruction = getVisibleCopyLanguageInstruction(project);
  const shortCopyDescription = getShortCopyDescription(project);
  const brand = payload.brandProfile || {};
  const ledgerFacts = Array.isArray(payload.ledgerFacts) ? payload.ledgerFacts : [];
  const strategyRules = normalizeStringArray(payload.strategyRules, 8);
  const outputPresetId = payload.outputPresetId || project.planOutputPresetId || 'main-image';
  const isAPlusOutput = outputPresetId === 'aplus';
  const targetSlotCount = isAPlusOutput
    ? Math.min(7, Math.max(4, Number(payload.targetSlotCount) || 5))
    : Math.min(9, Math.max(1, Number(payload.targetSlotCount) || 7));
  const ledgerText = ledgerFacts.map((fact, index) => (
    `${index + 1}. ${fact.claim} | state=${fact.state || 'review'} | allowed=${fact.allowed !== false} | source=${fact.source || 'unknown'} | owner=${fact.owner || 'unknown'}`
  )).join('\n');

  return [
    'You are an Amazon ecommerce image strategist.',
    isAPlusOutput
      ? `Generate a product-specific ${targetSlotCount}-module Amazon A+ content plan from the uploaded product image and the Ledger facts.`
      : `Generate a product-specific ${targetSlotCount}-image listing plan from the uploaded product image and the Ledger facts.`,
    `Selected output type: ${payload.outputPresetLabel || (isAPlusOutput ? 'A+' : '主图')} ${payload.outputPresetSize || (isAPlusOutput ? '1464 x 600' : '2000 x 2000')}.`,
    strategyRules.length ? `User-defined listing strategy rules: ${strategyRules.join(' ')}` : `Default listing strategy rules: ${getListingImageStrategyText()}`,
    isAPlusOutput
      ? `Use an A+ module strategy: all ${targetSlotCount} slots are A+ content modules. Slot 1 is not a white-background main image; it should be a brand/product hero module or strongest content opening.`
      : `Use an anchor + dynamic role strategy: slot 1 is fixed as the Amazon white-background main image; slots 2-${targetSlotCount} must be selected dynamically from the role pool that best fits this product and Ledger.`,
    isAPlusOutput
      ? 'Role pool for A+ modules: brand_hero, benefit_story, lifestyle_module, detail_proof, function_module, structure_specs, bundle_contents, comparison, care_guide, trust_proof.'
      : 'Role pool for slots 2-7: hero_with_claim, feature_callout, scale_human_ref, dimension_spec, material_macro, use_scenario, comparison, before_after, bundle_contents, durability_proof, cleaning_ease, safety_cert.',
    'Do not force fixed image roles such as benefits/lifestyle/details/dimensions unless they genuinely fit the product and Ledger.',
    isAPlusOutput
      ? `Infer the actual product category, then choose exactly ${targetSlotCount} useful, non-duplicate A+ module roles.`
      : `Infer the actual product category from the image, product name, category, and claims, then choose the most useful ${Math.max(0, targetSlotCount - 1)} secondary image roles for this product.`,
    'The plan must work for any product category. If the product is cookware, furniture, toy, tool, home decor, pet, outdoor, electronics, apparel, storage, lighting, beauty, or another category, adapt the image roles accordingly.',
    'Use only facts from the Ledger and visible product image. Do not invent dimensions, certifications, compatibility, materials, safety claims, included accessories, or performance claims.',
    'Ledger facts and user keywords may be written in Chinese, English, or mixed language. Understand them semantically.',
    'Core strategy for every slot: prove the selling point primarily through the image itself. The visual evidence may be the product detail, scene action, physical state, scale, structure, comparison, or verified specification layout.',
    'Use as little visible explanatory copy as possible while preserving clarity. Text is allowed, but the image should not become a poster full of words.',
    visibleCopyLanguageInstruction,
    isAPlusOutput
      ? 'For A+ output, headings are optional and may follow the module layout; they do not have to be at the top. Plan richer editorial modules with brand consistency, product evidence, and clean hierarchy.'
      : 'For standard listing output, if a slot uses a title, the title must sit at the top of the image.',
    isAPlusOutput
      ? 'A+ modules may combine related allowed Ledger claims, use allowed claims not assigned to the selected slot, and create richer content modules rather than strict one-claim listing images. Even when layouts vary, the full A+ set must share the same brand visual system: consistent font style, heading hierarchy, title color, spacing rhythm, arrow/callout style, graphic blocks, image treatment, and ecommerce art direction.'
      : `Plan one unified ${targetSlotCount}-image visual system for standard listing output: consistent font style, font weight, title placement, label/callout treatment, spacing, lighting quality, icon style, and ecommerce art direction across the full set.`,
    'Plan text as part of the generated image composition itself. Typography, callout positions, arrows, badges, and label hierarchy must be designed together with the product and scene, not added later as a separate overlay.',
    'Visible text must point to, sit near, or clearly relate to the product feature, scene action, measurement, or visual evidence it describes.',
    'Blocked claims are not workaround opportunities. Do not state, imply, hint, symbolize, stage, or visually suggest blocked claims as benefits. You may only show neutral factual product appearance or ordinary use when it does not communicate a blocked claim.',
    'Every slot should be visually different in intent. Avoid seven duplicate product-only images or repeated role types.',
    'Do not cram unlimited claims into images. Treat the Ledger as the raw source, then select a concise image claim pool.',
    `If there are more useful claims than the ${targetSlotCount} planned slots, cluster related claims into benefit themes and assign only the strongest themes.`,
    isAPlusOutput
      ? 'Each A+ module must have one anchor primaryClaim plus up to two related supporting usableClaims when they strengthen the content story.'
      : 'Each image slot must have exactly one primaryClaim that the image is designed to prove, plus at most two supporting usableClaims.',
    'Every slot must include visualProof: a concrete explanation of how the composition, scene, detail, state, or layout visually proves the primaryClaim. The image should prove the benefit, not merely decorate the product or display text.',
    'When a dimensions/specifications image is useful, it may only use confirmed dimensions, capacity, counts, package contents, or included accessories. If none exist, choose a different image role instead of forcing a dimensions slot.',
    'When a function-state image is useful, it may only use confirmed open, folded, assembled, stored, installed, or operation facts. If none exist, choose a different image role instead of forcing a state slot.',
    'When details or structure images are useful, prefer visible parts and construction facts over broad marketing claims.',
    isAPlusOutput
      ? 'A+ mode: no slot is required to be product-only on pure white. Backgrounds may use brand color fields, lifestyle scenes, detail panels, comparison bands, or editorial layouts when they support allowed claims.'
      : 'Only slot 1, the Amazon primary image, must be product-only on a pure white background with no text, props, badges, scene, or colored background. Plan slot 1 so the product fills about 80-85% of the canvas, with a minimum around 75% unless the product is unusually long or thin, while staying fully visible without cropping or distortion.',
    isAPlusOutput
      ? 'A+ modules should feel richer than standard listing images while staying readable, truthful, and product-led.'
      : `Slots 2-${targetSlotCount} are secondary listing images. They may use clean backgrounds, brand color backgrounds, soft layout blocks, or realistic use-scene backgrounds when the background helps communicate a supported selling point.`,
    'A realistic scene must match the actual product use case and physical scale. Do not use decorative stock-like backgrounds that do not explain a benefit.',
    'Return JSON only. No markdown.',
    '',
    `Project name: ${project.projectName || ''}`,
    `Product name: ${project.productName || ''}`,
    `Category: ${project.category || ''}`,
    `SKU: ${project.sku || ''}`,
    payload.productLock ? `Structured product lock: ${JSON.stringify(payload.productLock).slice(0, 5000)}` : '',
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
    `Visible title color rule: use ${normalizePromptHexColor(brand.titleColor)} as the consistent title color whenever a visible title or main heading appears. This HEX value is an internal art-direction rule only; do not print the HEX code.`,
    `Arrow and pointer style rule: ${getBrandArrowStylePrompt(brand)}`,
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
          title: `short internal slot title; use ${shortCopyDescription} if it will also appear in the image`,
          goal: 'short Chinese goal',
          roleType: 'main | hero_with_claim | feature_callout | scale_human_ref | dimension_spec | material_macro | use_scenario | comparison | before_after | bundle_contents | durability_proof | cleaning_ease | safety_cert | brand_hero | benefit_story | lifestyle_module | detail_proof | function_module | structure_specs | care_guide | trust_proof',
          visualType: 'main | benefits | lifestyle | detail | state | structure | dimensions',
          composition: 'Chinese visual direction',
          primaryClaim: 'single most important claim this slot proves',
          visualProof: 'Chinese explanation of how the image visually proves the primary claim',
          evidenceMap: [{ claim: 'same primary claim', evidence: 'specific visible proof in the composition' }],
          allowedCopy: [`up to 5 short phrases in ${shortCopyDescription}; empty when no visible copy is needed`],
          copyPolicy: 'Chinese instruction describing how little text may be used',
          scenePlan: {
            type: 'studio-white | product-led-layout | real-use | product-detail | function-state | specification-layout',
            environment: 'Chinese description of the exact setting or background',
            requiredElements: ['visible elements required to prove the claim'],
            forbiddenElements: ['objects, implications, or states that must not appear'],
            physicalLogic: 'Chinese physical-logic rule for this product and scene'
          },
          brandRules: {
            allowedColors: ['configured HEX colors only'],
            titleColor: 'configured title HEX color',
            arrowStyle: 'configured arrow style',
            logoPolicy: 'whether and how the uploaded logo may appear'
          },
          outputSpec: {
            size: 'selected output size',
            aspectRatio: 'selected output ratio',
            backgroundRule: 'slot-specific background rule',
            titlePlacement: 'slot-specific title placement'
          },
          complianceRules: ['slot-specific Amazon and claim restrictions'],
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
      error: '缺少产品参考图，无法生成图片方案。'
    };
  }

  const { mimeType, base64 } = dataUrlToInlineData(sourceImageDataUrl);
  const startedAt = Date.now();
  const geminiResponse = await fetchGeminiWithTimeout(
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
  const visibleCopyReviewInstruction = getVisibleCopyLanguageInstruction(payload.projectForm || {}, { review: true });
  const isAPlusOutput = String(run.outputPresetId || '').includes('aplus') || String(run.outputPresetLabel || '').includes('A+');
  const isWhiteMainImage = Number(run.slotId || brief.id || 0) === 1 && String(run.outputPresetLabel || '').includes('主图');
  return [
    'You are an AI pre-reviewer for Amazon ecommerce image production.',
    'Compare the generated candidate image against the uploaded original product reference images and the slot brief.',
    'Act as a strict production gate, not a helpful copywriter. A false pass is worse than a false rejection.',
    'Your job is to flag every visible risk before humans spend time reviewing. Be strict about product drift, impossible physics, wrong scale, invented parts, unsupported claims, copy that violates the project target language, garbled text, and internal prompt leakage.',
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
    `Structured slot contract: ${formatStoryboardSlotContract(brief)}`,
    `Allowed claims: ${normalizeStringArray(brief.usableClaims, 8).join('; ') || 'none'}`,
    `Needs evidence: ${normalizeStringArray(brief.needsEvidence, 8).join('; ') || 'none'}`,
    `Blocked claims: ${normalizeStringArray(brief.blockedClaims, 12).join('; ') || 'none'}`,
    payload.productLock ? `Structured product lock: ${JSON.stringify(payload.productLock).slice(0, 5000)}` : '',
    `Prompt snapshot: ${String(run.prompt || payload.prompt || '').slice(0, 1800)}`,
    visibleCopyReviewInstruction,
    '',
    isAPlusOutput
      ? 'Background/layout rule: this is A+ content, not the Amazon primary image. It does not need a pure white background, and headings do not have to sit at the top. Richer editorial layout, brand color fields, lifestyle context, detail crops, and combined related allowed claims are acceptable if truthful and visually supported. The A+ module must still fit the same brand visual system as the rest of the A+ set: consistent font style, heading hierarchy, title color, spacing rhythm, arrow/callout style, graphic blocks, image treatment, and ecommerce art direction.'
      : isWhiteMainImage
      ? 'Background rule: slot 1 primary image must be product-only on pure white background, with no visible copy, props, badges, scene, or colored background. Product size rule: the product should occupy about 80-85% of the canvas and should not fall below about 75% unless unusually long or thin. Too-small product is a warn/fail risk; non-white background, visible copy, added props, heavy shadow, crop, product deformation, or missing parts is a fail.'
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
    '1b. mainImageCoverage: For slot 1 primary image only, does the product occupy roughly 80-85% of the canvas and at least about 75% while staying complete, centered, uncropped, and undeformed? Too-small product is warn/fail; cropped, stretched, deformed, or missing product parts are fail.',
    '2. scalePhysicalLogic: Are scale, contact points, shadows, scene placement, use state, and physical logic believable? Floating parts, object intersections, impossible supports, strange perspective, wrong human/product scale, or arrows that imply impossible motion are fail/warn risks.',
    '3. claimAccuracy: Are visible claims and visual implications supported by the brief/Ledger, and does the image actually prove the primary claim instead of merely stating it as text? Invented numbers, certifications, accessories, dimensions, blocked claims, or unproven benefits are fail risks.',
    '4. textRisk: Is any visible text, badge, logo, number, or claim garbled, misspelled, too tiny, invented, written in the wrong language, mixed across languages, or otherwise risky? Apply the authoritative project target-language rule above. Original photographed product labels are allowed only when preserved from the reference.',
    '4b. promptLeakRisk: Visible internal prompt metadata is a fail. Fail textRisk if the image shows HEX color codes, color usage percentages, palette swatches, color cards, design-token labels, style-guide panels, prompt words, model notes, or generation instructions.',
    '5. aesthetics: Is the composition commercially usable without being too plain, cluttered, cheap-looking, badly cropped, off-brand, inconsistent with the image set, inconsistent in typography/design language, or polluted by internal design-guide graphics?',
    '',
    'Common failures to actively catch:',
    '- The product looks like a different SKU, has changed legs/handles/lid/frame/fasteners/fabric/finish, or no longer matches the reference.',
    '- The scene does not logically prove the selling point; it only uses a title or decorative callout.',
    '- The image contains color palette blocks, HEX codes, percentages, prompt fragments, model notes, or other behind-the-scenes production marks.',
    isAPlusOutput
      ? '- A+ layout failures: the module is cluttered, unreadable, visually cheap, uses unsupported claims, combines unrelated claims without a clear content story, or breaks the shared A+ brand system through mismatched fonts, title colors, heading hierarchy, callout style, spacing rhythm, image treatment, or graphic language.'
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
  const callGeminiReview = async (retryInstruction = '') => {
    const response = await fetchGeminiWithTimeout(
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
              ...(retryInstruction ? [{ text: retryInstruction }] : []),
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
            responseMimeType: 'application/json',
            responseSchema: imageReviewResponseSchema,
            maxOutputTokens: 4096,
            temperature: 0.1
          }
        })
      },
      GEMINI_REVIEW_TIMEOUT_MS,
      '预审'
    );
    return {
      response,
      requestId: response.headers.get('x-request-id') || response.headers.get('x-goog-request-id'),
      result: await response.json().catch(() => ({}))
    };
  };

  let retryCount = 0;
  let { response: geminiResponse, requestId, result } = await callGeminiReview();

  if (!geminiResponse.ok) {
    return {
      ok: false,
      status: geminiResponse.status,
      requestId,
      error: result?.error?.message || 'Gemini review API returned an error.'
    };
  }

  let candidate = result?.candidates?.[0] || {};
  let text = candidate?.content?.parts?.find((part) => part.text)?.text || '';
  let review;
  try {
    review = normalizeAiImageReview(extractJsonObject(text));
  } catch (error) {
    retryCount = 1;
    ({ response: geminiResponse, requestId, result } = await callGeminiReview(
      'The previous review response was incomplete. Return the complete JSON object now. Keep every string concise and include all required fields.'
    ));
    if (geminiResponse.ok) {
      candidate = result?.candidates?.[0] || {};
      text = candidate?.content?.parts?.find((part) => part.text)?.text || '';
      try {
        review = normalizeAiImageReview(extractJsonObject(text));
      } catch {
        review = null;
      }
    }
  }
  if (!review) {
    // Do not discard the successfully generated candidate just because its
    // independent review response was malformed or stopped early.
    const diagnostic = {
      finishReason: candidate.finishReason || 'unknown',
      textLength: text.length,
      requestId,
      retryCount
    };
    console.warn('[vistamz:image-review-incomplete]', diagnostic);
    return {
      ok: false,
      status: 422,
      requestId,
      code: 'AI_REVIEW_INCOMPLETE_JSON',
      error: 'AI 预审返回不完整，候选图已保留。请重试 AI 预审或直接人工判断。',
      diagnostic
    };
  }
  return {
    ok: true,
    status: 200,
    provider: 'gemini',
    requestId,
    model: GEMINI_TEXT_MODEL,
    durationMs: Date.now() - startedAt,
    retryCount,
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
  const callGeminiImage = async (requestPrompt) => {
    const response = await fetchGeminiWithTimeout(
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
              { text: requestPrompt },
              ...imageParts
            ]
          }]
        })
      },
      GEMINI_IMAGE_TIMEOUT_MS,
      '生图'
    );
    return {
      response,
      requestId: response.headers.get('x-request-id') || response.headers.get('x-goog-request-id'),
      result: await response.json().catch(() => ({}))
    };
  };

  let retryCount = 0;
  let { response: geminiResponse, requestId, result } = await callGeminiImage(prompt);

  if (!geminiResponse.ok) {
    return {
      ok: false,
      status: geminiResponse.status,
      requestId,
      error: result?.error?.message || 'Gemini image API returned an error.'
    };
  }

  let { imageBase64, imageMimeType, textPart } = extractGeminiImageParts(result);

  if (!imageBase64) {
    retryCount = 1;
    const retryPrompt = [
      'Generate exactly one ecommerce product image now.',
      'Return an image output. Do not answer with text only. Do not describe the image instead of generating it.',
      `If the original request includes text layout, follow this project rule: ${getVisibleCopyLanguageInstruction(payload.projectForm || {})}`,
      'Preserve the provided product reference structure and do not invent a different product.',
      prompt
    ].join('\n\n');
    ({ response: geminiResponse, requestId, result } = await callGeminiImage(retryPrompt));
    if (!geminiResponse.ok) {
      return {
        ok: false,
        status: geminiResponse.status,
        requestId,
        retryCount,
        error: result?.error?.message || 'Gemini image API returned an error after retry.'
      };
    }
    ({ imageBase64, imageMimeType, textPart } = extractGeminiImageParts(result));
  }

  if (!imageBase64) {
    return {
      ok: false,
      status: 502,
      requestId,
      retryCount,
      error: getGeminiNoImageError(result, 'Gemini 两次尝试都没有返回图片。')
    };
  }

  return {
    ok: true,
    status: 200,
    provider: 'gemini',
    requestId,
    model: GEMINI_IMAGE_MODEL,
    durationMs: Date.now() - startedAt,
    retryCount,
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

async function persistQueuedGenerationResult(task, result) {
  if (result.imageDataUrl) {
    const stored = await saveGeneratedImageFile({
      imageDataUrl: result.imageDataUrl,
      projectId: task.projectId,
      projectName: task.input.projectName || task.input.slotTitle || 'generated',
      slotId: task.slotId,
      runId: `${task.input.runId || task.id}-raw`
    });
    return { ...result, imageDataUrl: null, imageUrl: stored.imageUrl, storageKey: stored.storageKey };
  }
  if (result.imageUrl) {
    const remote = await fetch(result.imageUrl);
    if (!remote.ok) throw new Error('Generated image URL could not be downloaded for persistent storage.');
    const contentType = remote.headers.get('content-type') || 'image/png';
    const extension = getImageExtension(contentType);
    const filename = `${sanitizeFilenamePart(task.input.runId || task.id)}-raw.${extension}`;
    const storageKey = `projects/${sanitizeFilenamePart(task.projectId)}/generated/${filename}`;
    const stored = await assetStorage.putObject({
      key: storageKey,
      data: Buffer.from(await remote.arrayBuffer()),
      contentType
    });
    return { ...result, imageUrl: stored.url, storageKey: stored.storageKey };
  }
  throw new Error('Image provider completed without returning an image.');
}

let generationWorkerBusy = false;
let generationWorkerFailureCount = 0;
let generationWorkerRetryAt = 0;
async function runGenerationWorkerOnce() {
  if (!database.configured || generationWorkerBusy || Date.now() < generationWorkerRetryAt) return;
  generationWorkerBusy = true;
  let taskClaimed = false;
  try {
    const task = await generationTaskStore.claimNextTask();
    generationWorkerFailureCount = 0;
    generationWorkerRetryAt = 0;
    if (!task) return;
    taskClaimed = true;
    try {
      const generated = await generateImage(task.input);
      if (!generated?.ok) {
        const providerError = new Error(generated?.error || 'Image provider did not complete the generation request.');
        providerError.code = generated?.code || `PROVIDER_${generated?.status || 'FAILED'}`;
        providerError.estimatedCallCount = Math.max(1, 1 + Number(generated?.retryCount || 0));
        throw providerError;
      }
      const output = await persistQueuedGenerationResult(task, generated);
      const estimatedCostUsd = generationTaskStore.estimatedCostPerCall * Math.max(1, 1 + Number(generated.retryCount || 0));
      await generationTaskStore.succeedTask(task.id, output, estimatedCostUsd);
      await auditProjectAction({ id: task.input.requestedBy || null }, task.projectId, 'pipeline.generation.task_succeeded', {
        step: 'generation',
        traceId: task.input.runId || task.id,
        slotId: task.slotId,
        taskId: task.id,
        attemptCount: task.attemptCount,
        estimatedCostUsd,
        brandId: task.input.brandId || 'none',
        brandVersion: Number(task.input.brandVersion || 0),
        outputPresetId: task.input.outputPresetId || 'main-image'
      }).catch(() => undefined);
    } catch (error) {
      const estimatedCostUsd = generationTaskStore.estimatedCostPerCall * Math.max(1, Number(error?.estimatedCallCount || 1));
      await generationTaskStore.failTask(task.id, error, task.attemptCount, estimatedCostUsd);
      console.warn(`Generation task ${task.id} failed on attempt ${task.attemptCount}: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    generationWorkerFailureCount += 1;
    const retryBaseMs = Math.max(1000, Number(process.env.GENERATION_WORKER_RETRY_BASE_MS || 5000));
    const retryMaxMs = Math.max(retryBaseMs, Number(process.env.GENERATION_WORKER_RETRY_MAX_MS || 300000));
    const delayMs = Math.min(retryMaxMs, retryBaseMs * (2 ** Math.min(8, generationWorkerFailureCount - 1)));
    generationWorkerRetryAt = Date.now() + delayMs;
    console.warn(`Generation worker unavailable; retrying in ${Math.ceil(delayMs / 1000)}s: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    generationWorkerBusy = false;
    if (taskClaimed) {
      const nextTimer = setTimeout(() => void runGenerationWorkerOnce(), 250);
      nextTimer.unref();
    }
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const requestPath = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;

  if (request.method === 'GET' && requestPath === '/api/health') {
    const databaseHealth = await database.health();
    const storageHealth = assetStorage.health();
    const hasApiKey = IMAGE_API_PROVIDER === 'openai' ? Boolean(OPENAI_API_KEY) : Boolean(GEMINI_API_KEY);
    const betaBlockers = [
      ...(!databaseHealth?.configured || databaseHealth?.reachable === false || databaseHealth?.ok === false ? ['数据库未就绪'] : []),
      ...(!storageHealth.durable ? ['生产对象存储未配置'] : []),
      ...(!hasApiKey ? ['图像模型 API Key 未配置'] : [])
    ];
    sendJson(response, 200, {
      ok: true,
      provider: IMAGE_API_PROVIDER,
      model: IMAGE_API_PROVIDER === 'openai' ? IMAGE_MODEL : GEMINI_IMAGE_MODEL,
      plannerModel: GEMINI_TEXT_MODEL,
      reviewModel: GEMINI_TEXT_MODEL,
      hasApiKey,
      eventLogDir: EVENT_LOG_DIR,
      database: databaseHealth,
      assetStorage: storageHealth,
      internalBetaReadiness: {
        ready: betaBlockers.length === 0,
        blockers: betaBlockers
      },
      generationQueue: {
        enabled: database.configured,
        dailyUserLimit: generationTaskStore.dailyTaskLimit,
        estimatedImageCallCostUsd: generationTaskStore.estimatedCostPerCall,
        maxAttempts: 3
      }
    });
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/events') {
    try {
      const payload = await readJsonBody(request);
      const events = Array.isArray(payload?.events) ? payload.events : [payload];
      const result = appendEventLog(events, request);
      let persistentCount = 0;
      if (database.configured) {
        try {
          const actor = await getOptionalStage1Actor(request);
          persistentCount = await stage1Store.appendAuditEvents(events, actor?.user || null);
        } catch (error) {
          console.warn(`Persistent audit logging unavailable: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      sendJson(response, 200, {
        ok: true,
        count: result.count,
        persistentCount
      });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Event logging failed'
      });
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/auth/activate-invite') {
    try {
      const payload = await readJsonBody(request);
      const result = await stage1Store.activateInvite(payload);
      sendJson(response, 201, { ok: true, ...result });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/auth/login') {
    try {
      const payload = await readJsonBody(request);
      const result = await stage1Store.login(payload);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'GET' && requestPath === '/api/auth/session') {
    try {
      const session = await requireStage1Actor(request);
      sendJson(response, 200, { ok: true, user: session.user });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/auth/logout') {
    try {
      await stage1Store.revokeSession(getBearerToken(request.headers.authorization));
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'GET' && requestPath === '/api/projects') {
    try {
      const session = await requireStage1Actor(request);
      const projects = await stage1Store.listProjects(session.user);
      sendJson(response, 200, { ok: true, projects });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'GET' && requestPath === '/api/projects/trash') {
    try {
      const session = await requireStage1Actor(request);
      const projects = await stage1Store.listTrashedProjects(session.user);
      sendJson(response, 200, { ok: true, projects });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'GET' && requestPath === '/api/brands') {
    try {
      await requireStage1Actor(request);
      const brands = await brandStore.listBrands();
      await Promise.all(brands.map(async (brand) => {
        if (!brand.logoStorageKey) return;
        brand.logoPreview = await assetStorage.getUrl(brand.logoStorageKey);
      }));
      sendJson(response, 200, { ok: true, brands });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/brands') {
    try {
      const session = await requireStage1Actor(request);
      const brand = await brandStore.createBrand(session.user, await readJsonBody(request));
      await stage1Store.appendAuditEvents({
        event: 'brand.created',
        step: 'brands',
        payload: { brandId: brand.id, brandName: brand.name, brandVersion: brand.version }
      }, session.user);
      sendJson(response, 201, { ok: true, brand });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/brand-assets') {
    try {
      const session = await requireStage1Actor(request);
      if (!['designer', 'admin'].includes(session.user.role)) {
        throw new Stage1Error('当前身份不能上传品牌 Logo。', 403, 'BRAND_EDIT_FORBIDDEN');
      }
      const payload = await readJsonBody(request);
      const brandId = sanitizeFilenamePart(payload.brandId || 'new-brand');
      const assetId = sanitizeFilenamePart(payload.assetId || Date.now());
      const parsed = parseInlineImage(payload.imageDataUrl);
      const extension = getImageExtension(parsed.contentType);
      const stored = await saveUploadedAsset({
        imageDataUrl: payload.imageDataUrl,
        storageKey: `brands/${brandId}/logo-${assetId}.${extension}`
      });
      sendJson(response, 201, { ok: true, asset: { storageKey: stored.storageKey, url: stored.url } });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  const brandMatch = /^\/api\/brands\/([^/]+)$/.exec(requestPath);
  if (request.method === 'PATCH' && brandMatch) {
    try {
      const session = await requireStage1Actor(request);
      const brand = await brandStore.updateBrand(
        session.user,
        decodeURIComponent(brandMatch[1]),
        await readJsonBody(request)
      );
      await stage1Store.appendAuditEvents({
        event: 'brand.version_created',
        step: 'brands',
        payload: { brandId: brand.id, brandName: brand.name, brandVersion: brand.version }
      }, session.user);
      sendJson(response, 200, { ok: true, brand });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'DELETE' && brandMatch) {
    try {
      const session = await requireStage1Actor(request);
      const brand = await brandStore.deleteBrand(session.user, decodeURIComponent(brandMatch[1]));
      await stage1Store.appendAuditEvents({
        event: 'brand.archived',
        step: 'brands',
        payload: { brandId: brand.id }
      }, session.user);
      sendJson(response, 200, { ok: true, brand });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/projects') {
    try {
      const session = await requireStage1Actor(request);
      const payload = await attachBrandSnapshot(await readJsonBody(request));
      const project = await stage1Store.createProject(session.user, payload);
      sendJson(response, 201, { ok: true, project });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/project-assets') {
    try {
      const session = await requireStage1Actor(request);
      const payload = await readJsonBody(request);
      const projectId = String(payload.projectId || '').trim();
      await stage1Store.requireProjectAccess(session.user, projectId, { allowedRoles: ['designer', 'admin'] });
      const referenceId = sanitizeFilenamePart(payload.referenceId || 'reference');
      const assetId = sanitizeFilenamePart(payload.assetId || Date.now());
      const parsed = parseInlineImage(payload.imageDataUrl);
      const extension = getImageExtension(parsed.contentType);
      const stored = await saveUploadedAsset({
        imageDataUrl: payload.imageDataUrl,
        storageKey: `projects/${sanitizeFilenamePart(projectId)}/references/${referenceId}-${assetId}.${extension}`
      });
      sendJson(response, 201, { ok: true, asset: { storageKey: stored.storageKey, url: stored.url } });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'GET' && requestPath === '/api/admin/users') {
    try {
      const session = await requireStage1Actor(request);
      const users = await stage1Store.listActiveUsers(session.user);
      sendJson(response, 200, { ok: true, users });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'GET' && requestPath === '/api/admin/generation-tasks') {
    try {
      const session = await requireStage1Actor(request);
      if (session.user.role !== 'admin') {
        throw new Stage1Error('只有管理员可以查看生图任务。', 403, 'GENERATION_TASK_ADMIN_FORBIDDEN');
      }
      const url = new URL(request.url, PUBLIC_BASE_URL);
      const [tasks, summary] = await Promise.all([
        generationTaskStore.listAdminTasks(url.searchParams.get('limit') || 100),
        generationTaskStore.getAdminSummary()
      ]);
      sendJson(response, 200, { ok: true, tasks, summary });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  const projectUpdateMatch = /^\/api\/projects\/([^/]+)$/.exec(requestPath);
  if (request.method === 'PATCH' && projectUpdateMatch) {
    try {
      const session = await requireStage1Actor(request);
      let payload = await readJsonBody(request);
      if (['designer', 'admin'].includes(session.user.role)) {
        const currentProject = await stage1Store.requireProjectAccess(
          session.user,
          decodeURIComponent(projectUpdateMatch[1]),
          { allowedRoles: ['designer', 'admin'] }
        );
        payload = await attachBrandSnapshot(payload, currentProject.brandSnapshot);
      }
      const project = await stage1Store.updateProject(session.user, decodeURIComponent(projectUpdateMatch[1]), payload);
      sendJson(response, 200, { ok: true, project });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  const projectBrandUpgradeMatch = /^\/api\/projects\/([^/]+)\/brand-snapshot\/upgrade$/.exec(requestPath);
  if (request.method === 'POST' && projectBrandUpgradeMatch) {
    try {
      const session = await requireStage1Actor(request);
      const projectId = decodeURIComponent(projectBrandUpgradeMatch[1]);
      const currentProject = await stage1Store.requireProjectAccess(
        session.user,
        projectId,
        { allowedRoles: ['designer', 'admin'] }
      );
      const currentSnapshot = currentProject.brandSnapshot || {};
      if (!currentSnapshot.brandId || currentSnapshot.brandId === 'none') {
        throw new Stage1Error('基线项目没有可升级的品牌快照。', 409, 'PROJECT_BRAND_BASELINE');
      }
      const latestSnapshot = await brandStore.getBrandSnapshot(currentSnapshot.brandId);
      const fromVersion = Number(currentSnapshot.brandVersion || 0);
      const toVersion = Number(latestSnapshot.brandVersion || 0);
      if (!toVersion || toVersion <= fromVersion) {
        throw new Stage1Error('项目已经使用当前品牌的最新版本。', 409, 'PROJECT_BRAND_ALREADY_CURRENT');
      }
      const upgradedAt = new Date().toISOString();
      const nextProjectData = invalidateProjectDataForBrandUpgrade(currentProject.projectData, {
        fromVersion,
        toVersion,
        upgradedAt
      });
      const nextSnapshot = {
        ...latestSnapshot,
        outputPresetId: currentSnapshot.outputPresetId
          || currentProject.projectData?.form?.planOutputPresetId
          || 'main-image'
      };
      const project = await stage1Store.upgradeProjectBrandSnapshot(session.user, projectId, {
        brandSnapshot: nextSnapshot,
        projectData: nextProjectData,
        status: getProjectStatusAfterBrandUpgrade(nextProjectData)
      });
      sendJson(response, 200, { ok: true, project });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'DELETE' && projectUpdateMatch) {
    try {
      const session = await requireStage1Actor(request);
      const project = await stage1Store.trashProject(session.user, decodeURIComponent(projectUpdateMatch[1]));
      sendJson(response, 200, { ok: true, project });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  const projectRestoreMatch = /^\/api\/projects\/([^/]+)\/restore$/.exec(requestPath);
  if (request.method === 'POST' && projectRestoreMatch) {
    try {
      const session = await requireStage1Actor(request);
      const project = await stage1Store.restoreProject(session.user, decodeURIComponent(projectRestoreMatch[1]));
      sendJson(response, 200, { ok: true, project });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  const assignmentMatch = /^\/api\/projects\/([^/]+)\/assignments$/.exec(requestPath);
  if (request.method === 'POST' && assignmentMatch) {
    try {
      const session = await requireStage1Actor(request);
      const payload = await readJsonBody(request);
      await stage1Store.assignProject(session.user, decodeURIComponent(assignmentMatch[1]), payload);
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendStage1Error(response, error);
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/generation-tasks') {
    try {
      const payload = await readJsonBody(request);
      const { session, project } = await requireProjectAction(request, payload, { allowedRoles: ['designer', 'admin'] });
      const authoritativePayload = getAuthoritativeProjectPayload(payload, project, { prependPrompt: true });
      const task = await generationTaskStore.createTask(session.user, {
        ...authoritativePayload,
        requestedBy: session.user.id
      });
      void auditProjectAction(session.user, payload.projectId, 'pipeline.generation.task_created', {
        step: 'generation',
        traceId: payload.runId || task.id,
        taskId: task.id,
        slotId: payload.slotId || null,
        brandId: authoritativePayload.brandId,
        brandVersion: authoritativePayload.brandVersion,
        outputPresetId: authoritativePayload.outputPresetId
      }).catch((error) => console.warn(`Generation task audit unavailable: ${error instanceof Error ? error.message : String(error)}`));
      void runGenerationWorkerOnce();
      sendJson(response, 202, { ok: true, task });
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, Number(error?.status || 500), {
        ok: false,
        code: error?.code || 'TASK_CREATE_FAILED',
        error: error instanceof Error ? error.message : 'Unable to create generation task'
      });
    }
    return;
  }

  if (request.method === 'GET' && requestPath === '/api/generation-tasks') {
    try {
      const url = new URL(request.url, PUBLIC_BASE_URL);
      const projectId = String(url.searchParams.get('projectId') || '');
      await requireProjectAction(request, { projectId }, { allowedRoles: ['designer', 'admin'] });
      const tasks = await generationTaskStore.listProjectTasks(projectId, url.searchParams.get('limit') || 50);
      const refreshedTasks = await Promise.all(tasks.map(async (task) => {
        if (task.status !== 'succeeded' || !task.output?.storageKey) return task;
        return {
          ...task,
          output: { ...task.output, imageUrl: await assetStorage.getUrl(task.output.storageKey) }
        };
      }));
      sendJson(response, 200, { ok: true, tasks: refreshedTasks });
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : 'Unable to list generation tasks' });
    }
    return;
  }

  const generationTaskMatch = /^\/api\/generation-tasks\/([^/]+)$/.exec(requestPath);
  if (request.method === 'GET' && generationTaskMatch) {
    try {
      const url = new URL(request.url, PUBLIC_BASE_URL);
      const projectId = String(url.searchParams.get('projectId') || '');
      await requireProjectAction(request, { projectId }, { allowedRoles: ['designer', 'admin'] });
      const task = await generationTaskStore.getTask(decodeURIComponent(generationTaskMatch[1]), projectId);
      if (!task) {
        sendJson(response, 404, { ok: false, error: 'Generation task not found' });
        return;
      }
      const output = { ...(task.output || {}) };
      if (task.status === 'succeeded' && output.storageKey) {
        output.imageUrl = await assetStorage.getUrl(output.storageKey);
      }
      sendJson(response, 200, { ok: true, task: { ...task, output } });
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to read generation task'
      });
    }
    return;
  }

  if (request.method === 'PATCH' && generationTaskMatch) {
    try {
      const payload = await readJsonBody(request);
      const { session } = await requireProjectAction(request, payload, { allowedRoles: ['designer', 'admin'] });
      if (payload.action !== 'cancel') {
        sendJson(response, 400, { ok: false, error: 'Unsupported generation task action' });
        return;
      }
      const task = await generationTaskStore.cancelTask(
        decodeURIComponent(generationTaskMatch[1]),
        payload.projectId,
        session.user
      );
      if (!task) {
        sendJson(response, 409, { ok: false, error: '任务已经结束，或当前账号不能取消该任务。' });
        return;
      }
      await auditProjectAction(session.user, payload.projectId, 'pipeline.generation.task_cancelled', {
        step: 'generation',
        taskId: task.id,
        slotId: task.slotId
      });
      sendJson(response, 200, { ok: true, task });
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : 'Unable to cancel generation task' });
    }
    return;
  }

  if (request.method === 'GET' && requestPath.startsWith('/generated/')) {
    serveGeneratedImage(request, response);
    return;
  }

  if (request.method === 'GET' && requestPath.startsWith('/exports/')) {
    serveExportFile(request, response);
    return;
  }

  if (request.method === 'GET' && requestPath.startsWith('/assets/')) {
    serveLocalAsset(request, response);
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/sign-assets') {
    try {
      const payload = await readJsonBody(request);
      await requireProjectAction(request, payload, { allowedRoles: ['designer', 'operator', 'admin'] });
      const keys = Array.from(new Set((Array.isArray(payload.storageKeys) ? payload.storageKeys : [])
        .map((key) => String(key || '').trim())
        .filter((key) => key.startsWith(`projects/${sanitizeFilenamePart(payload.projectId)}/`))))
        .slice(0, 200);
      const assets = await Promise.all(keys.map(async (storageKey) => ({
        storageKey,
        url: await assetStorage.getUrl(storageKey)
      })));
      sendJson(response, 200, { ok: true, assets, storageMode: assetStorage.mode });
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to sign stored assets'
      });
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/plan-storyboard') {
    try {
      const payload = await readJsonBody(request);
      const { session, project } = await requireProjectAction(request, payload, { allowedRoles: ['designer', 'admin'] });
      const authoritativePayload = getAuthoritativeProjectPayload(payload, project);
      const result = await planStoryboardWithGemini(authoritativePayload);
      await auditProjectAction(session.user, payload.projectId, 'pipeline.storyboard.api_completed', {
        step: 'storyboard',
        ok: Boolean(result.ok),
        provider: result.provider || 'gemini',
        brandId: authoritativePayload.brandId,
        brandVersion: authoritativePayload.brandVersion,
        outputPresetId: authoritativePayload.outputPresetId
      });
      sendJson(response, result.status || 200, result);
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, error?.code === 'AI_REQUEST_TIMEOUT' ? 504 : 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/review-image') {
    try {
      const payload = await readJsonBody(request);
      const { session, project } = await requireProjectAction(request, payload, { allowedRoles: ['designer', 'operator', 'admin'] });
      const authoritativePayload = getAuthoritativeProjectPayload(payload, project);
      const result = await reviewImageWithGemini(authoritativePayload);
      await auditProjectAction(session.user, payload.projectId, 'pipeline.ai_review.api_completed', {
        step: 'review',
        traceId: payload.run?.id || '',
        brandId: authoritativePayload.brandId,
        brandVersion: authoritativePayload.brandVersion,
        ok: Boolean(result.ok),
        verdict: result.review?.verdict || ''
      });
      sendJson(response, result.status || 200, result);
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/claim-invite') {
    try {
      const payload = await readJsonBody(request);
      const result = claimInviteAccess(payload, request);
      sendJson(response, result.status || 200, result);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/save-generated-image') {
    try {
      const payload = await readJsonBody(request);
      const { session } = await requireProjectAction(request, payload, { allowedRoles: ['designer', 'admin'] });
      const result = await saveGeneratedImageFile(payload);
      await auditProjectAction(session.user, payload.projectId, 'pipeline.generated_image.saved', {
        step: 'generation',
        traceId: payload.runId || '',
        slotId: payload.slotId || null,
        filename: result.filename
      });
      sendJson(response, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/save-export') {
    try {
      const payload = await readJsonBody(request);
      const { session, project } = await requireProjectAction(request, payload, { allowedRoles: ['admin'], requireApproved: true });
      const authoritativePayload = getAuthoritativeProjectPayload(payload, project);
      const result = await saveExportFile(payload);
      await auditProjectAction(session.user, payload.projectId, 'pipeline.export_file.saved', {
        step: 'export',
        filename: result.filename,
        brandId: authoritativePayload.brandId,
        brandVersion: authoritativePayload.brandVersion
      });
      sendJson(response, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method === 'POST' && requestPath === '/api/export-images-zip') {
    try {
      const payload = await readJsonBody(request);
      const { session, project } = await requireProjectAction(request, payload, { allowedRoles: ['admin'], requireApproved: true });
      const authoritativePayload = getAuthoritativeProjectPayload(payload, project);
      const result = await saveImagesZipFile(payload);
      await auditProjectAction(session.user, payload.projectId, 'pipeline.images_zip.saved', {
        step: 'export',
        filename: result.filename,
        imageCount: result.count,
        brandId: authoritativePayload.brandId,
        brandVersion: authoritativePayload.brandVersion
      });
      sendJson(response, 200, {
        ok: true,
        ...result
      });
    } catch (error) {
      if (error instanceof Stage1Error) {
        sendStage1Error(response, error);
        return;
      }
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
    return;
  }

  if (request.method !== 'POST' || requestPath !== '/api/generate-image') {
    sendJson(response, 404, { ok: false, error: 'Not found' });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const { session, project } = await requireProjectAction(request, payload, { allowedRoles: ['designer', 'admin'] });
    const authoritativePayload = getAuthoritativeProjectPayload(payload, project, { prependPrompt: true });
    const result = await generateImage(authoritativePayload);
    await auditProjectAction(session.user, payload.projectId, 'pipeline.generation.api_completed', {
      step: 'generation',
      traceId: payload.runId || '',
      slotId: payload.slotId || null,
      ok: Boolean(result.ok),
      provider: result.provider || IMAGE_API_PROVIDER,
      brandId: authoritativePayload.brandId,
      brandVersion: authoritativePayload.brandVersion,
      outputPresetId: authoritativePayload.outputPresetId
    });
    sendJson(response, result.status || 200, result);
  } catch (error) {
    if (error instanceof Stage1Error) {
      sendStage1Error(response, error);
      return;
    }
    sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown server error'
    });
  }
});

server.listen(PORT, () => {
  console.log(`ListingFlow image API server listening on port ${PORT}`);
  console.log(`Public API base URL: ${PUBLIC_BASE_URL}`);
  if (database.configured) {
    generationTaskStore.recoverExpiredTasks()
      .then((count) => {
        if (count) console.log(`Recovered ${count} interrupted generation task(s).`);
      })
      .catch((error) => console.warn(`Generation task recovery unavailable: ${error instanceof Error ? error.message : String(error)}`));
    // New tasks wake the worker immediately. This low-frequency timer is only a
    // safety net, avoiding constant database traffic while the queue is empty.
    const workerTimer = setInterval(() => void runGenerationWorkerOnce(), 10000);
    workerTimer.unref();
    const recoveryTimer = setInterval(() => {
      generationTaskStore.recoverExpiredTasks()
        .then((count) => {
          if (count) void runGenerationWorkerOnce();
        })
        .catch((error) => console.warn(`Generation task recovery unavailable: ${error instanceof Error ? error.message : String(error)}`));
    }, 60000);
    recoveryTimer.unref();
  }
});
