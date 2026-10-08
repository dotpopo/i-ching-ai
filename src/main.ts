/* ===== 易经 AI 学堂 — 主入口 ===== */
import { IChingScene } from './scene.js';
import { hexagrams, generateHexagramStats } from './data.js';

// ===== 全局状态 =====
let scene: IChingScene | null = null;
let currentTab: 'explore' | 'analysis' | 'ai-tutor' = 'explore';
let selectedHexNum = 1;

// ===== DOM 引用 =====
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

// ===== 初始化 =====
function init() {
  try {
    // 检查 WebGL 支持
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }

    // 创建 3D 场景
    scene = new IChingScene(canvas, {
      onSelect: handleHexagramSelect,
      onHover: handleHexagramHover,
    });
    scene.start();

    // 隐藏加载画面
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
    }, 800);

    // 绑定事件
    bindEvents();
    updateInfoPanel(1);
    drawChart(1);

  } catch (err) {
    console.error('初始化失败:', err);
    loadingOverlay.style.display = 'none';
    errorOverlay.style.display = 'flex';
  }
}

// ===== 事件绑定 =====
function bindEvents() {
  // 鼠标移动
  window.addEventListener('mousemove', (e) => {
    if (!scene) return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    scene.setMouse(nx, ny);
  });

  // 点击
  window.addEventListener('click', (e) => {
    if (!scene) return;
    // 忽略面板区域的点击
    if (e.target instanceof HTMLElement && e.target.closest('#info-panel, #analysis-panel, #tutor-panel')) {
      return;
    }
    const hovered = scene.updateRaycast();
    if (hovered !== null) {
      handleHexagramSelect(hovered);
    }
  });

  // 键盘导航
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
  panelClose.addEventListener('click', () => {
    infoPanel.classList.add('panel-closed');
  });

  analysisClose.addEventListener('click', () => {
    analysisPanel.classList.add('panel-closed');
  });

  tutorClose.addEventListener('click', () => {
    tutorPanel.classList.add('panel-closed');
  });

  // AI 导师输入
  const tutorInput = document.getElementById('tutor-input') as HTMLInputElement;
  const tutorSend = document.getElementById('tutor-send')!;
  tutorSend.addEventListener('click', () => sendTutorMessage());
  tutorInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendTutorMessage();
  });
}

// ===== 卦象选择 =====
function handleHexagramSelect(num: number) {
  selectedHexNum = num;
  updateInfoPanel(num);
  drawChart(num);
  scene?.focusOnHexagram(num);

  // 如果在 AI 导师标签页，更新解读
  if (currentTab === 'ai-tutor') {
    updateAITutor(num);
  }
}

function handleHexagramHover(num: number | null) {
  // 可以在这里添加悬浮提示
  if (num !== null) {
    document.body.style.cursor = 'pointer';
  } else {
    document.body.style.cursor = 'default';
  }
}

// ===== 信息面板更新 =====
function updateInfoPanel(num: number) {
  const hex = hexagrams.find((h) => h.number === num);
  if (!hex) return;

  document.getElementById('hexagram-name')!.textContent = hex.name + '卦';
  document.getElementById('hexagram-number')!.textContent = '#' + hex.number;
  document.getElementById('hexagram-trigrams')!.textContent = hex.chinese;
  document.getElementById('hexagram-nature')!.textContent = hex.nature;
  document.getElementById('hexagram-symbol')!.textContent = hex.symbol;

  // 渲染卦象线条
  const linesContainer = document.getElementById('hexagram-lines')!;
  linesContainer.innerHTML = '';
  hex.lines.forEach((line) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'hex-line ' + (line === 1 ? 'yang' : 'yin');
    linesContainer.appendChild(lineEl);
  });

  // AI 解读
  const aiText = document.getElementById('ai-text')!;
  aiText.innerHTML = `
    <p>${hex.interpretation}</p>
    <p>${hex.dataScience}</p>
  `;

  // 打开信息面板
  infoPanel.classList.remove('panel-closed');
}

// ===== 标签切换 =====
function switchTab(tab: 'explore' | 'analysis' | 'ai-tutor') {
  currentTab = tab;

  // 更新导航按钮
  navBtns.forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab);
  });

  // 隐藏所有面板
  infoPanel.classList.add('panel-closed');
  analysisPanel.classList.add('panel-closed');
  tutorPanel.classList.add('panel-closed');

  // 显示对应面板
  if (tab === 'explore') {
    infoPanel.classList.remove('panel-closed');
  } else if (tab === 'analysis') {
    analysisPanel.classList.remove('panel-closed');
    drawChart(selectedHexNum);
  } else if (tab === 'ai-tutor') {
    tutorPanel.classList.remove('panel-closed');
    updateAITutor(selectedHexNum);
  }
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

  // 清空
  ctx.clearRect(0, 0, w, h);

  // 背景
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, w, h);

  // 获取统计数据
  const stats = generateHexagramStats();
  const hex = hexagrams.find((h) => h.number === hexNum);
  if (!hex) return;

  const yangCount = stats.yangCounts[hexNum - 1];
  const yinCount = 6 - yangCount;

  // 绘制柱状图 — 所有卦的阳爻数量分布
  const bins = [0, 1, 2, 3, 4, 5, 6];
  const binCounts = new Array(7).fill(0);
  stats.yangCounts.forEach((c) => binCounts[c]++);

  const barWidth = chartW / bins.length - 4;
  const maxCount = Math.max(...binCounts);

  // 坐标轴
  ctx.strokeStyle = 'rgba(212,168,83,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, h - padding.bottom);
  ctx.lineTo(w - padding.right, h - padding.bottom);
  ctx.stroke();

  // Y 轴标签
  ctx.fillStyle = '#8a8470';
  ctx.font = '10px Noto Sans SC, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= maxCount; i++) {
    const y = h - padding.bottom - (i / maxCount) * chartH;
    ctx.fillText(i.toString(), padding.left - 8, y + 3);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(212,168,83,0.08)';
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  // 柱状图
  bins.forEach((bin, i) => {
    const x = padding.left + i * (chartW / bins.length) + 2;
    const barH = (binCounts[bin] / maxCount) * chartH;
    const y = h - padding.bottom - barH;

    const isCurrent = bin === yangCount;
    const gradient = ctx.createLinearGradient(x, y, x, h - padding.bottom);
    if (isCurrent) {
      gradient.addColorStop(0, '#d4a853');
      gradient.addColorStop(1, 'rgba(212,168,83,0.2)');
    } else {
      gradient.addColorStop(0, 'rgba(212,168,83,0.5)');
      gradient.addColorStop(1, 'rgba(212,168,83,0.05)');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barH);

    // X 轴标签
    ctx.fillStyle = isCurrent ? '#d4a853' : '#8a8470';
    ctx.font = isCurrent ? 'bold 11px Noto Sans SC, sans-serif' : '10px Noto Sans SC, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`阳${bin}`, x + barWidth / 2, h - padding.bottom + 16);
  });

  // 标题
  ctx.fillStyle = '#f0ebe0';
  ctx.font = 'bold 12px Noto Serif SC, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`第${hexNum}卦「${hex.name}」阳爻分布`, w / 2, 14);

  // 更新图表信息
  const chartInfo = document.getElementById('chart-info')!;
  chartInfo.innerHTML = `
    <p>第${hexNum}卦「${hex.name}」含 <strong style="color:#d4a853">${yangCount}</strong> 个阳爻，<strong style="color:#5b7fa5">${yinCount}</strong> 个阴爻</p>
    <p>卦值（二进制）: ${hex.lines.map(l => l.toString()).join('')} → 十进制 ${hex.lines.reduce((a: number, l: number) => a + l, 0)}</p>
    <p>在64卦中阳爻数量排名: 第${binCounts[yangCount]}位（共有${binCounts[yangCount]}卦含${yangCount}个阳爻）</p>
  `;
}

// ===== AI 导师 =====
function updateAITutor(hexNum: number) {
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

  // 模拟 AI 回复延迟
  const aiMsg = document.createElement('div');
  aiMsg.className = 'tutor-msg ai';
  aiMsg.innerHTML = `
    <span class="msg-avatar">AI</span>
    <div class="msg-bubble"><p class="typing">正在解读…</p></div>
  `;
  messages.appendChild(aiMsg);
  messages.scrollTop = messages.scrollHeight;

  setTimeout(() => {
    aiMsg.innerHTML = `
      <span class="msg-avatar">AI</span>
      <div class="msg-bubble">
        <p><strong>${hex.name}卦</strong>（第${hexNum}卦）${hex.chinese}</p>
        <p>${hex.interpretation}</p>
        <p>从数据科学视角：${hex.dataScience}</p>
        <p style="color:var(--accent);margin-top:8px;font-size:12px;">💡 提示：你可以继续提问，比如"这个卦象与第${hexNum === 1 ? 2 : hexNum - 1}卦有什么关系？"或"用数据科学角度解释这个卦象"</p>
      </div>
    `;
    messages.scrollTop = messages.scrollHeight;
  }, 1200);
}

function sendTutorMessage() {
  const input = document.getElementById('tutor-input') as HTMLInputElement;
  const text = input.value.trim();
  if (!text || !scene) return;

  const messages = document.getElementById('tutor-messages')!;

  // 用户消息
  const userMsg = document.createElement('div');
  userMsg.className = 'tutor-msg user';
  userMsg.innerHTML = `
    <span class="msg-avatar">我</span>
    <div class="msg-bubble"><p>${text}</p></div>
  `;
  messages.appendChild(userMsg);
  input.value = '';

  // AI 回复
  const aiMsg = document.createElement('div');
  aiMsg.className = 'tutor-msg ai';
  aiMsg.innerHTML = `
    <span class="msg-avatar">AI</span>
    <div class="msg-bubble"><p class="typing">思考中…</p></div>
  `;
  messages.appendChild(aiMsg);
  messages.scrollTop = messages.scrollHeight;

  // 模拟 AI 回复
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

// ===== 面板关闭 =====
function closeAllPanels() {
  infoPanel.classList.add('panel-closed');
  analysisPanel.classList.add('panel-closed');
  tutorPanel.classList.add('panel-closed');
}

// ===== 启动 =====
init();
