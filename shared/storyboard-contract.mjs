function toText(value = '') {
  return String(value || '').trim();
}

function toTextList(value, limit = 8) {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n|；|;/)
      : [];
  return [...new Set(list.map(toText).filter(Boolean))].slice(0, limit);
}

function normalizeHex(value = '') {
  const match = toText(value).toUpperCase().match(/^#?([0-9A-F]{6})$/);
  return match ? `#${match[1]}` : '';
}

function getAspectRatio(size = '') {
  const match = toText(size).match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (!match) return '';
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return '';
  return `${width}:${height}`;
}

function getBrandColors(brand = {}) {
  if (typeof brand.colors === 'string') {
    return toTextList(brand.colors, 6).map(normalizeHex).filter(Boolean);
  }
  return (Array.isArray(brand.colors) ? brand.colors : [])
    .map((color) => normalizeHex(
      typeof color === 'string' ? color : color?.hex || color?.value || color?.color
    ))
    .filter(Boolean)
    .slice(0, 6);
}

function getDefaultSceneType(visualType = '', isWhiteMain = false) {
  if (isWhiteMain) return 'studio-white';
  if (visualType === 'lifestyle') return 'real-use';
  if (visualType === 'detail' || visualType === 'structure') return 'product-detail';
  if (visualType === 'state') return 'function-state';
  if (visualType === 'dimensions') return 'specification-layout';
  return 'product-led-layout';
}

export function normalizeStoryboardSlotContract({
  slot = {},
  id = 1,
  visualType = 'benefits',
  primaryClaim = '',
  visualProof = '',
  composition = '',
  outputPresetId = 'main-image',
  outputPresetSize = '',
  projectForm = {},
  brand = {},
  blockedClaims = [],
  guardrails = []
} = {}) {
  const slotId = Number(id) || 1;
  const isWhiteMain = outputPresetId === 'main-image' && slotId === 1;
  const noVisibleCopy = isWhiteMain || projectForm.outputLanguage === 'none';
  const brandId = toText(brand.id || projectForm.brandId || 'none') || 'none';
  const brandMode = brandId !== 'none';
  const sceneSource = slot.scenePlan && typeof slot.scenePlan === 'object' ? slot.scenePlan : {};
  const brandSource = slot.brandRules && typeof slot.brandRules === 'object' ? slot.brandRules : {};
  const outputSource = slot.outputSpec && typeof slot.outputSpec === 'object' ? slot.outputSpec : {};
  const evidenceSource = Array.isArray(slot.evidenceMap) ? slot.evidenceMap : [];
  const evidenceMap = evidenceSource
    .map((item) => ({ claim: toText(item?.claim), evidence: toText(item?.evidence) }))
    .filter((item) => item.claim || item.evidence)
    .slice(0, 3);

  if (!evidenceMap.length && (primaryClaim || visualProof)) {
    evidenceMap.push({ claim: toText(primaryClaim), evidence: toText(visualProof) });
  }

  const requiredElements = toTextList(
    sceneSource.requiredElements || slot.requiredElements,
    8
  );
  if (!requiredElements.length && visualProof) requiredElements.push(toText(visualProof));
  const forbiddenElements = toTextList([
    ...toTextList(sceneSource.forbiddenElements || slot.forbiddenElements, 8),
    ...toTextList(blockedClaims, 8)
  ], 12);
  const complianceRules = toTextList([
    ...toTextList(slot.complianceRules, 10),
    ...toTextList(guardrails, 10),
    ...(isWhiteMain
      ? ['纯白背景，仅展示完整产品', '不得出现文字、Logo、道具、场景或额外配件']
      : []),
    ...(blockedClaims.length ? ['不得表达、暗示或画面化呈现禁用卖点'] : [])
  ], 14);
  const allowedColors = isWhiteMain
    ? []
    : toTextList(brandSource.allowedColors, 6).map(normalizeHex).filter(Boolean).length
      ? toTextList(brandSource.allowedColors, 6).map(normalizeHex).filter(Boolean)
      : getBrandColors(brand);

  return {
    contractVersion: 1,
    evidenceMap,
    allowedCopy: noVisibleCopy
      ? []
      : toTextList(slot.allowedCopy || slot.copyPlan?.allowedCopy, 5),
    copyPolicy: noVisibleCopy
      ? '本图禁止新增任何可见文案。'
      : toText(slot.copyPolicy || slot.copyPlan?.policy)
        || '只使用与画面证据直接相关的短文案，避免大段解释。',
    scenePlan: {
      type: toText(sceneSource.type || slot.sceneType)
        || getDefaultSceneType(visualType, isWhiteMain),
      environment: toText(sceneSource.environment || slot.environment)
        || (isWhiteMain ? '纯白摄影棚背景' : toText(composition)),
      requiredElements,
      forbiddenElements,
      physicalLogic: toText(sceneSource.physicalLogic || slot.physicalLogic)
        || '产品比例、接触点、透视、阴影和使用状态必须符合真实物理逻辑。'
    },
    brandRules: {
      mode: brandMode ? 'brand' : 'baseline',
      brandId,
      brandVersion: Number(brand.version || brandSource.brandVersion || 0),
      allowedColors,
      titleColor: normalizeHex(brandSource.titleColor || brand.titleColor),
      arrowStyle: toText(brandSource.arrowStyle || brand.arrowStyle),
      logoPolicy: isWhiteMain || outputPresetId !== 'aplus'
        ? '禁止使用 Logo'
        : toText(brandSource.logoPolicy || brand.logoPolicy) || '仅按品牌规则使用已上传 Logo'
    },
    outputSpec: {
      presetId: outputPresetId,
      size: toText(outputSource.size || outputPresetSize),
      aspectRatio: toText(outputSource.aspectRatio) || getAspectRatio(outputPresetSize),
      backgroundRule: toText(outputSource.backgroundRule)
        || (isWhiteMain ? '纯白背景' : brandMode ? '遵循品牌背景策略' : '中性电商背景或真实使用场景'),
      titlePlacement: noVisibleCopy
        ? '无标题'
        : toText(outputSource.titlePlacement)
          || (outputPresetId === 'aplus' ? '按模块版式放置' : '标题统一置于画面上方'),
      logoAllowed: Boolean(outputPresetId === 'aplus' && !isWhiteMain && brandMode)
    },
    complianceRules
  };
}

export function formatStoryboardSlotContract(contract = {}) {
  const evidence = (contract.evidenceMap || [])
    .map((item) => `${item.claim || '画面目标'} -> ${item.evidence || '待补充证据'}`)
    .join('; ');
  const scene = contract.scenePlan || {};
  const brand = contract.brandRules || {};
  const output = contract.outputSpec || {};
  return [
    evidence ? `Evidence map: ${evidence}.` : '',
    contract.allowedCopy?.length
      ? `Allowed visible copy: ${contract.allowedCopy.join('; ')}.`
      : `Visible copy policy: ${contract.copyPolicy || 'No visible copy.'}`,
    `Scene contract: type=${scene.type || 'unspecified'}; environment=${scene.environment || 'unspecified'}.`,
    scene.requiredElements?.length ? `Required visual elements: ${scene.requiredElements.join('; ')}.` : '',
    scene.forbiddenElements?.length ? `Forbidden visual elements or implications: ${scene.forbiddenElements.join('; ')}.` : '',
    scene.physicalLogic ? `Physical logic contract: ${scene.physicalLogic}` : '',
    `Brand contract: mode=${brand.mode || 'baseline'}; colors=${brand.allowedColors?.join(', ') || 'neutral only'}; titleColor=${brand.titleColor || 'not specified'}; arrowStyle=${brand.arrowStyle || 'not specified'}; logo=${brand.logoPolicy || 'not allowed'}.`,
    `Output contract: ${output.presetId || ''} ${output.size || ''} ${output.aspectRatio || ''}; background=${output.backgroundRule || ''}; title=${output.titlePlacement || ''}; logoAllowed=${Boolean(output.logoAllowed)}.`,
    contract.complianceRules?.length ? `Compliance contract: ${contract.complianceRules.join('; ')}.` : ''
  ].filter(Boolean).join(' ');
}
