import {
  getVisibleCopyLanguageInstruction,
  normalizeProjectLanguageFields
} from '../shared/output-language.mjs';

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export class ProjectBrandContextError extends Error {
  constructor(message, code = 'PROJECT_BRAND_SNAPSHOT_REQUIRED') {
    super(message);
    this.name = 'ProjectBrandContextError';
    this.code = code;
    this.status = 409;
  }
}

export function normalizeProjectOutputPresetId(value) {
  return ['aplus', 'a-plus', 'a_plus'].includes(String(value || '').trim().toLowerCase())
    ? 'aplus'
    : 'main-image';
}

function isBrandColorApplicable(color = {}, outputPresetId = 'main-image', slotId = 1) {
  if (outputPresetId === 'main-image' && Number(slotId) === 1) return false;
  if (color.scope === 'aplus-only') return outputPresetId === 'aplus';
  if (color.scope === 'main-secondary') return outputPresetId === 'main-image' && Number(slotId) > 1;
  return outputPresetId === 'aplus' || (outputPresetId === 'main-image' && Number(slotId) > 1);
}

function buildBrandPromptContract(snapshot, baselineMode, slotId = 1) {
  if (baselineMode || snapshot.brandId === 'none') {
    return [
      'SERVER PROJECT STYLE CONTRACT:',
      'Use baseline mode. Do not apply a brand palette, brand logo, branded title treatment, or brand-specific decorative system.'
    ].join('\n');
  }

  const rules = safeObject(snapshot.rules);
  const colors = Array.isArray(rules.colors)
    ? rules.colors.filter((color) => isBrandColorApplicable(color, snapshot.outputPresetId, slotId)).map((color) => [
      color.hex || '',
      `${Number(color.ratio || 0)}%`,
      color.role ? `role ${color.role}` : '',
      color.scope ? `scope ${color.scope}` : ''
    ].filter(Boolean).join(' ')).filter(Boolean).join(', ')
    : '';
  return [
    'SERVER PROJECT BRAND CONTRACT (authoritative frozen project snapshot):',
    `Brand: ${snapshot.brandName || rules.name || snapshot.brandId}; version: ${snapshot.brandVersion}.`,
    colors ? `Palette: ${colors}. These are hidden art-direction constraints; never print swatches, percentages, or HEX codes.` : '',
    rules.titleColor ? `Title color: ${rules.titleColor}.` : '',
    rules.arrowStyle ? `Arrow style: ${rules.arrowStyle}.` : '',
    rules.iconStyle ? `Icon style: ${rules.iconStyle}.` : '',
    rules.annotationStyle ? `Annotation-line style: ${rules.annotationStyle}.` : '',
    rules.cornerStyle ? `Corner style: ${rules.cornerStyle}.` : '',
    rules.labelStyle ? `Label style: ${rules.labelStyle}.` : '',
    rules.backgroundPolicy ? `Background policy: ${rules.backgroundPolicy}.` : '',
    Array.isArray(rules.scenes) && rules.scenes.length ? `Scene cues: ${rules.scenes.join(', ')}.` : '',
    Array.isArray(rules.forbiddenStyles) && rules.forbiddenStyles.length ? `Forbidden styles: ${rules.forbiddenStyles.join(', ')}.` : '',
    rules.logoPolicy ? `Logo policy: ${rules.logoPolicy}.` : '',
    Array.isArray(rules.styleRules) && rules.styleRules.length ? `Style rules: ${rules.styleRules.join('; ')}.` : '',
    Array.isArray(rules.exampleImages) && rules.exampleImages.length
      ? `${rules.exampleImages.length} frozen brand visual examples are attached server-side for style reference only. Copy their visual language, never their products, claims, or text.`
      : '',
    'Do not replace these rules with client cache, default brand data, or inferred styling.'
  ].filter(Boolean).join('\n');
}

export function applyAuthoritativeProjectContext(payload = {}, project = {}, options = {}) {
  const projectData = safeObject(project.projectData);
  const storedForm = safeObject(projectData.form);
  const snapshot = safeObject(project.brandSnapshot);
  const brandId = String(snapshot.brandId || storedForm.brandId || 'none').trim() || 'none';
  const outputPresetId = normalizeProjectOutputPresetId(
    snapshot.outputPresetId || storedForm.planOutputPresetId || payload.outputPresetId || payload.outputType
  );
  const baselineMode = payload.baselineMode === true || brandId === 'none';

  if (!baselineMode && (!snapshot.rules || snapshot.brandId !== brandId || !Number(snapshot.brandVersion))) {
    throw new ProjectBrandContextError('当前项目缺少可验证的品牌快照，请回到项目资料重新选择并保存品牌。');
  }

  const brandProfile = baselineMode
    ? { id: 'none', name: 'Baseline', version: 0 }
    : {
      ...safeObject(snapshot.rules),
      id: brandId,
      name: snapshot.brandName || snapshot.rules?.name || brandId,
      version: Number(snapshot.brandVersion)
    };
  const brandSnapshot = {
    brandId,
    brandName: snapshot.brandName || (brandId === 'none' ? '不指定品牌' : brandProfile.name),
    brandVersion: baselineMode ? 0 : Number(snapshot.brandVersion),
    outputPresetId,
    rules: baselineMode ? null : safeObject(snapshot.rules)
  };
  const projectForm = {
    ...safeObject(payload.projectForm),
    ...storedForm,
    ...normalizeProjectLanguageFields({ ...safeObject(payload.projectForm), ...storedForm }),
    brandId,
    planOutputPresetId: outputPresetId
  };
  const context = {
    ...payload,
    projectForm,
    brandId,
    brandName: brandSnapshot.brandName,
    brandVersion: brandSnapshot.brandVersion,
    brandProfile,
    brandSnapshot,
    baselineMode,
    outputPresetId,
    outputType: outputPresetId === 'aplus' ? 'a-plus' : 'main-image'
  };

  if (options.prependPrompt && String(payload.prompt || '').trim()) {
    const marker = 'SERVER PROJECT BRAND CONTRACT';
    const baselineMarker = 'SERVER PROJECT STYLE CONTRACT';
    const languageMarker = 'SERVER PROJECT COPY LANGUAGE CONTRACT';
    const existingPrompt = String(payload.prompt);
    const promptParts = [];
    if (!existingPrompt.includes(marker) && !existingPrompt.includes(baselineMarker)) {
      promptParts.push(buildBrandPromptContract(brandSnapshot, baselineMode, Number(payload.slotId || payload.slot?.id || 1)));
    }
    promptParts.push(existingPrompt);
    if (!existingPrompt.includes(languageMarker)) {
      promptParts.push(`${languageMarker} (authoritative saved project setting; this final rule overrides conflicting language instructions above):\n${getVisibleCopyLanguageInstruction(projectForm)}`);
    }
    context.prompt = promptParts.join('\n\n');
  }
  return context;
}
