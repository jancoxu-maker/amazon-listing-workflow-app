(function () {
  const roleData = {
    designer: {
      title: '设计工作指南',
      copy: '负责准备产品资料、图片方案、生图、候选选择和提交运营审核。',
      icon: 'pen-tool',
      steps: [
        ['创建项目', '填写产品、SKU、输出类型和负责人。', '完成标准：项目名称、产品类型和输出类型已确认。'],
        ['准备资料', '上传参考图，确认目标站点、图片语言与品牌。', '完成标准：至少一张主参考图可正常预览。'],
        ['整理卖点', '生成或编辑卖点表，只保留有依据的内容。', '完成标准：方案所需卖点均可核实。'],
        ['生成方案', '确认每张图证明什么，以及画面如何证明。', '完成标准：所有必需图槽都有完整 brief。'],
        ['生图与选择', '整套生成初稿，重点图重生 3 张或进行局部修改。', '完成标准：每个必需图槽选择一张可提交候选。'],
        ['提交运营', '检查风险提示和整套完整性，一次提交给运营。', '完成标准：项目进入“待运营审核”。']
      ]
    },
    operator: {
      title: '运营审核指南',
      copy: '只查看分配给自己且设计已完整提交的项目，逐图通过或退回。',
      icon: 'clipboard-check',
      steps: [
        ['进入待审项目', '从审核队列打开设计已完整提交的项目。', '完成标准：项目、SKU、设计负责人和输出类型无误。'],
        ['核对依据', '对照参考图、卖点、图槽证明点与品牌摘要。', '完成标准：确认图片表达内容来自项目资料。'],
        ['查看 AI 预审', '优先检查高风险与需复核项，但不把 AI 当最终结论。', '完成标准：理解风险原因与建议动作。'],
        ['逐图判断', '选择通过或退回，并为退回项写清问题。', '完成标准：所有必需图槽均有明确结果。'],
        ['提交审核结果', '整套通过后送管理员最终放行。', '完成标准：项目进入“等待管理员放行”。']
      ]
    },
    admin: {
      title: '管理员工作指南',
      copy: '负责账号、项目分配、品牌库、系统日志和最终放行。',
      icon: 'shield-check',
      steps: [
        ['管理成员', '创建邀请码、确认账号身份与使用状态。', '完成标准：成员以正确角色登录。'],
        ['分配项目', '为项目指定设计负责人和运营审核人。', '完成标准：项目不会被无关成员看到。'],
        ['维护品牌库', '管理颜色角色、标题、图形样式、示例图和版本。', '完成标准：品牌版本可追溯且规则完整。'],
        ['检查异常', '从系统日志定位登录、生成、存储和预审问题。', '完成标准：失败任务有明确原因和处理结果。'],
        ['最终放行', '确认运营已通过整套必需图片，允许导出。', '完成标准：项目可导出最终图片 ZIP。']
      ]
    }
  };

  const planRules = {
    main: [
      ['image', '第一张必须白底', '产品是唯一主体，不加场景、Logo 或促销文字。'],
      ['maximize', '主体占比 80%–90%', '默认目标 85%，同时保留完整边界与自然阴影。'],
      ['scan-eye', '其余图片用画面证明卖点', '可以使用真实场景或品牌背景，文字保持克制。'],
      ['text-cursor-input', '整套字体与风格统一', '标题、箭头、标注和留白遵循同一规则。']
    ],
    aplus: [
      ['panels-top-left', '不要求第一张白底', '按照内容模块组织画面，不复用主图第一张规则。'],
      ['combine', '允许组合相关卖点', '每个模块可组合 1–3 个卖点，叙事更丰富。'],
      ['badge', '可按品牌规则使用 Logo', 'Logo 只允许出现在 A+，位置由方案定义。'],
      ['layout-dashboard', '标题位置可灵活安排', '在保持整套字体和视觉语言统一的前提下匹配模块布局。']
    ]
  };

  const slotDetails = [
    ['01 · 必需', '白底展示完整产品', '产品建议占有效画面 80%–90%，默认目标 85%；不加场景、Logo 或促销文案。'],
    ['02', '用画面证明核心卖点', '选择购买决策中最重要的卖点，用结构、动作或前后状态直观证明。'],
    ['03', '放进真实使用场景', '产品比例、人物动作和环境必须符合真实物理逻辑。'],
    ['04', '让细节经得起放大', '展示材质、接口、工艺或关键部件，不凭空增加结构。'],
    ['05', '展示真实功能状态', '只展示项目资料确认存在的折叠、调节、开合或组合状态。'],
    ['06', '说明结构与规格', '尺寸、承重、容量或认证必须来自已确认资料，不允许模型编造。'],
    ['07', '完成尺寸或包装信息', '用清晰层级展示尺寸、配件或包装清单，避免信息拥挤。']
  ];

  const state = {
    role: localStorage.getItem('vistamz-guide-role') || 'designer',
    done: JSON.parse(localStorage.getItem('vistamz-guide-progress') || '{}'),
    tour: 0
  };

  function icon(name, size) {
    return `<i data-lucide="${name}"${size ? ` style="width:${size}px;height:${size}px"` : ''}></i>`;
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
  }

  function renderRole() {
    const data = roleData[state.role];
    document.querySelectorAll('.role-button').forEach((button) => {
      const active = button.dataset.role === state.role;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.getElementById('role-brief-title').textContent = data.title;
    document.getElementById('role-brief-copy').textContent = data.copy;
    document.getElementById('role-brief-tag').textContent = `${data.steps.length} 个主要步骤`;
    const roleIcon = document.getElementById('role-brief-icon');
    roleIcon.setAttribute('data-lucide', data.icon);

    const workflow = document.getElementById('role-workflow');
    workflow.innerHTML = data.steps.map((step, index) => {
      const key = `${state.role}-${index}`;
      const done = Boolean(state.done[key]);
      return `<article class="workflow-step${index === 0 ? ' is-open' : ''}${done ? ' is-done' : ''}" data-step="${index}">
        <div class="workflow-step-head"><span class="workflow-step-number">${String(index + 1).padStart(2, '0')}</span><button class="workflow-check" type="button" aria-label="${done ? '取消完成' : '标记完成'}" data-progress-key="${key}">${icon('check')}</button></div>
        <h3>${step[0]}</h3><p>${step[1]}</p><div class="workflow-detail"><strong>完成标准</strong>${step[2].replace('完成标准：', '')}</div>
      </article>`;
    }).join('');
    bindWorkflow();
    updateProgress();
    refreshIcons();
  }

  function bindWorkflow() {
    document.querySelectorAll('.workflow-step').forEach((card) => {
      card.addEventListener('click', (event) => {
        if (event.target.closest('.workflow-check')) return;
        card.classList.toggle('is-open');
      });
    });
    document.querySelectorAll('.workflow-check').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.progressKey;
        state.done[key] = !state.done[key];
        localStorage.setItem('vistamz-guide-progress', JSON.stringify(state.done));
        renderRole();
      });
    });
  }

  function updateProgress() {
    const steps = roleData[state.role].steps;
    const done = steps.filter((_, index) => state.done[`${state.role}-${index}`]).length;
    const percent = Math.round((done / steps.length) * 100);
    document.getElementById('progress-label').textContent = `${percent}%`;
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('workflow-count').textContent = `${String(Math.min(done + 1, steps.length)).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
  }

  function renderPlan(type) {
    document.querySelectorAll('.plan-tab').forEach((tab) => {
      const active = tab.dataset.plan === type;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.getElementById('plan-rules').innerHTML = planRules[type].map((rule) => `<article class="plan-rule">${icon(rule[0])}<div><strong>${rule[1]}</strong><p>${rule[2]}</p></div></article>`).join('');
    refreshIcons();
  }

  function showToast(message) {
    const toast = document.getElementById('guide-toast');
    toast.querySelector('span').textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function setupSearch() {
    const input = document.getElementById('guide-search');
    const sections = Array.from(document.querySelectorAll('.searchable-section'));
    input.addEventListener('input', () => {
      const query = input.value.trim().toLocaleLowerCase();
      let matches = 0;
      sections.forEach((section) => {
        section.classList.remove('search-match');
        if (!query) return;
        if (section.textContent.toLocaleLowerCase().includes(query)) {
          section.classList.add('search-match');
          matches += 1;
        }
      });
      document.getElementById('search-empty').hidden = !query || matches > 0;
      if (query && matches) sections.find((section) => section.classList.contains('search-match'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.focus();
      }
      if (event.key === 'Escape') {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.blur();
      }
    });
  }

  function setupTour() {
    const dialog = document.getElementById('tour-dialog');
    const steps = Array.from(dialog.querySelectorAll('.tour-step'));
    const render = () => {
      steps.forEach((step, index) => step.classList.toggle('is-active', index === state.tour));
      document.getElementById('tour-position').textContent = `${state.tour + 1} / ${steps.length}`;
      document.getElementById('tour-prev').disabled = state.tour === 0;
      document.getElementById('tour-next').textContent = state.tour === steps.length - 1 ? '完成导览' : '下一步';
    };
    document.getElementById('show-tour').addEventListener('click', () => { state.tour = 0; render(); dialog.showModal(); });
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    document.getElementById('tour-prev').addEventListener('click', () => { state.tour -= 1; render(); });
    document.getElementById('tour-next').addEventListener('click', () => {
      if (state.tour === steps.length - 1) dialog.close(); else { state.tour += 1; render(); }
    });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  }

  function setupNavigation() {
    const navLinks = Array.from(document.querySelectorAll('.guide-nav a'));
    const sections = navLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`));
    }, { rootMargin: '-22% 0px -65% 0px', threshold: [0, .2, .5] });
    sections.forEach((section) => observer.observe(section));
  }

  document.querySelectorAll('.role-button').forEach((button) => {
    button.addEventListener('click', () => {
      state.role = button.dataset.role;
      localStorage.setItem('vistamz-guide-role', state.role);
      renderRole();
    });
  });

  document.querySelector('.reset-progress').addEventListener('click', () => {
    Object.keys(state.done).filter((key) => key.startsWith(`${state.role}-`)).forEach((key) => delete state.done[key]);
    localStorage.setItem('vistamz-guide-progress', JSON.stringify(state.done));
    renderRole();
    showToast('当前身份的学习进度已重置。');
  });

  document.querySelectorAll('.plan-tab').forEach((tab) => tab.addEventListener('click', () => renderPlan(tab.dataset.plan)));
  document.querySelectorAll('.slot-card').forEach((card, index) => card.addEventListener('click', () => {
    document.querySelectorAll('.slot-card').forEach((item) => item.classList.toggle('is-active', item === card));
    const detail = slotDetails[index];
    document.getElementById('slot-detail').innerHTML = `<span class="vz-tag vz-tag--info">${detail[0]}</span><div><strong>${detail[1]}</strong><p>${detail[2]}</p></div>`;
  }));

  document.getElementById('brand-upgrade-demo').addEventListener('click', () => showToast('升级品牌版本会保留产品资料和卖点，但旧图片方案、候选图与审核结果将失效。'));

  const sidebar = document.querySelector('.guide-sidebar');
  document.querySelector('.sidebar-toggle').addEventListener('click', () => {
    const compact = window.matchMedia('(max-width: 1180px)').matches;
    sidebar.classList.toggle(compact ? 'is-expanded' : 'is-collapsed');
    const expanded = compact ? sidebar.classList.contains('is-expanded') : !sidebar.classList.contains('is-collapsed');
    document.querySelector('.sidebar-toggle').setAttribute('aria-expanded', String(expanded));
  });
  document.querySelectorAll('.guide-nav a').forEach((link) => link.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 820px)').matches) sidebar.classList.remove('is-expanded');
  }));

  renderRole();
  renderPlan('main');
  setupSearch();
  setupTour();
  setupNavigation();
  refreshIcons();
}());
