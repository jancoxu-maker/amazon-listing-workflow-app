import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  Eye,
  EyeOff,
  FileImage,
  FileText,
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
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UsersRound,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { appLogger, installGlobalErrorLogging } from './eventLogger.js';
import {
  MARKETPLACE_OPTIONS,
  OUTPUT_LANGUAGE_OPTIONS,
  getMarketplaceOption,
  getOutputLanguageOption,
  getShortCopyDescription,
  getVisibleCopyLanguageInstruction,
  normalizeProjectLanguageFields
} from '../shared/output-language.mjs';
import {
  formatStoryboardSlotContract,
  normalizeStoryboardSlotContract
} from '../shared/storyboard-contract.mjs';
import {
  activateTeamInvite,
  assignTeamProject,
  cancelGenerationTask,
  cloneTeamBrand,
  createTeamBrand,
  createTeamProject,
  deleteTeamBrand,
  getAccessToken,
  getTeamBrandVersion,
  listAdminGenerationTasks,
  listGenerationTasks,
  listTeamBrandVersions,
  listTeamBrands,
  listTeamUsers,
  listTeamProjects,
  listTrashedTeamProjects,
  loginTeamAccount,
  logoutTeamSession,
  restoreTeamSession,
  signProjectAssets,
  restoreTrashedTeamProject,
  trashTeamProject,
  uploadTeamBrandLogo,
  uploadTeamBrandExample,
  uploadTeamProjectAsset,
  updateTeamBrand,
  updateTeamProject,
  upgradeTeamProjectBrandSnapshot
} from './teamApi.js';
import './styles.css';
import './vistamz-ui.css';
import './vistamz-bridge.css';
import './vistamz-conformance.css';

const PROJECTS_STORAGE_KEY = 'listingflow.projects.v1';
const BRAND_LIBRARY_STORAGE_KEY = 'listingflow.brands.v1';
const INVITE_ACCESS_STORAGE_KEY = 'vistamz.inviteAccess.v1';
const IMAGE_API_BASE_URL = import.meta.env.VITE_IMAGE_API_BASE_URL || 'http://localhost:5174';
const OPERATOR_VISIBLE_PROJECT_STATUSES = new Set(['review', 'approved', 'exported']);

function isOperatorVisibleProject(project = {}) {
  return OPERATOR_VISIBLE_PROJECT_STATUSES.has(project.cloud?.status);
}

function authenticatedJsonHeaders() {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}
const inviteAccessCodes = [
  { label: '内测邀请码 01', role: 'tester', hash: '48f3e317987ea2d51b3ca8dfd17c95eddbeb5f186715be4cf2d0f8709f0519db' },
  { label: '内测邀请码 02', role: 'tester', hash: 'fc59c6c106d2378251a1873a68652192541fa07477f69f44af7b8ccb57d8edb3' },
  { label: '内测邀请码 03', role: 'tester', hash: '20fefd0ca681e1f439db7e70fd007b05972172acde4628ac95093b99aa767dbf' },
  { label: '内测邀请码 04', role: 'tester', hash: '9b058607078caec1266439fbbe95bcc2dca4f67984d86f586dcd5cb8732f63a0' },
  { label: '内测邀请码 05', role: 'tester', hash: 'b1d010aad39db84d7a2bdd55513180c74e8febb7514a29f76a4c276b5e9f409e' },
  { label: '管理员码', role: 'admin', hash: '2e803afc924afa7fbf912b121e74b26286e00b96995173acde634f58534b7cca' }
];
const helloCloud = [
  { text: '你好', top: '10%', left: '5%', size: '32px', delay: '-4s', duration: '25s' },
  { text: 'Hello', top: '18%', left: '72%', size: '46px', delay: '-11s', duration: '31s' },
  { text: 'Hola', top: '31%', left: '18%', size: '24px', delay: '-7s', duration: '27s' },
  { text: 'Bonjour', top: '43%', left: '66%', size: '30px', delay: '-14s', duration: '34s' },
  { text: 'Hallo', top: '58%', left: '8%', size: '52px', delay: '-18s', duration: '36s' },
  { text: 'Ciao', top: '67%', left: '78%', size: '26px', delay: '-2s', duration: '24s' },
  { text: 'Olá', top: '79%', left: '22%', size: '38px', delay: '-9s', duration: '32s' },
  { text: 'Hej', top: '25%', left: '45%', size: '20px', delay: '-20s', duration: '29s' },
  { text: 'こんにちは', top: '72%', left: '48%', size: '28px', delay: '-13s', duration: '35s' },
  { text: '안녕하세요', top: '7%', left: '38%', size: '22px', delay: '-6s', duration: '26s' },
  { text: 'สวัสดี', top: '50%', left: '32%', size: '42px', delay: '-16s', duration: '33s' },
  { text: 'مرحباً', top: '88%', left: '63%', size: '24px', delay: '-23s', duration: '37s' }
];
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
    helper: '确认运营审核已完成后，进行最终放行、退回或禁止导出。',
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
    composition: '用品牌化横幅版式展示产品核心定位，可使用场景、背景色、产品大图和项目目标语言的短标题，不要求白底。',
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

function BrandLogo({ size = 26 }) {
  return (
    <img src="/favicon.svg" width={size} height={size} alt="" aria-hidden="true" />
  );
}

function BrandLockup({ inverse = false, className = '', source = '' }) {
  return (
    <img
      className={className}
      src={source || (inverse ? '/vistamz-lockup-white.svg' : '/vistamz-lockup-ink.svg')}
      alt="Vistamz"
    />
  );
}

function BrandLogoMark({ size = 96 }) {
  return (
    <svg
      className="auth-logo-mark"
      width={size}
      height={size}
      viewBox="0 0 329.32 329.44"
      aria-hidden="true"
    >
      <path d="M179.81,208.73c-.9,1-1.67,1.73-2.41,2.55-9.73,10.67-22,15.24-36.24,15.38-6.14.05-12.24-.21-18.1-2.24-10.32-3.56-17.34-10.47-20.35-21-3.33-11.69-2.95-23.28,2.4-34.36,4.78-9.88,12.77-16.37,22.79-20.47,8.94-3.66,18.38-5.19,27.91-6.24,5.84-.65,11.7-1.14,17.56-1.68.74-.07,1.22-.2,1.19-1.12-.13-4.1-.05-8.21-.35-12.3-.66-8.69-6.47-13-14.23-13.88a24.43,24.43,0,0,0-11.45,1.23c-5.83,2.16-9.63,6.24-11,12.23-1.1,4.7-3,5.72-7.71,5.1-6.53-.84-13.08-1.48-19.62-2.14-3.91-.39-5.45-2.27-4.58-6.1,3.09-13.54,10.71-23.61,23.23-29.81,11-5.44,22.72-7.08,34.82-6.74A61.9,61.9,0,0,1,189.49,93c12,5.83,18.84,15.37,19.61,28.63.66,11.4.45,22.84.6,34.27.12,8.91.18,17.82.29,26.73a22.52,22.52,0,0,0,4.38,12.91c1.5,2.14,3.08,4.22,4.61,6.34,1.9,2.63,1.58,5-.85,7.13q-8.16,7-16.29,14.11c-.49.43-1,.87-1.49,1.27-2.41,1.91-4.76,2-7.14.08a56,56,0,0,1-11.76-13.23ZM174.3,160c-2.25,0-4.53-.11-6.79,0A55.56,55.56,0,0,0,152,162.81c-4.77,1.71-8.93,4.26-11.67,8.66a24.78,24.78,0,0,0-3.1,19.11c1.47,6.56,6.08,10.4,12.75,11.14a21,21,0,0,0,21.08-12.25,31,31,0,0,0,3.17-12.23C174.44,171.49,174.3,165.72,174.3,160Z" />
      <path d="M160.44,268.3c-24.36-.43-46.51-5.67-67.43-16a155.14,155.14,0,0,1-40-28.6c-1-1-1.21-2.11-.53-3s1.95-.95,3.29-.18c5.74,3.3,11.37,6.81,17.26,9.81a199.11,199.11,0,0,0,163.55,8.05c2.87-1.11,5.69-2.34,8.53-3.51a8.55,8.55,0,0,1,.92-.34,3.51,3.51,0,0,1,4.24,1.55c.61,1.25.11,2.63-1.39,3.87A108.67,108.67,0,0,1,226,254a149.79,149.79,0,0,1-37.95,11.79A157.14,157.14,0,0,1,160.44,268.3Z" />
      <path d="M286.13,96.05a12.25,12.25,0,0,1-1.55.74c-2.41.69-4.9,1.17-7.24,2-7.89,3-12.37,9-14.65,16.83-.38,1.3-.58,2.65-1,3.94-.13.45-.62.79-.94,1.18a4.2,4.2,0,0,1-.82-1.15c-.58-2-1-4-1.63-5.93-2.87-8.74-9.06-13.86-17.82-16.11-1.17-.31-2.37-.48-3.53-.82-.41-.12-.72-.55-1.08-.85.37-.29.7-.72,1.13-.85,2.22-.69,4.5-1.18,6.69-2,8.28-3,13.1-9.06,15.22-17.45.33-1.31.55-2.65.92-4a4.82,4.82,0,0,1,.87-1.24,4.86,4.86,0,0,1,.91,1.21c1,3.1,1.64,6.34,2.92,9.31,3.3,7.6,9.71,11.39,17.38,13.45.94.26,1.92.39,2.86.66A6.32,6.32,0,0,1,286.13,96.05Z" />
      <path d="M245.49,226.48c-4.41.5-8.94,1-13.48,1.52-1.1.12-2.54.73-3.07-.75s.75-2.19,1.74-2.88a35.51,35.51,0,0,1,15.16-5.74,44.85,44.85,0,0,1,19.56.72c3,.86,4,1.94,4,5.09.14,12.49-3.83,23.42-12.71,32.4a4.31,4.31,0,0,1-1.56,1.14,2.39,2.39,0,0,1-1.91,0,2.07,2.07,0,0,1-.38-1.84c.64-2,1.48-3.92,2.2-5.89a71.09,71.09,0,0,0,4.23-15.77c.65-5.2-.61-7-5.8-7.52C250.87,226.69,248.26,226.64,245.49,226.48Z" />
      <path d="M226,86.81a7.83,7.83,0,0,1-.64-1.25c-.35-1.26-.58-2.55-1-3.79-2.21-7-7.26-10.81-14.25-12.36a11.47,11.47,0,0,1-2.06-.85,9.57,9.57,0,0,1,2-1.09c5.13-1.33,9.76-3.49,12.32-8.41,1.24-2.4,1.84-5.14,2.77-7.71a7.84,7.84,0,0,1,.88-1.38,6.36,6.36,0,0,1,.78,1.32c.53,1.69.9,3.43,1.51,5.09,2.3,6.25,7.21,9.37,13.35,11,.59.16,1.2.23,1.76.43.27.09.46.4.69.61-.24.24-.44.58-.73.7a12.59,12.59,0,0,1-1.64.37c-8.12,1.75-12.95,6.76-14.68,14.84a12.54,12.54,0,0,1-.34,1.5A5.67,5.67,0,0,1,226,86.81Z" />
      <path d="M246,120.56c.78,2.93,1.43,5.91,3.7,8.12a14.68,14.68,0,0,0,7.91,3.69l0,.7c-2.92.57-5.75,1.3-7.89,3.47s-3,5-3.62,7.86h-.52c-.23-.69-.49-1.37-.68-2.07-.92-3.51-2.78-6.3-6.16-7.86a28.86,28.86,0,0,0-3.18-1c-.46-.15-.92-.32-1.38-.49l0-.37a7.13,7.13,0,0,1,1.26-.52c5.49-1.21,8.67-4.62,9.7-10.1a12.59,12.59,0,0,1,.42-1.36Z" />
    </svg>
  );
}

// Vistamz mark drawn once via stroke animation (no loop). Plays on mount.
function BrandLogoDraw({ className = '' }) {
  return (
    <svg
      className={`brand-draw ${className}`.trim()}
      viewBox="0 0 200.83 201.03"
      aria-hidden="true"
    >
      <path className="brand-draw-tri" pathLength="1" d="M 100.42,5.2 L 192.74,5.2 L 100.42,189.85 L 8.09,5.2 Z" />
      <path className="brand-draw-tri" pathLength="1" d="M 100.42,195.83 L 8.09,195.83 L 100.42,11.18 L 192.74,195.83 Z" />
      <line className="brand-draw-diag" pathLength="1" x1="74.08" y1="63.84" x2="140.08" y2="195.83" />
    </svg>
  );
}

function VistamzLoader({ size = 24, label = '正在处理', className = '' }) {
  return (
    <span
      className={`vz-logo-loader ${className}`.trim()}
      role="status"
      aria-label={label}
      style={{ '--vz-loader-size': `${size}px` }}
    >
      <svg className="vz-logo-loader__mark" viewBox="0 0 200.83 201.03" aria-hidden="true">
        <path className="vz-logo-loader__stroke vz-logo-loader__tri" pathLength="1" d="M 100.42,5.2 L 192.74,5.2 L 100.42,189.85 L 8.09,5.2 Z" />
        <path className="vz-logo-loader__stroke vz-logo-loader__tri" pathLength="1" d="M 100.42,195.83 L 8.09,195.83 L 100.42,11.18 L 192.74,195.83 Z" />
        <line className="vz-logo-loader__stroke vz-logo-loader__diag" pathLength="1" x1="74.08" y1="63.84" x2="140.08" y2="195.83" />
      </svg>
    </span>
  );
}

function normalizeInviteCode(value = '') {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

async function hashInviteCode(value) {
  const bytes = new TextEncoder().encode(normalizeInviteCode(value));
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function claimInviteCode(hash) {
  const startedAt = performance.now();
  const response = await fetch(`${IMAGE_API_BASE_URL}/api/claim-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    appLogger.log('auth.invite.claim_failed', {
      status: response.status,
      message: result.error || '邀请码验证服务暂不可用，请稍后再试。',
      durationMs: Math.round(performance.now() - startedAt)
    }, { level: 'warn' });
    throw new Error(result.error || '邀请码验证服务暂不可用，请稍后再试。');
  }
  appLogger.log('auth.invite.claim_success', {
    role: result.role,
    label: result.label,
    reusable: Boolean(result.reusable),
    durationMs: Math.round(performance.now() - startedAt)
  });
  return result;
}

function loadInviteAccess() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(INVITE_ACCESS_STORAGE_KEY) || 'null');
    if (!stored?.hash) return null;
    const match = inviteAccessCodes.find((item) => item.hash === stored.hash);
    return match ? { ...stored, role: match.role, label: match.label } : null;
  } catch {
    return null;
  }
}

function AuthVisualPanel() {
  return (
    <section className="auth-concept-visual" aria-label="Vistamz generative visual workspace">
      <div className="auth-concept-draw" aria-hidden="true">
        <svg viewBox="0 0 200.83 201.03" role="presentation">
          <path className="auth-concept-draw-line auth-concept-draw-triangle" pathLength="1" d="M 100.42,5.2 L 192.74,5.2 L 100.42,189.85 L 8.09,5.2 Z" />
          <path className="auth-concept-draw-line auth-concept-draw-triangle" pathLength="1" d="M 100.42,195.83 L 8.09,195.83 L 100.42,11.18 L 192.74,195.83 Z" />
          <line className="auth-concept-draw-line auth-concept-draw-diagonal" pathLength="1" x1="74.08" y1="63.84" x2="140.08" y2="195.83" />
        </svg>
      </div>
      <div className="auth-concept-brand-group">
        <BrandLockup inverse source="/vistamz-lockup-h-white.svg" className="auth-concept-brand" />
        <p>Make Value Visible.</p>
      </div>
    </section>
  );
}

function TeamAccessGate({ children }) {
  const [session, setSession] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [authMode, setAuthMode] = useState('activate');
  const [requestedRole, setRequestedRole] = useState('designer');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    restoreTeamSession()
      .then((nextSession) => {
        if (mounted && nextSession) setSession(nextSession);
      })
      .finally(() => {
        if (mounted) setIsRestoring(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!showCodeEntry) {
      setShowCodeEntry(true);
      return;
    }
    setIsChecking(true);
    setError('');
    try {
      let nextSession;
      if (authMode === 'login') {
        nextSession = await loginTeamAccount({ email, password });
        appLogger.log('auth.account.logged_in', { role: nextSession.user.role, userId: nextSession.user.id });
      } else {
        if (!code.trim()) {
          setError('请输入邀请码');
          return;
        }
        if (displayName.trim().length < 2) {
          setError('请输入至少两个字的姓名或昵称');
          return;
        }
        const hash = await hashInviteCode(code);
        nextSession = await activateTeamInvite({
          inviteHash: hash,
          displayName,
          email,
          requestedRole,
          password
        });
        appLogger.log('auth.invite.unlocked', {
          role: nextSession.user.role,
          userId: nextSession.user.id
        });
      }
      setSession(nextSession);
    } catch (error) {
      appLogger.error('auth.invite.error', error);
      setError(error instanceof Error ? error.message : '邀请码验证失败，请稍后再试');
    } finally {
      setIsChecking(false);
    }
  };

  const beginActivation = (role) => {
    setRequestedRole(role);
    setAuthMode('activate');
    setShowCodeEntry(true);
    setError('');
  };

  const beginLogin = () => {
    setAuthMode('login');
    setShowCodeEntry(true);
    setError('');
  };

  if (isRestoring) {
    return (
      <main className="auth-screen auth-concept-screen">
        <AuthVisualPanel />
        <section className="auth-concept-login-zone">
          <div className="auth-panel auth-concept-card auth-concept-loading vz-card">
            <VistamzLoader size={32} label="正在确认登录状态" />
            <p className="auth-loading">正在确认登录状态...</p>
          </div>
        </section>
      </main>
    );
  }

  if (session) {
    return children({ session, onLogout: async () => {
      await logoutTeamSession();
      setSession(null);
    } });
  }

  return (
    <main className="auth-screen auth-concept-screen">
      <AuthVisualPanel />
      <section className="auth-concept-login-zone">
        {!showCodeEntry && (
          <button className="auth-admin-corner vz-btn vz-btn--ghost" type="button" onClick={() => beginActivation('admin')}>
            <ShieldCheck size={16} />
            管理员入口
          </button>
        )}
        <section className="auth-panel auth-concept-card vz-card" aria-label="Vistamz 内测入口">
          <div className="auth-title auth-concept-title">
            <p className="auth-concept-card-eyebrow">Vistamz workspace</p>
            <h1>{!showCodeEntry ? '欢迎使用 Vistamz' : authMode === 'login' ? '欢迎回来' : '激活你的账号'}</h1>
            <p>{!showCodeEntry ? '选择你的身份，进入对应的工作空间。' : authMode === 'login' ? '使用已激活的公司账号继续工作。' : '填写账号信息并使用内测邀请码完成激活。'}</p>
          </div>
        {!showCodeEntry ? (
          <div className="auth-entry-options">
            <p className="auth-entry-label">你的工作身份</p>
            <div className="auth-entry-role-grid">
              <button className="vz-btn" type="button" onClick={() => beginActivation('designer')}>
                <PencilLine size={19} />
                <span><strong>设计</strong><small>项目资料、图片方案与生图</small></span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
              <button className="vz-btn" type="button" onClick={() => beginActivation('operator')}>
                <ClipboardCheck size={19} />
                <span><strong>运营</strong><small>卖点确认与最终图片审核</small></span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <button className="auth-existing-account vz-btn vz-btn--primary" type="button" onClick={beginLogin}>已有账号，直接登录</button>
          </div>
        ) : (
          <form className="auth-form visible" onSubmit={handleSubmit}>
            <button className="auth-back-link vz-btn vz-btn--ghost" type="button" onClick={() => { setShowCodeEntry(false); setError(''); setShowPassword(false); }}>返回身份选择</button>
            <>
              {authMode === 'activate' && <>
                {requestedRole !== 'admin' && <div className="auth-role-choice" role="group" aria-label="选择身份">
                  <button type="button" className={`vz-btn ${requestedRole === 'designer' ? 'active' : ''}`} onClick={() => setRequestedRole('designer')}>设计</button>
                  <button type="button" className={`vz-btn ${requestedRole === 'operator' ? 'active' : ''}`} onClick={() => setRequestedRole('operator')}>运营</button>
                </div>}
                {requestedRole === 'admin' && <p className="auth-admin-label">管理员激活</p>}
                <label>
                  <span>姓名或昵称</span>
                  <input className="vz-input" autoFocus value={displayName} onChange={(event) => { setDisplayName(event.target.value); setError(''); }} placeholder="例如：Ava" autoComplete="name" />
                </label>
              </>}
              <label>
                <span>公司邮箱</span>
                <input className="vz-input" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} placeholder="name@company.com" autoComplete="email" inputMode="email" />
              </label>
              <label>
                <span>密码</span>
                <span className="auth-password-field">
                  <input className="vz-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} placeholder={authMode === 'activate' ? '至少 10 位' : '输入账户密码'} autoComplete={authMode === 'activate' ? 'new-password' : 'current-password'} />
                  <button className="auth-password-toggle vz-btn vz-btn--ghost" type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? '隐藏密码' : '显示密码'} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
              {authMode === 'activate' && <label>
                <span>输入邀请码</span>
                <input className="vz-input" value={code} onChange={(event) => { setCode(event.target.value); setError(''); }} placeholder="VMZ-XXXX-0000" autoComplete="one-time-code" />
              </label>}
              <button
                className="auth-mode-link vz-btn vz-btn--ghost"
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'activate' ? 'login' : 'activate');
                  setError('');
                }}
              >
                {authMode === 'activate' ? '已有账号？登录' : '首次使用？用邀请码激活'}
              </button>
            </>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-enter-button vz-btn vz-btn--primary" disabled={isChecking}>
            {isChecking ? '正在验证...' : authMode === 'login' ? '登录 Vistamz' : '激活并进入'}
          </button>
          </form>
        )}
        </section>
        <p className="auth-concept-version">Vistamz · Internal preview</p>
      </section>
    </main>
  );
}

const globalNavItems = [
  {
    id: 'team',
    label: '团队协作',
    icon: UsersRound,
    eyebrow: 'Team',
    title: '项目分配',
    subtitle: '为每个项目指定设计与运营负责人。'
  },
  {
    id: 'quality',
    label: '质量 Console',
    icon: BarChart3,
    eyebrow: 'Quality',
    title: '质量 Console',
    subtitle: '查看质量样本、失败原因和 CSV。'
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

const brandColorRoleOptions = [
  { id: 'background', label: '背景/色块' },
  { id: 'accent', label: '强调/箭头' },
  { id: 'text', label: '标题/文字' },
  { id: 'neutral', label: '中性留白' }
];

const brandColorScopeOptions = [
  { id: 'secondary-and-aplus', label: '主图第 2-7 张 + A+' },
  { id: 'main-secondary', label: '仅主图第 2-7 张' },
  { id: 'aplus-only', label: '仅 A+' }
];

function getBrandColorRole(value, index = 0) {
  const match = brandColorRoleOptions.find((option) => option.id === value);
  if (match) return match;
  if (index === 0) return brandColorRoleOptions.find((option) => option.id === 'background');
  if (index === 1) return brandColorRoleOptions.find((option) => option.id === 'accent');
  return brandColorRoleOptions.find((option) => option.id === 'neutral');
}

function getBrandColorScope(value) {
  return brandColorScopeOptions.find((option) => option.id === value) || brandColorScopeOptions[0];
}

function normalizeBrandColorEntry(entry = {}, index = 0, fallbackRatio = 0) {
  if (typeof entry === 'string') {
    const match = entry.match(/(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?|[a-zA-Z ]+)\s*(\d{1,3})?%?/);
    const hex = normalizeHexColor(match?.[1] || entry);
    if (!hex) return null;
    return {
      id: `color-${index}-${hex.replace('#', '')}`,
      hex,
      ratio: Math.min(100, Math.max(1, Number(match?.[2]) || fallbackRatio || 1)),
      role: getBrandColorRole('', index).id,
      scope: getBrandColorScope('').id
    };
  }
  const hex = normalizeHexColor(entry.hex || entry.value || entry.color);
  if (!hex) return null;
  return {
    id: entry.id || `color-${index}-${hex.replace('#', '')}`,
    hex,
    ratio: Math.min(100, Math.max(1, Number(entry.ratio) || fallbackRatio || 1)),
    role: getBrandColorRole(entry.role, index).id,
    scope: getBrandColorScope(entry.scope).id
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

function isBrandColorApplicable(color = {}, outputPresetId = 'main-image', slotId = 1) {
  if (outputPresetId === 'main-image' && Number(slotId) === 1) return false;
  if (color.scope === 'aplus-only') return outputPresetId === 'aplus';
  if (color.scope === 'main-secondary') return outputPresetId === 'main-image' && Number(slotId) > 1;
  return outputPresetId === 'aplus' || (outputPresetId === 'main-image' && Number(slotId) > 1);
}

function formatBrandColorPalette(brand = {}, outputPresetId = 'main-image', slotId = 1) {
  const colors = normalizeBrandColors(brand.colors);
  const applicable = colors.filter((color) => isBrandColorApplicable(color, outputPresetId, slotId));
  return applicable.length
    ? applicable.map((color) => `${color.hex} ${color.ratio}% for ${color.role}; scope ${color.scope}`).join(', ')
    : 'no brand colors configured';
}

function validateBrandProfileForSave(brand = {}) {
  const colors = normalizeBrandColors(brand.colors);
  const exampleImages = Array.isArray(brand.exampleImages) ? brand.exampleImages : [];
  if (!String(brand.name || '').trim()) return '请填写品牌名。';
  if (exampleImages.length < 2 || exampleImages.length > 5) return '请上传 2–5 张品牌示例图。';
  if (!colors.length) return '请至少添加一个品牌色。';
  if (getBrandColorRatioTotal(colors) !== 100) return '品牌色使用比例合计必须等于 100%。';
  if (!colors.some((color) => color.role === 'background' || color.role === 'neutral')) {
    return '请至少设置一个“背景/色块”或“中性留白”颜色。';
  }
  if (!normalizeHexColor(brand.titleColor)) return '统一标题颜色必须是有效 HEX 色号。';
  return '';
}

const brandArrowStyleOptions = [
  {
    id: 'minimal-line',
    label: '细线箭头',
    prompt: 'Use thin clean line arrows with small arrowheads, minimal curves, no heavy shadows, and restrained brand-color accents.'
  },
  {
    id: 'soft-rounded',
    label: '圆角柔和',
    prompt: 'Use soft rounded arrows with gentle curves, medium stroke weight, subtle shadows, and friendly brand-color accents.'
  },
  {
    id: 'bold-callout',
    label: '醒目指示',
    prompt: 'Use bold ecommerce callout arrows with clear direction, simple geometry, high contrast, and no cartoon exaggeration.'
  },
  {
    id: 'no-arrows',
    label: '尽量不用箭头',
    prompt: 'Avoid arrows whenever possible. Prefer proximity, crops, labels, circles, subtle lines, or composition to connect text and product features.'
  }
];

const brandIconStyleOptions = [
  { id: 'outline', label: '简洁线性', prompt: 'Use consistent minimal outline icons with even stroke weight and no decorative fills.' },
  { id: 'solid', label: '简洁填充', prompt: 'Use simple solid icons with clear silhouettes, limited detail, and consistent optical size.' },
  { id: 'duotone', label: '双色层次', prompt: 'Use restrained two-tone icons using only configured brand colors and consistent layer treatment.' },
  { id: 'none', label: '尽量不用图标', prompt: 'Avoid decorative icons; rely on product evidence, typography, and layout.' }
];

const brandAnnotationStyleOptions = [
  { id: 'thin-straight', label: '细直线标注', prompt: 'Use thin straight annotation lines with precise endpoints and restrained spacing.' },
  { id: 'soft-curve', label: '柔和曲线标注', prompt: 'Use gentle curved annotation lines with clean endpoints and no visual clutter.' },
  { id: 'bracket', label: '括号式标注', prompt: 'Use compact bracket-style measurement and feature callouts with consistent line weight.' },
  { id: 'minimal', label: '极简短引线', prompt: 'Use only short minimal leader lines when proximity alone is insufficient.' }
];

const brandCornerStyleOptions = [
  { id: 'square', label: '直角', prompt: 'Use square corners for graphic blocks and labels.' },
  { id: 'soft-8', label: '轻圆角', prompt: 'Use restrained approximately 8px-equivalent visual corner rounding.' },
  { id: 'rounded-16', label: '明显圆角', prompt: 'Use consistent medium rounded corners, never pill-shaped for long text.' }
];

const brandLabelStyleOptions = [
  { id: 'plain', label: '纯文字标签', prompt: 'Use plain text labels without decorative containers whenever possible.' },
  { id: 'soft-box', label: '浅色信息框', prompt: 'Use compact softly rounded information boxes with high contrast and generous internal spacing.' },
  { id: 'solid-block', label: '品牌色块', prompt: 'Use compact solid brand-color label blocks with accessible contrasting text.' },
  { id: 'underline', label: '下划线强调', prompt: 'Use clean underline or rule accents instead of enclosed badges.' }
];

function getBrandStyleOption(options, optionId) {
  return options.find((option) => option.id === optionId) || options[0];
}

function normalizeBrandExampleImages(images = []) {
  return (Array.isArray(images) ? images : [])
    .map((image, index) => ({
      id: image?.id || `example-${Date.now()}-${index}`,
      name: String(image?.name || `品牌示例 ${index + 1}`).trim().slice(0, 80),
      caption: String(image?.caption || '').trim().slice(0, 160),
      storageKey: String(image?.storageKey || '').trim(),
      preview: String(image?.preview || '').trim()
    }))
    .filter((image) => image.storageKey || image.preview)
    .slice(0, 5);
}

function getBrandArrowStyle(optionId) {
  return brandArrowStyleOptions.find((option) => option.id === optionId) || brandArrowStyleOptions[0];
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
    arrowStyle: 'minimal-line',
    titleColor: '#18211F',
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
    arrowStyle: 'soft-rounded',
    titleColor: '#2F4A35',
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
    arrowStyle: 'bold-callout',
    titleColor: '#2F3432',
    styleRules: ['真实材质质感', '干净高对比', '避免廉价促销风']
  }
];

function normalizeBrandProfile(brand = {}) {
  return {
    id: brand.id || `brand-${Date.now()}`,
    name: brand.name || '未命名品牌',
    version: Number(brand.version || 0),
    updatedAt: brand.updatedAt || null,
    createdAt: brand.createdAt || null,
    createdBy: brand.createdBy || null,
    createdByName: brand.createdByName || '',
    tone: brand.tone || '清晰、真实、产品优先的 Amazon 电商风格',
    colors: normalizeBrandColors(brand.colors),
    backgroundPolicy: brand.backgroundPolicy || '02-07 可使用干净背景、品牌色块或真实场景；01 白底主图不使用。',
    scenes: Array.isArray(brand.scenes) ? brand.scenes : splitListText(brand.scenes),
    forbiddenStyles: Array.isArray(brand.forbiddenStyles) ? brand.forbiddenStyles : splitListText(brand.forbiddenStyles),
    logoPolicy: brand.id === 'none'
      ? '不展示 Logo'
      : 'Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示 Logo。',
    logoPreview: brand.logoPreview || '',
    logoStorageKey: brand.logoStorageKey || '',
    arrowStyle: getBrandArrowStyle(brand.arrowStyle).id,
    iconStyle: getBrandStyleOption(brandIconStyleOptions, brand.iconStyle).id,
    annotationStyle: getBrandStyleOption(brandAnnotationStyleOptions, brand.annotationStyle).id,
    cornerStyle: getBrandStyleOption(brandCornerStyleOptions, brand.cornerStyle).id,
    labelStyle: getBrandStyleOption(brandLabelStyleOptions, brand.labelStyle).id,
    titleColor: normalizeHexColor(brand.titleColor) || '#18211F',
    exampleImages: normalizeBrandExampleImages(brand.exampleImages),
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
  if (Object.prototype.hasOwnProperty.call(form, 'brandId')) {
    return String(form.brandId || 'none');
  }
  return inferBrandId(form, brands);
}

function getProjectScopedBrandLibrary(form = {}, project = {}, brands = defaultBrandLibrary) {
  const normalized = normalizeBrandLibrary(brands);
  const selectedBrandId = getProjectBrandId(form, normalized);
  const snapshot = project?.brandSnapshot;
  if (
    !snapshot?.rules
    || snapshot.brandId !== selectedBrandId
    || selectedBrandId === 'none'
  ) return normalized;

  const frozenBrand = normalizeBrandProfile({
    ...snapshot.rules,
    id: snapshot.brandId,
    name: snapshot.brandName || snapshot.rules.name,
    version: snapshot.brandVersion
  });
  return normalizeBrandLibrary([
    ...normalized.filter((brand) => brand.id !== selectedBrandId),
    frozenBrand
  ]);
}

function getProjectFrozenBrandProfile(form = {}, project = {}) {
  const selectedBrandId = getProjectBrandId(form, [{ id: 'none', name: '不指定品牌' }]);
  const snapshot = project?.brandSnapshot;
  if (selectedBrandId === 'none') return null;
  if (!snapshot?.rules || snapshot.brandId !== selectedBrandId || !Number(snapshot.brandVersion)) return null;
  return normalizeBrandProfile({
    ...snapshot.rules,
    id: snapshot.brandId,
    name: snapshot.brandName || snapshot.rules.name,
    version: Number(snapshot.brandVersion)
  });
}

function getProjectBrandVersionState(form = {}, project = {}, brands = [], brandLibraryStatus = 'ready') {
  const snapshot = project?.brandSnapshot || {};
  const selectedBrandId = getProjectBrandId(form, brands);
  if (selectedBrandId === 'none') return { kind: 'baseline', canUpgrade: false };
  if (!snapshot?.brandVersion || snapshot.brandId !== selectedBrandId) {
    return { kind: 'unsaved', canUpgrade: false, brandId: selectedBrandId };
  }
  const currentBrand = normalizeBrandLibrary(brands).find((brand) => brand.id === snapshot.brandId);
  const lockedVersion = Number(snapshot.brandVersion || 0);
  const latestVersion = Number(currentBrand?.version || 0);
  if (!currentBrand && brandLibraryStatus === 'ready') {
    return { kind: 'archived', canUpgrade: false, brandId: snapshot.brandId, lockedVersion };
  }
  if (!currentBrand || brandLibraryStatus !== 'ready') {
    return { kind: 'checking', canUpgrade: false, brandId: snapshot.brandId, lockedVersion };
  }
  return {
    kind: latestVersion > lockedVersion ? 'outdated' : 'current',
    canUpgrade: latestVersion > lockedVersion,
    brandId: snapshot.brandId,
    brandName: snapshot.brandName || currentBrand.name,
    lockedVersion,
    latestVersion
  };
}

const initialProjectForm = {
  sku: 'CL-LT-BAM-FOLD-001',
  brandId: 'cosyland',
  marketplaceId: 'amazon-us',
  outputLanguage: 'en-US',
  projectName: 'Cosyland learning tower',
  category: 'Learning tower / Toddler step stool',
  productName: 'Cosyland bamboo foldable learning tower',
  planOutputPresetId: 'main-image',
  sourceImageName: '画板 1.jpg',
  sourceImagePreview: sourceImage,
  sourceImageDisplayPreview: sourceImage,
  sourceImageAudit: null,
  referenceImages: {},
  keyPartsText: [
    'Top safety rail',
    'Standing platform',
    'Two front steps',
    'Folding side frame'
  ].join('\n'),
  immutablePartsText: [
    'Keep the original bamboo color and grain',
    'Do not change the number or position of steps, rails, fasteners, or support legs'
  ].join('\n'),
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
  marketplaceId: 'amazon-us',
  outputLanguage: 'en-US',
  projectName: '',
  category: '',
  productName: '',
  planOutputPresetId: 'main-image',
  sourceImageName: '',
  sourceImagePreview: '',
  sourceImageDisplayPreview: '',
  sourceImageAudit: null,
  referenceImages: {},
  keyPartsText: '',
  immutablePartsText: '',
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
const ESTIMATED_GENERATION_COST_USD = 0.04;
const IMAGE_CLAIM_POOL_LIMIT = 12;
const CLAIMS_PER_IMAGE_LIMIT = 3;
const STORYBOARD_SLOT_COUNT = 7;
const MAIN_MIN_SLOT_COUNT = 1;
const MAIN_MAX_SLOT_COUNT = 9;
const APLUS_MIN_MODULE_COUNT = 4;
const APLUS_MAX_MODULE_COUNT = 7;

function getOutputPresetById(presetId) {
  return outputPresets.find((preset) => preset.id === presetId) || outputPresets[0];
}

function getProjectPlanOutputPresetId(form = {}) {
  return form.planOutputPresetId === 'aplus' || form.planOutputPresetId === 'a-plus' ? 'aplus' : 'main-image';
}

function getProjectPlanOutputPreset(form = {}) {
  return getOutputPresetById(getProjectPlanOutputPresetId(form));
}

function isAPlusPlan(form = {}) {
  return getProjectPlanOutputPresetId(form) === 'aplus';
}

function getStoryboardTargetSlotCount(form = {}, ledgerFacts = []) {
  const override = Number(form.storyboardSlotCountOverride || 0);
  if (!isAPlusPlan(form)) {
    return override
      ? Math.min(MAIN_MAX_SLOT_COUNT, Math.max(MAIN_MIN_SLOT_COUNT, override))
      : STORYBOARD_SLOT_COUNT;
  }
  if (override) {
    return Math.min(APLUS_MAX_MODULE_COUNT, Math.max(APLUS_MIN_MODULE_COUNT, override));
  }
  const usableFactCount = ledgerFacts.filter((fact) => (
    fact.state === 'allowed' || fact.state === 'evidence' || fact.state === 'review'
  )).length;
  return Math.min(
    APLUS_MAX_MODULE_COUNT,
    Math.max(APLUS_MIN_MODULE_COUNT, Math.ceil(usableFactCount / 2) + 2)
  );
}

function isStoryboardPlanReady(storyboardBriefs = [], form = {}) {
  if (!Array.isArray(storyboardBriefs) || !storyboardBriefs.length) return false;
  const aPlus = isAPlusPlan(form) || storyboardBriefs[0]?.outputPresetId === 'aplus';
  const countValid = aPlus
    ? storyboardBriefs.length >= APLUS_MIN_MODULE_COUNT && storyboardBriefs.length <= APLUS_MAX_MODULE_COUNT
    : storyboardBriefs.length >= MAIN_MIN_SLOT_COUNT && storyboardBriefs.length <= MAIN_MAX_SLOT_COUNT;
  const uniqueIds = new Set(storyboardBriefs.map((brief) => Number(brief.id))).size === storyboardBriefs.length;
  const hasLanguageContext = Object.prototype.hasOwnProperty.call(form, 'marketplaceId')
    || Object.prototype.hasOwnProperty.call(form, 'outputLanguage');
  const hasOutputContext = Object.prototype.hasOwnProperty.call(form, 'planOutputPresetId');
  const targetLanguage = normalizeProjectLanguageFields(form).outputLanguage;
  const plannedLanguage = storyboardBriefs[0]?.outputLanguage || 'en-US';
  const targetOutputPreset = getProjectPlanOutputPresetId(form);
  const plannedOutputPreset = storyboardBriefs[0]?.outputPresetId || 'main-image';
  const contractValid = storyboardBriefs.every((brief, index) => {
    const isPrimaryAnchor = !aPlus && index === 0;
    return Boolean(
      String(brief?.composition || '').trim()
      && String(brief?.visualProof || '').trim()
      && (isPrimaryAnchor || String(brief?.primaryClaim || '').trim())
    );
  });
  return countValid
    && uniqueIds
    && contractValid
    && (!hasLanguageContext || targetLanguage === plannedLanguage)
    && (!hasOutputContext || targetOutputPreset === plannedOutputPreset);
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
    title: '加强目标语言文案',
    text: 'All visible generated copy must follow the project target language, use natural ecommerce wording, and be correctly spelled. Do not render mixed-language copy, garbled text, unsupported numbers, invented certifications, or unreadable labels.'
  },
  aesthetic: {
    title: '提升画面审美',
    text: 'Use a polished Amazon ecommerce layout with clean spacing, controlled lighting, refined edges, and a purposeful background. Avoid rough cutouts, jagged edges, clutter, generic decoration, or visually broken-looking details.'
  }
};

const listingImageStrategyRules = [
  'First principle: the image must visually prove the selected selling point. Use scene, product detail, physical state, comparison, scale, or structure as evidence before relying on explanatory text.',
  'For standard listing slot 01, the product should visually fill about 80-85% of the canvas, should not fall below 75% unless the product shape is unusually long or thin, and must remain fully visible without cropping or distortion.',
  'Minimize visible explanatory copy. Text is allowed when it improves clarity, but the image must not become a text poster. Prefer one short title or a few short labels in the project target language over paragraphs.',
  'Blocked or forbidden claims must not be stated, suggested, implied, staged, symbolized, or visually hinted as a benefit. You may show neutral factual product appearance or ordinary use only when it does not communicate the blocked claim.',
  'For standard listing images, if an image includes a title, place the title consistently at the top of the image. A+ content is an exception: title placement may follow the module layout and does not have to be at the top.',
  'Across the full standard listing image set, maintain a unified visual system: consistent typography, title placement, label style, spacing, icon/callout treatment, lighting quality, and overall ecommerce art direction.',
  'A+ modules may use richer and more varied section layouts, but the full A+ set must still share one brand visual system: consistent font style, heading hierarchy, title color, spacing rhythm, arrow/callout style, graphic blocks, image treatment, and ecommerce art direction.'
];

function getListingImageStrategyRules(form = {}) {
  return [...listingImageStrategyRules, getVisibleCopyLanguageInstruction(form)];
}

function getListingImageStrategyText(form = {}) {
  return getListingImageStrategyRules(form).join(' ');
}

const slotQualityGuardrails = {
  main: [
    'Primary image rule: preserve the original product as the hero. Do not add visible text, props, badges, lifestyle scenes, colored backgrounds, or extra accessories.',
    'Keep the product large, centered, and cleanly cut out on pure white without changing the silhouette.',
    'Product coverage rule: target 80-85% of the canvas, minimum 75% unless the product is unusually long or thin. Never crop or distort the product just to fill the frame.'
  ],
  benefits: [
    'Core benefits rule: show no more than three short callouts in the project target language. Each callout must point to a visible product feature or a visually demonstrated benefit.',
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
  'text-error': '下一轮先修文案：可见文字只用项目目标语言，并且必须来自 Ledger。',
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
    id: 'sideAlt',
    label: '其他角度图 2',
    helper: '建议。补充第二个不同角度，优先上传背面、底部或关键结构角度。',
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

function getClaimRiskMeta(fact = {}) {
  return {
    allowed: { label: '低风险', className: 'allowed' },
    evidence: { label: '需证据', className: 'evidence' },
    review: { label: '待核实', className: 'review' },
    blocked: { label: '禁止使用', className: 'blocked' }
  }[fact.state] || { label: '待核实', className: 'review' };
}

function formatClaimSource(source = '') {
  const normalized = String(source || '').toLowerCase();
  if (normalized.includes('merge')) return '人工合并';
  if (normalized.includes('edit')) return '人工编辑';
  if (normalized.includes('manual')) return '人工录入';
  if (normalized.includes('sku')) return 'SKU 草稿';
  if (normalized.includes('visible')) return '图片可见';
  if (normalized.includes('user')) return '用户提供';
  return '项目资料';
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

function getVisualProofInstruction(template = {}, primaryClaim = '', form = {}) {
  const claimText = primaryClaim ? `“${primaryClaim}”` : '该图槽主卖点';
  const proofMap = {
    main: '用白底清晰展示真实产品外观，证明产品存在、外观、材质和结构，不承载复杂卖点。',
    benefits: `围绕${claimText}做 1 个主视觉和少量${getShortCopyDescription(form)}标签，标签必须指向图片中可见的产品部位或使用结果。`,
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

  return getStoryboardTemplates(form, ledgerFacts)
    .slice(0, getStoryboardTargetSlotCount(form, ledgerFacts))
    .map((template) => {
    const claimLimit = aPlusMode ? CLAIMS_PER_IMAGE_LIMIT : template.visualType === 'main' ? 1 : CLAIMS_PER_IMAGE_LIMIT;
    const usableClaims = pickClaimsByTemplate(allowedClaims, template, claimLimit);
    const needsEvidence = pickClaimsByTemplate(evidenceClaims, template, template.evidenceLimit);
    const primaryClaim = usableClaims[0] || needsEvidence[0] || '';
    const visualProof = getVisualProofInstruction(template, primaryClaim, form);
    const slotContract = normalizeStoryboardSlotContract({
      slot: template,
      id: template.id,
      visualType: template.visualType,
      primaryClaim,
      visualProof,
      composition: template.composition,
      outputPresetId: outputPreset.id,
      outputPresetSize: outputPreset.size,
      projectForm: form,
      brand: brandProfile,
      blockedClaims,
      guardrails: template.guardrails
    });
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
      outputPresetSize: outputPreset.size,
      ...normalizeProjectLanguageFields(form),
      ...slotContract,
      productType,
      brandId: brandProfile.id,
      brandName: brandProfile.name,
      brandVersion: Number(brandProfile.version || 0),
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
        `Listing image strategy rules: ${getListingImageStrategyText(form)}`,
        template.composition,
        primaryClaim ? `Primary claim to prove visually: ${primaryClaim}.` : getNoPrimaryClaimInstruction(template),
        `Visual proof plan: ${visualProof}`,
        formatStoryboardSlotContract(slotContract),
        `Slot quality guardrail: ${getSlotQualityGuardrailText(template.visualType)}.`,
        usableClaims.length ? `Allowed claims: ${usableClaims.join('; ')}.` : 'No allowed claims assigned yet.',
        needsEvidence.length ? `Claims needing evidence before final export: ${needsEvidence.join('; ')}.` : '',
        blockedClaims.length ? `Do not mention or imply: ${blockedClaims.join('; ')}.` : '',
        template.guardrails.join('; ')
      ].filter(Boolean).join(' ')
    };
    });
}

function createOptionalStoryboardBrief({ id, form, ledgerFacts = [], existingBriefs = [], brands = defaultBrandLibrary }) {
  const outputPreset = getProjectPlanOutputPreset(form);
  const brandProfile = getBrandProfile(getProjectBrandId(form, brands), brands);
  const usedClaims = new Set(existingBriefs.map((brief) => brief.primaryClaim).filter(Boolean));
  const usableFact = ledgerFacts.find((fact) => (
    (fact.state === 'allowed' || fact.state === 'evidence') && !usedClaims.has(fact.claim)
  )) || ledgerFacts.find((fact) => fact.state === 'allowed' || fact.state === 'evidence');
  const primaryClaim = String(usableFact?.claim || '').trim();
  const aPlusMode = isAPlusPlan(form);
  const blockedClaims = ledgerFacts
    .filter((fact) => fact.state === 'blocked' || (!fact.state && fact.allowed === false))
    .map((fact) => fact.claim)
    .slice(0, 12);
  const title = aPlusMode ? 'Supporting Content Module' : 'Supporting Benefit';
  const goal = primaryClaim ? `补充展示：${primaryClaim}` : '补充一个尚未覆盖的产品卖点';
  const visualProof = primaryClaim
    ? `Use a product detail, realistic action, physical state, scale reference, or supported scene to visibly demonstrate: ${primaryClaim}.`
    : 'Use a conservative product-led composition. Add a confirmed claim before final generation.';
  const composition = aPlusMode
    ? 'Create a clean supporting A+ module with one clear visual hierarchy and product-led evidence.'
    : 'Create a distinct secondary listing image that proves one supported product benefit without duplicating another slot.';
  const guardrails = [
    'Do not duplicate another slot role.',
    'Use only uploaded product references and confirmed Ledger facts.',
    'Do not invent parts, functions, dimensions, certifications, or accessories.'
  ];
  const slotContract = normalizeStoryboardSlotContract({
    slot: {},
    id,
    visualType: 'benefits',
    primaryClaim,
    visualProof,
    composition,
    outputPresetId: outputPreset.id,
    outputPresetSize: outputPreset.size,
    projectForm: form,
    brand: brandProfile,
    blockedClaims,
    guardrails
  });
  return {
    id,
    title,
    goal,
    visualType: 'benefits',
    roleType: aPlusMode ? 'benefit_story' : 'feature_callout',
    composition,
    outputPresetId: outputPreset.id,
    outputPresetLabel: outputPreset.label,
    outputPresetSize: outputPreset.size,
    ...normalizeProjectLanguageFields(form),
    ...slotContract,
    productType: detectProductType(form, ledgerFacts),
    brandId: brandProfile.id,
    brandName: brandProfile.name,
    brandVersion: Number(brandProfile.version || 0),
    productName: form.productName || form.projectName || form.sku || 'Current product',
    usableClaims: primaryClaim && usableFact?.state === 'allowed' ? [primaryClaim] : [],
    needsEvidence: primaryClaim && usableFact?.state === 'evidence' ? [primaryClaim] : [],
    primaryClaim,
    visualProof,
    reviewClaims: [],
    blockedClaims,
    status: primaryClaim ? (usableFact?.state === 'evidence' ? 'needs_review' : 'ready') : 'needs_claims',
    guardrails,
    promptBrief: [
      `Use the locked original product reference for ${form.productName || form.projectName || 'the product'}.`,
      aPlusMode ? 'Output type: Amazon A+ module.' : 'Output type: secondary Amazon listing image.',
      `Listing image strategy rules: ${getListingImageStrategyText(form)}`,
      visualProof,
      formatStoryboardSlotContract(slotContract),
      primaryClaim ? `Primary claim to prove visually: ${primaryClaim}.` : 'No confirmed primary claim is assigned yet.',
      blockedClaims.length ? `Do not mention or imply: ${blockedClaims.join('; ')}.` : ''
    ].filter(Boolean).join(' ')
  };
}

function normalizeStoryboardSequence(briefs = []) {
  return briefs.map((brief, index) => ({ ...brief, id: index + 1 }));
}

function deriveReviewStatus(decision = {}) {
  if (decision.finalStatus === 'blocked' || decision.opsStatus === 'blocked') return 'blocked';
  if (decision.finalStatus === 'rework' || decision.opsStatus === 'rework') return 'rework';
  if (decision.finalStatus === 'approved' && decision.opsStatus === 'approved') return 'approved';
  return 'review';
}

function getDefaultReviewNote(status, brief, decision = {}) {
  if (status === 'approved') return '运营审核和管理员最终放行已完成，可以进入导出。';
  if (status === 'rework') {
    if (decision.opsStatus === 'rework') return '运营退回：需要修改卖点、证据或图片文案。';
    if (decision.finalStatus === 'rework') return '管理员退回：需要修改图片后重新提交审核。';
    return '需要修改后重新提交审核。';
  }
  if (status === 'blocked') return '运营或管理员已禁止该图进入最终导出。';
  if (brief?.needsEvidence?.length) return `需要先确认：${brief.needsEvidence.join('、')}`;
  if (brief?.status === 'needs_claims') return '缺少可用卖点，建议回到 Ledger 补充或调整。';
  return '等待人工检查产品、比例、物理逻辑、卖点证据和合规表达。';
}

function normalizeReviewDecision(decision, slot, brief) {
  const validManualStatuses = ['review', 'approved', 'rework', 'blocked'];
  const manualStatus = validManualStatuses.includes(decision?.manualStatus) ? decision.manualStatus : 'review';
  const opsStatus = decision?.opsStatus
    || (manualStatus === 'approved' ? 'approved' : manualStatus === 'blocked' ? 'blocked' : manualStatus === 'rework' ? 'rework' : 'review');
  const finalStatus = decision?.finalStatus
    || (manualStatus === 'approved' ? 'approved' : manualStatus === 'blocked' ? 'blocked' : manualStatus === 'rework' ? 'rework' : 'review');
  const normalized = {
    slotId: slot.id,
    title: brief?.title || slot.title,
    manualStatus,
    opsStatus,
    finalStatus,
    planStatus: validManualStatuses.includes(decision?.planStatus) ? decision.planStatus : 'review',
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
  return decision.opsStatus === 'approved' && decision.finalStatus === 'approved';
}

function getRoleStatusText(status) {
  return reviewStatusMeta[status]?.shortText || '待审';
}

function getDualReviewSummary(decision = {}) {
  if (isDecisionFullyApproved(decision)) return '运营与管理员已通过';
  return getDualReviewMissingText(decision);
}

function getDualReviewMissingText(decision = {}) {
  if (isDecisionFullyApproved(decision)) return '运营审核与管理员放行完成';
  if (decision.opsStatus !== 'approved') return `运营审核：${reviewStatusMeta[decision.opsStatus]?.shortText || '待审'}`;
  return `管理员最终放行：${reviewStatusMeta[decision.finalStatus]?.shortText || '待审'}`;
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
    brandId: String(run.brandId || 'none'),
    brandName: run.brandName || (run.brandId && run.brandId !== 'none' ? run.brandId : '不指定品牌'),
    brandVersion: Number(run.brandVersion || 0),
    batchId: run.batchId || '',
    batchIndex: Number.isFinite(Number(run.batchIndex)) ? Number(run.batchIndex) : null,
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

function getRunEstimatedCost(run = {}) {
  const explicit = Number(run.estimatedCostUsd || run.estimatedCost || run.costUsd || 0);
  return Number.isFinite(explicit) && explicit > 0 ? explicit : ESTIMATED_GENERATION_COST_USD;
}

function getProjectBrandMeta(project = {}) {
  const snapshot = project.brandSnapshot || {};
  const form = project.form || {};
  const brandId = String(snapshot.brandId || form.brandId || 'none').trim() || 'none';
  return {
    brandId,
    brandName: snapshot.brandName || form.brandName || (brandId === 'none' ? '不指定品牌' : brandId),
    brandVersion: Number(snapshot.brandVersion || 0)
  };
}

function getRunBrandMeta(run = {}, project = {}) {
  const projectBrand = getProjectBrandMeta(project);
  const brandId = String(run.brandId || projectBrand.brandId || 'none').trim() || 'none';
  return {
    brandId,
    brandName: run.brandName || projectBrand.brandName || (brandId === 'none' ? '不指定品牌' : brandId),
    brandVersion: Number(run.brandVersion || projectBrand.brandVersion || 0)
  };
}

function getReasonCountsForRuns(runs = []) {
  const counts = new Map(generationFailureReasons.map((reason) => [reason.id, 0]));
  normalizeGenerationRuns(runs)
    .filter((run) => run.verdict === 'needs_fix' || run.verdict === 'reject')
    .forEach((run) => {
      (run.reasons || []).forEach((reasonId) => {
        if (counts.has(reasonId)) counts.set(reasonId, counts.get(reasonId) + 1);
      });
    });
  return generationFailureReasons
    .map((reason) => ({
      ...reason,
      count: counts.get(reason.id) || 0
    }))
    .sort((a, b) => b.count - a.count);
}

function getManagementRuns(projects = []) {
  return (Array.isArray(projects) ? projects : []).flatMap((project) => (
    normalizeGenerationRuns(project.generationRuns).map((run) => ({
      ...run,
      projectId: project.id,
      projectName: project.form?.projectName || project.form?.productName || project.id,
      ...getRunBrandMeta(run, project)
    }))
  ));
}

function getQualityManagementOverview(projects = []) {
  const runs = getManagementRuns(projects);
  const stats = getGenerationQualityStats(runs);
  const reasonRows = getReasonCountsForRuns(runs);
  const estimatedCost = runs.reduce((sum, run) => sum + getRunEstimatedCost(run), 0);
  const brandCount = new Set(runs.map((run) => run.brandId)).size;
  return {
    ...stats,
    brandCount,
    estimatedCost,
    costPerUsable: stats.usable ? estimatedCost / stats.usable : 0,
    topReason: reasonRows.find((reason) => reason.count > 0)
  };
}

function getBrandQualityRows(projects = []) {
  const groups = new Map();
  (Array.isArray(projects) ? projects : []).forEach((project) => {
    normalizeGenerationRuns(project.generationRuns).forEach((run) => {
      const brand = getRunBrandMeta(run, project);
      const key = brand.brandId || 'none';
      if (!groups.has(key)) {
        groups.set(key, {
          ...brand,
          runs: [],
          projectIds: new Set(),
          outputPresets: new Set(),
          estimatedCost: 0
        });
      }
      const group = groups.get(key);
      group.runs.push(run);
      group.projectIds.add(project.id);
      group.outputPresets.add(run.outputPresetLabel || run.outputPresetId || '主图');
      group.estimatedCost += getRunEstimatedCost(run);
    });
  });

  return Array.from(groups.values())
    .map((group) => {
      const stats = getGenerationQualityStats(group.runs);
      const reasonCounts = getReasonCountsForRuns(group.runs).filter((reason) => reason.count > 0);
      const topReasons = reasonCounts.slice(0, 3);
      const reviewCoverage = stats.total ? Math.round((stats.reviewed / stats.total) * 100) : 0;
      return {
        ...group,
        stats,
        projectCount: group.projectIds.size,
        outputPresetLabels: Array.from(group.outputPresets).slice(0, 3),
        topReasons,
        issueCount: stats.needsFix + stats.rejected,
        reviewCoverage,
        sampleReady: stats.reviewed >= 10,
        estimatedCost: group.estimatedCost,
        costPerUsable: stats.usable ? group.estimatedCost / stats.usable : 0
      };
    })
    .sort((a, b) => b.stats.total - a.stats.total || b.stats.reviewed - a.stats.reviewed);
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

function getSlotGenerationReviewStatus(slotId, generationRuns = []) {
  const runs = getSlotCandidateRuns(slotId, generationRuns);
  if (runs.some((run) => run.verdict === 'usable')) {
    return { status: 'passed', label: '通过', className: 'approved', icon: Check };
  }
  if (runs.some((run) => run.verdict !== 'unreviewed')) {
    return { status: 'reviewed', label: '已审核', className: 'rework', icon: ClipboardCheck };
  }
  return { status: 'unreviewed', label: '未审核', className: 'review', icon: Eye };
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
  const tracedBrand = storyboardBriefs.find((brief) => brief.brandVersion)
    || generationRuns.find((run) => run.brandVersion)
    || {};
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
        brandId: run.brandId || tracedBrand.brandId || 'none',
        brandVersion: Number(run.brandVersion || tracedBrand.brandVersion || 0),
        outputPreset: run.outputPresetLabel || run.outputPresetId,
        outputSize: run.outputPresetSize,
        imageFilePath: run.imageFilePath || '',
        imageFilename: run.imageFilename || '',
        storageKey: run.storageKey || '',
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
      brandName: tracedBrand.brandName || '',
      brandVersion: Number(tracedBrand.brandVersion || 0),
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
      brandId: run.brandId || tracedBrand.brandId || 'none',
      brandVersion: Number(run.brandVersion || tracedBrand.brandVersion || 0),
      outputPreset: run.outputPresetLabel || run.outputPresetId,
      outputSize: run.outputPresetSize,
      imageFilePath: run.imageFilePath || '',
      imageFilename: run.imageFilename || '',
      storageKey: run.storageKey || '',
      imageUrl: run.imageSrc || '',
      aiReview: run.aiReview || null,
      createdAt: run.createdAt
    }))
  };
}

async function saveProjectDeliveryPackage({ projectId, projectForm, ledgerFacts, storyboardBriefs, reviewDecisions, generationRuns }) {
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
    saved.push(await saveTextExportToApi({ ...file, projectId }));
  }
  return saved;
}

async function saveImagesZipToApi({ projectId, projectForm, storyboardBriefs, generationRuns, exportSelections = {} }) {
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
        storageKey: run.storageKey || '',
        imageUrl: run.imageSrc || ''
      };
    })
    .filter(Boolean);
  const response = await fetch(`${IMAGE_API_BASE_URL}/api/export-images-zip`, {
    method: 'POST',
    headers: authenticatedJsonHeaders(),
    body: JSON.stringify({
      projectId,
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

async function saveTextExportToApi({ projectId, filename, content, mimeType = 'text/csv;charset=utf-8' }) {
  const response = await fetch(`${IMAGE_API_BASE_URL}/api/save-export`, {
    method: 'POST',
    headers: authenticatedJsonHeaders(),
    body: JSON.stringify({ projectId, filename, content, mimeType })
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

function updateDecisionByRole(decision, slot, brief, role, status, context = 'review') {
  const next = {
    ...decision,
    title: brief?.title || slot?.title || decision.title,
    updatedAt: new Date().toISOString()
  };

  if (context === 'plan') {
    next.planStatus = status;
  } else if (role === 'human') {
    next.manualStatus = status;
    next.opsStatus = status;
    next.finalStatus = status;
  } else if (role === 'design') {
    next.planStatus = status;
  } else if (role === 'ops') {
    next.opsStatus = status;
    if (status !== 'approved') next.finalStatus = 'review';
  } else {
    next.finalStatus = status;
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
    mainReference.audit?.height,
    form.keyPartsText,
    form.immutablePartsText
  ].map(normalizeLockText).filter(Boolean);
  return lockParts.length ? lockParts.join('|') : 'unlocked';
}

function buildStructuredProductLock(form = {}, ledgerFacts = []) {
  const confirmedClaims = ledgerFacts
    .filter((fact) => fact?.state === 'allowed' || fact?.state === 'evidence')
    .map((fact) => String(fact.claim || '').trim())
    .filter(Boolean);
  const pick = (pattern) => confirmedClaims.filter((claim) => pattern.test(claim)).slice(0, 8);
  const references = getReferenceItems(form)
    .filter((item) => item.preview)
    .map((item) => ({
      type: item.id,
      name: item.name,
      width: Number(item.audit?.width || 0),
      height: Number(item.audit?.height || 0),
      fingerprint: item.audit?.fingerprint || '',
      checkedAt: item.audit?.checkedAt || null
    }));
  const keyParts = splitListText(form.keyPartsText);
  const immutableParts = splitListText(form.immutablePartsText);
  return {
    version: 2,
    fingerprint: getProjectProductLock(form),
    identity: {
      sku: String(form.sku || '').trim(),
      productName: String(form.productName || form.projectName || '').trim(),
      category: String(form.category || '').trim()
    },
    attributes: {
      materials: pick(/material|材质|bamboo|wood|steel|iron|cotton|fabric|plastic|竹|木|钢|铁|棉|布|塑料/i),
      colors: pick(/colou?r|颜色|色|black|white|green|blue|red|pink|beige|gray|grey|黑|白|绿|蓝|红|粉|米|灰/i),
      structures: pick(/fold|adjust|frame|structure|handle|lid|wheel|step|rail|结构|折叠|调节|框架|把手|锅盖|轮|台阶|护栏/i),
      dimensionsAndCounts: pick(/\d|size|dimension|capacity|weight|尺寸|承重|容量|数量/i),
      keyParts
    },
    referenceEvidence: references,
    immutableRules: [
      'Preserve the exact product silhouette, proportions, material finish, color family, hardware placement, and part count shown in the references.',
      'Do not add, remove, duplicate, reshape, or relocate product parts, accessories, labels, controls, fasteners, or packaging.',
      'Only show functional states supported by uploaded references or confirmed project facts.',
      ...immutableParts.map((item) => `Project-specific immutable rule: ${item}`)
    ]
  };
}

function formatProductLockForPrompt(lock = {}) {
  const attributes = lock.attributes || {};
  const lines = [
    `Product identity: ${lock.identity?.productName || 'current referenced product'}${lock.identity?.sku ? `; SKU ${lock.identity.sku}` : ''}.`,
    attributes.materials?.length ? `Locked material facts: ${attributes.materials.join('; ')}.` : '',
    attributes.colors?.length ? `Locked color facts: ${attributes.colors.join('; ')}.` : '',
    attributes.structures?.length ? `Locked structure facts: ${attributes.structures.join('; ')}.` : '',
    attributes.keyParts?.length ? `Locked key parts: ${attributes.keyParts.join('; ')}.` : '',
    ...(Array.isArray(lock.immutableRules) ? lock.immutableRules : [])
  ];
  return lines.filter(Boolean).join(' ');
}

function isSameProductLock(project, form = {}) {
  if (!project?.productLock) return true;
  return project.productLock === getProjectProductLock(form);
}

function isSameContentLanguage(project, form = {}) {
  const previous = project?.contentContract || normalizeProjectLanguageFields(project?.form || {});
  const current = normalizeProjectLanguageFields(form);
  return previous.marketplaceId === current.marketplaceId
    && previous.outputLanguage === current.outputLanguage;
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
  const normalizedForm = { ...form, ...normalizeProjectLanguageFields(form) };
  return {
    id,
    form: normalizedForm,
    productLock: getProjectProductLock(normalizedForm),
    productIdentity: buildStructuredProductLock(normalizedForm, ledgerFacts),
    contentContract: normalizeProjectLanguageFields(normalizedForm),
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

function hasUsableReferenceAudit(audit) {
  return Boolean(
    audit
    && Number(audit.width || 0) > 0
    && Number(audit.height || 0) > 0
  );
}

function compactProjectFormForStorage(form = {}, keepPreview = true) {
  const nextForm = { ...form };
  if (!keepPreview) {
    nextForm.sourceImagePreview = '';
    nextForm.sourceImageDisplayPreview = '';
  }
  if (nextForm.referenceImages && typeof nextForm.referenceImages === 'object') {
    nextForm.referenceImages = Object.fromEntries(Object.entries(nextForm.referenceImages).map(([key, reference]) => {
      const audit = hasUsableReferenceAudit(reference?.audit)
        ? reference.audit
        : key === 'main' && hasUsableReferenceAudit(nextForm.sourceImageAudit)
          ? nextForm.sourceImageAudit
          : reference?.audit;
      return [
        key,
        {
          ...reference,
          preview: keepPreview && key === 'main' ? reference?.preview || '' : '',
          displayPreview: keepPreview ? reference?.displayPreview || '' : '',
          audit: audit ? { ...audit } : undefined
        }
      ];
    }));
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

function mapTeamProjectToWorkspaceProject(remoteProject = {}) {
  const stored = remoteProject.projectData && typeof remoteProject.projectData === 'object'
    ? remoteProject.projectData
    : {};
  const form = {
    ...blankProjectForm,
    ...(stored.form || {}),
    projectName: stored.form?.projectName || remoteProject.projectName || '',
    productName: stored.form?.productName || remoteProject.productName || '',
    sku: stored.form?.sku || remoteProject.sku || '',
    brandId: stored.form?.brandId || remoteProject.brandSnapshot?.brandId || 'none',
    planOutputPresetId: stored.form?.planOutputPresetId || (remoteProject.outputType === 'a-plus' ? 'aplus' : 'main-image')
  };
  const storyboardBriefs = Array.isArray(stored.storyboardBriefs) ? stored.storyboardBriefs : [];
  return {
    ...createProjectRecord(
      form,
      Array.isArray(stored.ledgerFacts) ? stored.ledgerFacts : [],
      remoteProject.id,
      storyboardBriefs,
      Array.isArray(stored.reviewDecisions) ? stored.reviewDecisions : createReviewDecisions(storyboardBriefs),
      Array.isArray(stored.generationRuns) ? stored.generationRuns : [],
      stored.promptOverrides || {},
      stored.exportSelections || {}
    ),
    cloud: {
      remote: true,
      status: remoteProject.status || 'draft',
      assignments: remoteProject.assignments || [],
      createdBy: remoteProject.createdBy || null
    },
    brandSnapshot: remoteProject.brandSnapshot || stored.brandSnapshot || null,
    updatedAt: remoteProject.updatedAt || stored.updatedAt || new Date().toISOString()
  };
}

async function refreshWorkspaceProjectAssetUrls(project = {}) {
  const referenceStorageKeys = Object.values(project.form?.referenceImages || {})
    .map((reference) => String(reference?.storageKey || '').trim())
    .filter(Boolean);
  if (project.form?.sourceImageStorageKey) referenceStorageKeys.push(String(project.form.sourceImageStorageKey));
  const storageKeys = Array.from(new Set([
    ...normalizeGenerationRuns(project.generationRuns).map((run) => String(run.storageKey || '').trim()),
    ...referenceStorageKeys
  ].filter(Boolean)));
  if (!project.id || !storageKeys.length) return project;
  try {
    const assets = await signProjectAssets(project.id, storageKeys);
    const urlByKey = new Map(assets.map((asset) => [asset.storageKey, asset.url]));
    const nextReferences = Object.fromEntries(Object.entries(project.form?.referenceImages || {}).map(([key, reference]) => {
      const url = urlByKey.get(reference?.storageKey);
      return [key, url ? { ...reference, preview: url, displayPreview: url } : reference];
    }));
    const mainStorageKey = nextReferences.main?.storageKey || project.form?.sourceImageStorageKey;
    const mainUrl = urlByKey.get(mainStorageKey);
    return {
      ...project,
      form: {
        ...project.form,
        referenceImages: nextReferences,
        sourceImagePreview: mainUrl || project.form?.sourceImagePreview || '',
        sourceImageDisplayPreview: mainUrl || project.form?.sourceImageDisplayPreview || '',
        sourceImageStorageKey: mainStorageKey || ''
      },
      generationRuns: normalizeGenerationRuns(project.generationRuns).map((run) => ({
        ...run,
        imageSrc: urlByKey.get(run.storageKey) || run.imageSrc
      }))
    };
  } catch (error) {
    appLogger.error('storage.assets.refresh_failed', error, { projectId: project.id });
    return project;
  }
}

function makeTeamProjectPayload(project = {}) {
  const compact = compactProjectForStorage(project, { keepPreview: false });
  const form = compact.form || {};
  return {
    projectName: getProjectTitle(form),
    productName: form.productName || '',
    sku: form.sku || '',
    outputType: getProjectPlanOutputPresetId(form) === 'aplus' ? 'a-plus' : 'main-image',
    status: project.cloud?.status || 'draft',
    brandSnapshot: {
      brandId: getProjectBrandId(form),
      outputPresetId: getProjectPlanOutputPresetId(form)
    },
    projectData: compact
  };
}

function isInlineImageSource(value = '') {
  return /^data:image\//i.test(String(value || ''));
}

async function uploadInlineProjectReferences(project = {}) {
  if (!project.id) return project;
  const form = { ...(project.form || {}) };
  const references = { ...(form.referenceImages || {}) };
  if (!references.main && isInlineImageSource(form.sourceImagePreview)) {
    references.main = {
      name: form.sourceImageName || 'main-reference',
      preview: form.sourceImagePreview,
      displayPreview: form.sourceImageDisplayPreview || form.sourceImagePreview,
      audit: form.sourceImageAudit || null
    };
  }
  let changed = false;
  for (const [referenceId, reference] of Object.entries(references)) {
    if (!isInlineImageSource(reference?.preview)) continue;
    const asset = await uploadTeamProjectAsset({
      projectId: project.id,
      referenceId,
      assetId: `${Date.now()}-${referenceId}`,
      imageDataUrl: reference.preview
    });
    references[referenceId] = {
      ...reference,
      storageKey: asset.storageKey,
      preview: asset.url,
      displayPreview: asset.url
    };
    if (referenceId === 'main') {
      form.sourceImagePreview = asset.url;
      form.sourceImageDisplayPreview = asset.url;
      form.sourceImageStorageKey = asset.storageKey;
    }
    changed = true;
  }
  return changed ? { ...project, form: { ...form, referenceImages: references } } : project;
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
        displayPreview: form?.sourceImageDisplayPreview || form?.sourceImagePreview || '',
        audit: form?.sourceImageAudit || null,
        fallback: true
      };
    }
    return {
      ...type,
      name: item?.name || '',
      preview: item?.preview || '',
      displayPreview: item?.displayPreview || item?.preview || '',
      audit: hasUsableReferenceAudit(item?.audit)
        ? item.audit
        : type.id === 'main' && hasUsableReferenceAudit(form?.sourceImageAudit)
          ? form.sourceImageAudit
          : null,
      fallback: false
    };
  });
}

function getReferenceReadiness(form = {}) {
  const referenceItems = getReferenceItems(form);
  const main = referenceItems.find((item) => item.id === 'main');
  const blockers = [];
  const warnings = [];
  if (!main?.preview) {
    blockers.push('缺少主参考图');
    return { ready: false, blockers, warnings, main: null };
  }
  const audit = main.audit;
  if (!audit) {
    warnings.push('主参考图尚未完成质量检测，建议重新上传后再生成');
    return { ready: true, blockers, warnings, main };
  }
  const longestSide = Math.max(Number(audit.width || 0), Number(audit.height || 0));
  if (longestSide < 600) blockers.push('主参考图分辨率低于 600px，无法可靠锁定产品结构');
  else if (longestSide < 1000) warnings.push('主参考图分辨率偏低，细节一致性可能下降');
  if (Number(audit.subjectCoverage || 0) < 0.02) blockers.push('未识别到足够清晰的产品主体');
  else if (Number(audit.subjectCoverage || 0) < 0.08) warnings.push('产品主体占比过小，建议裁掉多余留白');
  if (audit.touchesEdge) warnings.push('产品主体贴近画布边缘，可能存在裁切风险');
  if (Number(audit.transparentRatio || 0) > 0.98) blockers.push('图片几乎完全透明，无法作为产品参考');
  const fingerprintedReferences = referenceItems.filter((item) => item.preview && item.audit?.fingerprint);
  for (let firstIndex = 0; firstIndex < fingerprintedReferences.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < fingerprintedReferences.length; secondIndex += 1) {
      const first = fingerprintedReferences[firstIndex];
      const second = fingerprintedReferences[secondIndex];
      if (getImageFingerprintDistance(first.audit.fingerprint, second.audit.fingerprint) <= 4) {
        warnings.push(`${first.label}与${second.label}画面高度相似，建议换成不同角度或细节图`);
      }
    }
  }
  return { ready: blockers.length === 0, blockers, warnings, main };
}

function getImageFingerprintDistance(first = '', second = '') {
  if (!first || !second || first.length !== second.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < first.length; index += 1) {
    const xor = Number.parseInt(first[index], 16) ^ Number.parseInt(second[index], 16);
    distance += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][xor] || 0;
  }
  return distance;
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
  const preferredIds = outputPresetId === 'main-image' && Number(slotId) === 1
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
  const response = await fetchWithTimeout(
    imageSrc,
    {},
    30000,
    '图片读取超过 30 秒，请检查图片存储服务后重试。'
  );
  if (!response.ok) throw new Error('无法读取产品参考图');
  return blobToDataUrl(await response.blob());
}

async function fetchWithTimeout(url, options, timeoutMs, timeoutMessage) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(timeoutMessage);
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function planStoryboardWithApi(projectId, projectForm, ledgerFacts, brands = defaultBrandLibrary) {
  const sourceImageDataUrl = await imageSourceToDataUrl(getReferenceImage(projectForm));
  const outputPreset = getProjectPlanOutputPreset(projectForm);
  const response = await fetchWithTimeout(`${IMAGE_API_BASE_URL}/api/plan-storyboard`, {
    method: 'POST',
    headers: authenticatedJsonHeaders(),
    body: JSON.stringify({
      projectId,
      projectForm,
      ledgerFacts,
      productLock: buildStructuredProductLock(projectForm, ledgerFacts),
      outputPresetId: outputPreset.id,
      outputPresetLabel: outputPreset.label,
      outputPresetSize: outputPreset.size,
      targetSlotCount: getStoryboardTargetSlotCount(projectForm, ledgerFacts),
      strategyRules: getListingImageStrategyRules(projectForm),
      sourceImageDataUrl
    })
  }, 60000, 'AI 方案请求超过 60 秒未返回。已停止等待并切换到本地兜底方案。');
  const result = await response.json().catch(() => ({}));
  if (
    !response.ok
    || !result.ok
    || !Array.isArray(result.briefs)
    || result.briefs.length !== getStoryboardTargetSlotCount(projectForm, ledgerFacts)
  ) {
    throw new Error(result.error || 'AI 方案规划失败');
  }
  return result;
}

async function reviewGeneratedImageWithApi({ projectId, projectForm, productLock, brief, run, sourceImages }) {
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
  const response = await fetchWithTimeout(`${IMAGE_API_BASE_URL}/api/review-image`, {
    method: 'POST',
    headers: authenticatedJsonHeaders(),
    body: JSON.stringify({
      projectId,
      projectForm,
      productLock,
      brief,
      run,
      sourceImages: normalizedSourceImages,
      sourceImageDataUrl: normalizedSourceImages[0]?.dataUrl,
      generatedImageDataUrl,
      prompt: run.prompt
    })
  }, 45000, 'AI 预审超过 45 秒未返回，候选图已保留，可稍后重试预审或直接人工判断。');
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

async function resizeImageToPreset(imageSrc, preset) {
  const safeImageSrc = await imageSourceToDataUrl(imageSrc);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = preset.width;
        canvas.height = preset.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('无法创建图片画布');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        const drawX = (canvas.width - drawWidth) / 2;
        const drawY = (canvas.height - drawHeight) / 2;
        context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(new Error(`候选图尺寸处理失败：${error?.message || '画布导出失败'}`));
      }
    };
    image.onerror = () => reject(new Error('候选图尺寸处理失败'));
    image.src = safeImageSrc;
  });
}

function createImageThumbnail(imageSrc, maxSide = 560) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('无法创建预览图');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (error) {
        reject(new Error(`候选图预览处理失败：${error?.message || '画布导出失败'}`));
      }
    };
    image.onerror = () => reject(new Error('候选图预览处理失败'));
    image.src = imageSrc;
  });
}

async function createAiReviewImageDataUrl(imageSrc, maxSide = 1200) {
  const sourceDataUrl = await imageSourceToDataUrl(imageSrc);
  return createImageThumbnail(sourceDataUrl, maxSide);
}

async function createReferenceDisplayPreview(imageSrc, maxSide = 520) {
  let safeImageSrc = imageSrc;
  try {
    safeImageSrc = await imageSourceToDataUrl(imageSrc);
  } catch {
    return imageSrc;
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(imageSrc);
          return;
        }
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, width, height).data;
        let hasTransparency = false;
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const alpha = pixels[(y * width + x) * 4 + 3];
            if (alpha < 250) hasTransparency = true;
            if (alpha > 8) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        if (!hasTransparency || maxX < minX || maxY < minY) {
          resolve(imageSrc);
          return;
        }

        const padding = Math.max(18, Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * 0.1));
        const cropX = Math.max(0, minX - padding);
        const cropY = Math.max(0, minY - padding);
        const cropRight = Math.min(width - 1, maxX + padding);
        const cropBottom = Math.min(height - 1, maxY + padding);
        const cropWidth = cropRight - cropX + 1;
        const cropHeight = cropBottom - cropY + 1;
        const scale = Math.min(1, maxSide / Math.max(cropWidth, cropHeight));
        const outputWidth = Math.max(1, Math.round(cropWidth * scale));
        const outputHeight = Math.max(1, Math.round(cropHeight * scale));
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = outputWidth;
        outputCanvas.height = outputHeight;
        const outputContext = outputCanvas.getContext('2d');
        if (!outputContext) {
          resolve(imageSrc);
          return;
        }
        outputContext.clearRect(0, 0, outputWidth, outputHeight);
        outputContext.drawImage(
          image,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          outputWidth,
          outputHeight
        );
        resolve(outputCanvas.toDataURL('image/png'));
      } catch {
        resolve(imageSrc);
      }
    };
    image.onerror = () => resolve(imageSrc);
    image.src = safeImageSrc;
  });
}

async function saveGeneratedImageToApi({ projectId, imageDataUrl, projectForm, slotId, runId }) {
  const response = await fetchWithTimeout(`${IMAGE_API_BASE_URL}/api/save-generated-image`, {
    method: 'POST',
    headers: authenticatedJsonHeaders(),
    body: JSON.stringify({
      projectId,
      imageDataUrl,
      projectName: projectForm?.projectName || projectForm?.productName || 'listingflow',
      slotId,
      runId
    })
  }, 45000, '生成图保存超过 45 秒未返回，已保留本次会话预览。');
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok || !result.imageUrl) {
    throw new Error(result.error || '生成图保存到本地文件失败');
  }
  return result;
}

function buildGenerationPrompt(brief, slot, outputPreset, options = {}) {
  const projectForm = options.projectForm || {};
  const brand = options.baselineMode
    ? getBrandProfile('none', defaultBrandLibrary)
    : options.brandProfile || getBrandProfile('none', defaultBrandLibrary);
  const isWhiteMainImage = outputPreset.id === 'main-image' && slot.id === 1;
  const isAPlusOutput = outputPreset.id === 'aplus';
  const applicableBrandColors = normalizeBrandColors(brand.colors)
    .filter((color) => isBrandColorApplicable(color, outputPreset.id, slot.id));
  const brandPaletteText = formatBrandColorPalette(brand, outputPreset.id, slot.id);
  const brandArrowStyle = getBrandArrowStyle(brand.arrowStyle);
  const brandTitleColor = normalizeHexColor(brand.titleColor) || '#18211F';
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
      applicableBrandColors.length
        ? 'Use these colors only as hidden art-direction constraints for designed backgrounds, graphic blocks, labels, icons, callouts, accent shapes, and decorative UI elements. Do not introduce unlisted brand colors. Neutral white/black/gray may be used only for legibility and shadows; never recolor the actual product away from the reference.'
        : 'No brand colors apply to this image slot. Use only neutral ecommerce backgrounds and do not invent a brand palette.',
      'Do not render the brand palette itself. Never show HEX codes, color percentages, color swatch blocks, color cards, palette legends, design-token labels, or style-guide panels in the generated image.',
      `Background policy: ${brand.backgroundPolicy}.`,
      brand.scenes.length ? `Preferred scene cues: ${brand.scenes.join(', ')}.` : '',
      brand.forbiddenStyles.length ? `Avoid these brand-forbidden styles: ${brand.forbiddenStyles.join(', ')}.` : '',
      logoInstruction,
      `Visible title color rule: use ${brandTitleColor} as the consistent title color whenever a visible title or main heading appears. This HEX value is an internal art-direction rule only; do not print the HEX code.`,
      `Arrow and pointer style rule: ${brandArrowStyle.prompt}`,
      `Icon style rule: ${getBrandStyleOption(brandIconStyleOptions, brand.iconStyle).prompt}`,
      `Annotation-line rule: ${getBrandStyleOption(brandAnnotationStyleOptions, brand.annotationStyle).prompt}`,
      `Corner treatment rule: ${getBrandStyleOption(brandCornerStyleOptions, brand.cornerStyle).prompt}`,
      `Label treatment rule: ${getBrandStyleOption(brandLabelStyleOptions, brand.labelStyle).prompt}`,
      brand.exampleImages?.length
        ? `${brand.exampleImages.length} frozen brand example images are supplied as style references. Follow their visual language and composition rhythm, but never copy their products, claims, or text.`
        : '',
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
    ? 'Slot 01 is the Amazon primary white-background image: pure white background, product only, no text, no lifestyle scene, no props, no badges, no colored background. Product coverage rule: make the product fill about 80-85% of the canvas, with a hard minimum around 75% unless the product is unusually long or thin. Keep the whole product visible with clean margins; do not crop, stretch, deform, or remove any part just to fill the frame.'
    : [
      'This is not the primary white-background image. It may use a clean background, background color, soft layout blocks, or a realistic use-scene background when that helps show the selected selling point.',
      options.baselineMode
        ? 'Use neutral ecommerce backgrounds or realistic usage environments; avoid decorative brand color dominance during validation.'
        : `When a brand is selected, internally use the configured brand colors as the only intentional color system for backgrounds, blocks, labels, icons, and callouts. Follow this hidden palette ratio for design decisions only: ${brandPaletteText}. Do not display the palette, HEX codes, or percentages. Follow the brand background policy: ${brand.backgroundPolicy}.`,
      'If using a real scene, the product must be placed in a physically believable real use context. The background should explain the benefit, not become generic decoration.'
    ].join(' ');
  const titlePlacementInstruction = isAPlusOutput
    ? 'A+ title rule: a heading is optional and does not have to sit at the top. Place headings wherever the module layout looks most natural, such as left, center, over an image band, or beside the product. Keep typography, heading hierarchy, title color, spacing rhythm, callout treatment, graphic blocks, image treatment, and overall art direction consistent with the same brand visual system across the full A+ set.'
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
    `Listing image strategy rules: ${getListingImageStrategyText(projectForm)}`,
    brief.promptBrief,
    brief.primaryClaim ? `Primary claim: ${brief.primaryClaim}. The composition must visually prove this claim.` : '',
    brief.visualProof ? `Visual proof requirement: ${brief.visualProof}` : '',
    formatStoryboardSlotContract(brief),
    `Slot-specific quality guardrails: ${getSlotQualityGuardrailText(brief.visualType)}.`,
    isAPlusOutput ? 'A+ module quality rule: allow richer content, broader composition, and combined benefit storytelling, but keep every claim truthful, readable, visually supported, product-led, and visually consistent with the same brand system used across the A+ set.' : '',
    'Input claims, keywords, and notes may be written in any language. Understand them semantically; never infer the final image language from the input language.',
    getVisibleCopyLanguageInstruction(projectForm),
    'Internal prompt metadata must never appear in the image. Do not show brand color HEX codes, percentages, palette swatches, prompt labels, model notes, grid specs, or any design-system documentation.',
    'Rewrite source-language keywords as concise Amazon-ready copy in the project target language instead of copying or mixing source-language characters.',
    'Design the typography, callout placement, arrows, badges, and text hierarchy directly inside the generated image composition. Do not leave blank spaces for later text overlay.',
    titlePlacementInstruction,
    'Visible text must be spatially aligned with the product feature, scene action, measurement, or visual evidence it refers to. Avoid generic floating labels that do not point to anything.',
    'Use as little explanatory text as possible while preserving clarity. The visual scene, detail, state, or layout should carry the proof.',
    'Use ecommerce-grade typography: short phrases, large readable type, clean spacing, balanced margins, and no tiny paragraphs.',
    'Use all uploaded product reference images as the locked source of truth. They are different views/details of the same product, not separate products.',
    options.productLock ? `Structured product lock: ${formatProductLockForPrompt(options.productLock)}` : '',
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
  const coverageStatus = audit.subjectCoverage >= 0.75 && audit.subjectCoverage <= 0.9
    ? 'pass'
    : audit.subjectCoverage >= 0.65 && audit.subjectCoverage <= 0.96
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
      detail: '主图目标 80%-85%，最低约 75%；细长产品可略低，但不能裁切或变形。'
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
      let transparentCount = 0;

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
          const alpha = pixels[index + 3];
          if (alpha <= 12) transparentCount += 1;
          const whitePixel = alpha <= 12 || isWhite(red, green, blue);
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
      const touchesEdge = hasSubject && (minX <= 1 || minY <= 1 || maxX >= width - 2 || maxY >= height - 2);
      const fingerprintCanvas = document.createElement('canvas');
      fingerprintCanvas.width = 9;
      fingerprintCanvas.height = 8;
      const fingerprintContext = fingerprintCanvas.getContext('2d', { willReadFrequently: true });
      let fingerprint = '';
      if (fingerprintContext) {
        fingerprintContext.drawImage(image, 0, 0, 9, 8);
        const fingerprintPixels = fingerprintContext.getImageData(0, 0, 9, 8).data;
        let bitBuffer = '';
        for (let y = 0; y < 8; y += 1) {
          for (let x = 0; x < 8; x += 1) {
            const leftIndex = (y * 9 + x) * 4;
            const rightIndex = (y * 9 + x + 1) * 4;
            const left = fingerprintPixels[leftIndex] * 0.299 + fingerprintPixels[leftIndex + 1] * 0.587 + fingerprintPixels[leftIndex + 2] * 0.114;
            const right = fingerprintPixels[rightIndex] * 0.299 + fingerprintPixels[rightIndex + 1] * 0.587 + fingerprintPixels[rightIndex + 2] * 0.114;
            bitBuffer += left > right ? '1' : '0';
          }
        }
        fingerprint = bitBuffer.match(/.{4}/g)?.map((bits) => Number.parseInt(bits, 2).toString(16)).join('') || '';
      }

      resolve({
        fileName: file?.name || '',
        fileSizeMb: file ? file.size / 1024 / 1024 : dataUrl.length / 1024 / 1024,
        width: image.naturalWidth,
        height: image.naturalHeight,
        borderWhiteRatio: edgeCount ? edgeWhite / edgeCount : 0,
        subjectCoverage,
        transparentRatio: transparentCount / (width * height),
        touchesEdge,
        fingerprint,
        subjectBounds: hasSubject ? { minX, minY, maxX, maxY, sampleWidth: width, sampleHeight: height } : null,
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

function SlotGenerationStatusPill({ slotId, generationRuns }) {
  const item = getSlotGenerationReviewStatus(slotId, generationRuns);
  const Icon = item.icon;
  return (
    <span className={`status-pill generation-review-status ${item.className}`} title={item.label}>
      <Icon size={14} />
      {item.label}
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
  const finalDone = decision.finalStatus === 'approved';
  const opsDone = decision.opsStatus === 'approved';
  return (
    <div className="role-checklist">
      <span className={opsDone ? 'done' : decision.opsStatus}>
        <Check size={13} />
        运营：{reviewStatusMeta[decision.opsStatus]?.shortText || '待审'}
      </span>
      <span className={finalDone ? 'done' : decision.finalStatus}>
        <Check size={13} />
        管理员：{reviewStatusMeta[decision.finalStatus]?.shortText || '待审'}
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
        {planMode && <ReviewStatusPill status={decision.planStatus || 'review'} context="plan" />}
      </div>
      <p>{planMode ? '这里只确认这张图的方向、卖点和画面证明方式；最终图片质量在生成后再判断。' : role.helper}</p>
      <div className="review-action-buttons">
        {actions.map(([status, Icon, label]) => (
          <button
            className={deriveRoleButtonClass(decision, roleId, status)}
            disabled={isRegenerating}
            key={status}
            onClick={() => {
              onUpdateReview(decision.slotId, roleId, status, context);
              if (planMode && status === 'rework' && onRegenerateSlot) {
                onRegenerateSlot(decision.slotId, roleId);
              }
            }}
          >
            {isRegenerating && status === 'rework' ? <VistamzLoader size={16} label="正在重新生成方案" /> : <Icon size={15} />}
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
      : activeRole === 'admin'
        ? decision.finalStatus
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
        className="vz-btn vz-btn--primary primary-button"
        disabled={isCurrentPageStep}
        onClick={() => onNavigate(nextStep.target, nextStep.anchor)}
      >
        <NextIcon size={16} />
        {isCurrentPageStep ? '正在这里' : nextStep.action}
      </button>
    </section>
  );
}

function ProjectList({ projects, activeProjectId, onSelectProject, onCreateProject, onDeleteProject, canCreate }) {
  return (
    <div className="project-list-card">
      <div className="project-list-header">
        <div>
          <p className="eyebrow">项目列表</p>
          <h2>团队项目</h2>
        </div>
        {canCreate && <button className="mini-icon-button" aria-label="创建新项目" onClick={onCreateProject}><Plus size={16} /></button>}
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
            {!project.cloud?.remote && <button className="project-delete-button" aria-label={`删除 ${getProjectTitle(project.form)}`} onClick={() => onDeleteProject(project.id)}><Trash2 size={14} /></button>}
          </div>
        )) : (
          <div className="project-list-empty">
            <FolderOpen size={18} />
            <strong>暂无团队项目</strong>
            <small>{canCreate ? '点击右上角 + 创建新项目。' : '等待管理员将项目分配给你。'}</small>
          </div>
        )}
      </div>
    </div>
  );
}

function getProjectProgress(project) {
  const form = project?.form || {};
  const hasReference = Boolean(form.sourceImagePreview || form.referenceImages?.main?.preview);
  const claimCount = project?.ledgerFacts?.length || 0;
  const briefCount = project?.storyboardBriefs?.length || 0;
  const runs = project?.generationRuns || [];
  const activeSlots = getActiveSlots(project?.storyboardBriefs || []);
  const approved = activeSlots.filter((slot) => (
    isDecisionFullyApproved(getReviewDecision(project?.reviewDecisions || [], slot.id, project?.storyboardBriefs || []))
  )).length;
  const steps = [hasReference, claimCount > 0, briefCount > 0, runs.length > 0, approved > 0];
  return {
    hasReference,
    claimCount,
    briefCount,
    runs,
    approved,
    total: activeSlots.length || STORYBOARD_SLOT_COUNT,
    complete: steps.filter(Boolean).length,
    percent: Math.round((steps.filter(Boolean).length / steps.length) * 100)
  };
}

function getProjectNextAction(project, userRole) {
  const progress = getProjectProgress(project);
  if (userRole === 'operator') {
    if (!progress.runs.length) return { label: '等待候选图', detail: '设计完成生图后会进入你的审核队列', section: 'review' };
    if (progress.approved >= progress.total) return { label: '等待管理员放行', detail: '运营审核已完成', section: 'review' };
    return { label: '开始审核', detail: `${progress.approved}/${progress.total} 已放行`, section: 'review' };
  }
  if (!progress.hasReference) return { label: '补充项目资料', detail: '先上传产品参考图', section: 'project' };
  if (!progress.claimCount) return { label: '整理卖点', detail: '生成并编辑可上图卖点', section: 'project' };
  if (!progress.briefCount) return { label: '生成图片方案', detail: '先为每张图确认要证明的卖点', section: 'storyboard' };
  if (!progress.runs.length) return { label: '生成候选图', detail: '按已确认方案开始出图', section: 'generation' };
  return { label: '继续处理项目', detail: `${progress.approved}/${progress.total} 张已最终放行`, section: userRole === 'admin' ? 'review' : 'generation' };
}

function ProjectCenterPage({ projects, currentUser, onOpenProject, onCreateProject, onTrashProject, onRestoreProject, isLoading }) {
  const [query, setQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [trashedProjects, setTrashedProjects] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashMessage, setTrashMessage] = useState('');
  const userRole = currentUser.role;
  const visibleProjects = userRole === 'operator' ? projects.filter(isOperatorVisibleProject) : projects;
  const filteredProjects = visibleProjects.filter((project) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;
    const form = project.form || {};
    return [form.projectName, form.productName, form.sku].some((value) => String(value || '').toLowerCase().includes(keyword));
  });
  const canCreate = userRole === 'designer' || userRole === 'admin';
  const roleLabel = userRole === 'designer' ? '设计工作台' : userRole === 'operator' ? '运营审核队列' : '管理员工作台';
  const openTrash = async () => {
    const next = !showTrash;
    setShowTrash(next);
    if (!next) return;
    setTrashLoading(true);
    setTrashMessage('');
    try {
      setTrashedProjects(await listTrashedTeamProjects());
    } catch (error) {
      setTrashMessage(error instanceof Error ? error.message : '回收站暂时无法加载。');
    } finally {
      setTrashLoading(false);
    }
  };
  const restoreProject = async (project) => {
    try {
      await onRestoreProject(project);
      setTrashedProjects((current) => current.filter((item) => item.id !== project.id));
      setTrashMessage(`已恢复「${project.projectName}」。`);
    } catch (error) {
      setTrashMessage(error instanceof Error ? error.message : '项目恢复失败。');
    }
  };

  return (
    <section className={`project-center-page role-${userRole}`}>
      <header className="project-center-header">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h2>{userRole === 'operator' ? '待我审核的项目' : '项目中心'}</h2>
          <p>{userRole === 'operator' ? '这里只显示设计已完整提交、并分配给你的项目；未提交的设计稿不会提前出现。' : '从一个项目开始，依次完成资料、卖点、图片方案和审核。'}</p>
        </div>
        <div className="project-center-header-actions">
          {canCreate && <button className="vz-btn vz-btn--secondary secondary-button" type="button" onClick={openTrash}><Archive size={17} />回收站</button>}
          {canCreate && <button className="vz-btn vz-btn--primary primary-button" type="button" onClick={onCreateProject}><Plus size={17} />创建项目</button>}
        </div>
      </header>

      {showTrash && (
        <section className="project-trash-panel">
          <div className="section-heading">
            <div><p className="eyebrow">RECYCLE BIN</p><h3>回收站</h3></div>
            <small>项目保留 30 天，可在此恢复。</small>
          </div>
          {trashMessage && <p className="project-trash-message">{trashMessage}</p>}
          {trashLoading ? <p>正在加载...</p> : trashedProjects.length ? (
            <div className="project-trash-list">
              {trashedProjects.map((project) => (
                <div className="project-trash-row" key={project.id}>
                  <div><strong>{project.projectName}</strong><small>{project.sku || '无 SKU'} · {project.purgeAfter ? `保留至 ${formatProjectTime(project.purgeAfter)}` : '保留 30 天'}</small></div>
                  <button className="vz-btn vz-btn--secondary secondary-button" type="button" onClick={() => restoreProject(project)}><RotateCcw size={16} />恢复</button>
                </div>
              ))}
            </div>
          ) : <p className="empty-state">回收站为空。</p>}
        </section>
      )}

      {!isLoading && visibleProjects.length > 0 && (
        <section className="project-center-next">
          <div className="project-center-next-icon"><Sparkles size={20} /></div>
          <div>
            <small>建议从这里继续</small>
            <strong>{getProjectTitle(visibleProjects[0].form)} · {getProjectNextAction(visibleProjects[0], userRole).label}</strong>
            <p>{getProjectNextAction(visibleProjects[0], userRole).detail}</p>
          </div>
          <button className="vz-btn vz-btn--secondary secondary-button" type="button" onClick={() => onOpenProject(visibleProjects[0].id, getProjectNextAction(visibleProjects[0], userRole).section)}>继续</button>
        </section>
      )}

      <div className="project-center-toolbar">
        <strong>{isLoading ? '正在加载项目...' : `${filteredProjects.length} 个项目`}</strong>
        <label className="project-search">
          <span className="sr-only">搜索项目</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目或 SKU" />
        </label>
      </div>

      <div className="project-center-list">
        {!isLoading && !filteredProjects.length && (
          <div className="project-center-empty">
            <FolderOpen size={25} />
            <strong>{visibleProjects.length ? '没有匹配的项目' : userRole === 'operator' ? '还没有设计提交给你的项目' : '还没有项目'}</strong>
            <p>{canCreate ? '创建第一个项目后，就可以开始上传产品资料。' : '设计完成整套图片并提交审核后，项目会出现在这里。'}</p>
          </div>
        )}
        {filteredProjects.map((project) => {
          const progress = getProjectProgress(project);
          const nextAction = getProjectNextAction(project, userRole);
          const preview = project.form?.referenceImages?.main?.displayPreview || project.form?.sourceImageDisplayPreview || project.form?.referenceImages?.main?.preview || project.form?.sourceImagePreview;
          return (
            <article className="project-center-row" key={project.id}>
              <div className="project-center-thumb">
                {preview ? <img src={preview} alt="" /> : <FileImage size={22} />}
              </div>
              <div className="project-center-summary">
                <small>{project.form?.sku || '无 SKU'}</small>
                <h3>{getProjectTitle(project.form)}</h3>
                <p>{project.form?.productName || '等待填写产品信息'}</p>
              </div>
              <div className="project-center-progress">
                <span>{progress.complete}/5 已完成</span>
                <div><i style={{ width: `${progress.percent}%` }} /></div>
                <small>{progress.claimCount ? `${progress.claimCount} 个卖点` : '尚未生成卖点'}</small>
              </div>
              <div className="project-center-next-copy">
                <small>下一步</small>
                <strong>{nextAction.label}</strong>
                <span>{nextAction.detail}</span>
              </div>
              <button className="project-open-button" type="button" onClick={() => onOpenProject(project.id, nextAction.section)}>
                打开<ChevronRight size={16} />
              </button>
              {canCreate && project.cloud?.remote && (userRole === 'admin' || project.cloud?.createdBy?.id === currentUser.id) && (
                <button className="project-trash-button" type="button" title="移入回收站" onClick={() => onTrashProject(project)}>
                  <Trash2 size={17} />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TeamManagementPage({ projects, onAssignProject, focusRequest }) {
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [savingProjectId, setSavingProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listTeamUsers()
      .then((nextUsers) => {
        if (mounted) setUsers(nextUsers);
      })
      .catch((error) => {
        if (mounted) setMessage(error instanceof Error ? error.message : '账号列表暂时无法加载。');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const designers = users.filter((user) => user.role === 'designer');
  const operators = users.filter((user) => user.role === 'operator');
  const readAssignment = (project, role) => drafts[`${project.id}:${role}`]
    ?? project.cloud?.assignments?.find((assignment) => assignment.role === role)?.userId
    ?? '';
  const updateDraft = (projectId, role, userId) => {
    setDrafts((current) => ({ ...current, [`${projectId}:${role}`]: userId }));
  };
  const saveAssignments = async (project) => {
    setSavingProjectId(project.id);
    setMessage('');
    try {
      const designerId = readAssignment(project, 'designer');
      const operatorId = readAssignment(project, 'operator');
      const designer = designers.find((user) => user.id === designerId) || null;
      const operator = operators.find((user) => user.id === operatorId) || null;
      await onAssignProject(project.id, 'designer', designer);
      await onAssignProject(project.id, 'operator', operator);
      setMessage(`已更新「${getProjectTitle(project.form)}」的负责人。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '项目分配失败，请稍后重试。');
    } finally {
      setSavingProjectId('');
    }
  };

  return (
    <section className="page team-page">
      <FocusFrame active={getFocusSignal(focusRequest, 'team')} className="vz-card panel team-overview">
        <div>
          <p className="eyebrow">TEAM ROUTING</p>
          <h3>项目负责人</h3>
          <p>每个项目指定一位设计师和一位运营。设计师负责资料、方案与生图；运营负责卖点确认、审核与导出。</p>
        </div>
        <div className="team-overview-stats">
          <span><strong>{designers.length}</strong> 设计</span>
          <span><strong>{operators.length}</strong> 运营</span>
          <span><strong>{projects.length}</strong> 项目</span>
        </div>
      </FocusFrame>

      <section className="vz-card panel team-projects-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ASSIGNMENTS</p>
            <h3>分配项目</h3>
          </div>
          {message && <small className="team-message">{message}</small>}
        </div>
        {isLoading ? <p className="empty-state">正在加载已激活账号...</p> : projects.length ? (
          <div className="team-project-list">
            {projects.map((project) => (
              <article className="team-project-row" key={project.id}>
                <div className="team-project-title">
                  <strong>{getProjectTitle(project.form)}</strong>
                  <small>{project.form.sku || '无 SKU'} · {project.cloud?.status || 'draft'}</small>
                </div>
                <label>
                  <span>设计负责人</span>
                  <select value={readAssignment(project, 'designer')} onChange={(event) => updateDraft(project.id, 'designer', event.target.value)}>
                    <option value="">暂不分配</option>
                    {designers.map((user) => <option value={user.id} key={user.id}>{user.displayName}{user.email ? ` · ${user.email}` : ''}</option>)}
                  </select>
                </label>
                <label>
                  <span>运营负责人</span>
                  <select value={readAssignment(project, 'operator')} onChange={(event) => updateDraft(project.id, 'operator', event.target.value)}>
                    <option value="">暂不分配</option>
                    {operators.map((user) => <option value={user.id} key={user.id}>{user.displayName}{user.email ? ` · ${user.email}` : ''}</option>)}
                  </select>
                </label>
                <button className="vz-btn vz-btn--secondary secondary-button" type="button" disabled={savingProjectId === project.id} onClick={() => saveAssignments(project)}>
                  <Save size={16} />
                  {savingProjectId === project.id ? '保存中...' : '保存分配'}
                </button>
              </article>
            ))}
          </div>
        ) : <p className="empty-state">还没有团队项目，先由设计或管理员创建项目。</p>}
      </section>
    </section>
  );
}

function ReferencePanel({ projectForm }) {
  const referenceItems = getReferenceItems(projectForm).filter((item) => item.preview);
  const mainReference = referenceItems.find((item) => item.id === 'main') || referenceItems[0];
  return (
    <section className="vz-card panel product-panel">
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
    <section className="vz-card panel">
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
    <section className="vz-card panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Claims</p>
          <h3>{compact ? '可上图卖点' : '卖点确认表'}</h3>
        </div>
        {onManage && (
          <button className="vz-btn vz-btn--ghost text-button" type="button" aria-label="管理卖点确认表" onClick={onManage}>
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
    <section className="vz-card panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Generation Queue</p>
          <h3>生图与预审任务</h3>
        </div>
        <button className="vz-btn vz-btn--ghost text-button">
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
  productLockChanged,
  onGenerateLedgerDraft,
  onSaveProject,
  brandVersionState,
  onUpgradeBrandSnapshot,
  isUpgradingBrandSnapshot,
  saveStatus,
  focusRequest
}) {
  const [intakeMode, setIntakeMode] = useState('sku');
  const [imageAuditStatus, setImageAuditStatus] = useState('');
  const [highlightTarget, setHighlightTarget] = useState('');
  const uploadRef = useRef(null);
  const claimsRef = useRef(null);
  const referenceReadiness = getReferenceReadiness(projectForm);
  const updateField = (field, value) => {
    setProjectForm((current) => ({ ...current, [field]: value }));
  };
  const updateMarketplace = (marketplaceId) => {
    const marketplace = getMarketplaceOption(marketplaceId);
    setProjectForm((current) => ({
      ...current,
      marketplaceId: marketplace.id,
      outputLanguage: marketplace.defaultLanguage
    }));
  };
  const handleReferenceImageUpload = (referenceId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const preview = String(reader.result || '');
      const displayPreview = await createReferenceDisplayPreview(preview);
      const referenceType = referenceTypes.find((item) => item.id === referenceId);
      setImageAuditStatus(`${referenceType?.label || '参考图'}检测中...`);
      try {
        const audit = await analyzeImageDataUrl(preview, file);
        setProjectForm((current) => ({
          ...current,
          sourceImageName: referenceId === 'main' ? file.name : current.sourceImageName,
          sourceImagePreview: referenceId === 'main' ? preview : current.sourceImagePreview,
          sourceImageDisplayPreview: referenceId === 'main' ? displayPreview : current.sourceImageDisplayPreview,
          sourceImageAudit: referenceId === 'main' ? audit : current.sourceImageAudit,
          referenceImages: {
            ...(current.referenceImages || {}),
            [referenceId]: {
              name: file.name,
              preview,
              displayPreview,
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
          sourceImageDisplayPreview: referenceId === 'main' ? displayPreview : current.sourceImageDisplayPreview,
          sourceImageAudit: referenceId === 'main' ? null : current.sourceImageAudit,
          referenceImages: {
            ...(current.referenceImages || {}),
            [referenceId]: {
              name: file.name,
              preview,
              displayPreview,
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
        sourceImageDisplayPreview: referenceId === 'main' ? '' : current.sourceImageDisplayPreview,
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
      claims: claimsRef
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

  const skuField = <label className="form-field"><span>SKU</span><input value={projectForm.sku} onChange={(event) => updateField('sku', event.target.value)} placeholder="输入或粘贴 SKU" /></label>;
  const brandField = <label className="form-field"><span>品牌</span><select value={getProjectBrandId(projectForm, brandLibrary)} onChange={(event) => updateField('brandId', event.target.value)}>{brandLibrary.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>;
  const marketplaceField = (
    <label className="form-field">
      <span>目标站点</span>
      <select value={normalizeProjectLanguageFields(projectForm).marketplaceId} onChange={(event) => updateMarketplace(event.target.value)}>
        {MARKETPLACE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <small>切换站点会自动带入该站点的默认文案语言。</small>
    </label>
  );
  const outputLanguageField = (
    <label className="form-field">
      <span>图片文案语言</span>
      <select value={normalizeProjectLanguageFields(projectForm).outputLanguage} onChange={(event) => updateField('outputLanguage', event.target.value)}>
        {OUTPUT_LANGUAGE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <small>卖点可用任意语言填写；生成图片中的可见文字以这里为准。</small>
    </label>
  );
  const projectNameField = <label className="form-field"><span>项目名</span><input value={projectForm.projectName} onChange={(event) => updateField('projectName', event.target.value)} placeholder="例如 Cosyland learning tower" /></label>;
  const productNameField = <label className="form-field"><span>产品名</span><input value={projectForm.productName} onChange={(event) => updateField('productName', event.target.value)} placeholder="用于内部识别" /></label>;

  return (
    <section className="new-project-page">
      <header className="new-project-heading">
        <div>
          <p className="eyebrow">PROJECT SETUP</p>
          <h2>准备项目资料</h2>
          <p>只填写会影响图片生成的资料；低频检查会在后续需要时提示。</p>
        </div>
        <div className="new-project-mode" role="group" aria-label="项目创建方式">
          {Object.entries(intakeModes).map(([id, mode]) => (
            <button className={intakeMode === id ? 'active' : ''} key={id} onClick={() => setIntakeMode(id)} type="button">{mode.label}</button>
          ))}
        </div>
      </header>

      <div className="new-project-stepper" aria-label="项目创建进度">
        <span className="active"><b>1</b>资料</span><i />
        <span><b>2</b>卖点</span><i />
        <span><b>3</b>图片方案</span>
      </div>

      <div className="new-project-layout">
        <section className="vz-card panel project-intake-panel new-project-form">
          <div className="panel-header compact">
            <div><p className="eyebrow">REFERENCES</p><h3>产品参考图组</h3></div>
            <small>主参考图必填，其余按产品实际情况补充</small>
          </div>
          <div className={`reference-set-grid ${highlightTarget === 'image-upload' ? 'focus-flash soft' : ''}`} ref={uploadRef}>
            {getReferenceItems(projectForm).map((reference) => (
              <div className={reference.required ? 'reference-upload-card required' : 'reference-upload-card'} key={reference.id}>
                <div className={(reference.displayPreview || reference.preview) ? 'reference-upload-preview has-image' : 'reference-upload-preview'}>
                  {(reference.displayPreview || reference.preview) ? <img src={reference.displayPreview || reference.preview} alt={reference.label} /> : <ImagePlus size={28} />}
                </div>
                <div className="reference-upload-content">
                  <div className="reference-upload-title-row">
                    <span>
                      <strong>{reference.label}</strong>
                      <em>{reference.required ? '必填' : '可选'}</em>
                    </span>
                    <label className="vz-btn vz-btn--secondary secondary-button upload-button" htmlFor={`reference-upload-${reference.id}`}><Upload size={16} />上传</label>
                  </div>
                  <p>{reference.helper}</p>
                  {reference.name && <small className="reference-upload-filename">{reference.name}</small>}
                  <div className="reference-upload-actions">
                    <input accept="image/*" className="file-input" id={`reference-upload-${reference.id}`} onChange={(event) => handleReferenceImageUpload(reference.id, event)} type="file" />
                    {(reference.displayPreview || reference.preview) && !reference.fallback && <button className="vz-btn vz-btn--ghost text-button" onClick={() => removeReferenceImage(reference.id)} type="button">移除</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {imageAuditStatus && <span className="save-status">{imageAuditStatus}</span>}

          <div className={`new-project-fields ${intakeMode === 'noSku' ? 'is-no-sku' : 'is-sku'}`}>
            {intakeMode === 'sku' ? (
              <>
                {skuField}
                {brandField}
                {marketplaceField}
                {outputLanguageField}
                {projectNameField}
                {productNameField}
              </>
            ) : (
              <>
                {projectNameField}
                {productNameField}
                {brandField}
                {marketplaceField}
                {outputLanguageField}
              </>
            )}
            <label className="form-field full"><span>类目</span><input value={projectForm.category} onChange={(event) => updateField('category', event.target.value)} placeholder="Amazon 类目或内部类目" /></label>
            <label className="form-field">
              <span>关键部件，每行一个</span>
              <textarea value={projectForm.keyPartsText || ''} onChange={(event) => updateField('keyPartsText', event.target.value)} rows={4} placeholder="例如 Handle、Charging cradle、Control panel" />
              <small>用于锁定必须保留的结构和部件。</small>
            </label>
            <label className="form-field">
              <span>不可改变项，每行一个</span>
              <textarea value={projectForm.immutablePartsText || ''} onChange={(event) => updateField('immutablePartsText', event.target.value)} rows={4} placeholder="例如 不改变按钮数量、接口位置和产品主色" />
              <small>后续每次生图都会带上这些硬约束。</small>
            </label>
            <label className={`form-field full ${highlightTarget === 'claims' ? 'focus-flash soft' : ''}`} ref={claimsRef}>
              <span>卖点草稿，每行一个</span>
              <textarea value={projectForm.claimsText} onChange={(event) => updateField('claimsText', event.target.value)} rows={7} placeholder="每行一个卖点，例如 Bamboo material" />
            </label>
          </div>

          <div className="new-project-actions">
            <button className="vz-btn vz-btn--secondary secondary-button" onClick={onSaveProject} type="button"><Save size={16} />保存草稿</button>
            <button className="vz-btn vz-btn--primary primary-button" onClick={() => onGenerateLedgerDraft(projectForm, intakeMode)} type="button"><ClipboardCheck size={16} />生成卖点草稿</button>
          </div>
        </section>

        <aside className="new-project-side">
          <section className={productLockChanged ? 'vz-card panel product-lock-panel changed' : 'vz-card panel product-lock-panel'}>
            <div className="panel-header compact"><div><p className="eyebrow">CURRENT PROJECT</p><h3>项目概览</h3></div><span className="lock-label"><LockKeyhole size={14} />{productLockChanged ? '资料有更新' : '资料已同步'}</span></div>
            <div className="product-lock-summary"><div><span>产品</span><strong>{projectForm.productName || projectForm.projectName || '未命名产品'}</strong></div><div><span>SKU</span><strong>{projectForm.sku || '未填写'}</strong></div><div><span>目标站点</span><strong>{getMarketplaceOption(projectForm.marketplaceId).label}</strong></div><div><span>图片语言</span><strong>{getOutputLanguageOption(normalizeProjectLanguageFields(projectForm).outputLanguage).label}</strong></div><div><span>主参考图</span><strong>{getReferenceImageName(projectForm) || '未上传'}</strong></div><div><span>关键部件</span><strong>{splitListText(projectForm.keyPartsText).length || '未填写'}</strong></div><div><span>不可改变项</span><strong>{splitListText(projectForm.immutablePartsText).length || '未填写'}</strong></div></div>
            <div className={`reference-readiness ${referenceReadiness.ready ? 'is-ready' : 'is-blocked'}`}>
              <strong>{referenceReadiness.ready ? '参考图可进入下一步' : '参考图暂不能用于生图'}</strong>
              {[...referenceReadiness.blockers, ...referenceReadiness.warnings].slice(0, 3).map((message) => <span key={message}>{message}</span>)}
            </div>
          </section>
          {brandVersionState?.kind !== 'baseline' && (
            <section className={`vz-card panel project-brand-version-card ${brandVersionState?.kind || ''}`}>
              <div className="project-brand-version-head">
                <div>
                  <p className="eyebrow">BRAND VERSION</p>
                  <h3>{brandVersionState?.brandName || '项目品牌'}</h3>
                </div>
                <LockKeyhole size={18} />
              </div>
              {brandVersionState?.kind === 'unsaved' ? (
                <p>品牌选择尚未写入项目。先保存项目，系统会锁定当前品牌版本。</p>
              ) : brandVersionState?.kind === 'archived' ? (
                <p>项目继续使用已归档品牌 v{brandVersionState.lockedVersion}，现有生图不受影响。</p>
              ) : brandVersionState?.kind === 'checking' ? (
                <p>项目锁定 v{brandVersionState.lockedVersion}，正在检查品牌库最新版本。</p>
              ) : (
                <>
                  <div className="project-brand-version-values">
                    <span><small>项目锁定</small><strong>v{brandVersionState.lockedVersion}</strong></span>
                    <ChevronRight size={17} />
                    <span><small>品牌库当前</small><strong>v{brandVersionState.latestVersion}</strong></span>
                  </div>
                  {brandVersionState.canUpgrade ? (
                    <>
                      <p>升级后将清空旧图片方案、候选图和审核结果，产品资料、参考图和卖点会保留。</p>
                      <button
                        className="vz-btn vz-btn--secondary secondary-button project-brand-upgrade-button"
                        disabled={isUpgradingBrandSnapshot}
                        onClick={onUpgradeBrandSnapshot}
                        type="button"
                      >
                        <RefreshCcw size={16} />{isUpgradingBrandSnapshot ? '正在升级' : `升级到 v${brandVersionState.latestVersion}`}
                      </button>
                    </>
                  ) : <p>当前项目已使用最新品牌规则。</p>}
                </>
              )}
            </section>
          )}
          {productLockChanged && <div className="planning-status warning"><MessageSquareWarning size={17} /><div><strong>产品资料已变化</strong><p>重新生成卖点或方案会替换旧方案，避免混入其他产品。</p></div></div>}
        </aside>
      </div>
      {saveStatus && <p className="new-project-save-status">{saveStatus}</p>}
    </section>
  );
}

function EditableFactLedgerPanel({ ledgerFacts = facts, onUpdateFact, onAddFact, onDeleteFact, onMergeFacts }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [draftClaim, setDraftClaim] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newClaim, setNewClaim] = useState('');
  const [selectedIndices, setSelectedIndices] = useState([]);

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

  const saveNewClaim = () => {
    const claim = newClaim.trim();
    if (!claim) return;
    onAddFact?.(claim);
    setNewClaim('');
    setIsAdding(false);
  };

  const toggleSelection = (index) => {
    setSelectedIndices((current) => (
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index].sort((a, b) => a - b)
    ));
  };

  const mergeSelected = () => {
    if (selectedIndices.length < 2) return;
    onMergeFacts?.(selectedIndices);
    setSelectedIndices([]);
    setEditingIndex(null);
  };

  const deleteFact = (index, claim) => {
    if (!window.confirm(`确认删除卖点“${claim}”吗？`)) return;
    onDeleteFact?.(index);
    setSelectedIndices((current) => current
      .filter((item) => item !== index)
      .map((item) => (item > index ? item - 1 : item)));
    if (editingIndex === index) cancelEdit();
  };

  return (
    <section className="vz-card panel ledger-editor-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Claims</p>
          <h3>可用于图片的内容</h3>
        </div>
        <div className="ledger-header-actions">
          {selectedIndices.length >= 2 && (
            <button className="vz-btn vz-btn--secondary secondary-button ledger-merge-button" type="button" onClick={mergeSelected}>
              <Layers size={15} />合并所选（{selectedIndices.length}）
            </button>
          )}
          {onAddFact && <button className="vz-btn vz-btn--secondary secondary-button ledger-add-button" type="button" onClick={() => setIsAdding(true)}><Plus size={15} />添加卖点</button>}
        </div>
      </div>
      <div className="ledger-edit-list">
        {isAdding && (
          <div className="ledger-edit-row adding">
            <label className="ledger-edit-field">
              <span>新卖点</span>
              <textarea autoFocus value={newClaim} onChange={(event) => setNewClaim(event.target.value)} rows={3} placeholder="输入一个将用于图片的卖点" />
            </label>
            <div className="ledger-edit-actions">
              <button className="vz-btn vz-btn--secondary secondary-button" type="button" onClick={() => { setIsAdding(false); setNewClaim(''); }}>取消</button>
              <button className="vz-btn vz-btn--primary primary-button" type="button" disabled={!newClaim.trim()} onClick={saveNewClaim}>添加</button>
            </div>
          </div>
        )}
        {ledgerFacts.length ? ledgerFacts.map((fact, index) => {
          const isEditing = editingIndex === index;
          const risk = getClaimRiskMeta(fact);
          return (
            <div className={`ledger-edit-row ${selectedIndices.includes(index) ? 'selected' : ''}`} key={`${fact.claim}-${index}`}>
              {!isEditing && (
                <label className="ledger-select-control" title="选择后可合并卖点">
                  <input
                    aria-label={`选择卖点 ${fact.claim}`}
                    checked={selectedIndices.includes(index)}
                    onChange={() => toggleSelection(index)}
                    type="checkbox"
                  />
                </label>
              )}
              {isEditing ? (
                <>
                  <label className="ledger-edit-field">
                    <span>卖点内容</span>
                    <textarea value={draftClaim} onChange={(event) => setDraftClaim(event.target.value)} rows={3} />
                  </label>
                  <div className="ledger-edit-actions">
                    <button className="vz-btn vz-btn--secondary secondary-button" type="button" onClick={cancelEdit}>取消</button>
                    <button className="vz-btn vz-btn--primary primary-button" type="button" disabled={!draftClaim.trim()} onClick={() => saveEdit(index)}>保存</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ledger-edit-copy">
                    <strong>{fact.claim}</strong>
                    <span className="ledger-claim-meta">
                      <em>{formatClaimSource(fact.source)}</em>
                      <em className={`ledger-risk-chip ${risk.className}`}>{risk.label}</em>
                    </span>
                  </div>
                  <div className="ledger-row-actions">
                    <button className="vz-btn vz-btn--secondary secondary-button" type="button" onClick={() => startEdit(index, fact.claim)}>
                      <PencilLine size={16} />编辑
                    </button>
                    {onDeleteFact && (
                      <button aria-label={`删除卖点 ${fact.claim}`} className="vz-btn vz-btn--secondary vz-btn--icon icon-button ledger-delete-button" type="button" onClick={() => deleteFact(index, fact.claim)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
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

function LedgerPage({ projectForm, brandLibrary, ledgerFacts, onUpdateFact, onAddFact, onDeleteFact, onMergeFacts, onGoStoryboard, focusRequest }) {
  const referenceItems = getReferenceItems(projectForm).filter((item) => item.preview);
  const primaryReference = referenceItems.find((item) => item.id === 'main') || referenceItems[0];
  const brand = getBrandProfile(getProjectBrandId(projectForm, brandLibrary), brandLibrary);
  const visibleFacts = ledgerFacts.slice(0, 4);

  return (
    <section className="ledger-confirm-page">
      <header className="ledger-confirm-heading">
        <div>
          <p className="eyebrow">CONTENT CONFIRMATION</p>
          <h2>确认可用于图片的内容</h2>
          <p>这里的卖点会成为图片方案和生图提示词的唯一内容来源。</p>
        </div>
      </header>
      <div className="ledger-confirm-layout">
        <aside className="ledger-project-summary">
          <div className="ledger-summary-heading">
            <p className="eyebrow">PROJECT FACTS</p>
            <h3>产品资料</h3>
            <p>这些信息会作为整个项目的事实依据。</p>
          </div>
          <div className="ledger-reference-card">
            {primaryReference?.preview ? <img src={primaryReference.preview} alt="产品参考图" /> : <div><FileImage size={22} /></div>}
            <span><strong>{referenceItems.length} 张参考图</strong><small>{primaryReference?.name || '等待上传主参考图'}</small></span>
          </div>
          <dl className="ledger-fact-summary">
            <div><dt>品牌</dt><dd>{brand.name}</dd></div>
            <div><dt>类目</dt><dd>{projectForm.category || '未填写'}</dd></div>
            <div><dt>SKU</dt><dd>{projectForm.sku || '无 SKU'}</dd></div>
            <div><dt>产品</dt><dd>{projectForm.productName || projectForm.projectName || '未命名产品'}</dd></div>
          </dl>
          {visibleFacts.length > 0 && <div className="ledger-source-note"><strong>{ledgerFacts.length} 条卖点已整理</strong><p>可随时编辑，图片方案会使用最新内容。</p></div>}
        </aside>
        <FocusFrame active={getFocusSignal(focusRequest, 'ledger')} className="ledger-main-column">
          <EditableFactLedgerPanel
            ledgerFacts={ledgerFacts}
            onUpdateFact={onUpdateFact}
            onAddFact={onAddFact}
            onDeleteFact={onDeleteFact}
            onMergeFacts={onMergeFacts}
          />
          <footer className="ledger-next-bar">
            <span><strong>{ledgerFacts.length ? `${ledgerFacts.length} 条内容已就绪` : '先添加至少一个卖点'}</strong><small>下一步会依据这些内容规划每张图要证明什么。</small></span>
            <button className="vz-btn vz-btn--primary primary-button" type="button" disabled={!ledgerFacts.length} onClick={onGoStoryboard}><Layers size={16} />确认内容并规划图片</button>
          </footer>
        </FocusFrame>
      </div>
    </section>
  );
}

function BrandLibraryPage({ brandLibrary, brandLibraryStatus, onUpdateBrands, onSaveBrand, onDeleteBrand, userRole, focusRequest }) {
  const [selectedBrandId, setSelectedBrandId] = useState(brandLibrary.find((brand) => brand.id !== 'none')?.id || 'none');
  const [view, setView] = useState('library');
  const [deleteChallenge, setDeleteChallenge] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [saveError, setSaveError] = useState('');
  const [versionHistory, setVersionHistory] = useState([]);
  const [historyState, setHistoryState] = useState('idle');
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState(null);
  const [cloneState, setCloneState] = useState('idle');
  const selectedBrand = getBrandProfile(selectedBrandId, brandLibrary);
  const editable = selectedBrand.id !== 'none';
  const brandColorTotal = getBrandColorRatioTotal(selectedBrand.colors);
  const managedBrands = brandLibrary.filter((brand) => brand.id !== 'none');
  const savedBrandCount = managedBrands.filter((brand) => brand.version).length;
  const logoBrandCount = managedBrands.filter((brand) => brand.logoPreview || brand.logoStorageKey).length;
  const exampleReadyCount = managedBrands.filter((brand) => normalizeBrandExampleImages(brand.exampleImages).length >= 2).length;
  const paletteIssueCount = managedBrands.filter((brand) => getBrandColorRatioTotal(brand.colors) !== 100).length;

  useEffect(() => {
    if (!brandLibrary.some((brand) => brand.id === selectedBrandId)) {
      setSelectedBrandId(brandLibrary.find((brand) => brand.id !== 'none')?.id || 'none');
    }
  }, [brandLibrary, selectedBrandId]);

  useEffect(() => {
    setDeleteChallenge('');
    setDeleteConfirmText('');
    setSaveError('');
    setSaveState(selectedBrand.id === 'none' || selectedBrand.version ? 'saved' : 'dirty');
  }, [selectedBrand.id, selectedBrand.version]);

  useEffect(() => {
    let cancelled = false;
    setSelectedHistoryVersion(null);
    if (view !== 'editor' || !selectedBrand.version || selectedBrand.id === 'none') {
      setVersionHistory([]);
      setHistoryState('idle');
      return () => { cancelled = true; };
    }
    setHistoryState('loading');
    listTeamBrandVersions(selectedBrand.id)
      .then((versions) => {
        if (cancelled) return;
        setVersionHistory(versions.map(normalizeBrandProfile));
        setHistoryState('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setHistoryState('error');
        setSaveError(error instanceof Error ? error.message : '品牌版本历史读取失败。');
      });
    return () => { cancelled = true; };
  }, [selectedBrand.id, selectedBrand.version, view]);

  const updateBrand = (patch) => {
    if (!editable) return;
    setSaveState('dirty');
    setSaveError('');
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
        { hex: '#FFFFFF', ratio: 60, role: 'background', scope: 'secondary-and-aplus' },
        { hex: '#8A8F8B', ratio: 40, role: 'accent', scope: 'secondary-and-aplus' }
      ],
      backgroundPolicy: '02-07 可使用品牌色块或真实使用场景；01 白底主图不使用。',
      scenes: ['real product use scene'],
      forbiddenStyles: ['cheap promotion', 'cartoon style'],
      logoPolicy: 'Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示 Logo。',
      arrowStyle: 'minimal-line',
      titleColor: '#18211F',
      styleRules: ['clean layout', 'realistic lighting']
    });
    onUpdateBrands([...brandLibrary, nextBrand]);
    setSelectedBrandId(nextBrand.id);
    setView('editor');
    setSaveState('dirty');
    setSaveError('');
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
  const uploadBrandExamples = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !editable) return;
    const current = normalizeBrandExampleImages(selectedBrand.exampleImages);
    const available = Math.max(0, 5 - current.length);
    if (!available) {
      setSaveError('品牌示例图最多 5 张，请先移除一张。');
      event.target.value = '';
      return;
    }
    const selectedFiles = files.slice(0, available);
    const additions = await Promise.all(selectedFiles.map((file, index) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: `example-${Date.now()}-${index}`,
        name: file.name,
        caption: '',
        storageKey: '',
        preview: String(reader.result || '')
      });
      reader.readAsDataURL(file);
    })));
    updateBrand({ exampleImages: [...current, ...additions] });
    event.target.value = '';
  };
  const updateBrandExample = (index, patch) => {
    updateBrand({
      exampleImages: selectedBrand.exampleImages.map((image, imageIndex) => (
        imageIndex === index ? { ...image, ...patch } : image
      ))
    });
  };
  const moveBrandExample = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= selectedBrand.exampleImages.length) return;
    const next = [...selectedBrand.exampleImages];
    [next[index], next[target]] = [next[target], next[index]];
    updateBrand({ exampleImages: next });
  };
  const removeBrandExample = (index) => {
    updateBrand({ exampleImages: selectedBrand.exampleImages.filter((_, imageIndex) => imageIndex !== index) });
  };
  const cloneSelectedBrand = async () => {
    if (!editable || !selectedBrand.version || cloneState === 'loading') return;
    setCloneState('loading');
    setSaveError('');
    try {
      const cloned = normalizeBrandProfile(await cloneTeamBrand(selectedBrand.id, {
        version: selectedHistoryVersion?.version || selectedBrand.version,
        name: `${selectedBrand.name} Copy`
      }));
      onUpdateBrands(normalizeBrandLibrary([...brandLibrary, cloned]));
      setSelectedBrandId(cloned.id);
      setSelectedHistoryVersion(null);
      setSaveState('saved');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '克隆品牌失败。');
    } finally {
      setCloneState('idle');
    }
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
        { id: `color-${Date.now()}`, hex: '#FFFFFF', ratio: 10, role: 'accent', scope: 'secondary-and-aplus' }
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
  const saveSelectedBrand = async () => {
    if (!editable || !onSaveBrand || saveState === 'saving') return;
    const validationError = validateBrandProfileForSave(selectedBrand);
    if (validationError) {
      setSaveError(validationError);
      setSaveState('dirty');
      return;
    }
    setSaveState('saving');
    setSaveError('');
    try {
      const savedBrand = await onSaveBrand(selectedBrand);
      if (savedBrand?.id) setSelectedBrandId(savedBrand.id);
      setSaveState('saved');
    } catch (error) {
      setSaveState('dirty');
      setSaveError(error instanceof Error ? error.message : '品牌规则保存失败。');
    }
  };
  const deleteSelectedBrand = async () => {
    if (!editable || !deleteChallenge || deleteConfirmText !== deleteChallenge) return;
    try {
      await onDeleteBrand?.(selectedBrand);
      const nextBrands = brandLibrary.filter((brand) => brand.id !== selectedBrand.id);
      const nextSelected = nextBrands.find((brand) => brand.id !== 'none')?.id || 'none';
      onUpdateBrands(nextBrands);
      setSelectedBrandId(nextSelected);
      setDeleteChallenge('');
      setDeleteConfirmText('');
      setSaveState('saved');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '品牌删除失败。');
    }
  };

  return (
    <section className={view === 'editor' ? `brand-settings-page role-${userRole}` : `page-grid brand-library-page role-${userRole}`}>
      {view === 'library' && <FocusFrame active={getFocusSignal(focusRequest, 'brands')} className="left-column">
        <section className="vz-card panel brand-library-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">BRAND ASSETS</p>
              <h3>品牌库</h3>
              <small>品牌规则作为项目资源存在，不占用生产步骤。</small>
            </div>
            <button className="vz-btn vz-btn--primary primary-button" onClick={addBrand}>
              <Plus size={16} />
              新增品牌
            </button>
          </div>
          <div className={`brand-library-sync-state ${brandLibraryStatus || 'ready'}`} role="status">
            <span>{brandLibraryStatus === 'loading' ? '正在同步团队品牌库' : brandLibraryStatus === 'error' ? '团队品牌库暂时不可用' : '团队品牌库已同步'}</span>
            <small>{brandLibraryStatus === 'error' ? '缓存只用于查看，不会进入生产生图；已有项目仍使用冻结的品牌快照。' : '生产生图只使用项目内冻结的品牌版本。'}</small>
          </div>
          <div className="brand-library-summary">
            <span><strong>{managedBrands.length}</strong>品牌</span>
            <span><strong>{savedBrandCount}</strong>已保存版本</span>
            <span><strong>{logoBrandCount}</strong>Logo 素材</span>
            <span><strong>{exampleReadyCount}</strong>示例图就绪</span>
            <span><strong>{paletteIssueCount}</strong>色彩待校准</span>
          </div>
          <div className="brand-card-list">
            {brandLibrary.map((brand) => (
              <button
                className={selectedBrand.id === brand.id ? 'brand-card active' : 'brand-card'}
                key={brand.id}
                onClick={() => {
                  setSelectedBrandId(brand.id);
                  setView('editor');
                }}
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
                  <em className="brand-card-rules">
                    <span><i style={{ background: brand.titleColor }} />标题色 {brand.titleColor}</span>
                    <span>{getBrandArrowStyle(brand.arrowStyle).label}</span>
                    <span>{brand.id === 'none' ? '中性基线' : 'Logo 仅 A+'}</span>
                  </em>
                </span>
              </button>
            ))}
          </div>
        </section>
      </FocusFrame>}

      {view === 'editor' && <div className="brand-settings-content">
        <section className="vz-card panel brand-editor-panel">
          <div className="panel-header compact">
            <div>
              <button className="workspace-back-button" type="button" onClick={() => setView('library')}><ChevronRight size={15} />返回品牌库</button>
              <p className="eyebrow">Brand Rules</p>
              <h3>{selectedBrand.name}</h3>
            </div>
            <div className="brand-header-actions">
              <button className="vz-btn vz-btn--ghost text-button" onClick={resetBrands}>恢复默认品牌库</button>
              {editable && <button className="vz-btn vz-btn--primary primary-button" disabled={saveState === 'saving'} onClick={saveSelectedBrand} type="button">
                <Save size={15} />
                {saveState === 'saving' ? '保存中…' : saveState === 'dirty' ? '保存品牌规则' : `已保存${selectedBrand.version ? ` · v${selectedBrand.version}` : ''}`}
              </button>}
              {editable && userRole === 'admin' && (
                <button className="vz-btn vz-btn--ghost text-button danger" onClick={startDeleteBrand}>
                  <Trash2 size={15} />
                  删除品牌
                </button>
              )}
            </div>
          </div>
          <div className="brand-editor-summary">
            <span><strong>{selectedBrand.version ? `v${selectedBrand.version}` : '未保存'}</strong>版本</span>
            <span className={brandColorTotal === 100 ? 'ok' : 'warn'}><strong>{brandColorTotal}%</strong>色彩比例</span>
            <span><strong>{selectedBrand.colors.length}</strong>品牌色</span>
            <span className={selectedBrand.exampleImages.length >= 2 ? 'ok' : 'warn'}><strong>{selectedBrand.exampleImages.length}/5</strong>示例图</span>
            <span className={selectedBrand.logoPreview || selectedBrand.logoStorageKey ? 'ok' : 'warn'}><strong>{selectedBrand.logoPreview || selectedBrand.logoStorageKey ? '已上传' : '未上传'}</strong>Logo</span>
          </div>
          {saveError && <div className="brand-save-error" role="alert">{saveError}</div>}
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
            <label>
              <span>统一标题颜色</span>
              <div className="brand-title-color-row">
                <input
                  aria-label="统一标题颜色"
                  disabled={!editable}
                  type="color"
                  value={selectedBrand.titleColor}
                  onChange={(event) => updateBrand({ titleColor: normalizeHexColor(event.target.value) || selectedBrand.titleColor })}
                />
                <input
                  aria-label="统一标题颜色 HEX"
                  disabled={!editable}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  value={selectedBrand.titleColor}
                  onChange={(event) => {
                    const nextHex = normalizeHexColor(event.target.value);
                    if (nextHex) updateBrand({ titleColor: nextHex });
                  }}
                />
              </div>
            </label>
            <label>
              <span>箭头使用样式</span>
              <select disabled={!editable} value={selectedBrand.arrowStyle} onChange={(event) => updateBrand({ arrowStyle: event.target.value })}>
                {brandArrowStyleOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>图标样式</span>
              <select disabled={!editable} value={selectedBrand.iconStyle} onChange={(event) => updateBrand({ iconStyle: event.target.value })}>
                {brandIconStyleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>标注线样式</span>
              <select disabled={!editable} value={selectedBrand.annotationStyle} onChange={(event) => updateBrand({ annotationStyle: event.target.value })}>
                {brandAnnotationStyleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>图形圆角</span>
              <select disabled={!editable} value={selectedBrand.cornerStyle} onChange={(event) => updateBrand({ cornerStyle: event.target.value })}>
                {brandCornerStyleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>信息标签样式</span>
              <select disabled={!editable} value={selectedBrand.labelStyle} onChange={(event) => updateBrand({ labelStyle: event.target.value })}>
                {brandLabelStyleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <div className="brand-color-editor">
              <div className="brand-color-editor-head">
                <span>品牌色</span>
                <strong className={brandColorTotal === 100 ? 'ok' : 'warn'}>使用比例合计 {brandColorTotal}%</strong>
              </div>
              <div className="brand-color-rows">
                {selectedBrand.colors.map((color, index) => (
                  <div className="brand-color-row" key={color.id || `${color.hex}-${index}`}>
                    <div className="brand-color-row-main">
                      <input
                        aria-label="品牌色号"
                        className="brand-color-swatch"
                        disabled={!editable}
                        type="color"
                        value={color.hex}
                        onChange={(event) => updateBrandColor(index, { hex: event.target.value })}
                      />
                      <input
                        aria-label="品牌色 HEX"
                        className="brand-color-hex"
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
                        className="brand-color-ratio"
                        disabled={!editable}
                        max="100"
                        min="1"
                        type="number"
                        value={color.ratio}
                        onChange={(event) => updateBrandColor(index, { ratio: event.target.value })}
                      />
                      <span className="brand-color-percent">%</span>
                      <button className="vz-btn vz-btn--secondary vz-btn--icon icon-button brand-color-delete" disabled={!editable || selectedBrand.colors.length <= 1} onClick={() => removeBrandColor(index)} type="button" aria-label="删除品牌色">
                        <X size={15} />
                      </button>
                    </div>
                    <div className="brand-color-row-meta">
                      <select
                        aria-label="颜色用途"
                        className="brand-color-role"
                        disabled={!editable}
                        value={color.role}
                        onChange={(event) => updateBrandColor(index, { role: event.target.value })}
                      >
                        {brandColorRoleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                      <select
                        aria-label="颜色适用范围"
                        className="brand-color-scope"
                        disabled={!editable}
                        value={color.scope}
                        onChange={(event) => updateBrandColor(index, { scope: event.target.value })}
                      >
                        {brandColorScopeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="brand-color-actions">
                <button className="vz-btn vz-btn--secondary secondary-button" disabled={!editable || selectedBrand.colors.length >= 8} onClick={addBrandColor} type="button">
                  <Plus size={15} />
                  添加色号
                </button>
                <p>只能使用 HEX 色号，比例合计必须为 100%。用途和适用范围会控制每个颜色可出现的位置；系统不会把色号、比例或色板画进图片。</p>
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
                <button className="vz-btn vz-btn--secondary secondary-button" onClick={cancelDeleteBrand} type="button">
                  取消
                </button>
                <button
                  className="vz-btn vz-btn--secondary secondary-button danger"
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

        <section className="vz-card panel brand-logo-panel">
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
            <label className={editable ? 'vz-btn vz-btn--secondary secondary-button upload-button' : 'vz-btn vz-btn--secondary secondary-button upload-button disabled'} htmlFor="brand-logo-upload">
              <Upload size={16} />
              上传 Logo
            </label>
            <input id="brand-logo-upload" type="file" accept="image/*" disabled={!editable} onChange={uploadLogo} />
          </div>
        </section>

        <section className="vz-card panel brand-example-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Visual Examples</p>
              <h3>品牌示例图</h3>
              <small>上传 2–5 张最能代表品牌构图、字体层级和标注方式的图片。</small>
            </div>
            <label className={editable && selectedBrand.exampleImages.length < 5 ? 'vz-btn vz-btn--secondary secondary-button upload-button' : 'vz-btn vz-btn--secondary secondary-button upload-button disabled'} htmlFor="brand-example-upload">
              <ImagePlus size={16} />添加示例图
            </label>
            <input id="brand-example-upload" type="file" accept="image/*" multiple disabled={!editable || selectedBrand.exampleImages.length >= 5} onChange={uploadBrandExamples} />
          </div>
          <div className={`brand-example-readiness ${selectedBrand.exampleImages.length >= 2 ? 'ready' : 'waiting'}`}>
            <strong>{selectedBrand.exampleImages.length >= 2 ? '可用于品牌生图' : `还需 ${2 - selectedBrand.exampleImages.length} 张`}</strong>
            <span>示例图只控制视觉语言，不会复制其中的产品、文案或卖点。</span>
          </div>
          {selectedBrand.exampleImages.length ? (
            <div className="brand-example-grid">
              {selectedBrand.exampleImages.map((image, index) => (
                <article className="brand-example-card" key={image.id}>
                  <div className="brand-example-preview">
                    {image.preview ? <img src={image.preview} alt={image.caption || image.name} /> : <FileImage size={28} />}
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="brand-example-fields">
                    <strong>{image.name}</strong>
                    <input
                      aria-label={`示例图 ${index + 1} 说明`}
                      disabled={!editable}
                      placeholder="例如：标题层级、留白与细线标注"
                      value={image.caption}
                      onChange={(event) => updateBrandExample(index, { caption: event.target.value })}
                    />
                  </div>
                  <div className="brand-example-actions">
                    <button className="vz-btn vz-btn--secondary vz-btn--icon" disabled={!editable || index === 0} onClick={() => moveBrandExample(index, -1)} type="button" aria-label="前移示例图"><ArrowLeft size={15} /></button>
                    <button className="vz-btn vz-btn--secondary vz-btn--icon" disabled={!editable || index === selectedBrand.exampleImages.length - 1} onClick={() => moveBrandExample(index, 1)} type="button" aria-label="后移示例图"><ArrowRight size={15} /></button>
                    <button className="vz-btn vz-btn--secondary vz-btn--icon danger" disabled={!editable} onClick={() => removeBrandExample(index)} type="button" aria-label="移除示例图"><Trash2 size={15} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="brand-example-empty"><ImagePlus size={26} /><strong>还没有品牌示例图</strong><span>先选择 2 张最典型的历史成图。</span></div>}
        </section>

        {editable && selectedBrand.version > 0 && (
          <section className="vz-card panel brand-version-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Version History</p>
                <h3>版本历史</h3>
                <small>每次保存都会生成不可覆盖的新版本，已有项目继续使用原锁定版本。</small>
              </div>
              <button className="vz-btn vz-btn--secondary secondary-button" disabled={cloneState === 'loading'} onClick={cloneSelectedBrand} type="button">
                <Layers size={16} />{cloneState === 'loading' ? '克隆中…' : `克隆${selectedHistoryVersion ? ` v${selectedHistoryVersion.version}` : '当前版本'}`}
              </button>
            </div>
            {historyState === 'loading' && <div className="brand-version-state">正在读取版本历史…</div>}
            {historyState === 'error' && <div className="brand-version-state error">版本历史暂时不可用。</div>}
            {historyState === 'ready' && (
              <div className="brand-version-layout">
                <div className="brand-version-list">
                  {versionHistory.map((version) => (
                    <button className={selectedHistoryVersion?.version === version.version ? 'active' : ''} key={version.version} onClick={() => setSelectedHistoryVersion(version)} type="button">
                      <span><strong>v{version.version}</strong>{version.version === selectedBrand.version && <em>当前</em>}</span>
                      <small>{version.createdAt ? new Date(version.createdAt).toLocaleString('zh-CN') : '保存时间未知'}</small>
                    </button>
                  ))}
                </div>
                <div className="brand-version-detail">
                  {selectedHistoryVersion ? (
                    <>
                      <div><strong>{selectedHistoryVersion.name} · v{selectedHistoryVersion.version}</strong><span>{selectedHistoryVersion.createdByName || '团队成员'} 创建</span></div>
                      <dl>
                        <div><dt>示例图</dt><dd>{selectedHistoryVersion.exampleImages.length} 张</dd></div>
                        <div><dt>色彩</dt><dd>{selectedHistoryVersion.colors.length} 个</dd></div>
                        <div><dt>图标</dt><dd>{getBrandStyleOption(brandIconStyleOptions, selectedHistoryVersion.iconStyle).label}</dd></div>
                        <div><dt>标签</dt><dd>{getBrandStyleOption(brandLabelStyleOptions, selectedHistoryVersion.labelStyle).label}</dd></div>
                      </dl>
                      <div className="brand-version-thumbs">
                        {selectedHistoryVersion.exampleImages.map((image) => image.preview && <img key={image.id} src={image.preview} alt="" />)}
                      </div>
                    </>
                  ) : <div className="brand-version-placeholder"><Clock3 size={22} /><span>选择一个版本查看规则与示例图，也可以从该版本克隆新品牌。</span></div>}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
      }
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
  const targetSlotCount = getStoryboardTargetSlotCount(projectForm, ledgerFacts);

  return (
    <section className="main-grid storyboard-workspace">
      <div className="left-column">
        <section className="vz-card panel focus-summary-panel">
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
              <p>当前只检查每个图槽要表达什么；真实视觉效果在生图任务中判断。</p>
              <div className="mini-stat-row">
                <span>{ledgerFacts.length} 个卖点</span>
                <span>{storyboardBriefs.length || 0}/{targetSlotCount} 图槽</span>
              </div>
            </div>
          </div>
        </section>
        <details className="vz-card panel disclosure-panel">
          <summary>
            <span>
              <b>产品参考图</b>
              <small>查看已上传的产品图和生成规则</small>
            </span>
            <ChevronRight size={17} />
          </summary>
          <ReferencePanel projectForm={projectForm} />
        </details>
        <details className="vz-card panel disclosure-panel">
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
        <section className="vz-card panel storyboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Plan</p>
              <h3>确认{selectedPlanPreset.label}图片方向</h3>
            </div>
            <button
              aria-busy={isPlanningStoryboard || Boolean(regeneratingSlotId)}
              className="vz-btn vz-btn--secondary secondary-button"
              disabled={isPlanningStoryboard || Boolean(regeneratingSlotId)}
              onClick={onGenerateStoryboardBriefs}
            >
              {isPlanningStoryboard ? <VistamzLoader size={16} label="AI 正在生成图片方案" /> : <Sparkles size={17} />}
              {isPlanningStoryboard
                ? 'AI 生成中...'
                : !ledgerFacts.length
                ? '先确认卖点'
                : storyboardBriefs.length
                  ? '重新生成整套方案'
                  : '生成图片方案'}
            </button>
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
              <VistamzLoader size={24} label="正在生成图片方向" />
              <div>
                <strong>正在生成 {targetSlotCount} 个图片方向</strong>
                <p>AI 正在读取产品图、已确认卖点和品牌风格，并为这个产品选择合适的图片角色。</p>
              </div>
            </div>
          )}

          {regeneratingSlotId && (
            <div className="planning-status">
              <VistamzLoader size={24} label="正在重新生成当前图方案" />
              <div>
                <strong>正在重生成第 {String(regeneratingSlotId).padStart(2, '0')} 张图方案</strong>
                <p>系统只替换当前图槽的图片角色、卖点和画面证明方式，其他方案保持不变。</p>
              </div>
            </div>
          )}

          {isStoryboardPlanReady(storyboardBriefs, projectForm) && (
            <div className="inline-next-step">
              <div>
                <Check size={18} />
                <span>
                  <strong>{storyboardBriefs.length} 个图片方向已生成</strong>
                  <small>这里先检查每张图要表达什么，不评估最终视觉效果；确认后进入生图任务。</small>
                </span>
              </div>
              <button className="vz-btn vz-btn--primary primary-button" onClick={onGoGeneration}>
                <Sparkles size={16} />
                下一步：生图任务
              </button>
            </div>
          )}

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
                      <strong>还没有图片方案</strong>
                      <p>先根据产品和卖点生成每张图的目的、卖点、画面证明方式和禁用边界，再进入生图任务。</p>
                    </div>
                  )}
          </>
        </section>
        </FocusFrame>

        <TaskListPanel storyboardBriefs={storyboardBriefs} />
      </div>
    </section>
  );
}

function StoryboardPlanPage({
  selectedSlot,
  setSelectedSlot,
  ledgerFacts,
  projectForm,
  storyboardBriefs,
  onChangePlanOutputPreset,
  isPlanningStoryboard,
  regeneratingSlotId,
  onGenerateStoryboardBriefs,
  onRegenerateStoryboardSlot,
  onAddStoryboardSlot,
  onRemoveStoryboardSlot,
  onMoveStoryboardSlot,
  onGoGeneration,
  focusRequest
}) {
  const activeSlots = useMemo(() => getActiveSlots(storyboardBriefs), [storyboardBriefs]);
  const selectedBrief = storyboardBriefs.find((brief) => brief.id === selectedSlot.id);
  const selectedPreset = getProjectPlanOutputPreset(projectForm);
  const isReady = isStoryboardPlanReady(storyboardBriefs, projectForm);
  const isAPlus = selectedPreset.id === 'aplus';
  const selectedIndex = storyboardBriefs.findIndex((brief) => Number(brief.id) === Number(selectedBrief?.id));
  const minimumSlotCount = isAPlus ? APLUS_MIN_MODULE_COUNT : MAIN_MIN_SLOT_COUNT;
  const maximumSlotCount = isAPlus ? APLUS_MAX_MODULE_COUNT : MAIN_MAX_SLOT_COUNT;
  const canMoveEarlier = selectedIndex > (isAPlus ? 0 : 1);
  const canMoveLater = selectedIndex >= 0
    && selectedIndex < storyboardBriefs.length - 1
    && (isAPlus || Number(selectedBrief?.id) !== 1);
  const canRemoveSelected = Boolean(selectedBrief)
    && storyboardBriefs.length > minimumSlotCount
    && (isAPlus || Number(selectedBrief.id) !== 1);
  const selectedContract = selectedBrief?.contractVersion
    ? selectedBrief
    : selectedBrief
      ? normalizeStoryboardSlotContract({
        slot: selectedBrief,
        id: selectedBrief.id,
        visualType: selectedBrief.visualType,
        primaryClaim: selectedBrief.primaryClaim,
        visualProof: selectedBrief.visualProof,
        composition: selectedBrief.composition,
        outputPresetId: selectedBrief.outputPresetId || selectedPreset.id,
        outputPresetSize: selectedBrief.outputPresetSize || selectedPreset.size,
        projectForm,
        brand: {
          id: selectedBrief.brandId,
          version: selectedBrief.brandVersion,
          ...(selectedBrief.brandRules || {})
        },
        blockedClaims: selectedBrief.blockedClaims,
        guardrails: selectedBrief.guardrails
      })
      : null;
  const incompleteBriefCount = storyboardBriefs.filter((brief, index) => (
    !String(brief?.composition || '').trim()
    || !String(brief?.visualProof || '').trim()
    || ((isAPlus || index > 0) && !String(brief?.primaryClaim || '').trim())
  )).length;

  return (
    <section className="storyboard-plan-page">
      <header className="storyboard-plan-heading">
        <div>
          <p className="eyebrow">IMAGE PLAN</p>
          <h2>规划图片方案</h2>
          <p>先确认每张图要证明什么，再进入真实生图。</p>
        </div>
      </header>

      <section className="storyboard-output-bar">
        <div>
          <p className="eyebrow">OUTPUT TYPE</p>
          <h3>选择这次的图片类型</h3>
        </div>
        <div className="output-mode compact" role="group" aria-label="选择图片类型">
          {outputPresets.map((preset) => (
            <button
              className={selectedPreset.id === preset.id ? 'active' : ''}
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
      </section>

      <section className="storyboard-rule-summary">
        <div>
          <strong>{isAPlus ? 'A+ 内容规则' : '主图套图规则'}</strong>
          <p>{isAPlus
            ? 'A+ 不要求白底首图；可组合相关卖点，使用更丰富的场景与品牌化版式。'
            : '第 1 张为白底主图；其余图片通过画面证明卖点，保持统一字体和画面风格。'}</p>
        </div>
        <span>{ledgerFacts.length} 条已确认内容</span>
      </section>

      {isPlanningStoryboard && (
        <div className="planning-status storyboard-plan-progress">
          <VistamzLoader size={24} label="正在生成图片方案" />
          <div><strong>正在生成图片方案</strong><p>系统正在结合产品参考图、已确认卖点和品牌规则规划图片角色。</p></div>
        </div>
      )}

      <FocusFrame active={getFocusSignal(focusRequest, 'storyboard')} className="storyboard-plan-grid">
        {activeSlots.map((slot) => {
          const brief = storyboardBriefs.find((item) => item.id === slot.id);
          const isSelected = selectedSlot.id === slot.id;
          return (
            <button className={isSelected ? 'storyboard-plan-card active' : 'storyboard-plan-card'} key={slot.id} onClick={() => setSelectedSlot(slot)} type="button">
              <span>{String(slot.id).padStart(2, '0')}</span>
              <h3>{brief?.title || slot.title}</h3>
              <p>{brief?.goal || '等待生成该图片的卖点与画面证明方式。'}</p>
              <strong>主卖点：{brief?.primaryClaim || '待分配'}</strong>
              <small>查看方案</small>
            </button>
          );
        })}
      </FocusFrame>

      {selectedBrief && (
        <section className="storyboard-plan-detail">
          <div className="storyboard-plan-detail-head">
            <div><p className="eyebrow">SELECTED IMAGE</p><h3>{String(selectedBrief.id).padStart(2, '0')} · {selectedBrief.title}</h3></div>
            <div className="storyboard-plan-slot-actions">
              <button aria-label="向前移动图槽" className="vz-btn vz-btn--secondary secondary-button icon-button" disabled={!canMoveEarlier || Boolean(regeneratingSlotId)} onClick={() => onMoveStoryboardSlot(selectedBrief.id, -1)} title="向前移动" type="button"><ArrowLeft size={16} /></button>
              <button aria-label="向后移动图槽" className="vz-btn vz-btn--secondary secondary-button icon-button" disabled={!canMoveLater || Boolean(regeneratingSlotId)} onClick={() => onMoveStoryboardSlot(selectedBrief.id, 1)} title="向后移动" type="button"><ArrowRight size={16} /></button>
              <button aria-label="删除可选图槽" className="vz-btn vz-btn--secondary secondary-button icon-button danger" disabled={!canRemoveSelected || Boolean(regeneratingSlotId)} onClick={() => onRemoveStoryboardSlot(selectedBrief.id)} title="删除可选图槽" type="button"><Trash2 size={16} /></button>
              <button className="vz-btn vz-btn--secondary secondary-button" disabled={Boolean(regeneratingSlotId)} onClick={() => onRegenerateStoryboardSlot(selectedBrief.id)} type="button">
                {regeneratingSlotId === selectedBrief.id ? <VistamzLoader size={16} label="正在重新生成当前方案" /> : <RefreshCcw size={16} />}
                {regeneratingSlotId === selectedBrief.id ? '正在重生成...' : '重新生成当前方案'}
              </button>
            </div>
          </div>
          <div className="storyboard-plan-detail-grid contract-grid">
            <div><span>图片目标</span><strong>{selectedBrief.goal}</strong></div>
            <div><span>画面如何证明</span><strong>{selectedBrief.visualProof || selectedBrief.composition}</strong></div>
            <div><span>允许出现的文案</span><strong>{selectedContract?.allowedCopy?.length ? selectedContract.allowedCopy.join(' · ') : selectedContract?.copyPolicy || '不新增可见文案'}</strong></div>
            <div><span>场景与必须出现</span><strong>{[selectedContract?.scenePlan?.environment, ...(selectedContract?.scenePlan?.requiredElements || [])].filter(Boolean).join(' · ') || selectedBrief.composition}</strong></div>
            <div><span>品牌与输出规格</span><strong>{`${selectedContract?.brandRules?.mode === 'brand' ? '品牌模式' : '基线模式'} · ${selectedContract?.outputSpec?.size || selectedPreset.size} · ${selectedContract?.outputSpec?.backgroundRule || '按方案背景'}`}</strong></div>
            <div><span>禁止与合规边界</span><strong>{selectedContract?.complianceRules?.join(' · ') || selectedBrief.guardrails?.join(' · ') || '仅使用已确认事实，不改变产品结构'}</strong></div>
          </div>
        </section>
      )}

      <footer className="storyboard-plan-footer">
        <span><strong>{isReady ? `图片方案已准备 · ${storyboardBriefs.length} 个图槽` : incompleteBriefCount ? `还有 ${incompleteBriefCount} 个图槽缺少卖点或画面证据` : isAPlus ? '先生成 A+ 内容模块方案' : '先生成 7 张图片方案'}</strong><small>{isReady ? '方案阶段只确认卖点与画面证明方式，视觉质量在生图后判断。' : '每张图必须明确主卖点、画面证据、可见文案和规则边界后才能开始生图。'}</small></span>
        <div className="storyboard-plan-footer-actions">
          <button
            className="vz-btn vz-btn--secondary secondary-button"
            disabled={!isReady || storyboardBriefs.length >= maximumSlotCount || isPlanningStoryboard || Boolean(regeneratingSlotId)}
            onClick={onAddStoryboardSlot}
            type="button"
          >
            <Plus size={16} />添加可选图槽
          </button>
          <button
            aria-busy={isPlanningStoryboard}
            className="vz-btn vz-btn--secondary secondary-button"
            disabled={isPlanningStoryboard || !ledgerFacts.length}
            onClick={onGenerateStoryboardBriefs}
            type="button"
          >
            {isPlanningStoryboard ? <VistamzLoader size={16} label="正在生成图片方案" /> : <Sparkles size={16} />}
            {isPlanningStoryboard ? '正在生成...' : isReady ? '重新生成方案' : '生成方案'}
          </button>
          <button className="vz-btn vz-btn--primary primary-button" disabled={!isReady || isPlanningStoryboard} onClick={onGoGeneration} type="button"><Sparkles size={16} />确认方案，开始生图</button>
        </div>
      </footer>
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
  const exportReady = approved === slotTotal && isStoryboardPlanReady(storyboardBriefs);
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
      <button className={exportReady ? 'vz-btn vz-btn--primary primary-button' : 'vz-btn vz-btn--secondary secondary-button'} disabled={!exportReady}>
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
    <section className="vz-card panel quality-report-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Quality Samples</p>
          <h3>质量样本表</h3>
        </div>
        <div className="panel-actions">
          <label className="vz-btn vz-btn--secondary secondary-button upload-button" htmlFor={importInputId}>
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
          <button className="vz-btn vz-btn--secondary secondary-button" disabled={!overview.total} onClick={onExportQualityCsv}>
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
    <section className="vz-card panel prompt-tuning-panel">
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
          <div className="prompt-tuning-current-head">
            <div>
              <span>当前图槽附加规则</span>
              <small>仅作用于本图槽的下一次生成</small>
            </div>
            {promptOverride && <span className="prompt-rule-count">已应用</span>}
          </div>
          {promptOverride ? (
            <>
              <details className="prompt-rule-preview">
                <summary>查看已应用规则 <ChevronRight size={15} /></summary>
                <p>{promptOverride}</p>
              </details>
              <button className="vz-btn vz-btn--ghost text-button" onClick={() => onUpdatePromptOverride(slot.id, '')}>清空本图槽规则</button>
            </>
          ) : (
            <p>暂未添加调优规则。系统会根据人工判断和 AI 预审结果推荐可用约束。</p>
          )}
        </div>
        <div className="prompt-suggestion-list">
          {suggestions.length ? suggestions.map((suggestion) => (
            <details className="prompt-suggestion" key={suggestion.id}>
              <summary>
                <div>
                  <span>{suggestion.title}</span>
                  <small>来自 {suggestion.score} 个质量信号</small>
                </div>
                <ChevronRight size={16} />
              </summary>
              <div className="prompt-suggestion-detail">
                <p>{suggestion.text}</p>
                <button
                  className="vz-btn vz-btn--secondary secondary-button"
                  onClick={() => onUpdatePromptOverride(slot.id, mergePromptOverride(promptOverride, suggestion.text))}
                >
                  <Plus size={15} />
                  加入本图
                </button>
              </div>
            </details>
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
  if (/^not found$/i.test(raw) || /API 服务版本过旧/i.test(raw)) {
    return '当前页面连接的 API 服务版本过旧，未找到生图任务入口。无需重新上传图片，请刷新页面或更新后端服务后重试。';
  }
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
  if (/AI response JSON object was incomplete|AI_REVIEW_INCOMPLETE_JSON|预审返回不完整|did not contain a JSON object|did not return text/i.test(raw)) {
    return 'AI 预审返回不完整，候选图已保留。请重试 AI 预审或直接人工判断。';
  }
  if (/did not return an image|没有返回图片|text only/i.test(raw)) {
    return 'Gemini 本次没有返回图片。请重新生成当前图槽，或稍后再试。';
  }
  return raw;
}

function normalizeSelectionPoint(event, element) {
  const bounds = element.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
  };
}

function getLocalEditMaskDimensions(outputPreset = null) {
  const sourceWidth = Number(outputPreset?.width) || 1024;
  const sourceHeight = Number(outputPreset?.height) || 1024;
  const scale = 1024 / Math.max(sourceWidth, sourceHeight);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale))
  };
}

function loadCanvasImage(imageSrc, errorMessage = '图片读取失败', timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeoutId = window.setTimeout(() => {
      image.src = '';
      reject(new Error(`${errorMessage}（等待超过 ${Math.round(timeoutMs / 1000)} 秒）`));
    }, timeoutMs);
    image.onload = () => {
      window.clearTimeout(timeoutId);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error(errorMessage));
    };
    image.src = imageSrc;
  });
}

function createLocalEditMaskDataUrl(selection = {}, outputPreset = null) {
  const canvas = document.createElement('canvas');
  const dimensions = getLocalEditMaskDimensions(outputPreset);
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.fillStyle = '#000000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';
  context.lineJoin = 'round';
  context.lineCap = 'round';

  if (selection.type === 'lasso' && selection.points?.length >= 3) {
    context.beginPath();
    selection.points.forEach((point, index) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fill();
  } else if (selection.type === 'brush' && selection.points?.length >= 2) {
    context.lineWidth = Math.max(18, Math.round((selection.brushSize || 0.08) * canvas.width));
    context.beginPath();
    selection.points.forEach((point, index) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  } else {
    const x = Math.round((selection.x ?? 0.3) * canvas.width);
    const y = Math.round((selection.y ?? 0.3) * canvas.height);
    const width = Math.max(1, Math.round((selection.width ?? 0.35) * canvas.width));
    const height = Math.max(1, Math.round((selection.height ?? 0.22) * canvas.height));
    context.fillRect(x, y, width, height);
  }
  return canvas.toDataURL('image/png');
}

async function createLocalEditGuideDataUrl(baseImageSrc, selection = {}, outputPreset = null) {
  const sourceDataUrl = await imageSourceToDataUrl(baseImageSrc);
  const image = await loadCanvasImage(sourceDataUrl, '无法读取局部修改原图');
  const dimensions = getLocalEditMaskDimensions(outputPreset);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建局部修改指引图');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(255, 111, 56, 0.30)';
  context.strokeStyle = '#ff6f38';
  context.lineWidth = Math.max(5, Math.round(Math.min(canvas.width, canvas.height) * 0.008));
  context.lineJoin = 'round';
  context.lineCap = 'round';

  if (selection.type === 'lasso' && selection.points?.length >= 3) {
    context.beginPath();
    selection.points.forEach((point, index) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fill();
    context.stroke();
  } else if (selection.type === 'brush' && selection.points?.length >= 2) {
    context.globalAlpha = 0.58;
    context.lineWidth = Math.max(18, Math.round((selection.brushSize || 0.08) * canvas.width));
    context.beginPath();
    selection.points.forEach((point, index) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  } else {
    const x = (selection.x ?? 0.3) * canvas.width;
    const y = (selection.y ?? 0.3) * canvas.height;
    const width = (selection.width ?? 0.35) * canvas.width;
    const height = (selection.height ?? 0.22) * canvas.height;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
  }
  return canvas.toDataURL('image/png');
}

async function measureLocalEditDelta({ baseImageSrc, editedImageSrc, maskDataUrl, outputPreset }) {
  const [baseDataUrl, editedDataUrl, maskSourceDataUrl] = await Promise.all([
    imageSourceToDataUrl(baseImageSrc),
    imageSourceToDataUrl(editedImageSrc),
    imageSourceToDataUrl(maskDataUrl)
  ]);
  const [baseImage, editedImage, maskImage] = await Promise.all([
    loadCanvasImage(baseDataUrl, '无法读取局部修改原图'),
    loadCanvasImage(editedDataUrl, '无法读取局部修改结果'),
    loadCanvasImage(maskSourceDataUrl, '无法读取局部修改遮罩')
  ]);
  const dimensions = getLocalEditMaskDimensions(outputPreset);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('无法创建局部修改变化检测画布');

  context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
  const basePixels = context.getImageData(0, 0, canvas.width, canvas.height);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(editedImage, 0, 0, canvas.width, canvas.height);
  const editedPixels = context.getImageData(0, 0, canvas.width, canvas.height);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
  const maskPixels = context.getImageData(0, 0, canvas.width, canvas.height);

  let selectedPixels = 0;
  let changedPixels = 0;
  let totalDelta = 0;
  for (let index = 0; index < basePixels.data.length; index += 4) {
    const maskValue = (maskPixels.data[index] + maskPixels.data[index + 1] + maskPixels.data[index + 2]) / (3 * 255);
    if (maskValue < 0.6) continue;
    selectedPixels += 1;
    const delta = (
      Math.abs(basePixels.data[index] - editedPixels.data[index])
      + Math.abs(basePixels.data[index + 1] - editedPixels.data[index + 1])
      + Math.abs(basePixels.data[index + 2] - editedPixels.data[index + 2])
    ) / (3 * 255);
    totalDelta += delta;
    if (delta >= 0.06) changedPixels += 1;
  }
  return {
    selectedPixels,
    changedPixels,
    changedRatio: selectedPixels ? changedPixels / selectedPixels : 0,
    averageDelta: selectedPixels ? totalDelta / selectedPixels : 0
  };
}

async function composeLocalEditResult({ baseImageSrc, editedImageSrc, maskDataUrl, outputPreset }) {
  const [baseDataUrl, editedDataUrl, maskSourceDataUrl] = await Promise.all([
    imageSourceToDataUrl(baseImageSrc),
    imageSourceToDataUrl(editedImageSrc),
    imageSourceToDataUrl(maskDataUrl)
  ]);
  const [baseImage, editedImage, maskImage] = await Promise.all([
    loadCanvasImage(baseDataUrl, '无法读取原候选图'),
    loadCanvasImage(editedDataUrl, '无法读取局部修正版'),
    loadCanvasImage(maskSourceDataUrl, '无法读取局部修改遮罩')
  ]);
  const width = Number(outputPreset?.width) || 1024;
  const height = Number(outputPreset?.height) || 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('无法创建局部修改合成画布');
  context.drawImage(baseImage, 0, 0, width, height);
  const basePixels = context.getImageData(0, 0, width, height);
  context.clearRect(0, 0, width, height);
  context.drawImage(editedImage, 0, 0, width, height);
  const editedPixels = context.getImageData(0, 0, width, height);
  context.clearRect(0, 0, width, height);
  context.drawImage(maskImage, 0, 0, width, height);
  const maskPixels = context.getImageData(0, 0, width, height);
  const output = context.createImageData(width, height);
  for (let index = 0; index < output.data.length; index += 4) {
    const maskValue = (maskPixels.data[index] + maskPixels.data[index + 1] + maskPixels.data[index + 2]) / (3 * 255);
    const source = maskValue > 0.5 ? editedPixels.data : basePixels.data;
    output.data[index] = source[index];
    output.data[index + 1] = source[index + 1];
    output.data[index + 2] = source[index + 2];
    output.data[index + 3] = source[index + 3];
  }
  context.putImageData(output, 0, 0);
  return canvas.toDataURL('image/png');
}

function cloneLocalEditSelection(selection = {}) {
  return { ...selection, points: [...(selection.points || [])] };
}

function LocalEditModal({ candidate, outputPreset, isBusy, onClose, onGenerate }) {
  const [tool, setTool] = useState('rectangle');
  const [instruction, setInstruction] = useState('');
  const [brushSize, setBrushSize] = useState(0.08);
  const [selection, setSelection] = useState({ type: 'rectangle', x: 0.3, y: 0.28, width: 0.38, height: 0.25, points: [] });
  const [selectionHistory, setSelectionHistory] = useState([]);
  const [zoom, setZoom] = useState(1);
  const drawingRef = useRef(null);
  const drawingStartSelectionRef = useRef(null);
  const selectionRef = useRef(selection);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    if (!candidate) return;
    setTool('rectangle');
    setInstruction('');
    setSelectionHistory([]);
    setZoom(1);
    setSelection({ type: 'rectangle', x: 0.3, y: 0.28, width: 0.38, height: 0.25, points: [] });
  }, [candidate?.id]);

  if (!candidate) return null;

  const updateTool = (nextTool) => {
    setSelectionHistory((history) => [...history.slice(-14), cloneLocalEditSelection(selectionRef.current)]);
    setTool(nextTool);
    if (nextTool === 'rectangle') {
      setSelection({ type: 'rectangle', x: 0.3, y: 0.28, width: 0.38, height: 0.25, points: [] });
    } else {
      setSelection({ type: nextTool, points: [] });
    }
  };

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = normalizeSelectionPoint(event, event.currentTarget);
    drawingRef.current = point;
    drawingStartSelectionRef.current = cloneLocalEditSelection(selectionRef.current);
    if (tool === 'rectangle') {
      setSelection({ type: 'rectangle', x: point.x, y: point.y, width: 0.001, height: 0.001, points: [] });
    } else {
      setSelection({ type: tool, points: [point], brushSize });
    }
  };

  const onPointerMove = (event) => {
    if (!drawingRef.current) return;
    const point = normalizeSelectionPoint(event, event.currentTarget);
    if (tool === 'rectangle') {
      const start = drawingRef.current;
      setSelection({
        type: 'rectangle',
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.max(0.01, Math.abs(point.x - start.x)),
        height: Math.max(0.01, Math.abs(point.y - start.y)),
        points: []
      });
      return;
    }
    setSelection((current) => ({ ...current, points: [...(current.points || []), point], brushSize }));
  };

  const onPointerUp = () => {
    if (drawingStartSelectionRef.current) {
      const previous = drawingStartSelectionRef.current;
      setSelectionHistory((history) => [...history.slice(-14), previous]);
    }
    drawingRef.current = null;
    drawingStartSelectionRef.current = null;
  };

  const hasSelection = selection.type === 'rectangle'
    ? selection.width > 0.01 && selection.height > 0.01
    : selection.points?.length >= (selection.type === 'lasso' ? 3 : 2);
  const maskDataUrl = !hasSelection ? '' : createLocalEditMaskDataUrl(selection, outputPreset);
  const selectionStyle = selection.type === 'rectangle'
    ? { left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }
    : undefined;
  const pathPoints = selection.points?.map((point) => `${point.x * 100},${point.y * 100}`).join(' ') || '';
  const undoSelection = () => {
    const previous = selectionHistory[selectionHistory.length - 1];
    if (!previous) return;
    setSelection(previous);
    setSelectionHistory((history) => history.slice(0, -1));
  };
  const clearSelection = () => {
    setSelectionHistory((history) => [...history.slice(-14), cloneLocalEditSelection(selectionRef.current)]);
    setSelection(tool === 'rectangle'
      ? { type: 'rectangle', x: 0, y: 0, width: 0, height: 0, points: [] }
      : { type: tool, points: [] });
  };

  return (
    <div className="local-edit-modal" role="dialog" aria-modal="true" aria-labelledby="local-edit-title">
      <button className="local-edit-backdrop" type="button" aria-label="关闭局部修改" onClick={isBusy ? undefined : onClose} />
      <section className="local-edit-dialog">
        {isBusy && (
          <div className="local-edit-processing" role="status" aria-live="polite">
            <VistamzLoader size={48} label="正在生成局部修正版" />
            <strong>正在生成局部修正版</strong>
            <span>已锁定选区外画面。完成后会自动进入 AI 预审，请勿重复提交。</span>
          </div>
        )}
        <header className="local-edit-header">
          <div><p className="eyebrow">LOCAL EDIT</p><h2 id="local-edit-title">局部修改候选图</h2><p>只重绘白色选区，其他区域作为锁定参考保留。局部修改会生成新的候选版本。</p></div>
          <button className="vz-btn vz-btn--secondary vz-btn--icon icon-button" type="button" disabled={isBusy} onClick={onClose} aria-label="关闭局部修改"><X size={18} /></button>
        </header>
        <div className="local-edit-body">
          <section className="local-edit-canvas-section">
            <div className="local-edit-tools" role="group" aria-label="选区工具">
              <button className={tool === 'rectangle' ? 'active' : ''} type="button" onClick={() => updateTool('rectangle')}>框选</button>
              <button className={tool === 'lasso' ? 'active' : ''} type="button" onClick={() => updateTool('lasso')}>套索</button>
              <button className={tool === 'brush' ? 'active' : ''} type="button" onClick={() => updateTool('brush')}>画笔</button>
            </div>
            <div className="local-edit-tool-actions">
              <button className="vz-btn vz-btn--secondary vz-btn--icon icon-button" type="button" disabled={!selectionHistory.length} title="撤销上一步选区" aria-label="撤销上一步选区" onClick={undoSelection}><RotateCcw size={16} /></button>
              <button className="vz-btn vz-btn--ghost text-button" type="button" onClick={clearSelection}>清除选区</button>
              <span className="local-edit-zoom" aria-label="图片缩放">
                <button className="vz-btn vz-btn--secondary vz-btn--icon icon-button" type="button" disabled={zoom <= 1} title="缩小" aria-label="缩小" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}><ZoomOut size={16} /></button>
                <b>{Math.round(zoom * 100)}%</b>
                <button className="vz-btn vz-btn--secondary vz-btn--icon icon-button" type="button" disabled={zoom >= 2} title="放大" aria-label="放大" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}><ZoomIn size={16} /></button>
              </span>
            </div>
            {tool === 'brush' && <label className="local-edit-brush"><span>画笔大小</span><input type="range" min="0.03" max="0.2" step="0.01" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} /><b>{Math.round(brushSize * 100)}%</b></label>}
            <div className="local-edit-canvas-viewport">
              <div
                className={`local-edit-canvas tool-${tool}`}
                style={{ '--candidate-ratio': `${outputPreset?.width || 1} / ${outputPreset?.height || 1}`, width: `${zoom * 100}%` }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <img src={candidate.imageSrc} alt="当前候选图" draggable="false" />
                {selection.type === 'rectangle' && <div className="local-edit-selection" style={selectionStyle}><span>选区</span></div>}
                {(selection.type === 'lasso' || selection.type === 'brush') && pathPoints && <svg className="local-edit-selection-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {selection.type === 'lasso'
                    ? <polygon points={pathPoints} />
                    : <polyline points={pathPoints} style={{ strokeWidth: brushSize * 100 }} />}
                </svg>}
                <span className="local-edit-canvas-hint">在图片上{tool === 'rectangle' ? '拖拽框选' : tool === 'lasso' ? '沿边缘圈选' : '涂抹'}需要修改的区域</span>
              </div>
            </div>
          </section>
          <aside className="local-edit-control-panel">
            <div><p className="eyebrow">CURRENT CANDIDATE</p><strong>{candidate.slotTitle}</strong><small>{candidate.outputPresetLabel} · {candidate.outputPresetSize}</small></div>
            <label><span>这一区域需要怎样修改？</span><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：仅修正顶部横杆角度，保持木材颜色、产品比例和其余画面不变。" /></label>
            <div className="local-edit-rule"><strong>锁定规则</strong><p>未选区域不得改变产品结构、构图、背景、文字或品牌风格。修改后会自动进入 AI 预审。</p></div>
            <button className="vz-btn vz-btn--primary primary-button" type="button" disabled={!hasSelection || !maskDataUrl || !instruction.trim() || isBusy} onClick={() => onGenerate({ instruction: instruction.trim(), selection, maskDataUrl })}>
              {isBusy ? <VistamzLoader size={16} label="正在生成局部修正版" /> : <Sparkles size={16} />}{isBusy ? '正在生成局部修正版...' : '生成局部修正版'}
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}

function LocalEditCompareModal({ beforeCandidate, afterCandidate, onClose }) {
  if (!beforeCandidate || !afterCandidate) return null;
  return (
    <div className="local-edit-modal local-edit-compare-modal" role="dialog" aria-modal="true" aria-labelledby="local-edit-compare-title">
      <button className="local-edit-backdrop" type="button" aria-label="关闭图片对比" onClick={onClose} />
      <section className="local-edit-dialog local-edit-compare-dialog">
        <header className="local-edit-header">
          <div><p className="eyebrow">VERSION COMPARE</p><h2 id="local-edit-compare-title">原图与局部修正版</h2><p>未选区域已由系统从原候选图逐像素锁回；请重点检查选区边缘是否自然。</p></div>
          <button className="vz-btn vz-btn--secondary vz-btn--icon icon-button" type="button" onClick={onClose} aria-label="关闭图片对比"><X size={18} /></button>
        </header>
        <div className="local-edit-compare-grid">
          <figure><figcaption>原候选图</figcaption><img src={beforeCandidate.imageSrc} alt="局部修改前的候选图" /></figure>
          <figure><figcaption>局部修正版</figcaption><img src={afterCandidate.imageSrc} alt="局部修改后的候选图" /></figure>
        </div>
      </section>
    </div>
  );
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
  activeProjectId,
  projectForm,
  projects = [],
  generationRuns,
  selectedSlot,
  promptOverrides,
  onUpdatePromptOverride,
  focusRequest
}) {
  const managementProjects = projects.length
    ? projects
    : [{ id: activeProjectId, form: projectForm, generationRuns }];
  const overview = getQualityManagementOverview(managementProjects);
  const brandRows = getBrandQualityRows(managementProjects);
  const managementRuns = getManagementRuns(managementProjects);
  const failedRuns = managementRuns.filter((run) => run.verdict === 'needs_fix' || run.verdict === 'reject');
  const reasonRows = getReasonCountsForRuns(managementRuns).filter((reason) => reason.count > 0);
  const maxReasonCount = Math.max(1, ...reasonRows.map((reason) => reason.count));
  const selectedPromptOverride = promptOverrides?.[selectedSlot.id] || '';

  return (
    <section className="quality-console-page">
      <FocusFrame active={getFocusSignal(focusRequest, 'quality')}>
        <section className="vz-card panel quality-console-hero">
          <div>
            <p className="eyebrow">Quality Records</p>
            <h3>质量记录</h3>
            <p>按品牌汇总生成次数、人工成功率、失败原因和估算成本，用于管理复盘和资源投入判断。</p>
          </div>
        </section>
      </FocusFrame>

      <section className="quality-management-summary">
        <Metric label="生成次数" value={overview.total} />
        <Metric label="已判断" value={`${overview.reviewed}/${overview.total || 0}`} />
        <Metric label="人工成功率" value={overview.reviewed ? `${overview.usableRate}%` : '-'} tone="good" />
        <Metric label="品牌数" value={overview.brandCount || 0} />
        <Metric label="估算成本" value={`$${overview.estimatedCost.toFixed(2)}`} />
        <Metric label="可用图成本" value={overview.costPerUsable ? `$${overview.costPerUsable.toFixed(2)}` : '-'} />
      </section>

      <section className="quality-console-grid">
        <section className="vz-card panel quality-reason-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Failure Reasons</p>
              <h3>失败原因排行</h3>
            </div>
          </div>
          <div className="quality-reason-list">
            {reasonRows.length ? reasonRows.map((reason) => {
              const percent = failedRuns.length ? Math.round((reason.count / failedRuns.length) * 100) : 0;
              return (
                <div className="quality-reason-row" key={reason.id}>
                  <div>
                    <span>{reason.label}</span>
                    <strong>{reason.count}</strong>
                  </div>
                  <em>{percent}%</em>
                  <b style={{ width: `${Math.max(8, (reason.count / maxReasonCount) * 100)}%` }} />
                </div>
              );
            }) : (
              <div className="quality-empty-state">
                <Check size={18} />
                <span>暂无失败原因记录。完成候选图人工判断后，这里会显示主要问题。</span>
              </div>
            )}
          </div>
          <p className="panel-note">排行只统计需修改和不可用候选图；同一候选图可计入多个原因。</p>
        </section>

        <section className="vz-card panel quality-definition-panel">
          <div className="panel-header compact">
            <div>
              <p className="eyebrow">Metric Rules</p>
              <h3>统计口径</h3>
            </div>
          </div>
          <div className="quality-definition-list">
            <div><strong>成功率</strong><p>只计算已人工判断的候选图，可用 / 已判断。</p></div>
            <div><strong>失败原因</strong><p>来自人工选择的问题标签，不把未判断候选图算作失败。</p></div>
            <div><strong>成本核算</strong><p>优先使用任务成本字段，缺失时按每次生成 ${ESTIMATED_GENERATION_COST_USD.toFixed(2)} 估算。</p></div>
          </div>
        </section>
      </section>

      <section className="vz-card panel brand-performance-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Brand Performance</p>
            <h3>品牌表现表</h3>
          </div>
        </div>
        <div className="brand-performance-table">
          <div className="brand-performance-head">
            <span>品牌</span>
            <span>生成次数</span>
            <span>人工成功率</span>
            <span>失败原因</span>
            <span>估算成本</span>
            <span>可用图成本</span>
          </div>
          {brandRows.length ? brandRows.map((row) => (
            <div className="brand-performance-row" key={row.brandId}>
              <div>
                <strong>{row.brandName}</strong>
                <p>{row.projectCount} 个项目{row.brandVersion ? ` · v${row.brandVersion}` : ''}</p>
              </div>
              <div>
                <strong>{row.stats.total}</strong>
                <p>{row.outputPresetLabels.join(' / ') || '暂无类型'}</p>
              </div>
              <div>
                <strong>{row.sampleReady ? `${row.stats.usableRate}%` : row.stats.reviewed ? '样本不足' : '-'}</strong>
                <p>{row.stats.usable} 可用 / {row.issueCount} 问题 · 已判断 {row.reviewCoverage}%</p>
                <span className="quality-rate-bar"><b style={{ width: `${row.stats.reviewed ? row.stats.usableRate : 0}%` }} /></span>
              </div>
              <div className="brand-reason-tags">
                {row.topReasons.length
                  ? row.topReasons.map((reason) => <span key={reason.id}>{reason.label} {reason.count}</span>)
                  : <em>暂无</em>}
              </div>
              <div>
                <strong>${row.estimatedCost.toFixed(2)}</strong>
                <p>估算总成本</p>
              </div>
              <div>
                <strong>{row.costPerUsable ? `$${row.costPerUsable.toFixed(2)}` : '-'}</strong>
                <p>成本 / 可用图</p>
              </div>
            </div>
          )) : (
            <div className="brand-performance-empty">
              <BarChart3 size={18} />
              <span>还没有可统计的生成记录。完成生图并人工判断后，品牌表现会出现在这里。</span>
            </div>
          )}
        </div>
        <p className="panel-note">品牌归因优先使用候选图自身品牌字段；历史记录缺失时回退到项目品牌快照。</p>
      </section>

    </section>
  );
}

function GenerationPage({
  activeProjectId,
  projectForm,
  ledgerFacts,
  storyboardBriefs,
  selectedSlot,
  setSelectedSlot,
  generationRuns,
  promptOverrides,
  brandLibrary,
  brandSnapshot,
  brandLibraryStatus,
  brandVersionState,
  onUpgradeBrandSnapshot,
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
  const [batchLog, setBatchLog] = useState([]);
  const [generationMode, setGenerationMode] = useState('single-multi');
  const [singleBatchCount, setSingleBatchCount] = useState(3);
  const plannedOutputPresetId = getProjectPlanOutputPresetId(projectForm);
  const [outputPresetId, setOutputPresetId] = useState(plannedOutputPresetId);
  const projectBrandId = String(brandSnapshot?.brandId || getProjectBrandId(projectForm, brandLibrary) || 'none');
  const selectedProjectBrand = projectBrandId !== 'none' && brandSnapshot?.rules
    ? normalizeBrandProfile({
      ...brandSnapshot.rules,
      id: projectBrandId,
      name: brandSnapshot.brandName || brandSnapshot.rules.name,
      version: Number(brandSnapshot.brandVersion || 0)
    })
    : null;
  const hasSelectedBrand = Boolean(selectedProjectBrand?.id && selectedProjectBrand.id !== 'none' && selectedProjectBrand.version);
  const [baselineMode, setBaselineMode] = useState(() => !hasSelectedBrand);
  const previousBrandAvailabilityRef = useRef(hasSelectedBrand);
  const [autoAdvanceReview, setAutoAdvanceReview] = useState(true);
  const [gptComparisonPrompt, setGptComparisonPrompt] = useState('');
  const [isLocalEditOpen, setIsLocalEditOpen] = useState(false);
  const [isLocalEditing, setIsLocalEditing] = useState(false);
  const [isLocalCompareOpen, setIsLocalCompareOpen] = useState(false);
  const [serverGenerationTasks, setServerGenerationTasks] = useState([]);
  const recoveredTaskIdsRef = useRef(new Set());
  const outputPreset = outputPresets.find((preset) => preset.id === outputPresetId) || outputPresets[0];
  const activeSlots = useMemo(() => getActiveSlots(storyboardBriefs), [storyboardBriefs]);
  const selectedBrief = storyboardBriefs.find((brief) => brief.id === selectedSlot.id);
  const selectedPromptOverride = promptOverrides?.[selectedSlot.id] || '';
  const structuredProductLock = useMemo(
    () => buildStructuredProductLock(projectForm, ledgerFacts),
    [projectForm, ledgerFacts]
  );
  const prompt = selectedBrief ? buildGenerationPrompt(selectedBrief, selectedSlot, outputPreset, {
    baselineMode,
    promptOverride: selectedPromptOverride,
    brandProfile: selectedProjectBrand,
    productLock: structuredProductLock,
    projectForm
  }) : '';
  const generationPreviewImage = getReferenceImage(projectForm);
  const generationReferences = getGenerationReferenceItems(projectForm, selectedSlot.id, outputPreset.id, selectedBrief?.visualType);
  const canGenerate = Boolean(selectedBrief && getReferenceImage(projectForm) && (baselineMode || hasSelectedBrand));
  const slotRuns = useMemo(
    () => normalizeGenerationRuns(generationRuns.filter((run) => run.slotId === selectedSlot.id)),
    [generationRuns, selectedSlot.id]
  );
  const activeCandidate = generationRuns.find((run) => run.id === activeRunId) || slotRuns[0];
  const activeCandidateSlot = activeSlots.find((slot) => slot.id === activeCandidate?.slotId) || selectedSlot;
  const activeCandidateBrief = storyboardBriefs.find((brief) => brief.id === activeCandidateSlot.id) || selectedBrief;
  const activeCandidatePreset = activeCandidate ? getOutputPresetById(activeCandidate.outputPresetId) : outputPreset;
  const activeParentCandidate = activeCandidate?.parentRunId
    ? generationRuns.find((run) => run.id === activeCandidate.parentRunId)
    : null;
  const activeReasonSuggestions = activeCandidate
    ? getPromptTuningSuggestionsForReasons(activeCandidate.reasons)
    : [];
  const qualityRuns = getQualityScopeRuns(generationRuns);
  const unreviewedQualityRuns = qualityRuns.filter((run) => run.verdict === 'unreviewed');
  const visibleQueueRuns = unreviewedQualityRuns.slice(0, 8);
  const activeServerTasks = serverGenerationTasks
    .filter((task) => task.status === 'queued' || task.status === 'running')
    .slice(0, 8);
  const approvedSlotRuns = activeSlots
    .map((slot) => ({ slot, run: getBestRunForSlot(slot.id, generationRuns) }))
    .filter((item) => item.run?.verdict === 'usable');
  const reviewedSlotCount = activeSlots.filter((slot) => {
    const selectedRun = getBestRunForSlot(slot.id, generationRuns);
    return selectedRun && selectedRun.verdict !== 'unreviewed';
  }).length;
  const generationReadyForReview = activeSlots.length > 0
    && isStoryboardPlanReady(storyboardBriefs, projectForm)
    && approvedSlotRuns.length === activeSlots.length;
  const batchProgress = useMemo(() => {
    const total = batchLog.length;
    const done = batchLog.filter((item) => item.status === 'done').length;
    const failed = batchLog.filter((item) => item.status === 'failed').length;
    const blocked = batchLog.filter((item) => item.status === 'blocked').length;
    const running = batchLog.find((item) => item.status === 'running');
    return { total, done, failed, blocked, running };
  }, [batchLog]);
  const isGenerationBusy = isGenerating || isAiReviewing || isBatchRunning || isLocalEditing;
  const generationStatusLooksLikeProgress = /生成|候选图|预审|Gemini|模型接口|API Key|额度|spending cap|quota|rate limit/i.test(generationStatus);
  const showGenerationProgress = isGenerationBusy || batchLog.length > 0 || generationStatusLooksLikeProgress;
  const generationStageLabel = isLocalEditing
    ? '局部修改中'
    : isBatchRunning
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
  const candidatePendingTitle = isLocalEditing
    ? '正在生成局部修正版'
    : isAiReviewing
      ? '正在 AI 预审'
      : isGenerating || isBatchRunning
        ? '正在生成候选图'
    : '候选图会显示在这里';
  const candidatePendingDetail = isGenerationBusy
    ? '处理中请勿重复提交。完成后候选版本会自动保留，并进入人工判断队列。'
    : '选择右侧生成方式后，先在这里查看图片，再决定是否采用或调整。';

  useEffect(() => {
    setOutputPresetId(plannedOutputPresetId);
  }, [plannedOutputPresetId]);

  useEffect(() => {
    if (!hasSelectedBrand) {
      setBaselineMode(true);
    } else if (!previousBrandAvailabilityRef.current) {
      setBaselineMode(false);
    }
    previousBrandAvailabilityRef.current = hasSelectedBrand;
  }, [hasSelectedBrand]);

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

  useEffect(() => {
    let mounted = true;
    let timer = 0;
    let refreshInFlight = false;
    const refreshTasks = async () => {
      if (!activeProjectId) return;
      // The active generation flow already owns polling and persistence. Recovery
      // is only for page reloads; running both paths races and uploads one result twice.
      if (isGenerating || isBatchRunning || refreshInFlight) return;
      refreshInFlight = true;
      try {
        const tasks = await listGenerationTasks(activeProjectId, 30);
        if (!mounted) return;
        setServerGenerationTasks(tasks);
        const activeTasks = tasks.filter((task) => task.status === 'queued' || task.status === 'running');
        if (activeTasks.length && !isGenerating && !isBatchRunning) {
          const runningCount = activeTasks.filter((task) => task.status === 'running').length;
          setGenerationStatus(runningCount
            ? `${runningCount} 个任务正在生成，另有 ${activeTasks.length - runningCount} 个等待处理。`
            : `${activeTasks.length} 个生图任务正在排队。`);
        }
        for (const task of tasks) {
          if (task.status !== 'succeeded' || !task.output?.imageUrl || recoveredTaskIdsRef.current.has(task.id)) continue;
          if (generationRuns.some((run) => run.id === task.runId)) {
            recoveredTaskIdsRef.current.add(task.id);
            continue;
          }
          recoveredTaskIdsRef.current.add(task.id);
          try {
            const taskSlot = activeSlots.find((slot) => String(slot.id) === String(task.slotId));
            const taskBrief = storyboardBriefs.find((brief) => String(brief.id) === String(task.slotId));
            if (!taskSlot || !taskBrief || !task.runId) continue;
            const recoveredPreset = getOutputPresetById(plannedOutputPresetId);
            const fittedImageSrc = await resizeImageToPreset(task.output.imageUrl, recoveredPreset);
            const reviewImageDataUrl = await createImageThumbnail(fittedImageSrc, 1200);
            const storedImage = await saveGeneratedImageToApi({
              projectId: activeProjectId,
              imageDataUrl: fittedImageSrc,
              projectForm,
              slotId: taskSlot.id,
              runId: task.runId
            });
            const recoveredRun = normalizeGenerationRun({
              id: task.runId,
              slotId: taskSlot.id,
              slotTitle: task.slotTitle || taskBrief.title || taskSlot.title,
              outputPresetId: recoveredPreset.id,
              outputPresetLabel: recoveredPreset.label,
              outputPresetSize: recoveredPreset.size,
              imageSrc: storedImage.imageUrl,
              reviewImageDataUrl,
              imageFilePath: storedImage.filePath || '',
              imageFilename: storedImage.filename || '',
              storageKey: storedImage.storageKey || '',
              storageMode: storedImage.storageMode || '',
              requestId: task.output.requestId || '',
              model: task.output.model || '',
              durationMs: task.output.durationMs || 0,
              verdict: 'unreviewed',
              note: '页面刷新后从服务器任务恢复的候选图。',
              createdAt: task.updatedAt || new Date().toISOString()
            });
            onSaveGenerationRun(recoveredRun);
            setGenerationStatus(`已恢复 ${taskSlot.id} 号图槽的已完成候选图，请继续 AI 预审和人工判断。`);
          } catch (error) {
            recoveredTaskIdsRef.current.delete(task.id);
            appLogger.error('pipeline.generation.task_recovery_failed', error, {
              projectId: activeProjectId,
              taskId: task.id
            });
          }
        }
      } catch (error) {
        appLogger.error('pipeline.generation.tasks_load_failed', error, { projectId: activeProjectId });
      } finally {
        refreshInFlight = false;
      }
    };
    void refreshTasks();
    timer = window.setInterval(refreshTasks, 8000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [activeProjectId, activeSlots, storyboardBriefs, generationRuns, plannedOutputPresetId, isGenerating, isBatchRunning]);

  const cancelServerTask = async (taskId) => {
    try {
      await cancelGenerationTask(activeProjectId, taskId);
      setServerGenerationTasks((tasks) => tasks.map((task) => (
        task.id === taskId ? { ...task, status: 'cancelled' } : task
      )));
      setGenerationStatus('已取消任务。正在生成中的模型请求可能仍会结束，但结果不会进入候选图。');
    } catch (error) {
      setGenerationStatus(error instanceof Error ? error.message : '任务取消失败。');
    }
  };

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
      setGenerationStatus('请先生成图片方案，再复制给 GPT 测试。');
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
      setGenerationStatus('请先生成图片方案，再导入外部结果。');
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
          projectId: activeProjectId,
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
        storageKey: storedImage?.storageKey || '',
        storageMode: storedImage?.storageMode || '',
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
    const localEdit = options.localEdit || null;
    const referenceItems = getGenerationReferenceItems(projectForm, slot.id, runOutputPreset.id, brief?.visualType);
    const runBrand = runBaselineMode
      ? getBrandProfile('none', defaultBrandLibrary)
      : selectedProjectBrand;
    if (!runBaselineMode && !runBrand) {
      throw new Error('当前项目没有可验证的品牌快照，请回到项目资料重新选择并保存品牌。');
    }
    const shouldAttachLogo = !runBaselineMode
      && runOutputPreset.id === 'aplus'
      && runBrand.id !== 'none'
      && Boolean(runBrand.logoPreview);
    const baseReferenceItems = shouldAttachLogo
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
    const generationReferenceItems = localEdit
      ? [
        {
          id: 'local-edit-base',
          label: 'Current candidate image - exact base image',
          name: 'Current selected candidate',
          preview: localEdit.baseImageSrc
        },
        ...(localEdit.guideDataUrl ? [{
          id: 'local-edit-guide',
          label: 'Edit-zone guide - orange overlay marks the only area that must visibly change',
          name: 'Local edit area guide',
          preview: localEdit.guideDataUrl
        }] : [])
      ]
      : baseReferenceItems;
    const basePrompt = buildGenerationPrompt(brief, slot, runOutputPreset, {
      baselineMode: runBaselineMode,
      promptOverride: promptOverrides?.[slot.id] || '',
      brandProfile: runBrand,
      productLock: structuredProductLock,
      projectForm
    });
    const runPrompt = localEdit
      ? [
        'LOCAL IMAGE EDIT. The first reference is the exact current candidate. The second reference is an edit-zone guide: its orange overlay marks the only area that must visibly change.',
        `Requested local change: ${localEdit.instruction}`,
        'Apply the requested change clearly and visibly inside the orange area. Do not output the orange overlay, a mask, annotations, or a comparison layout.',
        'Everything outside the orange area must remain visually identical: product geometry, material, product color, composition, lighting, background, text, and brand design. Do not reframe, crop, redraw, or alter the full product.',
        'Generate exactly one final edited ecommerce image.'
      ].join('\n\n')
      : basePrompt;
    const runId = createGenerationRunId();
    const startedAt = performance.now();
    appLogger.log('pipeline.generation.request_started', {
      runId,
      slotId: slot.id,
      slotTitle: brief.title || slot.title,
      outputPresetId: runOutputPreset.id,
      baselineMode: runBaselineMode,
      referenceCount: generationReferenceItems.length,
      hasPromptOverride: Boolean(promptOverrides?.[slot.id]),
      editType: localEdit ? 'local' : 'full'
    }, { projectId: activeProjectId, step: 'generation', traceId: runId });
    const sourceImages = await Promise.all(generationReferenceItems.map(async (reference) => {
      const sourceDataUrl = await imageSourceToDataUrl(reference.preview);
      return {
        id: reference.id,
        label: reference.label,
        name: reference.name,
        // Local edits only need a model-readable reference. The full-resolution
        // original remains in the browser for the final outside-mask lock.
        dataUrl: localEdit ? await createImageThumbnail(sourceDataUrl, 1200) : sourceDataUrl
      };
    }));
    const sourceImageDataUrl = sourceImages[0]?.dataUrl || await imageSourceToDataUrl(getReferenceImage(projectForm));
    const requestGeneratedImage = async (prompt, attempt = 1) => {
      const clientTaskId = `${runId}-${attempt}`;
      const taskPayload = {
        projectId: activeProjectId,
        runId,
        clientTaskId,
        batchId: options.batchId || '',
        batchIndex: Number.isFinite(Number(options.batchIndex)) ? Number(options.batchIndex) : null,
        slotId: slot.id,
        slotTitle: brief.title || slot.title,
        projectName: projectForm.projectName || projectForm.productName || projectForm.sku || 'vistamz',
        projectForm,
        baselineMode: runBaselineMode,
        brandId: runBrand?.id || 'none',
        brandVersion: Number(runBrand?.version || 0),
        outputPresetId: runOutputPreset.id,
        editType: localEdit ? 'local' : 'full',
        prompt,
        sourceImageDataUrl,
        sourceImages,
        size: '1024x1024',
        quality: 'low'
      };
      let taskId = '';
      let lastSubmitError;
      for (let submitAttempt = 1; submitAttempt <= 3; submitAttempt += 1) {
        try {
          const response = await fetchWithTimeout(`${IMAGE_API_BASE_URL}/api/generation-tasks`, {
            method: 'POST',
            headers: authenticatedJsonHeaders(),
            body: JSON.stringify(taskPayload)
          }, 35000, '生图任务提交超时，正在尝试恢复连接。');
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.ok && result.task?.id) {
            taskId = result.task.id;
            break;
          }
          const responseMessage = response.status === 404
            ? '当前 API 服务版本过旧，未找到生图任务入口。'
            : (result.error || '生图接口返回失败。');
          const error = new Error(responseMessage);
          error.status = response.status;
          throw error;
        } catch (error) {
          lastSubmitError = error;
          const status = Number(error?.status || 0);
          const retryable = !status || status === 408 || status === 429 || status >= 500;
          appLogger.log('pipeline.generation.task_submit_failed', {
            runId,
            slotId: slot.id,
            batchId: options.batchId || '',
            batchIndex: options.batchIndex ?? null,
            submitAttempt,
            retryable,
            status,
            message: error instanceof Error ? error.message : String(error)
          }, { level: retryable ? 'warn' : 'error', projectId: activeProjectId, step: 'generation', traceId: runId });
          if (!retryable || submitAttempt >= 3) break;
          setGenerationStatus(`第 ${options.batchIndex || 1} 张任务提交暂时超时，正在自动重试（${submitAttempt}/3）...`);
          await new Promise((resolve) => window.setTimeout(resolve, 700 * (2 ** (submitAttempt - 1))));
        }
      }
      if (!taskId) {
        const responseMessage = lastSubmitError instanceof Error ? lastSubmitError.message : '生图任务提交失败。';
        appLogger.log('pipeline.generation.request_failed', {
          runId,
          slotId: slot.id,
          attempt,
          message: responseMessage,
          durationMs: Math.round(performance.now() - startedAt)
        }, { level: 'error', projectId: activeProjectId, step: 'generation', traceId: runId });
        throw new Error(responseMessage);
      }
      const pollingStartedAt = Date.now();
      const pollingDeadlineMs = 480000;
      for (let pollCount = 0; Date.now() - pollingStartedAt < pollingDeadlineMs; pollCount += 1) {
        if (pollCount > 0) await new Promise((resolve) => window.setTimeout(resolve, 1500));
        const taskResponse = await fetchWithTimeout(
          `${IMAGE_API_BASE_URL}/api/generation-tasks/${encodeURIComponent(taskId)}?projectId=${encodeURIComponent(activeProjectId)}`,
          { headers: authenticatedJsonHeaders() },
          12000,
          '读取生图进度超时，系统会继续保留服务器任务。'
        );
        const taskResult = await taskResponse.json().catch(() => ({}));
        if (!taskResponse.ok || !taskResult.ok) {
          throw new Error(taskResult.error || '无法读取生图任务状态。');
        }
        const task = taskResult.task || {};
        if (task.status === 'succeeded') {
          return {
            ...(task.output || {}),
            estimatedCostUsd: Number(task.estimatedCostUsd || task.output?.estimatedCostUsd || 0)
          };
        }
        if (task.status === 'failed' || task.status === 'cancelled') {
          throw new Error(task.errorMessage || '生图任务重试后仍未完成。');
        }
        if (pollCount % 4 === 0) {
          setGenerationStatus(task.status === 'running'
            ? `正在生成图片（第 ${Math.max(1, task.attemptCount || 1)} 次尝试）...`
            : '生图任务已排队，正在等待处理...');
        }
      }
      throw new Error('生图任务等待超过 8 分钟。服务器任务已保留，完成后会自动恢复到候选图。');
    };

      const fitGeneratedImage = async (imageSrc, attempt) => {
        const postprocessStartedAt = performance.now();
        appLogger.log('pipeline.generation.postprocess_started', {
          runId,
          slotId: slot.id,
          attempt,
          outputPresetId: runOutputPreset.id
        }, { projectId: activeProjectId, step: 'generation', traceId: runId });
        try {
          const fittedImageSrc = await resizeImageToPreset(imageSrc, runOutputPreset);
          appLogger.log('pipeline.generation.postprocess_completed', {
            runId,
            slotId: slot.id,
            attempt,
            outputPresetId: runOutputPreset.id,
            durationMs: Math.round(performance.now() - postprocessStartedAt)
          }, { projectId: activeProjectId, step: 'generation', traceId: runId });
          return fittedImageSrc;
        } catch (error) {
          appLogger.error('pipeline.generation.postprocess_failed', error, {
            projectId: activeProjectId,
            step: 'generation',
            traceId: runId,
            runId,
            slotId: slot.id,
            attempt,
            outputPresetId: runOutputPreset.id,
            durationMs: Math.round(performance.now() - postprocessStartedAt)
          });
          throw error;
        }
      };

      let result = await requestGeneratedImage(runPrompt);
      let rawImageSrc = result.imageDataUrl || result.imageUrl;
      let generatedFittedImageSrc = await fitGeneratedImage(rawImageSrc, 1);
      if (localEdit) {
        try {
          let delta = await measureLocalEditDelta({
            baseImageSrc: localEdit.baseImageSrc,
            editedImageSrc: generatedFittedImageSrc,
            maskDataUrl: localEdit.maskDataUrl,
            outputPreset: runOutputPreset
          });
          appLogger.log('pipeline.local_edit.delta_checked', {
            runId,
            parentRunId: localEdit.parentRunId,
            slotId: slot.id,
            attempt: 1,
            ...delta
          }, { projectId: activeProjectId, step: 'generation', traceId: runId });

          const didNotVisiblyChange = delta.selectedPixels > 0
            && delta.changedRatio < 0.01
            && delta.averageDelta < 0.018;
          if (didNotVisiblyChange) {
            appLogger.log('pipeline.local_edit.retry_requested', {
              runId,
              parentRunId: localEdit.parentRunId,
              slotId: slot.id,
              ...delta
            }, { level: 'warn', projectId: activeProjectId, step: 'generation', traceId: runId });
            setGenerationStatus('第一次局部修改变化不明显，正在自动重试一次...');
            result = await requestGeneratedImage([
              runPrompt,
              'RETRY REQUIRED: the previous result did not visibly apply the requested local change. Make the requested change clearly perceptible inside the orange edit zone, while preserving every pixel outside it.'
            ].join('\n\n'), 2);
            rawImageSrc = result.imageDataUrl || result.imageUrl;
            generatedFittedImageSrc = await fitGeneratedImage(rawImageSrc, 2);
            delta = await measureLocalEditDelta({
              baseImageSrc: localEdit.baseImageSrc,
              editedImageSrc: generatedFittedImageSrc,
              maskDataUrl: localEdit.maskDataUrl,
              outputPreset: runOutputPreset
            });
            appLogger.log('pipeline.local_edit.delta_checked', {
              runId,
              parentRunId: localEdit.parentRunId,
              slotId: slot.id,
              attempt: 2,
              ...delta
            }, { projectId: activeProjectId, step: 'generation', traceId: runId });
          }
        } catch (error) {
          appLogger.error('pipeline.local_edit.delta_check_failed', error, {
            runId,
            parentRunId: localEdit.parentRunId,
            slotId: slot.id
          });
        }
      }
      appLogger.log('pipeline.generation.request_completed', {
        runId,
        slotId: slot.id,
        model: result.model,
        requestId: result.requestId,
        durationMs: result.durationMs || Math.round(performance.now() - startedAt)
      }, { projectId: activeProjectId, step: 'generation', traceId: runId });
      let fittedImageSrc = generatedFittedImageSrc;
      if (localEdit) {
        try {
          fittedImageSrc = await composeLocalEditResult({
            baseImageSrc: localEdit.baseImageSrc,
            editedImageSrc: generatedFittedImageSrc,
            maskDataUrl: localEdit.maskDataUrl,
            outputPreset: runOutputPreset
          });
          appLogger.log('pipeline.local_edit.outside_mask_locked', {
            runId,
            parentRunId: localEdit.parentRunId,
            slotId: slot.id
          }, { projectId: activeProjectId, step: 'generation', traceId: runId });
        } catch (error) {
          appLogger.error('pipeline.local_edit.compose_failed', error, {
            runId,
            parentRunId: localEdit.parentRunId,
            slotId: slot.id
          });
          throw new Error('局部修改生成后无法锁定选区外画面，请重试。');
        }
      }
      const previewImageSrc = await createImageThumbnail(fittedImageSrc);
      const reviewImageDataUrl = await createImageThumbnail(fittedImageSrc, 1200);
      let storedImage = null;
      try {
        storedImage = await saveGeneratedImageToApi({
          projectId: activeProjectId,
          imageDataUrl: fittedImageSrc,
          projectForm,
          slotId: slot.id,
          runId
        });
      } catch (error) {
        appLogger.error('pipeline.generation.persist_failed', error, {
          projectId: activeProjectId,
          step: 'generation',
          traceId: runId,
          slotId: slot.id
        });
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
        storageKey: storedImage?.storageKey || '',
        storageMode: storedImage?.storageMode || '',
        prompt: runPrompt,
        baselineMode: runBaselineMode,
        brandId: runBrand.id,
        brandName: runBrand.name,
        brandVersion: Number(runBrand.version || 0),
        batchId: options.batchId || '',
        batchIndex: Number.isFinite(Number(options.batchIndex)) ? Number(options.batchIndex) : null,
        estimatedCostUsd: Number(result.estimatedCostUsd || 0) || ESTIMATED_GENERATION_COST_USD,
        requestId: result.requestId,
        model: result.model,
        referenceCount: sourceImages.length,
        referenceLabels: sourceImages.map((image) => image.label),
        durationMs: result.durationMs,
        parentRunId: localEdit?.parentRunId || '',
        editType: localEdit ? 'local' : 'full',
        localEdit: localEdit ? {
          instruction: localEdit.instruction,
          selection: localEdit.selection,
          outsideMaskLocked: true,
          createdAt: new Date().toISOString()
        } : null,
        verdict: 'unreviewed',
        reasons: [],
        createdAt: new Date().toISOString()
      });
  };

  const reviewCandidateRun = async (run, slot, brief, options = {}) => {
    const runOutputPreset = options.outputPreset || outputPreset;
    const startedAt = performance.now();
    appLogger.log('pipeline.ai_review.started', {
      runId: run.id,
      slotId: slot.id,
      outputPresetId: runOutputPreset.id
    }, { projectId: activeProjectId, step: 'generation', traceId: run.id });
    try {
      const review = await reviewGeneratedImageWithApi({
        projectId: activeProjectId,
        projectForm,
        productLock: structuredProductLock,
        brief,
        run,
        sourceImages: getGenerationReferenceItems(projectForm, slot.id, runOutputPreset.id, brief?.visualType)
      });
      appLogger.log('pipeline.ai_review.completed', {
        runId: run.id,
        slotId: slot.id,
        verdict: review.verdict,
        score: review.score,
        model: review.model,
        requestId: review.requestId,
        durationMs: review.durationMs || Math.round(performance.now() - startedAt)
      }, { projectId: activeProjectId, step: 'generation', traceId: run.id });
      return {
        ...run,
        aiReview: review,
        aiSuggestion: deriveAiReviewSuggestion(review)
      };
    } catch (error) {
      appLogger.error('pipeline.ai_review.failed', error, {
        projectId: activeProjectId,
        step: 'generation',
        traceId: run.id,
        slotId: slot.id,
        durationMs: Math.round(performance.now() - startedAt)
      });
      throw error;
    }
  };

  const runGeneration = async (requestedMode = generationMode) => {
    if (!selectedBrief) {
      appLogger.log('pipeline.generation.blocked', {
        reason: 'missing_storyboard_brief'
      }, { level: 'warn', projectId: activeProjectId, step: 'generation' });
      setGenerationStatus('请先生成图片方案，再进入生图验证。');
      return;
    }
    const referenceReadiness = getReferenceReadiness(projectForm);
    if (!referenceReadiness.ready) {
      appLogger.log('pipeline.generation.blocked', {
        reason: 'reference_quality_gate',
        blockers: referenceReadiness.blockers
      }, { level: 'warn', projectId: activeProjectId, step: 'generation' });
      setGenerationStatus(`参考图暂不能用于生图：${referenceReadiness.blockers.join('；')}`);
      return;
    }
    const activeGenerationMode = requestedMode;
    const tasks = activeGenerationMode === 'all-one'
      ? activeSlots
        .map((slot) => ({ slot, brief: storyboardBriefs.find((item) => item.id === slot.id) }))
        .filter((task) => task.brief)
        .sort((a, b) => Number(a.slot.id) - Number(b.slot.id))
      : Array.from({ length: singleBatchCount }, () => ({ slot: selectedSlot, brief: selectedBrief })).filter((task) => task.brief);
    if (!tasks.length) {
      appLogger.log('pipeline.generation.blocked', {
        reason: 'empty_generation_tasks',
        generationMode: activeGenerationMode
      }, { level: 'warn', projectId: activeProjectId, step: 'generation' });
      setGenerationStatus('当前没有可生成的图片方案。');
      return;
    }

    const generationSessionId = `generation_${Date.now().toString(36)}`;
    const startedAt = performance.now();
    appLogger.log('pipeline.generation.batch_started', {
      generationSessionId,
      generationMode: activeGenerationMode,
      taskCount: tasks.length,
      outputPresetId: outputPreset.id,
      baselineMode,
      slotIds: tasks.map((task) => task.slot.id)
    }, { projectId: activeProjectId, step: 'generation', traceId: generationSessionId });

    if (tasks.length > 1) {
      setIsBatchRunning(true);
      setActiveRunId('');
      setBatchLog(tasks.map((task, index) => ({
        id: `${task.slot.id}-${index}`,
        slotTitle: task.brief.title || task.slot.title,
        status: 'waiting',
        message: '等待开始'
      })));
      setGenerationStatus(activeGenerationMode === 'all-one'
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
            outputPreset,
            batchId: generationSessionId,
            batchIndex: index + 1
          });
          completedRuns.push(run);
          onSaveGenerationRuns(completedRuns);
          setActiveRunId(run.id);
          setSelectedSlot(task.slot);
          setBatchLog((items) => items.map((item) => (
            item.id === logId ? { ...item, status: 'reviewing', message: '等待 AI 预审' } : item
          )));
          setBatchLog((items) => items.map((item) => (
            item.id === logId ? { ...item, status: 'running', message: '正在 AI 预审' } : item
          )));
          try {
            const reviewedRun = await reviewCandidateRun(run, task.slot, task.brief, { outputPreset });
            const runIndex = completedRuns.findIndex((item) => item.id === run.id);
            if (runIndex >= 0) completedRuns.splice(runIndex, 1, reviewedRun);
            onSaveGenerationRuns(completedRuns);
            setBatchLog((items) => items.map((item) => (
              item.id === logId
                ? { ...item, status: 'done', message: aiReviewVerdicts[reviewedRun.aiReview?.verdict]?.label || '已预审' }
                : item
            )));
          } catch (reviewError) {
            const message = getGenerationErrorMessage(reviewError);
            const keptRun = { ...run, note: `AI 预审失败：${message}。图片已保留，请人工判断是否可用。` };
            const runIndex = completedRuns.findIndex((item) => item.id === run.id);
            if (runIndex >= 0) completedRuns.splice(runIndex, 1, keptRun);
            onSaveGenerationRuns(completedRuns);
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
              : item.status === 'waiting'
                ? { ...item, status: 'blocked', message: `前序第 ${index + 1} 张失败，已暂停` }
                : item
          )));
          setGenerationStatus(`第 ${index + 1} 张生成失败，已暂停后续任务，避免跳号或混入错误结果。`);
          break;
        }
      }
      setIsBatchRunning(false);
      if (activeGenerationMode === 'all-one' && tasks[0]?.slot) {
        setSelectedSlot(tasks[0].slot);
      }
      appLogger.log('pipeline.generation.batch_completed', {
        generationSessionId,
        completedCount: completedRuns.length,
        taskCount: tasks.length,
        failedCount: failedMessages.length,
        durationMs: Math.round(performance.now() - startedAt)
      }, { projectId: activeProjectId, step: 'generation', traceId: generationSessionId });
      setGenerationStatus(summarizeBatchGenerationResult(completedRuns.length, tasks.length, failedMessages, '生成'));
      return;
    }

    setIsGenerating(true);
    setActiveRunId('');
    setGenerationStatus('正在读取原始产品图并生成候选图...');
    try {
      const run = await createCandidateRun(selectedSlot, selectedBrief);
      setActiveRunId(run.id);
      onSaveGenerationRun(run);
      setIsGenerating(false);
      setIsAiReviewing(true);
      setGenerationStatus('候选图已生成，正在自动 AI 预审...');
      try {
        const reviewedRun = await reviewCandidateRun(run, selectedSlot, selectedBrief, {
          outputPreset
        });
        onSaveGenerationRun(reviewedRun);
        setActiveRunId(reviewedRun.id);
        setGenerationStatus(`候选图已生成并完成 AI 预审：${aiReviewVerdicts[reviewedRun.aiReview?.verdict]?.label || '需复核'}。请人工判断是否可用。`);
      } catch (reviewError) {
        setGenerationStatus(reviewError instanceof Error
          ? `候选图已生成，但 AI 预审失败：${reviewError.message}。请人工判断是否可用。`
          : '候选图已生成，但 AI 预审失败。请人工判断是否可用。');
      } finally {
        setIsAiReviewing(false);
      }
      appLogger.log('pipeline.generation.batch_completed', {
        generationSessionId,
        completedCount: 1,
        taskCount: 1,
        failedCount: 0,
        durationMs: Math.round(performance.now() - startedAt)
      }, { projectId: activeProjectId, step: 'generation', traceId: generationSessionId });
    } catch (error) {
      appLogger.error('pipeline.generation.batch_failed', error, {
        projectId: activeProjectId,
        step: 'generation',
        traceId: generationSessionId,
        generationMode: activeGenerationMode,
        durationMs: Math.round(performance.now() - startedAt)
      });
      setGenerationStatus(getGenerationErrorMessage(error));
    } finally {
      setIsGenerating(false);
      setIsAiReviewing(false);
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
      const reviewedRun = await reviewCandidateRun(activeCandidate, activeCandidateSlot, activeCandidateBrief, {
        outputPreset: runOutputPreset
      });
      const review = reviewedRun.aiReview;
      onUpdateGenerationRun(activeCandidate.id, {
        aiReview: review,
        aiSuggestion: deriveAiReviewSuggestion(review)
      });
      setGenerationStatus(`AI 预审完成：${aiReviewVerdicts[review.verdict]?.label || '需复核'}，请结合人工判断。`);
    } catch (error) {
      appLogger.error('pipeline.ai_review.manual_failed', error, {
        projectId: activeProjectId,
        step: 'generation',
        traceId: activeCandidate.id
      });
      setGenerationStatus(error instanceof Error ? error.message : 'AI 预审失败。');
    } finally {
      setIsAiReviewing(false);
    }
  };

  const generateLocalEdit = async ({ instruction, selection, maskDataUrl }) => {
    if (!activeCandidate || !activeCandidateBrief || !maskDataUrl) return;
    const runOutputPreset = getOutputPresetById(activeCandidate.outputPresetId);
    setIsLocalEditing(true);
    setGenerationStatus('正在基于当前候选图生成局部修正版...');
    appLogger.log('pipeline.local_edit.started', {
      parentRunId: activeCandidate.id,
      slotId: activeCandidate.slotId,
      selectionType: selection.type,
      instructionLength: instruction.length
    }, { projectId: activeProjectId, step: 'generation', traceId: activeCandidate.id });
    try {
      setGenerationStatus('正在读取当前图片并准备局部选区...');
      appLogger.log('pipeline.local_edit.guide_started', {
        parentRunId: activeCandidate.id,
        slotId: activeCandidate.slotId
      }, { projectId: activeProjectId, step: 'generation', traceId: activeCandidate.id });
      const guideDataUrl = await createLocalEditGuideDataUrl(activeCandidate.imageSrc, selection, runOutputPreset);
      appLogger.log('pipeline.local_edit.guide_completed', {
        parentRunId: activeCandidate.id,
        slotId: activeCandidate.slotId
      }, { projectId: activeProjectId, step: 'generation', traceId: activeCandidate.id });
      setGenerationStatus('局部选区已准备，正在提交生图任务...');
      const run = await createCandidateRun(activeCandidateSlot, activeCandidateBrief, {
        outputPreset: runOutputPreset,
        baselineMode: activeCandidate.baselineMode,
        localEdit: {
          parentRunId: activeCandidate.id,
          baseImageSrc: activeCandidate.imageSrc,
          maskDataUrl,
          guideDataUrl,
          instruction,
          selection
        }
      });
      setGenerationStatus('局部修正版已生成，正在自动 AI 预审...');
      try {
        const reviewedRun = await reviewCandidateRun(run, activeCandidateSlot, activeCandidateBrief, {
          outputPreset: runOutputPreset
        });
        onSaveGenerationRun(reviewedRun);
        setActiveRunId(reviewedRun.id);
        setGenerationStatus(`局部修正版已完成 AI 预审：${aiReviewVerdicts[reviewedRun.aiReview?.verdict]?.label || '需复核'}。`);
      } catch (reviewError) {
        onSaveGenerationRun({ ...run, note: `局部修改完成，但 AI 预审失败：${getGenerationErrorMessage(reviewError)}` });
        setActiveRunId(run.id);
        setGenerationStatus('局部修正版已保留，但 AI 预审未完成。请人工判断或稍后重试预审。');
      }
      setIsLocalEditOpen(false);
      appLogger.log('pipeline.local_edit.completed', {
        parentRunId: activeCandidate.id,
        slotId: activeCandidate.slotId
      }, { projectId: activeProjectId, step: 'generation', traceId: activeCandidate.id });
    } catch (error) {
      const message = getGenerationErrorMessage(error);
      setGenerationStatus(`局部修改失败：${message}`);
      appLogger.error('pipeline.local_edit.failed', error, {
        projectId: activeProjectId,
        step: 'generation',
        traceId: activeCandidate.id,
        slotId: activeCandidate.slotId
      });
    } finally {
      setIsLocalEditing(false);
    }
  };

  return (
    <section className="page-grid generation-workspace">
      <div className="left-column generation-left-sticky">
        <section className="vz-card panel api-panel">
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
                data-slot-number={String(slot.id).padStart(2, '0')}
                key={slot.id}
                onClick={() => {
                  setSelectedSlot(slot);
                  setGenerationStatus('');
                }}
              >
                <img src={generationPreviewImage} alt={`${slot.title} product reference`} />
                <span>
                          <strong>{brief?.title || slot.title}</strong>
                  <small>{brief ? brief.goal : '等待方案'}</small>
                </span>
                <SlotGenerationStatusPill slotId={slot.id} generationRuns={generationRuns} />
              </button>
              );
            })}
          </div>
          <p className="panel-note">
            同一产品内重新生成卖点或 7 图方案会保留质量样本；如果更换主图、SKU 或产品名，系统会清空旧记录避免混入旧产品数据。
          </p>
          <div className="generation-left-queue" aria-label="待人工判断">
            <div className="generation-left-queue-head">
            <div><p className="eyebrow">REVIEW QUEUE</p><strong>待人工判断</strong></div>
            <span>{unreviewedQualityRuns.length}</span>
            </div>
            {(showGenerationProgress || generationStatus) && (
              <div className={generationStatusClass}>
                <span>{generationStageLabel || '处理状态'}</span>
                <strong>{generationStatus || batchProgress.running?.message || '正在等待下一次操作'}</strong>
              </div>
            )}
            {activeServerTasks.length > 0 && (
              <div className="generation-server-task-list" aria-label="服务器生图任务">
                {activeServerTasks.map((task) => (
                  <div key={task.id}>
                    <span>{String(task.slotId || '').padStart(2, '0')}</span>
                    <p>
                      <strong>{task.slotTitle || '图片生成任务'}</strong>
                      <small>{task.status === 'running' ? `生成中 · 第 ${Math.max(1, task.attemptCount || 1)} 次尝试` : '排队中'}</small>
                    </p>
                    <button className="vz-btn vz-btn--ghost" type="button" onClick={() => cancelServerTask(task.id)}>取消</button>
                  </div>
                ))}
              </div>
            )}
            {visibleQueueRuns.length ? (
              <div className="generation-left-queue-list">
                {visibleQueueRuns.map((run) => (
                  <button
                    className={activeCandidate?.id === run.id ? 'active' : ''}
                    key={run.id}
                    onClick={() => selectQualityRun(run, '已打开待判断候选图。')}
                    type="button"
                  >
                    <span>{String(run.slotId).padStart(2, '0')}</span>
                    <strong>{run.slotTitle}</strong>
                    <small>{run.aiReview ? aiReviewVerdicts[run.aiReview.verdict]?.label || '已预审' : '待 AI 预审'}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="generation-left-queue-empty">候选图生成后，可从这里直接进入人工判断。</p>
            )}
          </div>
        </section>
      </div>

      <div className="right-column">
        <FocusFrame active={getFocusSignal(focusRequest, 'generation')}>
          <section className={`vz-card panel generation-panel ${activeCandidate ? 'has-candidate' : 'is-empty'}`}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Generate</p>
                <h3>设计与生图</h3>
                <p className="generation-workspace-subtitle">{String(selectedSlot.id).padStart(2, '0')} · {selectedBrief?.title || selectedSlot.title}</p>
              </div>
            </div>

            <div className="generation-setup">
            <div className="generation-setup-head">
              <span>生成方式</span>
              <strong>{baselineMode ? '基线模式' : '品牌模式'}</strong>
            </div>

            <div className="generation-method">
              <div className="generation-method-grid">
                <button
                  className="vz-btn vz-btn--primary primary-button generation-action-button"
                  disabled={isGenerationBusy || !canGenerate}
                  onClick={() => {
                    setGenerationMode('single-multi');
                    runGeneration('single-multi');
                  }}
                >
                  <Sparkles size={15} />
                  当前图生成 3 张
                </button>
                <button
                  className="vz-btn vz-btn--primary primary-button generation-action-button"
                  disabled={isGenerationBusy || !canGenerate}
                  onClick={() => {
                    setGenerationMode('all-one');
                    runGeneration('all-one');
                  }}
                >
                  <Layers size={15} />
                  整套各生成 1 张
                </button>
              </div>
              {generationMode === 'single-multi' ? (
                <div className="generation-count-row muted">
                  <span>当前图槽生成 3 张候选图，用于比较后选定一张。</span>
                </div>
              ) : (
                <div className="generation-count-row muted">
                  <span>按整套图片方案各生成 1 张，并自动进入待判断队列。</span>
                </div>
              )}
            </div>

            <section className="generation-style-selector" aria-label="图片风格">
              <div className="generation-style-selector-head">
                <div>
                  <Palette size={16} />
                  <span>图片风格</span>
                </div>
                <small>{hasSelectedBrand
                  ? brandVersionState?.latestVersion
                    ? `项目锁定 v${selectedProjectBrand.version} · 品牌库 v${brandVersionState.latestVersion}`
                    : `项目品牌快照 v${selectedProjectBrand.version}`
                  : brandLibraryStatus === 'loading'
                    ? '正在验证项目品牌'
                    : '未选择品牌，仅可使用基线'}</small>
              </div>
              <div className="generation-style-options" role="group" aria-label="选择图片风格模式">
                <button
                  className={baselineMode ? 'active' : ''}
                  onClick={() => setBaselineMode(true)}
                >
                  <Layers size={16} />
                  <span><strong>基线</strong><small>统一商业基线</small></span>
                </button>
                <button
                  className={!baselineMode ? 'active' : ''}
                  disabled={!hasSelectedBrand}
                  onClick={() => setBaselineMode(false)}
                  title={hasSelectedBrand ? '套用当前项目的品牌规则' : '请先在项目资料中选择品牌'}
                >
                  <Palette size={16} />
                  <span><strong>品牌</strong><small>{hasSelectedBrand ? '应用品牌规则' : '未选择品牌'}</small></span>
                </button>
              </div>
              <p>{baselineMode ? '使用统一的商业基线，不读取品牌色、标题与箭头规则。' : '生成时会读取项目已绑定品牌的色彩、标题、箭头和场景规则。'}</p>
              {brandVersionState?.canUpgrade && (
                <div className="generation-brand-update-notice">
                  <span>品牌库已更新到 v{brandVersionState.latestVersion}，本项目仍按 v{brandVersionState.lockedVersion} 生成。</span>
                  <button className="vz-btn vz-btn--ghost" type="button" onClick={onUpgradeBrandSnapshot}>
                    升级项目版本
                  </button>
                </div>
              )}
            </section>
            </div>

            {selectedBrief ? (
              <div className="generation-brief">
                <div className="generation-context-head">
                  <span className="eyebrow">Generation Context</span>
                </div>
                <div className="generation-brief-summary">
                  <span>本图证明什么</span>
                  <strong>{selectedBrief.primaryClaim || '暂未分配主卖点'}</strong>
                  <p>{selectedBrief.visualProof || selectedBrief.composition || '这张图需要用画面证明卖点，而不是只放文字。'}</p>
                </div>
                <details className="generation-brief-details">
                  <summary>
                    <span>
                      <b>生成规则与模型对照</b>
                      <small>仅在需要时展开</small>
                    </span>
                    <ChevronRight size={17} />
                  </summary>
                  <div className="model-compare-box">
                    <div>
                      <span>模型对照验证</span>
                      <p>复制同一套提示词到页面端 GPT；生成后把图片导入这里，用同一套 P0 标准判断。</p>
                    </div>
                    <div className="model-compare-actions">
                      <button className="vz-btn vz-btn--secondary secondary-button" onClick={copyGptTestPrompt}>
                        <ClipboardCheck size={15} />
                        复制提示词
                      </button>
                      <label className="vz-btn vz-btn--secondary secondary-button upload-button" htmlFor="external-candidate-upload">
                        <Upload size={15} />
                        导入外部图
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
                          <button className="vz-btn vz-btn--ghost text-button" onClick={() => setGptComparisonPrompt('')}>关闭</button>
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
                </details>
              </div>
            ) : (
              <div className="brief-empty">
                <FileText size={22} />
                <strong>还没有可生图的 brief</strong>
                <p>请先回到图片方案，生成每张图的角色、卖点和画面证明方式。</p>
              </div>
            )}

            {!activeCandidate && (
              <div className="candidate-block candidate-pending-block">
                <div className="candidate-preview candidate-preview-pending">
                  {isGenerationBusy && <VistamzLoader size={40} label={generationStageLabel} />}
                  <strong>{candidatePendingTitle}</strong>
                  <p>{batchProgress.total ? `${batchProgress.done + batchProgress.failed + batchProgress.blocked}/${batchProgress.total} 已处理。${candidatePendingDetail}` : candidatePendingDetail}</p>
                </div>
              </div>
            )}

            {activeCandidate && (
              <>
                <div className="candidate-block">
                  <div
                    className={`candidate-preview ${isGenerationBusy ? 'is-processing' : ''}`}
                    style={{ '--candidate-ratio': `${activeCandidatePreset.width} / ${activeCandidatePreset.height}` }}
                    aria-busy={isGenerationBusy}
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
                    {isGenerationBusy && (
                      <div className="candidate-processing-overlay" role="status" aria-live="polite">
                        <VistamzLoader size={42} label={generationStageLabel} />
                        <strong>{generationStageLabel}</strong>
                        <span>{generationStatus || '正在处理，请勿重复提交。'}</span>
                      </div>
                    )}
                  </div>

                  {slotRuns.length > 1 && (
                    <div className="run-history">
                      <span>候选版本 {slotRuns.length}</span>
                      {slotRuns.slice(0, 5).map((run) => (
                        <button
                          className={activeCandidate?.id === run.id ? 'active' : ''}
                          key={run.id}
                          onClick={() => setActiveRunId(run.id)}
                        >
                          {run.imageSrc && <img src={run.imageSrc} alt={`${run.slotTitle} 候选图`} />}
                          <GenerationVerdictPill verdict={run.verdict} />
                          <strong>{run.editType === 'local' ? '局部修订' : '候选图'}</strong>
                          <small>{formatProjectTime(run.createdAt)}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <aside className="generation-review-panel">
                  <div className={`candidate-review-summary ${activeCandidate.aiReview?.verdict || 'empty'}`}>
                    <div className="candidate-review-summary-head">
                      <span>AI 预审</span>
                      {activeCandidate.aiReview && <b className="candidate-review-score" aria-label={`风险分 ${activeCandidate.aiReview.score ?? '-'}`}>{activeCandidate.aiReview.score ?? '-'}</b>}
                    </div>
                    <strong>{activeCandidate.aiReview ? aiReviewVerdicts[activeCandidate.aiReview.verdict]?.label || '需复核' : '等待预审'}</strong>
                    <p>{activeCandidate.aiReview ? '最终以人工判断为准' : '生成后会自动预审；这里显示简短结论。'}</p>
                  </div>

                  <details className="candidate-ai-evidence">
                    <summary>
                      <span>查看预审依据</span>
                      <ChevronRight size={16} />
                    </summary>
                    <div className="ai-review-action-row">
                      <button className="vz-btn vz-btn--secondary secondary-button" disabled={isAiReviewing || isBatchRunning} onClick={runAiReview}>
                        <ShieldCheck size={16} />
                        {isAiReviewing ? 'AI 预审中...' : activeCandidate.aiReview ? '重新 AI 预审' : 'AI 预审'}
                      </button>
                      <span>AI 只提示风险，最终仍由人工确认。</span>
                    </div>
                    <AiReviewPanel review={activeCandidate.aiReview} />
                    <AiSuggestionBox suggestion={activeCandidate.aiSuggestion} onApply={applyAiSuggestionToActiveCandidate} />
                  </details>

                  <div className="generation-review-divider" />

                  <div className="quick-review-bar">
                    <div>
                      <span>人工判断</span>
                      <strong>确认后，这张图才计入提交版本。</strong>
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
                      <button className="ai-suggestion-action" disabled={!activeCandidate.aiSuggestion && !activeCandidate.aiReview} onClick={applyAiSuggestionToActiveCandidate}>
                        <Sparkles size={15} />采用 AI 建议
                      </button>
                      <button className="vz-btn vz-btn--secondary secondary-button" disabled={!unreviewedQualityRuns.length} onClick={() => selectNextUnreviewedRun()}>
                        <ChevronRight size={15} />下一张
                      </button>
                    </div>
                    <label className="auto-advance-toggle">
                      <input checked={autoAdvanceReview} onChange={(event) => setAutoAdvanceReview(event.target.checked)} type="checkbox" />
                      标记后自动跳下一张
                    </label>
                  </div>

                  <div className="quality-review-box">
                    <div className="quality-review-header"><div><span>问题原因与提示词调优</span><p>仅在需修改或不可用时记录；系统会把它转成下一轮的限制条件。</p></div></div>
                    {activeCandidate.verdict === 'usable' ? (
                      <div className="reason-empty-state"><Check size={16} /><span>已标记可用，无需选择问题原因。</span></div>
                    ) : (
                      <div className="reason-grid">
                        {generationFailureReasons.map((reason) => {
                          const checked = activeCandidate.reasons.includes(reason.id);
                          return (
                            <button
                              className={checked ? 'active' : ''}
                              key={reason.id}
                              onClick={() => {
                                const reasons = checked ? activeCandidate.reasons.filter((item) => item !== reason.id) : [...activeCandidate.reasons, reason.id];
                                onUpdateGenerationRun(activeCandidate.id, { reasons });
                              }}
                            >
                              {checked ? <Check size={14} /> : <Plus size={14} />}{reason.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {activeCandidate.reasons.length > 0 && <p className="reason-summary">已标记：{getFailureReasonLabels(activeCandidate.reasons).join('、')}</p>}
                    {activeCandidate.verdict !== 'usable' && activeReasonSuggestions.length > 0 && (
                      <div className="reason-tuning-box">
                        <div><span>下轮生成建议</span><strong>已生成 {activeReasonSuggestions.length} 条限制规则</strong><p>{activeReasonSuggestions.map((suggestion) => suggestion.title).join('、')}</p></div>
                        <div className="reason-tuning-actions">
                          <button className="vz-btn vz-btn--secondary secondary-button" onClick={applyActiveReasonRulesToPrompt}><Plus size={15} />加入提示词</button>
                          <button className="vz-btn vz-btn--secondary secondary-button" onClick={saveReasonsAndGoNext}><ChevronRight size={15} />保存并下一张</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="candidate-local-edit-bar">
                    <div className="candidate-local-edit-copy"><PencilLine size={17} /><span><strong>局部修改</strong><small>仅修改选中区域，选区外保持原图不变。</small></span></div>
                    <div className="candidate-local-edit-actions">
                      {activeParentCandidate?.imageSrc && <button className="vz-btn vz-btn--secondary secondary-button" type="button" onClick={() => setIsLocalCompareOpen(true)}><Eye size={16} />对比</button>}
                      <button className="vz-btn vz-btn--secondary secondary-button" type="button" disabled={isGenerating || isBatchRunning || isLocalEditing || !activeCandidate.imageSrc} onClick={() => setIsLocalEditOpen(true)}><PencilLine size={16} />局部修改</button>
                    </div>
                  </div>

                  <details className="candidate-prompt-tuning">
                    <summary><span>提示词调优</span><ChevronRight size={16} /></summary>
                    <PromptTuningPanel
                      slot={activeCandidateSlot}
                      generationRuns={generationRuns}
                      promptOverride={promptOverrides?.[activeCandidateSlot.id] || ''}
                      onUpdatePromptOverride={onUpdatePromptOverride}
                    />
                  </details>
                </aside>
              </>
            )}
          </section>
        </FocusFrame>

      </div>
      <footer className="generation-submit-bar">
        <div>
          <strong>{reviewedSlotCount} / {activeSlots.length || STORYBOARD_SLOT_COUNT} 张已审核</strong>
          <small>{generationReadyForReview
            ? '每个图槽均已选定一张可用版本，可以提交审核。'
            : `已选定 ${approvedSlotRuns.length} 张可用图，还需处理 ${Math.max(0, (activeSlots.length || STORYBOARD_SLOT_COUNT) - reviewedSlotCount)} 张。`}</small>
        </div>
        <button className="vz-btn vz-btn--primary primary-button" disabled={!generationReadyForReview} onClick={onGoReview} type="button">
          <ShieldCheck size={16} />提交审核
        </button>
      </footer>
      {isLocalEditOpen && <LocalEditModal
        candidate={activeCandidate}
        outputPreset={activeCandidatePreset}
        isBusy={isLocalEditing}
        onClose={() => setIsLocalEditOpen(false)}
        onGenerate={generateLocalEdit}
      />}
      {isLocalCompareOpen && <LocalEditCompareModal
        beforeCandidate={activeParentCandidate}
        afterCandidate={activeCandidate}
        onClose={() => setIsLocalCompareOpen(false)}
      />}
    </section>
  );
}

function SystemOverviewPage({ projects, onNavigate }) {
  const [taskMonitor, setTaskMonitor] = useState({ tasks: [], summary: {}, loading: true, error: '' });
  const inReview = projects.filter((project) => project.cloud?.status === 'review').length;
  const readyForRelease = projects.filter((project) => {
    const activeSlots = getActiveSlots(project.storyboardBriefs || []);
    return activeSlots.length > 0 && activeSlots.every((slot) => (
      getReviewDecision(project.reviewDecisions || [], slot.id, project.storyboardBriefs || []).opsStatus === 'approved'
    ));
  }).length;
  const loadTaskMonitor = async () => {
    try {
      const next = await listAdminGenerationTasks(100);
      setTaskMonitor({ ...next, loading: false, error: '' });
    } catch (error) {
      setTaskMonitor((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : '任务状态读取失败。' }));
    }
  };

  useEffect(() => {
    void loadTaskMonitor();
    const timer = window.setInterval(() => void loadTaskMonitor(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const exceptionTasks = taskMonitor.tasks
    .filter((task) => ['failed', 'running', 'queued'].includes(task.status))
    .slice(0, 12);
  const taskStatusLabel = (status) => ({ failed: '失败', running: '生成中', queued: '排队中' }[status] || status);
  const taskSummary = taskMonitor.summary || {};

  return (
    <section className="system-overview-page">
      <header className="system-overview-heading">
        <div><p className="eyebrow">SYSTEM HEALTH</p><h2>系统与日志</h2><p>用于分配项目、定位问题，并完成最终放行。</p></div>
        <span className="system-health-pill"><Check size={14} />日志记录已启用</span>
      </header>
      <div className="system-metric-grid">
        <article><small>团队项目</small><strong>{projects.length}</strong><span>当前可访问</span></article>
        <article><small>等待运营</small><strong>{inReview}</strong><span>已提交审核</span></article>
        <article><small>等待放行</small><strong>{readyForRelease}</strong><span>运营已通过</span></article>
        <article><small>运行中任务</small><strong>{taskSummary.activeCount || 0}</strong><span>排队与生成中</span></article>
        <article><small>失败任务</small><strong>{taskSummary.failedCount || 0}</strong><span>需要管理员关注</span></article>
        <article><small>今日估算成本</small><strong>${Number(taskSummary.todayCostUsd || 0).toFixed(2)}</strong><span>{taskSummary.todayCount || 0} 个任务，非最终账单</span></article>
      </div>
      <div className="system-shortcut-grid">
        <button type="button" onClick={() => onNavigate('team')}><UsersRound size={20} /><strong>项目分配</strong><small>指定设计师与运营负责人</small></button>
        <button type="button" onClick={() => onNavigate('admin-release')}><ShieldCheck size={20} /><strong>最终放行</strong><small>查看运营已通过的项目</small></button>
        <button type="button" onClick={() => onNavigate('quality')}><BarChart3 size={20} /><strong>质量与问题记录</strong><small>定位生图、预审和导出问题</small></button>
      </div>
      <section className="system-task-monitor">
        <header>
          <div><p className="eyebrow">GENERATION TASKS</p><h3>生图任务监控</h3><p>集中查看排队、运行和失败任务；页面每 15 秒自动更新。</p></div>
          <button className="vz-btn vz-btn--ghost" type="button" onClick={() => void loadTaskMonitor()} disabled={taskMonitor.loading}>
            {taskMonitor.loading ? <VistamzLoader size={15} label="正在读取任务状态" /> : <RefreshCcw size={15} />}{taskMonitor.loading ? '读取中' : '刷新'}
          </button>
        </header>
        {taskMonitor.error && <div className="system-task-error">{taskMonitor.error}</div>}
        <div className="system-task-list">
          {exceptionTasks.length ? exceptionTasks.map((task) => (
            <article className={`system-task-row is-${task.status}`} key={task.id}>
              <span className="system-task-state">{taskStatusLabel(task.status)}</span>
              <div><strong>{task.projectName || '未命名项目'} · {task.slotTitle || `图槽 ${task.slotId}`}</strong><small>{task.requestedByName || '未知发起人'} · 已尝试 {task.attemptCount}/3 次 · {formatProjectTime(task.updatedAt)}</small></div>
              <div className="system-task-cost"><small>估算成本</small><strong>${Number(task.estimatedCostUsd || 0).toFixed(2)}</strong></div>
              {task.errorMessage ? <p>{task.errorMessage}</p> : <p>{task.status === 'queued' ? '等待当前项目的前一任务结束。' : '模型正在生成候选图。'}</p>}
            </article>
          )) : <div className="system-task-empty"><Check size={18} /><span>目前没有排队、运行或失败的生图任务。</span></div>}
        </div>
      </section>
      <section className="system-log-note"><MessageSquareWarning size={18} /><div><strong>问题日志会随操作持续记录</strong><p>生成失败、AI 预审异常、权限拦截和导出问题都会附带项目、步骤和追踪编号，供后续修复与版本升级使用。</p></div></section>
    </section>
  );
}

function AdminReleasePage({ projects, onOpenProject }) {
  const readyProjects = projects.filter((project) => {
    const activeSlots = getActiveSlots(project.storyboardBriefs || []);
    return activeSlots.length > 0 && activeSlots.every((slot) => (
      getReviewDecision(project.reviewDecisions || [], slot.id, project.storyboardBriefs || []).opsStatus === 'approved'
    ));
  });

  return (
    <section className="admin-release-page">
      <header className="admin-release-heading"><div><p className="eyebrow">FINAL RELEASE</p><h2>管理员最终放行</h2><p>只显示运营已通过、等待管理员确认交付的项目。</p></div><div className="admin-release-count"><strong>{readyProjects.length}</strong><span>待放行</span></div></header>
      <div className="admin-release-list">
        {readyProjects.length ? readyProjects.map((project) => {
          const form = project.form || {};
          const preview = form.referenceImages?.main?.displayPreview || form.sourceImageDisplayPreview || form.sourceImagePreview;
          const activeSlots = getActiveSlots(project.storyboardBriefs || []);
          return <article className="admin-release-row" key={project.id}>
            <div className="admin-release-thumb">{preview ? <img src={preview} alt="" /> : <FileImage size={22} />}</div>
            <div><span className="admin-ops-chip">运营已通过</span><h3>{getProjectTitle(form)}</h3><p>{getProjectPlanOutputPreset(form).label} · {activeSlots.length}/{activeSlots.length} 张运营通过</p></div>
            <div className="admin-release-meta"><small>待确认</small><strong>管理员最终放行</strong></div>
            <button className="vz-btn vz-btn--secondary secondary-button" type="button" onClick={() => onOpenProject(project.id, 'review')}>检查并放行</button>
          </article>;
        }) : <div className="admin-release-empty"><ShieldCheck size={24} /><strong>暂时没有等待放行的项目</strong><p>运营完成整套审核后，项目会自动出现在这里。</p></div>}
      </div>
    </section>
  );
}

function HandoffPage({ projectForm, storyboardBriefs, generationRuns, onBack, onSubmit, isSubmitting = false }) {
  const activeSlots = getActiveSlots(storyboardBriefs);
  const selectedRuns = activeSlots
    .map((slot) => ({ slot, run: getBestRunForSlot(slot.id, generationRuns) }))
    .filter((item) => item.run?.verdict === 'usable');
  const ready = isStoryboardPlanReady(storyboardBriefs, projectForm) && selectedRuns.length === activeSlots.length;
  const attentionCount = selectedRuns.filter((item) => item.run?.aiReview?.verdict !== 'pass').length;

  return (
    <section className="handoff-page">
      <header className="handoff-heading">
        <div>
          <button className="workspace-back-button" type="button" onClick={onBack}><ChevronRight size={15} />返回设计与生图</button>
          <p className="eyebrow">SUBMIT FOR REVIEW</p>
          <h2>提交运营审核</h2>
          <p>只提交每个图槽选定的一张候选图；其他候选图和局部修正版会保留在项目中。</p>
        </div>
      </header>

      <section className="handoff-overview">
        <div className="handoff-number"><strong>{selectedRuns.length} / {activeSlots.length || STORYBOARD_SLOT_COUNT}</strong><span>图槽已选定</span></div>
        <div><h3>{getProjectTitle(projectForm)}</h3><p>{getProjectPlanOutputPreset(projectForm).label} · 提交后将进入运营的审核队列</p></div>
        <span className={ready ? 'handoff-ready-pill' : 'handoff-pending-pill'}>{ready ? '可以提交' : '等待补齐'}</span>
      </section>

      <section className="handoff-checks">
        <h3>提交前检查</h3>
        <div><Check size={16} /><span><strong>每个图槽只会提交一张选定候选图</strong><small>未选中的候选图不会删除，可随时继续局部修改或回退。</small></span></div>
        <div><Check size={16} /><span><strong>运营将依据图槽方案、卖点和 AI 预审进行审核</strong><small>运营审核只看当前项目，不进入设计工作台。</small></span></div>
        <div className={attentionCount ? 'attention' : ''}>{attentionCount ? <MessageSquareWarning size={16} /> : <Check size={16} />}<span><strong>{attentionCount ? `${attentionCount} 张图片仍有 AI 风险提示` : '没有待关注的 AI 风险提示'}</strong><small>AI 提示不会拦截提交，但会在运营审核时优先展示。</small></span></div>
      </section>

      <label className="handoff-note-field"><span>给运营的说明（可选）</span><textarea placeholder="例如：已核对第 3 张人物与产品比例；第 6 张的尺寸数据来自说明书。" /></label>
      <footer className="handoff-actions"><button className="vz-btn vz-btn--secondary secondary-button" disabled={isSubmitting} type="button" onClick={onBack}>返回继续修改</button><button className="vz-btn vz-btn--primary primary-button" disabled={!ready || isSubmitting} type="button" onClick={onSubmit}><ClipboardCheck size={16} />{isSubmitting ? '正在提交...' : `提交 ${selectedRuns.length} 张给运营审核`}</button></footer>
    </section>
  );
}

function ReviewPage({ ledgerFacts, storyboardBriefs, reviewDecisions, generationRuns, onUpdateReview, onManageLedger, focusRequest, userRole, brandSnapshot, brandVersionState }) {
  const activeSlots = getActiveSlots(storyboardBriefs);
  const activeRole = userRole === 'admin' ? 'admin' : 'ops';
  const decisions = activeSlots.map((slot) => getReviewDecision(reviewDecisions, slot.id, storyboardBriefs));
  const approved = decisions.filter(isDecisionFullyApproved).length;
  const rework = decisions.filter((decision) => decision.status === 'rework' || decision.status === 'blocked').length;
  const pending = Math.max(0, activeSlots.length - approved - rework);
  const [selectedSlotId, setSelectedSlotId] = useState(() => activeSlots[0]?.id || 1);
  const [reviewBrand, setReviewBrand] = useState(() => (
    brandSnapshot?.brandId && brandSnapshot.brandId !== 'none'
      ? normalizeBrandProfile(brandSnapshot.rules || { id: brandSnapshot.brandId, name: brandSnapshot.brandName })
      : null
  ));
  const selectedSlot = activeSlots.find((slot) => slot.id === selectedSlotId) || activeSlots[0] || getFallbackSlot(1);
  const selectedBrief = storyboardBriefs.find((brief) => brief.id === selectedSlot.id);
  const selectedDecision = getReviewDecision(reviewDecisions, selectedSlot.id, storyboardBriefs);
  const selectedRun = getBestRunForSlot(selectedSlot.id, generationRuns);

  useEffect(() => {
    if (!activeSlots.some((slot) => slot.id === selectedSlotId) && activeSlots[0]) setSelectedSlotId(activeSlots[0].id);
  }, [activeSlots, selectedSlotId]);

  useEffect(() => {
    let cancelled = false;
    if (!brandSnapshot?.brandId || brandSnapshot.brandId === 'none' || !brandSnapshot.brandVersion) {
      setReviewBrand(null);
      return () => { cancelled = true; };
    }
    setReviewBrand(normalizeBrandProfile(brandSnapshot.rules || {
      id: brandSnapshot.brandId,
      name: brandSnapshot.brandName,
      version: brandSnapshot.brandVersion
    }));
    getTeamBrandVersion(brandSnapshot.brandId, brandSnapshot.brandVersion)
      .then((brand) => {
        if (!cancelled) setReviewBrand(normalizeBrandProfile(brand));
      })
      .catch(() => {
        // The frozen snapshot remains authoritative when signed previews are temporarily unavailable.
      });
    return () => { cancelled = true; };
  }, [brandSnapshot?.brandId, brandSnapshot?.brandVersion]);

  return (
    <section className={activeRole === 'ops' ? 'review-workspace operator-review-workspace' : 'review-workspace'}>
      <aside className="review-slot-panel">
        <div className="review-slot-panel-head"><p className="eyebrow">REVIEW QUEUE</p><strong>图片审核</strong><span>{approved}/{activeSlots.length || STORYBOARD_SLOT_COUNT} 已最终放行</span></div>
        <div className="review-slot-list">
          {activeSlots.map((slot) => {
            const decision = getReviewDecision(reviewDecisions, slot.id, storyboardBriefs);
            const brief = storyboardBriefs.find((item) => item.id === slot.id);
            const run = getBestRunForSlot(slot.id, generationRuns);
            return (
              <button className={selectedSlot.id === slot.id ? 'active' : ''} key={slot.id} onClick={() => setSelectedSlotId(slot.id)} type="button">
                <div className="review-slot-thumb">{run?.imageSrc ? <img src={run.imageSrc} alt="" /> : <FileImage size={18} />}</div>
                <span><small>{String(slot.id).padStart(2, '0')}</small><strong>{brief?.title || slot.title}</strong><em>{run ? generationVerdicts[run.verdict]?.label || '待判断' : '等待候选图'}</em></span>
                <ReviewStatusPill status={decision.status} />
              </button>
            );
          })}
        </div>
      </aside>

      <FocusFrame active={getFocusSignal(focusRequest, 'review')} className="review-preview-panel">
        <div className="review-preview-head"><div><p className="eyebrow">{String(selectedSlot.id).padStart(2, '0')} · IMAGE REVIEW</p><h3>{selectedBrief?.title || selectedSlot.title}</h3><p>{selectedBrief?.goal || selectedSlot.goal}</p></div><ReviewStatusPill status={selectedDecision.status} /></div>
        <div className="review-image-canvas">
          {selectedRun?.imageSrc ? <img src={selectedRun.imageSrc} alt={selectedBrief?.title || selectedSlot.title} /> : <div><FileImage size={34} /><strong>还没有可审核的候选图</strong><p>设计完成生图后，这里会显示候选图。</p></div>}
        </div>
        {selectedRun && <div className="review-image-meta"><span>{selectedRun.outputPresetLabel} · {selectedRun.outputPresetSize}</span><span>{selectedRun.aiReview ? `AI 预审：${aiReviewVerdicts[selectedRun.aiReview.verdict]?.label || '需复核'}` : '等待 AI 预审'}</span></div>}
      </FocusFrame>

      <aside className="review-action-panel">
        <div className="review-action-head"><p className="eyebrow">YOUR DECISION</p><h3>{activeRole === 'admin' ? '管理员最终放行' : '运营审核'}</h3><p>{activeRole === 'admin' ? '确认运营已通过后，决定是否允许导出。' : '核对产品、卖点、文字和物理逻辑。'}</p></div>
        <section className="review-brand-context">
          <div className="review-brand-context-head">
            <span><Palette size={16} /><strong>{reviewBrand?.name || '基线模式'}</strong></span>
            {reviewBrand ? <em>项目锁定 v{brandSnapshot?.brandVersion || reviewBrand.version}</em> : <em>不套品牌</em>}
          </div>
          {reviewBrand ? (
            <>
              {brandVersionState?.latestVersion && brandVersionState.latestVersion !== brandSnapshot?.brandVersion && (
                <div className="review-brand-version-note">品牌库当前 v{brandVersionState.latestVersion}，本项目仍按 v{brandSnapshot?.brandVersion} 审核。</div>
              )}
              <div className="review-brand-style-summary">
                <span>{getBrandStyleOption(brandIconStyleOptions, reviewBrand.iconStyle).label}</span>
                <span>{getBrandStyleOption(brandAnnotationStyleOptions, reviewBrand.annotationStyle).label}</span>
                <span>{getBrandStyleOption(brandCornerStyleOptions, reviewBrand.cornerStyle).label}</span>
                <span>{getBrandStyleOption(brandLabelStyleOptions, reviewBrand.labelStyle).label}</span>
              </div>
              <div className="review-brand-examples">
                <strong>品牌示例对照</strong>
                <div>
                  {reviewBrand.exampleImages.length ? reviewBrand.exampleImages.map((image, index) => (
                    <figure key={image.id} title={image.caption || image.name}>
                      {image.preview ? <img src={image.preview} alt={image.caption || `品牌示例 ${index + 1}`} /> : <FileImage size={18} />}
                      <figcaption>{index + 1}</figcaption>
                    </figure>
                  )) : <small>锁定版本没有示例图。</small>}
                </div>
              </div>
            </>
          ) : <p className="review-brand-baseline">本项目使用统一商业基线，不需要核对品牌示例。</p>}
        </section>
        <RoleChecklist decision={selectedDecision} />
        <ReviewActions decision={selectedDecision} activeRole={activeRole} onUpdateReview={onUpdateReview} />
        <div className="review-checklist-mini"><strong>本张审核要点</strong>{auditItems.slice(0, 4).map((item) => <span key={item.label}>{item.state === 'pass' ? <Check size={14} /> : <MessageSquareWarning size={14} />}{item.label}</span>)}</div>
        <button className="vz-btn vz-btn--ghost text-button strong review-ledger-link" onClick={onManageLedger} type="button">查看关联卖点 <ChevronRight size={15} /></button>
        <div className="review-workspace-summary"><span><strong>{pending}</strong> 待确认</span><span><strong>{rework}</strong> 需处理</span></div>
      </aside>
    </section>
  );
}

function ExportPage({
  activeProjectId,
  projectForm,
  storyboardBriefs,
  reviewDecisions,
  generationRuns,
  exportSelections,
  onUpdateExportSelection,
  focusRequest,
  userRole
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
    && isStoryboardPlanReady(storyboardBriefs, projectForm)
    && activeSlots.every((slot) => isDecisionFullyApproved(getReviewDecision(reviewDecisions, slot.id, storyboardBriefs)));
  const canExportZip = readyForZip && reviewReady && userRole === 'admin';
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
    if (userRole !== 'admin') {
      setExportStatus('请等待管理员完成最终放行并由管理员导出。');
      return;
    }
    if (!storyboardBriefs.length) {
      appLogger.log('pipeline.export.blocked', {
        reason: 'missing_storyboard'
      }, { level: 'warn', projectId: activeProjectId, step: 'export' });
      setExportStatus('请先生成图片方案，再导出图片 ZIP。');
      return;
    }
    if (!readyForZip) {
      appLogger.log('pipeline.export.blocked', {
        reason: 'missing_final_images',
        selectedImageCount,
        slotTotal
      }, { level: 'warn', projectId: activeProjectId, step: 'export' });
      setExportStatus(`最终图还没选齐：当前 ${selectedImageCount}/${slotTotal} 张。请先生成或导入候选图。`);
      return;
    }
    if (!reviewReady) {
      appLogger.log('pipeline.export.blocked', {
        reason: 'review_not_complete',
        firstMissingSlotId: firstMissingReview?.slotId || ''
      }, { level: 'warn', projectId: activeProjectId, step: 'export' });
      setExportStatus(firstMissingReview
        ? `还不能导出：第 ${String(firstMissingReview.slotId).padStart(2, '0')} 张需要完成 ${getDualReviewMissingText(firstMissingReview)}。`
        : '还不能导出：所有图片都需要人工审核通过。');
      return;
    }
    setIsExporting(true);
    setSavedZip(null);
    setExportStatus('正在打包生成图片...');
    const startedAt = performance.now();
    const traceId = `export_${Date.now().toString(36)}`;
    appLogger.log('pipeline.export.started', {
      traceId,
      selectedImageCount,
      slotTotal,
      projectName: projectForm.projectName || projectForm.productName || projectForm.sku || ''
    }, { projectId: activeProjectId, step: 'export', traceId });
    try {
      const zip = await saveImagesZipToApi({
        projectId: activeProjectId,
        projectForm,
        storyboardBriefs,
        generationRuns,
        exportSelections
      });
      setSavedZip(zip);
      appLogger.log('pipeline.export.completed', {
        traceId,
        filename: zip.filename,
        count: zip.count,
        durationMs: Math.round(performance.now() - startedAt)
      }, { projectId: activeProjectId, step: 'export', traceId });
      setExportStatus(`图片 ZIP 已保存到 exports/，共 ${zip.count} 张图。`);
    } catch (error) {
      appLogger.error('pipeline.export.failed', error, {
        projectId: activeProjectId,
        step: 'export',
        traceId,
        durationMs: Math.round(performance.now() - startedAt)
      });
      setExportStatus(error instanceof Error ? `图片 ZIP 导出失败：${error.message}` : '图片 ZIP 导出失败。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="page-grid">
      <div className="left-column">
        <section className="vz-card panel export-ready-panel">
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
            <button className="vz-btn vz-btn--primary primary-button" disabled={isExporting || !canExportZip} onClick={exportImagesZip}>
              <Download size={17} />
              {isExporting ? '打包中...' : canExportZip ? '导出图片 ZIP' : userRole !== 'admin' ? '等待管理员导出' : '等待审核完成'}
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
        <section className="vz-card panel">
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
        <section className="vz-card panel">
          <ExportGate reviewDecisions={reviewDecisions} storyboardBriefs={storyboardBriefs} />
        </section>
      </FocusFrame>
    </section>
  );
}

function WorkspaceApp({ session, onLogout }) {
  const initialProjects = useMemo(() => [], []);
  const hasStoredProjects = false;
  const initialProject = initialProjects[0] || createProjectRecord(blankProjectForm, [], createProjectId());
  const initialBrands = useMemo(() => loadStoredBrands(), []);
  const [selectedSlot, setSelectedSlot] = useState(() => getActiveSlots(initialProject.storyboardBriefs || [])[0] || slots[0]);
  const [activeTab, setActiveTab] = useState('storyboard');
  const [activeSection, setActiveSection] = useState(() => (
    session.user.role === 'admin' ? 'system' : 'projects'
  ));
  const [projects, setProjects] = useState(initialProjects);
  const [brandLibrary, setBrandLibrary] = useState(initialBrands);
  const [brandLibraryStatus, setBrandLibraryStatus] = useState('loading');
  const [activeProjectId, setActiveProjectId] = useState(initialProject.id);
  const [projectForm, setProjectForm] = useState(initialProject.form);
  const [ledgerFacts, setLedgerFacts] = useState(initialProject.ledgerFacts);
  const [storyboardBriefs, setStoryboardBriefs] = useState(initialProject.storyboardBriefs || []);
  const [reviewDecisions, setReviewDecisions] = useState(initialProject.reviewDecisions || createReviewDecisions(initialProject.storyboardBriefs || []));
  const [generationRuns, setGenerationRuns] = useState(normalizeGenerationRuns(initialProject.generationRuns));
  const [promptOverrides, setPromptOverrides] = useState(initialProject.promptOverrides || {});
  const [exportSelections, setExportSelections] = useState(initialProject.exportSelections || {});
  const [activeRole] = useState(session.user.role === 'operator' ? 'ops' : 'design');
  const [saveStatus, setSaveStatus] = useState('');
  const [isLoadingTeamProjects, setIsLoadingTeamProjects] = useState(true);
  const [focusRequest, setFocusRequest] = useState(null);
  const [isPlanningStoryboard, setIsPlanningStoryboard] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUpgradingBrandSnapshot, setIsUpgradingBrandSnapshot] = useState(false);
  const [regeneratingSlotId, setRegeneratingSlotId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const previousSectionRef = useRef(activeSection);
  const planningStartedAtRef = useRef(0);

  useEffect(() => {
    appLogger.log('app.session.started', {
      projectCount: initialProjects.length,
      hasStoredProjects
    }, { projectId: activeProjectId, step: activeSection });
  }, []);

  useEffect(() => {
    let mounted = true;
    listTeamBrands()
      .then((remoteBrands) => {
        if (!mounted) return;
        const baseline = normalizeBrandLibrary(defaultBrandLibrary).find((brand) => brand.id === 'none');
        const normalized = normalizeBrandLibrary([baseline, ...remoteBrands].filter(Boolean));
        setBrandLibrary(normalized);
        storeBrands(normalized);
        setBrandLibraryStatus('ready');
      })
      .catch((error) => {
        if (!mounted) return;
        const baseline = normalizeBrandLibrary(defaultBrandLibrary).find((brand) => brand.id === 'none');
        setBrandLibrary(normalizeBrandLibrary([baseline].filter(Boolean)));
        setBrandLibraryStatus('error');
        appLogger.error('brand.library.load_failed', error, { step: 'brands' });
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isPlanningStoryboard) return undefined;
    const elapsed = planningStartedAtRef.current ? Date.now() - planningStartedAtRef.current : 65000;
    const timeoutId = window.setTimeout(() => {
      setIsPlanningStoryboard(false);
      planningStartedAtRef.current = 0;
      setSaveStatus('方案生成超过 65 秒仍未返回，已停止等待。请重新生成方案，系统会在超时时自动使用本地兜底方案。');
      appLogger.log('pipeline.storyboard.watchdog_stopped', { elapsedMs: elapsed }, {
        level: 'warn',
        projectId: activeProjectId,
        step: 'storyboard'
      });
    }, Math.max(0, 65000 - elapsed));
    return () => window.clearTimeout(timeoutId);
  }, [activeProjectId, isPlanningStoryboard]);

  useEffect(() => {
    let mounted = true;
    const projectLoadStartedAt = performance.now();
    setIsLoadingTeamProjects(true);
    listTeamProjects()
      .then((remoteProjects) => {
        if (!mounted) return;
        const mappedProjects = remoteProjects.map(mapTeamProjectToWorkspaceProject);
        const nextProjects = session.user.role === 'operator'
          ? mappedProjects.filter(isOperatorVisibleProject)
          : mappedProjects;
        appLogger.log('team.projects.metadata_loaded', {
          projectCount: nextProjects.length,
          durationMs: Math.round(performance.now() - projectLoadStartedAt)
        }, { step: 'projects' });
        if (!nextProjects.length) {
          setProjects([]);
          setActiveProjectId('');
          setProjectForm(blankProjectForm);
          setLedgerFacts([]);
          setStoryboardBriefs([]);
          setReviewDecisions([]);
          setGenerationRuns([]);
          setPromptOverrides({});
          setExportSelections({});
          setSelectedSlot(slots[0]);
          setActiveSection(session.user.role === 'admin' ? 'system' : 'projects');
          setSaveStatus(session.user.role === 'operator' ? '暂无分配给你的项目。' : '暂无云端项目，可以创建一个新项目开始。');
          setIsLoadingTeamProjects(false);
          return;
        }
        const nextActive = nextProjects[0];
        setProjects(nextProjects);
        storeProjects(nextProjects);
        setActiveProjectId(nextActive.id);
        setProjectForm(nextActive.form);
        setLedgerFacts(nextActive.ledgerFacts);
        setStoryboardBriefs(nextActive.storyboardBriefs || []);
        setReviewDecisions(nextActive.reviewDecisions || createReviewDecisions(nextActive.storyboardBriefs || []));
        setGenerationRuns(normalizeGenerationRuns(nextActive.generationRuns));
        setPromptOverrides(nextActive.promptOverrides || {});
        setExportSelections(nextActive.exportSelections || {});
        setActiveSection(session.user.role === 'admin' ? 'system' : 'projects');
        setSaveStatus(`已载入 ${nextProjects.length} 个团队项目，图片正在后台恢复`);
        setIsLoadingTeamProjects(false);

        // Project metadata is usable immediately. Signed image URLs are refreshed
        // in the background so historical assets cannot block the whole workspace.
        void Promise.all(nextProjects.map(refreshWorkspaceProjectAssetUrls)).then((hydratedProjects) => {
          if (!mounted) return;
          setProjects(hydratedProjects);
          storeProjects(hydratedProjects);
          const hydratedActive = hydratedProjects.find((project) => project.id === nextActive.id);
          if (hydratedActive) {
            setGenerationRuns(normalizeGenerationRuns(hydratedActive.generationRuns));
          }
          appLogger.log('team.projects.assets_hydrated', {
            projectCount: hydratedProjects.length,
            durationMs: Math.round(performance.now() - projectLoadStartedAt)
          }, { projectId: nextActive.id, step: 'projects' });
          setSaveStatus(`已载入 ${hydratedProjects.length} 个团队项目`);
        });
      })
      .catch((error) => {
        if (!mounted) return;
        appLogger.error('team.projects.load_failed', error);
        setSaveStatus('团队项目暂时无法加载，已保留本机草稿。');
      })
      .finally(() => {
        if (mounted) setIsLoadingTeamProjects(false);
      });
    return () => {
      mounted = false;
    };
  }, [session.user.id]);

  useEffect(() => {
    const previousSection = previousSectionRef.current;
    previousSectionRef.current = activeSection;
    appLogger.log('behavior.step.viewed', {
      from: previousSection === activeSection ? '' : previousSection,
      to: activeSection,
      projectName: projectForm.projectName || projectForm.productName || projectForm.sku || '',
      hasReferenceImage: Boolean(projectForm.sourceImageName || projectForm.sourceImagePreview),
      ledgerCount: ledgerFacts.length,
      storyboardCount: storyboardBriefs.length,
      generationRunCount: generationRuns.length
    }, { projectId: activeProjectId, step: activeSection });
  }, [activeSection]);

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
  const roleWorkspaceAccess = {
    designer: ['projects', 'project', 'ledger', 'storyboard', 'generation', 'handoff', 'brands'],
    operator: ['projects', 'review'],
    admin: ['system', 'team', 'admin-release', 'brands', 'quality', 'review', 'export']
  };
  const allowedSections = roleWorkspaceAccess[session.user.role] || ['project'];
  const workspaceNavItems = session.user.role === 'designer'
    ? [
      { id: 'projects', label: '项目中心', icon: FolderOpen },
      { id: 'brands', label: '品牌库', icon: Palette }
    ]
    : session.user.role === 'operator'
      ? [
        { id: 'projects', label: '我的项目', icon: FolderOpen },
        { id: 'review', label: '审核队列', icon: ShieldCheck }
      ]
      : [
        { id: 'system', label: '系统与日志', icon: BarChart3 },
        { id: 'team', label: '项目分配', icon: UsersRound },
        { id: 'admin-release', label: '最终放行', icon: ShieldCheck },
        { id: 'brands', label: '品牌库', icon: Palette },
        { id: 'quality', label: '质量记录', icon: MessageSquareWarning }
      ];
  const visibleNavItems = navItems.filter((item) => allowedSections.includes(item.id));
  const canCreateProject = ['designer', 'admin'].includes(session.user.role);
  const currentNav = [...navItems, ...globalNavItems,
    { id: 'projects', eyebrow: 'Projects', title: '项目中心', subtitle: '查看并继续你负责的项目。' },
    { id: 'system', eyebrow: 'System Health', title: '系统与日志', subtitle: '管理员专用。用于定位问题、分配项目和最终放行。' },
    { id: 'admin-release', eyebrow: 'Final Release', title: '管理员最终放行', subtitle: '只显示运营已通过、等待管理员确认交付的项目。' }
  ]
    .find((item) => item.id === activeSection) || visibleNavItems[0] || navItems[0];
  const currentProject = projects.find((project) => project.id === activeProjectId);
  const projectBrandLibrary = useMemo(
    () => getProjectScopedBrandLibrary(projectForm, currentProject, brandLibrary),
    [brandLibrary, currentProject?.brandSnapshot, projectForm.brandId]
  );
  const projectFrozenBrand = useMemo(
    () => getProjectFrozenBrandProfile(projectForm, currentProject),
    [currentProject?.brandSnapshot, projectForm.brandId]
  );
  const projectBrandVersionState = useMemo(
    () => getProjectBrandVersionState(projectForm, currentProject, brandLibrary, brandLibraryStatus),
    [brandLibrary, brandLibraryStatus, currentProject?.brandSnapshot, projectForm.brandId]
  );
  const slotTotal = activeSlots.length || STORYBOARD_SLOT_COUNT;
  const currentProductLock = getProjectProductLock(projectForm);
  const productLockChanged = currentProject ? !isSameProductLock(currentProject, projectForm) : false;
  const hasReferenceImage = Boolean(projectForm.sourceImageName || projectForm.sourceImagePreview);
  const hasLedgerDraft = ledgerFacts.length > 0;
  const hasStoryboardBriefs = isStoryboardPlanReady(storyboardBriefs, projectForm);
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
      helper: hasStoryboardBriefs ? `${slotTotal} 个图片方向已生成，下一步可以生成候选图。` : 'AI 会按产品和卖点选择图片角色，不再强行套固定模板。',
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
  const visibleWorkflowGuideSteps = workflowGuideSteps.filter((step) => allowedSections.includes(step.target));
  useEffect(() => {
    if (!allowedSections.includes(activeSection)) setActiveSection('projects');
  }, [activeSection, session.user.role]);
  useEffect(() => {
    if (!activeSlots.some((slot) => slot.id === selectedSlot.id) && activeSlots[0]) {
      setSelectedSlot(activeSlots[0]);
    }
  }, [activeSlots, selectedSlot.id]);
  const syncProjectToTeam = async (project, { throwOnError = false } = {}) => {
    if (!project?.cloud?.remote) return;
    try {
      const projectWithAssets = await uploadInlineProjectReferences(project);
      const remote = await updateTeamProject(project.id, makeTeamProjectPayload(projectWithAssets));
      if (projectWithAssets !== project) {
        setProjects((currentProjects) => {
          const synced = currentProjects.map((item) => item.id === project.id ? projectWithAssets : item);
          storeProjects(synced);
          return synced;
        });
        if (activeProjectId === project.id) setProjectForm(projectWithAssets.form);
      }
      if (remote?.brandSnapshot) {
        setProjects((currentProjects) => {
          const synced = currentProjects.map((item) => (
            item.id === project.id ? { ...item, brandSnapshot: remote.brandSnapshot } : item
          ));
          storeProjects(synced);
          return synced;
        });
      }
    } catch (error) {
      appLogger.error('team.project.sync_failed', error, { projectId: project.id, step: activeSection });
      setSaveStatus('已保存在本机，但团队同步暂时失败。');
      if (throwOnError) throw error;
    }
  };
  const persistProjects = (nextProjects, remoteProjectId = activeProjectId, syncOptions = {}) => {
    const normalizedProjects = nextProjects.map((project) => {
      const previous = projects.find((item) => item.id === project.id);
      return {
        ...project,
        cloud: project.cloud || previous?.cloud,
        brandSnapshot: project.brandSnapshot || previous?.brandSnapshot || null
      };
    });
    setProjects(normalizedProjects);
    storeProjects(normalizedProjects);
    const remoteProject = normalizedProjects.find((project) => project.id === remoteProjectId);
    return remoteProject?.cloud?.remote ? syncProjectToTeam(remoteProject, syncOptions) : Promise.resolve();
  };
  const updateBrandLibrary = (nextBrands) => {
    const normalized = normalizeBrandLibrary(nextBrands);
    setBrandLibrary(normalized);
    storeBrands(normalized);
    appLogger.log('audit.brand_library.updated', {
      brandCount: normalized.length,
      brandNames: normalized.map((brand) => brand.name)
    }, { projectId: activeProjectId, step: 'brands' });
    setSaveStatus('品牌规则有未保存修改。');
  };
  const saveBrandProfile = async (brand) => {
    let brandForSave = brand;
    if (isInlineImageSource(brand.logoPreview)) {
      const asset = await uploadTeamBrandLogo({
        brandId: brand.id,
        assetId: Date.now(),
        imageDataUrl: brand.logoPreview
      });
      brandForSave = { ...brand, logoStorageKey: asset.storageKey, logoPreview: '' };
    }
    const uploadedExampleImages = [];
    for (const [index, image] of normalizeBrandExampleImages(brandForSave.exampleImages).entries()) {
      if (isInlineImageSource(image.preview)) {
        const asset = await uploadTeamBrandExample({
          brandId: brand.id,
          assetId: `${Date.now()}-${index + 1}`,
          imageDataUrl: image.preview
        });
        uploadedExampleImages.push({ ...image, storageKey: asset.storageKey, preview: '' });
      } else {
        uploadedExampleImages.push({ ...image, preview: '' });
      }
    }
    brandForSave = { ...brandForSave, exampleImages: uploadedExampleImages };
    const saved = brandForSave.version
      ? await updateTeamBrand(brandForSave)
      : await createTeamBrand(brandForSave);
    if (brandForSave.logoStorageKey && !saved.logoPreview) saved.logoPreview = brand.logoPreview;
    saved.exampleImages = normalizeBrandExampleImages(saved.exampleImages).map((image) => ({
      ...image,
      preview: brand.exampleImages?.find((candidate) => candidate.id === image.id)?.preview || image.preview
    }));
    const normalizedSaved = normalizeBrandProfile(saved);
    const normalized = normalizeBrandLibrary([
      ...brandLibrary.filter((item) => item.id !== brand.id && item.id !== normalizedSaved.id),
      normalizedSaved
    ]);
    setBrandLibrary(normalized);
    storeBrands(normalized);
    appLogger.log('audit.brand_profile.saved', {
      brandId: normalizedSaved.id,
      brandName: normalizedSaved.name,
      brandVersion: normalizedSaved.version
    }, { projectId: activeProjectId, step: 'brands' });
    setSaveStatus(`${normalizedSaved.name} 品牌规则已保存为 v${normalizedSaved.version}。`);
    return normalizedSaved;
  };
  const removeBrandProfile = async (brand) => {
    if (brand.version) await deleteTeamBrand(brand.id);
    appLogger.log('audit.brand_profile.deleted', {
      brandId: brand.id,
      brandName: brand.name
    }, { projectId: activeProjectId, step: 'brands' });
    setSaveStatus(`${brand.name} 已从品牌库删除。`);
  };
  const assignProjectMember = async (projectId, assignmentRole, assignee) => {
    await assignTeamProject(projectId, { userId: assignee?.id || '', assignmentRole });
    const nextProjects = projects.map((project) => {
      if (project.id !== projectId) return project;
      const existingAssignments = project.cloud?.assignments || [];
      const nextAssignments = existingAssignments.filter((assignment) => assignment.role !== assignmentRole);
      if (assignee) {
        nextAssignments.push({ userId: assignee.id, role: assignmentRole, name: assignee.displayName });
      }
      return {
        ...project,
        cloud: {
          ...project.cloud,
          assignments: nextAssignments
        }
      };
    });
    setProjects(nextProjects);
    storeProjects(nextProjects);
    appLogger.log('team.project.assigned', {
      assignmentRole,
      assigneeId: assignee?.id || '',
      assigneeName: assignee?.displayName || ''
    }, { projectId, step: 'team' });
    setSaveStatus('项目负责人已更新。');
  };
  const upgradeCurrentProjectBrandSnapshot = async () => {
    if (!currentProject?.cloud?.remote || !projectBrandVersionState.canUpgrade || isUpgradingBrandSnapshot) return;
    const confirmed = window.confirm(
      `将项目品牌从 v${projectBrandVersionState.lockedVersion} 升级到 v${projectBrandVersionState.latestVersion}？\n\n`
      + '产品资料、参考图和卖点会保留；旧图片方案、候选图、审核结果和导出选择将失效。'
    );
    if (!confirmed) return;
    setIsUpgradingBrandSnapshot(true);
    setSaveStatus('正在升级项目品牌版本...');
    try {
      const remote = await upgradeTeamProjectBrandSnapshot(currentProject.id);
      const nextForm = { ...projectForm, storyboardSlotCountOverride: 0 };
      const nextProject = {
        ...currentProject,
        form: nextForm,
        storyboardBriefs: [],
        reviewDecisions: [],
        generationRuns: [],
        promptOverrides: {},
        exportSelections: {},
        brandSnapshot: remote.brandSnapshot,
        cloud: { ...currentProject.cloud, status: remote.status || 'content' },
        updatedAt: new Date().toISOString()
      };
      const nextProjects = projects.map((project) => project.id === currentProject.id ? nextProject : project);
      setProjects(nextProjects);
      storeProjects(nextProjects);
      setProjectForm(nextForm);
      setStoryboardBriefs([]);
      setReviewDecisions([]);
      setGenerationRuns([]);
      setPromptOverrides({});
      setExportSelections({});
      setSelectedSlot(slots[0]);
      appLogger.log('audit.project.brand_snapshot_upgraded', {
        brandId: remote.brandSnapshot?.brandId,
        fromVersion: remote.fromVersion,
        toVersion: remote.toVersion,
        cancelledTaskCount: remote.cancelledTaskCount || 0
      }, { projectId: currentProject.id, step: 'project' });
      setSaveStatus(`品牌快照已升级到 v${remote.toVersion}。旧方案和候选图已失效，请重新规划图片方案。`);
    } catch (error) {
      appLogger.error('team.project.brand_snapshot_upgrade_failed', error, { projectId: currentProject.id, step: 'project' });
      setSaveStatus(error instanceof Error ? error.message : '品牌版本升级失败，请稍后重试。');
    } finally {
      setIsUpgradingBrandSnapshot(false);
    }
  };
  const changePlanOutputPreset = (presetId) => {
    const nextPreset = getOutputPresetById(presetId);
    if (nextPreset.id === getProjectPlanOutputPresetId(projectForm)) return;
    const nextForm = {
      ...projectForm,
      planOutputPresetId: nextPreset.id,
      storyboardSlotCountOverride: 0
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
    appLogger.log('audit.project.output_preset_changed', {
      outputPresetId: nextPreset.id,
      outputPresetLabel: nextPreset.label
    }, { projectId: nextProjectId, step: 'storyboard' });
    setSaveStatus(`已切换为 ${nextPreset.label} 方案类型。旧方案和候选图已清空，请重新生成图片方案。`);
    navigateTo('storyboard', 'storyboard');
  };
  const commitStoryboardStructure = (briefs, selectedIndex, actionLabel) => {
    const nextBriefs = normalizeStoryboardSequence(briefs);
    const nextForm = {
      ...projectForm,
      storyboardSlotCountOverride: nextBriefs.length
    };
    const nextDecisions = createReviewDecisions(nextBriefs);
    const nextProject = createProjectRecord(nextForm, ledgerFacts, activeProjectId, nextBriefs, nextDecisions, [], {}, {});
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    setProjectForm(nextForm);
    setStoryboardBriefs(nextBriefs);
    setReviewDecisions(nextDecisions);
    setGenerationRuns([]);
    setPromptOverrides({});
    setExportSelections({});
    setSelectedSlot(getSlotFromBrief(nextBriefs[Math.max(0, Math.min(selectedIndex, nextBriefs.length - 1))]));
    persistProjects(nextProjects);
    appLogger.log('audit.storyboard.structure_changed', {
      action: actionLabel,
      slotCount: nextBriefs.length,
      outputPresetId: getProjectPlanOutputPresetId(nextForm)
    }, { projectId: activeProjectId, step: 'storyboard' });
    setSaveStatus(`${actionLabel}。图槽结构已保存；为避免错配，旧候选图和审核状态已清空。`);
  };
  const addStoryboardSlot = () => {
    if (!storyboardBriefs.length) return;
    const isAPlus = isAPlusPlan(projectForm);
    const maximum = isAPlus ? APLUS_MAX_MODULE_COUNT : MAIN_MAX_SLOT_COUNT;
    if (storyboardBriefs.length >= maximum) {
      setSaveStatus(`当前图片类型最多保留 ${maximum} 个图槽。`);
      return;
    }
    const nextBrief = createOptionalStoryboardBrief({
      id: storyboardBriefs.length + 1,
      form: projectForm,
      ledgerFacts,
      existingBriefs: storyboardBriefs,
      brands: projectBrandLibrary
    });
    commitStoryboardStructure([...storyboardBriefs, nextBrief], storyboardBriefs.length, '已添加可选图槽');
  };
  const removeStoryboardSlot = (slotId) => {
    const currentIndex = storyboardBriefs.findIndex((brief) => Number(brief.id) === Number(slotId));
    if (currentIndex < 0) return;
    const isAPlus = isAPlusPlan(projectForm);
    const minimum = isAPlus ? APLUS_MIN_MODULE_COUNT : MAIN_MIN_SLOT_COUNT;
    if ((!isAPlus && currentIndex === 0) || storyboardBriefs.length <= minimum) {
      setSaveStatus(!isAPlus && currentIndex === 0 ? '白底主图是主图套图的必需图槽，不能删除。' : `当前图片类型至少需要 ${minimum} 个图槽。`);
      return;
    }
    const nextBriefs = storyboardBriefs.filter((_, index) => index !== currentIndex);
    commitStoryboardStructure(nextBriefs, Math.min(currentIndex, nextBriefs.length - 1), '已删除可选图槽');
  };
  const moveStoryboardSlot = (slotId, direction) => {
    const currentIndex = storyboardBriefs.findIndex((brief) => Number(brief.id) === Number(slotId));
    if (currentIndex < 0) return;
    const isAPlus = isAPlusPlan(projectForm);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= storyboardBriefs.length) return;
    if (!isAPlus && (currentIndex === 0 || targetIndex === 0)) {
      setSaveStatus('白底主图必须保持在第 1 个图槽。');
      return;
    }
    const nextBriefs = [...storyboardBriefs];
    [nextBriefs[currentIndex], nextBriefs[targetIndex]] = [nextBriefs[targetIndex], nextBriefs[currentIndex]];
    commitStoryboardStructure(nextBriefs, targetIndex, '已调整图槽顺序');
  };
  const navigateTo = (section, anchor) => {
    if (!allowedSections.includes(section)) {
      setSaveStatus('当前身份不具备进入该工作区的权限。');
      return;
    }
    appLogger.log('behavior.navigation.requested', {
      from: activeSection,
      to: section,
      anchor
    }, { projectId: activeProjectId, step: section });
    setActiveSection(section);
    setFocusRequest({ section, anchor, id: Date.now() });
  };
  const saveCurrentProject = async () => {
    let nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, promptOverrides, exportSelections);
    const currentCloud = currentProject?.cloud;
    if (!currentCloud?.remote) {
      if (!['designer', 'admin'].includes(session.user.role)) {
        setSaveStatus('当前身份只能处理已分配项目。');
        return;
      }
      try {
        const remote = await createTeamProject(makeTeamProjectPayload(nextProject));
        nextProject = {
          ...nextProject,
          id: remote.id,
          brandSnapshot: remote.brandSnapshot || null,
          cloud: { remote: true, status: remote.status || 'draft', assignments: [], createdBy: session.user }
        };
      } catch (error) {
        appLogger.error('team.project.create_failed', error);
        setSaveStatus(error instanceof Error ? error.message : '团队项目创建失败，请稍后重试。');
        return;
      }
    } else {
      nextProject = { ...nextProject, cloud: currentCloud };
    }
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    await persistProjects(nextProjects, nextProject.id);
    setActiveProjectId(nextProject.id);
    appLogger.log('audit.project.saved', {
      projectName: nextProject.form?.projectName || nextProject.form?.productName || nextProject.form?.sku || '',
      ledgerCount: nextProject.ledgerFacts?.length || 0,
      storyboardCount: nextProject.storyboardBriefs?.length || 0,
      generationRunCount: nextProject.generationRuns?.length || 0
    }, { projectId: nextProject.id, step: activeSection });
    setSaveStatus(`已同步保存 ${formatProjectTime(nextProject.updatedAt)}`);
  };
  const selectProject = (projectId, destination = 'project') => {
    const selectedProject = projects.find((project) => project.id === projectId);
    if (!selectedProject) return;
    if (session.user.role === 'operator' && !isOperatorVisibleProject(selectedProject)) {
      setSaveStatus('设计尚未提交整套图片，当前项目不能进入运营审核。');
      setActiveSection('projects');
      return;
    }
    setActiveProjectId(projectId);
    setProjectForm({ ...blankProjectForm, ...selectedProject.form });
    setLedgerFacts(selectedProject.ledgerFacts);
    setStoryboardBriefs(selectedProject.storyboardBriefs || []);
    setReviewDecisions(selectedProject.reviewDecisions || createReviewDecisions(selectedProject.storyboardBriefs || []));
    setGenerationRuns(normalizeGenerationRuns(selectedProject.generationRuns));
    setPromptOverrides(selectedProject.promptOverrides || {});
    setExportSelections(selectedProject.exportSelections || {});
    setSaveStatus('');
    appLogger.log('audit.project.opened', {
      projectName: selectedProject.form?.projectName || selectedProject.form?.productName || selectedProject.form?.sku || '',
      ledgerCount: selectedProject.ledgerFacts?.length || 0,
      storyboardCount: selectedProject.storyboardBriefs?.length || 0,
      generationRunCount: selectedProject.generationRuns?.length || 0
    }, { projectId, step: 'project' });
    setActiveSection(allowedSections.includes(destination) ? destination : 'projects');
  };
  const createNewProject = async () => {
    if (!['designer', 'admin'].includes(session.user.role)) {
      setSaveStatus('当前身份不能创建项目。');
      return;
    }
    const nextProject = createProjectRecord(blankProjectForm, [], createProjectId());
    let remote;
    try {
      remote = await createTeamProject(makeTeamProjectPayload(nextProject));
    } catch (error) {
      appLogger.error('team.project.create_failed', error);
      setSaveStatus(error instanceof Error ? error.message : '团队项目创建失败，请稍后重试。');
      return;
    }
    const cloudProject = {
      ...nextProject,
      id: remote.id,
      brandSnapshot: remote.brandSnapshot || null,
      cloud: { remote: true, status: remote.status || 'draft', assignments: [], createdBy: session.user }
    };
    const nextProjects = [cloudProject, ...projects];
    persistProjects(nextProjects, cloudProject.id);
    setActiveProjectId(cloudProject.id);
    setProjectForm(blankProjectForm);
    setLedgerFacts([]);
    setStoryboardBriefs([]);
    setReviewDecisions([]);
    setGenerationRuns([]);
    setPromptOverrides({});
    setExportSelections({});
    setSaveStatus('已创建新草稿');
    appLogger.log('audit.project.created', {}, { projectId: nextProject.id, step: 'project' });
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
    appLogger.log('audit.project.deleted', {
      deletedProjectId: projectId,
      remainingProjectCount: remainingProjects.length
    }, { projectId: activeProjectId, step: 'project' });
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
    appLogger.log('audit.ledger.generated', {
      intakeMode,
      claimCount: draft.length,
      lockMatches,
      preservedGenerationRunCount: preservedGenerationRuns.length
    }, { projectId: nextProject.id, step: 'ledger' });
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
    appLogger.log('audit.ledger.claim_edited', {
      index,
      claim: nextClaim,
      state: nextLedgerFacts[index]?.state || '',
      owner: nextLedgerFacts[index]?.owner || ''
    }, { projectId: activeProjectId, step: 'ledger' });
    setSaveStatus('卖点已更新，后续生成方案会使用最新卖点。');
  };
  const addLedgerFact = (claim) => {
    const nextClaim = claim.trim();
    if (!nextClaim) return;
    const nextLedgerFacts = [
      ...ledgerFacts,
      {
        claim: nextClaim,
        ...classifyClaim(nextClaim, 'manual'),
        source: 'manual-add'
      }
    ];
    setLedgerFacts(nextLedgerFacts);
    const nextProject = createProjectRecord(projectForm, nextLedgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    appLogger.log('audit.ledger.claim_added', {
      claim: nextClaim,
      state: nextLedgerFacts[nextLedgerFacts.length - 1]?.state || ''
    }, { projectId: activeProjectId, step: 'ledger' });
    setSaveStatus('卖点已添加，图片方案会使用最新内容。');
  };
  const deleteLedgerFact = (index) => {
    if (index < 0 || index >= ledgerFacts.length) return;
    const removed = ledgerFacts[index];
    const nextLedgerFacts = ledgerFacts.filter((_, currentIndex) => currentIndex !== index);
    setLedgerFacts(nextLedgerFacts);
    const nextProject = createProjectRecord(projectForm, nextLedgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    appLogger.log('audit.ledger.claim_deleted', {
      index,
      claim: removed?.claim || ''
    }, { projectId: activeProjectId, step: 'ledger' });
    setSaveStatus('卖点已删除，后续图片方案不会再使用该内容。');
  };
  const mergeLedgerFacts = (indices = []) => {
    const selected = [...new Set(indices)]
      .filter((index) => index >= 0 && index < ledgerFacts.length)
      .sort((a, b) => a - b);
    if (selected.length < 2) return;
    const mergedClaim = selected.map((index) => ledgerFacts[index]?.claim).filter(Boolean).join('；');
    const mergedFact = {
      claim: mergedClaim,
      ...classifyClaim(mergedClaim, 'manual'),
      source: 'manual-merge'
    };
    const insertAt = selected[0];
    const selectedSet = new Set(selected);
    const nextLedgerFacts = [];
    ledgerFacts.forEach((fact, index) => {
      if (index === insertAt) nextLedgerFacts.push(mergedFact);
      if (!selectedSet.has(index)) nextLedgerFacts.push(fact);
    });
    setLedgerFacts(nextLedgerFacts);
    const nextProject = createProjectRecord(projectForm, nextLedgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    appLogger.log('audit.ledger.claims_merged', {
      indices: selected,
      mergedClaim,
      state: mergedFact.state
    }, { projectId: activeProjectId, step: 'ledger' });
    setSaveStatus(`已合并 ${selected.length} 条卖点，可继续编辑合并后的内容。`);
  };
  const generateStoryboardBriefs = async () => {
    if (isPlanningStoryboard || regeneratingSlotId) return;
    if (!ledgerFacts.length) {
      appLogger.log('pipeline.storyboard.blocked', {
        reason: 'missing_ledger'
      }, { level: 'warn', projectId: activeProjectId, step: 'storyboard' });
      setSaveStatus('请先填写卖点并生成卖点草稿');
      navigateTo('project', 'claims');
      return;
    }
    if (currentProject && !isSameContentLanguage(currentProject, projectForm)) {
      setSaveStatus('目标站点或图片文案语言已更改。请先保存项目，再重新生成图片方案。');
      navigateTo('project', 'project-form');
      return;
    }
    if (getProjectBrandId(projectForm, projectBrandLibrary) !== 'none' && !projectFrozenBrand) {
      setSaveStatus('当前项目缺少可验证的品牌快照，请先保存项目资料后再生成图片方案。');
      navigateTo('project', 'project-form');
      return;
    }
    const referenceReadiness = getReferenceReadiness(projectForm);
    if (!referenceReadiness.ready) {
      appLogger.log('pipeline.storyboard.blocked', {
        reason: 'reference_quality_gate',
        blockers: referenceReadiness.blockers
      }, { level: 'warn', projectId: activeProjectId, step: 'storyboard' });
      setSaveStatus(`参考图暂不能用于规划：${referenceReadiness.blockers.join('；')}`);
      navigateTo('project', 'image-upload');
      return;
    }
    const refreshedLedgerFacts = refreshMachineDraftLedger(ledgerFacts, 'sku');
    const planningForm = {
      ...projectForm,
      planOutputPresetId: getProjectPlanOutputPresetId(projectForm)
    };
    planningStartedAtRef.current = Date.now();
    setIsPlanningStoryboard(true);
    setSaveStatus(`正在根据产品图、卖点和品牌生成 ${getProjectPlanOutputPreset(planningForm).label} 方案...`);
    const startedAt = performance.now();
    let planProvider = 'ai';
    appLogger.log('pipeline.storyboard.started', {
      outputPresetId: planningForm.planOutputPresetId,
      ledgerCount: refreshedLedgerFacts.length,
      brandId: getProjectBrandId(planningForm, projectBrandLibrary),
      brandVersion: currentProject?.brandSnapshot?.brandVersion || 0
    }, { projectId: activeProjectId, step: 'storyboard' });
    try {
      let briefs;
      let plannerMessage = 'AI 已根据产品图、卖点和品牌生成图片方案';
      const lockMatches = currentProject ? isSameProductLock(currentProject, projectForm) : true;
      const languageMatches = currentProject ? isSameContentLanguage(currentProject, planningForm) : true;
      try {
        const aiPlan = await planStoryboardWithApi(activeProjectId, planningForm, refreshedLedgerFacts, projectBrandLibrary);
        briefs = aiPlan.briefs;
        plannerMessage = `AI 已生成 ${getProjectPlanOutputPreset(planningForm).label} 方案：${aiPlan.productType || '已识别产品类型'} · ${aiPlan.model || 'planner'}`;
      } catch (error) {
        planProvider = 'local_fallback';
        appLogger.error('pipeline.storyboard.ai_failed', error, {
          projectId: activeProjectId,
          step: 'storyboard'
        });
        briefs = buildStoryboardBriefs(refreshedLedgerFacts, planningForm, projectBrandLibrary);
        plannerMessage = `AI 方案暂不可用，已使用本地兜底方案。${error instanceof Error ? error.message : ''}`.trim();
      }
      const decisions = createReviewDecisions(briefs);
      const preservedGenerationRuns = lockMatches && languageMatches ? normalizeGenerationRuns(generationRuns) : [];
      const preservedPromptOverrides = lockMatches && languageMatches ? { ...promptOverrides } : {};
      const preservedExportSelections = lockMatches && languageMatches ? { ...exportSelections } : {};
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
      appLogger.log('pipeline.storyboard.completed', {
        provider: planProvider,
        briefCount: briefs.length,
        outputPresetId: planningForm.planOutputPresetId,
        lockMatches,
        languageMatches,
        durationMs: Math.round(performance.now() - startedAt)
      }, { projectId: nextProject.id, step: 'storyboard' });
      setSaveStatus(lockMatches && languageMatches
        ? `${plannerMessage}，并已保留 ${preservedGenerationRuns.length} 条生图验证记录。下一步可以进入生图任务`
        : `${plannerMessage}。检测到产品锁或图片语言变化，旧生图记录已清空，避免混入其他产品或语言。`);
      navigateTo('storyboard', 'storyboard');
    } catch (error) {
      appLogger.error('pipeline.storyboard.failed', error, {
        projectId: activeProjectId,
        step: 'storyboard',
        durationMs: Math.round(performance.now() - startedAt)
      });
      throw error;
    } finally {
      setIsPlanningStoryboard(false);
      planningStartedAtRef.current = 0;
    }
  };
  const regenerateStoryboardSlot = async (slotId, role = activeRole) => {
    if (isPlanningStoryboard || regeneratingSlotId) return;
    if (!ledgerFacts.length) {
      setSaveStatus('请先填写卖点并生成卖点草稿');
      navigateTo('project', 'claims');
      return;
    }
    if (currentProject && !isSameContentLanguage(currentProject, projectForm)) {
      setSaveStatus('目标站点或图片文案语言已更改。请先保存项目，再重新生成图片方案。');
      navigateTo('project', 'project-form');
      return;
    }
    if (getProjectBrandId(projectForm, projectBrandLibrary) !== 'none' && !projectFrozenBrand) {
      setSaveStatus('当前项目缺少可验证的品牌快照，请先保存项目资料后再重生成方案。');
      navigateTo('project', 'project-form');
      return;
    }
    const referenceReadiness = getReferenceReadiness(projectForm);
    if (!referenceReadiness.ready) {
      setSaveStatus(`参考图暂不能用于规划：${referenceReadiness.blockers.join('；')}`);
      navigateTo('project', 'image-upload');
      return;
    }

    const numericSlotId = Number(slotId);
    const refreshedLedgerFacts = refreshMachineDraftLedger(ledgerFacts, 'sku');
    setRegeneratingSlotId(numericSlotId);
    setSaveStatus(`正在重生成第 ${String(numericSlotId).padStart(2, '0')} 张图方案...`);
    const startedAt = performance.now();
    let planProvider = 'ai';
    appLogger.log('pipeline.storyboard.slot_regenerate_started', {
      slotId: numericSlotId,
      role
    }, { projectId: activeProjectId, step: 'storyboard' });
    try {
      let nextBrief;
      let plannerMessage = 'AI 已重生成当前图槽方案';
      try {
        const aiPlan = await planStoryboardWithApi(activeProjectId, projectForm, refreshedLedgerFacts, projectBrandLibrary);
        const plannedBrief = aiPlan.briefs.find((brief) => Number(brief.id) === numericSlotId)
          || aiPlan.briefs[Math.min(numericSlotId - 1, aiPlan.briefs.length - 1)];
        nextBrief = plannedBrief ? { ...plannedBrief, id: numericSlotId } : null;
        plannerMessage = `AI 已重生成第 ${String(numericSlotId).padStart(2, '0')} 张方案：${aiPlan.model || 'planner'}`;
      } catch (error) {
        planProvider = 'local_fallback';
        appLogger.error('pipeline.storyboard.slot_ai_failed', error, {
          projectId: activeProjectId,
          step: 'storyboard',
          slotId: numericSlotId
        });
        const fallbackBriefs = buildStoryboardBriefs(refreshedLedgerFacts, projectForm, projectBrandLibrary);
        const fallbackBrief = fallbackBriefs.find((brief) => Number(brief.id) === numericSlotId)
          || fallbackBriefs[Math.min(numericSlotId - 1, fallbackBriefs.length - 1)];
        nextBrief = fallbackBrief ? { ...fallbackBrief, id: numericSlotId } : null;
        plannerMessage = `AI 局部方案暂不可用，已用本地兜底重生成当前图槽。${error instanceof Error ? error.message : ''}`.trim();
      }

      if (!nextBrief) {
        throw new Error('没有找到当前图槽的新方案。');
      }

      const previousBriefs = storyboardBriefs.length
        ? storyboardBriefs
        : buildStoryboardBriefs(refreshedLedgerFacts, projectForm, projectBrandLibrary);
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
      appLogger.log('pipeline.storyboard.slot_regenerate_completed', {
        slotId: numericSlotId,
        provider: planProvider,
        durationMs: Math.round(performance.now() - startedAt)
      }, { projectId: activeProjectId, step: 'storyboard' });
      setSaveStatus(`${plannerMessage}。其他图槽和已有生图记录已保留。`);
      navigateTo('storyboard', 'storyboard');
    } catch (error) {
      appLogger.error('pipeline.storyboard.slot_regenerate_failed', error, {
        projectId: activeProjectId,
        step: 'storyboard',
        slotId: numericSlotId,
        durationMs: Math.round(performance.now() - startedAt)
      });
      setSaveStatus(error instanceof Error ? `当前图槽重生成失败：${error.message}` : '当前图槽重生成失败，请稍后再试。');
    } finally {
      setRegeneratingSlotId(null);
    }
  };
  const updateReviewDecision = (slotId, role, status, context = 'review') => {
    const slot = activeSlots.find((item) => item.id === slotId) || getFallbackSlot(slotId);
    const brief = storyboardBriefs.find((item) => item.id === slotId);
    const normalized = reviewDecisions.length ? reviewDecisions : createReviewDecisions(storyboardBriefs);
    const nextDecisions = normalized.map((decision) => (
      decision.slotId === slotId ? updateDecisionByRole(decision, slot, brief, role, status, context) : decision
    ));
    setReviewDecisions(nextDecisions);
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, nextDecisions, generationRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    appLogger.log('audit.review.decision_changed', {
      slotId,
      role,
      status,
      context,
      slotTitle: slot?.title || ''
    }, { projectId: activeProjectId, step: 'review' });
    setSaveStatus(context === 'plan'
      ? `${slot?.title || '图槽'} 的方案方向已更新。`
      : `${slot?.title || '图槽'} 已由${reviewerRoles[role]?.label || '审核人'}标记为${reviewStatusMeta[status]?.text || '待审核'}，已自动保存`);
  };
  const saveGenerationRun = (run) => {
    const nextRuns = normalizeGenerationRuns([stripTransientGenerationRun(run), ...generationRuns]).slice(0, QUALITY_MAX_STORED_RUNS);
    setGenerationRuns(nextRuns);
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, nextRuns, promptOverrides, exportSelections);
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    persistProjects(nextProjects);
    appLogger.log('pipeline.generation.run_saved', {
      runId: run.id,
      slotId: run.slotId,
      slotTitle: run.slotTitle,
      model: run.model,
      requestId: run.requestId,
      aiReviewVerdict: run.aiReview?.verdict || '',
      verdict: run.verdict,
      outputPresetId: run.outputPresetId,
      durationMs: run.durationMs || 0
    }, { projectId: activeProjectId, step: 'generation', traceId: run.id });
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
    appLogger.log('pipeline.generation.batch_saved', {
      runCount: normalizedRuns.length,
      slotIds: normalizedRuns.map((run) => run.slotId),
      aiReviewVerdicts: normalizedRuns.map((run) => run.aiReview?.verdict || '')
    }, { projectId: activeProjectId, step: 'generation' });
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
    appLogger.log('audit.generation.run_updated', {
      runId,
      patchKeys: Object.keys(patch || {}),
      verdict: patch?.verdict || ''
    }, { projectId: activeProjectId, step: 'generation', traceId: runId });
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
    appLogger.log('audit.prompt_override.updated', {
      slotId,
      hasOverride: Boolean(value)
    }, { projectId: activeProjectId, step: 'generation' });
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
    appLogger.log('audit.export.selection_changed', {
      slotId,
      runId,
      slotTitle: slot?.title || ''
    }, { projectId: activeProjectId, step: 'export', traceId: runId || '' });
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
    if (session.user.role === 'designer') {
      navigateTo('handoff', 'handoff');
      return;
    }
    setActiveSection('review');
    navigateTo('review', 'review');
  };
  const submitForOpsReview = async () => {
    if (isSubmittingReview) return;
    const previousProjects = projects;
    const nextProject = createProjectRecord(projectForm, ledgerFacts, activeProjectId, storyboardBriefs, reviewDecisions, generationRuns, promptOverrides, exportSelections);
    nextProject.cloud = { ...(currentProject?.cloud || {}), status: 'review' };
    const nextProjects = projects.some((project) => project.id === activeProjectId)
      ? projects.map((project) => (project.id === activeProjectId ? nextProject : project))
      : [nextProject, ...projects];
    setIsSubmittingReview(true);
    setSaveStatus('正在提交整套图片给运营审核...');
    try {
      await persistProjects(nextProjects, nextProject.id, { throwOnError: true });
      appLogger.log('workflow.review.submitted', {
        selectedRunCount: activeSlots.filter((slot) => getBestRunForSlot(slot.id, generationRuns)?.verdict === 'usable').length
      }, { projectId: activeProjectId, step: 'handoff' });
      setSaveStatus('已提交运营审核。运营负责人现在可以在自己的审核队列中看到该项目。');
      setActiveSection('projects');
    } catch (error) {
      setProjects(previousProjects);
      storeProjects(previousProjects);
      setSaveStatus(error instanceof Error ? `提交失败：${error.message}` : '提交失败，请稍后重试。');
    } finally {
      setIsSubmittingReview(false);
    }
  };
  const trashProjectFromCenter = async (project) => {
    const title = getProjectTitle(project.form);
    if (!window.confirm(`将「${title}」移入回收站？项目会保留 30 天。`)) return;
    await trashTeamProject(project.id);
    const nextProjects = projects.filter((item) => item.id !== project.id);
    setProjects(nextProjects);
    storeProjects(nextProjects);
    if (activeProjectId === project.id) {
      const nextActive = nextProjects[0];
      setActiveProjectId(nextActive?.id || '');
      setProjectForm(nextActive?.form || blankProjectForm);
      setLedgerFacts(nextActive?.ledgerFacts || []);
      setStoryboardBriefs(nextActive?.storyboardBriefs || []);
      setReviewDecisions(nextActive?.reviewDecisions || []);
      setGenerationRuns(normalizeGenerationRuns(nextActive?.generationRuns || []));
      setPromptOverrides(nextActive?.promptOverrides || {});
      setExportSelections(nextActive?.exportSelections || {});
    }
    setSaveStatus(`「${title}」已移入回收站。`);
  };
  const restoreProjectFromTrash = async (project) => {
    await restoreTrashedTeamProject(project.id);
    const remoteProjects = await listTeamProjects();
    const restoredProjects = await Promise.all(remoteProjects
      .map(mapTeamProjectToWorkspaceProject)
      .map(refreshWorkspaceProjectAssetUrls));
    setProjects(restoredProjects);
    storeProjects(restoredProjects);
    setSaveStatus(`「${project.projectName}」已恢复。`);
  };
  const projectStageItems = navItems.filter((item) => (
    session.user.role === 'designer'
      ? ['project', 'ledger', 'storyboard', 'generation'].includes(item.id)
      : session.user.role === 'operator'
        ? ['review'].includes(item.id)
        : ['project', 'ledger', 'storyboard', 'generation', 'review', 'export'].includes(item.id)
  ));
  const isProjectWorkspace = projectStageItems.some((item) => item.id === activeSection) || activeSection === 'handoff';
  const shouldShowSimpleHeader = !isProjectWorkspace && activeSection !== 'projects' && session.user.role !== 'admin';
  const roleLabel = session.user.role === 'designer' ? '设计' : session.user.role === 'operator' ? '运营' : '管理员';

  const pageMap = {
    system: <SystemOverviewPage projects={projects} onNavigate={(section) => navigateTo(section, section)} />,
    projects: (
      <ProjectCenterPage
        projects={projects}
        currentUser={session.user}
        onOpenProject={selectProject}
        onCreateProject={createNewProject}
        onTrashProject={trashProjectFromCenter}
        onRestoreProject={restoreProjectFromTrash}
        isLoading={isLoadingTeamProjects}
      />
    ),
    project: (
      <ProjectPage
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        brandLibrary={brandLibrary}
        productLockChanged={productLockChanged}
        onGenerateLedgerDraft={generateLedgerDraft}
        onSaveProject={saveCurrentProject}
        brandVersionState={projectBrandVersionState}
        onUpgradeBrandSnapshot={upgradeCurrentProjectBrandSnapshot}
        isUpgradingBrandSnapshot={isUpgradingBrandSnapshot}
        saveStatus={saveStatus}
        focusRequest={focusRequest}
      />
    ),
    brands: (
      <BrandLibraryPage
        brandLibrary={brandLibrary}
        brandLibraryStatus={brandLibraryStatus}
        onUpdateBrands={updateBrandLibrary}
        onSaveBrand={saveBrandProfile}
        onDeleteBrand={removeBrandProfile}
        userRole={session.user.role}
        focusRequest={focusRequest}
      />
    ),
    team: (
      <TeamManagementPage
        projects={projects.filter((project) => project.cloud?.remote)}
        onAssignProject={assignProjectMember}
        focusRequest={focusRequest}
      />
    ),
    'admin-release': <AdminReleasePage projects={projects} onOpenProject={selectProject} />,
    quality: (
      <QualityConsolePage
        activeProjectId={activeProjectId}
        projectForm={projectForm}
        projects={projects}
        generationRuns={generationRuns}
        selectedSlot={selectedSlot}
        promptOverrides={promptOverrides}
        onUpdatePromptOverride={updatePromptOverride}
        focusRequest={focusRequest}
      />
    ),
    ledger: (
      <LedgerPage
        projectForm={projectForm}
        brandLibrary={brandLibrary}
        ledgerFacts={ledgerFacts}
        onUpdateFact={updateLedgerFact}
        onAddFact={addLedgerFact}
        onDeleteFact={deleteLedgerFact}
        onMergeFacts={mergeLedgerFacts}
        onGoStoryboard={continueToStoryboard}
        focusRequest={focusRequest}
      />
    ),
    storyboard: (
      <StoryboardPlanPage
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        ledgerFacts={ledgerFacts}
        projectForm={projectForm}
        storyboardBriefs={storyboardBriefs}
        onChangePlanOutputPreset={changePlanOutputPreset}
        isPlanningStoryboard={isPlanningStoryboard}
        regeneratingSlotId={regeneratingSlotId}
        onGenerateStoryboardBriefs={generateStoryboardBriefs}
        onRegenerateStoryboardSlot={regenerateStoryboardSlot}
        onAddStoryboardSlot={addStoryboardSlot}
        onRemoveStoryboardSlot={removeStoryboardSlot}
        onMoveStoryboardSlot={moveStoryboardSlot}
        onGoGeneration={goGeneration}
        focusRequest={focusRequest}
      />
    ),
    generation: (
      <GenerationPage
        activeProjectId={activeProjectId}
        projectForm={projectForm}
        ledgerFacts={ledgerFacts}
        storyboardBriefs={storyboardBriefs}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        generationRuns={generationRuns}
        promptOverrides={promptOverrides}
        brandLibrary={projectBrandLibrary}
        brandSnapshot={currentProject?.brandSnapshot || null}
        brandLibraryStatus={brandLibraryStatus}
        brandVersionState={projectBrandVersionState}
        onUpgradeBrandSnapshot={upgradeCurrentProjectBrandSnapshot}
        onSaveGenerationRun={saveGenerationRun}
        onSaveGenerationRuns={saveGenerationRuns}
        onUpdateGenerationRun={updateGenerationRun}
        onUpdatePromptOverride={updatePromptOverride}
        onGoReview={goReview}
        focusRequest={focusRequest}
      />
    ),
    handoff: (
      <HandoffPage
        projectForm={projectForm}
        storyboardBriefs={storyboardBriefs}
        generationRuns={generationRuns}
        onBack={() => navigateTo('generation', 'generation')}
        onSubmit={submitForOpsReview}
        isSubmitting={isSubmittingReview}
      />
    ),
    review: (
      <ReviewPage
        ledgerFacts={ledgerFacts}
        storyboardBriefs={storyboardBriefs}
        reviewDecisions={reviewDecisions}
        generationRuns={generationRuns}
        onUpdateReview={updateReviewDecision}
        userRole={session.user.role}
        brandSnapshot={currentProject?.brandSnapshot || null}
        brandVersionState={projectBrandVersionState}
        onManageLedger={() => navigateTo('ledger', 'ledger')}
        focusRequest={focusRequest}
      />
    ),
    export: (
      <ExportPage
        activeProjectId={activeProjectId}
        projectForm={projectForm}
        storyboardBriefs={storyboardBriefs}
        reviewDecisions={reviewDecisions}
        generationRuns={generationRuns}
        exportSelections={exportSelections}
        onUpdateExportSelection={updateExportSelection}
        userRole={session.user.role}
        focusRequest={focusRequest}
      />
    )
  };

  const appShellClass = `app-shell role-${session.user.role}${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`;

  return (
    <main className={appShellClass}>
      <aside className="sidebar workspace-sidebar">
        <div className="sidebar-top-row">
          <div className="brand">
            <BrandLockup
              inverse
              className="sidebar-brand-lockup"
              source={isSidebarCollapsed ? '/vistamz-mark-white.svg' : '/vistamz-lockup-h-white.svg'}
            />
            <div className="sidebar-copy">
              <p>Amazon visual workflow</p>
            </div>
          </div>
          <button className="sidebar-collapse-button" type="button" onClick={() => setIsSidebarCollapsed((value) => !value)} aria-label={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}>
            <ChevronRight size={17} />
          </button>
        </div>

        <nav className="workspace-nav" aria-label="主导航">
          <p className="workspace-nav-label">工作区</p>
          {workspaceNavItems.map(({ id, label, icon: Icon }) => (
            <button className={activeSection === id ? 'workspace-nav-button active' : 'workspace-nav-button'} key={id} onClick={() => setActiveSection(id)} title={label}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom-group">
          {saveStatus && <div className="workspace-save-status workspace-sidebar-save-status" role="status">{saveStatus}</div>}
          {saveStatus && (
            <span className="sidebar-unread-badge" title={saveStatus} aria-label="1 条未读通知">
              <Bell size={17} aria-hidden="true" />
              <span className="sidebar-unread-count">1</span>
            </span>
          )}
          <div className="workspace-user">
            <div className="workspace-user-copy">
              <span>{session.user.displayName || '成员'}</span>
              <small>{roleLabel}</small>
            </div>
            <button className="sidebar-logout" type="button" onClick={onLogout} title="退出登录">退出登录</button>
          </div>
        </div>
      </aside>

      <section className="workspace workspace-shell">
        {isProjectWorkspace && (
          <header className="workspace-project-header">
            <button className="workspace-back-button" type="button" onClick={() => setActiveSection('projects')}><FolderOpen size={16} />项目中心</button>
            <div className="workspace-project-title">
              <small>{projectForm.sku || '当前项目'}</small>
              <strong>{getProjectTitle(projectForm)}</strong>
            </div>
            <nav className="workspace-stage-nav" aria-label="项目步骤">
              {projectStageItems.map((item) => {
                const index = navItems.findIndex((candidate) => candidate.id === item.id);
                const status = workflowGuideSteps[index]?.status;
                return (
                  <button key={item.id} className={`${activeSection === item.id ? 'active' : ''}${status === 'done' ? ' done' : ''}`} onClick={() => navigateTo(item.id, item.id)}>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </header>
        )}

        {shouldShowSimpleHeader && (
          <header className="workspace-simple-header">
            <div><p className="eyebrow">{currentNav.eyebrow}</p><h2>{currentNav.title}</h2><p>{currentNav.subtitle}</p></div>
          </header>
        )}

        {pageMap[activeSection]}
      </section>
    </main>
  );
}

function App() {
  return (
    <div className="vz-root">
      <TeamAccessGate>
        {({ session, onLogout }) => <WorkspaceApp session={session} onLogout={onLogout} />}
      </TeamAccessGate>
    </div>
  );
}

installGlobalErrorLogging();
createRoot(document.getElementById('root')).render(<App />);
