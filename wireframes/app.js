const pages = {
  projects: 'projectsTemplate',
  'new-project': 'newProjectTemplate',
  content: 'contentTemplate',
  generate: 'generateTemplate',
  'review-inbox': 'reviewInboxTemplate',
  'review-detail': 'reviewDetailTemplate',
  brands: 'brandsTemplate',
  system: 'systemTemplate'
};

const root = document.querySelector('#pageRoot');
const toast = document.querySelector('#toast');
const localEditModal = document.querySelector('#localEditModal');
const loginScreen = document.querySelector('#loginScreen');
const workspaceShell = document.querySelector('#workspaceShell');
const roleBadge = document.querySelector('#roleBadge');
let currentPage = 'projects';
let currentRole = null;

const allowedPagesByRole = {
  designer: ['projects', 'new-project', 'content', 'generate', 'brands'],
  operator: ['review-inbox', 'review-detail'],
  admin: ['system']
};

const defaultPageByRole = {
  designer: 'projects',
  operator: 'review-inbox',
  admin: 'system'
};

const roleLabels = {
  designer: '设计工作台',
  operator: '运营审核台',
  admin: '管理员'
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('visible'), 2200);
}

function startSession(role) {
  currentRole = role;
  document.body.classList.remove('designer-mode', 'operator-mode', 'admin-mode');
  document.body.classList.add(`${role}-mode`);
  roleBadge.textContent = roleLabels[role];
  loginScreen.hidden = true;
  workspaceShell.classList.add('authenticated');
  workspaceShell.setAttribute('aria-hidden', 'false');
  renderPage(defaultPageByRole[role]);
}

function showLogin() {
  currentRole = null;
  document.body.classList.remove('designer-mode', 'operator-mode', 'admin-mode');
  localEditModal.classList.remove('open');
  localEditModal.setAttribute('aria-hidden', 'true');
  workspaceShell.classList.remove('authenticated');
  workspaceShell.setAttribute('aria-hidden', 'true');
  loginScreen.hidden = false;
  window.location.hash = 'login';
}

function getAllowedPage(page) {
  if (!currentRole) return 'projects';
  if (allowedPagesByRole[currentRole].includes(page)) return page;
  return defaultPageByRole[currentRole];
}

function updateNavigation(page) {
  document.querySelectorAll('.nav-item').forEach((item) => {
    const target = item.dataset.page;
    const active = target === page
      || (target === 'projects' && ['new-project', 'content', 'generate'].includes(page))
      || (target === 'review-inbox' && page === 'review-detail');
    item.classList.toggle('active', active);
  });
}

function updateGenerationSubmissionState() {
  const slots = root.querySelectorAll('.slot-item');
  const submitButton = root.querySelector('[data-action="submit-all-review"]');
  if (!slots.length || !submitButton) return;

  const chosenCount = Array.from(slots).filter((slot) => slot.querySelector('em')?.textContent.trim() === '已选').length;
  const remaining = slots.length - chosenCount;
  root.querySelector('#chosenSlotCount').textContent = String(chosenCount);
  root.querySelector('#totalSlotCount').textContent = String(slots.length);
  root.querySelector('#submitHelper').textContent = remaining
    ? `还差 ${remaining} 张图片，选定后可一键提交运营审核。`
    : '全部图槽已选定，可以一次提交给运营审核。';
  submitButton.disabled = remaining > 0;
  submitButton.textContent = remaining ? `还需选择 ${remaining} 张` : `一键提交 ${slots.length} 张给运营审核`;
}

function bindPageActions() {
  root.querySelectorAll('[data-page]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      renderPage(element.dataset.page);
    });
  });

  root.querySelectorAll('.choice-card').forEach((card) => {
    card.addEventListener('click', () => {
      root.querySelectorAll('.choice-card').forEach((item) => item.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  root.querySelectorAll('.segmented button').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('.segmented');
      group.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');

      if (button.dataset.generationMode) {
        const suiteMode = button.dataset.generationMode === 'suite';
        const rule = root.querySelector('#generationRule');
        const generateButton = root.querySelector('[data-action="generate-images"]');
        if (rule) rule.textContent = suiteMode
          ? '整套图片固定为每个图槽生成 1 张，适合快速得到完整初稿。'
          : '当前图槽固定生成 3 张候选图，用于比较后选定一张。';
        if (generateButton) generateButton.textContent = suiteMode
          ? '生成整套图（各 1 张）'
          : '再生成当前图（3 张）';
      }
    });
  });

  root.querySelectorAll('.slot-item').forEach((slot) => {
    slot.addEventListener('click', () => {
      root.querySelectorAll('.slot-item').forEach((item) => item.classList.remove('selected'));
      slot.classList.add('selected');
      const number = slot.querySelector('b')?.textContent || '01';
      const title = slot.querySelector('strong')?.textContent || '主产品图';
      const canvasNumber = root.querySelector('#canvasSlotNumber');
      const canvasTitle = root.querySelector('#canvasSlotTitle');
      const actionTitle = root.querySelector('#actionSlotTitle');
      if (canvasNumber) canvasNumber.textContent = number;
      if (canvasTitle) canvasTitle.textContent = title;
      if (actionTitle) actionTitle.textContent = title;
    });
  });

  root.querySelectorAll('.candidate').forEach((candidate) => {
    if (candidate.classList.contains('add-candidate')) return;
    candidate.addEventListener('click', () => {
      root.querySelectorAll('.candidate').forEach((item) => item.classList.remove('selected'));
      candidate.classList.add('selected');
      const image = candidate.querySelector('img');
      const canvasImage = root.querySelector('#canvasImage');
      if (image && canvasImage) canvasImage.src = image.src;
      const activeSlotStatus = root.querySelector('.slot-item.selected em');
      if (activeSlotStatus) {
        activeSlotStatus.className = 'chosen';
        activeSlotStatus.textContent = '已选';
      }
      updateGenerationSubmissionState();
      showToast('已选择当前候选图');
    });
  });

  root.querySelector('[data-action="submit-all-review"]')?.addEventListener('click', () => {
    showToast('整套图片已提交运营审核');
  });

  root.querySelector('[data-action="generate-images"]')?.addEventListener('click', () => {
    const suiteMode = root.querySelector('[data-generation-mode="suite"]')?.classList.contains('selected');
    showToast(suiteMode ? '正在为整套图各生成 1 张候选图' : '正在为当前图槽生成 3 张候选图');
  });

  root.querySelector('[data-action="approve-image"]')?.addEventListener('click', () => {
    showToast('图片已通过，正在进入下一张');
  });

  root.querySelector('[data-action="open-local-edit"]')?.addEventListener('click', () => {
    localEditModal.classList.add('open');
    localEditModal.setAttribute('aria-hidden', 'false');
  });
}

function renderPage(page) {
  if (!currentRole) {
    showLogin();
    return;
  }
  const nextPage = getAllowedPage(page);
  const templateId = pages[nextPage] || pages.projects;
  const template = document.querySelector(`#${templateId}`);
  currentPage = pages[nextPage] ? nextPage : 'projects';
  root.replaceChildren(template.content.cloneNode(true));
  updateNavigation(currentPage);
  bindPageActions();
  updateGenerationSubmissionState();
  window.scrollTo({ top: 0, behavior: 'instant' });
  window.location.hash = currentPage;
}

document.querySelectorAll('[data-action="close-local-edit"]').forEach((element) => {
  element.addEventListener('click', () => {
    localEditModal.classList.remove('open');
    localEditModal.setAttribute('aria-hidden', 'true');
  });
});

document.querySelector('[data-action="generate-local-edit"]').addEventListener('click', () => {
  localEditModal.classList.remove('open');
  localEditModal.setAttribute('aria-hidden', 'true');
  showToast('已基于当前候选图创建局部修改任务');
});

const selectionToolHints = {
  smart: '已根据产品结构生成初始选区；可切换画笔或套索进一步修正边缘。',
  brush: '用画笔涂抹需要修改的部分；可切换为“减去选区”擦除多选范围。',
  lasso: '沿着不规则边缘圈选需要修改的部分，适合产品结构和复杂轮廓。',
  rectangle: '快速框选规则区域，适合标签、文字块和局部背景。'
};

document.querySelectorAll('[data-selection-tool]').forEach((button) => {
  button.addEventListener('click', () => {
    const tool = button.dataset.selectionTool;
    document.querySelectorAll('[data-selection-tool]').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    const selectionBox = document.querySelector('.selection-box');
    selectionBox.className = `selection-box ${tool}`;
    const activeMaskMode = document.querySelector('[data-mask-mode].selected')?.dataset.maskMode;
    selectionBox.classList.toggle('subtract', activeMaskMode === 'subtract');
    document.querySelector('#selectionLabel').textContent = tool === 'smart' ? '智能识别选区' : `${button.textContent.trim()}选区`;
    document.querySelector('#selectionToolHint').textContent = selectionToolHints[tool];
    document.querySelector('.brush-size-control').hidden = tool !== 'brush';
  });
});

document.querySelectorAll('[data-mask-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-mask-mode]').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    document.querySelector('.selection-box').classList.toggle('subtract', button.dataset.maskMode === 'subtract');
  });
});

document.querySelector('.brush-size-control input').addEventListener('input', (event) => {
  document.querySelector('.brush-size-control b').textContent = `${event.target.value} px`;
});

document.querySelectorAll('.sidebar [data-page]').forEach((element) => {
  element.addEventListener('click', () => renderPage(element.dataset.page));
});

document.querySelectorAll('[data-role]').forEach((element) => {
  element.addEventListener('click', () => startSession(element.dataset.role));
});

document.querySelector('[data-action="toggle-sidebar"]').addEventListener('click', () => {
  const collapsed = workspaceShell.classList.toggle('sidebar-collapsed');
  document.querySelector('[data-action="toggle-sidebar"]').setAttribute('aria-label', collapsed ? '展开侧边栏' : '收起侧边栏');
});

document.querySelector('[data-action="logout"]').addEventListener('click', () => showLogin());

document.querySelector('[data-action="reset-demo"]').addEventListener('click', () => {
  showLogin();
});

showLogin();
