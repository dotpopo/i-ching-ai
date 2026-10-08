/* ===== 易经 AI 学堂 — 主入口 ===== */
import { IChingScene } from './scene.js';
import { hexagrams, generateHexagramStats } from './data.js';
import type { Hexagram } from './data.js';
import { getApiConfig, saveApiConfig, callChatCompletion } from './api-config.js';

// ===== 全局状态 =====
let scene: IChingScene | null = null;
let currentTab: 'explore' | 'analysis' | 'ai-tutor' = 'explore';
let selectedHexNum = 1;
let collectedHexagrams = new Set<number>();
let blindboxHexNum: number | null = null;
let isAiConfigured = false;

// DOM 引用
const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
const loadingOverlay = document.getElementById('loading-overlay')!;
const errorOverlay = document.getElementById('error-overlay')!;
const infoPanel = document.getElementById('info-panel')!;
const panelClose = document.getElementById('panel-close')!;
const analysisPanel = document.getElementById('analysis-panel')!;
const analysisClose = document.getElementById('analysis-close')!;
const tutorPanel = document.getElementById('tutor-panel')!;
const tutorClose = document.getElementById('tutor-close')!;
const navBtns = document.querySelectorAll('.nav-btn');
const oracleBtn = document.getElementById('oracle-btn')!;
const blindboxModal = document.getElementById('blindbox-modal')!;
const shareCard = document.getElementById('share-card')!;
const apiKeyBtn = document.getElementById('api-key-btn')!;
const apiConfigModal = document.getElementById('api-config-modal')!;
const apiConfigClose = document.getElementById('api-config-close')!;
const modalApiKey = document.getElementById('modal-api-key') as HTMLInputElement;
const modalBaseUrl = document.getElementById('modal-base-url') as HTMLInputElement;
const modalModelId = document.getElementById('modal-model-id') as HTMLInputElement;
const modalApiSave = document.getElementById('modal-api-save')!;
const modalApiStatus = document.getElementById('modal-api-status')!;
const aiUnlockBtn = document.getElementById('ai-unlock-btn')!;
const aiUnlockSection = document.getElementById('ai-unlock-section')!;
const collectionBar = document.getElementById('collection-bar')!;

// ===== 初始化 =====
function init() {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');

    // 加载已收藏的卦象
    const saved = localStorage.getItem('iching_collected');
    if (saved) {
      try { collectedHexagrams = new Set(JSON.parse(saved)); } catch {}
    }

    // 检查 API 配置状态
    const config = getApiConfig();
    isAiConfigured = !!config.apiKey;

    scene = new IChingScene(canvas, {
      onSelect: handleHexagramSelect,
      onHover: handleHexagramHover,
    });
    scene.start();

    setTimeout(() => loadingOverlay.classList.add('hidden'), 800);

    bindEvents();
    updateInfoPanel(1);
    drawChart(1);
    renderCollectionBar();
    updateApiConfigUI();
    updateAiUnlockButton();

  } catch (err) {
    console.error('初始化失败:', err);
    loadingOverlay.style.display = 'none';
    errorOverlay.style.display = 'flex';
  }
}

// ===== 事件绑定 =====
function bindEvents() {
  window.addEventListener('mousemove', (e) => {
    if (!scene) return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    scene.setMouse(nx, ny);
  });

  window.addEventListener('click', (e) => {
    if (!scene) return;
    if (e.target instanceof HTMLElement && e.target.closest('#info-panel, #analysis-panel, #tutor-panel, #blindbox-modal, #share-card, #api-config-modal')) return;
    const hovered = scene.updateRaycast();
    if (hovered !== null) handleHexagramSelect(hovered);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectedHexNum = selectedHexNum >= 64 ? 1 : selectedHexNum + 1;
      handleHexagramSelect(selectedHexNum);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectedHexNum = selectedHexNum <= 1 ? 64 : selectedHexNum - 1;
      handleHexagramSelect(selectedHexNum);
    } else if (e.key === 'Escape') {
      closeAllPanels();
      hideBlindbox();
      hideShareCard();
      hideApiConfigModal();
    }
  });

  // 导航标签
  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLElement).dataset.tab as 'explore' | 'analysis' | 'ai-tutor';
      switchTab(tab);
    });
  });

  // 面板关闭
  panelClose.addEventListener('click', () => infoPanel.classList.add('panel-closed'));
  analysisClose.addEventListener('click', () => analysisPanel.classList.add('panel-closed'));
  tutorClose.addEventListener('click', () => tutorPanel.classList.add('panel-closed'));

  // 求签按钮
  oracleBtn.addEventListener('click', performBlindBox);

  // 盲盒关闭
  document.getElementById('blindbox-close')!.addEventListener('click', hideBlindbox);
  blindboxModal.addEventListener('click', (e) => {
    if (e.target === blindboxModal) hideBlindbox();
  });

  // 盲盒分享
  document.getElementById('blindbox-share')!.addEventListener('click', () => showShareCard());
  document.getElementById('blindbox-collect')!.addEventListener('click', collectCurrentHexagram);

  // 分享卡片关闭
  document.getElementById('share-close')!.addEventListener('click', hideShareCard);
  document.getElementById('share-download')!.addEventListener('click', downloadShareCard);

  // API Key 按钮 — 打开配置弹窗
  apiKeyBtn.addEventListener('click', () => {
    showApiConfigModal();
  });

  // API 配置弹窗关闭
  apiConfigClose.addEventListener('click', hideApiConfigModal);
  apiConfigModal.addEventListener('click', (e) => {
    if (e.target === apiConfigModal) hideApiConfigModal();
  });

  // API 配置保存
  modalApiSave.addEventListener('click', saveApiConfigFromModal);
  modalApiKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveApiConfigFromModal();
  });
  modalBaseUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveApiConfigFromModal();
  });
  modalModelId.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveApiConfigFromModal();
  });

  // AI 解锁按钮
  aiUnlockBtn.addEventListener('click', () => {
    if (isAiConfigured) {
      // 已配置，切换 AI 解读面板的显示
      switchTab('ai-tutor');
    } else {
      // 未配置，打开配置弹窗
      showApiConfigModal();
    }
  });

  // AI 导师输入
  const tutorInput = document.getElementById('tutor-input') as HTMLInputElement;
  const tutorSend = document.getElementById('tutor-send')!;
  tutorSend.addEventListener('click', () => sendTutorMessage());
  tutorInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendTutorMessage();
  });
}

// ===== API 配置弹窗 =====
function showApiConfigModal() {
  const config = getApiConfig();
  // 所有输入框清空，不显示任何默认值
  modalApiKey.value = '';
  modalBaseUrl.value = config.baseUrl || '';
  modalModelId.value = config.modelId || '';
  modalApiStatus.textContent = '';
  modalApiStatus.style.color = '';
  apiConfigModal.classList.add('visible');
}

function hideApiConfigModal() {
  apiConfigModal.classList.remove('visible');
}

async function saveApiConfigFromModal() {
  const key = modalApiKey.value.trim();
  const baseUrl = modalBaseUrl.value.trim();
  const modelId = modalModelId.value.trim();

  const config: Record<string, string> = {};
  if (key) config.apiKey = key;
  if (baseUrl) config.baseUrl = baseUrl;
  if (modelId) config.modelId = modelId;
  saveApiConfig(config);

  // 验证配置
  const newConfig = getApiConfig();
  if (newConfig.apiKey) {
    modalApiStatus.textContent = '正在验证连接…';
    modalApiStatus.style.color = 'var(--gold)';
    try {
      await callChatCompletion([
        { role: 'system', content: '你好' },
        { role: 'user', content: '测试连接' },
      ], newConfig);
      isAiConfigured = true;
      modalApiStatus.textContent = '✓ 连接成功！AI 解读已激活';
      modalApiStatus.style.color = 'var(--gold)';
    } catch (err) {
      modalApiStatus.textContent = '✗ 连接失败，请检查 API Key';
      modalApiStatus.style.color = 'var(--crimson)';
    }
  } else {
    isAiConfigured = false;
    modalApiStatus.textContent = '未配置 API Key，使用预设解读';
    modalApiStatus.style.color = '';
  }

  updateApiConfigUI();
  updateAiUnlockButton();
  updateAiInterpretation(hexagrams.find((h) => h.number === selectedHexNum)!);
  setTimeout(() => hideApiConfigModal(), 1500);
}

function updateApiConfigUI() {
  const config = getApiConfig();
  if (config.apiKey) {
    apiKeyBtn.textContent = '🔑 已连接';
    apiKeyBtn.classList.add('connected');
  } else {
    apiKeyBtn.textContent = '🔑 API';
    apiKeyBtn.classList.remove('connected');
  }
}

// ===== AI 解锁按钮状态 =====
function updateAiUnlockButton() {
  if (isAiConfigured) {
    aiUnlockBtn.classList.add('unlocked');
    aiUnlockBtn.querySelector('.unlock-text')!.textContent = 'AI 解读已解锁';
    aiUnlockBtn.querySelector('.unlock-icon')!.textContent = '🔓';
    aiUnlockSection.style.display = 'none';
  } else {
    aiUnlockBtn.classList.remove('unlocked');
    aiUnlockBtn.querySelector('.unlock-text')!.textContent = '✨ 解锁 AI 解读';
    aiUnlockBtn.querySelector('.unlock-icon')!.textContent = '✨';
    aiUnlockSection.style.display = '';
  }
}

// ===== 卦象选择 =====
function handleHexagramSelect(num: number) {
  selectedHexNum = num;
  updateInfoPanel(num);
  drawChart(num);
  scene?.focusOnHexagram(num);
  if (currentTab === 'ai-tutor') updateAITutor(num);
}

function handleHexagramHover(num: number | null) {
  document.body.style.cursor = num !== null ? 'pointer' : 'default';
}

// ===== 信息面板更新 =====
function updateInfoPanel(num: number) {
  const hex = hexagrams.find((h) => h.number === num);
  if (!hex) return;

  document.getElementById('panel-title')!.textContent = hex.name + '卦';
  document.getElementById('hexagram-number')!.textContent = '#' + hex.number;
  document.getElementById('hexagram-trigrams')!.textContent = hex.chinese;
  document.getElementById('hexagram-nature')!.textContent = hex.nature;
  document.getElementById('hexagram-symbol')!.textContent = hex.symbol;

  const linesContainer = document.getElementById('hexagram-lines')!;
  linesContainer.innerHTML = '';
  hex.lines.forEach((line) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'hex-line ' + (line === 1 ? 'yang' : 'yin');
    linesContainer.appendChild(lineEl);
  });

  // 更新 AI 解读
  updateAiInterpretation(hex);

  infoPanel.classList.remove('panel-closed');
}

function updateAiInterpretation(hex: Hexagram) {
  const aiText = document.getElementById('ai-text')!;

  if (isAiConfigured) {
    aiText.innerHTML = `
      <p class="ai-section-title">🌀 传统解读</p>
      <p class="typing">AI 正在解读…</p>
    `;

    generateAiInterpretations(hex).then((interpretations) => {
      aiText.innerHTML = `
        <p class="ai-section-title">🌀 传统解读</p>
        <p>${interpretations.traditional}</p>
        <p class="ai-section-title">📊 数据科学视角</p>
        <p>${interpretations.dataScience}</p>
        <p class="ai-section-title">👶 6岁小孩能懂</p>
        <div class="ai-collapsible">
          <div class="ai-collapsible-content collapsed" data-full="${escapeHtml(interpretations.childFriendly)}">${escapeHtml(truncateText(interpretations.childFriendly, 80))}</div>
          <button class="ai-collapsible-toggle" aria-label="展开/收起">展开</button>
        </div>
        <p class="ai-section-title">💡 生活启示</p>
        <p>${interpretations.lifeAdvice}</p>
      `;
      bindCollapsibleToggles();
    }).catch(() => {
      aiText.innerHTML = `
        <p class="ai-section-title">🌀 传统解读</p>
        <p>${hex.interpretation}</p>
        <p class="ai-section-title">📊 数据科学视角</p>
        <p>${hex.dataScience}</p>
        <p class="ai-section-title">👶 6岁小孩能懂</p>
        <div class="ai-collapsible">
          <div class="ai-collapsible-content collapsed" data-full="${escapeHtml(getChildFriendlyExplanation(hex))}">${escapeHtml(truncateText(getChildFriendlyExplanation(hex), 80))}</div>
          <button class="ai-collapsible-toggle" aria-label="展开/收起">展开</button>
        </div>
        <p class="ai-section-title">💡 生活启示</p>
        <p>${getLifeAdvice(hex)}</p>
      `;
      bindCollapsibleToggles();
    });
  } else {
    // 预设内容
    aiText.innerHTML = `
      <p class="ai-section-title">🌀 传统解读</p>
      <p>${hex.interpretation}</p>
      <p class="ai-section-title">📊 数据科学视角</p>
      <p>${hex.dataScience}</p>
      <p class="ai-section-title">👶 6岁小孩能懂</p>
      <div class="ai-collapsible">
        <div class="ai-collapsible-content collapsed" data-full="${escapeHtml(getChildFriendlyExplanation(hex))}">${escapeHtml(truncateText(getChildFriendlyExplanation(hex), 80))}</div>
        <button class="ai-collapsible-toggle" aria-label="展开/收起">展开</button>
      </div>
      <p class="ai-section-title">💡 生活启示</p>
      <p>${getLifeAdvice(hex)}</p>
    `;
    bindCollapsibleToggles();
  }
}

function bindCollapsibleToggles() {
  document.querySelectorAll('.ai-collapsible-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const content = btn.previousElementSibling as HTMLElement;
      if (!content) return;
      const isCollapsed = content.classList.contains('collapsed');
      if (isCollapsed) {
        content.classList.remove('collapsed');
        content.style.maxHeight = content.dataset.full!.length * 18 + 'px';
        btn.classList.add('expanded');
        btn.textContent = '收起';
      } else {
        content.classList.add('collapsed');
        content.style.maxHeight = '80px';
        btn.classList.remove('expanded');
        btn.textContent = '展开';
      }
    });
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

async function generateAiInterpretations(hex: Hexagram): Promise<{
  traditional: string;
  dataScience: string;
  childFriendly: string;
  lifeAdvice: string;
}> {
  const config = getApiConfig();

  const prompts = {
    traditional: `请用中国传统哲学的视角，优雅而深刻地解读第${hex.number}卦「${hex.name}」（${hex.chinese}）。卦象结构：${hex.lines.map((l) => (l === 1 ? '阳爻' : '阴爻')).join('，')}。性质：${hex.nature}。象征：${hex.symbol}。请从传统哲学角度进行解读，300字以内。`,
    dataScience: `请从数据科学和现代视角解读第${hex.number}卦「${hex.name}」。卦象结构：${hex.lines.map((l) => (l === 1 ? '阳爻' : '阴爻')).join('，')}。请用数据分析、模式识别、系统科学等角度进行解读，300字以内。`,
    childFriendly: `请用6岁小孩能听懂的话解释第${hex.number}卦「${hex.name}」（${hex.chinese}）。${hex.interpretation}请用最简单的比喻和生活例子来解释，200字以内。`,
    lifeAdvice: `请从第${hex.number}卦「${hex.name}」中提炼出对日常生活有指导意义的启示。卦象结构：${hex.lines.map((l) => (l === 1 ? '阳爻' : '阴爻')).join('，')}。请给出具体、可操作的生活建议，300字以内。`,
  };

  const results: Record<string, string> = {};

  for (const [key, prompt] of Object.entries(prompts)) {
    try {
      const response = await callChatCompletion([
        { role: 'system', content: '你是一位精通易经、传统中国哲学、数据科学和儿童教育的学者。请用中文回答，风格根据受众调整。' },
        { role: 'user', content: prompt },
      ], config);
      results[key] = response;
    } catch (err) {
      results[key] = getDefaultInterpretation(key, hex);
    }
  }

  return results as any;
}

function getDefaultInterpretation(type: string, hex: Hexagram): string {
  switch (type) {
    case 'traditional': return hex.interpretation;
    case 'dataScience': return hex.dataScience;
    case 'childFriendly': return getChildFriendlyExplanation(hex);
    case 'lifeAdvice': return getLifeAdvice(hex);
    default: return hex.interpretation;
  }
}

function getChildFriendlyExplanation(hex: Hexagram): string {
  const explanations: Record<number, string> = {
    1: '天就像一个超级大的爸爸，守护着整个世界。乾卦告诉我们，要像天一样，做一个勇敢、有力量的人！',
    2: '大地妈妈很温柔，她抱着我们，让我们安全地成长。坤卦告诉我们，做一个温柔、有力量的人。',
    3: '刚开始学走路的时候，会摔倒，会摔跤。但是不要害怕，慢慢来，一定会学会的！',
    4: '就像小朋友去上学一样，开始什么都不懂，但是慢慢学习，就会越来越聪明！',
    5: '有时候我们需要等一等，就像等蛋糕烤好一样。急不得，慢慢来会更好！',
    6: '有时候会有争吵，但是只要我们心平气和地说话，问题总会解决的。',
  };
  return explanations[hex.number] || `${hex.name}卦告诉我们${hex.interpretation.substring(0, 50)}……`;
}

function getLifeAdvice(hex: Hexagram): string {
  const advice: Record<number, string> = {
    1: '现在正是展现你最好一面的时刻！就像太阳升起，万物都充满希望。',
    2: '学会倾听和接纳。有时候，最强大的力量不是进攻，而是包容。',
    3: '新的开始总是有点难，但每一个伟大的故事都从第一步开始。',
    4: '保持好奇心，多问为什么。学习是一个没有终点的旅程。',
    5: '耐心等待，好时机正在到来。不要急于求成。',
    6: '沟通是解决一切问题的钥匙。说话之前先想想对方的感受。',
  };
  return advice[hex.number] || `${hex.name}卦提醒我们：在生活中保持平衡和耐心。`;
}

// ===== 标签切换 =====
function switchTab(tab: 'explore' | 'analysis' | 'ai-tutor') {
  currentTab = tab;
  navBtns.forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab);
  });

  infoPanel.classList.add('panel-closed');
  analysisPanel.classList.add('panel-closed');
  tutorPanel.classList.add('panel-closed');

  if (tab === 'explore') infoPanel.classList.remove('panel-closed');
  else if (tab === 'analysis') {
    analysisPanel.classList.remove('panel-closed');
    drawChart(selectedHexNum);
  } else if (tab === 'ai-tutor') {
    tutorPanel.classList.remove('panel-closed');
    updateAITutor(selectedHexNum);
  }
}

// ===== 盲盒求签 =====
function performBlindBox() {
  const roll = Math.random();
  let num: number;
  if (roll < 0.1) num = 1;
  else if (roll < 0.2) num = 2;
  else num = Math.floor(Math.random() * 64) + 1;

  blindboxHexNum = num;
  const hex = hexagrams.find((h) => h.number === num)!;

  const cover = document.getElementById('blindbox-cover')!;
  cover.textContent = '☯';
  cover.style.animation = 'none';
  void cover.offsetWidth;
  cover.style.animation = 'coverShake 0.5s ease-in-out';

  document.getElementById('blindbox-result')!.textContent = hex.lines.map((l) => (l === 1 ? '─' : '──')).join('');
  document.getElementById('blindbox-name')!.textContent = hex.name + '卦';
  document.getElementById('blindbox-number')!.textContent = '#' + hex.number + ' · ' + hex.chinese;
  document.getElementById('blindbox-interpretation')!.textContent = hex.interpretation;

  blindboxModal.classList.add('visible');
}

function hideBlindbox() {
  blindboxModal.classList.remove('visible');
}

// ===== 分享卡片 =====
function showShareCard() {
  const num = blindboxHexNum || selectedHexNum;
  const hex = hexagrams.find((h) => h.number === num)!;
  document.getElementById('share-card-hex')!.textContent = hex.lines.map((l) => (l === 1 ? '─' : '──')).join('');
  document.getElementById('share-card-name')!.textContent = hex.name + '卦';
  document.getElementById('share-card-number')!.textContent = '#' + hex.number + ' · ' + hex.chinese;
  document.getElementById('share-card-msg')!.textContent = hex.interpretation;
  shareCard.classList.add('visible');
}

function hideShareCard() {
  shareCard.classList.remove('visible');
}

function downloadShareCard() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 720;
  canvas.height = 960;

  const grad = ctx.createLinearGradient(0, 0, 720, 960);
  grad.addColorStop(0, '#0d0a14');
  grad.addColorStop(1, '#1a0a14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 720, 960);

  ctx.strokeStyle = 'rgba(232,197,71,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 680, 920);

  ctx.strokeStyle = 'rgba(196,30,58,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? 30 : 690;
    const y = i < 2 ? 30 : 930;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (i % 2 === 0 ? 30 : -30), y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + (i < 2 ? 30 : -30));
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(232,197,71,0.6)';
  ctx.font = '14px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('易经 AI 学堂 · 卦象卡片', 360, 60);

  ctx.fillStyle = '#e8c547';
  ctx.font = '48px "Noto Serif SC", serif';
  ctx.fillText(document.getElementById('share-card-hex')!.textContent || '', 360, 180);

  ctx.fillStyle = '#e8c547';
  ctx.font = 'bold 28px "Noto Serif SC", serif';
  ctx.fillText(document.getElementById('share-card-name')!.textContent || '', 360, 230);

  ctx.fillStyle = '#7a6a5a';
  ctx.font = '12px "Noto Sans SC", sans-serif';
  ctx.fillText(document.getElementById('share-card-number')!.textContent || '', 360, 260);

  const msg = document.getElementById('share-card-msg')!.textContent || '';
  ctx.fillStyle = '#c8b89a';
  ctx.font = '14px "Noto Sans SC", sans-serif';
  const lines = wrapText(ctx, msg, 580);
  let y = 320;
  lines.forEach((line) => {
    ctx.fillText(line, 360, y);
    y += 24;
  });

  ctx.fillStyle = 'rgba(122,106,90,0.5)';
  ctx.font = '10px "Noto Sans SC", sans-serif';
  ctx.fillText('扫码或截图分享 · 易经 AI 学堂', 360, 900);

  const shareNum = blindboxHexNum || selectedHexNum;
  const shareHex = hexagrams.find((h) => h.number === shareNum);
  const link = document.createElement('a');
  link.download = `iching-${shareHex?.name || 'hex'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = '';
  for (const char of text) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ===== 收藏系统 =====
function collectCurrentHexagram() {
  if (collectedHexagrams.has(selectedHexNum)) {
    collectedHexagrams.delete(selectedHexNum);
    showToast('已取消收藏');
  } else {
    collectedHexagrams.add(selectedHexNum);
    showToast('已收藏 ' + hexagrams.find((h) => h.number === selectedHexNum)?.name + '卦');
  }
  localStorage.setItem('iching_collected', JSON.stringify([...collectedHexagrams]));
  renderCollectionBar();
  hideBlindbox();
}

function renderCollectionBar() {
  if (!collectionBar) return;
  collectionBar.innerHTML = '';
  const recent = [...collectedHexagrams].slice(-12);
  recent.forEach((num) => {
    const hex = hexagrams.find((h) => h.number === num)!;
    const dot = document.createElement('div');
    dot.className = 'collection-dot collected';
    dot.textContent = hex.name;
    dot.title = hex.name + '卦';
    dot.addEventListener('click', () => handleHexagramSelect(num));
    collectionBar.appendChild(dot);
  });
}

// ===== 数据分析图表 =====
function drawChart(hexNum: number) {
  const chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const rect = chartCanvas.parentElement!.getBoundingClientRect();
  chartCanvas.width = rect.width * window.devicePixelRatio;
  chartCanvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, w, h);

  const stats = generateHexagramStats();
  const hex = hexagrams.find((h) => h.number === hexNum);
  if (!hex) return;

  const yangCount = stats.yangCounts[hexNum - 1];
  const yinCount = 6 - yangCount;

  const bins = [0, 1, 2, 3, 4, 5, 6];
  const binCounts = new Array(7).fill(0);
  stats.yangCounts.forEach((c) => binCounts[c]++);

  const barWidth = chartW / bins.length - 4;
  const maxCount = Math.max(...binCounts);

  ctx.strokeStyle = 'rgba(196,30,58,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, h - padding.bottom);
  ctx.lineTo(w - padding.right, h - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = '#7a6a5a';
  ctx.font = '10px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= maxCount; i++) {
    const y = h - padding.bottom - (i / maxCount) * chartH;
    ctx.fillText(i.toString(), padding.left - 8, y + 3);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(196,30,58,0.08)';
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  bins.forEach((bin, i) => {
    const x = padding.left + i * (chartW / bins.length) + 2;
    const barH = (binCounts[bin] / maxCount) * chartH;
    const y = h - padding.bottom - barH;

    const isCurrent = bin === yangCount;
    const gradient = ctx.createLinearGradient(x, y, x, h - padding.bottom);
    if (isCurrent) {
      gradient.addColorStop(0, '#c41e3a');
      gradient.addColorStop(1, 'rgba(196,30,58,0.2)');
    } else {
      gradient.addColorStop(0, 'rgba(196,30,58,0.5)');
      gradient.addColorStop(1, 'rgba(196,30,58,0.05)');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barH);

    ctx.fillStyle = isCurrent ? '#e8c547' : '#7a6a5a';
    ctx.font = isCurrent ? 'bold 11px "Noto Sans SC", sans-serif' : '10px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`阳${bin}`, x + barWidth / 2, h - padding.bottom + 16);
  });

  ctx.fillStyle = '#f5efe6';
  ctx.font = 'bold 12px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText(`第${hexNum}卦「${hex.name}」阳爻分布`, w / 2, 14);

  const chartInfo = document.getElementById('chart-info')!;
  chartInfo.innerHTML = `
    <p>第${hexNum}卦「${hex.name}」含 <strong style="color:#e8c547">${yangCount}</strong> 个阳爻，<strong style="color:#7a5aaa">${yinCount}</strong> 个阴爻</p>
    <p>卦值（二进制）: ${hex.lines.map((l) => l.toString()).join('')} → 十进制 ${hex.lines.reduce((a: number, l: number) => a + l, 0)}</p>
    <p>在64卦中阳爻数量排名: 第${binCounts[yangCount]}位（共有${binCounts[yangCount]}卦含${yangCount}个阳爻）</p>
  `;
}

// ===== AI 导师 =====
async function updateAITutor(hexNum: number) {
  const hex = hexagrams.find((h) => h.number === hexNum);
  if (!hex) return;

  const messages = document.getElementById('tutor-messages')!;
  const userMsg = document.createElement('div');
  userMsg.className = 'tutor-msg user';
  userMsg.innerHTML = `
    <span class="msg-avatar">我</span>
    <div class="msg-bubble"><p>解读第${hexNum}卦「${hex.name}」</p></div>
  `;
  messages.appendChild(userMsg);

  const aiMsg = document.createElement('div');
  aiMsg.className = 'tutor-msg ai';
  aiMsg.innerHTML = `
    <span class="msg-avatar">AI</span>
    <div class="msg-bubble"><p class="typing">正在解读…</p></div>
  `;
  messages.appendChild(aiMsg);
  messages.scrollTop = messages.scrollHeight;

  const config = getApiConfig();
  if (config.apiKey) {
    try {
      const response = await callChatCompletion([
        {
          role: 'system',
          content: '你是一位精通易经、传统中国哲学和数据科学的学者。请用中文回答，风格典雅而富有洞察力，结合传统智慧与现代数据分析视角。回答控制在300字以内。',
        },
        {
          role: 'user',
          content: `请解读第${hex.number}卦「${hex.name}」（${hex.chinese}）。卦象结构：${hex.lines.map((l) => (l === 1 ? '阳爻' : '阴爻')).join('，')}。性质：${hex.nature}。象征：${hex.symbol}。请从传统哲学和数据科学两个角度进行解读。`,
        },
      ], config);
      aiMsg.innerHTML = `
        <span class="msg-avatar">AI</span>
        <div class="msg-bubble"><p>${response}</p></div>
      `;
    } catch (err) {
      aiMsg.innerHTML = `
        <span class="msg-avatar">AI</span>
        <div class="msg-bubble"><p>AI 解读暂时不可用，请检查 API 配置后重试。</p></div>
      `;
    }
  } else {
    setTimeout(() => {
      aiMsg.innerHTML = `
        <span class="msg-avatar">AI</span>
        <div class="msg-bubble">
          <p><strong>${hex.name}卦</strong>（第${hexNum}卦）${hex.chinese}</p>
          <p>${hex.interpretation}</p>
          <p>从数据科学视角：${hex.dataScience}</p>
          <p style="color:var(--gold);margin-top:8px;font-size:11px;">🔑 配置 API Key 可解锁 AI 实时解读</p>
        </div>
      `;
      messages.scrollTop = messages.scrollHeight;
    }, 1200);
  }

  messages.scrollTop = messages.scrollHeight;
}

async function sendTutorMessage() {
  const input = document.getElementById('tutor-input') as HTMLInputElement;
  const text = input.value.trim();
  if (!text || !scene) return;

  const messages = document.getElementById('tutor-messages')!;

  const userMsg = document.createElement('div');
  userMsg.className = 'tutor-msg user';
  userMsg.innerHTML = `
    <span class="msg-avatar">我</span>
    <div class="msg-bubble"><p>${text}</p></div>
  `;
  messages.appendChild(userMsg);
  input.value = '';

  const aiMsg = document.createElement('div');
  aiMsg.className = 'tutor-msg ai';
  aiMsg.innerHTML = `
    <span class="msg-avatar">AI</span>
    <div class="msg-bubble"><p class="typing">思考中…</p></div>
  `;
  messages.appendChild(aiMsg);
  messages.scrollTop = messages.scrollHeight;

  const config = getApiConfig();
  if (config.apiKey) {
    try {
      const response = await callChatCompletion([
        {
          role: 'system',
          content: '你是一位精通易经、传统中国哲学和数据科学的学者。请用中文回答，风格典雅而富有洞察力，结合传统智慧与现代数据分析视角。',
        },
        { role: 'user', content: text },
      ], config);
      aiMsg.innerHTML = `
        <span class="msg-avatar">AI</span>
        <div class="msg-bubble"><p>${response}</p></div>
      `;
    } catch (err) {
      aiMsg.innerHTML = `
        <span class="msg-avatar">AI</span>
        <div class="msg-bubble"><p>AI 回复失败，请检查 API 配置后重试。</p></div>
      `;
    }
  } else {
    setTimeout(() => {
      const hex = hexagrams.find((h) => h.number === selectedHexNum);
      const responses = [
        `从${hex?.name}卦的角度来看，这是一个关于${hex?.nature}的卦象。在数据分析中，这对应于${hex?.name === '乾' ? '最大熵状态' : hex?.name === '坤' ? '最小能量基态' : '过渡态'}的特征分布。`,
        `${hex?.name}卦的六爻结构（${hex?.lines.join('')}）形成了一个独特的模式。如果我们将它映射到六维特征空间，每个爻代表一个维度的激活状态，阳爻为1，阴爻为0。`,
        `在易经的哲学体系中，${hex?.name}卦${hex?.interpretation}这与数据科学中的${hex?.name === '泰' ? '模型收敛' : hex?.name === '否' ? '分布偏移' : '模式识别'}有着深刻的对应关系。`,
        `你可以尝试对比第${selectedHexNum === 1 ? 2 : selectedHexNum === 2 ? 1 : 1}卦和第${selectedHexNum}卦，看看它们在阴阳结构上的互补关系。`,
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      aiMsg.innerHTML = `
        <span class="msg-avatar">AI</span>
        <div class="msg-bubble"><p>${response}</p></div>
      `;
      messages.scrollTop = messages.scrollHeight;
    }, 1500);
  }

  messages.scrollTop = messages.scrollHeight;
}

// ===== 工具函数 =====
function closeAllPanels() {
  infoPanel.classList.add('panel-closed');
  analysisPanel.classList.add('panel-closed');
  tutorPanel.classList.add('panel-closed');
}

function showToast(msg: string) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
    z-index: 400; background: var(--card); border: 1px solid var(--border-gold);
    color: var(--gold); padding: 8px 20px; border-radius: 16px;
    font-size: 12px; backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2s forwards;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ===== 启动 =====
init();
