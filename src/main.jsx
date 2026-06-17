import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  Eye,
  FileImage,
  FolderOpen,
  ImagePlus,
  KeyRound,
  Layers,
  LockKeyhole,
  MessageSquareWarning,
  PackageCheck,
  Palette,
  PencilLine,
  Plus,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import './styles.css';

const PROJECTS_STORAGE_KEY = 'listingflow.projects.v1';
const BRAND_LIBRARY_STORAGE_KEY = 'listingflow.brands.v1';
const IMAGE_API_BASE_URL = import.meta.env.VITE_IMAGE_API_BASE_URL || 'http://localhost:5174';
const sourceImage = '/sample/source/main-source.jpg';
const generatedImages = [
  '/sample/final/01-main-white-background.png',
  '/sample/final/02-core-features.png',
  '/sample/final/03-lifestyle-kitchen.png',
  '/sample/final/04-detail-closeups.png',
  '/sample/final/05-foldable-storage.png',
  '/sample/final/06-structure-specs.png',
  '/sample/final/07-dimensions-included.png'
];

const facts = [
  {
    claim: 'Cosyland bamboo learning tower',
    source: 'user-provided',
    confidence: 'high',
    state: 'allowed',
    allowed: true,
    owner: '运营确认'
  },
  {
    claim: 'Foldable structure',
    source: 'visible + user-provided',
    confidence: 'high',
    state: 'allowed',
    allowed: true,
    owner: '产品确认'
  },
  {
    claim: '150 lb capacity',
    source: 'user-provided',
    confidence: 'medium',
    state: 'evidence',
    allowed: true,
    owner: '需留证据'
  },
  {
    claim: 'CPSC Certified',
    source: 'user-provided',
    confidence: 'medium',
    state: 'evidence',
    allowed: true,
    owner: '证书待归档'
  },
  {
    claim: 'Anti-tip / prevents falls',
    source: 'inference',
    confidence: 'low',
    state: 'blocked',
    allowed: false,
    owner: '不可上图'
  },
  {
    claim: 'Height adjustable',
    source: 'negative fact',
    confidence: 'high',
    state: 'blocked',
    allowed: false,
    owner: '产品不具备'
  }
];

const slots = [
  {
    id: 1,
    title: 'Main Image',
    goal: '白底主图',
    claims: ['真实产品图', '竹制外观'],
    status: 'approved',
    method: '本地裁切',
    image: generatedImages[0],
    checks: ['白底粗筛通过', '产品未重绘', '2000 x 2000']
  },
  {
    id: 2,
    title: 'Core Benefits',
    goal: '核心卖点',
    claims: ['Bamboo', 'Foldable', '150 lb'],
    status: 'review',
    method: '模板合成',
    image: generatedImages[1],
    checks: ['文案可追溯', '承重与认证分开']
  },
  {
    id: 3,
    title: 'Lifestyle',
    goal: '生活场景',
    claims: ['亲子厨房参与', '成人看护'],
    status: 'rework',
    method: 'GPT 原图参考',
    image: generatedImages[2],
    checks: ['比例需人工复核', '产品必须回原图重生']
  },
  {
    id: 4,
    title: 'Details',
    goal: '细节特写',
    claims: ['圆角', '黑色锁扣', '竹纹'],
    status: 'approved',
    method: '模板合成',
    image: generatedImages[3],
    checks: ['无新增配件', '结构局部清楚']
  },
  {
    id: 5,
    title: 'Function State',
    goal: '功能/状态展示',
    claims: ['Key function', 'Use state'],
    status: 'approved',
    method: '模板合成',
    image: generatedImages[4],
    checks: ['只展示真实具备功能', '不强行套用折叠']
  },
  {
    id: 6,
    title: 'Structure',
    goal: '结构说明',
    claims: ['A-frame', 'fixed height'],
    status: 'review',
    method: '模板合成',
    image: generatedImages[5],
    checks: ['不做稳定性比较', '不暗示防跌']
  },
  {
    id: 7,
    title: 'Dimensions',
    goal: '尺寸与配件',
    claims: ['90cm', '98cm folded', 'included tools'],
    status: 'approved',
    method: '模板合成',
    image: generatedImages[6],
    checks: ['展开/折叠分状态标注']
  }
];

const reviewStatusMeta = {
  approved: { text: '已通过', shortText: '通过', className: 'approved', icon: Check },
  review: { text: '待审核', shortText: '待审', className: 'review', icon: Eye },
  rework: { text: '退回修改', shortText: '返工', className: 'rework', icon: RefreshCcw },
  blocked: { text: '禁止导出', shortText: '禁止', className: 'blocked', icon: X }
};

const reviewerRoles = {
  human: {
    label: '人工',
    title: '人工审核',
    helper: '检查产品是否变形、比例是否真实、画面是否证明卖点，文案是否合规。',
    passText: '人工通过',
    reworkText: '退回修改'
  },
  design: {
    label: '设计',
    title: '设计审核',
    helper: '检查产品是否变形、比例是否真实、画面是否可用。',
    passText: '设计通过',
    reworkText: '退回视觉修改'
  },
  ops: {
    label: '运营',
    title: '运营审核',
    helper: '检查卖点、证据、尺寸和 Amazon 表达是否准确。',
    passText: '运营通过',
    reworkText: '退回文案/证据'
  },
  admin: {
    label: '管理员',
    title: '最终放行',
    helper: '可同时放行设计和运营，也可禁止导出。',
    passText: '最终通过',
    reworkText: '退回重审'
  }
};

const genericStoryboardTemplates = [
  {
    id: 1,
    title: 'Main Image',
    goal: '白底主图',
    composition: '只展示真实产品本体，纯白背景，不加场景、不加图标、不加促销文字。',
    preferred: ['material', 'finish', 'color', 'design'],
    evidenceLimit: 0,
    visualType: 'main',
    guardrails: ['产品结构必须与原始图一致', '主图不放尺寸线、徽章或道具']
  },
  {
    id: 2,
    title: 'Core Benefits',
    goal: '核心卖点图',
    composition: '产品居中，周围用 3-4 个短标签表达最重要的材质、外观、功能或套装卖点。',
    preferred: ['material', 'finish', 'design', 'feature', 'include', 'set'],
    evidenceLimit: 2,
    visualType: 'benefits',
    guardrails: ['只使用 Ledger 中允许或需证据的卖点', '不写 best、No.1、safest 等绝对化表达']
  },
  {
    id: 3,
    title: 'Lifestyle',
    goal: '生活场景图',
    composition: '把产品放入真实使用场景，强调使用氛围和尺寸比例，产品必须像真实物体一样落在台面、地面或对应环境中。',
    preferred: ['use', 'suitable', 'kitchen', 'home', 'outdoor', 'office', 'daily'],
    evidenceLimit: 1,
    visualType: 'lifestyle',
    guardrails: ['不生成不符合物理逻辑的姿势、支撑或比例', '不把产品放进不相关场景']
  },
  {
    id: 4,
    title: 'Details',
    goal: '细节特写图',
    composition: '用局部特写展示材质、表面、接口、按钮、把手、配件或工艺细节，不改变产品结构。',
    preferred: ['material', 'finish', 'handle', 'knob', 'edge', 'detail', 'accessory', 'include'],
    evidenceLimit: 1,
    visualType: 'detail',
    guardrails: ['只展示真实存在细节', '不新增产品没有的零件']
  },
  {
    id: 5,
    title: 'Function State',
    goal: '功能/状态图',
    composition: '根据产品真实功能选择一种状态对比或使用方式展示，例如收纳、开合、安装、配件组合或核心操作，不存在的功能不要展示。',
    preferred: ['function', 'state', 'foldable', 'fold', 'storage', 'open', 'close', 'accessory', '14cm', 'thickness'],
    evidenceLimit: 1,
    visualType: 'state',
    strictClaimMatch: true,
    guardrails: ['只展示项目资料中确认存在的功能', '没有折叠功能的产品不得生成折叠状态', '不说可调节高度']
  },
  {
    id: 6,
    title: 'Structure',
    goal: '结构说明图',
    composition: '用中性结构标注说明产品组成、材质层次、支撑点、接口、容量或关键部件，不做未验证性能承诺。',
    preferred: ['structure', 'material', 'capacity', 'component', 'handle', 'lid', 'base'],
    evidenceLimit: 1,
    visualType: 'structure',
    guardrails: ['不写未确认的安全或性能承诺', '不做竞品对比第一']
  },
  {
    id: 7,
    title: 'Dimensions',
    goal: '尺寸与配件图',
    composition: '展示已确认尺寸、容量、包装清单或配件信息；没有确认的数据不要写。',
    preferred: ['cm', 'inch', 'dimension', 'size', 'capacity', 'tools', 'instructions', 'pads', 'include'],
    evidenceLimit: 3,
    visualType: 'dimensions',
    strictClaimMatch: true,
    guardrails: ['只写已经确认的规格', '没有确认的尺寸或容量不写']
  }
];

const aPlusStoryboardTemplates = [
  {
    id: 1,
    title: 'A+ Brand Hero',
    goal: 'A+首屏内容模块',
    composition: '用品牌化横幅版式展示产品核心定位，可使用场景、背景色、产品大图和短英文标题，不要求白底。',
    preferred: ['material', 'design', 'feature', 'use', 'brand'],
    evidenceLimit: 2,
    visualType: 'benefits',
    roleType: 'hero_with_claim',
    guardrails: ['不按白底主图生成', '标题位置服从版式，不强制顶部', '只使用可上图卖点']
  },
  {
    id: 2,
    title: 'A+ Benefit Story',
    goal: '组合卖点说明',
    composition: '把 2-3 个相关可用卖点整合成一个清晰内容故事，用产品图、短标签和视觉证据共同说明。',
    preferred: ['benefit', 'feature', 'material', 'comfort', 'storage', 'capacity', 'include'],
    evidenceLimit: 2,
    visualType: 'benefits',
    roleType: 'feature_callout',
    guardrails: ['可以组合相关卖点', '不把无关卖点硬塞到一张图', '不写未确认参数']
  },
  {
    id: 3,
    title: 'A+ Lifestyle Module',
    goal: '真实使用场景',
    composition: '用真实使用场景证明产品适用环境、尺寸比例和使用方式，画面更像 A+ 内容区而不是单张主图。',
    preferred: ['use', 'home', 'kitchen', 'outdoor', 'daily', 'family', 'lifestyle'],
    evidenceLimit: 1,
    visualType: 'lifestyle',
    roleType: 'use_scenario',
    guardrails: ['场景必须符合真实用途', '比例和物理逻辑必须可信', '不暗示禁用卖点']
  },
  {
    id: 4,
    title: 'A+ Detail Proof',
    goal: '细节/材质证明',
    composition: '用局部特写、分区版式或细节拼图展示材质、工艺、结构、配件或外观细节。',
    preferred: ['material', 'finish', 'detail', 'texture', 'handle', 'edge', 'accessory', 'component'],
    evidenceLimit: 1,
    visualType: 'detail',
    roleType: 'material_macro',
    guardrails: ['细节必须来自参考图或产品资料', '不新增看不见的内部结构']
  },
  {
    id: 5,
    title: 'A+ Function Module',
    goal: '功能/状态内容模块',
    composition: '展示已确认功能、状态、操作、收纳、组合或使用流程，可用横向分步骤或对比版式。',
    preferred: ['function', 'state', 'fold', 'storage', 'setup', 'operation', 'cleaning', 'multi'],
    evidenceLimit: 2,
    visualType: 'state',
    roleType: 'before_after',
    guardrails: ['只展示已确认状态和功能', '没有确认的功能不要生成']
  },
  {
    id: 6,
    title: 'A+ Structure & Specs',
    goal: '结构/规格信息模块',
    composition: '用结构关系、规格摘要、配件清单或尺寸信息组成 A+ 信息模块；只有确认数据才能写出来。',
    preferred: ['structure', 'dimension', 'size', 'capacity', 'include', 'tools', 'parts', 'spec'],
    evidenceLimit: 3,
    visualType: 'structure',
    roleType: 'dimension_spec',
    guardrails: ['不编造尺寸、容量、重量或认证', '规格信息必须来自 Ledger 或项目资料']
  },
  {
    id: 7,
    title: 'A+ Trust & Bundle',
    goal: '信任/套装/补充卖点模块',
    composition: '把剩余可用卖点整理成信任感或套装内容模块，例如包装清单、配件、认证证据、使用建议或品牌补充说明。',
    preferred: ['certified', 'include', 'bundle', 'package', 'warranty', 'care', 'clean', 'safe'],
    evidenceLimit: 3,
    visualType: 'dimensions',
    roleType: 'bundle_contents',
    guardrails: ['认证和安全类必须有证据', '不能使用 blocked 或 needs-evidence 卖点做最终承诺']
  }
];

const auditItems = [
  {
    label: '只允许引用 allowed_in_images 卖点',
    detail: '提示词与图中文字不能绕过 fact ledger。',
    state: 'pass'
  },
  {
    label: '每张生图重新使用原始白底图',
    detail: '禁止基于上一轮生成图继续改，避免产品漂移。',
    state: 'pass'
  },
  {
    label: '生活场景物理逻辑',
    detail: '孩子、产品、台面比例必须人工复核。',
    state: 'warn'
  },
  {
    label: '安全性能暗示',
    detail: '不得暗示 anti-tip、防跌、承重护栏等未确认功能。',
    state: 'warn'
  }
];

const navItems = [
  {
    id: 'project',
    label: '项目资料',
    icon: FileImage,
    eyebrow: 'Intake',
    title: '准备产品资料',
    subtitle: '上传产品图、填写卖点，先确认这个项目要生成哪一个产品。'
  },
  {
    id: 'ledger',
    label: '卖点确认',
    icon: ClipboardCheck,
    eyebrow: 'Claims',
    title: '确认可上图卖点',
    subtitle: '把卖点分成可使用、需证据和禁用，后面的图片只从这里取内容。'
  },
  {
    id: 'storyboard',
    label: '图片方案',
    icon: Layers,
    eyebrow: 'Plan',
    title: '规划 7 张图片',
    subtitle: '先决定每张图要证明什么，再进入真实生图。'
  },
  {
    id: 'generation',
    label: '生成图片',
    icon: Sparkles,
    eyebrow: 'Generate',
    title: '生成候选图',
    subtitle: '对照原始产品图生成候选图，并快速判断是否可用。'
  },
  {
    id: 'review',
    label: '审核图片',
    icon: ShieldCheck,
    eyebrow: 'Review',
    title: '审核与放行',
    subtitle: '确认产品、文案、比例和物理逻辑都没问题。'
  },
  {
    id: 'export',
    label: '导出图片',
    icon: Download,
    eyebrow: 'Export',
    title: '导出最终图片',
    subtitle: '选择最终图并打包成 ZIP。'
  }
];

const mobileTabLabels = {
  project: '资料',
  ledger: '卖点',
  storyboard: '方案',
  generation: '生成',
  review: '审核',
  export: '导出'
};

// Amazon-style "a + smile + sparkles" glyph (white, sits on the orange brand chip)
function BrandLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <text
        x="47"
        y="72"
        textAnchor="middle"
        fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
        fontSize="68"
        fontWeight="900"
        fill="#fff"
      >
        a
      </text>
      <path d="M20 75c18 15 46 14 64-3" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M84 72l5-12-12 4z" fill="#fff" />
      <path d="M71 14c0 9 4 13 13 13-9 0-13 4-13 13 0-9-4-13-13-13 9 0 13-4 13-13z" fill="#fff" />
      <path d="M90 35c0 5 2 7 7 7-5 0-7 2-7 7 0-5-2-7-7-7 5 0 7-2 7-7z" fill="#fff" opacity="0.92" />
    </svg>
  );
}

const globalNavItems = [
  {
    id: 'quality',
    label: '质量 Console',
    icon: BarChart3,
    eyebrow: 'Quality',
    title: '质量 Console',
    subtitle: '查看质量样本、失败原因、CSV 和图槽提示词调优。'
  },
  {
    id: 'brands',
    label: '品牌库',
    icon: Palette,
    eyebrow: 'Brand',
    title: '品牌库',
    subtitle: '管理 Logo、品牌色和图片风格，让不同产品按对应品牌输出。'
  }
];

const projectFacts = [
  ['品牌/产品', 'Cosyland learning tower'],
  ['材质', '竹制'],
  ['结构', '可折叠，不可调节高度'],
  ['承重', '150 lb'],
  ['适用年龄', '18 个月 - 6 岁'],
  ['认证', 'CPSC Certified'],
  ['配件', '防滑垫、脚垫、工具、说明书'],
  ['尺寸', '展开 90cm，折叠高 98cm，折叠厚 14cm，占地宽 45cm，护栏宽 43cm']
];

function splitListText(value = '') {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '')
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const legacyBrandColorMap = {
  white: '#FFFFFF',
  'warm white': '#F7F3EA',
  'neutral gray': '#8A8F8B',
  'soft sage': '#A7BFA1',
  'natural wood': '#D7B98C',
  charcoal: '#2F3432',
  'warm beige': '#D9C4A3',
  'deep green': '#2E5F4D'
};

function normalizeHexColor(value = '') {
  const raw = String(value || '').trim();
  const legacy = legacyBrandColorMap[raw.toLowerCase()];
  const candidate = legacy || raw;
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) return candidate.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    const [, r, g, b] = candidate;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return '';
}

function normalizeBrandColorEntry(entry = {}, index = 0, fallbackRatio = 0) {
  if (typeof entry === 'string') {
    const match = entry.match(/(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?|[a-zA-Z ]+)\s*(\d{1,3})?%?/);
    const hex = normalizeHexColor(match?.[1] || entry);
    if (!hex) return null;
    return {
      id: `color-${index}-${hex.replace('#', '')}`,
      hex,
      ratio: Math.min(100, Math.max(1, Number(match?.[2]) || fallbackRatio || 1))
    };
  }
  const hex = normalizeHexColor(entry.hex || entry.value || entry.color);
  if (!hex) return null;
  return {
    id: entry.id || `color-${index}-${hex.replace('#', '')}`,
    hex,
    ratio: Math.min(100, Math.max(1, Number(entry.ratio) || fallbackRatio || 1))
  };
}

function normalizeBrandColors(colors = []) {
  const source = Array.isArray(colors) ? colors : splitListText(colors);
  const fallbackRatio = source.length ? Math.max(1, Math.round(100 / source.length)) : 0;
  return source
    .map((entry, index) => normalizeBrandColorEntry(entry, index, fallbackRatio))
    .filter(Boolean)
    .slice(0, 8);
}

function getBrandColorRatioTotal(colors = []) {
  return normalizeBrandColors(colors).reduce((sum, color) => sum + Number(color.ratio || 0), 0);
}

function formatBrandColorPalette(brand = {}) {
  const colors = normalizeBrandColors(brand.colors);
  return colors.length
    ? colors.map((color) => `${color.hex} ${color.ratio}%`).join(', ')
    : 'no brand colors configured';
}

function createDeleteChallengeText() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

const defaultBrandLibrary = [
  {
    id: 'none',
    name: '不指定品牌',
    tone: '根据产品和类目生成中性 Amazon 电商风格',
    colors: [],
    backgroundPolicy: '使用中性电商背景，避免品牌化装饰。',
    scenes: [],
    forbiddenStyles: ['过度装饰', '廉价促销风'],
    logoPolicy: '不展示 Logo',
    logoPreview: '',
    styleRules: ['真实产品优先', '画面简洁', '不使用过度装饰']
  },
  {
    id: 'cosyland',
    name: 'Cosyland',
    tone: '温暖、家庭、亲子、自然材质',
    colors: [
      { hex: '#F7F3EA', ratio: 45 },
      { hex: '#A7BFA1', ratio: 30 },
      { hex: '#D7B98C', ratio: 25 }
    ],
    backgroundPolicy: '02-07 可使用温暖家庭场景、柔和自然光和浅色背景块；01 不使用。',
    scenes: ['family kitchen', 'bright home', 'parent-child daily use'],
    forbiddenStyles: ['夸张安全承诺', '强促销风', '暗黑科技感'],
    logoPolicy: 'Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示 Logo。',
    logoPreview: '',
    styleRules: ['柔和自然光', '家庭生活感', '避免夸张安全承诺']
  },
  {
    id: 'overmont',
    name: 'Overmont',
    tone: '耐用、户外/厨房实用、现代电商质感',
    colors: [
      { hex: '#2F3432', ratio: 50 },
      { hex: '#D9C4A3', ratio: 30 },
      { hex: '#2E5F4D', ratio: 20 }
    ],
    backgroundPolicy: '02-07 可使用现代厨房、户外或深浅对比背景块；01 不使用。',
    scenes: ['modern kitchen countertop', 'outdoor campsite', 'practical cooking scene'],
    forbiddenStyles: ['廉价促销风', '过度奢华', '卡通风'],
    logoPolicy: 'Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示 Logo。',
    logoPreview: '',
    styleRules: ['真实材质质感', '干净高对比', '避免廉价促销风']
  }
];

function normalizeBrandProfile(brand = {}) {
  return {
    id: brand.id || `brand-${Date.now()}`,
    name: brand.name || '未命名品牌',
    tone: brand.tone || '清晰、真实、产品优先的 Amazon 电商风格',
    colors: normalizeBrandColors(brand.colors),
    backgroundPolicy: brand.backgroundPolicy || '02-07 可使用干净背景、品牌色块或真实场景；01 白底主图不使用。',
    scenes: Array.isArray(brand.scenes) ? brand.scenes : splitListText(brand.scenes),
    forbiddenStyles: Array.isArray(brand.forbiddenStyles) ? brand.forbiddenStyles : splitListText(brand.forbiddenStyles),
    logoPolicy: brand.id === 'none'
      ? '不展示 Logo'
      : 'Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示 Logo。',
    logoPreview: brand.logoPreview || '',
    styleRules: Array.isArray(brand.styleRules) ? brand.styleRules : splitListText(brand.styleRules)
  };
}

function normalizeBrandLibrary(brands = defaultBrandLibrary) {
  const normalized = (Array.isArray(brands) && brands.length ? brands : defaultBrandLibrary)
    .map(normalizeBrandProfile);
  const hasNone = normalized.some((brand) => brand.id === 'none');
  return hasNone ? normalized : [normalizeBrandProfile(defaultBrandLibrary[0]), ...normalized];
}

function loadStoredBrands() {
  if (typeof window === 'undefined') return normalizeBrandLibrary(defaultBrandLibrary);
  try {
    const stored = window.localStorage.getItem(BRAND_LIBRARY_STORAGE_KEY);
    if (!stored) return normalizeBrandLibrary(defaultBrandLibrary);
    const parsed = JSON.parse(stored);
    return normalizeBrandLibrary(parsed);
  } catch {
    return normalizeBrandLibrary(defaultBrandLibrary);
  }
}

function storeBrands(brands) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeBrandLibrary(brands);
  try {
    window.localStorage.setItem(BRAND_LIBRARY_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    const compact = normalized.map((brand) => ({ ...brand, logoPreview: '' }));
    window.localStorage.setItem(BRAND_LIBRARY_STORAGE_KEY, JSON.stringify(compact));
  }
}

function getBrandProfile(brandId, brands = defaultBrandLibrary) {
  const normalizedBrands = normalizeBrandLibrary(brands);
  return normalizedBrands.find((brand) => brand.id === brandId) || normalizedBrands[0];
}

function inferBrandId(form = {}, brands = defaultBrandLibrary) {
  const signal = [form.projectName, form.productName, form.sku, form.category].filter(Boolean).join(' ').toLowerCase();
  const matched = normalizeBrandLibrary(brands).find((brand) => brand.id !== 'none' && signal.includes(brand.name.toLowerCase()));
  return matched?.id || 'none';
}

function getProjectBrandId(form = {}, brands = defaultBrandLibrary) {
  return form.brandId && form.brandId !== 'none' ? form.brandId : inferBrandId(form, brands);
}

const initialProjectForm = {
  sku: 'CL-LT-BAM-FOLD-001',
  brandId: 'cosyland',
  projectName: 'Cosyland learning tower',
  category: 'Learning tower / Toddler step stool',
  productName: 'Cosyland bamboo foldable learning tower',
  planOutputPresetId: 'main-image',
  sourceImageName: '画板 1.jpg',
  sourceImagePreview: sourceImage,
  sourceImageAudit: null,
  referenceImages: {},
  claimsText: [
    'Bamboo material',
    'Foldable structure',
    '150 lb capacity',
    'CPSC Certified',
    'Suitable for 18 months to 6 years',
    'Includes anti-slip pads, foot pads, tools and instructions',
    'Anti-tip and prevents falls',
    'Height adjustable'
  ].join('\n')
};

const blankProjectForm = {
  sku: '',
  brandId: 'none',
  projectName: '',
  category: '',
  productName: '',
  planOutputPresetId: 'main-image',
  sourceImageName: '',
  sourceImagePreview: '',
  sourceImageAudit: null,
  referenceImages: {},
  claimsText: ''
};

const intakeModes = {
  sku: {
    label: '有 SKU 模式',
    icon: Database,
    title: '绑定 SKU 后确认可用字段',
    detail: '适合已经建档的产品。前期先记录 SKU 与人工确认卖点，等 ERP 字段清楚后再逐步接入自动同步。',
    status: '字段待确认',
    fields: [
      ['SKU', 'CL-LT-BAM-FOLD-001'],
      ['ERP 状态', '等待字段映射'],
      ['卖点来源', 'SKU 已编辑卖点 + 运营人工确认'],
      ['图片来源', '先上传白底图，后续再接资产库'],
      ['同步动作', '字段确认后再进入自动拉取']
    ]
  },
  manual: {
    label: '无 SKU 模式',
    icon: PencilLine,
    title: '手动创建临时项目',
    detail: '适合新品打样、竞品测试、ERP 未建档或设计先行的项目。资料由运营手动填写。',
    status: '保留备用入口',
    fields: [
      ['项目名', 'Cosyland learning tower'],
      ['SKU', '暂不绑定'],
      ['卖点来源', '手动填写 + 图片识别 + 人工确认'],
      ['图片来源', '上传白底图'],
      ['转正动作', '后续可绑定 ERP SKU']
    ]
  }
};

const skuMappedFacts = [
  ['SKU 标识', '先作为项目绑定键', '可先做'],
  ['卖点字段', '暂由运营复制/编辑进卖点表', '待确认'],
  ['规格字段', '尺寸、材质、颜色、包装等先人工确认', '待确认'],
  ['合规字段', '认证、适用年龄、警示语需证据绑定', '待确认'],
  ['图片资产', '先本地上传，后续再接 ERP 或素材库', '后续']
];

const workflowSteps = [
  ['1', '上传白底图', '锁定唯一产品参考，所有生成回到原图开始。'],
  ['2', '整理卖点', '普通卖点、差异化卖点和禁用卖点进入卖点表。'],
  ['3', '生成 7 图方案', '先产出图片简报，再按槽位生成候选图。'],
  ['4', 'AI 预审', '检查产品漂移、文案越界、场景比例和物理逻辑。'],
  ['5', '人工确认', '运营、设计、审核按角色放行或返工。'],
  ['6', '导出归档', '输出最终图片包和必要记录。']
];

const apiPolicy = [
  ['默认方案', '公司统一封装 API'],
  ['密钥归属', '管理员保存，员工不可见'],
  ['成本控制', '按项目、人员、图槽记录消耗'],
  ['权限方式', '普通员工只选择模型/质量档位'],
  ['备用入口', '高级账号可启用个人 API 覆盖'],
  ['推荐原因', '便于控成本、控权限、统一质量，也方便离职交接']
];

const outputPresets = [
  {
    id: 'main-image',
    label: '主图',
    size: '2000 x 2000',
    width: 2000,
    height: 2000,
    ratio: '1:1',
    prompt: 'Output as a square 2000 by 2000 pixel Amazon listing image. Slot-specific rules decide whether it must be white background or may use a scene/background.'
  },
  {
    id: 'aplus',
    label: 'A+',
    size: '1464 x 600',
    width: 1464,
    height: 600,
    ratio: '2.44:1',
    prompt: 'Output for Amazon A+ content: wide horizontal 1464 by 600 pixels. A+ is a richer content module, not a primary white-background image; use realistic product composition, clean editorial layout, and balanced marketing content without crowded text.'
  }
];

const QUALITY_SAMPLE_TARGET_PER_SLOT = 20;
const QUALITY_BASELINE_PRESET_ID = 'main-image';
const QUALITY_MAX_STORED_RUNS = QUALITY_SAMPLE_TARGET_PER_SLOT * 8;
const IMAGE_CLAIM_POOL_LIMIT = 12;
const CLAIMS_PER_IMAGE_LIMIT = 3;
const STORYBOARD_SLOT_COUNT = 7;

function getOutputPresetById(presetId) {
  return outputPresets.find((preset) => preset.id === presetId) || outputPresets[0];
}

function getProjectPlanOutputPresetId(form = {}) {
  return form.planOutputPresetId === 'aplus' ? 'aplus' : 'main-image';
}

function getProjectPlanOutputPreset(form = {}) {
  return getOutputPresetById(getProjectPlanOutputPresetId(form));
}

function isAPlusPlan(form = {}) {
  return getProjectPlanOutputPresetId(form) === 'aplus';
}

const generationVerdicts = {
  unreviewed: { label: '待判断', className: 'review', icon: Eye },
  usable: { label: '可用', className: 'approved', icon: Check },
  needs_fix: { label: '需修改', className: 'rework', icon: RefreshCcw },
  reject: { label: '不可用', className: 'blocked', icon: X }
};

const generationFailureReasons = [
  { id: 'product-drift', label: '产品变形' },
  { id: 'scale-error', label: '比例不合理' },
  { id: 'physical-logic', label: '物理逻辑不通' },
  { id: 'invented-parts', label: '凭空多部件' },
  { id: 'text-error', label: '文字/卖点错误' },
  { id: 'aesthetic', label: '审美单调' }
];

const promptTuningRules = {
  'product-drift': {
    title: '加强产品一致性',
    text: 'Preserve the exact product silhouette, part count, hardware placement, material finish, color family, and distinctive design details from the reference images. Do not simplify, stylize, or reinterpret the product.'
  },
  'scale-error': {
    title: '加强比例关系',
    text: 'Keep product scale believable relative to hands, furniture, counters, food, accessories, and surrounding scene elements. Use natural perspective and realistic object-to-object proportions.'
  },
  'physical-logic': {
    title: '加强物理逻辑',
    text: 'Ensure the product has realistic contact points, shadows, support, gravity, reflections, and usage state. Nothing may float, bend impossibly, intersect, or rest on an unsupported surface.'
  },
  'invented-parts': {
    title: '禁止新增部件',
    text: 'Do not add, remove, duplicate, or reshape product parts, attachments, handles, knobs, rails, buttons, screws, accessories, packaging, or labels unless they are clearly visible in the reference images.'
  },
  'text-error': {
    title: '加强英文文案',
    text: 'All visible generated copy must be short, natural, correctly spelled English. Do not render Chinese characters, garbled text, unsupported numbers, invented certifications, or unreadable labels.'
  },
  aesthetic: {
    title: '提升画面审美',
    text: 'Use a polished Amazon ecommerce layout with clean spacing, controlled lighting, refined edges, and a purposeful background. Avoid rough cutouts, jagged edges, clutter, generic decoration, or visually broken-looking details.'
  }
};

const listingImageStrategyRules = [
  'First principle: the image must visually prove the selected selling point. Use scene, product detail, physical state, comparison, scale, or structure as evidence before relying on explanatory text.',
  'Minimize visible explanatory copy. Text is allowed when it improves clarity, but the image must not become a text poster. Prefer one short English title or a few short labels over paragraphs.',
  'Blocked or forbidden claims must not be stated, suggested, implied, staged, symbolized, or visually hinted as a benefit. You may show neutral factual product appearance or ordinary use only when it does not communicate the blocked claim.',
  'For standard listing images, if an image includes a title, place the title consistently at the top of the image. A+ content is an exception: title placement may follow the module layout and does not have to be at the top.',
  'Across all seven standard listing images, maintain a unified visual system: consistent typography, title placement, label style, spacing, icon/callout treatment, lighting quality, and overall ecommerce art direction. A+ should follow the selected brand system but may use richer section layouts.'
];

function getListingImageStrategyText() {
  return listingImageStrategyRules.join(' ');
}

const slotQualityGuardrails = {
  main: [
    'Primary image rule: preserve the original product as the hero. Do not add visible text, props, badges, lifestyle scenes, colored backgrounds, or extra accessories.',
    'Keep the product large, centered, and cleanly cut out on pure white without changing the silhouette.'
  ],
  benefits: [
    'Core benefits rule: show no more than three short English callouts. Each callout must point to a visible product feature or a visually demonstrated benefit.',
    'Do not turn the image into a text poster. Product and visual proof must be stronger than labels.'
  ],
  lifestyle: [
    'Lifestyle rule: the scene must prove the primary claim through real use, believable scale, natural contact points, and correct product placement.',
    'Avoid decorative stock-photo backgrounds that do not explain the selling point.'
  ],
  detail: [
    'Detail rule: use a close-up, inset, or macro layout of the exact part that proves the primary claim. Do not invent hidden layers, extra parts, or unrelated accessories.',
    'If the reference does not show a detail clearly, keep the claim conservative and use a clean partial product crop.'
  ],
  state: [
    'Function state rule: only show states proven by uploaded references or confirmed facts. If the function is not confirmed, do not visualize it.',
    'Use one clear before/after, open/closed, setup/storage, or operation view instead of mixing several unrelated states.'
  ],
  structure: [
    'Structure rule: labels must point to real visible components. Do not use performance promises as structure labels unless they are proven in the Ledger.',
    'Use clean component callouts, exploded-view style only if it does not change product geometry, and no unsupported safety claims.'
  ],
  dimensions: [
    'Dimensions rule: only show confirmed dimensions, capacity, counts, and included items. Never invent numbers, sizes, weights, temperatures, or compatibility.',
    'If no specification facts are available, do not force a dimensions image; choose a stronger product-specific role instead.'
  ]
};

const qualityActionRules = {
  'product-drift': '下一轮先锁产品外观：加强参考图一致性，减少重绘和风格化。',
  'scale-error': '下一轮先修比例：限制场景物体、人物、台面和产品之间的大小关系。',
  'physical-logic': '下一轮先修物理逻辑：要求接触点、阴影、支撑和使用状态成立。',
  'invented-parts': '下一轮先禁新增结构：不允许多出配件、把手、按钮、盖子或包装。',
  'text-error': '下一轮先修文案：可见文字只用短英文，并且必须来自 Ledger。',
  aesthetic: '下一轮先修审美：增加构图层次、光线和背景目的性，避免纯装饰。'
};

const aiReviewVerdicts = {
  pass: { label: '低风险', className: 'approved', icon: Check },
  warn: { label: '需复核', className: 'review', icon: Eye },
  fail: { label: '高风险', className: 'blocked', icon: X }
};

const aiReviewCheckLabels = {
  productConsistency: '产品一致性',
  scalePhysicalLogic: '比例/物理逻辑',
  claimAccuracy: '卖点准确',
  textRisk: '文字风险',
  aesthetics: '画面可用性'
};

const referenceTypes = [
  {
    id: 'main',
    label: '主参考图',
    helper: '必填。锁定整体外观、材质和比例。',
    required: true
  },
  {
    id: 'side',
    label: '其他角度图',
    helper: '建议。侧面、背面、俯视或另一角度，用来减少结构猜测。',
    required: false
  },
  {
    id: 'state',
    label: '状态/功能图',
    helper: '可选。展开、收纳、开合、使用状态、功能变化等，按产品实际情况上传。',
    required: false
  },
  {
    id: 'detail',
    label: '细节图',
    helper: '可选。材质、接口、按钮、配件、工艺、局部结构等。',
    required: false
  },
  {
    id: 'dimension',
    label: '尺寸/包装图',
    helper: '可选。尺寸、包装清单、配件、说明书或规格信息。',
    required: false
  }
];

const reviewQueue = [
  {
    image: 'Lifestyle',
    issue: '生活场景比例需复核',
    detail: '孩子、台面、learning tower 的高度关系需要人工确认，避免不符合真实使用逻辑。',
    priority: '高'
  },
  {
    image: 'Structure',
    issue: '结构文案需保持中性',
    detail: '可以讲 A-frame 和 fixed height，不能延展为防跌、防倾倒等未确认安全承诺。',
    priority: '中'
  },
  {
    image: 'Core Benefits',
    issue: '承重与认证需证据归档',
    detail: '150 lb 和 CPSC Certified 可上图，但最终导出前要绑定证据文件。',
    priority: '中'
  }
];

const exportAssets = [
  ['7 张 Amazon 图片', '5/7 ready'],
  ['提示词快照', 'ready'],
  ['卖点表 CSV', 'ready'],
  ['审核记录', 'missing 2 approvals'],
  ['源图与参考包', 'ready']
];

function classifyClaim(text, intakeMode) {
  const normalized = text.toLowerCase();
  const blockedPatterns = [
    'anti-tip',
    'prevents falls',
    'fall proof',
    '防跌',
    '防摔',
    '防倾倒',
    '不会倒',
    'height adjustable',
    '可调节高度'
  ];
  const evidencePatterns = [
    'cpsc',
    'certified',
    '认证',
    '150 lb',
    '150lb',
    '承重',
    'heat distribution',
    'heat retention',
    'retention',
    'oven-safe',
    'oven safe',
    '耐高温',
    '烤箱',
    '导热',
    '保温',
    'months',
    'years',
    '年龄',
    '适用'
  ];
  const allowedPatterns = [
    'bamboo',
    'foldable',
    'enameled',
    'enamel',
    'cast iron',
    'matte',
    'finish',
    'knob',
    'handle',
    'handles',
    'casserole',
    'covered',
    'baking',
    'braising',
    'stewing',
    'roasting',
    'cookware',
    'pot',
    '铸铁',
    '珐琅',
    '哑光',
    '旋钮',
    '把手',
    '锅',
    '炖',
    '烘焙',
    'material',
    '材质',
    '竹',
    '折叠',
    'include',
    'included',
    'tools',
    'instructions',
    '配件',
    '说明书',
    'foot pads',
    'anti-slip pads'
  ];

  if (blockedPatterns.some((pattern) => normalized.includes(pattern))) {
    return {
      state: 'blocked',
      allowed: false,
      confidence: 'high',
      owner: '不可上图',
      source: intakeMode === 'sku' ? 'sku-draft flagged' : 'manual flagged'
    };
  }

  if (evidencePatterns.some((pattern) => normalized.includes(pattern))) {
    return {
      state: 'evidence',
      allowed: true,
      confidence: 'medium',
      owner: '需留证据',
      source: intakeMode === 'sku' ? 'sku-draft evidence' : 'manual evidence'
    };
  }

  if (allowedPatterns.some((pattern) => normalized.includes(pattern))) {
    return {
      state: 'allowed',
      allowed: true,
      confidence: 'medium',
      owner: '运营确认',
      source: intakeMode === 'sku' ? 'sku-draft' : 'manual-draft'
    };
  }

  return {
    state: 'review',
    allowed: false,
    confidence: 'low',
    owner: '待审核',
    source: intakeMode === 'sku' ? 'sku-draft uncertain' : 'manual uncertain'
  };
}

function buildLedgerDraft(form, intakeMode) {
  return form.claimsText
    .split(/\n+/)
    .map((claim) => claim.trim())
    .filter(Boolean)
    .map((claim) => ({
      claim,
      ...classifyClaim(claim, intakeMode)
    }));
}

function refreshMachineDraftLedger(ledgerFacts, intakeMode = 'sku') {
  return ledgerFacts.map((fact) => {
    const machineDraft = /draft|uncertain|flagged/.test(fact.source || '');
    if (!machineDraft || fact.owner === '不可上图' || fact.owner === '证书待归档') return fact;
    return {
      ...fact,
      ...classifyClaim(fact.claim, intakeMode)
    };
  });
}

function claimMatches(claim, keywords) {
  const normalized = claim.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function pickClaimsByTemplate(claims, template, limit) {
  const preferred = claims.filter((claim) => claimMatches(claim, template.preferred));
  if (template.strictClaimMatch && preferred.length === 0) return [];
  const fallback = claims.filter((claim) => !preferred.includes(claim));
  return [...preferred, ...fallback].slice(0, limit);
}

function getVisualProofInstruction(template = {}, primaryClaim = '') {
  const claimText = primaryClaim ? `“${primaryClaim}”` : '该图槽主卖点';
  const proofMap = {
    main: '用白底清晰展示真实产品外观，证明产品存在、外观、材质和结构，不承载复杂卖点。',
    benefits: `围绕${claimText}做 1 个主视觉和少量短英文标签，标签必须指向图片中可见的产品部位或使用结果。`,
    lifestyle: `把产品放进真实使用场景，用人与物、环境、动作和比例关系证明${claimText}，背景必须服务卖点，不做纯装饰。`,
    detail: `用局部特写证明${claimText}，画面必须能看到对应材质、部件、工艺、纹理或配件。`,
    state: `用展开/收纳/开合/组合/操作前后对比证明${claimText}，只展示参考图或项目资料确认过的状态。`,
    structure: `用结构标注、剖面感或部件关系证明${claimText}，说明必须对应真实部位，不做未证实性能承诺。`,
    dimensions: `用尺寸线、容量、包装清单或配件摆放证明${claimText}，只写已确认数据。`
  };
  return proofMap[template.visualType] || `用画面直接证明${claimText}，不要只把卖点写成文字。`;
}

function getSlotQualityGuardrailText(visualType = 'benefits') {
  return (slotQualityGuardrails[visualType] || slotQualityGuardrails.benefits).join(' ');
}

function getNoPrimaryClaimInstruction(template = {}) {
  if (template.visualType === 'dimensions') {
    return 'No confirmed specification claim is assigned. Do not create dimension numbers; use a clean specification placeholder layout for internal review only.';
  }
  if (template.visualType === 'state') {
    return 'No confirmed function-state claim is assigned. Do not invent open, closed, folded, assembled, or transformed states.';
  }
  if (template.visualType === 'structure') {
    return 'No confirmed structure claim is assigned. Keep labels limited to visible product parts only.';
  }
  return 'No primary claim is assigned yet. Keep the concept conservative and avoid unsupported visible copy.';
}

function getProductSignalText(form, ledgerFacts = []) {
  return [
    form?.projectName,
    form?.productName,
    form?.category,
    form?.claimsText,
    ...ledgerFacts.map((fact) => fact.claim)
  ].filter(Boolean).join(' ').toLowerCase();
}

function detectProductType(form, ledgerFacts) {
  const signal = getProductSignalText(form, ledgerFacts);
  if (/(dutch oven|casserole|cast iron|cookware|cooking|baking|braising|stewing|roasting|pot|pan|锅|珐琅|铸铁|炖锅|汤锅|烤盘)/i.test(signal)) {
    return 'cookware';
  }
  if (/(learning tower|toddler|step stool|kids tower|children|child|baby|cpsc|儿童|宝宝|幼儿|学习塔|脚凳)/i.test(signal)) {
    return 'learningTower';
  }
  return 'generic';
}

function createStoryboardTemplate(overrides) {
  const base = genericStoryboardTemplates.find((template) => template.id === overrides.id);
  return { ...base, ...overrides };
}

function getStoryboardTemplates(form, ledgerFacts) {
  if (isAPlusPlan(form)) {
    return aPlusStoryboardTemplates;
  }

  const productType = detectProductType(form, ledgerFacts);
  if (productType === 'cookware') {
    return [
      createStoryboardTemplate({
        id: 1,
        title: 'Main Image',
        goal: '白底主图',
        composition: '纯白背景展示锅具本体，保留锅身、锅盖、把手和旋钮真实比例，不加食材、炉灶、文字或道具。',
        preferred: ['cast iron', 'enameled', 'material', 'finish', 'knob', 'handle'],
        guardrails: ['锅身、锅盖、把手和旋钮必须与参考图一致', '主图不加食材、火焰、餐具或徽章']
      }),
      createStoryboardTemplate({
        id: 2,
        title: 'Core Benefits',
        goal: '核心卖点图',
        composition: '产品居中，周围展示 3-4 个锅具核心卖点，例如珐琅铸铁材质、哑光外观、均匀导热、双侧把手或锅盖设计。',
        preferred: ['cast iron', 'enameled', 'finish', 'heat', 'retention', 'handle', 'knob'],
        guardrails: ['导热、保温等性能卖点需要运营确认或证据', '不写 non-stick、dishwasher safe、oven safe 等未确认能力']
      }),
      createStoryboardTemplate({
        id: 3,
        title: 'Cooking Lifestyle',
        goal: '烹饪场景图',
        composition: '把锅具放在真实厨房、餐桌或料理准备场景中，表现烘焙、炖煮、焖煮或上桌氛围；锅具比例要真实，不能悬浮或变形。',
        preferred: ['baking', 'braising', 'stewing', 'roasting', 'kitchen', 'cooking', 'serving'],
        guardrails: ['不要生成不相关的儿童、站立辅助或亲子看护场景', '不要表现明火危险、夸张蒸汽或不合理食材比例']
      }),
      createStoryboardTemplate({
        id: 4,
        title: 'Material Details',
        goal: '材质细节图',
        composition: '用局部特写展示锅盖旋钮、双侧把手、锅沿、珐琅质感、哑光表面或锅身厚度。',
        preferred: ['knob', 'handle', 'matte', 'finish', 'enameled', 'covered', 'casserole'],
        guardrails: ['只展示参考图中真实存在的旋钮、把手和锅盖结构', '不新增蒸笼、温度计或额外配件']
      }),
      createStoryboardTemplate({
        id: 5,
        title: 'Cooking Uses',
        goal: '使用方式图',
        composition: '展示适用的烹饪方式组合，例如 baking、braising、stewing、roasting，用图标或小场景表达，不改变锅具形态。',
        preferred: ['baking', 'braising', 'stewing', 'roasting', 'suitable', 'cooking'],
        guardrails: ['只展示 Ledger 中已有的烹饪方式', '不要暗示未确认炉具兼容性或极限耐温']
      }),
      createStoryboardTemplate({
        id: 6,
        title: 'Structure',
        goal: '结构说明图',
        composition: '标注锅盖、旋钮、锅身、双侧把手、内壁或底部结构，表达 covered casserole design 和日常端取便利。',
        preferred: ['covered', 'casserole', 'handle', 'knob', 'structure', 'design'],
        guardrails: ['不写未确认的安全、耐摔或兼容性承诺', '不做竞品对比第一']
      }),
      createStoryboardTemplate({
        id: 7,
        title: 'Dimensions',
        goal: '尺寸/容量图',
        composition: '展示已确认尺寸、容量或包装内容；如果没有尺寸和容量数据，只保留“待补规格”的内部提示，不在最终图写数字。',
        preferred: ['dimension', 'size', 'capacity', 'quart', 'qt', 'inch', 'cm'],
        strictClaimMatch: true,
        guardrails: ['没有确认容量和尺寸时不写数字', '不编造重量、适用炉具或耐温数据']
      })
    ];
  }

  if (productType === 'learningTower') {
    return [
      createStoryboardTemplate({
        id: 1,
        title: 'Main Image',
        goal: '白底主图',
        composition: '只展示真实学习塔本体，纯白背景，不加场景、不加图标、不加促销文字。',
        preferred: ['bamboo', 'material', 'foldable'],
        guardrails: ['产品结构必须与原始图一致', '主图不放尺寸线、徽章、儿童或道具']
      }),
      createStoryboardTemplate({
        id: 2,
        title: 'Core Benefits',
        goal: '核心卖点图',
        composition: '产品居中，周围用 3-4 个短卖点标签表达材质、折叠、承重或认证。',
        preferred: ['bamboo', 'foldable', 'capacity', '150', 'cpsc', 'certified'],
        guardrails: ['承重和认证必须显示为需证据卖点', '不写 best、safest、anti-tip']
      }),
      createStoryboardTemplate({
        id: 3,
        title: 'Lifestyle',
        goal: '生活场景图',
        composition: '厨房或亲子场景，成人在旁边照看，产品比例必须真实，孩子姿势自然。',
        preferred: ['age', 'months', 'years', 'foldable', 'bamboo'],
        guardrails: ['不暗示无人看护', '不表现危险动作', '不夸大产品高度或稳定性']
      }),
      createStoryboardTemplate({
        id: 4,
        title: 'Details',
        goal: '细节特写图',
        composition: '局部特写展示竹纹、圆角、锁扣、脚垫或配件，不改变产品结构。',
        preferred: ['bamboo', 'material', 'pads', 'tools', 'instructions', 'include'],
        guardrails: ['只展示真实存在细节', '不新增产品没有的零件']
      }),
      createStoryboardTemplate({
        id: 5,
        title: 'Function State',
        goal: '功能/状态图',
        composition: '展示展开和折叠状态对比，强调收纳方式和已确认折叠厚度。',
        preferred: ['foldable', 'fold', '14cm', 'thickness'],
        strictClaimMatch: true,
        guardrails: ['不说可调节高度', '折叠结构必须符合原产品']
      }),
      createStoryboardTemplate({
        id: 6,
        title: 'Structure',
        goal: '结构说明图',
        composition: '中性结构展示，可用箭头说明 A-frame、护栏、踏板、平台，不做安全承诺。',
        preferred: ['structure', 'frame', 'bamboo', 'material', 'height'],
        guardrails: ['不写 anti-tip、防跌、防倾倒', '不做竞品对比第一']
      }),
      createStoryboardTemplate({
        id: 7,
        title: 'Dimensions',
        goal: '尺寸与配件图',
        composition: '展示展开/折叠尺寸、占地宽度、护栏宽度和包装配件清单。',
        preferred: ['cm', 'dimension', 'size', 'tools', 'instructions', 'pads', 'include'],
        strictClaimMatch: true,
        guardrails: ['展开尺寸和折叠尺寸分状态标注', '没有确认的平台尺寸不写']
      })
    ];
  }

  return genericStoryboardTemplates;
}

function buildStoryboardBriefs(ledgerFacts, form, brands = defaultBrandLibrary) {
  const productType = detectProductType(form, ledgerFacts);
  const brandProfile = getBrandProfile(getProjectBrandId(form, brands), brands);
  const outputPreset = getProjectPlanOutputPreset(form);
  const aPlusMode = isAPlusPlan(form);
  const allowedClaims = ledgerFacts
    .filter((fact) => fact.state === 'allowed')
    .map((fact) => fact.claim)
    .slice(0, IMAGE_CLAIM_POOL_LIMIT);
  const evidenceClaims = ledgerFacts
    .filter((fact) => fact.state === 'evidence')
    .map((fact) => fact.claim)
    .slice(0, Math.ceil(IMAGE_CLAIM_POOL_LIMIT / 2));
  const reviewClaims = ledgerFacts
    .filter((fact) => fact.state === 'review')
    .map((fact) => fact.claim);
  const blockedClaims = ledgerFacts
    .filter((fact) => fact.state === 'blocked' || (!fact.state && fact.allowed === false))
    .map((fact) => fact.claim);

  return getStoryboardTemplates(form, ledgerFacts).map((template) => {
    const claimLimit = aPlusMode ? CLAIMS_PER_IMAGE_LIMIT : template.visualType === 'main' ? 1 : CLAIMS_PER_IMAGE_LIMIT;
    const usableClaims = pickClaimsByTemplate(allowedClaims, template, claimLimit);
    const needsEvidence = pickClaimsByTemplate(evidenceClaims, template, template.evidenceLimit);
    const primaryClaim = usableClaims[0] || needsEvidence[0] || '';
    const visualProof = getVisualProofInstruction(template, primaryClaim);
    const status = template.visualType === 'main'
      ? 'ready'
      : needsEvidence.length > 0 || reviewClaims.length > 0
        ? 'needs_review'
        : usableClaims.length > 0
          ? 'ready'
          : 'needs_claims';
    const outputRule = aPlusMode
      ? 'Output type: Amazon A+ module. Do not use the primary white-background rule. Headings may follow the module layout. Related allowed Ledger claims may be combined when they create a stronger A+ content story.'
      : 'Output type: Standard Amazon listing image set. Slot 01 is the white-background main image; standard listing images keep title placement and visual system consistent.';

    return {
      ...template,
      outputPresetId: outputPreset.id,
      outputPresetLabel: outputPreset.label,
      productType,
      brandId: brandProfile.id,
      brandName: brandProfile.name,
      productName: form.productName || form.projectName || form.sku || 'Current product',
      usableClaims,
      needsEvidence,
      primaryClaim,
      visualProof,
      reviewClaims: reviewClaims.slice(0, 3),
      blockedClaims,
      status,
      promptBrief: [
        `Use the locked original product reference for ${form.productName || form.projectName || 'the product'}.`,
        outputRule,
        `Listing image strategy rules: ${getListingImageStrategyText()}`,
        template.composition,
        primaryClaim ? `Primary claim to prove visually: ${primaryClaim}.` : getNoPrimaryClaimInstruction(template),
        `Visual proof plan: ${visualProof}`,
        `Slot quality guardrail: ${getSlotQualityGuardrailText(template.visualType)}.`,
        usableClaims.length ? `Allowed claims: ${usableClaims.join('; ')}.` : 'No allowed claims assigned yet.',
        needsEvidence.length ? `Claims needing evidence before final export: ${needsEvidence.join('; ')}.` : '',
        blockedClaims.length ? `Do not mention or imply: ${blockedClaims.join('; ')}.` : '',
        template.guardrails.join('; ')
      ].filter(Boolean).join(' ')
    };
  });
}

function deriveReviewStatus(decision = {}) {
  if (decision.manualStatus === 'blocked') return 'blocked';
  if (decision.manualStatus === 'rework') return 'rework';
  if (decision.manualStatus === 'approved') return 'approved';
  if (decision.manualStatus === 'review') return 'review';
  if (decision.opsStatus === 'blocked' || decision.designStatus === 'blocked') return 'blocked';
  if (decision.designStatus === 'rework' || decision.opsStatus === 'rework') return 'rework';
  if (decision.designStatus === 'approved' && decision.opsStatus === 'approved') return 'approved';
  return 'review';
}

function getDefaultReviewNote(status, brief, decision = {}) {
  if (status === 'approved') return '人工审核已通过，可以进入导出。';
  if (status === 'rework') {
    if (decision.manualStatus === 'rework') return '人工退回：需要修改图片后重新提交审核。';
    if (decision.designStatus === 'rework') return '设计退回：需要修改产品比例、画面或物理逻辑。';
    if (decision.opsStatus === 'rework') return '运营退回：需要修改卖点、证据或图片文案。';
    return '需要修改后重新提交审核。';
  }
  if (status === 'blocked') return '人工审核已禁止该图进入最终导出。';
  if (brief?.needsEvidence?.length) return `需要先确认：${brief.needsEvidence.join('、')}`;
  if (brief?.status === 'needs_claims') return '缺少可用卖点，建议回到 Ledger 补充或调整。';
  return '等待人工检查产品、比例、物理逻辑、卖点证据和合规表达。';
}

function normalizeReviewDecision(decision, slot, brief) {
  const validManualStatuses = ['review', 'approved', 'rework', 'blocked'];
  const manualStatus = validManualStatuses.includes(decision?.manualStatus) ? decision.manualStatus : 'review';
  const designStatus = decision?.designStatus
    || (manualStatus === 'approved' ? 'approved' : manualStatus === 'rework' ? 'rework' : 'review');
  const opsStatus = decision?.opsStatus
    || (manualStatus === 'approved' ? 'approved' : manualStatus === 'blocked' ? 'blocked' : 'review');
  const normalized = {
    slotId: slot.id,
    title: brief?.title || slot.title,
    manualStatus,
    designStatus,
    opsStatus,
    updatedAt: decision?.updatedAt || new Date().toISOString()
  };
  const status = deriveReviewStatus(normalized);
  return {
    ...normalized,
    status,
    note: decision?.note || getDefaultReviewNote(status, brief, normalized)
  };
}

function createReviewDecisions(storyboardBriefs = [], existingDecisions = []) {
  return getActiveSlots(storyboardBriefs).map((slot) => {
    const existing = existingDecisions.find((decision) => decision.slotId === slot.id);
    const brief = storyboardBriefs.find((item) => item.id === slot.id);
    return normalizeReviewDecision(existing, slot, brief);
  });
}

function getReviewDecision(reviewDecisions, slotId, storyboardBriefs = []) {
  const brief = storyboardBriefs.find((item) => item.id === slotId);
  const slot = brief ? getSlotFromBrief(brief) : getFallbackSlot(slotId);
  const existing = reviewDecisions.find((decision) => decision.slotId === slotId);
  return normalizeReviewDecision(existing, slot, brief);
}

function isDecisionFullyApproved(decision = {}) {
  if (decision.manualStatus) return decision.manualStatus === 'approved';
  if (decision.status === 'approved') return true;
  return decision.designStatus === 'approved' && decision.opsStatus === 'approved';
}

function getRoleStatusText(status) {
  return reviewStatusMeta[status]?.shortText || '待审';
}

function getDualReviewSummary(decision = {}) {
  if (isDecisionFullyApproved(decision)) return '人工已通过';
  return reviewStatusMeta[decision.status]?.text || '待人工审核';
}

function getDualReviewMissingText(decision = {}) {
  if (isDecisionFullyApproved(decision)) return '人工审核通过';
  return reviewStatusMeta[decision.status]?.text || '待人工审核';
}

function createGenerationRunId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function normalizeGenerationRun(run = {}) {
  const verdict = generationVerdicts[run.verdict] ? run.verdict : 'unreviewed';
  return {
    ...run,
    id: run.id || createGenerationRunId(),
    slotId: Number(run.slotId || 1),
    slotTitle: run.slotTitle || 'Image slot',
    outputPresetId: run.outputPresetId || run.outputPreset?.id || 'main-image',
    outputPresetLabel: run.outputPresetLabel || run.outputPreset?.label || '主图',
    outputPresetSize: run.outputPresetSize || run.outputPreset?.size || '2000 x 2000',
    verdict,
    reasons: Array.isArray(run.reasons) ? run.reasons : [],
    note: run.note || '',
    createdAt: run.createdAt || new Date().toISOString()
  };
}

function normalizeGenerationRuns(runs = []) {
  return (Array.isArray(runs) ? runs : [])
    .map(normalizeGenerationRun)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function stripTransientGenerationRun(run = {}) {
  return {
    ...run,
    reviewImageDataUrl: ''
  };
}

function getGenerationQualityStats(runs = []) {
  const total = runs.length;
  const reviewed = runs.filter((run) => run.verdict !== 'unreviewed').length;
  const usable = runs.filter((run) => run.verdict === 'usable').length;
  const needsFix = runs.filter((run) => run.verdict === 'needs_fix').length;
  const rejected = runs.filter((run) => run.verdict === 'reject').length;
  const usableRate = reviewed ? Math.round((usable / reviewed) * 100) : 0;
  return { total, reviewed, usable, needsFix, rejected, usableRate };
}

function getQualityScopeRuns(runs = [], options = {}) {
  const {
    baselineOnly = true,
    outputPresetId = QUALITY_BASELINE_PRESET_ID
  } = options;
  return normalizeGenerationRuns(runs).filter((run) => {
    const matchesBaseline = !baselineOnly || run.baselineMode !== false;
    const matchesPreset = !outputPresetId || run.outputPresetId === outputPresetId;
    return matchesBaseline && matchesPreset;
  });
}

function getSlotQualitySummary(runs = [], slotId) {
  return getGenerationQualityStats(runs.filter((run) => run.slotId === slotId));
}

function getFailureReasonLabels(reasonIds = []) {
  return reasonIds
    .map((reasonId) => generationFailureReasons.find((reason) => reason.id === reasonId)?.label)
    .filter(Boolean);
}

function normalizeAiReviewResult(review = {}) {
  const checks = review.checks && typeof review.checks === 'object' ? review.checks : {};
  const normalizedChecks = Object.keys(aiReviewCheckLabels).reduce((acc, key) => ({
    ...acc,
    [key]: ['pass', 'warn', 'fail'].includes(checks[key]) ? checks[key] : 'warn'
  }), {});
  const hasFail = Object.values(normalizedChecks).some((status) => status === 'fail');
  const hasWarn = Object.values(normalizedChecks).some((status) => status === 'warn');
  const verdict = hasFail ? 'fail' : hasWarn ? 'warn' : aiReviewVerdicts[review.verdict] ? review.verdict : 'pass';
  return {
    ...review,
    verdict,
    score: Number.isFinite(Number(review.score)) ? Math.max(0, Math.min(100, Math.round(Number(review.score)))) : 0,
    summary: review.summary || 'AI 已完成预审，请结合人工判断确认。',
    checks: normalizedChecks,
    issues: Array.isArray(review.issues) ? review.issues.filter(Boolean).slice(0, 8) : [],
    recommendedAction: review.recommendedAction || '请人工复核后决定是否重生。',
    createdAt: review.createdAt || new Date().toISOString()
  };
}

function deriveAiReviewSuggestion(review = {}) {
  const normalized = normalizeAiReviewResult(review);
  const text = [
    normalized.summary,
    normalized.recommendedAction,
    ...normalized.issues
  ].join(' ').toLowerCase();
  const reasons = new Set();

  if (normalized.checks.productConsistency === 'fail' || /不符|不一致|不像|变形|走样|缺少|缺失|非.*形状|还原|漂移|结构|形态|轮廓|材质|颜色错误|主体|参考图|产品身份|sku|部件/.test(text)) {
    reasons.add('product-drift');
  }
  if (normalized.checks.scalePhysicalLogic !== 'pass' || /比例|物理|悬浮|支撑|接触|阴影|逻辑|透视|穿模|交叉|重力|落地|接触点|尺寸|尺度|场景不合理|动作不合理/.test(text)) {
    reasons.add('scale-error');
  }
  if (/物理|悬浮|支撑|接触|不通|不合理|穿模|交叉|漂浮|接触点|透视错误|阴影错误|无法成立|不符合真实/.test(text)) {
    reasons.add('physical-logic');
  }
  if (/新增|凭空|多出|多余|额外|不存在|虚构|编造|发明|invented|extra|missing|hallucinated/.test(text)) {
    reasons.add('invented-parts');
  }
  if (normalized.checks.claimAccuracy !== 'pass' || normalized.checks.textRisk !== 'pass' || /文字|卖点|文案|刻字|数字|中文|非英文|乱码|拼写|错字|不可读|过小|标题|徽章|认证|尺寸|参数|证明不足|未证明|badge|logo|claim|text|garbled|non-english|hex|palette|swatch|色号|色板|品牌色|比例|百分比|style guide|design token|prompt|提示词|模型/.test(text)) {
    reasons.add('text-error');
  }
  if (normalized.checks.aesthetics !== 'pass' || /审美|单调|粗糙|锯齿|破损|视觉|脏|不自然|廉价|杂乱|裁切|遮挡|构图|低质|模糊|过度装饰|色卡|clutter|crop|messy|cheap/.test(text)) {
    reasons.add('aesthetic');
  }

  return {
    verdict: normalized.verdict === 'pass' ? 'usable' : normalized.verdict === 'fail' ? 'reject' : 'needs_fix',
    reasons: Array.from(reasons)
  };
}

function getAiSuggestedHumanVerdict(run = {}) {
  if (run.aiSuggestion?.verdict) return run.aiSuggestion.verdict;
  if (!run.aiReview) return '';
  return deriveAiReviewSuggestion(run.aiReview).verdict;
}

function getQualityReportRows(runs = [], options = {}) {
  const scopedRuns = getQualityScopeRuns(runs, options);
  const sampleTarget = options.sampleTarget || QUALITY_SAMPLE_TARGET_PER_SLOT;
  const reportSlots = options.slots?.length ? options.slots : slots;
  return reportSlots.map((slot) => {
    const slotRuns = scopedRuns.filter((run) => run.slotId === slot.id);
    const stats = getGenerationQualityStats(slotRuns);
    const aiReviewed = slotRuns.filter((run) => run.aiReview).length;
    const comparable = slotRuns.filter((run) => run.verdict !== 'unreviewed' && getAiSuggestedHumanVerdict(run));
    const agreement = comparable.filter((run) => run.verdict === getAiSuggestedHumanVerdict(run)).length;
    const reasonCounts = generationFailureReasons.map((reason) => ({
      ...reason,
      count: slotRuns.filter((run) => run.reasons.includes(reason.id)).length
    })).filter((reason) => reason.count > 0);
    const topReasons = reasonCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);
    const topReasonLabels = topReasons.map((reason) => reason.label);
    const nextAction = topReasons.length
      ? qualityActionRules[topReasons[0].id]
      : stats.reviewed && stats.usableRate >= 80
        ? '这个图槽相对稳定，下一轮只需要保持当前约束并少量抽检。'
        : '继续积累样本，先完成足够的人工判断后再定向调优。';

    return {
      slot,
      stats,
      aiReviewed,
      comparable: comparable.length,
      agreement,
      agreementRate: comparable.length ? Math.round((agreement / comparable.length) * 100) : 0,
      topReasons: topReasonLabels,
      nextAction,
      target: sampleTarget,
      remaining: Math.max(0, sampleTarget - stats.total),
      targetMet: stats.total >= sampleTarget
    };
  });
}

function getQualityReportOverview(runs = [], options = {}) {
  const scopedRuns = getQualityScopeRuns(runs, options);
  const stats = getGenerationQualityStats(scopedRuns);
  const aiReviewed = scopedRuns.filter((run) => run.aiReview).length;
  const comparable = scopedRuns.filter((run) => run.verdict !== 'unreviewed' && getAiSuggestedHumanVerdict(run));
  const agreement = comparable.filter((run) => run.verdict === getAiSuggestedHumanVerdict(run)).length;
  return {
    ...stats,
    aiReviewed,
    agreement,
    comparable: comparable.length,
    agreementRate: comparable.length ? Math.round((agreement / comparable.length) * 100) : 0,
    target: (options.slots?.length || slots.length) * (options.sampleTarget || QUALITY_SAMPLE_TARGET_PER_SLOT)
  };
}

function csvEscape(value = '') {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsvText(text = '') {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(text).replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.some((cell) => String(cell || '').trim()));
}

function normalizeImportedHumanVerdict(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['usable', 'approved', 'pass', '通过', '可用'].includes(normalized)) return 'usable';
  if (['needs_fix', 'needs_revision', 'warn', 'review', '需修改', '待修改'].includes(normalized)) return 'needs_fix';
  if (['reject', 'unusable', 'fail', 'blocked', '不可用', '拒绝'].includes(normalized)) return 'reject';
  return 'unreviewed';
}

function normalizeImportedAiVerdict(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['pass', 'usable', 'approved', '低风险'].includes(normalized)) return 'pass';
  if (['fail', 'reject', 'unusable', '高风险'].includes(normalized)) return 'fail';
  return 'warn';
}

function mapFailureReasonLabelToId(label = '') {
  const normalized = String(label || '').trim().toLowerCase();
  const direct = generationFailureReasons.find((reason) => (
    reason.id === normalized || reason.label.toLowerCase() === normalized
  ));
  if (direct) return direct.id;
  if (/产品|变形|漂移|一致|drift|consistency/.test(normalized)) return 'product-drift';
  if (/比例|scale|尺寸不合理/.test(normalized)) return 'scale-error';
  if (/物理|悬浮|支撑|logic/.test(normalized)) return 'physical-logic';
  if (/凭空|新增|多部件|invent/.test(normalized)) return 'invented-parts';
  if (/文字|卖点|文案|乱码|text|claim/.test(normalized)) return 'text-error';
  if (/审美|单调|粗糙|aesthetic|visual/.test(normalized)) return 'aesthetic';
  return '';
}

function parseQualityCsvToRuns(text = []) {
  const rows = parseCsvText(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((cell) => String(cell || '').trim());
  const records = rows.slice(1).map((row) => Object.fromEntries(header.map((key, index) => [key, row[index] || ''])));

  return records
    .filter((record) => record.slot_id || record.slot_title)
    .map((record, index) => {
      const slotId = Number(record.slot_id || 1);
      const preset = getOutputPresetById(record.output_preset === 'A+' ? 'aplus' : QUALITY_BASELINE_PRESET_ID);
      const reasons = String(record.failure_reasons || '')
        .split(/[;|，、]/)
        .map(mapFailureReasonLabelToId)
        .filter(Boolean);
      const aiReview = record.ai_verdict ? {
        verdict: normalizeImportedAiVerdict(record.ai_verdict),
        score: Number(record.ai_score) || 0,
        summary: '从 P0 CSV 导入的 AI 预审记录。',
        checks: {
          productConsistency: normalizeImportedAiVerdict(record.product_consistency),
          scalePhysicalLogic: normalizeImportedAiVerdict(record.scale_physical_logic),
          claimAccuracy: normalizeImportedAiVerdict(record.claim_accuracy),
          textRisk: normalizeImportedAiVerdict(record.text_risk),
          aesthetics: normalizeImportedAiVerdict(record.aesthetics)
        },
        issues: [],
        recommendedAction: '用于恢复质量统计；旧图片本体未随 CSV 恢复。',
        createdAt: record.created_at || new Date().toISOString()
      } : null;

      return normalizeGenerationRun({
        id: `csv-${slotId}-${record.created_at || index}-${record.ai_score || ''}-${record.human_verdict || ''}`,
        slotId,
        slotTitle: record.slot_title || slots.find((slot) => slot.id === slotId)?.title || `Image ${slotId}`,
        outputPresetId: preset.id,
        outputPresetLabel: preset.label,
        outputPresetSize: preset.size,
        baselineMode: record.baseline_mode !== 'brand',
        verdict: normalizeImportedHumanVerdict(record.human_verdict),
        reasons,
        note: '从 P0 CSV 导入，仅恢复统计记录，不包含旧图片预览。',
        createdAt: record.created_at || new Date().toISOString(),
        aiReview,
        aiSuggestion: record.ai_suggested_human_verdict ? {
          verdict: normalizeImportedHumanVerdict(record.ai_suggested_human_verdict),
          reasons
        } : undefined,
        model: record.model || 'csv-import',
        referenceCount: Number(record.reference_count) || 0,
        durationMs: Number(record.duration_ms) || 0,
        prompt: record.prompt || '',
        importedFromCsv: true
      });
    });
}

function buildQualityCsv(runs = []) {
  const scopedRuns = getQualityScopeRuns(runs);
  const header = [
    'created_at',
    'slot_id',
    'slot_title',
    'output_preset',
    'baseline_mode',
    'human_verdict',
    'ai_verdict',
    'ai_suggested_human_verdict',
    'ai_human_agreement',
    'failure_reasons',
    'ai_score',
    'product_consistency',
    'scale_physical_logic',
    'claim_accuracy',
    'text_risk',
    'aesthetics',
    'model',
    'reference_count',
    'duration_ms',
    'prompt'
  ];
  const rows = scopedRuns.map((run) => {
    const aiSuggestedVerdict = getAiSuggestedHumanVerdict(run);
    const checks = normalizeAiReviewResult(run.aiReview || {}).checks;
    return [
      run.createdAt,
      run.slotId,
      run.slotTitle,
      run.outputPresetLabel || run.outputPresetId,
      run.baselineMode !== false ? 'baseline' : 'brand',
      run.verdict,
      run.aiReview?.verdict || '',
      aiSuggestedVerdict,
      run.verdict !== 'unreviewed' && aiSuggestedVerdict ? String(run.verdict === aiSuggestedVerdict) : '',
      getFailureReasonLabels(run.reasons).join('; '),
      run.aiReview?.score ?? '',
      run.aiReview ? checks.productConsistency : '',
      run.aiReview ? checks.scalePhysicalLogic : '',
      run.aiReview ? checks.claimAccuracy : '',
      run.aiReview ? checks.textRisk : '',
      run.aiReview ? checks.aesthetics : '',
      run.model || '',
      run.referenceCount || '',
      run.durationMs || '',
      run.prompt || ''
    ];
  });
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function slugifyExportName(value = 'listingflow') {
  return String(value || 'listingflow')
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'listingflow';
}

function getRunSourceLabel(run = {}) {
  if (run.externalSource === 'gpt-web') return 'GPT 页面导入';
  if (run.importedFromCsv) return 'CSV 导入记录';
  if (/gemini/i.test(run.model || '')) return '本地 API / Gemini';
  return run.model || '本地 API';
}

function getBestRunForSlot(slotId, generationRuns = []) {
  const runs = normalizeGenerationRuns(generationRuns.filter((run) => run.slotId === slotId && run.imageSrc));
  return runs.find((run) => run.verdict === 'usable')
    || runs.find((run) => run.verdict === 'needs_fix')
    || runs[0]
    || null;
}

function getSlotCandidateRuns(slotId, generationRuns = []) {
  return normalizeGenerationRuns(generationRuns.filter((run) => run.slotId === slotId && run.imageSrc));
}

function getSelectedRunForSlot(slotId, generationRuns = [], exportSelections = {}) {
  const selectedRunId = exportSelections?.[slotId];
  if (selectedRunId) {
    const selectedRun = normalizeGenerationRun(generationRuns.find((run) => run.id === selectedRunId));
    if (selectedRun?.slotId === slotId && selectedRun?.imageSrc) return selectedRun;
  }
  return getBestRunForSlot(slotId, generationRuns);
}

function getRunShortTime(run = {}) {
  if (!run.createdAt) return '';
  const date = new Date(run.createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function buildLedgerCsv(ledgerFacts = []) {
  const header = ['claim', 'state', 'allowed', 'source', 'confidence', 'owner'];
  const rows = ledgerFacts.map((fact) => [
    fact.claim,
    fact.state || '',
    fact.allowed !== false,
    fact.source || '',
    fact.confidence || '',
    fact.owner || ''
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function buildStoryboardCsv(storyboardBriefs = [], reviewDecisions = []) {
  const header = [
    'slot_id',
    'title',
    'role_type',
    'visual_type',
    'goal',
    'primary_claim',
    'visual_proof',
    'usable_claims',
    'needs_evidence',
    'blocked_claims',
    'review_status'
  ];
  const rows = getActiveSlots(storyboardBriefs).map((slot) => {
    const brief = storyboardBriefs.find((item) => item.id === slot.id) || {};
    const decision = getReviewDecision(reviewDecisions, slot.id, storyboardBriefs);
    return [
      slot.id,
      brief.title || slot.title,
      brief.roleType || '',
      brief.visualType || '',
      brief.goal || slot.goal,
      brief.primaryClaim || '',
      brief.visualProof || '',
      (brief.usableClaims || []).join('; '),
      (brief.needsEvidence || []).join('; '),
      (brief.blockedClaims || []).join('; '),
      decision.status
    ];
  });
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function buildReviewCsv(reviewDecisions = [], storyboardBriefs = [], generationRuns = []) {
  const header = [
    'slot_id',
    'title',
    'review_status',
    'design_status',
    'ops_status',
    'note',
    'selected_candidate_verdict',
    'selected_candidate_source',
    'selected_candidate_file',
    'selected_candidate_created_at'
  ];
  const rows = getActiveSlots(storyboardBriefs).map((slot) => {
    const decision = getReviewDecision(reviewDecisions, slot.id, storyboardBriefs);
    const run = getBestRunForSlot(slot.id, generationRuns);
    return [
      slot.id,
      decision.title || slot.title,
      decision.status,
      decision.designStatus || '',
      decision.opsStatus || '',
      decision.note || '',
      run?.verdict || '',
      run ? getRunSourceLabel(run) : '',
      run?.imageFilePath || run?.imageFilename || run?.imageSrc || '',
      run?.createdAt || ''
    ];
  });
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function buildDeliveryManifest({ projectForm, ledgerFacts, storyboardBriefs, reviewDecisions, generationRuns }) {
  const activeSlots = getActiveSlots(storyboardBriefs);
  const selectedImages = activeSlots.map((slot) => {
    const brief = storyboardBriefs.find((item) => item.id === slot.id) || {};
    const decision = getReviewDecision(reviewDecisions, slot.id, storyboardBriefs);
    const run = getBestRunForSlot(slot.id, generationRuns);
    return {
      slotId: slot.id,
      title: brief.title || slot.title,
      roleType: brief.roleType || '',
      visualType: brief.visualType || '',
      primaryClaim: brief.primaryClaim || '',
      visualProof: brief.visualProof || '',
      reviewStatus: decision.status,
      selectedCandidate: run ? {
        id: run.id,
        verdict: run.verdict,
        source: getRunSourceLabel(run),
        model: run.model || '',
        outputPreset: run.outputPresetLabel || run.outputPresetId,
        outputSize: run.outputPresetSize,
        imageFilePath: run.imageFilePath || '',
        imageFilename: run.imageFilename || '',
        imageUrl: run.imageSrc || '',
        createdAt: run.createdAt
      } : null
    };
  });
  const projectQuality = getGenerationQualityStats(getQualityScopeRuns(generationRuns));
  return {
    exportedAt: new Date().toISOString(),
    project: {
      title: getProjectTitle(projectForm),
      sku: projectForm.sku || '',
      productName: projectForm.productName || '',
      projectName: projectForm.projectName || '',
      category: projectForm.category || '',
      brandId: projectForm.brandId || '',
      productLock: getProjectProductLock(projectForm),
      referenceImageName: getReferenceImageName(projectForm)
    },
    summary: {
      ledgerFacts: ledgerFacts.length,
      storyboardSlots: activeSlots.length,
      approvedSlots: reviewDecisions.filter((decision) => decision.status === 'approved').length,
      usableCandidates: generationRuns.filter((run) => run.verdict === 'usable').length,
      qualityReviewed: projectQuality.reviewed,
      qualityUsableRate: projectQuality.usableRate
    },
    files: {
      generatedImagesNote: 'Generated image binaries are stored in generated-images/. This manifest records their saved file paths when available.'
    },
    selectedImages,
    ledgerFacts,
    storyboardBriefs,
    reviewDecisions,
    generationRuns: normalizeGenerationRuns(generationRuns).map((run) => ({
      id: run.id,
      slotId: run.slotId,
      slotTitle: run.slotTitle,
      verdict: run.verdict,
      reasons: run.reasons,
      source: getRunSourceLabel(run),
      model: run.model || '',
      outputPreset: run.outputPresetLabel || run.outputPresetId,
      outputSize: run.outputPresetSize,
      imageFilePath: run.imageFilePath || '',
      imageFilename: run.imageFilename || '',
      imageUrl: run.imageSrc || '',
      aiReview: run.aiReview || null,
      createdAt: run.createdAt
    }))
  };
}

async function saveProjectDeliveryPackage({ projectForm, ledgerFacts, storyboardBriefs, reviewDecisions, generationRuns }) {
  const baseName = slugifyExportName(projectForm.projectName || projectForm.productName || projectForm.sku || 'listingflow');
  const exportedAt = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = `${baseName}-delivery-${exportedAt}`;
  const manifest = buildDeliveryManifest({ projectForm, ledgerFacts, storyboardBriefs, reviewDecisions, generationRuns });
  const files = [
    {
      filename: `${prefix}-manifest.json`,
      content: JSON.stringify(manifest, null, 2),
      mimeType: 'application/json;charset=utf-8'
    },
    {
      filename: `${prefix}-ledger.csv`,
      content: `\uFEFF${buildLedgerCsv(ledgerFacts)}`,
      mimeType: 'text/csv;charset=utf-8'
    },
    {
      filename: `${prefix}-storyboard.csv`,
      content: `\uFEFF${buildStoryboardCsv(storyboardBriefs, reviewDecisions)}`,
      mimeType: 'text/csv;charset=utf-8'
    },
    {
      filename: `${prefix}-qa-review.csv`,
      content: `\uFEFF${buildReviewCsv(reviewDecisions, storyboardBriefs, generationRuns)}`,
      mimeType: 'text/csv;charset=utf-8'
    },
    {
      filename: `${prefix}-quality-baseline.csv`,
      content: `\uFEFF${buildQualityCsv(generationRuns)}`,
      mimeType: 'text/csv;charset=utf-8'
    }
  ];
  const saved = [];
  for (const file of files) {
    saved.push(await saveTextExportToApi(file));
  }
  return saved;
}

async function saveImagesZipToApi({ projectForm, storyboardBriefs, generationRuns, exportSelections = {} }) {
  const activeSlots = getActiveSlots(storyboardBriefs);
  const images = activeSlots
    .map((slot) => {
      const brief = storyboardBriefs.find((item) => item.id === slot.id) || {};
      const run = getSelectedRunForSlot(slot.id, generationRuns, exportSelections);
      if (!run?.imageSrc) return null;
      return {
        slotId: slot.id,
        title: brief.title || slot.title,
        slotTitle: run.slotTitle,
        imageFilePath: run.imageFilePath || '',
        imageFilename: run.imageFilename || '',
        imageUrl: run.imageSrc || ''
      };
    })
    .filter(Boolean);
  const response = await fetch(`${IMAGE_API_BASE_URL}/api/export-images-zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectName: projectForm.projectName || projectForm.productName || projectForm.sku || 'listingflow',
      images
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error || '图片 ZIP 打包失败');
  }
  return result;
}

function downloadTextFile(filename, text, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function saveTextExportToApi({ filename, content, mimeType = 'text/csv;charset=utf-8' }) {
  const response = await fetch(`${IMAGE_API_BASE_URL}/api/save-export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content, mimeType })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error || '导出文件保存失败');
  }
  return result;
}

function getPromptTuningSuggestions(runs = [], slotId) {
  const slotRuns = runs.filter((run) => run.slotId === slotId);
  const reasonScores = new Map();

  slotRuns.forEach((run) => {
    run.reasons.forEach((reasonId) => {
      reasonScores.set(reasonId, (reasonScores.get(reasonId) || 0) + 2);
    });
    if (run.aiSuggestion?.reasons?.length) {
      run.aiSuggestion.reasons.forEach((reasonId) => {
        reasonScores.set(reasonId, (reasonScores.get(reasonId) || 0) + 1);
      });
    }
    if (run.aiReview?.checks) {
      if (run.aiReview.checks.productConsistency !== 'pass') reasonScores.set('product-drift', (reasonScores.get('product-drift') || 0) + 1);
      if (run.aiReview.checks.scalePhysicalLogic !== 'pass') reasonScores.set('scale-error', (reasonScores.get('scale-error') || 0) + 1);
      if (run.aiReview.checks.textRisk !== 'pass' || run.aiReview.checks.claimAccuracy !== 'pass') reasonScores.set('text-error', (reasonScores.get('text-error') || 0) + 1);
      if (run.aiReview.checks.aesthetics !== 'pass') reasonScores.set('aesthetic', (reasonScores.get('aesthetic') || 0) + 1);
    }
  });

  return Array.from(reasonScores.entries())
    .filter(([reasonId]) => promptTuningRules[reasonId])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([reasonId, score]) => ({
      id: reasonId,
      score,
      ...promptTuningRules[reasonId]
    }));
}

function getPromptTuningSuggestionsForReasons(reasonIds = []) {
  return Array.from(new Set(reasonIds))
    .filter((reasonId) => promptTuningRules[reasonId])
    .map((reasonId) => ({
      id: reasonId,
      score: 1,
      ...promptTuningRules[reasonId]
    }));
}

function mergePromptOverride(current = '', ruleText = '') {
  const trimmedRule = ruleText.trim();
  if (!trimmedRule) return current || '';
  if ((current || '').includes(trimmedRule)) return current || '';
  return [current, trimmedRule].filter(Boolean).join('\n');
}

function updateDecisionByRole(decision, slot, brief, role, status) {
  const next = {
    ...decision,
    title: brief?.title || slot?.title || decision.title,
    updatedAt: new Date().toISOString()
  };

  if (role === 'human') {
    next.manualStatus = status;
    next.designStatus = status === 'blocked' ? decision.designStatus : status;
    next.opsStatus = status;
  } else if (role === 'design') {
    next.designStatus = status;
  } else if (role === 'ops') {
    next.opsStatus = status;
  } else {
    next.designStatus = status === 'blocked' ? decision.designStatus : status;
    next.opsStatus = status;
  }

  next.status = deriveReviewStatus(next);
  next.note = getDefaultReviewNote(next.status, brief, next);
  return next;
}

function createProjectId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `project-${Date.now()}`;
}

function getProjectTitle(form) {
  return form.projectName || form.productName || form.sku || '未命名项目';
}

function normalizeLockText(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getProjectProductLock(form = {}) {
  const mainReference = form?.referenceImages?.main || {};
  const lockParts = [
    form.sku,
    form.productName || form.projectName,
    mainReference.name || form.sourceImageName,
    mainReference.audit?.width,
    mainReference.audit?.height
  ].map(normalizeLockText).filter(Boolean);
  return lockParts.length ? lockParts.join('|') : 'unlocked';
}

function isSameProductLock(project, form = {}) {
  if (!project?.productLock) return true;
  return project.productLock === getProjectProductLock(form);
}

function getFallbackSlot(slotId = 1) {
  const id = Number(slotId) || 1;
  return slots.find((slot) => slot.id === id) || {
    id,
    title: `Image ${id}`,
    goal: id === 1 ? '白底主图' : '动态图片角色',
    claims: [],
    status: 'review',
    method: 'AI 动态规划',
    image: generatedImages[(id - 1) % generatedImages.length],
    checks: ['卖点来自 Ledger', '图片角色由 AI 按产品选择']
  };
}

function getSlotFromBrief(brief = {}) {
  const base = getFallbackSlot(brief.id);
  return {
    ...base,
    id: Number(brief.id || base.id),
    title: brief.title || base.title,
    goal: brief.goal || base.goal,
    claims: [...(brief.usableClaims || []), ...(brief.needsEvidence || [])].slice(0, 4),
    status: brief.status === 'ready' ? 'review' : base.status,
    method: brief.plannerSource === 'gemini' ? 'AI 动态规划' : base.method,
    checks: brief.guardrails?.length ? brief.guardrails.slice(0, 3) : base.checks,
    visualType: brief.visualType || base.visualType
  };
}

function getActiveSlots(storyboardBriefs = []) {
  return storyboardBriefs.length
    ? [...storyboardBriefs]
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
      .map(getSlotFromBrief)
    : slots;
}

function createProjectRecord(
  form,
  ledgerFacts,
  id = createProjectId(),
  storyboardBriefs = [],
  reviewDecisions = [],
  generationRuns = [],
  promptOverrides = {},
  exportSelections = {}
) {
  return {
    id,
    form,
    productLock: getProjectProductLock(form),
    ledgerFacts,
    storyboardBriefs,
    reviewDecisions,
    generationRuns: normalizeGenerationRuns(generationRuns).slice(0, QUALITY_MAX_STORED_RUNS),
    promptOverrides,
    exportSelections,
    updatedAt: new Date().toISOString()
  };
}

function compactGenerationRunForStorage(run = {}) {
  const compactRun = normalizeGenerationRun(run);
  return {
    ...compactRun,
    imageSrc: compactRun.imageSrc && !compactRun.imageSrc.startsWith('data:') ? compactRun.imageSrc : '',
    rawImageSrc: '',
    prompt: String(compactRun.prompt || '').slice(0, 1400)
  };
}

function compactProjectFormForStorage(form = {}, keepPreview = true) {
  const nextForm = { ...form };
  if (!keepPreview) {
    nextForm.sourceImagePreview = '';
  }
  if (nextForm.referenceImages && typeof nextForm.referenceImages === 'object') {
    nextForm.referenceImages = Object.fromEntries(Object.entries(nextForm.referenceImages).map(([key, reference]) => ([
      key,
      {
        ...reference,
        preview: keepPreview && key === 'main' ? reference?.preview || '' : '',
        audit: reference?.audit ? {
          kind: reference.audit.kind,
          confidence: reference.audit.confidence,
          summary: reference.audit.summary
        } : undefined
      }
    ])));
  }
  return nextForm;
}

function compactProjectForStorage(project = {}, options = {}) {
  const keepPreview = options.keepPreview !== false;
  return {
    ...project,
    form: compactProjectFormForStorage(project.form, keepPreview),
    generationRuns: normalizeGenerationRuns(project.generationRuns)
      .slice(0, QUALITY_MAX_STORED_RUNS)
      .map(compactGenerationRunForStorage)
  };
}

function createSampleProject() {
  const sampleBriefs = buildStoryboardBriefs(facts, initialProjectForm);
  return createProjectRecord(
    initialProjectForm,
    facts,
    'sample-learning-tower',
    sampleBriefs,
    createReviewDecisions(sampleBriefs),
    []
  );
}

function loadStoredProjects() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.map((project) => {
      const form = { ...blankProjectForm, ...project.form };
      const ledgerFacts = Array.isArray(project.ledgerFacts) ? project.ledgerFacts : facts;
      const storyboardBriefs = Array.isArray(project.storyboardBriefs) ? project.storyboardBriefs : [];
      const reviewDecisions = Array.isArray(project.reviewDecisions)
        ? createReviewDecisions(storyboardBriefs, project.reviewDecisions)
        : createReviewDecisions(storyboardBriefs);
      const generationRuns = normalizeGenerationRuns(project.generationRuns);
      const promptOverrides = project.promptOverrides && typeof project.promptOverrides === 'object'
        ? project.promptOverrides
        : {};
      const exportSelections = project.exportSelections && typeof project.exportSelections === 'object'
        ? project.exportSelections
        : {};
      return {
        ...project,
        form,
        productLock: project.productLock || getProjectProductLock(form),
        ledgerFacts,
        storyboardBriefs,
        reviewDecisions,
        generationRuns,
        promptOverrides,
        exportSelections
      };
    });
  } catch {
    return [];
  }
}

function storeProjects(projects) {
  if (typeof window === 'undefined') return;
  const compactProjects = projects.map(compactProjectForStorage);
  try {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(compactProjects));
  } catch (error) {
    const metadataOnly = projects.map((project) => compactProjectForStorage(project, { keepPreview: false }));
    try {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(metadataOnly));
    } catch {
      const minimalProjects = metadataOnly.slice(0, 3).map((project) => ({
        ...project,
        form: {
          ...project.form,
          sourceImagePreview: '',
          referenceImages: blankProjectForm.referenceImages
        },
        generationRuns: normalizeGenerationRuns(project.generationRuns)
          .slice(0, QUALITY_MAX_STORED_RUNS)
          .map((run) => ({
            ...compactGenerationRunForStorage(run),
            aiReview: run.aiReview ? normalizeAiReviewResult(run.aiReview) : undefined,
            aiSuggestion: run.aiSuggestion || undefined
          }))
      }));
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(minimalProjects));
    }
  }
}

function formatProjectTime(value) {
  if (!value) return '未保存';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getReferenceImage(form) {
  return form?.referenceImages?.main?.preview || form?.sourceImagePreview || '';
}

function getReferenceImageName(form) {
  return form?.referenceImages?.main?.name || form?.sourceImageName || '';
}

function getReferenceItems(form) {
  const images = form?.referenceImages || {};
  return referenceTypes.map((type) => {
    const item = images[type.id];
    if (type.id === 'main' && !item) {
      return {
        ...type,
        name: form?.sourceImageName || '',
        preview: form?.sourceImagePreview || '',
        audit: form?.sourceImageAudit || null,
        fallback: true
      };
    }
    return {
      ...type,
      name: item?.name || '',
      preview: item?.preview || '',
      audit: item?.audit || null,
      fallback: false
    };
  });
}

function getGenerationReferenceItems(form, slotId, outputPresetId, visualType = '') {
  const all = getReferenceItems(form);
  const byId = Object.fromEntries(all.map((item) => [item.id, item]));
  const visualReferenceMap = {
    main: ['main'],
    benefits: ['main', 'detail'],
    lifestyle: ['main', 'side'],
    detail: ['main', 'detail'],
    state: ['main', 'state', 'side'],
    structure: ['main', 'side', 'detail'],
    dimensions: ['main', 'dimension', 'state']
  };
  const slotReferenceMap = {
    1: ['main'],
    2: ['main', 'detail'],
    3: ['main', 'side'],
    4: ['main', 'detail'],
    5: ['main', 'state', 'side'],
    6: ['main', 'side', 'dimension'],
    7: ['main', 'dimension', 'state']
  };
  const preferredIds = outputPresetId === 'main-image'
    ? ['main']
    : visualReferenceMap[visualType] || slotReferenceMap[slotId] || ['main', 'side'];
  return preferredIds
    .map((id) => byId[id])
    .filter((item) => item?.preview);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

async function imageSourceToDataUrl(imageSrc) {
  if (!imageSrc) throw new Error('缺少产品参考图');
  if (imageSrc.startsWith('data:')) return imageSrc;
  const response = await fetch(imageSrc);
  if (!response.ok) throw new Error('无法读取产品参考图');
  return blobToDataUrl(await response.blob());
}

async function planStoryboardWithApi(projectForm, ledgerFacts, brands = defaultBrandLibrary) {
  const sourceImageDataUrl = await imageSourceToDataUrl(getReferenceImage(projectForm));
  const brandProfile = getBrandProfile(getProjectBrandId(projectForm, brands), brands);
  const outputPreset = getProjectPlanOutputPreset(projectForm);
  const response = await fetch(`${IMAGE_API_BASE_URL}/api/plan-storyboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectForm,
      ledgerFacts,
      brandProfile,
      outputPresetId: outputPreset.id,
      outputPresetLabel: outputPreset.label,
      outputPresetSize: outputPreset.size,
      strategyRules: listingImageStrategyRules,
      sourceImageDataUrl
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok || !Array.isArray(result.briefs) || result.briefs.length !== 7) {
    throw new Error(result.error || 'AI 方案规划失败');
  }
  return result;
}

async function reviewGeneratedImageWithApi({ projectForm, brief, run, sourceImages }) {
  const generatedImageDataUrl = run.reviewImageDataUrl
    || await createAiReviewImageDataUrl(run.rawImageSrc || run.imageSrc);
  const normalizedSourceImages = sourceImages.length
    ? await Promise.all(sourceImages.map(async (reference) => ({
      id: reference.id,
      label: reference.label,
      name: reference.name,
      dataUrl: await createAiReviewImageDataUrl(reference.preview)
    })))
    : [{
      id: 'main',
      label: '主参考图',
      name: getReferenceImageName(projectForm),
      dataUrl: await createAiReviewImageDataUrl(getReferenceImage(projectForm))
    }];
  const response = await fetch(`${IMAGE_API_BASE_URL}/api/review-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectForm,
      brief,
      run,
      sourceImages: normalizedSourceImages,
      sourceImageDataUrl: normalizedSourceImages[0]?.dataUrl,
      generatedImageDataUrl,
      prompt: run.prompt
    })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'AI 预审接口返回失败。');
  }
  return {
    ...normalizeAiReviewResult(result.review),
    provider: result.provider,
    model: result.model,
    requestId: result.requestId,
    durationMs: result.durationMs,
    createdAt: new Date().toISOString()
  };
}

function resizeImageToPreset(imageSrc, preset) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = preset.width;
      canvas.height = preset.height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('无法创建图片画布'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    image.onerror = () => reject(new Error('候选图尺寸处理失败'));
    image.src = imageSrc;
  });
}

function createImageThumbnail(imageSrc, maxSide = 560) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('无法创建预览图'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => reject(new Error('候选图预览处理失败'));
    image.src = imageSrc;
  });
}

async function createAiReviewImageDataUrl(imageSrc, maxSide = 1200) {
  const sourceDataUrl = await imageSourceToDataUrl(imageSrc);
  return createImageThumbnail(sourceDataUrl, maxSide);
}

async function saveGeneratedImageToApi({ imageDataUrl, projectForm, slotId, runId }) {
  const response = await fetch(`${IMAGE_API_BASE_URL}/api/save-generated-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageDataUrl,
      projectName: projectForm?.projectName || projectForm?.productName || 'listingflow',
      slotId,
      runId
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok || !result.imageUrl) {
    throw new Error(result.error || '生成图保存到本地文件失败');
  }
  return result;
}

function buildGenerationPrompt(brief, slot, outputPreset, options = {}) {
  const brand = getBrandProfile(brief.brandId, options.brandLibrary || defaultBrandLibrary);
  const isWhiteMainImage = outputPreset.id === 'main-image' && slot.id === 1;
  const isAPlusOutput = outputPreset.id === 'aplus';
  const brandPaletteText = formatBrandColorPalette(brand);
  const logoInstruction = isAPlusOutput
    ? (brand.logoPreview
      ? 'Logo rule: A+ mode only. The uploaded brand logo may appear once as a restrained brand mark if it supports the layout. Do not distort, redraw, recolor, or invent the logo.'
      : 'Logo rule: A+ mode only, but no logo file is uploaded. Do not invent or render a logo.')
    : 'Logo rule: logo is forbidden for this output preset. Do not display, invent, imitate, or watermark any brand logo.';
  const brandInstruction = options.baselineMode
    ? 'Validation baseline mode: do not apply brand styling, do not add logo, do not introduce brand colors unless they already exist on the product or a neutral ecommerce layout needs them.'
    : [
      `Brand style: ${brand.name}. ${brand.tone}.`,
      `Internal brand palette constraint, not visible content: ${brandPaletteText}.`,
      brand.colors.length
        ? 'Use these colors only as hidden art-direction constraints for designed backgrounds, graphic blocks, labels, icons, callouts, accent shapes, and decorative UI elements. Do not introduce unlisted brand colors. Neutral white/black/gray may be used only for legibility and shadows; never recolor the actual product away from the reference.'
        : 'No brand colors are configured. Use only neutral ecommerce backgrounds and do not invent a brand palette.',
      'Do not render the brand palette itself. Never show HEX codes, color percentages, color swatch blocks, color cards, palette legends, design-token labels, or style-guide panels in the generated image.',
      `Background policy: ${brand.backgroundPolicy}.`,
      brand.scenes.length ? `Preferred scene cues: ${brand.scenes.join(', ')}.` : '',
      brand.forbiddenStyles.length ? `Avoid these brand-forbidden styles: ${brand.forbiddenStyles.join(', ')}.` : '',
      logoInstruction,
      `Style rules: ${brand.styleRules.join('; ')}.`
    ].filter(Boolean).join(' ');
  const backgroundInstruction = isAPlusOutput
    ? [
      'A+ output rule: this is Amazon A+ content, not the primary white-background image. Even if this is slot 01, it does not need a pure white background.',
      'Use a richer editorial module layout with realistic product photography, brand-color background fields, lifestyle context, feature blocks, detail crops, or comparison areas when useful.',
      'The layout may combine related selling points into one coherent A+ module, as long as every visible claim is allowed by the Ledger or clearly visible in the product reference.',
      'Do not use crowded text; make the module richer through composition, hierarchy, imagery, spacing, and evidence, not through paragraphs.'
    ].join(' ')
    : isWhiteMainImage
    ? 'Slot 01 is the Amazon primary white-background image: pure white background, product only, no text, no lifestyle scene, no props, no badges, no colored background.'
    : [
      'This is not the primary white-background image. It may use a clean background, background color, soft layout blocks, or a realistic use-scene background when that helps show the selected selling point.',
      options.baselineMode
        ? 'Use neutral ecommerce backgrounds or realistic usage environments; avoid decorative brand color dominance during validation.'
        : `When a brand is selected, internally use the configured brand colors as the only intentional color system for backgrounds, blocks, labels, icons, and callouts. Follow this hidden palette ratio for design decisions only: ${brandPaletteText}. Do not display the palette, HEX codes, or percentages. Follow the brand background policy: ${brand.backgroundPolicy}.`,
      'If using a real scene, the product must be placed in a physically believable real use context. The background should explain the benefit, not become generic decoration.'
    ].join(' ');
  const titlePlacementInstruction = isAPlusOutput
    ? 'A+ title rule: a heading is optional and does not have to sit at the top. Place headings wherever the module layout looks most natural, such as left, center, over an image band, or beside the product. Keep typography consistent with the brand system.'
    : 'If a title is used, place it at the top of the image. Keep title style, font family, font weight, and label treatment consistent with the other images in the 7-image set.';
  const claimScopeInstruction = isAPlusOutput
    ? [
      'A+ content claim scope: use the slot primary claim as the anchor, but you may combine closely related allowed claims from the Ledger when they make the module clearer.',
      'You may also use allowed Ledger claims that were not explicitly assigned to this slot if they support the A+ story and do not contradict the slot brief.',
      'Never use needs-evidence or blocked claims as visible claims, visual implications, badges, or staged benefits.'
    ].join(' ')
    : 'Do not cram multiple unrelated claims into one image. One clear visual proof is better than many weak text callouts.';
  const physicalLogic = {
    cookware: 'Physical logic rules: cookware must sit naturally on a kitchen counter, stovetop, table, or cooking surface; lid, knob, handles, pot body, reflections, food scale, steam, and shadows must be believable; no floating cookware, distorted handles, impossible lid fit, extra knobs, unsafe flames, or invented accessories.',
    learningTower: 'Physical logic rules: toddlers must stand naturally with feet fully supported; the tower must rest on the floor; countertop height and product height must look believable; no floating, bending, impossible shadows, duplicated legs, extra rails, or distorted steps.',
    generic: 'Physical logic rules: the product must sit, hang, stand, open, close, or be used only in ways supported by the reference images and confirmed facts; scale, shadows, contact points, reflections, parts, and scene context must be believable.'
  }[brief.productType || 'generic'];

  return [
    `Create one Amazon listing image candidate for slot ${String(slot.id).padStart(2, '0')} - ${brief.title || slot.title}.`,
    outputPreset.prompt,
    backgroundInstruction,
    `Listing image strategy rules: ${getListingImageStrategyText()}`,
    brief.promptBrief,
    brief.primaryClaim ? `Primary claim: ${brief.primaryClaim}. The composition must visually prove this claim.` : '',
    brief.visualProof ? `Visual proof requirement: ${brief.visualProof}` : '',
    `Slot-specific quality guardrails: ${getSlotQualityGuardrailText(brief.visualType)}.`,
    isAPlusOutput ? 'A+ module quality rule: allow richer content, broader composition, and combined benefit storytelling, but keep every claim truthful, readable, visually supported, and product-led.' : '',
    'Input claims, keywords, and notes may be Chinese, English, or mixed. Understand and translate them internally.',
    'Any visible copy in the generated image, including labels, callouts, badges, dimensions, feature text, comparison text, and short captions, must be natural English only. Do not render Chinese text in the final image.',
    'Internal prompt metadata must never appear in the image. Do not show brand color HEX codes, percentages, palette swatches, prompt labels, model notes, grid specs, or any design-system documentation.',
    'If a Chinese keyword has no direct ecommerce wording, rewrite it as concise Amazon-ready English instead of copying the Chinese characters.',
    'Design the typography, callout placement, arrows, badges, and text hierarchy directly inside the generated image composition. Do not leave blank spaces for later text overlay.',
    titlePlacementInstruction,
    'Visible text must be spatially aligned with the product feature, scene action, measurement, or visual evidence it refers to. Avoid generic floating labels that do not point to anything.',
    'Use as little explanatory text as possible while preserving clarity. The visual scene, detail, state, or layout should carry the proof.',
    'Use ecommerce-grade typography: short phrases, large readable type, clean spacing, balanced margins, and no tiny paragraphs.',
    'Use all uploaded product reference images as the locked source of truth. They are different views/details of the same product, not separate products.',
    brandInstruction,
    options.promptOverride ? `Slot-specific prompt tuning rules from prior QA: ${options.promptOverride}` : '',
    'Preserve the product geometry, material, hardware, proportions, and only the functional states proven by the uploaded references or confirmed product facts.',
    physicalLogic,
    'Do not invent new parts, remove parts, change dimensions, or make unsupported safety claims.',
    claimScopeInstruction,
    `Final image will be fitted to ${outputPreset.size}; compose for ${outputPreset.ratio} from the start.`,
    'Return a polished ecommerce image suitable for internal review.'
  ].filter(Boolean).join(' ');
}

function buildGptComparisonPrompt({ brief, slot, outputPreset, prompt, referenceItems = [] }) {
  const referenceText = referenceItems.length
    ? referenceItems.map((item, index) => `${index + 1}. ${item.label}: ${item.name || 'uploaded reference image'}`).join('\n')
    : '1. Main product reference image';
  return [
    'I will upload the product reference image(s) with this prompt.',
    'Generate ONE Amazon listing image candidate for model comparison.',
    'Use the uploaded product image(s) as the locked source of truth. Do not redesign the product.',
    '',
    `Slot: ${String(slot.id).padStart(2, '0')} - ${brief.title || slot.title}`,
    `Output type: ${outputPreset.label} ${outputPreset.size}`,
    `Primary claim: ${brief.primaryClaim || 'none'}`,
    `Visual proof: ${brief.visualProof || 'The image must visually prove the assigned selling point.'}`,
    '',
    'Reference images to upload:',
    referenceText,
    '',
    'Full generation instructions:',
    prompt
  ].join('\n');
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback below.
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

function getStoryboardClaims(slot, brief) {
  if (!brief) return slot.claims;
  return [...brief.usableClaims, ...brief.needsEvidence].slice(0, 4);
}

function getStoryboardChecks(brief) {
  if (!brief) {
    return ['先生成 7 图方案', '方案阶段不代表最终图片', '真实候选图在生图任务生成'];
  }
  return [
    '图片仅作产品参考占位',
    '卖点来自 Ledger',
    ...brief.guardrails.slice(0, 2)
  ];
}

function getAuditTone(status) {
  return {
    pass: '通过',
    warn: '需复核',
    fail: '不通过'
  }[status] || '待检测';
}

function getImageAuditChecks(audit) {
  if (!audit) return [];
  const longestSide = Math.max(audit.width, audit.height);
  const sizeStatus = longestSide >= 1600 ? 'pass' : longestSide >= 1000 ? 'warn' : 'fail';
  const backgroundStatus = audit.borderWhiteRatio >= 0.94 ? 'pass' : audit.borderWhiteRatio >= 0.85 ? 'warn' : 'fail';
  const coverageStatus = audit.subjectCoverage >= 0.78 && audit.subjectCoverage <= 0.95
    ? 'pass'
    : audit.subjectCoverage >= 0.62 && audit.subjectCoverage <= 0.98
      ? 'warn'
      : 'fail';
  const storageStatus = audit.fileSizeMb <= 2.5 ? 'pass' : audit.fileSizeMb <= 4.5 ? 'warn' : 'fail';

  return [
    {
      label: '最长边尺寸',
      value: `${longestSide}px`,
      status: sizeStatus,
      detail: '建议至少 1600px，低于 1000px 不适合继续做主图。'
    },
    {
      label: '白底边缘',
      value: `${Math.round(audit.borderWhiteRatio * 100)}%`,
      status: backgroundStatus,
      detail: '粗略抽样图片边缘是否接近纯白背景。'
    },
    {
      label: '主体占比',
      value: `${Math.round(audit.subjectCoverage * 100)}%`,
      status: coverageStatus,
      detail: '按非白区域外接框粗估，目标接近 85%。'
    },
    {
      label: '本地保存体积',
      value: `${audit.fileSizeMb.toFixed(2)} MB`,
      status: storageStatus,
      detail: '当前原型把图片保存在浏览器本地，过大会影响保存。'
    }
  ];
}

function analyzeImageDataUrl(dataUrl, file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 260 / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        reject(new Error('Canvas not available'));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const edgeSize = Math.max(4, Math.round(Math.min(width, height) * 0.05));
      let edgeCount = 0;
      let edgeWhite = 0;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      const isWhite = (red, green, blue) => {
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        return red >= 246 && green >= 246 && blue >= 246 && max - min <= 14;
      };

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const whitePixel = isWhite(red, green, blue);
          const edgePixel = x < edgeSize || y < edgeSize || x >= width - edgeSize || y >= height - edgeSize;
          if (edgePixel) {
            edgeCount += 1;
            if (whitePixel) edgeWhite += 1;
          }
          if (!whitePixel) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const hasSubject = maxX >= minX && maxY >= minY;
      const subjectCoverage = hasSubject
        ? ((maxX - minX + 1) * (maxY - minY + 1)) / (width * height)
        : 0;

      resolve({
        fileName: file?.name || '',
        fileSizeMb: file ? file.size / 1024 / 1024 : dataUrl.length / 1024 / 1024,
        width: image.naturalWidth,
        height: image.naturalHeight,
        borderWhiteRatio: edgeCount ? edgeWhite / edgeCount : 0,
        subjectCoverage,
        checkedAt: new Date().toISOString()
      });
    };
    image.onerror = () => reject(new Error('Image could not be read'));
    image.src = dataUrl;
  });
}

function StatusPill({ status }) {
  const map = {
    approved: { text: '通过', className: 'approved', icon: Check },
    review: { text: '待审', className: 'review', icon: Eye },
    rework: { text: '返工', className: 'rework', icon: RefreshCcw }
  };
  const item = map[status];
  const Icon = item.icon;
  return (
    <span className={`status-pill ${item.className}`}>
      <Icon size={14} />
      {item.text}
    </span>
  );
}

function ReviewStatusPill({ status, context = 'review' }) {
  const planStatusMeta = {
    approved: { text: '方向通过', shortText: '通过', className: 'approved', icon: Check },
    review: { text: '待确认', shortText: '待确认', className: 'review', icon: Eye },
    rework: { text: '需调整', shortText: '调整', className: 'rework', icon: RefreshCcw },
    blocked: { text: '不进入生成', shortText: '停用', className: 'blocked', icon: X }
  };
  const item = (context === 'plan' ? planStatusMeta[status] : reviewStatusMeta[status])
    || (context === 'plan' ? planStatusMeta.review : reviewStatusMeta.review);
  const Icon = item.icon;
  return (
    <span className={`status-pill ${item.className}`}>
      <Icon size={14} />
      {item.text}
    </span>
  );
}

function BriefStatusPill({ status }) {
  const map = {
    ready: { text: '可进入设计', className: 'approved', icon: Check },
    needs_review: { text: '需复核', className: 'review', icon: Eye },
    needs_claims: { text: '缺少卖点', className: 'rework', icon: RefreshCcw }
  };
  const item = map[status] || map.needs_review;
  const Icon = item.icon;
  return (
    <span className={`status-pill ${item.className}`}>
      <Icon size={14} />
      {item.text}
    </span>
  );
}

function GenerationVerdictPill({ verdict }) {
  const item = generationVerdicts[verdict] || generationVerdicts.unreviewed;
  const Icon = item.icon;
  return (
    <span className={`status-pill ${item.className}`}>
      <Icon size={14} />
      {item.label}
    </span>
  );
}

function AiReviewPill({ verdict }) {
  const item = aiReviewVerdicts[verdict] || aiReviewVerdicts.warn;
  const Icon = item.icon;
  return (
    <span className={`status-pill ${item.className}`}>
      <Icon size={14} />
      AI {item.label}
    </span>
  );
}

function AiReviewPanel({ review }) {
  if (!review) {
    return (
      <div className="ai-review-panel empty">
        <ShieldCheck size={20} />
        <div>
          <strong>等待 AI 预审</strong>
          <p>生成候选图后，可先让 AI 对照原图检查产品漂移、物理逻辑和卖点风险。</p>
        </div>
      </div>
    );
  }
  const normalized = normalizeAiReviewResult(review);
  return (
    <div className={`ai-review-panel ${normalized.verdict}`}>
      <div className="ai-review-top">
        <div>
          <span>AI 预审</span>
          <strong>{normalized.summary}</strong>
          <p>{normalized.recommendedAction}</p>
        </div>
        <div className="ai-score">
          <AiReviewPill verdict={normalized.verdict} />
          <b>{normalized.score}</b>
        </div>
      </div>
      <div className="ai-check-grid">
        {Object.entries(aiReviewCheckLabels).map(([key, label]) => {
          const status = normalized.checks[key] || 'warn';
          return (
            <span className={status} key={key}>
              {label}
              <b>{status === 'pass' ? '通过' : status === 'fail' ? '高风险' : '复核'}</b>
            </span>
          );
        })}
      </div>
      {normalized.issues.length > 0 && (
        <div className="ai-issue-list">
          {normalized.issues.map((issue) => <span key={issue}>{issue}</span>)}
        </div>
      )}
      <p className="ai-review-meta">
        {normalized.model || normalized.provider || 'AI reviewer'} · {formatProjectTime(normalized.createdAt)}
      </p>
    </div>
  );
}

function AiSuggestionBox({ suggestion, onApply }) {
  if (!suggestion) return null;
  const verdictMeta = generationVerdicts[suggestion.verdict] || generationVerdicts.needs_fix;
  const reasonLabels = getFailureReasonLabels(suggestion.reasons);
  return (
    <div className="ai-suggestion-box">
      <div>
        <span>AI 建议人工标记</span>
        <strong>{verdictMeta.label}</strong>
        <p>{reasonLabels.length ? reasonLabels.join('、') : '未识别到明确失败原因'}</p>
      </div>
    </div>
  );
}

function RoleSelector({ activeRole, setActiveRole }) {
  return (
    <div className="role-selector">
      <span>当前确认人</span>
      <div>
        {Object.entries(reviewerRoles).map(([id, role]) => (
          <button
            className={activeRole === id ? 'active' : ''}
            key={id}
            onClick={() => setActiveRole(id)}
          >
            {role.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoleChecklist({ decision }) {
  const designDone = decision.designStatus === 'approved';
  const opsDone = decision.opsStatus === 'approved';
  return (
    <div className="role-checklist">
      <span className={designDone ? 'done' : decision.designStatus}>
        <Check size={13} />
        设计：{reviewStatusMeta[decision.designStatus]?.shortText || '待审'}
      </span>
      <span className={opsDone ? 'done' : decision.opsStatus}>
        <Check size={13} />
        运营：{reviewStatusMeta[decision.opsStatus]?.shortText || '待审'}
      </span>
    </div>
  );
}

function ReviewActions({
  decision,
  activeRole,
  onUpdateReview,
  context = 'review',
  onRegenerateSlot,
  isRegenerating = false
}) {
  if (!decision) return null;
  const roleId = activeRole || 'human';
  const role = reviewerRoles[roleId] || reviewerRoles.human;
  const planMode = context === 'plan';
  const actions = [
    ['approved', Check, planMode ? '方向通过' : role.passText],
    ['rework', RefreshCcw, planMode ? '需要调整' : role.reworkText],
    ...(planMode ? [] : [['blocked', X, '禁止导出']])
  ];

  return (
    <div className="review-actions">
      <div>
        <span>{planMode ? '方案确认' : role.title}</span>
        {planMode && <ReviewStatusPill status={decision.status} context="plan" />}
      </div>
      <p>{planMode ? '这里只确认这张图的方向、卖点和画面证明方式；最终图片质量在生成后再判断。' : role.helper}</p>
      <div className="review-action-buttons">
        {actions.map(([status, Icon, label]) => (
          <button
            className={deriveRoleButtonClass(decision, roleId, status)}
            disabled={isRegenerating}
            key={status}
            onClick={() => {
              onUpdateReview(decision.slotId, roleId, status);
              if (planMode && status === 'rework' && onRegenerateSlot) {
                onRegenerateSlot(decision.slotId, roleId);
              }
            }}
          >
            {isRegenerating && status === 'rework' ? <RefreshCcw className="spin-icon" size={15} /> : <Icon size={15} />}
            {isRegenerating && status === 'rework' ? '重生成中...' : label}
          </button>
        ))}
      </div>
    </div>
  );
}

function deriveRoleButtonClass(decision, activeRole, status) {
  const roleStatus = activeRole === 'human'
    ? decision.status
    : activeRole === 'design'
    ? decision.designStatus
    : activeRole === 'ops'
      ? decision.opsStatus
      : decision.status;
  return roleStatus === status ? `review-action active ${status}` : `review-action ${status}`;
}

function Metric({ label, value, tone }) {
  return (
    <div className={`metric ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FocusFrame({ active, children, className = '' }) {
  const frameRef = useRef(null);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    const scrollTimer = window.setTimeout(() => {
      frameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlight(true);
    }, 80);
    const clearTimer = window.setTimeout(() => setHighlight(false), 1800);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [active]);

  return (
    <div ref={frameRef} className={`${className} ${highlight ? 'focus-flash' : ''}`.trim()}>
      {children}
    </div>
  );
}

function getFocusSignal(focusRequest, section) {
  return focusRequest?.section === section ? focusRequest.id : false;
}

function WorkflowGuide({ steps, activeSection, onNavigate }) {
  const nextStep = steps.find((step) => step.status === 'current')
    || steps.find((step) => step.status === 'ready')
    || steps[steps.length - 1];
  const NextIcon = nextStep.icon;
  const isCurrentPageStep = nextStep.target === activeSection;

  return (
    <section className="next-action-bar" aria-label="下一步操作">
      <span className="next-action-eyebrow">下一步</span>
      <div className="next-action-copy">
        <strong>{nextStep.title}</strong>
        <small>{nextStep.helper}</small>
      </div>
      <button
        className="primary-button"
        disabled={isCurrentPageStep}
        onClick={() => onNavigate(nextStep.target, nextStep.anchor)}
      >
        <NextIcon size={16} />
        {isCurrentPageStep ? '正在这里' : nextStep.action}
      </button>
    </section>
  );
}

function ProjectList({ projects, activeProjectId, onSelectProject, onCreateProject, onDeleteProject }) {
  return (
    <div className="project-list-card">
      <div className="project-list-header">
        <div>
          <p className="eyebrow">项目列表</p>
          <h2>本地草稿</h2>
        </div>
        <button className="mini-icon-button" aria-label="创建新项目" onClick={onCreateProject}>
          <Plus size={16} />
        </button>
      </div>
      <div className="project-list">
        {projects.length ? projects.map((project) => (
          <div className={project.id === activeProjectId ? 'project-item active' : 'project-item'} key={project.id}>
            <button className="project-select-button" onClick={() => onSelectProject(project.id)}>
              <FolderOpen size={15} />
              <span>
                <strong>{getProjectTitle(project.form)}</strong>
                <small>{project.form.sku || '无 SKU'} · {formatProjectTime(project.updatedAt)}</small>
              </span>
            </button>
            <button className="project-delete-button" aria-label={`删除 ${getProjectTitle(project.form)}`} onClick={() => onDeleteProject(project.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        )) : (
          <div className="project-list-empty">
            <FolderOpen size={18} />
            <strong>暂无本地草稿</strong>
            <small>点击右上角 + 创建新项目。</small>
          </div>
        )}
      </div>
    </div>
  );
}

function ReferencePanel({ projectForm }) {
  const referenceItems = getReferenceItems(projectForm).filter((item) => item.preview);
  const mainReference = referenceItems.find((item) => item.id === 'main') || referenceItems[0];
  return (
    <section className="panel product-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Reference Set</p>
          <h3>产品参考图组</h3>
        </div>
        <span className="lock-label">
          <LockKeyhole size={14} />
          {referenceItems.length} refs
        </span>
      </div>
      <div className="reference-layout">
        {mainReference?.preview ? (
          <img src={mainReference.preview} alt="Original product" className="reference-image" />
        ) : (
          <div className="reference-image reference-placeholder">
            <FileImage size={28} />
            <span>等待上传产品图</span>
          </div>
        )}
        <div className="reference-copy">
          <h4>生成规则</h4>
          <span className="image-name">{mainReference?.name || '未上传图片'}</span>
          <p>每张图都从原始参考图组重新生成。失败时回到参考图重来，禁止基于上一张生成图继续修改。</p>
          <div className="rule-list">
            <span>产品结构不变</span>
            <span>按图槽选择参考</span>
            <span>卖点来自 Ledger</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ImageAuditPanel({ audit, nested = false }) {
  const checks = getImageAuditChecks(audit);
  const overallStatus = checks.some((check) => check.status === 'fail')
    ? 'fail'
    : checks.some((check) => check.status === 'warn')
      ? 'warn'
      : checks.length
        ? 'pass'
        : 'pending';

  const content = (
    <>
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Image Check</p>
          <h3>图片基础检测</h3>
        </div>
        <span className={`audit-status ${overallStatus}`}>
          {overallStatus === 'pending' ? '待检测' : getAuditTone(overallStatus)}
        </span>
      </div>
      {!audit ? (
        <div className="empty-audit">
          <ImagePlus size={24} />
          <strong>上传白底图后自动检测</strong>
          <p>先检查尺寸、白底边缘、主体占比和本地保存体积。</p>
        </div>
      ) : (
        <>
          <div className="image-audit-meta">
            <span>{audit.fileName || '当前图片'}</span>
            <strong>{audit.width} x {audit.height}px</strong>
          </div>
          <div className="image-audit-list">
            {checks.map((check) => (
              <div className="image-audit-row" key={check.label}>
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.detail}</p>
                </div>
                <span className={`audit-status ${check.status}`}>{check.value} · {getAuditTone(check.status)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );

  if (nested) {
    return <div className="nested-content image-audit-content">{content}</div>;
  }

  return (
    <section className="panel">
      {content}
    </section>
  );
}

function FactLedgerPanel({ compact = false, ledgerFacts = facts, onManage, showStatus = true }) {
  const factStateMap = {
    allowed: { className: 'fact-allowed', label: 'allowed', icon: Check },
    evidence: { className: 'fact-evidence', label: 'needs evidence', icon: Clock3 },
    review: { className: 'fact-review', label: 'review', icon: Eye },
    blocked: { className: 'fact-blocked', label: 'blocked', icon: X }
  };

  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Claims</p>
          <h3>{compact ? '可上图卖点' : '卖点确认表'}</h3>
        </div>
        {onManage && (
          <button className="text-button" type="button" aria-label="管理卖点确认表" onClick={onManage}>
            管理
            <ChevronRight size={16} />
          </button>
        )}
      </div>
      <div className="fact-table">
        {ledgerFacts.map((fact) => {
          const state = fact.state || (fact.allowed ? 'allowed' : 'blocked');
          const stateMeta = factStateMap[state] || factStateMap.review;
          const StateIcon = stateMeta.icon;
          return (
            <div className="fact-row" key={fact.claim}>
              <div>
                <strong>{fact.claim}</strong>
                <span>{fact.source} · {fact.confidence} · {fact.owner}</span>
              </div>
              {showStatus && (
                <span className={stateMeta.className}>
                  <StateIcon size={14} />
                  {stateMeta.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildTaskRows(storyboardBriefs = []) {
  if (!storyboardBriefs.length) {
    return [
      {
        slot: '等待方案',
        prompt: '先生成 7 图方案，再进入生图任务',
        result: '未开始',
        owner: '人工复核'
      }
    ];
  }

  return storyboardBriefs.slice(0, 3).map((brief) => ({
    slot: brief.title,
    prompt: `${brief.goal} · ${brief.usableClaims[0] || brief.needsEvidence[0] || '等待卖点确认'}`,
    result: brief.status === 'ready' ? '可生图' : brief.status === 'needs_review' ? '需复核' : '缺少卖点',
    owner: '人工复核'
  }));
}

function TaskListPanel({ storyboardBriefs }) {
  const taskRows = buildTaskRows(storyboardBriefs);

  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Generation Queue</p>
          <h3>生图与预审任务</h3>
        </div>
        <button className="text-button">
          全部
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="task-list">
        {taskRows.map((task) => (
          <div className="task-row" key={task.slot}>
            <div className="task-icon">
              <ImagePlus size={18} />
            </div>
            <div>
              <strong>{task.slot}</strong>
              <span>{task.prompt}</span>
            </div>
            <div className="task-meta">
              <b>{task.result}</b>
              <span>{task.owner}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectPage({
  projectForm,
  setProjectForm,
  brandLibrary,
  ledgerFacts,
  productLockChanged,
  productLockValue,
  onGenerateLedgerDraft,
  onContinueToStoryboard,
  onSaveProject,
  onManageLedger,
  saveStatus,
  focusRequest
}) {
  const [intakeMode, setIntakeMode] = useState('sku');
  const [imageAuditStatus, setImageAuditStatus] = useState('');
  const [highlightTarget, setHighlightTarget] = useState('');
  const uploadRef = useRef(null);
  const claimsRef = useRef(null);
  const ledgerDraftRef = useRef(null);
  const activeMode = intakeModes[intakeMode];
  const ModeIcon = activeMode.icon;
  const draftCounts = {
    allowed: ledgerFacts.filter((fact) => fact.state === 'allowed').length,
    evidence: ledgerFacts.filter((fact) => fact.state === 'evidence').length,
    review: ledgerFacts.filter((fact) => fact.state === 'review').length,
    blocked: ledgerFacts.filter((fact) => fact.state === 'blocked').length
  };
  const updateField = (field, value) => {
    setProjectForm((current) => ({ ...current, [field]: value }));
  };
  const handleReferenceImageUpload = (referenceId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const preview = String(reader.result || '');
      const referenceType = referenceTypes.find((item) => item.id === referenceId);
      setImageAuditStatus(`${referenceType?.label || '参考图'}检测中...`);
      try {
        const audit = await analyzeImageDataUrl(preview, file);
        setProjectForm((current) => ({
          ...current,
          sourceImageName: referenceId === 'main' ? file.name : current.sourceImageName,
          sourceImagePreview: referenceId === 'main' ? preview : current.sourceImagePreview,
          sourceImageAudit: referenceId === 'main' ? audit : current.sourceImageAudit,
          referenceImages: {
            ...(current.referenceImages || {}),
            [referenceId]: {
              name: file.name,
              preview,
              audit
            }
          }
        }));
        setImageAuditStatus(`${referenceType?.label || '参考图'}已上传，记得保存项目`);
      } catch {
        setProjectForm((current) => ({
          ...current,
          sourceImageName: referenceId === 'main' ? file.name : current.sourceImageName,
          sourceImagePreview: referenceId === 'main' ? preview : current.sourceImagePreview,
          sourceImageAudit: referenceId === 'main' ? null : current.sourceImageAudit,
          referenceImages: {
            ...(current.referenceImages || {}),
            [referenceId]: {
              name: file.name,
              preview,
              audit: null
            }
          }
        }));
        setImageAuditStatus(`${referenceType?.label || '参考图'}已上传，但检测失败`);
      }
    };
    reader.onerror = () => {
      setImageAuditStatus('图片读取失败');
    };
    reader.readAsDataURL(file);
  };
  const removeReferenceImage = (referenceId) => {
    setProjectForm((current) => {
      const nextReferenceImages = { ...(current.referenceImages || {}) };
      delete nextReferenceImages[referenceId];
      return {
        ...current,
        sourceImageName: referenceId === 'main' ? '' : current.sourceImageName,
        sourceImagePreview: referenceId === 'main' ? '' : current.sourceImagePreview,
        sourceImageAudit: referenceId === 'main' ? null : current.sourceImageAudit,
        referenceImages: nextReferenceImages
      };
    });
    setImageAuditStatus('参考图已移除，记得保存项目');
  };

  useEffect(() => {
    if (focusRequest?.section !== 'project') return undefined;
    const targetMap = {
      'image-upload': uploadRef,
      claims: claimsRef,
      'ledger-draft': ledgerDraftRef
    };
    const targetRef = targetMap[focusRequest.anchor] || uploadRef;
    const timeout = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightTarget(focusRequest.anchor || 'image-upload');
    }, 80);
    const clear = window.setTimeout(() => setHighlightTarget(''), 1800);
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(clear);
    };
  }, [focusRequest]);

  return (
    <section className="page-grid">
      <div className="left-column">
        <section className="panel project-intake-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">New Project</p>
              <h3>{intakeMode === 'sku' ? '绑定 SKU 创建项目' : '手动创建项目'}</h3>
            </div>
          </div>
          <div className="form-grid">
            <div className={`form-field full ${highlightTarget === 'image-upload' ? 'focus-flash soft' : ''}`} ref={uploadRef}>
              <span>产品参考图组</span>
              <p className="field-help">只上传这个产品真实存在的角度、状态和细节。没有对应功能时可以留空，系统会只使用已上传参考图。</p>
              <div className="reference-set-grid">
                {getReferenceItems(projectForm).map((reference) => (
                  <div className={reference.required ? 'reference-upload-card required' : 'reference-upload-card'} key={reference.id}>
                    <div className="reference-upload-preview">
                      {reference.preview ? (
                        <img src={reference.preview} alt={reference.label} />
                      ) : (
                        <ImagePlus size={28} />
                      )}
                    </div>
                    <div>
                      <strong>{reference.label}</strong>
                      <p>{reference.helper}</p>
                      {reference.name && <span>{reference.name}</span>}
                    </div>
                    <div className="reference-upload-actions">
                      <label className="secondary-button upload-button" htmlFor={`reference-upload-${reference.id}`}>
                        <Upload size={17} />
                        上传
                      </label>
                      <input
                        accept="image/*"
                        className="file-input"
                        id={`reference-upload-${reference.id}`}
                        onChange={(event) => handleReferenceImageUpload(reference.id, event)}
                        type="file"
                      />
                      {reference.preview && !reference.fallback && (
                        <button className="text-button" onClick={() => removeReferenceImage(reference.id)}>
                          移除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {imageAuditStatus && <span className="save-status">{imageAuditStatus}</span>}
            </div>
            {intakeMode === 'sku' && (
              <label className="form-field">
                <span>SKU</span>
                <input
                  value={projectForm.sku}
                  onChange={(event) => updateField('sku', event.target.value)}
                  placeholder="输入或粘贴 SKU"
                />
              </label>
            )}
            <label className="form-field">
              <span>品牌</span>
              <select
                value={getProjectBrandId(projectForm, brandLibrary)}
                onChange={(event) => updateField('brandId', event.target.value)}
              >
                {brandLibrary.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{intakeMode === 'sku' ? '项目名' : '项目名'}</span>
              <input
                value={projectForm.projectName}
                onChange={(event) => updateField('projectName', event.target.value)}
                placeholder="例如 Cosyland learning tower"
              />
            </label>
            <label className="form-field">
              <span>产品名</span>
              <input
                value={projectForm.productName}
                onChange={(event) => updateField('productName', event.target.value)}
                placeholder="用于内部识别"
              />
            </label>
            <label className="form-field">
              <span>类目</span>
              <input
                value={projectForm.category}
                onChange={(event) => updateField('category', event.target.value)}
                placeholder="Amazon 类目或内部类目"
              />
            </label>
            <label className="form-field">
              <span>主参考图文件名</span>
              <input
                value={getReferenceImageName(projectForm)}
                onChange={(event) => updateField('sourceImageName', event.target.value)}
                placeholder="先记录主参考图文件名"
              />
            </label>
            <label className={`form-field full ${highlightTarget === 'claims' ? 'focus-flash soft' : ''}`} ref={claimsRef}>
              <span>卖点草稿，每行一个</span>
              <textarea
                value={projectForm.claimsText}
                onChange={(event) => updateField('claimsText', event.target.value)}
                rows={8}
                placeholder="每行一个卖点，例如 Bamboo material"
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" onClick={() => onGenerateLedgerDraft(projectForm, intakeMode)}>
              <ClipboardCheck size={17} />
              生成卖点草稿
            </button>
            <button className="secondary-button" onClick={onSaveProject}>
              <Save size={17} />
              保存当前项目
            </button>
            <button className="text-button strong" onClick={onContinueToStoryboard}>
              <Layers size={17} />
              进入 7 图方案
            </button>
            {saveStatus && <span className="save-status">{saveStatus}</span>}
          </div>
        </section>

        <details className="panel disclosure-panel">
          <summary>
            <span>
              <b>项目创建方式</b>
              <small>{activeMode.title} · {activeMode.status}</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <div className="mode-switch compact">
            {Object.entries(intakeModes).map(([id, mode]) => {
              const Icon = mode.icon;
              return (
                <button
                  className={intakeMode === id ? 'mode-option active' : 'mode-option'}
                  key={id}
                  onClick={() => setIntakeMode(id)}
                >
                  <Icon size={18} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mode-summary compact">
            <div className="mode-icon">
              <ModeIcon size={22} />
            </div>
            <div>
              <strong>{activeMode.title}</strong>
              <p>{activeMode.detail}</p>
            </div>
          </div>
          <div className="field-list compact">
            {activeMode.fields.map(([label, value]) => (
              <div className="field-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </details>

        <details className="panel disclosure-panel">
          <summary>
            <span>
              <b>参考图与标准流程</b>
              <small>查看产品参考图组、内部标准步骤</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <ReferencePanel projectForm={projectForm} />
          <div className="workflow-list compact">
            {workflowSteps.map(([number, title, detail]) => (
              <div className="workflow-step" key={title}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="right-column">
        <section className={productLockChanged ? 'panel product-lock-panel changed' : 'panel product-lock-panel'}>
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Current Product</p>
              <h3>当前产品</h3>
            </div>
            <span className="lock-label">
              <LockKeyhole size={14} />
              {productLockChanged ? '资料已变化' : '已锁定'}
            </span>
          </div>
          <div className="product-lock-summary">
            <div>
              <span>产品</span>
              <strong>{projectForm.productName || projectForm.projectName || '未命名产品'}</strong>
            </div>
            <div>
              <span>SKU</span>
              <strong>{projectForm.sku || '未填写'}</strong>
            </div>
            <div>
              <span>主图</span>
              <strong>{getReferenceImageName(projectForm) || '未上传'}</strong>
            </div>
          </div>
          <details className="mini-details">
            <summary>高级识别信息</summary>
            <small>{productLockValue}</small>
          </details>
          {productLockChanged && (
            <div className="planning-status warning">
              <MessageSquareWarning size={18} />
              <div>
                <strong>当前资料与已保存产品锁不同</strong>
                <p>重新生成卖点或图片方案时会清空旧方案和旧生图记录，避免混入其他产品。</p>
              </div>
            </div>
          )}
        </section>

        <details className="panel disclosure-panel">
          <summary>
            <span>
              <b>图片基础检测</b>
              <small>白底、尺寸、透明度等低频检查</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <ImageAuditPanel audit={projectForm.sourceImageAudit} nested />
        </details>

        <details className={`panel disclosure-panel ${highlightTarget === 'ledger-draft' ? 'focus-flash' : ''}`} ref={ledgerDraftRef}>
          <summary>
            <span>
              <b>当前卖点草稿统计</b>
              <small>{ledgerFacts.length} 条卖点 · {draftCounts.allowed} 条可进入设计</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <div className="draft-summary">
            <Metric label="可上图待确认" value={draftCounts.allowed} tone="green" />
            <Metric label="需证据" value={draftCounts.evidence} tone="orange" />
            <Metric label="待审核" value={draftCounts.review} />
            <Metric label="禁用" value={draftCounts.blocked} tone="red" />
          </div>
        </details>

        <details className="panel disclosure-panel">
          <summary>
            <span>
              <b>ERP / 证据 / 产品资料详情</b>
              <small>字段映射、内部资料和导出前证据项</small>
            </span>
            <ChevronRight size={17} />
          </summary>
        <section className="nested-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">ERP Mapping</p>
              <h3>SKU 卖点字段映射</h3>
            </div>
            <button className="text-button">
              字段映射
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mapping-list">
            {skuMappedFacts.map(([source, target, state]) => (
              <div className="mapping-row" key={source}>
                <span>{source}</span>
                <ChevronRight size={15} />
                <strong>{target}</strong>
                <b>{state}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="nested-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Product Brief</p>
              <h3>{intakeMode === 'sku' ? 'SKU 同步后的产品信息' : '手动录入产品信息'}</h3>
            </div>
            <span className="lock-label">
              <PackageCheck size={14} />
              {intakeMode === 'sku' ? 'erp draft' : 'manual draft'}
            </span>
          </div>
          <div className="info-grid">
            {projectFacts.map(([label, value]) => (
              <div className="info-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="nested-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Evidence</p>
              <h3>导出前需补齐</h3>
            </div>
          </div>
          <div className="audit-list">
            <div className="audit-row">
              <div className="audit-icon warn">
                <Clock3 size={18} />
              </div>
              <div>
                <strong>CPSC Certified 证书文件</strong>
                <p>目前文案可进入方案，但最终导出前应上传证书或检测报告编号。</p>
              </div>
            </div>
            <div className="audit-row">
              <div className="audit-icon warn">
                <Clock3 size={18} />
              </div>
              <div>
                <strong>150 lb 承重证据</strong>
                <p>建议绑定说明书、测试报告或供应商确认记录，方便后续复盘。</p>
              </div>
            </div>
          </div>
        </section>
        </details>
      </div>
    </section>
  );
}

function EditableFactLedgerPanel({ ledgerFacts = facts, onUpdateFact }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [draftClaim, setDraftClaim] = useState('');

  const startEdit = (index, claim) => {
    setEditingIndex(index);
    setDraftClaim(claim || '');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraftClaim('');
  };

  const saveEdit = (index) => {
    const nextClaim = draftClaim.trim();
    if (!nextClaim) return;
    onUpdateFact(index, nextClaim);
    cancelEdit();
  };

  return (
    <section className="panel ledger-editor-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Claims</p>
          <h3>卖点编辑表</h3>
        </div>
      </div>
      <div className="ledger-edit-list">
        {ledgerFacts.length ? ledgerFacts.map((fact, index) => {
          const isEditing = editingIndex === index;
          return (
            <div className="ledger-edit-row" key={`${fact.claim}-${index}`}>
              {isEditing ? (
                <>
                  <label className="ledger-edit-field">
                    <span>卖点内容</span>
                    <textarea value={draftClaim} onChange={(event) => setDraftClaim(event.target.value)} rows={3} />
                  </label>
                  <div className="ledger-edit-actions">
                    <button className="secondary-button" type="button" onClick={cancelEdit}>取消</button>
                    <button className="primary-button" type="button" disabled={!draftClaim.trim()} onClick={() => saveEdit(index)}>保存</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ledger-edit-copy">
                    <strong>{fact.claim}</strong>
                    <span>{fact.source || 'manual'} · {fact.confidence || 'medium'}</span>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => startEdit(index, fact.claim)}>
                    <PencilLine size={16} />
                    编辑
                  </button>
                </>
              )}
            </div>
          );
        }) : (
          <div className="ledger-empty-state">
            <ClipboardCheck size={22} />
            <strong>还没有卖点</strong>
            <p>先回到项目资料生成或输入卖点，再来这里手动调整。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function LedgerPage({ ledgerFacts, onUpdateFact, focusRequest }) {
  return (
    <section className="page-grid ledger-page">
      <FocusFrame active={getFocusSignal(focusRequest, 'ledger')} className="left-column">
        <EditableFactLedgerPanel ledgerFacts={ledgerFacts} onUpdateFact={onUpdateFact} />
      </FocusFrame>
      <div className="right-column">
        <section className="panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Rules</p>
              <h3>上图文案规则</h3>
            </div>
          </div>
          <div className="rule-board">
            <div>
              <Check size={18} />
              <strong>允许</strong>
              <p>材质、折叠、承重、CPSC Certified、适用年龄、已确认尺寸和包装配件。</p>
            </div>
            <div>
              <X size={18} />
              <strong>禁止</strong>
              <p>防跌、防倾倒、可调节高度、竞品比较第一、安全承诺和未验证认证。</p>
            </div>
            <div>
              <MessageSquareWarning size={18} />
              <strong>需人工复核</strong>
              <p>生活场景、儿童姿势、产品比例、厨房台面关系和任何接近安全承诺的表达。</p>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Audit Trail</p>
              <h3>后续要做成可追溯</h3>
            </div>
          </div>
          <div className="timeline-list">
            <div><span>运营</span><strong>确认基础卖点</strong><p>创建或修改 Ledger 条目。</p></div>
            <div><span>审核</span><strong>标记 allowed / blocked</strong><p>阻止提示词绕过台账。</p></div>
            <div><span>设计</span><strong>绑定到图槽</strong><p>每张图只读取对应卖点。</p></div>
          </div>
        </section>
      </div>
    </section>
  );
}

function BrandLibraryPage({ brandLibrary, onUpdateBrands, focusRequest }) {
  const [selectedBrandId, setSelectedBrandId] = useState(brandLibrary.find((brand) => brand.id !== 'none')?.id || 'none');
  const [deleteChallenge, setDeleteChallenge] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const selectedBrand = getBrandProfile(selectedBrandId, brandLibrary);
  const editable = selectedBrand.id !== 'none';
  const brandColorTotal = getBrandColorRatioTotal(selectedBrand.colors);

  useEffect(() => {
    if (!brandLibrary.some((brand) => brand.id === selectedBrandId)) {
      setSelectedBrandId(brandLibrary.find((brand) => brand.id !== 'none')?.id || 'none');
    }
  }, [brandLibrary, selectedBrandId]);

  useEffect(() => {
    setDeleteChallenge('');
    setDeleteConfirmText('');
  }, [selectedBrandId]);

  const updateBrand = (patch) => {
    if (!editable) return;
    onUpdateBrands(brandLibrary.map((brand) => (
      brand.id === selectedBrand.id ? normalizeBrandProfile({ ...brand, ...patch }) : brand
    )));
  };
  const addBrand = () => {
    const nextBrand = normalizeBrandProfile({
      id: `brand-${Date.now()}`,
      name: 'New Brand',
      tone: '真实、清晰、产品优先的 Amazon 电商风格',
      colors: [
        { hex: '#FFFFFF', ratio: 60 },
        { hex: '#8A8F8B', ratio: 40 }
      ],
      backgroundPolicy: '02-07 可使用品牌色块或真实使用场景；01 白底主图不使用。',
      scenes: ['real product use scene'],
      forbiddenStyles: ['cheap promotion', 'cartoon style'],
      logoPolicy: 'Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示 Logo。',
      styleRules: ['clean layout', 'realistic lighting']
    });
    onUpdateBrands([...brandLibrary, nextBrand]);
    setSelectedBrandId(nextBrand.id);
  };
  const resetBrands = () => {
    onUpdateBrands(normalizeBrandLibrary(defaultBrandLibrary));
    setSelectedBrandId('cosyland');
  };
  const uploadLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file || !editable) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateBrand({ logoPreview: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
  };
  const updateBrandColor = (index, patch) => {
    const nextColors = selectedBrand.colors.map((color, colorIndex) => (
      colorIndex === index ? normalizeBrandColorEntry({ ...color, ...patch }, colorIndex, color.ratio) : color
    )).filter(Boolean);
    updateBrand({ colors: nextColors });
  };
  const addBrandColor = () => {
    updateBrand({
      colors: [
        ...selectedBrand.colors,
        { id: `color-${Date.now()}`, hex: '#FFFFFF', ratio: 10 }
      ]
    });
  };
  const removeBrandColor = (index) => {
    updateBrand({ colors: selectedBrand.colors.filter((_, colorIndex) => colorIndex !== index) });
  };
  const startDeleteBrand = () => {
    if (!editable) return;
    setDeleteChallenge(createDeleteChallengeText());
    setDeleteConfirmText('');
  };
  const cancelDeleteBrand = () => {
    setDeleteChallenge('');
    setDeleteConfirmText('');
  };
  const deleteSelectedBrand = () => {
    if (!editable || !deleteChallenge || deleteConfirmText !== deleteChallenge) return;
    const nextBrands = brandLibrary.filter((brand) => brand.id !== selectedBrand.id);
    const nextSelected = nextBrands.find((brand) => brand.id !== 'none')?.id || 'none';
    onUpdateBrands(nextBrands);
    setSelectedBrandId(nextSelected);
    setDeleteChallenge('');
    setDeleteConfirmText('');
  };

  return (
    <section className="page-grid">
      <FocusFrame active={getFocusSignal(focusRequest, 'brands')} className="left-column">
        <section className="panel brand-library-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Brand Library</p>
              <h3>品牌库</h3>
            </div>
            <button className="secondary-button" onClick={addBrand}>
              <Plus size={16} />
              新增品牌
            </button>
          </div>
          <div className="brand-card-list">
            {brandLibrary.map((brand) => (
              <button
                className={selectedBrand.id === brand.id ? 'brand-card active' : 'brand-card'}
                key={brand.id}
                onClick={() => setSelectedBrandId(brand.id)}
              >
                <span className="brand-logo-chip">
                  {brand.logoPreview ? <img src={brand.logoPreview} alt="" /> : <Palette size={18} />}
                </span>
                <span>
                  <strong>{brand.name}</strong>
                  <small>{brand.tone}</small>
                  {brand.colors.length > 0 && (
                    <em className="brand-color-strip">
                      {brand.colors.slice(0, 5).map((color, index) => (
                        <i key={`${brand.id}-${color.hex}-${index}`} style={{ background: color.hex }} />
                      ))}
                    </em>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      </FocusFrame>

      <div className="right-column">
        <section className="panel brand-editor-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Brand Rules</p>
              <h3>{selectedBrand.name}</h3>
            </div>
            <div className="brand-header-actions">
              <button className="text-button" onClick={resetBrands}>恢复默认品牌库</button>
              {editable && (
                <button className="text-button danger" onClick={startDeleteBrand}>
                  <Trash2 size={15} />
                  删除品牌
                </button>
              )}
            </div>
          </div>
          {!editable && (
            <div className="planning-status">
              <LockKeyhole size={18} />
              <div>
                <strong>不指定品牌</strong>
                <p>这个选项用于基线验证，不配置 Logo、品牌色或场景策略。</p>
              </div>
            </div>
          )}
          <div className="brand-form">
            <label>
              <span>品牌名</span>
              <input disabled={!editable} value={selectedBrand.name} onChange={(event) => updateBrand({ name: event.target.value })} />
            </label>
            <label>
              <span>视觉语气</span>
              <input disabled={!editable} value={selectedBrand.tone} onChange={(event) => updateBrand({ tone: event.target.value })} />
            </label>
            <div className="brand-color-editor">
              <div className="brand-color-editor-head">
                <span>品牌色</span>
                <strong className={brandColorTotal === 100 ? 'ok' : 'warn'}>使用比例合计 {brandColorTotal}%</strong>
              </div>
              <div className="brand-color-rows">
                {selectedBrand.colors.map((color, index) => (
                  <div className="brand-color-row" key={color.id || `${color.hex}-${index}`}>
                    <input
                      aria-label="品牌色号"
                      disabled={!editable}
                      type="color"
                      value={color.hex}
                      onChange={(event) => updateBrandColor(index, { hex: event.target.value })}
                    />
                    <input
                      aria-label="品牌色 HEX"
                      disabled={!editable}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      value={color.hex}
                      onChange={(event) => {
                        const nextHex = normalizeHexColor(event.target.value);
                        if (nextHex) updateBrandColor(index, { hex: nextHex });
                      }}
                    />
                    <input
                      aria-label="颜色使用比例"
                      disabled={!editable}
                      max="100"
                      min="1"
                      type="number"
                      value={color.ratio}
                      onChange={(event) => updateBrandColor(index, { ratio: event.target.value })}
                    />
                    <span>%</span>
                    <button className="icon-button" disabled={!editable || selectedBrand.colors.length <= 1} onClick={() => removeBrandColor(index)} type="button">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="brand-color-actions">
                <button className="secondary-button" disabled={!editable || selectedBrand.colors.length >= 8} onClick={addBrandColor} type="button">
                  <Plus size={15} />
                  添加色号
                </button>
                <p>只能使用 HEX 色号。建议比例合计为 100%，生图时会按这些色号和比例控制背景、色块、标签和图形元素。</p>
              </div>
            </div>
            <label>
              <span>常用真实场景</span>
              <textarea disabled={!editable} value={selectedBrand.scenes.join('\n')} onChange={(event) => updateBrand({ scenes: splitListText(event.target.value) })} />
            </label>
            <label className="full">
              <span>背景策略</span>
              <textarea disabled={!editable} value={selectedBrand.backgroundPolicy} onChange={(event) => updateBrand({ backgroundPolicy: event.target.value })} />
            </label>
            <label className="full">
              <span>禁用风格</span>
              <textarea disabled={!editable} value={selectedBrand.forbiddenStyles.join('\n')} onChange={(event) => updateBrand({ forbiddenStyles: splitListText(event.target.value) })} />
            </label>
            <label className="full">
              <span>Logo 使用策略</span>
              <textarea disabled value={selectedBrand.logoPolicy} />
            </label>
            <label className="full">
              <span>风格规则</span>
              <textarea disabled={!editable} value={selectedBrand.styleRules.join('\n')} onChange={(event) => updateBrand({ styleRules: splitListText(event.target.value) })} />
            </label>
          </div>
          {editable && deleteChallenge && (
            <div className="brand-delete-box">
              <div>
                <Trash2 size={18} />
                <span>
                  <strong>确认删除 {selectedBrand.name}</strong>
                  <small>请输入下面这串英文，完全一致后才能删除。</small>
                </span>
              </div>
              <code>{deleteChallenge}</code>
              <input
                aria-label="删除品牌确认文本"
                autoComplete="off"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value.trim())}
                placeholder="输入上方英文"
              />
              <div className="brand-delete-actions">
                <button className="secondary-button" onClick={cancelDeleteBrand} type="button">
                  取消
                </button>
                <button
                  className="secondary-button danger"
                  disabled={deleteConfirmText !== deleteChallenge}
                  onClick={deleteSelectedBrand}
                  type="button"
                >
                  <Trash2 size={15} />
                  确认删除
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Logo Asset</p>
              <h3>Logo 素材</h3>
            </div>
          </div>
          <div className="logo-upload-box">
            <div>
              {selectedBrand.logoPreview ? <img src={selectedBrand.logoPreview} alt={`${selectedBrand.name} logo`} /> : <Palette size={38} />}
            </div>
            <span>
              <strong>{selectedBrand.logoPreview ? 'Logo 已上传' : '尚未上传 Logo'}</strong>
              <small>Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示。</small>
            </span>
            <label className={editable ? 'secondary-button upload-button' : 'secondary-button upload-button disabled'} htmlFor="brand-logo-upload">
              <Upload size={16} />
              上传 Logo
            </label>
            <input id="brand-logo-upload" type="file" accept="image/*" disabled={!editable} onChange={uploadLogo} />
          </div>
        </section>
      </div>
    </section>
  );
}

function StoryboardPage({
  selectedSlot,
  setSelectedSlot,
  activeTab,
  setActiveTab,
  ledgerFacts,
  projectForm,
  storyboardBriefs,
  reviewDecisions,
  onChangePlanOutputPreset,
  isPlanningStoryboard,
  regeneratingSlotId,
  onUpdateReview,
  onGenerateStoryboardBriefs,
  onRegenerateStoryboardSlot,
  onGoGeneration,
  onManageLedger,
  focusRequest
}) {
  const activeSlots = useMemo(() => getActiveSlots(storyboardBriefs), [storyboardBriefs]);
  const selectedBrief = storyboardBriefs.find((brief) => brief.id === selectedSlot.id);
  const selectedDecision = getReviewDecision(reviewDecisions, selectedSlot.id, storyboardBriefs);
  const storyboardPreviewImage = getReferenceImage(projectForm);
  const storyboardPreviewName = getReferenceImageName(projectForm);
  const selectedClaims = getStoryboardClaims(selectedSlot, selectedBrief);
  const selectedChecks = getStoryboardChecks(selectedBrief);
  const selectedPlanPreset = getProjectPlanOutputPreset(projectForm);

  return (
    <section className="main-grid">
      <div className="left-column">
        <section className="panel focus-summary-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Project Focus</p>
              <h3>{projectForm.productName || projectForm.projectName || '当前产品'}</h3>
            </div>
            <span className="lock-label">
              <LockKeyhole size={14} />
              产品已锁定
            </span>
          </div>
          <div className="focus-product-card">
            <img src={storyboardPreviewImage} alt="Product reference" />
            <div>
              <strong>{storyboardPreviewName}</strong>
              <p>当前只检查 7 张图分别要表达什么；真实视觉效果在生图任务中判断。</p>
              <div className="mini-stat-row">
                <span>{ledgerFacts.length} 个卖点</span>
                <span>{storyboardBriefs.length || 0}/7 图方案</span>
              </div>
            </div>
          </div>
        </section>
        <details className="panel disclosure-panel">
          <summary>
            <span>
              <b>产品参考图</b>
              <small>查看已上传的产品图和生成规则</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <ReferencePanel projectForm={projectForm} />
        </details>
        <details className="panel disclosure-panel">
          <summary>
            <span>
              <b>卖点详情</b>
              <small>按需查看卖点来源、状态和禁用表达</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <FactLedgerPanel compact ledgerFacts={ledgerFacts} onManage={onManageLedger} showStatus={false} />
        </details>
      </div>

      <div className="right-column">
        <FocusFrame active={getFocusSignal(focusRequest, 'storyboard')}>
        <section className="panel storyboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Plan</p>
              <h3>确认 7 张{selectedPlanPreset.label}方向</h3>
            </div>
            <button
              aria-busy={isPlanningStoryboard || Boolean(regeneratingSlotId)}
              className="secondary-button"
              disabled={isPlanningStoryboard || Boolean(regeneratingSlotId)}
              onClick={onGenerateStoryboardBriefs}
            >
              {isPlanningStoryboard ? <RefreshCcw className="spin-icon" size={17} /> : <Sparkles size={17} />}
              {isPlanningStoryboard
                ? 'AI 生成中...'
                : !ledgerFacts.length
                ? '先确认卖点'
                : storyboardBriefs.length
                  ? '重新生成整套方案'
                  : '生成 7 图方案'}
            </button>
            <div className="segmented">
              {[
                ['storyboard', '方案'],
                ['audit', '确认'],
                ['export', '导出条件']
              ].map(([id, label]) => (
                <button
                  className={activeTab === id ? 'active' : ''}
                  key={id}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="plan-output-selector">
            <div>
              <span>方案类型</span>
              <strong>{selectedPlanPreset.label} · {selectedPlanPreset.size}</strong>
              <p>{selectedPlanPreset.id === 'aplus'
                ? 'A+ 会按内容模块规划：不强制白底，标题按版式摆放，可组合相关可用卖点。'
                : '主图会按标准 Listing 规划：第 1 张白底主图，其余图片统一风格和标题规则。'}</p>
            </div>
            <div className="output-mode compact">
              {outputPresets.map((preset) => (
                <button
                  className={selectedPlanPreset.id === preset.id ? 'active' : ''}
                  disabled={isPlanningStoryboard || Boolean(regeneratingSlotId)}
                  key={preset.id}
                  onClick={() => onChangePlanOutputPreset(preset.id)}
                  type="button"
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.size}</span>
                </button>
              ))}
            </div>
          </div>

          {isPlanningStoryboard && (
            <div className="planning-status">
              <RefreshCcw className="spin-icon" size={18} />
              <div>
                <strong>正在生成 7 张图片方案</strong>
                <p>AI 正在读取产品图、已确认卖点和品牌风格，并为这个产品选择合适的图片角色。</p>
              </div>
            </div>
          )}

          {regeneratingSlotId && (
            <div className="planning-status">
              <RefreshCcw className="spin-icon" size={18} />
              <div>
                <strong>正在重生成第 {String(regeneratingSlotId).padStart(2, '0')} 张图方案</strong>
                <p>系统只替换当前图槽的图片角色、卖点和画面证明方式，其他 6 张方案保持不变。</p>
              </div>
            </div>
          )}

          {storyboardBriefs.length === STORYBOARD_SLOT_COUNT && (
            <div className="inline-next-step">
              <div>
                <Check size={18} />
                <span>
                  <strong>7 张图片方向已生成</strong>
                  <small>这里先检查每张图要表达什么，不评估最终视觉效果；确认后进入生图任务。</small>
                </span>
              </div>
              <button className="primary-button" onClick={onGoGeneration}>
                <Sparkles size={16} />
                下一步：生图任务
              </button>
            </div>
          )}

          {activeTab === 'storyboard' && (
            <>
              <div className="slot-grid">
                {activeSlots.map((slot) => {
                  const brief = storyboardBriefs.find((item) => item.id === slot.id);
                  return (
                    <button
                      className={selectedSlot.id === slot.id ? 'slot-card active' : 'slot-card'}
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <div className="slot-card-head">
                        <span>{String(slot.id).padStart(2, '0')}</span>
                        {storyboardBriefs.length
                          ? <ReviewStatusPill status={getReviewDecision(reviewDecisions, slot.id, storyboardBriefs)?.status} context="plan" />
                          : <StatusPill status={slot.status} />}
                      </div>
                      <div>
                        <strong>{brief?.title || slot.title}</strong>
                        <small>{brief ? brief.goal : storyboardPreviewName}</small>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="selected-detail">
                <div>
                  <div className="plan-stage-note">
                    <Layers size={16} />
                    <span>方案阶段：只确认图片角色、卖点和画面证明方式。</span>
                  </div>
                  <div className="detail-title">
                    <h4>{selectedBrief?.title || selectedSlot.title}</h4>
                    <ReviewStatusPill status={selectedDecision?.status} context="plan" />
                  </div>
                  <p>{selectedBrief?.goal || selectedSlot.goal}</p>
                  <p className="storyboard-reference-note">这是图片方案阶段：只确认每张图的方向、卖点和画面证明方式；真实视觉候选图会在生图任务中生成。</p>
                  <div className="chips">
                    {selectedClaims.length ? selectedClaims.map((claim) => (
                      <span key={claim}>{claim}</span>
                    )) : <span>等待卖点分配</span>}
                  </div>
                  <ul className="check-list">
                    {selectedChecks.map((check) => (
                      <li key={check}>
                        <Check size={15} />
                        {check}
                      </li>
                    ))}
                      </ul>
                    </div>
                  </div>
                  {selectedBrief ? (
                    <div className="brief-detail">
                      <div className="detail-title">
                        <h4>图槽方案</h4>
                        <BriefStatusPill status={selectedBrief.status} />
                      </div>
                      <p>{selectedBrief.composition}</p>
                      <div className="visual-proof-box">
                        <span>主卖点</span>
                        <strong>{selectedBrief.primaryClaim || '暂未分配主卖点'}</strong>
                        <span>画面证明方式</span>
                        <p>{selectedBrief.visualProof || '需要在生成方案中补充：这张图如何用画面证明卖点。'}</p>
                      </div>
                      <div className="brief-grid">
                        <div>
                          <span>可用卖点</span>
                          {selectedBrief.usableClaims.length ? selectedBrief.usableClaims.map((claim) => <strong key={claim}>{claim}</strong>) : <em>暂无</em>}
                        </div>
                        <div>
                          <span>需证据</span>
                          {selectedBrief.needsEvidence.length ? selectedBrief.needsEvidence.map((claim) => <strong key={claim}>{claim}</strong>) : <em>暂无</em>}
                        </div>
                        <div>
                          <span>禁用表达</span>
                          {selectedBrief.blockedClaims.length ? selectedBrief.blockedClaims.slice(0, 4).map((claim) => <strong key={claim}>{claim}</strong>) : <em>暂无</em>}
                        </div>
                      </div>
                      <div className="prompt-brief">
                        <span>生图提示词边界</span>
                        <p>{selectedBrief.promptBrief}</p>
                      </div>
                      <ReviewActions
                        decision={selectedDecision}
                        activeRole="human"
                        onUpdateReview={onUpdateReview}
                        context="plan"
                        onRegenerateSlot={onRegenerateStoryboardSlot}
                        isRegenerating={regeneratingSlotId === selectedDecision?.slotId}
                      />
                    </div>
                  ) : (
                    <div className="brief-empty">
                      <Sparkles size={22} />
                      <strong>还没有 7 图方案</strong>
                      <p>先根据产品和卖点生成每张图的目的、卖点、画面证明方式和禁用边界，再进入生图任务。</p>
                    </div>
                  )}
                </>
              )}

          {activeTab === 'audit' && (
            <div className="audit-list">
              {activeSlots.map((slot) => {
                const decision = getReviewDecision(reviewDecisions, slot.id, storyboardBriefs);
                const brief = storyboardBriefs.find((item) => item.id === slot.id);
                return (
                <div className="audit-row actionable" key={slot.id}>
                  <div className={decision.status === 'approved' ? 'audit-icon pass' : 'audit-icon warn'}>
                    {decision.status === 'approved' ? <ShieldCheck size={18} /> : <MessageSquareWarning size={18} />}
                  </div>
                  <div>
                    <strong>{String(slot.id).padStart(2, '0')} · {slot.title}</strong>
                    <p>{decision.note || getDefaultReviewNote(decision.status, brief)}</p>
                  </div>
                  <ReviewStatusPill status={decision.status} />
                </div>
                );
              })}
            </div>
          )}

          {activeTab === 'export' && (
            <ExportGate reviewDecisions={reviewDecisions} storyboardBriefs={storyboardBriefs} compact />
          )}
        </section>
        </FocusFrame>

        <TaskListPanel storyboardBriefs={storyboardBriefs} />
      </div>
    </section>
  );
}

function ExportGate({ reviewDecisions, storyboardBriefs, compact = false }) {
  const activeSlots = getActiveSlots(storyboardBriefs);
  const slotTotal = activeSlots.length || STORYBOARD_SLOT_COUNT;
  const decisions = activeSlots.map((slot) => getReviewDecision(reviewDecisions, slot.id, storyboardBriefs));
  const approved = decisions.filter(isDecisionFullyApproved).length;
  const rework = decisions.filter((decision) => decision.status === 'rework').length;
  const blocked = decisions.filter((decision) => decision.status === 'blocked').length;
  const exportReady = approved === slotTotal && storyboardBriefs.length === STORYBOARD_SLOT_COUNT;
  const incomplete = slotTotal - approved;
  const nextMissing = decisions.find((decision) => !isDecisionFullyApproved(decision));

  return (
    <div className={compact ? 'export-panel compact-export' : 'export-panel'}>
      <Archive size={42} />
      <h4>{exportReady ? '可以导出最终图片包' : `导出前还有 ${incomplete} 张图未人工通过`}</h4>
      <p>
        {exportReady
          ? '系统会一起导出图片包、brief 快照、Ledger 和 QA 审核记录。'
          : nextMissing
            ? `下一项：${String(nextMissing.slotId).padStart(2, '0')} · ${getDualReviewMissingText(nextMissing)}。全部图片人工通过后才开放最终导出。`
            : `需返工 ${rework} 张，禁止导出 ${blocked} 张。全部图片人工通过后才开放最终导出。`}
      </p>
      <div className="export-status-grid">
        <span><strong>{approved}/{slotTotal}</strong> 人工通过</span>
        <span><strong>{rework}</strong> 需返工</span>
        <span><strong>{blocked}</strong> 禁止导出</span>
      </div>
      <button className={exportReady ? 'primary-button' : 'secondary-button'} disabled={!exportReady}>
        <Download size={17} />
        {exportReady ? '导出最终包' : '等待人工审核'}
      </button>
    </div>
  );
}

function QualityReportPanel({ generationRuns, storyboardBriefs, onExportQualityCsv, onImportQualityCsv }) {
  const activeSlots = getActiveSlots(storyboardBriefs);
  const overview = getQualityReportOverview(generationRuns, { slots: activeSlots });
  const rows = getQualityReportRows(generationRuns, { slots: activeSlots });
  const importInputId = 'quality-csv-import';
  return (
    <section className="panel quality-report-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Quality Samples</p>
          <h3>质量样本表</h3>
        </div>
        <div className="panel-actions">
          <label className="secondary-button upload-button" htmlFor={importInputId}>
            <Database size={15} />
            导入 CSV
          </label>
          <input
            className="file-input"
            id={importInputId}
            type="file"
            accept=".csv,text/csv"
            onChange={onImportQualityCsv}
          />
          <button className="secondary-button" disabled={!overview.total} onClick={onExportQualityCsv}>
            <Download size={15} />
            导出 CSV
          </button>
        </div>
      </div>
      <div className="quality-report-scope">
        <ShieldCheck size={16} />
        <span>统计范围：不指定品牌风格 + 主图尺寸 2000 x 2000。品牌模式和 A+ 暂不进入质量样本统计。</span>
      </div>
      <div className="quality-report-summary">
        <Metric label="基线样本" value={`${overview.total}/${overview.target}`} />
        <Metric label="已判断" value={`${overview.reviewed}/${overview.total || 0}`} />
        <Metric label="人工可用率" value={overview.reviewed ? `${overview.usableRate}%` : '-'} tone="good" />
        <Metric label="AI/人工一致" value={overview.comparable ? `${overview.agreementRate}%` : '-'} />
      </div>
      <div className="quality-report-table">
        <div className="quality-report-head">
          <span>图槽</span>
          <span>样本</span>
          <span>人工</span>
          <span>AI</span>
          <span>问题</span>
          <span>下一轮动作</span>
        </div>
        {rows.map((row) => (
          <div className="quality-report-row" key={row.slot.id}>
            <div>
              <strong>{String(row.slot.id).padStart(2, '0')} · {row.slot.title}</strong>
              <p>{row.targetMet ? '已达到单槽样本线' : `还差 ${row.remaining} 张到样本线`}</p>
            </div>
            <div>
              <strong>{row.stats.total}/{row.target}</strong>
              <p>{row.aiReviewed} 张已 AI 预审</p>
            </div>
            <div>
              <strong>{row.stats.reviewed ? `${row.stats.usableRate}%` : '-'}</strong>
              <p>{row.stats.usable} 可用 / {row.stats.needsFix + row.stats.rejected} 问题</p>
            </div>
            <div>
              <strong>{row.aiReviewed}</strong>
              <p>{row.comparable ? `${row.agreementRate}% 一致` : '待对比'}</p>
            </div>
            <div>
              {row.topReasons.length
                ? row.topReasons.map((reason) => <span key={reason}>{reason}</span>)
                : <em>暂无</em>}
            </div>
            <div>
              <p>{row.nextAction}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="panel-note">阶段目标：每个图槽先积累 20 张候选图，人工标记后再讨论品牌风格、A+ 和自动重试。</p>
    </section>
  );
}

function PromptTuningPanel({
  slot,
  generationRuns,
  promptOverride,
  onUpdatePromptOverride
}) {
  const suggestions = getPromptTuningSuggestions(generationRuns, slot.id);
  return (
    <section className="panel prompt-tuning-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Prompt Tuning</p>
          <h3>图槽提示词调优</h3>
        </div>
        <span className="lock-label">
          <PencilLine size={14} />
          {promptOverride ? '已应用' : '待积累'}
        </span>
      </div>
      <div className="prompt-tuning-body">
        <div className="prompt-tuning-current">
          <span>当前图槽附加规则</span>
          {promptOverride ? (
            <>
              <p>{promptOverride}</p>
              <button className="text-button" onClick={() => onUpdatePromptOverride(slot.id, '')}>清空本图槽规则</button>
            </>
          ) : (
            <p>还没有附加调优规则。先让系统根据失败原因推荐，或继续积累更多候选图。</p>
          )}
        </div>
        <div className="prompt-suggestion-list">
          {suggestions.length ? suggestions.map((suggestion) => (
            <div className="prompt-suggestion" key={suggestion.id}>
              <div>
                <span>{suggestion.title} · {suggestion.score}</span>
                <p>{suggestion.text}</p>
              </div>
              <button
                className="secondary-button"
                onClick={() => onUpdatePromptOverride(slot.id, mergePromptOverride(promptOverride, suggestion.text))}
              >
                <Plus size={15} />
                加入
              </button>
            </div>
          )) : (
            <div className="prompt-tuning-empty">
              <Sparkles size={18} />
              <p>还没有足够失败信号。批量跑一轮并标记人工结果后，这里会出现调优建议。</p>
            </div>
          )}
        </div>
      </div>
      <p className="panel-note">调优规则只影响当前图槽，下次单张生成或批量验证都会带上这些约束。</p>
    </section>
  );
}

function getGenerationErrorMessage(error) {
  const raw = error instanceof Error ? error.message : String(error || '生成或预审失败');
  if (/monthly spending cap/i.test(raw)) {
    return 'Gemini 项目已超过 monthly spending cap。需要到 Google AI Studio 调整 spend cap，或更换可用 API Key 后再生成。';
  }
  if (/quota|rate limit|too many requests/i.test(raw)) {
    return '模型接口额度或频率受限，请稍后重试，或更换可用 API Key。';
  }
  if (/API key|GEMINI_API_KEY|OPENAI_API_KEY/i.test(raw)) {
    return 'API Key 不可用或未配置，请检查本地 .env.local。';
  }
  if (/load failed|failed to fetch|networkerror|request body is too large/i.test(raw)) {
    return '预审请求网络中断。系统会保留已生成图片，请稍后重试 AI 预审或直接人工判断。';
  }
  if (/did not return an image|没有返回图片|text only/i.test(raw)) {
    return 'Gemini 本次没有返回图片。请重新生成当前图槽，或稍后再试。';
  }
  return raw;
}

function summarizeBatchGenerationResult(completedCount, totalCount, failedMessages, label = '生成') {
  if (!failedMessages.length) {
    return `${label}完成：成功 ${completedCount}/${totalCount} 张。请逐张判断是否可用。`;
  }
  const firstReason = failedMessages[0];
  if (completedCount === 0) {
    return `${label}失败：成功 0/${totalCount} 张。原因：${firstReason}`;
  }
  return `${label}完成：成功 ${completedCount}/${totalCount} 张，失败 ${failedMessages.length} 张。第一条失败原因：${firstReason}`;
}

function QualityConsolePage({
  projectForm,
  storyboardBriefs,
  generationRuns,
  selectedSlot,
  promptOverrides,
  onSaveGenerationRuns,
  onUpdatePromptOverride,
  focusRequest
}) {
  const [qualityStatus, setQualityStatus] = useState('');
  const selectedPromptOverride = promptOverrides?.[selectedSlot.id] || '';

  const exportQualityCsv = async () => {
    const csv = `\uFEFF${buildQualityCsv(generationRuns)}`;
    const projectName = (projectForm.projectName || projectForm.productName || 'listingflow')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'listingflow';
    const filename = `${projectName}-quality-baseline.csv`;
    try {
      const result = await saveTextExportToApi({
        filename,
        content: csv,
        mimeType: 'text/csv;charset=utf-8'
      });
      setQualityStatus(`CSV 已保存：${result.filePath}`);
    } catch (error) {
      downloadTextFile(filename, csv);
      setQualityStatus(error instanceof Error
        ? `本地保存失败，已尝试浏览器下载：${error.message}`
        : '本地保存失败，已尝试浏览器下载。');
    }
  };

  const importQualityCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const importedRuns = parseQualityCsvToRuns(text);
      if (!importedRuns.length) {
        setQualityStatus('没有识别到可导入的质量 CSV 记录。');
        return;
      }
      onSaveGenerationRuns(importedRuns);
      const importedStats = getGenerationQualityStats(importedRuns);
      setQualityStatus(`已导入 ${importedRuns.length} 条记录，其中 ${importedStats.reviewed} 条已有人工判断；旧图片不会随 CSV 恢复。`);
    } catch (error) {
      setQualityStatus(error instanceof Error
        ? `CSV 导入失败：${error.message}`
        : 'CSV 导入失败，请确认文件来自质量样本导出。');
    }
  };

  return (
    <section className="quality-console-page">
      <FocusFrame active={getFocusSignal(focusRequest, 'quality')}>
        <section className="panel quality-console-hero">
          <div>
            <p className="eyebrow">Quality Console</p>
            <h3>质量后台</h3>
            <p>这里放统计、CSV 和提示词调优；日常生成图片时不用看这些后台数据。</p>
          </div>
          {qualityStatus && <span className="save-status">{qualityStatus}</span>}
        </section>
      </FocusFrame>

      <section className="quality-console-grid">
        <section className="panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Quality Log</p>
              <h3>失败原因排行</h3>
            </div>
          </div>
          <div className="reason-leaderboard">
            {generationFailureReasons.map((reason) => {
              const count = generationRuns.filter((run) => run.reasons.includes(reason.id)).length;
              return (
                <div key={reason.id}>
                  <span>{reason.label}</span>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
          <p className="panel-note">当某类原因持续出现，就优先调整对应图槽的提示词或补充参考图。</p>
        </section>

        <section className="panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Validation Rule</p>
              <h3>质量基线规则</h3>
            </div>
          </div>
          <div className="workflow-list">
            <div className="workflow-step">
              <span>1</span>
              <div><strong>先跑真实 API</strong><p>目标是统计候选图可用率，不再继续空转审核流程。</p></div>
            </div>
            <div className="workflow-step">
              <span>2</span>
              <div><strong>产品不变优先</strong><p>任何结构漂移、比例离谱、配件凭空增加的图都标废。</p></div>
            </div>
            <div className="workflow-step">
              <span>3</span>
              <div><strong>先拿基线数字</strong><p>每个图槽先积累 20 张，再决定是否解冻品牌风格和 A+。</p></div>
            </div>
          </div>
        </section>
      </section>

      <QualityReportPanel
        generationRuns={generationRuns}
        storyboardBriefs={storyboardBriefs}
        onExportQualityCsv={exportQualityCsv}
        onImportQualityCsv={importQualityCsv}
      />

      <PromptTuningPanel
        slot={selectedSlot}
        generationRuns={generationRuns}
        promptOverride={selectedPromptOverride}
        onUpdatePromptOverride={onUpdatePromptOverride}
      />
    </section>
  );
}

function GenerationPage({
  projectForm,
  storyboardBriefs,
  selectedSlot,
  setSelectedSlot,
  generationRuns,
  promptOverrides,
  brandLibrary,
  onSaveGenerationRun,
  onSaveGenerationRuns,
  onUpdateGenerationRun,
  onUpdatePromptOverride,
  onGoReview,
  focusRequest
}) {
  const [activeRunId, setActiveRunId] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchMode, setBatchMode] = useState('current-5');
  const [batchLog, setBatchLog] = useState([]);
  const [generationMode, setGenerationMode] = useState('single-multi');
  const [singleBatchCount, setSingleBatchCount] = useState(3);
  const plannedOutputPresetId = getProjectPlanOutputPresetId(projectForm);
  const [outputPresetId, setOutputPresetId] = useState(plannedOutputPresetId);
  const [baselineMode, setBaselineMode] = useState(true);
  const [autoAdvanceReview, setAutoAdvanceReview] = useState(true);
  const [gptComparisonPrompt, setGptComparisonPrompt] = useState('');
  const outputPreset = outputPresets.find((preset) => preset.id === outputPresetId) || outputPresets[0];
  const activeSlots = useMemo(() => getActiveSlots(storyboardBriefs), [storyboardBriefs]);
  const selectedBrief = storyboardBriefs.find((brief) => brief.id === selectedSlot.id);
  const selectedPromptOverride = promptOverrides?.[selectedSlot.id] || '';
  const prompt = selectedBrief ? buildGenerationPrompt(selectedBrief, selectedSlot, outputPreset, {
    baselineMode,
    promptOverride: selectedPromptOverride,
    brandLibrary
  }) : '';
  const generationPreviewImage = getReferenceImage(projectForm);
  const generationReferences = getGenerationReferenceItems(projectForm, selectedSlot.id, outputPreset.id, selectedBrief?.visualType);
  const canGenerate = Boolean(selectedBrief && getReferenceImage(projectForm));
  const slotRuns = useMemo(
    () => normalizeGenerationRuns(generationRuns.filter((run) => run.slotId === selectedSlot.id)),
    [generationRuns, selectedSlot.id]
  );
  const activeCandidate = generationRuns.find((run) => run.id === activeRunId) || slotRuns[0];
  const activeCandidateSlot = activeSlots.find((slot) => slot.id === activeCandidate?.slotId) || selectedSlot;
  const activeCandidateBrief = storyboardBriefs.find((brief) => brief.id === activeCandidateSlot.id) || selectedBrief;
  const activeCandidatePreset = activeCandidate ? getOutputPresetById(activeCandidate.outputPresetId) : outputPreset;
  const activeReasonSuggestions = activeCandidate
    ? getPromptTuningSuggestionsForReasons(activeCandidate.reasons)
    : [];
  const qualityRuns = getQualityScopeRuns(generationRuns);
  const unreviewedQualityRuns = qualityRuns.filter((run) => run.verdict === 'unreviewed');
  const visibleQueueRuns = unreviewedQualityRuns.slice(0, 8);
  const projectQuality = getGenerationQualityStats(qualityRuns);
  const slotQuality = getSlotQualitySummary(qualityRuns, selectedSlot.id);
  const approvedSlotRuns = activeSlots
    .map((slot) => ({ slot, run: getBestRunForSlot(slot.id, generationRuns) }))
    .filter((item) => item.run?.verdict === 'usable');
  const generationReadyForReview = activeSlots.length > 0
    && storyboardBriefs.length === STORYBOARD_SLOT_COUNT
    && approvedSlotRuns.length === activeSlots.length;
  const missingApprovedSlots = Math.max(0, activeSlots.length - approvedSlotRuns.length);
  const generationButtonLabel = isGenerating || isBatchRunning
    ? '生成中...'
    : generationMode === 'all-one'
      ? '各卖点各生成一张'
      : singleBatchCount > 1
        ? `当前卖点生成 ${singleBatchCount} 张`
        : '生成候选图';
  const batchProgress = useMemo(() => {
    const total = batchLog.length;
    const done = batchLog.filter((item) => item.status === 'done').length;
    const failed = batchLog.filter((item) => item.status === 'failed').length;
    const running = batchLog.find((item) => item.status === 'running');
    return { total, done, failed, running };
  }, [batchLog]);
  const generationStatusLooksLikeProgress = /生成|候选图|预审|Gemini|模型接口|API Key|额度|spending cap|quota|rate limit/i.test(generationStatus);
  const showGenerationProgress = isGenerating || isAiReviewing || isBatchRunning || batchLog.length > 0 || generationStatusLooksLikeProgress;
  const singleProgressStatus = /失败|不可用|额度|spending cap|quota|rate limit/i.test(generationStatus)
    ? 'failed'
    : isGenerating || isAiReviewing
      ? 'running'
      : 'done';
  const generationStageLabel = isBatchRunning
    ? batchProgress.running?.message || '生成中'
    : isGenerating
      ? '生成中'
      : isAiReviewing
        ? 'AI 预审中'
        : batchLog.length
          ? '最近一次结果'
          : /失败|不可用|额度|spending cap|quota|rate limit/i.test(generationStatus)
            ? '生成失败'
            : generationStatusLooksLikeProgress
              ? '最近一次结果'
          : '';
  const generationStatusClass = [
    'generation-status',
    /失败|不可用|额度|spending cap|quota|rate limit/i.test(generationStatus)
      ? 'error'
      : activeCandidate
        ? 'success'
        : ''
  ].filter(Boolean).join(' ');

  useEffect(() => {
    setOutputPresetId(plannedOutputPresetId);
  }, [plannedOutputPresetId]);

  useEffect(() => {
    const activeRunBelongsToSlot = slotRuns.some((run) => run.id === activeRunId);
    if (!activeRunBelongsToSlot) {
      setActiveRunId(slotRuns[0]?.id || '');
    }
  }, [selectedSlot.id, slotRuns, activeRunId]);

  useEffect(() => {
    if (!activeSlots.some((slot) => slot.id === selectedSlot.id) && activeSlots[0]) {
      setSelectedSlot(activeSlots[0]);
    }
  }, [activeSlots, selectedSlot.id, setSelectedSlot]);

  const selectQualityRun = (run, message = '') => {
    const runSlot = activeSlots.find((slot) => slot.id === run.slotId);
    if (runSlot) setSelectedSlot(runSlot);
    setActiveRunId(run.id);
    if (message) setGenerationStatus(message);
  };

  const selectNextUnreviewedRun = (afterRunId = activeRunId) => {
    if (!unreviewedQualityRuns.length) {
      setGenerationStatus('当前没有待判断的质量样本，可以继续批量生成。');
      return;
    }
    const currentIndex = unreviewedQualityRuns.findIndex((run) => run.id === afterRunId);
    const nextRun = currentIndex >= 0
      ? unreviewedQualityRuns[(currentIndex + 1) % unreviewedQualityRuns.length]
      : unreviewedQualityRuns[0];
    selectQualityRun(nextRun, '已跳到下一张待判断候选图。');
  };

  const selectNextUnreviewedAfter = (runId) => {
    const remainingRuns = unreviewedQualityRuns.filter((run) => run.id !== runId);
    if (!remainingRuns.length) {
      setGenerationStatus('当前待判断队列已处理完，可以继续批量生成下一轮。');
      return;
    }
    selectQualityRun(remainingRuns[0], '已自动跳到下一张待判断候选图。');
  };

  const markActiveCandidate = (verdict) => {
    if (!activeCandidate) return;
    onUpdateGenerationRun(activeCandidate.id, {
      verdict,
      reasons: verdict === 'usable' ? [] : activeCandidate.reasons
    });
    if (autoAdvanceReview && verdict === 'usable') {
      selectNextUnreviewedAfter(activeCandidate.id);
      return;
    }
    if (verdict === 'needs_fix' || verdict === 'reject') {
      setGenerationStatus('已标记问题状态，请在下方选择原因；原因会用于下一轮提示词调优。');
    }
  };

  const applyActiveReasonRulesToPrompt = () => {
    if (!activeCandidate || !activeReasonSuggestions.length) return;
    const currentOverride = promptOverrides?.[activeCandidateSlot.id] || '';
    const nextOverride = activeReasonSuggestions.reduce(
      (value, suggestion) => mergePromptOverride(value, suggestion.text),
      currentOverride
    );
    onUpdatePromptOverride(activeCandidateSlot.id, nextOverride);
    setGenerationStatus(`已把 ${activeReasonSuggestions.length} 条问题原因转成下轮生成规则。`);
  };

  const saveReasonsAndGoNext = () => {
    if (!activeCandidate) return;
    if ((activeCandidate.verdict === 'needs_fix' || activeCandidate.verdict === 'reject') && !activeCandidate.reasons.length) {
      setGenerationStatus('请先选择至少一个问题原因，再进入下一张。');
      return;
    }
    selectNextUnreviewedAfter(activeCandidate.id);
  };

  const applyAiSuggestionToActiveCandidate = () => {
    if (!activeCandidate || (!activeCandidate.aiSuggestion && !activeCandidate.aiReview)) return;
    const suggestion = activeCandidate.aiSuggestion || deriveAiReviewSuggestion(activeCandidate.aiReview);
    onUpdateGenerationRun(activeCandidate.id, {
      verdict: suggestion.verdict,
      reasons: suggestion.reasons
    });
    setGenerationStatus('已采用 AI 预审建议，请再用人工眼睛确认一次画面是否真的可用。');
  };

  const copyGptTestPrompt = async () => {
    if (!selectedBrief) {
      setGenerationStatus('请先生成 7 图方案，再复制给 GPT 测试。');
      return;
    }
    const comparisonPrompt = buildGptComparisonPrompt({
      brief: selectedBrief,
      slot: selectedSlot,
      outputPreset,
      prompt,
      referenceItems: generationReferences
    });
    setGptComparisonPrompt(comparisonPrompt);
    try {
      const copied = await copyTextToClipboard(comparisonPrompt);
      setGenerationStatus(copied
        ? '已复制给 GPT 测试的完整提示词。也已在页面下方展开，方便核对。'
        : '已在页面下方展开 GPT 测试提示词；当前浏览器没有开放自动复制，请手动全选复制。');
    } catch {
      setGenerationStatus('已在页面下方展开 GPT 测试提示词；当前浏览器没有开放自动复制，请手动全选复制。');
    }
  };

  const importExternalCandidate = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!selectedBrief) {
      setGenerationStatus('请先生成 7 图方案，再导入外部结果。');
      return;
    }
    setGenerationStatus('正在导入 GPT 页面端结果图...');
    try {
      const sourceDataUrl = await blobToDataUrl(file);
      const fittedImageSrc = await resizeImageToPreset(sourceDataUrl, outputPreset);
      const previewImageSrc = await createImageThumbnail(fittedImageSrc);
      const reviewImageDataUrl = await createImageThumbnail(fittedImageSrc, 1200);
      const runId = createGenerationRunId();
      let storedImage = null;
      try {
        storedImage = await saveGeneratedImageToApi({
          imageDataUrl: fittedImageSrc,
          projectForm,
          slotId: selectedSlot.id,
          runId
        });
      } catch {
        storedImage = null;
      }
      const run = normalizeGenerationRun({
        id: runId,
        slotId: selectedSlot.id,
        slotTitle: selectedBrief.title || selectedSlot.title,
        outputPresetId: outputPreset.id,
        outputPresetLabel: outputPreset.label,
        outputPresetSize: outputPreset.size,
        imageSrc: storedImage?.imageUrl || previewImageSrc,
        reviewImageDataUrl,
        rawImageSrc: '',
        imageFilePath: storedImage?.filePath || '',
        imageFilename: storedImage?.filename || '',
        prompt,
        baselineMode,
        requestId: `external-${runId}`,
        model: 'GPT page import',
        externalSource: 'gpt-web',
        sourceFileName: file.name,
        referenceCount: generationReferences.length || 1,
        referenceLabels: generationReferences.map((image) => image.label),
        durationMs: 0,
        verdict: 'unreviewed',
        reasons: [],
        note: '页面端 GPT 生成后导入，用于和本地 API 结果做同条件对照。',
        createdAt: new Date().toISOString()
      });
      onSaveGenerationRun(run);
      setActiveRunId(run.id);
      setGenerationStatus(`GPT 页面端结果已导入，并已处理为 ${outputPreset.label} ${outputPreset.size}。请按同一标准判断可用性。`);
    } catch (error) {
      setGenerationStatus(error instanceof Error ? `导入失败：${error.message}` : '导入失败，请确认上传的是图片文件。');
    }
  };

  const createCandidateRun = async (slot, brief, options = {}) => {
    const runOutputPreset = options.outputPreset || outputPreset;
    const runBaselineMode = options.baselineMode ?? baselineMode;
    const referenceItems = getGenerationReferenceItems(projectForm, slot.id, runOutputPreset.id, brief?.visualType);
    const runBrand = getBrandProfile(brief.brandId, brandLibrary);
    const shouldAttachLogo = !runBaselineMode
      && runOutputPreset.id === 'aplus'
      && runBrand.id !== 'none'
      && Boolean(runBrand.logoPreview);
    const generationReferenceItems = shouldAttachLogo
      ? [
        ...referenceItems,
        {
          id: 'brand-logo',
          label: 'A+ brand logo reference',
          name: `${runBrand.name} logo`,
          preview: runBrand.logoPreview
        }
      ]
      : referenceItems;
    const runPrompt = buildGenerationPrompt(brief, slot, runOutputPreset, {
      baselineMode: runBaselineMode,
      promptOverride: promptOverrides?.[slot.id] || '',
      brandLibrary
    });
    const sourceImages = await Promise.all(generationReferenceItems.map(async (reference) => ({
        id: reference.id,
        label: reference.label,
        name: reference.name,
        dataUrl: await imageSourceToDataUrl(reference.preview)
      })));
      const sourceImageDataUrl = sourceImages[0]?.dataUrl || await imageSourceToDataUrl(getReferenceImage(projectForm));
      const runId = createGenerationRunId();
      const response = await fetch(`${IMAGE_API_BASE_URL}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.id,
          slotTitle: brief.title || slot.title,
          prompt: runPrompt,
          sourceImageDataUrl,
          sourceImages,
          size: '1024x1024',
          quality: 'low'
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || '生图接口返回失败。');
      }
      const rawImageSrc = result.imageDataUrl || result.imageUrl;
      const fittedImageSrc = await resizeImageToPreset(rawImageSrc, runOutputPreset);
      const previewImageSrc = await createImageThumbnail(fittedImageSrc);
      const reviewImageDataUrl = await createImageThumbnail(fittedImageSrc, 1200);
      let storedImage = null;
      try {
        storedImage = await saveGeneratedImageToApi({
          imageDataUrl: fittedImageSrc,
          projectForm,
          slotId: slot.id,
          runId
        });
      } catch {
        storedImage = null;
      }
      return normalizeGenerationRun({
        id: runId,
        slotId: slot.id,
        slotTitle: brief.title || slot.title,
        outputPresetId: runOutputPreset.id,
        outputPresetLabel: runOutputPreset.label,
        outputPresetSize: runOutputPreset.size,
        imageSrc: storedImage?.imageUrl || previewImageSrc,
        reviewImageDataUrl,
        rawImageSrc: '',
        imageFilePath: storedImage?.filePath || '',
        imageFilename: storedImage?.filename || '',
        prompt: runPrompt,
        baselineMode: runBaselineMode,
        requestId: result.requestId,
        model: result.model,
        referenceCount: sourceImages.length,
        referenceLabels: sourceImages.map((image) => image.label),
        durationMs: result.durationMs,
        verdict: 'unreviewed',
        reasons: [],
        createdAt: new Date().toISOString()
      });
  };

  const reviewCandidateRun = async (run, slot, brief, options = {}) => {
    const runOutputPreset = options.outputPreset || outputPreset;
    const review = await reviewGeneratedImageWithApi({
      projectForm,
      brief,
      run,
      sourceImages: getGenerationReferenceItems(projectForm, slot.id, runOutputPreset.id, brief?.visualType)
    });
    return {
      ...run,
      aiReview: review,
      aiSuggestion: deriveAiReviewSuggestion(review)
    };
  };

  const runGeneration = async () => {
    if (!selectedBrief) {
      setGenerationStatus('请先生成 7 图方案，再进入生图验证。');
      return;
    }
    const tasks = generationMode === 'all-one'
      ? activeSlots
        .map((slot) => ({ slot, brief: storyboardBriefs.find((item) => item.id === slot.id) }))
        .filter((task) => task.brief)
      : Array.from({ length: singleBatchCount }, () => ({ slot: selectedSlot, brief: selectedBrief })).filter((task) => task.brief);
    if (!tasks.length) {
      setGenerationStatus('当前没有可生成的图片方案。');
      return;
    }

    if (tasks.length > 1) {
      setIsBatchRunning(true);
      setActiveRunId('');
      setBatchLog(tasks.map((task, index) => ({
        id: `${task.slot.id}-${index}`,
        slotTitle: task.brief.title || task.slot.title,
        status: 'waiting',
        message: '等待开始'
      })));
      setGenerationStatus(generationMode === 'all-one'
        ? `开始生成一轮完整图片：共 ${tasks.length} 张，每个卖点各 1 张。`
        : `开始为当前卖点生成 ${tasks.length} 张候选图。`);
      const completedRuns = [];
      const failedMessages = [];
      for (const [index, task] of tasks.entries()) {
        const logId = `${task.slot.id}-${index}`;
        setBatchLog((items) => items.map((item) => (
          item.id === logId ? { ...item, status: 'running', message: '正在生成候选图' } : item
        )));
        try {
          const run = await createCandidateRun(task.slot, task.brief, {
            baselineMode,
            outputPreset
          });
          setBatchLog((items) => items.map((item) => (
            item.id === logId ? { ...item, status: 'running', message: '正在 AI 预审' } : item
          )));
          try {
            const reviewedRun = await reviewCandidateRun(run, task.slot, task.brief, {
              outputPreset
            });
            completedRuns.unshift(reviewedRun);
            onSaveGenerationRuns(completedRuns);
            setActiveRunId(reviewedRun.id);
            setSelectedSlot(task.slot);
            setBatchLog((items) => items.map((item) => (
              item.id === logId
                ? { ...item, status: 'done', message: aiReviewVerdicts[reviewedRun.aiReview?.verdict]?.label || '已预审' }
                : item
            )));
          } catch (reviewError) {
            const message = getGenerationErrorMessage(reviewError);
            const keptRun = {
              ...run,
              note: `AI 预审失败：${message}。图片已保留，请人工判断是否可用。`
            };
            completedRuns.unshift(keptRun);
            onSaveGenerationRuns(completedRuns);
            setActiveRunId(keptRun.id);
            setSelectedSlot(task.slot);
            failedMessages.push(`AI 预审失败：${message}`);
            setBatchLog((items) => items.map((item) => (
              item.id === logId
                ? { ...item, status: 'failed', message: `预审失败，已保留候选图：${message}` }
                : item
            )));
          }
        } catch (error) {
          const message = getGenerationErrorMessage(error);
          failedMessages.push(message);
          setBatchLog((items) => items.map((item) => (
            item.id === logId
              ? { ...item, status: 'failed', message }
              : item
          )));
        }
      }
      setIsBatchRunning(false);
      setGenerationStatus(summarizeBatchGenerationResult(completedRuns.length, tasks.length, failedMessages, '生成'));
      return;
    }

    setIsGenerating(true);
    setActiveRunId('');
    setGenerationStatus('正在读取原始产品图并生成候选图...');
    try {
      const run = await createCandidateRun(selectedSlot, selectedBrief);
      setActiveRunId(run.id);
      setGenerationStatus('候选图已生成，正在自动 AI 预审...');
      try {
        const reviewedRun = await reviewCandidateRun(run, selectedSlot, selectedBrief, {
          outputPreset
        });
        onSaveGenerationRun(reviewedRun);
        setActiveRunId(reviewedRun.id);
        setGenerationStatus(`候选图已生成并完成 AI 预审：${aiReviewVerdicts[reviewedRun.aiReview?.verdict]?.label || '需复核'}。请人工判断是否可用。`);
      } catch (reviewError) {
        onSaveGenerationRun(run);
        setGenerationStatus(reviewError instanceof Error
          ? `候选图已生成，但 AI 预审失败：${reviewError.message}。请人工判断是否可用。`
          : '候选图已生成，但 AI 预审失败。请人工判断是否可用。');
      }
    } catch (error) {
      setGenerationStatus(getGenerationErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const runAiReview = async () => {
    if (!activeCandidate || !activeCandidateBrief) {
      setGenerationStatus('请先生成一张候选图，再进行 AI 预审。');
      return;
    }
    const runOutputPreset = getOutputPresetById(activeCandidate.outputPresetId);
    setIsAiReviewing(true);
    setGenerationStatus('AI 正在对照原始参考图预审候选图...');
    try {
      const review = await reviewGeneratedImageWithApi({
        projectForm,
        brief: activeCandidateBrief,
        run: activeCandidate,
        sourceImages: getGenerationReferenceItems(projectForm, activeCandidateSlot.id, runOutputPreset.id, activeCandidateBrief?.visualType)
      });
      onUpdateGenerationRun(activeCandidate.id, {
        aiReview: review,
        aiSuggestion: deriveAiReviewSuggestion(review)
      });
      setGenerationStatus(`AI 预审完成：${aiReviewVerdicts[review.verdict]?.label || '需复核'}，请结合人工判断。`);
    } catch (error) {
      setGenerationStatus(error instanceof Error ? error.message : 'AI 预审失败。');
    } finally {
      setIsAiReviewing(false);
    }
  };

  const runBatchValidation = async () => {
    if (!storyboardBriefs.length) {
      setGenerationStatus('请先生成 7 图方案，再跑批量验证。');
      return;
    }
    const baselineOutputPreset = outputPresets[0];
    const tasks = batchMode === 'all-1'
      ? activeSlots
        .map((slot) => ({ slot, brief: storyboardBriefs.find((item) => item.id === slot.id) }))
        .filter((task) => task.brief)
      : Array.from({ length: 5 }, () => ({ slot: selectedSlot, brief: selectedBrief })).filter((task) => task.brief);
    if (!tasks.length) {
      setGenerationStatus('当前没有可验证的图槽方案。');
      return;
    }

    setIsBatchRunning(true);
    setBatchLog(tasks.map((task, index) => ({
      id: `${task.slot.id}-${index}`,
      slotTitle: task.brief.title || task.slot.title,
      status: 'waiting',
      message: '等待开始'
    })));
    setGenerationStatus(`批量验证开始：共 ${tasks.length} 张，强制使用无品牌基线 + ${baselineOutputPreset.size}，生成后会自动 AI 预审。`);

    const completedRuns = [];
    const failedMessages = [];
    for (const [index, task] of tasks.entries()) {
      const logId = `${task.slot.id}-${index}`;
      setBatchLog((items) => items.map((item) => (
        item.id === logId ? { ...item, status: 'running', message: '正在生成候选图' } : item
      )));
      try {
        const run = await createCandidateRun(task.slot, task.brief, {
          baselineMode: true,
          outputPreset: baselineOutputPreset
        });
        setBatchLog((items) => items.map((item) => (
          item.id === logId ? { ...item, status: 'running', message: '正在 AI 预审' } : item
        )));
        try {
          const reviewedRun = await reviewCandidateRun(run, task.slot, task.brief, {
            outputPreset: baselineOutputPreset
          });
          completedRuns.unshift(reviewedRun);
          onSaveGenerationRuns(completedRuns);
          setActiveRunId(reviewedRun.id);
          setSelectedSlot(task.slot);
          setBatchLog((items) => items.map((item) => (
            item.id === logId
              ? { ...item, status: 'done', message: aiReviewVerdicts[reviewedRun.aiReview?.verdict]?.label || '已预审' }
              : item
          )));
        } catch (reviewError) {
          const message = getGenerationErrorMessage(reviewError);
          const keptRun = {
            ...run,
            note: `AI 预审失败：${message}。图片已保留，请人工判断是否可用。`
          };
          completedRuns.unshift(keptRun);
          onSaveGenerationRuns(completedRuns);
          setActiveRunId(keptRun.id);
          setSelectedSlot(task.slot);
          failedMessages.push(`AI 预审失败：${message}`);
          setBatchLog((items) => items.map((item) => (
            item.id === logId
              ? { ...item, status: 'failed', message: `预审失败，已保留候选图：${message}` }
              : item
          )));
        }
      } catch (error) {
        const message = getGenerationErrorMessage(error);
        failedMessages.push(message);
        setBatchLog((items) => items.map((item) => (
          item.id === logId
            ? { ...item, status: 'failed', message }
            : item
        )));
      }
    }

    setIsBatchRunning(false);
    setGenerationStatus(summarizeBatchGenerationResult(completedRuns.length, tasks.length, failedMessages, '批量验证'));
  };

  return (
    <section className="page-grid">
      <div className="left-column">
        <section className="panel api-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Slots</p>
              <h3>选择要生成的图片</h3>
            </div>
            <span className="lock-label">
              <KeyRound size={14} />
              已连接
            </span>
          </div>
          <div className="generation-slot-list">
            {activeSlots.map((slot) => {
              const brief = storyboardBriefs.find((item) => item.id === slot.id);
              return (
              <button
                className={selectedSlot.id === slot.id ? 'generation-slot active' : 'generation-slot'}
                key={slot.id}
                onClick={() => {
                  setSelectedSlot(slot);
                  setGenerationStatus('');
                }}
              >
                <img src={generationPreviewImage} alt={`${slot.title} product reference`} />
                <span>
                  <strong>{String(slot.id).padStart(2, '0')} · {brief?.title || slot.title}</strong>
                  <small>{brief ? brief.goal : '等待方案'}</small>
                </span>
                {brief ? <BriefStatusPill status={brief.status} /> : <StatusPill status="review" />}
              </button>
              );
            })}
          </div>
          <p className="panel-note">
            同一产品内重新生成卖点或 7 图方案会保留质量样本；如果更换主图、SKU 或产品名，系统会清空旧记录避免混入旧产品数据。
          </p>
        </section>

        <section className="panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Reference</p>
              <h3>每次从原图生成</h3>
            </div>
          </div>
          <div className="generation-reference">
            <img src={getReferenceImage(projectForm)} alt="Locked product reference" />
            <div>
              <strong>{getReferenceImageName(projectForm)}</strong>
              <p>验证阶段只允许把原始参考图组传给 API，不允许基于上一张候选图继续修改。</p>
              <span>{projectForm.productName || projectForm.projectName || '未命名产品'}</span>
            </div>
          </div>
          <div className="generation-reference-strip">
            {generationReferences.map((reference) => (
              <span key={reference.id}>
                {reference.label}
                <b>{reference.name || '已就绪'}</b>
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="right-column">
        <FocusFrame active={getFocusSignal(focusRequest, 'generation')}>
          <section className="panel generation-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Generate</p>
                <h3>{String(selectedSlot.id).padStart(2, '0')} · {selectedBrief?.title || selectedSlot.title}</h3>
              </div>
              <button className="primary-button" disabled={!canGenerate || isGenerating || isBatchRunning} onClick={runGeneration}>
                <Sparkles size={17} />
                {generationButtonLabel}
              </button>
            </div>

            <div className="generation-setup">
            <div className="generation-setup-head">
              <span>生成设置</span>
              <strong>{outputPreset.label} · {baselineMode ? '基线模式' : '品牌模式'}</strong>
            </div>

            <div className="generation-method">
              <div className="generation-method-grid">
                <button
                  className={generationMode === 'single-multi' ? 'generation-method-card active' : 'generation-method-card'}
                  disabled={isBatchRunning || isGenerating}
                  onClick={() => setGenerationMode('single-multi')}
                >
                  <span>方式一</span>
                  <strong>单个卖点生成多张</strong>
                  <p>适合打磨当前图槽，快速比较构图、审美和文案表现。</p>
                </button>
                <button
                  className={generationMode === 'all-one' ? 'generation-method-card active' : 'generation-method-card'}
                  disabled={isBatchRunning || isGenerating}
                  onClick={() => setGenerationMode('all-one')}
                >
                  <span>方式二</span>
                  <strong>各卖点各生成一张</strong>
                  <p>适合快速跑完整套图，像验证流程一样一次看 7 张方向。</p>
                </button>
              </div>
              {generationMode === 'single-multi' ? (
                <div className="generation-count-row">
                  <span>生成数量</span>
                  {[1, 3, 5].map((count) => (
                    <button
                      className={singleBatchCount === count ? 'active' : ''}
                      disabled={isBatchRunning || isGenerating}
                      key={count}
                      onClick={() => setSingleBatchCount(count)}
                    >
                      {count} 张
                    </button>
                  ))}
                </div>
              ) : (
                <div className="generation-count-row muted">
                  <span>当前会按 7 张图片方案各生成 1 张，并自动进入待判断队列。</span>
                </div>
              )}
            </div>

            <div className="output-mode">
              {outputPresets.map((preset) => (
                <button
                  className={outputPreset.id === preset.id ? 'active' : ''}
                  disabled
                  key={preset.id}
                  title="输出类型来自图片方案；如需切换，请回到规划图片重新生成方案。"
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.size}</span>
                </button>
              ))}
            </div>
            <p className="panel-note">输出类型已跟随图片方案锁定。要切换主图/A+，请回到“规划图片”重新生成方案。</p>

            <div className="validation-bar style-bar">
              <div>
                <Palette size={16} />
                <span>图片风格</span>
              </div>
              <div className="output-mode">
                <button
                  className={baselineMode ? 'active' : ''}
                  onClick={() => setBaselineMode(true)}
                >
                  <strong>基线模式</strong>
                  <span>不套品牌，统一基线</span>
                </button>
                <button
                  className={!baselineMode ? 'active' : ''}
                  onClick={() => setBaselineMode(false)}
                >
                  <strong>品牌模式</strong>
                  <span>套用品牌风格</span>
                </button>
              </div>
            </div>
            </div>

            {(approvedSlotRuns.length > 0 || generationReadyForReview) && (
              <div className={generationReadyForReview ? 'inline-next-step' : 'inline-next-step muted'}>
                <div>
                  {generationReadyForReview ? <Check size={18} /> : <Eye size={18} />}
                  <span>
                    <strong>{generationReadyForReview ? '7 张图已人工通过' : `已有 ${approvedSlotRuns.length}/${activeSlots.length || STORYBOARD_SLOT_COUNT} 张图人工通过`}</strong>
                    <small>{generationReadyForReview
                      ? '可以进入审核页做最终确认。'
                      : `还差 ${missingApprovedSlots} 个图槽需要有一张候选图被标记为可用。`}</small>
                  </span>
                </div>
                <button className="primary-button" disabled={!generationReadyForReview} onClick={onGoReview}>
                  <ShieldCheck size={16} />
                  下一步：审核图片
                </button>
              </div>
            )}

            {showGenerationProgress && (
              <div className="generation-progress-panel">
                <div className="generation-progress-head">
                  <div>
                    <span>生成进度</span>
                    <strong>{generationStageLabel}</strong>
                  </div>
                  {batchProgress.total > 0 && (
                    <em>{batchProgress.done + batchProgress.failed}/{batchProgress.total} 已处理</em>
                  )}
                </div>
                {batchLog.length > 0 ? (
                  <div className="generation-progress-list">
                    {batchLog.map((item) => (
                      <div className={item.status} key={item.id}>
                        <span>{item.slotTitle}</span>
                        <strong>{item.message}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="generation-progress-list compact">
                    <div className={singleProgressStatus}>
                      <span>{selectedBrief?.title || selectedSlot.title}</span>
                      <strong>{generationStatus || generationStageLabel || '等待生成'}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="review-flow-panel">
              <div className="review-flow-head">
                <div>
                  <span>待判断队列</span>
                  <strong>{unreviewedQualityRuns.length ? `${unreviewedQualityRuns.length} 张候选图待人工判断` : '当前没有待判断图'}</strong>
                </div>
                {unreviewedQualityRuns.length > 0 && (
                  <button
                    className="secondary-button"
                    onClick={() => selectNextUnreviewedRun()}
                  >
                    <ChevronRight size={16} />
                    下一张待判断
                  </button>
                )}
              </div>
              {visibleQueueRuns.length > 0 ? (
                <div className="review-flow-list">
                  {visibleQueueRuns.map((run) => (
                    <button
                      className={activeCandidate?.id === run.id ? 'active' : ''}
                      key={run.id}
                      onClick={() => selectQualityRun(run, '已打开待判断候选图。')}
                    >
                      <span>{String(run.slotId).padStart(2, '0')}</span>
                      <strong>{run.slotTitle}</strong>
                      <small>{run.aiReview ? aiReviewVerdicts[run.aiReview.verdict]?.label || '已预审' : '待 AI 预审'}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p>生成候选图后，这里会出现需要人工判断的图片。</p>
              )}
            </div>

            <details className="disclosure-panel generation-advanced">
              <summary>
                <span>
                  <b>质量工具</b>
                  <small>当前图槽可用率、失败原因和基线验证</small>
                </span>
                <ChevronRight size={17} />
              </summary>
              <div className="quality-summary">
                <Metric label="当前图槽记录" value={slotQuality.total} />
                <Metric label="可用" value={slotQuality.usable} tone="good" />
                <Metric label="需修改" value={slotQuality.needsFix} />
                <Metric label="不可用" value={slotQuality.rejected} tone="danger" />
              </div>
              <div className="batch-validation-box">
                <div className="batch-validation-head">
                  <div>
                    <span>质量基线</span>
                    <strong>用固定基线模式跑一组候选图</strong>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={isBatchRunning || isGenerating || isAiReviewing || !storyboardBriefs.length}
                    onClick={runBatchValidation}
                  >
                    {isBatchRunning ? <RefreshCcw className="spin-icon" size={16} /> : <Sparkles size={16} />}
                    {isBatchRunning ? '运行中...' : '跑一轮质量基线'}
                  </button>
                </div>
                <div className="batch-mode">
                  <button
                    className={batchMode === 'current-5' ? 'active' : ''}
                    disabled={isBatchRunning}
                    onClick={() => setBatchMode('current-5')}
                  >
                    当前图槽 5 张
                  </button>
                  <button
                    className={batchMode === 'all-1' ? 'active' : ''}
                    disabled={isBatchRunning}
                    onClick={() => setBatchMode('all-1')}
                  >
                    当前 7 图各 1 张
                  </button>
                </div>
              </div>
            </details>

            {selectedBrief ? (
              <div className="generation-brief">
                <div>
                  <span>本张图的生成说明</span>
                  <p>{selectedBrief.composition} · 输出：{outputPreset.label} {outputPreset.size}</p>
                </div>
                <div className="visual-proof-box compact">
                  <span>主卖点</span>
                  <strong>{selectedBrief.primaryClaim || '暂未分配主卖点'}</strong>
                  <span>画面证明方式</span>
                  <p>{selectedBrief.visualProof || '这张图需要用画面证明卖点，而不是只放文字。'}</p>
                </div>
                <div className="language-rule-note">
                  <Check size={15} />
                  <p>关键词和卖点可以中文填写；生成图片里的可见文案统一输出英文。标准主图优先用画面证明卖点，尽量少放说明文字；如有标题通常放在图上方，7 张图保持统一字体和风格。A+ 是内容模块例外：不要求第一张白底，标题可按版式摆放，也可组合相关可用卖点。禁用卖点不能用画面暗示成卖点。</p>
                </div>
                <details className="disclosure-panel inline-disclosure">
                  <summary>
                    <span>
                      <b>提示词与模型对照</b>
                      <small>GPT 页面测试、完整 Prompt、高级排查</small>
                    </span>
                    <ChevronRight size={17} />
                  </summary>
                  <div className="model-compare-box">
                    <div>
                      <span>模型对照验证</span>
                      <p>复制同一套提示词到页面端 GPT；生成后把图片导入这里，用同一套 P0 标准判断。</p>
                    </div>
                    <div className="model-compare-actions">
                      <button className="secondary-button" onClick={copyGptTestPrompt}>
                        <ClipboardCheck size={15} />
                        生成/复制 GPT 提示词
                      </button>
                      <label className="secondary-button upload-button" htmlFor="external-candidate-upload">
                        <Upload size={15} />
                        导入 GPT 结果图
                      </label>
                      <input
                        className="file-input"
                        id="external-candidate-upload"
                        type="file"
                        accept="image/*"
                        onChange={importExternalCandidate}
                      />
                    </div>
                    {gptComparisonPrompt && (
                      <div className="gpt-prompt-draft">
                        <div>
                          <strong>GPT 测试提示词</strong>
                          <button className="text-button" onClick={() => setGptComparisonPrompt('')}>关闭</button>
                        </div>
                        <textarea
                          readOnly
                          value={gptComparisonPrompt}
                          onFocus={(event) => event.target.select()}
                        />
                        <p>如果自动复制没有成功，点进这个文本框后全选复制；到网页端 GPT 上传同一张产品参考图，再粘贴这段内容。</p>
                      </div>
                    )}
                  </div>
                  <div className="prompt-brief">
                    <span>完整提示词</span>
                    <p>{prompt}</p>
                  </div>
                </details>
              </div>
            ) : (
              <div className="brief-empty">
                <Sparkles size={22} />
                <strong>还没有可生图的 brief</strong>
                <p>请先回到图片方案，生成每张图的角色、卖点和画面证明方式。</p>
              </div>
            )}

            {generationStatus && (
              <div className={generationStatusClass}>
                {generationStatus}
              </div>
            )}

            {activeCandidate && (
              <div className="candidate-block">
                <div
                  className="candidate-preview"
                  style={{ '--candidate-ratio': `${activeCandidatePreset.width} / ${activeCandidatePreset.height}` }}
                >
	                  {activeCandidate.imageSrc ? (
	                    <img src={activeCandidate.imageSrc} alt="Generated candidate" />
	                  ) : (
	                    <div className="candidate-image-missing">
	                      <FileImage size={28} />
	                      <strong>这张旧图没有保存文件</strong>
	                      <span>请重新生成这一张。之后的新候选图会保存到本机文件夹，刷新后也能继续查看。</span>
	                    </div>
	                  )}
	                  <div>
                    <div className="candidate-title-row">
                      <strong>{activeCandidate.slotTitle}</strong>
                      <GenerationVerdictPill verdict={activeCandidate.verdict} />
                    </div>
                    <p>
                      {activeCandidate.model || 'image model'} · {activeCandidate.outputPresetLabel} {activeCandidate.outputPresetSize}
                      {' · '}
                      {activeCandidate.referenceCount || 1} 张参考图
                      {activeCandidate.durationMs ? ` · ${Math.round(activeCandidate.durationMs / 1000)}s` : ''}
                    </p>
                    <span>{activeCandidate.baselineMode ? '基线模式' : '品牌模式'} · {formatProjectTime(activeCandidate.createdAt)}</span>
                    {activeCandidate.requestId && <span>request: {activeCandidate.requestId}</span>}
                    <div className={`candidate-review-summary ${activeCandidate.aiReview?.verdict || 'empty'}`}>
                      <span>AI 预审</span>
                      <strong>{activeCandidate.aiReview ? aiReviewVerdicts[activeCandidate.aiReview.verdict]?.label || '需复核' : '等待预审'}</strong>
                      <p>{activeCandidate.aiReview
                        ? `风险分 ${activeCandidate.aiReview.score ?? '-'} · 最终以人工判断为准`
                        : '生成后会自动预审；这里显示简短结论。'}</p>
                    </div>
                  </div>
                </div>

                <div className="quick-review-bar">
                  <div>
                    <span>快速人工判断</span>
                    <strong>{String(activeCandidate.slotId).padStart(2, '0')} · {activeCandidate.slotTitle}</strong>
                  </div>
                  <div className="quick-review-actions">
                    {Object.entries(generationVerdicts).filter(([id]) => id !== 'unreviewed').map(([id, item]) => {
                      const Icon = item.icon;
                      return (
                        <button
                          className={activeCandidate.verdict === id ? `active ${item.className}` : ''}
                          key={id}
                          onClick={() => markActiveCandidate(id)}
                        >
                          <Icon size={15} />
                          {item.label}
                        </button>
                      );
                    })}
                    <button
                      className="ai-suggestion-action"
                      disabled={!activeCandidate.aiSuggestion && !activeCandidate.aiReview}
                      onClick={applyAiSuggestionToActiveCandidate}
                    >
                      <Sparkles size={15} />
                      采用 AI 建议
                    </button>
                    <button
                      className="secondary-button"
                      disabled={!unreviewedQualityRuns.length}
                      onClick={() => selectNextUnreviewedRun()}
                    >
                      <ChevronRight size={15} />
                      下一张
                    </button>
                  </div>
                  <label className="auto-advance-toggle">
                    <input
                      checked={autoAdvanceReview}
                      onChange={(event) => setAutoAdvanceReview(event.target.checked)}
                      type="checkbox"
                    />
                    标记后自动跳下一张
                  </label>
                </div>

                <div className="quality-review-box">
                  <div className="quality-review-header">
                    <div>
                      <span>问题原因</span>
                      <p>先在上方判断可用性；如果需修改或不可用，再勾选原因。</p>
                    </div>
                  </div>
                  {activeCandidate.verdict === 'usable' ? (
                    <div className="reason-empty-state">
                      <Check size={16} />
                      <span>已标记可用，无需选择问题原因。</span>
                    </div>
                  ) : (
                    <div className="reason-grid">
                      {generationFailureReasons.map((reason) => {
                        const checked = activeCandidate.reasons.includes(reason.id);
                        return (
                          <button
                            className={checked ? 'active' : ''}
                            key={reason.id}
                            onClick={() => {
                              const reasons = checked
                                ? activeCandidate.reasons.filter((item) => item !== reason.id)
                                : [...activeCandidate.reasons, reason.id];
                              onUpdateGenerationRun(activeCandidate.id, { reasons });
                            }}
                          >
                            {checked ? <Check size={14} /> : <Plus size={14} />}
                            {reason.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {activeCandidate.reasons.length > 0 && (
                    <p className="reason-summary">
                      已标记：{getFailureReasonLabels(activeCandidate.reasons).join('、')}
                    </p>
                  )}
                  {activeCandidate.verdict !== 'usable' && activeReasonSuggestions.length > 0 && (
                    <div className="reason-tuning-box">
                      <div>
                        <span>下轮生成建议</span>
                        <strong>已根据问题原因生成 {activeReasonSuggestions.length} 条提示词规则</strong>
                        <p>{activeReasonSuggestions.map((suggestion) => suggestion.title).join('、')}</p>
                      </div>
                      <div className="reason-tuning-actions">
                        <button className="secondary-button" onClick={applyActiveReasonRulesToPrompt}>
                          <Plus size={15} />
                          加入本图槽提示词
                        </button>
                        <button className="secondary-button" onClick={saveReasonsAndGoNext}>
                          <ChevronRight size={15} />
                          保存原因，下一张
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="ai-review-details">
                    <div className="ai-review-details-head">
                      <div>
                        <span>AI 预审详情</span>
                        <strong>{activeCandidate.aiReview ? '风险项和建议已展开' : '当前候选图还没有预审结果'}</strong>
                      </div>
                    </div>
                    <div className="ai-review-action-row">
                      <button className="secondary-button" disabled={isAiReviewing || isBatchRunning} onClick={runAiReview}>
                        <ShieldCheck size={16} />
                        {isAiReviewing ? 'AI 预审中...' : activeCandidate.aiReview ? '重新 AI 预审' : 'AI 预审'}
                      </button>
                      <span>AI 只做风险提示，最终仍由人工确认。</span>
                    </div>
                    <AiReviewPanel review={activeCandidate.aiReview} />
                    <AiSuggestionBox
                      suggestion={activeCandidate.aiSuggestion}
                      onApply={applyAiSuggestionToActiveCandidate}
                    />
                  </div>
                </div>

                <div className="candidate-prompt-tuning">
                  <PromptTuningPanel
                    slot={activeCandidateSlot}
                    generationRuns={generationRuns}
                    promptOverride={promptOverrides?.[activeCandidateSlot.id] || ''}
                    onUpdatePromptOverride={onUpdatePromptOverride}
                  />
                </div>
              </div>
            )}

            {slotRuns.length > 1 && (
              <div className="run-history">
                <span>本图槽历史记录</span>
                {slotRuns.slice(0, 5).map((run) => (
                  <button
                    className={activeCandidate?.id === run.id ? 'active' : ''}
                    key={run.id}
                    onClick={() => setActiveRunId(run.id)}
                  >
                    <GenerationVerdictPill verdict={run.verdict} />
                    <strong>{run.outputPresetLabel}</strong>
                    <small>{formatProjectTime(run.createdAt)}</small>
                  </button>
                ))}
              </div>
            )}
          </section>
        </FocusFrame>

      </div>
    </section>
  );
}

function ReviewPage({ ledgerFacts, storyboardBriefs, reviewDecisions, generationRuns, onUpdateReview, onManageLedger, focusRequest }) {
  const activeSlots = getActiveSlots(storyboardBriefs);
  const decisions = activeSlots.map((slot) => getReviewDecision(reviewDecisions, slot.id, storyboardBriefs));
  const approved = decisions.filter(isDecisionFullyApproved).length;
  const rework = decisions.filter((decision) => decision.status === 'rework' || decision.status === 'blocked').length;
  const pending = Math.max(0, activeSlots.length - approved - rework);
  return (
    <section className="page-grid">
      <FocusFrame active={getFocusSignal(focusRequest, 'review')} className="left-column">
        <section className="panel review-queue-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Review</p>
              <h3>图片确认队列</h3>
            </div>
          </div>
          <div className="review-overview-strip">
            <span><strong>{approved}</strong> 人工通过</span>
            <span><strong>{pending}</strong> 待确认</span>
            <span><strong>{rework}</strong> 需处理</span>
          </div>
          <div className="review-list">
            {activeSlots.map((slot) => {
              const decision = getReviewDecision(reviewDecisions, slot.id, storyboardBriefs);
              const brief = storyboardBriefs.find((item) => item.id === slot.id);
              const previewRun = getBestRunForSlot(slot.id, generationRuns);
              return (
                <div className="review-card" key={slot.id}>
                  <div className="review-card-head">
                    <div className="review-card-thumb">
                      {previewRun?.imageSrc ? (
                        <img src={previewRun.imageSrc} alt={brief?.title || slot.title} />
                      ) : (
                        <FileImage size={22} />
                      )}
                    </div>
                    <span>{String(slot.id).padStart(2, '0')}</span>
                    <div>
                      <strong>{brief?.title || slot.title}</strong>
                      <p>
                        {previewRun
                          ? `${generationVerdicts[previewRun.verdict]?.label || '未判断'} · ${previewRun.outputPresetSize}`
                          : '还没有可审核的候选图'}
                        {' · '}
                        {decision.note || getDefaultReviewNote(decision.status, brief)}
                      </p>
                    </div>
                    <ReviewStatusPill status={decision.status} />
                  </div>
                  <ReviewActions decision={decision} activeRole="human" onUpdateReview={onUpdateReview} />
                </div>
              );
            })}
          </div>
        </section>
      </FocusFrame>

      <div className="right-column">
        <details className="panel disclosure-panel" open>
          <summary>
            <span>
              <b>审核依据</b>
              <small>产品、卖点、物理逻辑和合规表达</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Checklist</p>
              <h3>审核检查项</h3>
            </div>
          </div>
          <div className="audit-list">
            {auditItems.map((item) => (
              <div className="audit-row" key={item.label}>
                <div className={item.state === 'pass' ? 'audit-icon pass' : 'audit-icon warn'}>
                  {item.state === 'pass' ? <ShieldCheck size={18} /> : <MessageSquareWarning size={18} />}
                </div>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
        <details className="panel disclosure-panel">
          <summary>
            <span>
              <b>卖点详情</b>
              <small>需要核对文案和证据时展开</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <FactLedgerPanel compact ledgerFacts={ledgerFacts} onManage={onManageLedger} />
        </details>
      </div>
    </section>
  );
}

function ExportPage({
  projectForm,
  storyboardBriefs,
  reviewDecisions,
  generationRuns,
  exportSelections,
  onUpdateExportSelection,
  focusRequest
}) {
  const [exportStatus, setExportStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [savedZip, setSavedZip] = useState(null);
  const activeSlots = getActiveSlots(storyboardBriefs);
  const slotTotal = activeSlots.length || STORYBOARD_SLOT_COUNT;
  const decisions = activeSlots.map((slot) => getReviewDecision(reviewDecisions, slot.id, storyboardBriefs));
  const approved = decisions.filter(isDecisionFullyApproved).length;
  const pending = decisions.filter((decision) => decision.status === 'review').length;
  const rework = decisions.filter((decision) => decision.status === 'rework').length;
  const blocked = decisions.filter((decision) => decision.status === 'blocked').length;
  const selectedImages = activeSlots
    .map((slot) => ({ slot, run: getSelectedRunForSlot(slot.id, generationRuns, exportSelections) }))
    .filter((item) => item.run?.imageSrc);
  const selectedImageCount = selectedImages.length;
  const exportPreviewRows = activeSlots.map((slot) => {
    const brief = storyboardBriefs.find((item) => item.id === slot.id) || {};
    const candidates = getSlotCandidateRuns(slot.id, generationRuns);
    const selectedRun = getSelectedRunForSlot(slot.id, generationRuns, exportSelections);
    const manualRunId = exportSelections?.[slot.id];
    return {
      slot,
      brief,
      candidates,
      selectedRun,
      manualRunId,
      decision: getReviewDecision(reviewDecisions, slot.id, storyboardBriefs)
    };
  });
  const exportRows = [
    ['可打包图片', `${selectedImageCount}/${slotTotal}`],
    ['人工通过', `${approved}/${slotTotal}`],
    ['待审核/返工', `${pending + rework + blocked}`]
  ];
  const readyForZip = selectedImageCount === slotTotal && selectedImageCount > 0;
  const reviewReady = activeSlots.length > 0
    && storyboardBriefs.length === STORYBOARD_SLOT_COUNT
    && activeSlots.every((slot) => isDecisionFullyApproved(getReviewDecision(reviewDecisions, slot.id, storyboardBriefs)));
  const canExportZip = readyForZip && reviewReady;
  const firstMissingReview = activeSlots
    .map((slot) => getReviewDecision(reviewDecisions, slot.id, storyboardBriefs))
    .find((decision) => !isDecisionFullyApproved(decision));
  const exportHint = readyForZip
    ? reviewReady
      ? '最终图已选齐，审核状态已通过，可以导出 ZIP。'
      : firstMissingReview
        ? `最终图已选齐，但第 ${String(firstMissingReview.slotId).padStart(2, '0')} 张还未人工通过：${getDualReviewMissingText(firstMissingReview)}。`
        : '最终图已选齐，但仍有图片未完全通过审核。'
    : `还缺 ${Math.max(0, slotTotal - selectedImageCount)} 张最终图。`;
  const exportImagesZip = async () => {
    if (!storyboardBriefs.length) {
      setExportStatus('请先生成 7 图方案，再导出图片 ZIP。');
      return;
    }
    if (!readyForZip) {
      setExportStatus(`最终图还没选齐：当前 ${selectedImageCount}/${slotTotal} 张。请先生成或导入候选图。`);
      return;
    }
    if (!reviewReady) {
      setExportStatus(firstMissingReview
        ? `还不能导出：第 ${String(firstMissingReview.slotId).padStart(2, '0')} 张需要完成 ${getDualReviewMissingText(firstMissingReview)}。`
        : '还不能导出：所有图片都需要人工审核通过。');
      return;
    }
    setIsExporting(true);
    setSavedZip(null);
    setExportStatus('正在打包生成图片...');
    try {
      const zip = await saveImagesZipToApi({
        projectForm,
        storyboardBriefs,
        generationRuns,
        exportSelections
      });
      setSavedZip(zip);
      setExportStatus(`图片 ZIP 已保存到 exports/，共 ${zip.count} 张图。`);
    } catch (error) {
      setExportStatus(error instanceof Error ? `图片 ZIP 导出失败：${error.message}` : '图片 ZIP 导出失败。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="page-grid">
      <div className="left-column">
        <section className="panel export-ready-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Export</p>
              <h3>导出图片 ZIP</h3>
            </div>
          </div>
          <div className="export-readiness">
            <div className={readyForZip ? 'export-readiness-icon ready' : 'export-readiness-icon'}>
              {readyForZip ? <Check size={24} /> : <Archive size={24} />}
            </div>
            <strong>{readyForZip ? '最终图已选齐' : '还不能完整导出'}</strong>
            <p>{exportHint}</p>
            <div className="export-progress-list">
              {exportRows.map(([name, state]) => (
                <span key={name}>
                  {name}
                  <b>{state}</b>
                </span>
              ))}
            </div>
          </div>
          <div className="delivery-export-box">
            <p>只导出右侧最终图清单中选中的图片。图片会自动打包成 ZIP，保存到本机 exports 文件夹。</p>
            <button className="primary-button" disabled={isExporting || !canExportZip} onClick={exportImagesZip}>
              <Download size={17} />
              {isExporting ? '打包中...' : canExportZip ? '导出图片 ZIP' : '等待人工审核通过'}
            </button>
            {exportStatus && <div className="generation-status success">{exportStatus}</div>}
            {savedZip && (
              <div className="saved-file-list">
                <a href={savedZip.fileUrl} target="_blank" rel="noreferrer">
                  <Archive size={14} />
                  {savedZip.filename}
                </a>
              </div>
            )}
          </div>
        </section>
      </div>

      <FocusFrame active={getFocusSignal(focusRequest, 'export')} className="right-column">
        <section className="panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Final Images</p>
              <h3>最终图清单</h3>
            </div>
          </div>
          <div className="export-preview-list">
            {exportPreviewRows.map(({ slot, brief, candidates, selectedRun, manualRunId, decision }) => (
              <div className="export-preview-card" key={slot.id}>
                <div className="export-preview-main">
                  <div className="export-preview-thumb">
                    {selectedRun?.imageSrc ? (
                      <img src={selectedRun.imageSrc} alt={brief.title || slot.title} />
                    ) : (
                      <FileImage size={28} />
                    )}
                  </div>
                  <div>
                    <span>{String(slot.id).padStart(2, '0')} · {brief.title || slot.title}</span>
                    <strong>{selectedRun ? getRunSourceLabel(selectedRun) : '暂无候选图'}</strong>
                    <p>
                      {isDecisionFullyApproved(decision) ? '人工已通过' : getDualReviewSummary(decision)}
                      {selectedRun ? ` · ${generationVerdicts[selectedRun.verdict]?.label || '未判断'} · ${selectedRun.outputPresetSize}` : ' · 需要先生成或导入图片'}
                    </p>
                  </div>
                </div>
                <div className="export-candidate-list">
                  <button
                    type="button"
                    className={!manualRunId ? 'export-candidate-chip active' : 'export-candidate-chip'}
                    disabled={!candidates.length}
                    onClick={() => onUpdateExportSelection(slot.id, '')}
                  >
                    自动最佳
                  </button>
                  {candidates.slice(0, 8).map((run) => (
                    <button
                      type="button"
                      className={selectedRun?.id === run.id ? 'export-candidate-chip active' : 'export-candidate-chip'}
                      key={run.id}
                      onClick={() => onUpdateExportSelection(slot.id, run.id)}
                    >
                      {generationVerdicts[run.verdict]?.label || '未判断'} · {getRunSourceLabel(run)}{getRunShortTime(run) ? ` · ${getRunShortTime(run)}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <ExportGate reviewDecisions={reviewDecisions} storyboardBriefs={storyboardBriefs} />
        </section>
      </FocusFrame>
    </section>
  );
}

function App() {
  const initialProjects = useMemo(() => loadStoredProjects(), []);
  const hasStoredProjects = initialProjects.length > 0;
  const initialProject = initialProjects[0] || createProjectRecord(blankProjectForm, [], createProjectId());
  const initialBrands = useMemo(() => loadStoredBrands(), []);
  const [selectedSlot, setSelectedSlot] = useState(() => getActiveSlots(initialProject.storyboardBriefs || [])[0] || slots[0]);
  const [activeTab, setActiveTab] = useState('storyboard');
  const [activeSection, setActiveSection] = useState(hasStoredProjects ? 'storyboard' : 'project');
  const [projects, setProjects] = useState(initialProjects);
  const [brandLibrary, setBrandLibrary] = useState(initialBrands);
  const [activeProjectId, setActiveProjectId] = useState(initialProject.id);
  const [projectForm, setProjectForm] = useState(initialProject.form);
  const [ledgerFacts, setLedgerFacts] = useState(initialProject.ledgerFacts);
  const [storyboardBriefs, setStoryboardBriefs] = useState(initialProject.storyboardBriefs || []);
  const [reviewDecisions, setReviewDecisions] = useState(initialProject.reviewDecisions || createReviewDecisions(initialProject.storyboardBriefs || []));
  const [generationRuns, setGenerationRuns] = useState(normalizeGenerationRuns(initialProject.generationRuns));
  const [promptOverrides, setPromptOverrides] = useState(initialProject.promptOverrides || {});
  const [exportSelections, setExportSelections] = useState(initialProject.exportSelections || {});
  const [activeRole, setActiveRole] = useState('human');
  const [saveStatus, setSaveStatus] = useState('');
  const [focusRequest, setFocusRequest] = useState(null);
  const [isPlanningStoryboard, setIsPlanningStoryboard] = useState(false);
  const [regeneratingSlotId, setRegeneratingSlotId] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const apply = (clientX, clientY) => {
      root.style.setProperty('--mx', `${clientX}px`);
      root.style.setProperty('--my', `${clientY}px`);
    };
    const onMove = (event) => {
      if (frame) return;
      const { clientX, clientY } = event;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        apply(clientX, clientY);
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  const activeSlots = useMemo(() => getActiveSlots(storyboardBriefs), [storyboardBriefs]);
  const approvedCount = useMemo(
    () => activeSlots.filter((slot) => isDecisionFullyApproved(getReviewDecision(reviewDecisions, slot.id, storyboardBriefs))).length,
    [activeSlots, reviewDecisions, storyboardBriefs]
  );
  const reviewCount = useMemo(
    () => reviewDecisions.filter((decision) => decision.status === 'review').length,
    [reviewDecisions]
  );
  const reworkCount = useMemo(
    () => reviewDecisions.filter((decision) => decision.status === 'rework' || decision.status === 'blocked').length,
    [reviewDecisions]
  );
  const generationQuality = useMemo(
    () => getGenerationQualityStats(generationRuns),
    [generationRuns]
  );
  const blockedFacts = useMemo(
    () => ledgerFacts.filter((fact) => fact.state === 'blocked' || (!fact.state && fact.allowed === false)).length,
    [ledgerFacts]
  );
  const currentNav = [...navItems, ...globalNavItems].find((item) => item.id === activeSection) || navItems[1];
  const currentProject = projects.find((project) => project.id === activeProjectId);
  const slotTotal = activeSlots.length || STORYBOARD_SLOT_COUNT;
  const currentProductLock = getProjectProductLock(projectForm);
  const productLockChanged = currentProject ? !isSameProductLock(currentProject, projectForm) : false;
  const hasReferenceImage = Boolean(projectForm.sourceImageName || projectForm.sourceImagePreview);
  const hasLedgerDraft = ledgerFacts.length > 0;
  const hasStoryboardBriefs = storyboardBriefs.length === STORYBOARD_SLOT_COUNT;
  const exportReady = hasStoryboardBriefs
    && activeSlots.length > 0
    && activeSlots.every((slot) => isDecisionFullyApproved(getReviewDecision(reviewDecisions, slot.id, storyboardBriefs)));
  const workflowGuideSteps = [
    {
      id: 'image',
      title: '上传产品图',
      helper: hasReferenceImage ? '产品参考图已就绪，可以继续整理卖点。' : '先上传一张白底产品图，后面的生成都会以它为准。',
      summary: hasReferenceImage ? projectForm.sourceImageName || '已上传' : '等待上传',
      action: hasReferenceImage ? '查看产品图' : '去上传',
      target: 'project',
      anchor: 'image-upload',
      icon: Upload,
      status: hasReferenceImage ? 'done' : 'current'
    },
    {
      id: 'ledger',
      title: '确认卖点',
      helper: hasLedgerDraft ? '卖点草稿已生成，下一步可以规划图片。' : '把卖点按行填好，再确认哪些可以上图。',
      summary: hasLedgerDraft ? `${ledgerFacts.length} 个卖点` : '等待卖点草稿',
      action: hasLedgerDraft ? '查看卖点' : '去确认',
      target: hasLedgerDraft ? 'ledger' : 'project',
      anchor: hasLedgerDraft ? 'ledger-table' : 'claims',
      icon: ClipboardCheck,
      status: hasLedgerDraft ? 'done' : hasReferenceImage ? 'current' : 'waiting'
    },
    {
      id: 'storyboard',
      title: '规划图片',
      helper: hasStoryboardBriefs ? '7 张图片方案已生成，下一步可以生成候选图。' : 'AI 会按产品和卖点选择图片角色，不再强行套固定模板。',
      summary: hasStoryboardBriefs ? `${slotTotal} 个图片角色` : hasLedgerDraft ? '可以开始' : '等待卖点',
      action: hasStoryboardBriefs ? '查看图片方案' : '生成图片方案',
      target: 'storyboard',
      anchor: 'storyboard',
      icon: Layers,
      status: hasStoryboardBriefs ? 'done' : hasLedgerDraft ? (activeSection === 'storyboard' ? 'current' : 'ready') : 'waiting'
    },
    {
      id: 'generation',
      title: '生成候选图',
      helper: generationQuality.total
        ? '继续积累候选图质量数据，观察哪些图片最容易出问题。'
        : '先生成少量候选图，判断产品是否保持一致。',
      summary: generationQuality.total
        ? `${generationQuality.reviewed}/${generationQuality.total} 已判断 · ${generationQuality.usableRate}% 可用`
        : hasStoryboardBriefs ? '等待验证' : '等待方案',
      action: '去生成图片',
      target: 'generation',
      anchor: 'generation',
      icon: Sparkles,
      status: activeSection === 'generation' ? 'current' : hasStoryboardBriefs ? 'ready' : 'waiting'
    },
    {
      id: 'review',
      title: '审核图片',
      helper: exportReady ? '图片已完成人工审核，下一步可以导出。' : '检查物理逻辑、产品漂移、合规文案和需证据卖点。',
      summary: exportReady ? '审核完成' : hasStoryboardBriefs ? '待复核' : '等待方案',
      action: exportReady ? '去导出图片' : '查看审核',
      target: 'review',
      anchor: 'review',
      icon: ShieldCheck,
      status: exportReady ? 'done' : activeSection === 'review' ? 'current' : 'waiting'
    },
    {
      id: 'export',
      title: '导出图片',
      helper: '全部图片人工审核通过后，选择最终图并导出 ZIP。',
      summary: `${approvedCount}/${slotTotal} 通过`,
      action: '查看导出',
      target: 'export',
      anchor: 'export',
      icon: Download,
      status: exportReady ? (activeSection === 'export' ? 'current' : 'ready') : 'waiting'
    }
  ];
  useEffect(() => {
    if (!activeSlots.some((slot) => slot.id === selectedSlot.id) && activeSlots[0]) {
      setSelectedSlot(activeSlots[0]);
    }
  }, [activeSlots, selectedSlot.id]);
  const persistProjects = (nextProjects) => {
    setProjects(nextProjects);
    storeProjects(nextProjects);
  };
  const updateBrandLibrary = (nextBrands) => {
    const normalized = normalizeBrandLibrary(nextBrands);
    setBrandLibrary(normalized);
    storeBrands(normalized);
    setSaveStatus('品牌库已保存');
  };
  const changePlanOutputPreset = (presetId) => {
    const nextPreset = getOutputPresetById(presetId);
    if (nextPreset.id === getProjectPlanOutputPresetId(projectForm)) return;
    const nextForm = {
      ...projectForm,
      planOutputPresetId: nextPreset.id
    };
    const nextProjectId = activeProjectId || createProjectId();
    setProjectForm(nextForm);
    setActiveProjectId(nextProjectId);
    setStoryboardBriefs([]);
    setReviewDecisions([]);
    setGenerationRuns([]);
    setPromptOverrides({});
    setExportSelections({});
    setSelectedSlot(slots[0]);
    const nextProject = createProjectRecord(nextForm, ledgerFacts, nextProjectId, [], [], [], {}, {});
    const nextProjects = projects.some((project) => project.id === nextProjectId)
      ? projects.map((project) => (project.id === nextProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus(`已切换为 ${nextPreset.label} 方案类型。旧方案和候选图已清空，请重新生成 7 图方案。`);
    navigateTo('storyboard', 'storyboard');
  };
  const navigateTo = (section, anchor) => {
    setActiveSection(section);
    setFocusRequest({ section, anchor, id: Date.now() });
  };
  const saveCurrentProject = () => {
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setActiveProjectId(nextProject.id);
    setSaveStatus(`已保存 ${formatProjectTime(nextProject.updatedAt)}`);
  };
  const selectProject = (projectId) => {
    const selectedProject = projects.find((project) => project.id === projectId);
    if (!selectedProject) return;
    setActiveProjectId(projectId);
    setProjectForm({ ...blankProjectForm, ...selectedProject.form });
    setLedgerFacts(selectedProject.ledgerFacts);
    setStoryboardBriefs(selectedProject.storyboardBriefs || []);
    setReviewDecisions(selectedProject.reviewDecisions || createReviewDecisions(selectedProject.storyboardBriefs || []));
    setGenerationRuns(normalizeGenerationRuns(selectedProject.generationRuns));
    setPromptOverrides(selectedProject.promptOverrides || {});
    setExportSelections(selectedProject.exportSelections || {});
    setSaveStatus('');
    setActiveSection('project');
  };
  const createNewProject = () => {
    const nextProject = createProjectRecord(blankProjectForm, [], createProjectId());
    const nextProjects = [nextProject, ...projects];
    persistProjects(nextProjects);
    setActiveProjectId(nextProject.id);
    setProjectForm(blankProjectForm);
    setLedgerFacts([]);
    setStoryboardBriefs([]);
    setReviewDecisions([]);
    setGenerationRuns([]);
    setPromptOverrides({});
    setExportSelections({});
    setSaveStatus('已创建新草稿');
    setActiveSection('project');
  };
  const deleteProject = (projectId) => {
    const remainingProjects = projects.filter((project) => project.id !== projectId);
    persistProjects(remainingProjects);
    if (projectId === activeProjectId) {
      const nextActiveProject = remainingProjects[0];
      if (nextActiveProject) {
        setActiveProjectId(nextActiveProject.id);
        setProjectForm({ ...blankProjectForm, ...nextActiveProject.form });
        setLedgerFacts(nextActiveProject.ledgerFacts);
        setStoryboardBriefs(nextActiveProject.storyboardBriefs || []);
        setReviewDecisions(nextActiveProject.reviewDecisions || createReviewDecisions(nextActiveProject.storyboardBriefs || []));
        setGenerationRuns(normalizeGenerationRuns(nextActiveProject.generationRuns));
        setPromptOverrides(nextActiveProject.promptOverrides || {});
        setExportSelections(nextActiveProject.exportSelections || {});
      } else {
        setActiveProjectId('');
        setProjectForm(blankProjectForm);
        setLedgerFacts([]);
        setStoryboardBriefs([]);
        setReviewDecisions([]);
        setGenerationRuns([]);
        setPromptOverrides({});
        setExportSelections({});
        setSelectedSlot(slots[0]);
      }
      setActiveSection('project');
    }
    setSaveStatus(remainingProjects.length ? '草稿已删除' : '草稿已全部删除，当前工作区已清空');
  };
  const generateLedgerDraft = (form, intakeMode) => {
    const draft = buildLedgerDraft(form, intakeMode);
    const lockMatches = currentProject ? isSameProductLock(currentProject, form) : true;
    setLedgerFacts(draft);
    setStoryboardBriefs([]);
    setReviewDecisions([]);
    const preservedGenerationRuns = lockMatches ? normalizeGenerationRuns(generationRuns) : [];
    const preservedPromptOverrides = lockMatches ? { ...promptOverrides } : {};
    const preservedExportSelections = lockMatches ? { ...exportSelections } : {};
    setGenerationRuns(preservedGenerationRuns);
    setPromptOverrides(preservedPromptOverrides);
    setExportSelections(preservedExportSelections);
    const nextProject = createProjectRecord(form, draft, activeProjectId, [], [], preservedGenerationRuns, preservedPromptOverrides, preservedExportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus(!lockMatches
      ? '检测到产品已变化：已生成新卖点草稿，并清空旧方案与旧生图记录，避免混入其他产品。'
      : preservedGenerationRuns.length
      ? `卖点草稿已生成，并已保留 ${preservedGenerationRuns.length} 条生图验证记录`
      : '卖点草稿已生成，并已自动保存');
    navigateTo('ledger', 'ledger-table');
  };
  const updateLedgerFact = (index, claim) => {
    const nextClaim = claim.trim();
    if (!nextClaim) return;
    const nextLedgerFacts = ledgerFacts.map((fact, currentIndex) => {
      if (currentIndex !== index) return fact;
      return {
        ...fact,
        claim: nextClaim,
        ...classifyClaim(nextClaim, 'manual'),
        source: 'manual-edit'
      };
    });
    setLedgerFacts(nextLedgerFacts);
    const nextProject = createProjectRecord(projectForm, nextLedgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus('卖点已更新，后续生成方案会使用最新卖点。');
  };
  const generateStoryboardBriefs = async () => {
    if (isPlanningStoryboard || regeneratingSlotId) return;
    if (!ledgerFacts.length) {
      setSaveStatus('请先填写卖点并生成卖点草稿');
      navigateTo('project', 'claims');
      return;
    }
    if (!getReferenceImage(projectForm)) {
      setSaveStatus('请先上传产品参考图');
      navigateTo('project', 'image-upload');
      return;
    }
    const refreshedLedgerFacts = refreshMachineDraftLedger(ledgerFacts, 'sku');
    const planningForm = {
      ...projectForm,
      planOutputPresetId: getProjectPlanOutputPresetId(projectForm)
    };
    setIsPlanningStoryboard(true);
    setSaveStatus(`正在根据产品图、卖点和品牌生成 ${getProjectPlanOutputPreset(planningForm).label} 方案...`);
    try {
      let briefs;
      let plannerMessage = 'AI 已根据产品图、卖点和品牌生成 7 图方案';
      const lockMatches = currentProject ? isSameProductLock(currentProject, projectForm) : true;
      try {
        const aiPlan = await planStoryboardWithApi(planningForm, refreshedLedgerFacts, brandLibrary);
        briefs = aiPlan.briefs;
        plannerMessage = `AI 已生成 ${getProjectPlanOutputPreset(planningForm).label} 方案：${aiPlan.productType || '已识别产品类型'} · ${aiPlan.model || 'planner'}`;
      } catch (error) {
        briefs = buildStoryboardBriefs(refreshedLedgerFacts, planningForm, brandLibrary);
        plannerMessage = `AI 方案暂不可用，已使用本地兜底方案。${error instanceof Error ? error.message : ''}`.trim();
      }
      const decisions = createReviewDecisions(briefs);
      const preservedGenerationRuns = lockMatches ? normalizeGenerationRuns(generationRuns) : [];
      const preservedPromptOverrides = lockMatches ? { ...promptOverrides } : {};
      const preservedExportSelections = lockMatches ? { ...exportSelections } : {};
      setLedgerFacts(refreshedLedgerFacts);
      setProjectForm(planningForm);
      setStoryboardBriefs(briefs);
      setReviewDecisions(decisions);
      setGenerationRuns(preservedGenerationRuns);
      setPromptOverrides(preservedPromptOverrides);
      setExportSelections(preservedExportSelections);
      setSelectedSlot(getActiveSlots(briefs)[0] || slots[0]);
      setActiveTab('storyboard');
      const nextProject = createProjectRecord(planningForm, refreshedLedgerFacts, activeProjectId || createProjectId(), briefs, decisions, preservedGenerationRuns, preservedPromptOverrides, preservedExportSelections);
      setActiveProjectId(nextProject.id);
      const nextProjects = projects.some((project) => project.id === nextProject.id)
        ? projects.map((project) => (project.id === nextProject.id ? nextProject : project))
        : [nextProject, ...projects];
      persistProjects(nextProjects);
      setSaveStatus(lockMatches
        ? `${plannerMessage}，并已保留 ${preservedGenerationRuns.length} 条生图验证记录。下一步可以进入生图任务`
        : `${plannerMessage}。检测到产品锁变化，旧生图记录已清空，避免混入其他产品。`);
      navigateTo('storyboard', 'storyboard');
    } finally {
      setIsPlanningStoryboard(false);
    }
  };
  const regenerateStoryboardSlot = async (slotId, role = activeRole) => {
    if (isPlanningStoryboard || regeneratingSlotId) return;
    if (!ledgerFacts.length) {
      setSaveStatus('请先填写卖点并生成卖点草稿');
      navigateTo('project', 'claims');
      return;
    }
    if (!getReferenceImage(projectForm)) {
      setSaveStatus('请先上传产品参考图');
      navigateTo('project', 'image-upload');
      return;
    }

    const numericSlotId = Number(slotId);
    const refreshedLedgerFacts = refreshMachineDraftLedger(ledgerFacts, 'sku');
    setRegeneratingSlotId(numericSlotId);
    setSaveStatus(`正在重生成第 ${String(numericSlotId).padStart(2, '0')} 张图方案...`);
    try {
      let nextBrief;
      let plannerMessage = 'AI 已重生成当前图槽方案';
      try {
        const aiPlan = await planStoryboardWithApi(projectForm, refreshedLedgerFacts, brandLibrary);
        nextBrief = aiPlan.briefs.find((brief) => Number(brief.id) === numericSlotId);
        plannerMessage = `AI 已重生成第 ${String(numericSlotId).padStart(2, '0')} 张方案：${aiPlan.model || 'planner'}`;
      } catch (error) {
        const fallbackBriefs = buildStoryboardBriefs(refreshedLedgerFacts, projectForm, brandLibrary);
        nextBrief = fallbackBriefs.find((brief) => Number(brief.id) === numericSlotId);
        plannerMessage = `AI 局部方案暂不可用，已用本地兜底重生成当前图槽。${error instanceof Error ? error.message : ''}`.trim();
      }

      if (!nextBrief) {
        throw new Error('没有找到当前图槽的新方案。');
      }

      const previousBriefs = storyboardBriefs.length
        ? storyboardBriefs
        : buildStoryboardBriefs(refreshedLedgerFacts, projectForm, brandLibrary);
      const nextBriefs = previousBriefs.map((brief) => (
        Number(brief.id) === numericSlotId ? nextBrief : brief
      ));
      const nextDecisions = createReviewDecisions(nextBriefs, reviewDecisions).map((decision) => (
        decision.slotId === numericSlotId
          ? normalizeReviewDecision({
            slotId: numericSlotId,
            designStatus: 'review',
            opsStatus: 'review',
            status: 'review',
            note: '当前图槽方案已重生成，请重新确认方向、卖点和画面证明方式。',
            updatedAt: new Date().toISOString()
          }, getSlotFromBrief(nextBrief), nextBrief)
          : decision
      ));

      setLedgerFacts(refreshedLedgerFacts);
      setStoryboardBriefs(nextBriefs);
      setReviewDecisions(nextDecisions);
      setSelectedSlot(getSlotFromBrief(nextBrief));
      setActiveTab('storyboard');

      const nextProject = createProjectRecord(projectForm, refreshedLedgerFacts, activeProjectId, nextBriefs, nextDecisions, generationRuns, promptOverrides, exportSelections);
      const nextProjects = projects.some((project) => project.id === activeProjectId)
        ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
        : [nextProject, ...projects];
      persistProjects(nextProjects);
      setSaveStatus(`${plannerMessage}。其他图槽和已有生图记录已保留。`);
      navigateTo('storyboard', 'storyboard');
    } catch (error) {
      setSaveStatus(error instanceof Error ? `当前图槽重生成失败：${error.message}` : '当前图槽重生成失败，请稍后再试。');
    } finally {
      setRegeneratingSlotId(null);
    }
  };
  const updateReviewDecision = (slotId, role, status) => {
    const slot = activeSlots.find((item) => item.id === slotId) || getFallbackSlot(slotId);
    const brief = storyboardBriefs.find((item) => item.id === slotId);
    const normalized = reviewDecisions.length ? reviewDecisions : createReviewDecisions(storyboardBriefs);
    const nextDecisions = normalized.map((decision) => (
      decision.slotId === slotId ? updateDecisionByRole(decision, slot, brief, role, status) : decision
    ));
    setReviewDecisions(nextDecisions);
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, nextDecisions, generationRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus(`${slot?.title || '图槽'} 已由${reviewerRoles[role]?.label || '审核人'}标记为${reviewStatusMeta[status]?.text || '待审核'}，已自动保存`);
  };
  const saveGenerationRun = (run) => {
    const nextRuns = normalizeGenerationRuns([stripTransientGenerationRun(run), ...generationRuns]).slice(0, QUALITY_MAX_STORED_RUNS);
    setGenerationRuns(nextRuns);
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, nextRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus('候选图已记录，请标记可用性');
  };
  const saveGenerationRuns = (runs) => {
    const normalizedRuns = normalizeGenerationRuns(runs.map(stripTransientGenerationRun));
    const newRunIds = new Set(normalizedRuns.map((run) => run.id));
    const nextRuns = normalizeGenerationRuns([
      ...normalizedRuns,
      ...generationRuns.filter((run) => !newRunIds.has(run.id))
    ]).slice(0, QUALITY_MAX_STORED_RUNS);
    setGenerationRuns(nextRuns);
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, nextRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus(`批量验证已保存 ${normalizedRuns.length} 张候选图`);
  };
  const updateGenerationRun = (runId, patch) => {
    const nextRuns = normalizeGenerationRuns(generationRuns.map((run) => (
      run.id === runId ? { ...run, ...patch, updatedAt: new Date().toISOString() } : run
    )));
    setGenerationRuns(nextRuns);
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, nextRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus('质量判断已自动保存');
  };
  const updatePromptOverride = (slotId, value) => {
    const nextOverrides = {
      ...promptOverrides,
      [slotId]: value
    };
    if (!value) delete nextOverrides[slotId];
    setPromptOverrides(nextOverrides);
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, nextOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus(value ? '图槽调优规则已保存' : '图槽调优规则已清空');
  };
  const updateExportSelection = (slotId, runId) => {
    const nextSelections = {
      ...exportSelections,
      [slotId]: runId
    };
    if (!runId) delete nextSelections[slotId];
    setExportSelections(nextSelections);
    const slot = activeSlots.find((item) => item.id === slotId) || getFallbackSlot(slotId);
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, promptOverrides, nextSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    setSaveStatus(runId ? `${slot?.title || '图槽'} 最终图已指定` : `${slot?.title || '图槽'} 已恢复自动选择`);
  };
  const continueToStoryboard = () => {
    navigateTo('storyboard', 'storyboard');
  };
  const goGeneration = () => {
    setActiveSection('generation');
    navigateTo('generation', 'generation');
  };
  const goReview = () => {
    setActiveSection('review');
    navigateTo('review', 'review');
  };

  const pageMap = {
    project: (
      <ProjectPage
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        brandLibrary={brandLibrary}
        ledgerFacts={ledgerFacts}
        productLockChanged={productLockChanged}
        productLockValue={currentProductLock}
        onGenerateLedgerDraft={generateLedgerDraft}
        onContinueToStoryboard={continueToStoryboard}
        onSaveProject={saveCurrentProject}
        onManageLedger={() => navigateTo('ledger', 'ledger')}
        saveStatus={saveStatus}
        focusRequest={focusRequest}
      />
    ),
    brands: (
      <BrandLibraryPage
        brandLibrary={brandLibrary}
        onUpdateBrands={updateBrandLibrary}
        focusRequest={focusRequest}
      />
    ),
    quality: (
      <QualityConsolePage
        projectForm={projectForm}
        storyboardBriefs={storyboardBriefs}
        generationRuns={generationRuns}
        selectedSlot={selectedSlot}
        promptOverrides={promptOverrides}
        onSaveGenerationRuns={saveGenerationRuns}
        onUpdatePromptOverride={updatePromptOverride}
        focusRequest={focusRequest}
      />
    ),
    ledger: <LedgerPage ledgerFacts={ledgerFacts} onUpdateFact={updateLedgerFact} focusRequest={focusRequest} />,
    storyboard: (
      <StoryboardPage
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ledgerFacts={ledgerFacts}
        projectForm={projectForm}
        storyboardBriefs={storyboardBriefs}
        reviewDecisions={reviewDecisions}
        onChangePlanOutputPreset={changePlanOutputPreset}
        isPlanningStoryboard={isPlanningStoryboard}
        regeneratingSlotId={regeneratingSlotId}
        onUpdateReview={updateReviewDecision}
        onGenerateStoryboardBriefs={generateStoryboardBriefs}
        onRegenerateStoryboardSlot={regenerateStoryboardSlot}
        onGoGeneration={goGeneration}
        onManageLedger={() => navigateTo('ledger', 'ledger')}
        focusRequest={focusRequest}
      />
    ),
    generation: (
      <GenerationPage
        projectForm={projectForm}
        storyboardBriefs={storyboardBriefs}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        generationRuns={generationRuns}
        promptOverrides={promptOverrides}
        brandLibrary={brandLibrary}
        onSaveGenerationRun={saveGenerationRun}
        onSaveGenerationRuns={saveGenerationRuns}
        onUpdateGenerationRun={updateGenerationRun}
        onUpdatePromptOverride={updatePromptOverride}
        onGoReview={goReview}
        focusRequest={focusRequest}
      />
    ),
    review: (
      <ReviewPage
        ledgerFacts={ledgerFacts}
        storyboardBriefs={storyboardBriefs}
        reviewDecisions={reviewDecisions}
        generationRuns={generationRuns}
        onUpdateReview={updateReviewDecision}
        onManageLedger={() => navigateTo('ledger', 'ledger')}
        focusRequest={focusRequest}
      />
    ),
    export: (
      <ExportPage
        projectForm={projectForm}
        storyboardBriefs={storyboardBriefs}
        reviewDecisions={reviewDecisions}
        generationRuns={generationRuns}
        exportSelections={exportSelections}
        onUpdateExportSelection={updateExportSelection}
        focusRequest={focusRequest}
      />
    )
  };

  return (
    <main className="app-shell">
      <div className="dot-grid" aria-hidden="true" />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BrandLogo size={26} />
          </div>
          <div>
            <h1>ListingFlow</h1>
            <p>Amazon image workflow</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Workflow">
          {navItems.map(({ id, label }, index) => {
            const stepStatus = workflowGuideSteps[index]?.status || 'waiting';
            const isActive = activeSection === id;
            return (
              <button
                className={`nav-item ${stepStatus}${isActive ? ' active' : ''}`}
                key={id}
                onClick={() => setActiveSection(id)}
              >
                <span className="nav-step" aria-hidden="true">
                  {stepStatus === 'done' ? <Check size={14} /> : index + 1}
                </span>
                <span className="nav-label">{label}</span>
              </button>
            );
          })}
        </nav>

        <ProjectList
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={selectProject}
          onCreateProject={createNewProject}
          onDeleteProject={deleteProject}
        />

        <div className="sidebar-bottom">
          {globalNavItems.map(({ id, label, icon: Icon, subtitle }) => (
            <button
              className={activeSection === id ? 'global-nav-button active' : 'global-nav-button'}
              key={id}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={17} />
              <span>
                <strong>{label}</strong>
                <small>{subtitle}</small>
              </span>
            </button>
          ))}

          <div className="sidebar-card">
            <p className="eyebrow">当前项目</p>
            <h2>{getProjectTitle(projectForm)}</h2>
            <div className="small-row">
              <LockKeyhole size={14} />
              {projectForm.sourceImageName || currentProject?.form?.sourceImageName || '等待上传白底图'}
            </div>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{currentNav.eyebrow}</p>
            <h2>{currentNav.title}</h2>
            <p className="topbar-subtitle">{currentNav.subtitle}</p>
          </div>
          <div className="topbar-context">
            <span>
              <LockKeyhole size={15} />
              {getProjectTitle(projectForm)}
            </span>
            <button className="secondary-button" onClick={() => navigateTo('project', 'image-upload')}>
              <Upload size={17} />
              更换产品图
            </button>
          </div>
        </header>

        <WorkflowGuide steps={workflowGuideSteps} activeSection={activeSection} onNavigate={navigateTo} />

        <section className="status-strip" aria-label="项目状态">
          <span><strong>{approvedCount}/{slotTotal}</strong> 人工通过</span>
          <span><strong>{reviewCount + reworkCount}</strong> 待处理</span>
          <span><strong>{blockedFacts}</strong> 禁用卖点</span>
        </section>

        {pageMap[activeSection]}
      </section>

      <nav className="mobile-tabbar" aria-label="工作流">
        {navItems.map(({ id, icon: Icon }, index) => {
          const stepStatus = workflowGuideSteps[index]?.status || 'waiting';
          const isActive = activeSection === id;
          return (
            <button
              className={`${isActive ? 'active' : ''}${stepStatus === 'done' ? ' done' : ''}`}
              key={id}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={20} />
              <span>{mobileTabLabels[id]}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
