/* ============================================================
   天机星阵 · 应用主逻辑
   ============================================================ */
import * as THREE from 'three';
import { IChingScene } from './scene.js';
import { hexagrams, generateHexagramStats, TRIGRAMS } from './data.js';
import type { Hexagram } from './data.js';
import {
  getApiConfig,
  saveApiConfig,
  callChatCompletion,
  callMany,
  testConnection,
  probeServer,
} from './api-config.js';
import type { ChatMessage } from './api-config.js';

/* ---------- DOM ---------- */
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>('three-canvas');
const loadingOverlay = $('loading-overlay');
const errorOverlay = $('error-overlay');
const intro = $('intro');
const introEnter = $('intro-enter');
const hoverTooltip = $('hover-tooltip');
const screenFlash = $('screen-flash');
const descentBeam = $('descent-beam');

const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');
const infoPanel = $('info-panel');
const analysisPanel = $('analysis-panel');
const tutorPanel = $('tutor-panel');
const searchLayer = $('search-layer');
const searchInput = $<HTMLInputElement>('search-input');
const searchResults = $('search-results');
const toastLayer = $('toast-layer');

const panelTitle = $('panel-title');
const hexNumber = $('hexagram-number');
const hexTrigrams = $('hexagram-trigrams');
const hexNature = $('hexagram-nature');
const hexSymbol = $('hexagram-symbol');
const hexLines = $('hexagram-lines');
const hexView = $('hex-view');
const panelActions = $('panel-actions');
const aiText = $('ai-text');
const divineBar = $('divine-bar');
const divineTitle = $('divine-title');
const divineSub = $('divine-sub');
const divineBtn = $<HTMLButtonElement>('divine-btn');
const pTabs = document.querySelectorAll<HTMLButtonElement>('.ptab');

const chartInfo = $('chart-info');
const radarCaption = $('radar-caption');

const askCurrent = $('ask-current');
const questionInput = $<HTMLTextAreaElement>('question-input');
const askChips = $('ask-chips');
const generateBtn = $<HTMLButtonElement>('generate-btn');
const cardContainer = $('ai-card-container');
const cardActions = $('card-actions');

const oracleBtn = $('oracle-btn');
const collectionBar = $('collection-bar');

const apiKeyBtn = $('api-key-btn');
const apiModal = $('api-config-modal');
const modalApiKey = $<HTMLInputElement>('modal-api-key');
const modalBaseUrl = $<HTMLInputElement>('modal-base-url');
const modalModelId = $<HTMLInputElement>('modal-model-id');
const modalApiSave = $('modal-api-save');
const modalApiStatus = $('modal-api-status');

const blindboxModal = $('blindbox-modal');
const blindboxCover = $('blindbox-cover');
const blindboxName = $('blindbox-name');
const blindboxNumber = $('blindbox-number');
const blindboxResult = $('blindbox-result');
const blindboxInterpretation = $('blindbox-interpretation');

const shareCard = $('share-card');
const shareCanvas = $<HTMLCanvasElement>('share-canvas');

/* ---------- 状态 ---------- */
type ViewKey = 'classic' | 'modern' | 'plain' | 'action';
type OracleTexts = Record<ViewKey, string>;

let scene: IChingScene | null = null;
let currentTab: 'explore' | 'analysis' | 'tutor' = 'explore';
/** 当前选中的卦号。0 表示还没择卦。 */
let selectedHexNum = 0;
/** 是否已经择卦。false 时面板显示空态，任何依赖卦象的操作都要挡住。 */
let hasSelection = false;
let activeView: ViewKey = 'classic';
let bonded = new Set<number>();
let blindboxHexNum: number | null = null;
let isAiOn = false;
/** AI 凭据来自服务端（用户没在 UI 里填自己的），用于文案区分 */
let aiFromServer = false;
let serverModel = '';
let searchCursor = 0;
let searchMatches: Hexagram[] = [];
let introDone = false;

/** 当前卦的四种解读文本（内置兜底 + 通神后的 AI 版本） */
let oracleTexts: OracleTexts = { classic: '', modern: '', plain: '', action: '' };
/** 通神状态机 */
let divineState: 'idle' | 'loading' | 'done' | 'error' = 'idle';
let divineError = '';
/** 已通神的卦按卦号缓存。翻走再翻回来不重复打接口。 */
const divineCache = new Map<number, OracleTexts>();
let typewriterHandle = 0;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   内置兜底文本（AI 未接通或失败时用）
   ============================================================ */
const PLAIN_TEMPLATES: Record<number, string> = {
  1: '天就像一位很厉害的大家长，罩着整个世界。乾卦在说，做人可以像天那样，有力量，也有分寸。',
  2: '大地妈妈很温柔，她把所有东西都接住，让它们慢慢长大。坤卦在说，温柔也是一种力量。',
  3: '刚学走路的时候总会摔几跤。屯卦在说，开头难是正常的，别急着跑，先站稳。',
  4: '小朋友第一次上学，什么都不懂。蒙卦在说，不懂就问，问多了就懂了。',
  5: '等蛋糕烤好需要时间，掀开盖子只会烤不熟。需卦在说，有些事只能等。',
  6: '吵架的时候，谁都不肯先低头。讼卦在说，把话说开，比赢更重要。',
};

const ACTION_TEMPLATES: Record<number, string> = {
  1: '现在是把状态拉满的时候。像太阳刚升起来，先把最要紧的一件事做漂亮。',
  2: '先听，再答。这段时间最有力的动作不是往前冲，是把别人的话接住。',
  3: '新开始本来就乱。今天只定一个小目标，完成它，比想清楚整条路更有用。',
  4: '带着问题去找人问。你缺的不是能力，是有人给你指一下方向。',
  5: '别催。把能准备的准备好，然后等那个时机自己走到你面前。',
  6: '开口之前先想一句：对方听完会怎么想。这一句能省掉很多麻烦。',
};

function plainFor(hex: Hexagram): string {
  return PLAIN_TEMPLATES[hex.number]
    ?? `${hex.name}卦的处境是「${hex.symbol}」。把它想成天气：${hex.nature}之象，该收的时候收，该动的时候动。`;
}

function actionFor(hex: Hexagram): string {
  return ACTION_TEMPLATES[hex.number]
    ?? `${hex.name}卦提示：先看清自己在哪一步，再决定要不要动。当下最该做的是把「${hex.symbol}」这件事放到台面上想清楚。`;
}

function fallbackTexts(hex: Hexagram): OracleTexts {
  return {
    classic: hex.interpretation,
    modern: hex.dataScience,
    plain: plainFor(hex),
    action: actionFor(hex),
  };
}

/* ============================================================
   初始化
   ============================================================ */
/** 初始化阶段追踪：崩在哪一步能直接看出来 */
const bootTrace: string[] = [];

function stage(label: string, fn: () => void) {
  const t0 = performance.now();
  try {
    fn();
    const line = `${label} ok (${(performance.now() - t0).toFixed(0)}ms)`;
    bootTrace.push(line);
    console.log('[boot]', line);
  } catch (err) {
    const msg = `阶段「${label}」失败：${(err as Error)?.message ?? String(err)}`;
    console.error('[boot]', msg, err);
    throw new Error(msg);
  }
}

function init() {
  try {
    stage('检测 WebGL', () => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) throw new Error('浏览器未提供 WebGL 上下文');
      // 探针用完立刻释放，避免占用一个宝贵的上下文名额
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    });

    stage('读取本地收藏', () => {
      const saved = localStorage.getItem('iching_bonded');
      if (!saved) return;
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) bonded = new Set(arr.filter((n) => typeof n === 'number'));
    });

    stage('读取本地 AI 配置', () => {
      isAiOn = !!getApiConfig().apiKey;
    });

    stage('构建 3D 星阵', () => {
      scene = new IChingScene(canvas, {
        onHover: onHexHover,
        onOrbHover: onOrbHover,
      });
      scene.start();
      // 开发期调试钩子：可在控制台里 scene.renderer.info 看绘制统计，
      // 也可以临时 scene.bloom.enabled = false 做性能对比
      if (import.meta.env.DEV) {
        (window as unknown as { scene?: IChingScene }).scene = scene;
      }
    });

    stage('绑定交互', () => bindEvents());
    stage('渲染首屏', () => showSceneOnly());
    stage('渲染式神录', () => renderBondBar());
    stage('同步 AI 状态', () => syncApiState());
    stage('生成问卜示例', () => buildAskChips());

    setTimeout(() => loadingOverlay.classList.add('is-gone'), 620);
    console.log('[boot] 全部完成', bootTrace.length, '个阶段');

    // 没有自带密钥时，问一下服务端有没有替我配好。
    // 全新设备（手机第一次打开）走的就是这条路。
    void probeServerCredentials();
  } catch (err) {
    console.error('[boot] 初始化失败', err);
    loadingOverlay.classList.add('is-gone');
    const detail = document.getElementById('error-detail');
    if (detail) {
      detail.textContent = (err as Error)?.message ?? '未知错误';
      if (bootTrace.length) {
        detail.textContent += `（已成功：${bootTrace.length} 个阶段，最后一步是「${bootTrace[bootTrace.length - 1]}」）`;
      }
    }
    errorOverlay.hidden = false;
  }
}

/* ============================================================
   事件绑定
   ============================================================ */
function bindEvents() {
  introEnter.addEventListener('click', enterApp);

  /** 屏幕坐标 → NDC。pick() 读的是 scene.mouse，所以必须先瞄准再 pick。 */
  const aimAt = (clientX: number, clientY: number) => {
    scene?.setMouse(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
  };

  window.addEventListener('pointermove', (e) => {
    aimAt(e.clientX, e.clientY);
    hoverTooltip.style.left = `${e.clientX}px`;
    hoverTooltip.style.top = `${e.clientY}px`;
  });

  /* ---------- 画布点击：触摸与鼠标走同一条路 ----------
   * 旧实现只在 pointermove 里更新射线坐标，选中判定挂在 click 上。
   * 但触摸端一次干净的点击**不产生任何 pointermove**
   * （实测事件序列只有 pointerdown → touchstart → pointerup → touchend → click），
   * 于是 pick() 用的还是上一次拖动留下的旧坐标：
   *   旧坐标落在空处 → 点了没反应，要点好几次；
   *   旧坐标落在别的符卡上 → 选中的不是点的那张。
   * 所以两处一起改：
   *   1. pointerdown / pointerup 都用事件自带的坐标重新瞄准；
   *   2. 选中判定从 click 挪到 pointerup，自己判「这是点击还是拖动」。
   */
  /** 手指抖动的容忍半径。旧值 6px 太紧，很多轻点被判成拖动直接吞掉 */
  const TAP_MAX_MOVE_PX = 10;
  /** 超过这个时长算长按 / 转视角，不算点击 */
  const TAP_MAX_MS = 800;

  let downX = 0;
  let downY = 0;
  let downAt = 0;
  let tracking = false;

  canvas.addEventListener('pointerdown', (e) => {
    if (!scene || !introDone) return;
    downX = e.clientX;
    downY = e.clientY;
    downAt = performance.now();
    tracking = true;
    // 按下就瞄准。触摸端没有 hover，这一步让用户当场看到「要选的是哪张」
    // —— 场景每帧自己会 pick()，下一帧高亮与提示条就跟着出来。
    aimAt(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!scene || !introDone || !tracking) return;
    tracking = false;
    if (e.button !== 0) return;                                                    // 只认主接触点
    if (performance.now() - downAt > TAP_MAX_MS) return;                            // 长按
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_MAX_MOVE_PX) return; // 拖动

    aimAt(e.clientX, e.clientY);
    const picked = scene.pick();

    // 灵枢优先。它就是阵心那个"结印求签"的入口，
    // 之前这里只判了卦象，所以悬停有提示、点下去没反应。
    if (picked.orb) {
      scene.pulseOrb();
      void rollOracle();
      return;
    }

    if (picked.hexagram !== null) {
      selectHexagram(picked.hexagram, true);
      return;
    }

    // 射线一张都没打到：多半是手指擦着符卡边落进了缝里。
    // 兜底取投影中心最近的那张，别让用户对着屏幕反复点。
    const near = scene.pickNearest(e.clientX, e.clientY);
    if (near !== null) selectHexagram(near, true);
  });

  // 手势被系统抢走（来电、多指、浏览器返回手势）时别留下悬空状态
  canvas.addEventListener('pointercancel', () => { tracking = false; });

  window.addEventListener('keydown', onKeyDown);

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab as typeof currentTab));
  });

  $('panel-close').addEventListener('click', () => closeInfo());
  $('analysis-close').addEventListener('click', () => analysisPanel.classList.add('is-closed'));
  $('tutor-close').addEventListener('click', () => tutorPanel.classList.add('is-closed'));

  pTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activeView = tab.dataset.view as ViewKey;
      pTabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      renderOracleText(false);
    });
  });

  // 通神：唯一会调 AI 解读的入口
  divineBtn.addEventListener('click', () => {
    void divineHexagram();
  });

  $('collect-btn').addEventListener('click', toggleBond);
  $('ask-btn').addEventListener('click', () => {
    switchTab('tutor');
    questionInput.focus();
  });

  $('search-toggle').addEventListener('click', () => openSearch());
  $('search-close').addEventListener('click', () => closeSearch());
  searchInput.addEventListener('input', runSearch);
  searchInput.addEventListener('keydown', onSearchKey);

  apiKeyBtn.addEventListener('click', openApiModal);
  $('api-config-close').addEventListener('click', closeApiModal);
  apiModal.addEventListener('click', (e) => {
    if (e.target === apiModal) closeApiModal();
  });
  modalApiSave.addEventListener('click', saveApiFromModal);
  [modalApiKey, modalBaseUrl, modalModelId].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') saveApiFromModal();
    });
  });

  oracleBtn.addEventListener('click', () => { void rollOracle(); });
  $('blindbox-close').addEventListener('click', () => blindboxModal.classList.remove('is-on'));
  blindboxModal.addEventListener('click', (e) => {
    if (e.target === blindboxModal) blindboxModal.classList.remove('is-on');
  });
  $('blindbox-share').addEventListener('click', () => {
    blindboxModal.classList.remove('is-on');
    openShareCard();
  });
  $('blindbox-collect').addEventListener('click', () => {
    const num = blindboxHexNum ?? selectedHexNum;
    selectHexagram(num, true);
    if (!bonded.has(num)) toggleBond();
    blindboxModal.classList.remove('is-on');
  });

  $('share-close').addEventListener('click', () => shareCard.classList.remove('is-on'));
  shareCard.addEventListener('click', (e) => {
    if (e.target === shareCard) shareCard.classList.remove('is-on');
  });
  $('share-download').addEventListener('click', downloadShareCard);

  generateBtn.addEventListener('click', generateAnswer);
  questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generateAnswer();
  });
  $('card-download').addEventListener('click', downloadAnswerCard);
  $('card-share').addEventListener('click', shareAnswerCard);

  // 后台/前台：暂停渲染交给 scene 自己处理
  window.addEventListener('beforeunload', () => scene?.dispose());
}

function onKeyDown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';

  if (e.key === 'Escape') {
    closeSearch();
    closeApiModal();
    blindboxModal.classList.remove('is-on');
    shareCard.classList.remove('is-on');
    if (!typing) closeAllPanels();
    return;
  }

  if (typing) return;

  if (e.key === '/' ) {
    e.preventDefault();
    openSearch();
    return;
  }

  if (e.key === ' ') {
    e.preventDefault();
    if (introDone) void rollOracle();
    return;
  }

  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = ((selectedHexNum - 1 + step + 64) % 64) + 1;
    selectHexagram(next, true);
  }
}

function enterApp() {
  introDone = true;
  intro.classList.add('is-gone');
  flash(0.42);
  scene?.triggerBurst(new THREE.Vector3(0, 3, 0));
  showToast('星阵已开 · 点卦象或按空格求签');
}

/* ============================================================
   卦象选择
   ============================================================ */
/** 防重入：选中流程里会碰到 DOM 重建与异步请求，必须挡住递归 */
let selecting = false;

/**
 * 进阵初始状态：只给星阵，不预选任何一卦，也不弹卡片。
 * 面板整块收起，用户点哪一卦，它才滑出来。
 */
function showSceneOnly() {
  hasSelection = false;
  selectedHexNum = 0;

  infoPanel.classList.add('is-closed');
  hexView.hidden = true;
  panelActions.hidden = true;
  hexLines.innerHTML = '';

  panelTitle.textContent = '未择卦';
  hexNumber.textContent = '—';
  hexTrigrams.textContent = '六十四卦星阵';
}

function selectHexagram(num: number, focus: boolean) {
  if (selecting) return;
  selecting = true;
  try {
    selectedHexNum = num;
    hasSelection = true;
    const hex = hexagrams.find((h) => h.number === num);
    if (!hex) return;

    updatePanel(hex);
    drawCharts(num);
    updateAskCurrent(hex);
    if (focus) scene?.focusOnHexagram(num);
    scene?.selectHexagram(num);
  } finally {
    selecting = false;
  }
}

function onHexHover(num: number | null) {
  canvas.style.cursor = num !== null ? 'pointer' : '';
  if (num !== null) {
    const hex = hexagrams.find((h) => h.number === num);
    if (hex) {
      hoverTooltip.textContent = `第 ${num} 卦 · ${hex.name}`;
      hoverTooltip.classList.add('is-on');
    }
  } else {
    hoverTooltip.classList.remove('is-on');
  }
}

function onOrbHover(hovered: boolean) {
  if (hovered) {
    hoverTooltip.textContent = '灵枢 · 点击求签';
    hoverTooltip.classList.add('is-on');
    canvas.style.cursor = 'pointer';
  } else {
    hoverTooltip.classList.remove('is-on');
    canvas.style.cursor = '';
  }
}

/* ============================================================
   详情面板
   ============================================================ */
function updatePanel(hex: Hexagram) {
  panelTitle.textContent = hex.name;
  hexNumber.textContent = `#${hex.number}`;
  // 卦名全称 + 上下卦符号，让「☴上☰下」和六爻图能当场对照
  hexTrigrams.textContent =
    `${hex.chinese} · ${TRIGRAMS[hex.upper].glyph}上${TRIGRAMS[hex.lower].glyph}下`;
  hexNature.textContent = hex.nature;
  hexSymbol.textContent = hex.symbol;

  hexLines.innerHTML = '';
  hex.lines.forEach((line) => {
    const el = document.createElement('div');
    el.className = `hex-line ${line === 1 ? 'yang' : 'yin'}`;
    hexLines.appendChild(el);
  });

  infoPanel.classList.remove('is-closed');
  hexView.hidden = false;
  panelActions.hidden = false;
  syncCollectBtn();

  // 通神结果按卦缓存；没通过神就显示内置文本。
  // 注意这里**不**调 AI：通神是用户主动动作，见 divineHexagram。
  const cached = divineCache.get(hex.number);
  oracleTexts = cached ?? fallbackTexts(hex);
  divineState = cached ? 'done' : 'idle';
  divineError = '';
  renderOracleText(true);
  renderDivineBar();
}

function closeInfo() {
  infoPanel.classList.add('is-closed');
}

function closeAllPanels() {
  closeInfo();
  analysisPanel.classList.add('is-closed');
  tutorPanel.classList.add('is-closed');
}

/* ---------- 解读文本渲染 ---------- */
function renderOracleText(withTypewriter: boolean) {
  const text = oracleTexts[activeView] || '（暂无内容）';
  if (typewriterHandle) {
    cancelAnimationFrame(typewriterHandle);
    typewriterHandle = 0;
  }

  const html = text.split('\n').filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join('');

  if (!withTypewriter || reducedMotion) {
    aiText.innerHTML = html;
    return;
  }

  // 打字机：按块揭示，避免逐字卡顿
  const plain = text.split('\n').filter(Boolean);
  let idx = 0;
  aiText.innerHTML = '<p class="is-pending"><span class="type-caret"></span></p>';

  const step = () => {
    idx += 1;
    const shown = plain.slice(0, idx).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    aiText.innerHTML = idx >= plain.length
      ? shown
      : shown + '<p class="is-pending"><span class="type-caret"></span></p>';
    if (idx < plain.length) {
      typewriterHandle = requestAnimationFrame(() => setTimeout(step, 55));
    } else {
      typewriterHandle = 0;
    }
  };
  step();
}

/* ---------- 神谕话术：把技术报错翻成界面口径 ----------
 * AI 报错原来是原样抛给用户的（「AI 调用失败：请求超时（超过 45 秒）」），
 * 在「天机星阵」这套氛围里很出戏。这里统一翻成神谕口径。
 *
 * 只翻译，不吞错：原始报错一律 console.warn 留档。
 * 话术是给用户看的，排查靠控制台 —— 两者不要混在一起。
 */
const ORACLE_ERROR_SCRIPT: Array<{ test: RegExp; say: string }> = [
  { test: /NO_SERVER_CREDENTIALS|还没有配好|未配置/,     say: '神谕尚未接通，点右上角「AI」填入密钥。' },
  { test: /401|403|invalid_api_key|unauthorized|密钥/,  say: '神谕不认这枚印，点右上角「AI」重新填写密钥。' },
  { test: /429|限流|rate.?limit|quota|额度/,             say: '问卜的人太多，仙官一时忙不过来，歇口气再通。' },
  { test: /超时|timeout|abort/i,                         say: '天机推演太久，神谕暂且收了讯，稍后再通一次。' },
  { test: /代理通道|proxy|network|fetch/i,               say: '神谕的回音没能接上，再通一次。' },
  { test: /50\d|上游|网关|服务端/,                       say: '天机紊乱，卦象未能展开，再通一次。' },
  { test: /没有解析到文本|非 JSON|响应体为空/,            say: '神谕回音散乱，未能成句，再通一次。' },
];

function oracleErrorSay(raw: string): string {
  console.warn('[神谕] 原始报错：', raw);
  return ORACLE_ERROR_SCRIPT.find((r) => r.test.test(raw))?.say
    ?? '神谕此刻不应，稍后再通一次。';
}

/* ---------- 主动通神：四维解读 ---------- */
/**
 * 通神是**用户主动动作**，不再自动触发。
 *
 * 之前每进一次页面、每滑一卦都会自动打 4 个请求出去，接口消耗极快。
 * 现在只有点「通神」按钮才调用，结果按卦号缓存，翻回来不重复请求。
 */
async function divineHexagram() {
  const hex = hexagrams.find((h) => h.number === selectedHexNum);
  if (!hex || divineState === 'loading') return;

  if (!isAiOn) {
    divineState = 'error';
    divineError = '神谕尚未接通，点右上角「AI」填入密钥。';
    renderDivineBar();
    return;
  }

  divineState = 'loading';
  divineError = '';
  renderDivineBar();

  const lineStr = hex.lines.map((l) => (l === 1 ? '阳爻' : '阴爻')).join('，');
  const base = `第${hex.number}卦「${hex.name}」（${hex.chinese}）。六爻自下而上：${lineStr}。卦性：${hex.nature}。取象：${hex.symbol}。`;

  const sys: ChatMessage = {
    role: 'system',
    content:
      '你是「天机星阵」的解卦者，风格介于阴阳师与东方哲人之间：庄重、有画面感、不装神弄鬼。用简体中文作答，直接给正文，不要标题、不要 markdown 记号、不要复述题目。',
  };

  const prompts = [
    {
      key: 'classic' as ViewKey,
      fallback: hex.interpretation,
      // 提示词只要 180 字，给 1200 tokens 纯属浪费，网关生成时间会成倍拉长
      maxTokens: 460,
      messages: [
        sys,
        {
          role: 'user' as const,
          content: `${base}\n\n请以易学古义解这一卦：讲清卦体结构（上下卦的关系）、象与辞的呼应，以及它在六十四卦序列中的位置。180 字以内。`,
        },
      ],
    },
    {
      key: 'modern' as ViewKey,
      fallback: hex.dataScience,
      maxTokens: 460,
      messages: [
        sys,
        {
          role: 'user' as const,
          content: `${base}\n\n请把这一卦翻译成现代系统语言：用系统状态、反馈回路、能量分布、不确定性这类概念类比它的结构，让人看懂这一卦在讲什么机制。180 字以内。`,
        },
      ],
    },
    {
      key: 'plain' as ViewKey,
      fallback: plainFor(hex),
      maxTokens: 300,
      messages: [
        sys,
        {
          role: 'user' as const,
          content: `${base}\n\n请用大白话讲给一个完全没接触过易经的人，用一个日常场景做比喻（不要用「就像人生一样」这种空话）。120 字以内。`,
        },
      ],
    },
    {
      key: 'action' as ViewKey,
      fallback: actionFor(hex),
      maxTokens: 420,
      messages: [
        sys,
        {
          role: 'user' as const,
          content: `${base}\n\n请给出这一卦对应到当下生活的具体行止建议：该做什么、不该做什么、什么时候动。要可执行，不要空泛。150 字以内。`,
        },
      ],
    },
  ];

  // 网关可能慢到几十秒，超过 8 秒就告诉用户在等什么，别让人以为卡死了
  const slowHint = window.setTimeout(() => {
    if (divineState === 'loading') divineSub.textContent = '天机推演较慢，仍在等…';
  }, 8000);

  const { results, failed, lastError } = await callMany(prompts, getApiConfig());
  window.clearTimeout(slowHint);

  // 只要有一条成功就写进缓存。哪怕用户中途切走了，下次翻回来直接可用。
  if (failed < prompts.length) divineCache.set(hex.number, results as OracleTexts);

  // 用户可能已经切到别的卦了，那就只留缓存，不动界面
  if (selectedHexNum !== hex.number) return;

  if (failed === prompts.length) {
    divineState = 'error';
    divineError = oracleErrorSay(lastError || '未知错误');
    renderDivineBar();
    return;
  }

  oracleTexts = results as OracleTexts;
  divineState = 'done';
  // 部分失败只报「哪几条没通上」，不把技术原因摆到台面上；原因进控制台。
  if (failed > 0) console.warn('[神谕] 部分维度失败：', lastError);
  divineError = failed > 0
    ? `其中 ${failed}/${prompts.length} 条未能通神，这几条仍用内置解读。`
    : '';
  renderOracleText(true);
  renderDivineBar();
}

/** 同步通神栏的状态与文案 */
function renderDivineBar() {
  if (!hasSelection) return; // 空态下通神栏整块是隐藏的
  const hasCache = divineCache.has(selectedHexNum);

  divineBar.classList.toggle('is-loading', divineState === 'loading');
  divineBar.classList.toggle('is-done', divineState === 'done');
  divineBar.classList.toggle('is-error', divineState === 'error');
  divineBtn.disabled = divineState === 'loading';

  if (divineState === 'loading') {
    divineTitle.textContent = '通神中';
    divineSub.textContent = '正在请这一卦展开，四路并行，稍候。';
    divineBtn.textContent = '通神中';
    return;
  }

  if (divineState === 'error') {
    divineTitle.textContent = '通神未成';
    divineSub.textContent = divineError || '神谕此刻不应，稍后再通一次。';
    divineBtn.textContent = '重试';
    return;
  }

  if (divineState === 'done' || hasCache) {
    divineTitle.textContent = '已通神';
    divineSub.textContent = divineError || '以上四维由 AI 就这一卦生成。切走再回来不会重复请求。';
    divineBtn.textContent = '再通一次';
    return;
  }

  divineTitle.textContent = '未通神';
  divineSub.textContent = isAiOn
    ? '下面是内置解读。想让 AI 就这一卦展开，点右边。'
    : '下面是内置解读。神谕未接通，点右上角「AI」可配置。';
  divineBtn.textContent = '通 神';
}

/* ============================================================
   标签切换
   ============================================================ */
function switchTab(tab: typeof currentTab) {
  currentTab = tab;
  navBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));

  closeInfo();
  analysisPanel.classList.add('is-closed');
  tutorPanel.classList.add('is-closed');

  if (tab === 'explore') {
    if (hasSelection) {
      infoPanel.classList.remove('is-closed');
    } else {
      // 还没择卦就不给空卡片，提示用户直接看星阵
      showToast('点阵中任意一卦开始');
    }
  } else if (tab === 'analysis') {
    analysisPanel.classList.remove('is-closed');
    if (hasSelection) drawCharts(selectedHexNum);
    else renderChartEmpty();
  } else {
    tutorPanel.classList.remove('is-closed');
    const hex = hasSelection ? hexagrams.find((h) => h.number === selectedHexNum) : undefined;
    if (hex) {
      updateAskCurrent(hex);
    } else {
      askCurrent.innerHTML = '<b>未择卦</b><span>先回「卦象」页点一卦，再来问卜</span>';
    }
  }
}

/** 还没择卦时，命盘显示提示而不是空白画布 */
function renderChartEmpty() {
  const chart = document.getElementById('chart-canvas') as HTMLCanvasElement | null;
  const radar = document.getElementById('radar-canvas') as HTMLCanvasElement | null;
  chart?.getContext('2d')?.clearRect(0, 0, chart.width, chart.height);
  radar?.getContext('2d')?.clearRect(0, 0, radar.width, radar.height);
  chartInfo.innerHTML =
    '<p><span class="k">提示</span> 先回「卦象」页点一卦，命盘就会显示它的结构与分布。</p>';
  radarCaption.textContent = '';
}

/* ============================================================
   搜索
   ============================================================ */
function openSearch() {
  searchLayer.classList.remove('is-hidden');
  searchInput.value = '';
  searchResults.innerHTML = '';
  searchMatches = [];
  searchCursor = 0;
  searchInput.focus();
}

function closeSearch() {
  searchLayer.classList.add('is-hidden');
}

/* ---------- 搜索 ----------
 * 匹配字段：卦序 / 卦名 / 卦名全称 / 卦性 / 上下卦 / 取象 / 古义。
 *
 * 为什么要做相关性排序：
 * 原来是「任意字段包含子串」就命中，然后按卦序排列，再 slice(0, 12)。
 * 八卦名本身就是上下卦的名字（例如「巽」），所以搜「巽」会命中 15 条
 * ——所有含巽这一卦的卦。而巽卦自己按卦序排在第 13 位，正好被截断丢掉，
 * 于是「搜卦名搜不到那一卦」。搜「风」「水」同理（16 条，巽 / 未济被截）。
 *
 * 修法两步：先按相关度打分排序，再截断。精确命中永远在最前面，
 * 同一层的按卦序排，保证结果稳定。
 */
const SEARCH_MAX = 12;

/** 分数越高越靠前；0 表示不命中 */
function searchScore(hex: Hexagram, q: string): number {
  if (String(hex.number) === q || `#${hex.number}` === q) return 100;
  const name = hex.name.toLowerCase();
  if (name === q) return 90;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 70;
  if (hex.chinese.toLowerCase().includes(q)) return 60;
  if (hex.nature.includes(q)) return 50;
  if (hex.trigrams.some((t) => t.includes(q))) return 40;
  if (hex.symbol.includes(q)) return 30;
  if (hex.interpretation.toLowerCase().includes(q)) return 20;
  return 0;
}

function runSearch() {
  const q = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = '';
  if (!q) {
    searchMatches = [];
    return;
  }

  searchMatches = hexagrams
    .map((hex) => ({ hex, score: searchScore(hex, q) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.hex.number - b.hex.number)
    .slice(0, SEARCH_MAX)
    .map((r) => r.hex);

  searchCursor = 0;
  searchMatches.forEach((hex, i) => {
    const btn = document.createElement('button');
    btn.className = `sr-item${i === 0 ? ' is-cursor' : ''}`;
    btn.setAttribute('role', 'option');
    btn.innerHTML = `
      <span class="sr-num">#${hex.number}</span>
      <span class="sr-name">${escapeHtml(hex.name)}</span>
      <span class="sr-meta">${escapeHtml(hex.chinese)} · ${escapeHtml(hex.symbol)}</span>
      <span class="sr-lines">${hex.lines.map((l) => `<i class="${l === 1 ? '' : 'yin'}"></i>`).join('')}</span>
    `;
    btn.addEventListener('click', () => {
      selectHexagram(hex.number, true);
      closeSearch();
    });
    searchResults.appendChild(btn);
  });
}

function onSearchKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!searchMatches.length) return;
    searchCursor = (searchCursor + (e.key === 'ArrowDown' ? 1 : -1) + searchMatches.length) % searchMatches.length;
    [...searchResults.children].forEach((el, i) => el.classList.toggle('is-cursor', i === searchCursor));
    (searchResults.children[searchCursor] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const hit = searchMatches[searchCursor];
    if (hit) {
      selectHexagram(hit.number, true);
      closeSearch();
    }
  }
}

/* ============================================================
   求签
   ============================================================ */
const SIGN_W = 22;
const SIGN_H = 104;
/** 仪式进行中，挡住重复点击 */
let casting = false;

/**
 * 求签仪式：签从按钮里被抖出来，划一道弧到上方，再坠下，
 * 落定那一刻爆一圈光，签本身化作卡片。
 *
 * 用 Web Animations API 而不是 CSS 类，因为路径要按按钮的实际位置算，
 * 而且要靠 `finished` 精确串起"飞 → 坠 → 落定 → 翻牌"四段。
 */
async function playSignRitual(): Promise<void> {
  if (reducedMotion) return;

  const from = oracleBtn.getBoundingClientRect();
  const startX = from.left + from.width / 2 - SIGN_W / 2;
  const startY = from.top + from.height / 2 - SIGN_H / 2;

  const cx = window.innerWidth / 2 - SIGN_W / 2;
  const apexY = Math.max(72, window.innerHeight * 0.16);
  const landY = window.innerHeight * 0.44 - SIGN_H / 2;

  const stick = document.createElement('div');
  stick.className = 'sign-stick';
  stick.style.inlineSize = `${SIGN_W}px`;
  stick.style.blockSize = `${SIGN_H}px`;
  document.body.appendChild(stick);

  // ① 从按钮里飞出，划弧到屏幕上方
  await stick.animate([
    { transform: `translate(${startX}px, ${startY}px) rotate(0deg) scale(0.5)`, opacity: 0 },
    { transform: `translate(${startX}px, ${startY - 72}px) rotate(-24deg) scale(1)`, opacity: 1, offset: 0.28 },
    { transform: `translate(${(startX + cx) / 2}px, ${apexY}px) rotate(215deg) scale(1.06)`, opacity: 1, offset: 0.72 },
    { transform: `translate(${cx}px, ${apexY + 46}px) rotate(360deg) scale(1)`, opacity: 1 },
  ], { duration: 640, easing: 'cubic-bezier(0.2, 0.85, 0.3, 1)', fill: 'forwards' }).finished;

  // ② 坠下
  await stick.animate([
    { transform: `translate(${cx}px, ${apexY + 46}px) rotate(360deg) scale(1)`, opacity: 1 },
    { transform: `translate(${cx}px, ${landY}px) rotate(524deg) scale(1.03)`, opacity: 1 },
  ], { duration: 500, easing: 'cubic-bezier(0.45, 0, 0.85, 0.55)', fill: 'forwards' }).finished;

  // ③ 落定：冲击波 + 火星 + 一层金光
  spawnSignBurst(cx + SIGN_W / 2, landY + SIGN_H / 2);
  flash(0.55);

  // ④ 签化作卡片：放大淡出
  await stick.animate([
    { transform: `translate(${cx}px, ${landY}px) rotate(524deg) scale(1.03)`, opacity: 1 },
    { transform: `translate(${cx}px, ${landY}px) rotate(566deg) scale(1.55)`, opacity: 0 },
  ], { duration: 280, easing: 'ease-out', fill: 'forwards' }).finished;

  stick.remove();
}

/** 落定那一刻的冲击波与火星 */
function spawnSignBurst(x: number, y: number) {
  const ring = document.createElement('div');
  ring.className = 'sign-ring';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  document.body.appendChild(ring);
  ring.animate([
    { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 },
    { transform: 'translate(-50%, -50%) scale(3.4)', opacity: 0 },
  ], { duration: 640, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }).onfinish = () => ring.remove();

  const COUNT = 16;
  for (let i = 0; i < COUNT; i++) {
    const spark = document.createElement('span');
    spark.className = 'sign-spark';
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    document.body.appendChild(spark);

    const a = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
    const d = 44 + Math.random() * 76;
    spark.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      {
        transform: `translate(calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * d).toFixed(1)}px)) scale(0.2)`,
        opacity: 0,
      },
    ], {
      duration: 520 + Math.random() * 280,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    }).onfinish = () => spark.remove();
  }
}

async function rollOracle() {
  if (!introDone || casting) return;

  // 保底让乾、坤更容易出现，其余均匀
  const roll = Math.random();
  let num: number;
  if (roll < 0.08) num = 1;
  else if (roll < 0.16) num = 2;
  else num = Math.floor(Math.random() * 64) + 1;

  blindboxHexNum = num;
  const hex = hexagrams.find((h) => h.number === num);
  if (!hex) return;

  // 星阵先反应，签在飞的过程中就能看到选中那一卦亮起来
  selectHexagram(num, true);

  casting = true;
  oracleBtn.classList.add('is-casting');
  try {
    await playSignRitual();
  } finally {
    casting = false;
    oracleBtn.classList.remove('is-casting');
  }

  blindboxCover.classList.remove('is-shaking');
  void blindboxCover.offsetWidth;
  blindboxCover.classList.add('is-shaking');

  blindboxName.textContent = `${hex.name}卦`;
  blindboxNumber.textContent = `第 ${hex.number} 卦 · ${hex.chinese} · ${hex.nature}`;
  blindboxResult.innerHTML = hex.lines.map((l) => `<i class="${l === 1 ? '' : 'yin'}"></i>`).join('');
  blindboxInterpretation.textContent = hex.interpretation;

  blindboxModal.classList.add('is-on');
  beamPulse();
}

function flash(amount: number) {
  if (reducedMotion) return;
  screenFlash.style.opacity = String(amount);
  setTimeout(() => { screenFlash.style.opacity = '0'; }, 140);
}

function beamPulse() {
  descentBeam.classList.add('is-on');
  setTimeout(() => descentBeam.classList.remove('is-on'), 900);
}

/* ============================================================
   结缘（收藏）
   ============================================================ */
function toggleBond() {
  const hex = hexagrams.find((h) => h.number === selectedHexNum);
  if (!hex) return;

  if (bonded.has(selectedHexNum)) {
    bonded.delete(selectedHexNum);
    showToast(`已解缘 ${hex.name}卦`);
  } else {
    bonded.add(selectedHexNum);
    showToast(`与 ${hex.name}卦 结缘`);
  }

  try {
    localStorage.setItem('iching_bonded', JSON.stringify([...bonded]));
  } catch { /* 存不进去就算了 */ }

  renderBondBar();
  syncCollectBtn();
}

function renderBondBar() {
  collectionBar.innerHTML = '';
  [...bonded].slice(-14).forEach((num) => {
    const hex = hexagrams.find((h) => h.number === num);
    if (!hex) return;
    const dot = document.createElement('button');
    dot.className = 'bond-dot';
    dot.textContent = hex.name;
    dot.title = `第 ${num} 卦 ${hex.name}卦`;
    dot.setAttribute('aria-label', `跳到第 ${num} 卦 ${hex.name}卦`);
    dot.addEventListener('click', () => selectHexagram(num, true));
    collectionBar.appendChild(dot);
  });
}

function syncCollectBtn() {
  const btn = $('collect-btn');
  const isBonded = bonded.has(selectedHexNum);
  btn.innerHTML = `<span class="act-ico">${isBonded ? '解' : '缘'}</span>${isBonded ? '解开此缘' : '结缘收藏'}`;
}

/* ============================================================
   图表：阳爻分布 + 六爻能量
   ============================================================ */
function drawCharts(num: number) {
  drawHistogram(num);
  drawRadar(num);
}

function fitCanvas(cv: HTMLCanvasElement) {
  const rect = cv.parentElement!.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio, 2);
  cv.width = Math.max(1, Math.round(rect.width * dpr));
  cv.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function drawHistogram(num: number) {
  const cv = document.getElementById('chart-canvas') as HTMLCanvasElement | null;
  if (!cv) return;
  const { ctx, w, h } = fitCanvas(cv);
  ctx.clearRect(0, 0, w, h);

  const stats = generateHexagramStats();
  const hex = hexagrams.find((x) => x.number === num);
  if (!hex) return;

  const yangCount = hex.lines.reduce((a: number, l) => a + l, 0);
  const bins = [0, 1, 2, 3, 4, 5, 6];
  const counts = new Array(7).fill(0);
  stats.yangCounts.forEach((c: number) => { counts[c] += 1; });
  const maxCount = Math.max(...counts);

  const pad = { top: 18, right: 14, bottom: 30, left: 30 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  // 基线
  ctx.strokeStyle = 'rgba(240,200,105,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + ch);
  ctx.lineTo(pad.left + cw, pad.top + ch);
  ctx.stroke();

  const slot = cw / bins.length;
  const barW = slot * 0.52;

  bins.forEach((bin, i) => {
    const value = counts[bin];
    const bh = maxCount ? (value / maxCount) * ch : 0;
    const x = pad.left + i * slot + (slot - barW) / 2;
    const y = pad.top + ch - bh;
    const isCurrent = bin === yangCount;

    const grad = ctx.createLinearGradient(x, y, x, pad.top + ch);
    if (isCurrent) {
      grad.addColorStop(0, '#f0c869');
      grad.addColorStop(1, 'rgba(232,56,79,0.5)');
    } else {
      grad.addColorStop(0, 'rgba(169,127,232,0.7)');
      grad.addColorStop(1, 'rgba(169,127,232,0.08)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, Math.max(bh, 1));

    if (isCurrent) {
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x - 0.5, y - 0.5, barW + 1, bh + 1);
    }

    ctx.fillStyle = isCurrent ? '#ffe9a8' : 'rgba(139,135,121,0.9)';
    ctx.font = isCurrent ? '700 11px "Zen Maru Gothic", sans-serif' : '11px "Zen Maru Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${bin}`, x + barW / 2, pad.top + ch + 18);

    ctx.fillStyle = isCurrent ? '#ffe9a8' : 'rgba(139,135,121,0.75)';
    ctx.font = '10px "Zen Maru Gothic", sans-serif';
    ctx.fillText(String(value), x + barW / 2, y - 5);
  });

  ctx.fillStyle = 'rgba(139,135,121,0.9)';
  ctx.font = '10px "Zen Maru Gothic", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('阳爻个数', pad.left, 11);

  const rank = bins.filter((b) => b > yangCount).reduce((acc, b) => acc + counts[b], 0) + 1;

  chartInfo.innerHTML = `
    <p><span class="k">结构</span> 第 <b>${num}</b> 卦「${hex.name}」含 <b>${yangCount}</b> 阳爻、<b>${6 - yangCount}</b> 阴爻</p>
    <p><span class="k">卦值</span> 自下而上 ${hex.lines.map((l) => (l === 1 ? '1' : '0')).join('')}，十进制 <b>${hex.lines.reduce((a: number, l, i) => a + (l << i), 0)}</b></p>
    <p><span class="k">分布</span> 全阵 ${counts[yangCount]} 卦同为 ${yangCount} 阳，本卦按阳爻数排第 <b>${rank}</b> 位</p>
    <p><span class="k">对照</span> 六十四卦平均阳爻数 <b>${stats.avgYang.toFixed(2)}</b>，本卦${yangCount > stats.avgYang ? '高于' : yangCount < stats.avgYang ? '低于' : '持平'}</p>
  `;
}

function drawRadar(num: number) {
  const cv = document.getElementById('radar-canvas') as HTMLCanvasElement | null;
  if (!cv) return;
  const { ctx, w, h } = fitCanvas(cv);
  ctx.clearRect(0, 0, w, h);

  const hex = hexagrams.find((x) => x.number === num);
  if (!hex) return;

  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2 - 34;
  const N = 6;
  const labels = ['初', '二', '三', '四', '五', '上'];

  // 网格：同心六边形
  for (let ring = 1; ring <= 4; ring++) {
    const r = (R * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(169,127,232,${0.1 + ring * 0.045})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 辐条
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.strokeStyle = 'rgba(240,200,105,0.14)';
    ctx.stroke();
  }

  // 全阵均值参考（每爻位置的阳爻比例）
  const avgRatio: number[] = [];
  for (let pos = 0; pos < N; pos++) {
    const ones = hexagrams.reduce((acc: number, x) => acc + x.lines[pos], 0);
    avgRatio.push(ones / hexagrams.length);
  }

  const polyFor = (vals: number[], stroke: string, fill: string) => {
    ctx.beginPath();
    vals.forEach((v, i) => {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const r = R * Math.max(0.06, v);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  };

  // 均值虚线层
  ctx.setLineDash([4, 4]);
  polyFor(avgRatio, 'rgba(94,234,212,0.55)', 'rgba(94,234,212,0.06)');
  ctx.setLineDash([]);

  // 本卦层
  const vals = hex.lines.map((l) => (l === 1 ? 1 : 0.42));
  polyFor(vals, 'rgba(240,200,105,0.95)', 'rgba(240,200,105,0.16)');

  // 顶点标记
  vals.forEach((v, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = R * v;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = hex.lines[i] === 1 ? '#ffe9a8' : '#a97fe8';
    ctx.fill();
  });

  // 轴标签
  ctx.font = '600 11px "Shippori Mincho", "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  labels.forEach((label, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * (R + 20);
    const y = cy + Math.sin(a) * (R + 20);
    ctx.fillStyle = hex.lines[i] === 1 ? 'rgba(255,233,168,0.95)' : 'rgba(169,127,232,0.9)';
    ctx.fillText(`${label}${hex.lines[i] === 1 ? '阳' : '阴'}`, x, y);
  });

  const yang = hex.lines.reduce((a: number, l) => a + l, 0);
  const strongest = hex.lines.reduce((best: number, l, i) => (l === 1 && avgRatio[i] < avgRatio[best] ? i : best), 0);
  radarCaption.textContent =
    `金色为本卦（阳爻满格、阴爻收至 42%），青色虚线是全阵六十四卦在各爻位的平均阳爻比例。` +
    `本卦 ${yang} 阳 ${6 - yang} 阴；第 ${strongest + 1} 爻（${labels[strongest]}爻）是全阵最罕见的阳位，这一爻的分量比别处重。`;
}

/* ============================================================
   神谕问卜
   ============================================================ */
function buildAskChips() {
  const samples = [
    '这次转岗该不该去？',
    '手里的项目还要不要继续投入？',
    '和这个人的关系会怎么走？',
    '现在适合开始新的事情吗？',
    '近期最该提防什么？',
  ];
  samples.forEach((text) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      questionInput.value = text;
      questionInput.focus();
    });
    askChips.appendChild(chip);
  });
}

function updateAskCurrent(hex: Hexagram) {
  askCurrent.innerHTML = `
    <b>${escapeHtml(hex.name)}卦</b>
    <span>第 ${hex.number} 卦 · ${escapeHtml(hex.chinese)}</span>
    <span class="ac-lines">${hex.lines.map((l) => `<i class="${l === 1 ? '' : 'yin'}"></i>`).join('')}</span>
  `;
}

async function generateAnswer() {
  if (!hasSelection) {
    showToast('先回「卦象」页点一卦');
    switchTab('explore');
    return;
  }

  const question = questionInput.value.trim();
  if (!question) {
    showToast('先写下你要问的事');
    questionInput.focus();
    return;
  }

  const hex = hexagrams.find((h) => h.number === selectedHexNum);
  if (!hex) return;

  const config = getApiConfig();

  // 没接通时（自带密钥和服务端凭据都没有）退回内置文本，但仍然给一张卡
  if (!isAiOn) {
    renderAnswerCard(
      hex,
      question,
      `${hex.interpretation}\n\n就你问的这件事，${hex.name}卦的意思偏向「${hex.symbol}」。先按这个方向想一想，接通 AI 后能得到更贴合你处境的一段话。`,
      '神谕未接通，当前是内置文本。点右上角「AI」填入密钥即可实时生成。'
    );
    cardActions.hidden = false;
    return;
  }

  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span class="act-ico">卜</span>起卦中…';
  cardContainer.innerHTML = '<div class="card-placeholder"><div class="skeleton"><div class="sk-line"></div><div class="sk-line"></div><div class="sk-line"></div><div class="sk-line"></div></div></div>';
  cardActions.hidden = true;

  try {
    const text = await callChatCompletion(
      [
        {
          role: 'system',
          content:
            '你是「天机星阵」的解卦者，兼有阴阳师的仪式感与咨询师的务实。你会把卦象结构对应到提问者的具体处境上，给判断也给理由。简体中文，直接给正文，不要标题与 markdown 记号，220 字以内。',
        },
        {
          role: 'user',
          content:
            `所问：${question}\n\n卦象：第${hex.number}卦「${hex.name}」（${hex.chinese}）\n` +
            `六爻自下而上：${hex.lines.map((l) => (l === 1 ? '阳' : '阴')).join('')}\n` +
            `卦性：${hex.nature}｜取象：${hex.symbol}\n` +
            `古义参考：${hex.interpretation}\n\n` +
            `请结合所问，指出这一卦在讲什么处境、当事人在其中处于哪一步、接下来宜与不宜。`,
        },
      ],
      config,
      520
    );
    renderAnswerCard(hex, question, text, '');
  } catch (err) {
    renderAnswerCard(
      hex,
      question,
      `${hex.interpretation}\n\n就你问的这件事，${hex.name}卦的意思偏向「${hex.symbol}」。`,
      oracleErrorSay((err as Error)?.message || '未知错误')
    );
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span class="act-ico">卜</span>起 卦 问 神';
  }
}

function renderAnswerCard(hex: Hexagram, question: string, body: string, errorText: string) {
  const now = new Date();
  const stamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  cardContainer.innerHTML = `
    <div class="answer-card">
      <div class="ac-top">
        <span class="ac-hex">${hex.lines.map((l) => `<i class="${l === 1 ? '' : 'yin'}"></i>`).join('')}</span>
        <div>
          <div class="ac-name">${escapeHtml(hex.name)}卦</div>
          <div class="ac-sub">第 ${hex.number} 卦 · ${escapeHtml(hex.chinese)} · ${escapeHtml(hex.nature)}</div>
        </div>
      </div>
      <div class="ac-q">「${escapeHtml(question)}」</div>
      ${errorText ? `<div class="ac-err">${escapeHtml(errorText)}</div>` : ''}
      <div class="ac-body">${escapeHtml(body).replace(/\n/g, '<br/>')}</div>
      <div class="ac-foot"><span>天机星阵 · 专属解签</span><span>${stamp}</span></div>
    </div>
  `;
  cardActions.hidden = false;
}

/* ============================================================
   分享符卡
   ============================================================ */
function openShareCard() {
  const num = blindboxHexNum ?? selectedHexNum;
  const hex = hexagrams.find((h) => h.number === num);
  if (!hex) return;
  drawShareCard(hex, oracleTexts.classic || hex.interpretation);
  shareCard.classList.add('is-on');
}

function drawShareCard(hex: Hexagram, text: string) {
  paintCard(shareCanvas, hex, text);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const ch of text.replace(/\n/g, '')) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}

function downloadShareCard() {
  const num = blindboxHexNum ?? selectedHexNum;
  const hex = hexagrams.find((h) => h.number === num);
  const link = document.createElement('a');
  link.download = `天机星阵-${hex?.name ?? 'hex'}.png`;
  link.href = shareCanvas.toDataURL('image/png');
  link.click();
  showToast('符卡已保存');
}

function downloadAnswerCard() {
  const hex = hexagrams.find((h) => h.number === selectedHexNum);
  if (!hex) return;
  const body = cardContainer.querySelector('.ac-body')?.textContent ?? hex.interpretation;

  const tmp = document.createElement('canvas');
  paintCard(tmp, hex, body);

  const link = document.createElement('a');
  link.download = `天机星阵-${hex.name}-解签.png`;
  link.href = tmp.toDataURL('image/png');
  link.click();
  showToast('解签已保存');
}

/* ---------- 符卡版式 ----------
   构图：挂符居中当主体，上下各一段文字。
     上方 = 卦名 + 卦序 / 卦象 / 性质
     中间 = 挂符（纸底 + 卦名 + 六爻 + 朱印），和 3D 星阵里的符咒同一套视觉语言
     下方 = 解读正文

   宽度固定 720（手机上一般按 390 宽显示，缩到 0.54 倍）。
   高度跟着正文走：短文案约 1160，长文案最多长到 1440。
   正文字号自适应，保证"字尽量大"且"不溢出"。
*/
const CARD_W = 720;
const CARD_MIN_H = 1160;
const CARD_MAX_H = 1440;
const CARD_TITLE_Y = 58;
const CARD_NAME_Y = 140;
const CARD_META_Y = 190;
const CARD_TAL_W = 216;
const CARD_TAL_H = 408;
const CARD_TAL_Y = 236;
const CARD_DIVIDER_Y = 686;
const CARD_BODY_TOP = 726;
const CARD_BOTTOM_RESERVE = 150;

const CARD_FONT = (size: number) =>
  `400 ${size}px "Zen Maru Gothic", "Noto Sans SC", sans-serif`;

/** 居中画一枚挂符：纸底 + 卦名 + 六爻 + 朱印，顶部带挂环 */
function drawTalisman(ctx: CanvasRenderingContext2D, cx: number, top: number, hex: Hexagram) {
  const w = CARD_TAL_W;
  const h = CARD_TAL_H;
  const x = cx - w / 2;

  // 背后灵光，让它从暗底上浮起来
  const halo = ctx.createRadialGradient(cx, top + h * 0.46, 10, cx, top + h * 0.46, w * 1.5);
  halo.addColorStop(0, 'rgba(240,200,105,0.28)');
  halo.addColorStop(0.55, 'rgba(232,56,79,0.1)');
  halo.addColorStop(1, 'rgba(232,56,79,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - w, top - 40, w * 3, h + 120);

  // 挂环与挂绳
  ctx.strokeStyle = 'rgba(240,200,105,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, top - 34);
  ctx.lineTo(cx, top - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, top - 6, 9, 0, Math.PI * 2);
  ctx.stroke();

  // 纸底
  const paper = ctx.createLinearGradient(x, top, x + w, top + h);
  paper.addColorStop(0, '#f7f0e2');
  paper.addColorStop(0.45, '#ece1cb');
  paper.addColorStop(1, '#dbcdb1');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = paper;
  roundRectPath(ctx, x, top, w, h, 14);
  ctx.fill();
  ctx.restore();

  // 纸纹
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = 1;
  for (let y = top + 14; y < top + h - 14; y += 6) {
    ctx.beginPath();
    ctx.moveTo(x + 12, y);
    ctx.lineTo(x + w - 12, y);
    ctx.stroke();
  }
  ctx.restore();

  // 双线金框
  ctx.strokeStyle = 'rgba(185,140,44,0.85)';
  ctx.lineWidth = 3;
  roundRectPath(ctx, x + 11, top + 11, w - 22, h - 22, 9);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(185,140,44,0.36)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 19, top + 19, w - 38, h - 38, 6);
  ctx.stroke();

  // 卦名
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1b1a17';
  ctx.font = '800 62px "Shippori Mincho", "Noto Serif SC", serif';
  ctx.fillText(hex.name, cx, top + 78);

  // 卦名下的朱红短横
  ctx.fillStyle = 'rgba(163,18,42,0.75)';
  ctx.fillRect(cx - 34, top + 122, 68, 3);

  // 六爻
  const barW = 116;
  const barH = 17;
  const barGap = 15;
  const barsTop = top + 150;
  for (let i = hex.lines.length - 1; i >= 0; i--) {
    const row = hex.lines.length - 1 - i;
    const y = barsTop + row * (barH + barGap);
    if (hex.lines[i] === 1) {
      const g = ctx.createLinearGradient(cx - barW / 2, y, cx + barW / 2, y);
      g.addColorStop(0, '#b98c2c');
      g.addColorStop(0.5, '#f0c869');
      g.addColorStop(1, '#b98c2c');
      ctx.fillStyle = g;
      roundRectPath(ctx, cx - barW / 2, y, barW, barH, 4);
      ctx.fill();
    } else {
      const half = (barW - 20) / 2;
      ctx.fillStyle = '#6d4bb0';
      roundRectPath(ctx, cx - barW / 2, y, half, barH, 4);
      ctx.fill();
      roundRectPath(ctx, cx - barW / 2 + half + 20, y, half, barH, 4);
      ctx.fill();
    }
  }

  // 朱印
  const seal = 52;
  const sealY = top + h - 26 - seal;
  ctx.fillStyle = 'rgba(163,18,42,0.92)';
  roundRectPath(ctx, cx - seal / 2, sealY, seal, seal, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(247,240,226,0.96)';
  ctx.font = '700 30px "Shippori Mincho", "Noto Serif SC", serif';
  const yang = hex.lines.reduce((a: number, l) => a + l, 0);
  ctx.fillText(yang > 3 ? '阳' : '阴', cx, sealY + seal / 2 + 1);
}

function paintCard(canvas: HTMLCanvasElement, hex: Hexagram, text: string) {
  const W = CARD_W;
  const availW = W - 176;

  // 用一张离屏 canvas 量文字，别反复改目标 canvas 的尺寸
  const measure = document.createElement('canvas').getContext('2d')!;

  let fontSize = 44;
  let lineHeight = 71;
  let lines: string[] = [];
  let H = CARD_MIN_H;

  while (fontSize >= 22) {
    lineHeight = Math.round(fontSize * 1.62);
    measure.font = CARD_FONT(fontSize);
    lines = wrapText(measure, text, availW);
    const bodyH = lines.length * lineHeight;
    H = Math.max(CARD_MIN_H, CARD_BODY_TOP + bodyH + 48 + CARD_BOTTOM_RESERVE);
    if (H <= CARD_MAX_H) break;
    fontSize -= 2;
  }

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // --- 底 ---
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#070b18');
  bg.addColorStop(0.5, '#0d142b');
  bg.addColorStop(1, '#1c0f24');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.5, CARD_TAL_Y + CARD_TAL_H * 0.5, 20, W * 0.5, CARD_TAL_Y + CARD_TAL_H * 0.5, 480);
  glow.addColorStop(0, 'rgba(232,56,79,0.22)');
  glow.addColorStop(1, 'rgba(232,56,79,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // --- 双框 + 四角金饰 ---
  ctx.strokeStyle = 'rgba(240,200,105,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.strokeStyle = 'rgba(240,200,105,0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.strokeStyle = 'rgba(240,200,105,0.9)';
  ctx.lineWidth = 3;
  const corners: Array<[number, number, number, number]> = [
    [48, 48, 1, 1],
    [W - 48, 48, -1, 1],
    [48, H - 48, 1, -1],
    [W - 48, H - 48, -1, -1],
  ];
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * 36, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 36);
    ctx.stroke();
  });

  // --- 顶部小标 ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(240,200,105,0.7)';
  ctx.font = '500 17px "Zen Maru Gothic", "Noto Sans SC", sans-serif';
  ctx.fillText('天 机 星 阵 · 卦 象 符 卡', W / 2, CARD_TITLE_Y);

  // --- 上方：卦名 + 卦序 ---
  ctx.save();
  ctx.shadowColor = 'rgba(240,200,105,0.5)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '800 60px "Shippori Mincho", "Noto Serif SC", serif';
  ctx.fillText(hex.name, W / 2, CARD_NAME_Y);
  ctx.restore();

  ctx.fillStyle = 'rgba(160,155,140,0.95)';
  ctx.font = '500 20px "Zen Maru Gothic", "Noto Sans SC", sans-serif';
  ctx.fillText(`第 ${hex.number} 卦 · ${hex.chinese} · ${hex.nature}`, W / 2, CARD_META_Y);

  // --- 中间：挂符 ---
  drawTalisman(ctx, W / 2, CARD_TAL_Y, hex);

  // --- 分隔 ---
  ctx.strokeStyle = 'rgba(240,200,105,0.24)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(88, CARD_DIVIDER_Y);
  ctx.lineTo(W - 88, CARD_DIVIDER_Y);
  ctx.stroke();

  // --- 下方：正文，在可用区域里垂直居中 ---
  const bodyBottom = H - CARD_BOTTOM_RESERVE;
  const bodyH = lines.length * lineHeight;
  const pad = Math.max(0, (bodyBottom - CARD_BODY_TOP - bodyH) / 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(216,210,197,0.97)';
  ctx.font = CARD_FONT(fontSize);
  let ty = CARD_BODY_TOP + pad + Math.round(lineHeight * 0.74);
  for (const line of lines) {
    ctx.fillText(line, 88, ty);
    ty += lineHeight;
  }

  // --- 底部 ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(150,145,132,0.85)';
  ctx.font = '500 17px "Zen Maru Gothic", "Noto Sans SC", sans-serif';
  ctx.fillText('结 印 求 签 · 天 机 星 阵', W / 2, H - 122);

  const sealSize = 56;
  const sealY = H - 102;
  ctx.fillStyle = 'rgba(163,18,42,0.94)';
  roundRectPath(ctx, W / 2 - sealSize / 2, sealY, sealSize, sealSize, 9);
  ctx.fill();
  ctx.fillStyle = 'rgba(246,239,224,0.96)';
  ctx.font = '700 32px "Shippori Mincho", "Noto Serif SC", serif';
  ctx.fillText('易', W / 2, sealY + sealSize / 2 + 1);
}
function shareAnswerCard() {
  const hex = hexagrams.find((h) => h.number === selectedHexNum);
  if (!hex) return;
  const question = questionInput.value.trim();
  const body = cardContainer.querySelector('.ac-body')?.textContent ?? hex.interpretation;
  const text = `天机星阵 · ${hex.name}卦（第${hex.number}卦）\n所问：${question}\n${body}`;

  if (navigator.share) {
    navigator.share({ title: `天机星阵 · ${hex.name}卦`, text }).catch(() => { /* 用户取消 */ });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('已复制到剪贴板'))
      .catch(() => showToast('复制失败，请手动选择'));
  } else {
    showToast('当前环境不支持分享');
  }
}

/* ============================================================
   AI 配置弹窗
   ============================================================ */
function openApiModal() {
  const cfg = getApiConfig();
  modalApiKey.value = '';
  modalBaseUrl.value = cfg.baseUrl;
  modalModelId.value = cfg.modelId;

  if (cfg.apiKey) {
    modalApiStatus.textContent = '当前使用你自己填写的密钥。重新填写可覆盖。';
  } else if (isAiOn && aiFromServer) {
    modalApiStatus.textContent = `当前由服务端提供凭据（模型 ${serverModel || '未知'}）。你不需要填任何东西，填了会改用你自己的密钥。`;
  } else {
    modalApiStatus.textContent = '当前没有可用凭据，卦象解读使用内置文本。';
  }
  modalApiStatus.className = 'modal-status';
  apiModal.classList.add('is-on');
  modalApiKey.focus();
}

function closeApiModal() {
  apiModal.classList.remove('is-on');
}

async function saveApiFromModal() {
  const key = modalApiKey.value.trim();
  const baseUrl = modalBaseUrl.value.trim();
  const modelId = modalModelId.value.trim();

  const patch: Record<string, string> = {};
  if (key) patch.apiKey = key;
  if (baseUrl) patch.baseUrl = baseUrl;
  if (modelId) patch.modelId = modelId;
  saveApiConfig(patch);

  const cfg = getApiConfig();

  if (!cfg.apiKey) {
    // 用户清空了密钥：回落到服务端凭据（如果服务端有配）
    const probe = await probeServer();
    isAiOn = !!probe?.configured;
    aiFromServer = isAiOn;
    serverModel = probe?.model ?? '';
    syncApiState();
    modalApiStatus.textContent = isAiOn
      ? `已清空你自己的密钥，改回服务端凭据（模型 ${serverModel || '未知'}）。`
      : '未填写 API Key，且服务端也没有配置凭据，继续使用内置解读。';
    modalApiStatus.className = isAiOn ? 'modal-status is-ok' : 'modal-status';
    return;
  }

  modalApiStatus.textContent = '正在验证连接…';
  modalApiStatus.className = 'modal-status';

  try {
    const reply = await testConnection(cfg);
    isAiOn = true;
    aiFromServer = false;
    serverModel = cfg.modelId;
    syncApiState();
    modalApiStatus.textContent = `接通成功，返回「${reply.slice(0, 12)}」。AI 解读已启用。`;
    modalApiStatus.className = 'modal-status is-ok';
    showToast('神谕已接通');
    setTimeout(() => {
      closeApiModal();
      renderDivineBar();
    }, 900);
  } catch (err) {
    isAiOn = !!getApiConfig().apiKey;
    aiFromServer = false;
    syncApiState();
    modalApiStatus.textContent = `连接失败：${(err as Error)?.message || '未知错误'}`;
    modalApiStatus.className = 'modal-status is-err';
  }
}

function syncApiState() {
  apiKeyBtn.classList.toggle('is-on', isAiOn);
  const label = apiKeyBtn.querySelector('.api-label');
  if (label) {
    label.textContent = isAiOn ? (aiFromServer ? 'AI 已通·服' : 'AI 已通') : 'AI';
  }
  apiKeyBtn.title = isAiOn
    ? aiFromServer
      ? `AI 神谕已接通（服务端提供，模型 ${serverModel || '未知'}），点击可改用自己的密钥`
      : 'AI 神谕已接通（使用你填写的密钥），点击可重新配置'
    : '点击填入接口，启用 AI 神谕';
}

/**
 * 问服务端有没有替我们配好凭据。
 * 手机这类全新设备没有 localStorage，全靠这一步才能用上 AI。
 */
async function probeServerCredentials() {
  if (isAiOn) return; // 已有自带密钥，不必探

  const probe = await probeServer();
  if (!probe) return;

  if (probe.configured) {
    isAiOn = true;
    aiFromServer = true;
    serverModel = probe.model;
    syncApiState();
    // 只把"现在可以通神了"刷出来，不自动调用
    renderDivineBar();
  }
}

/* ============================================================
   杂项
   ============================================================ */
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function showToast(msg: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastLayer.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ---------- 启动 ---------- */
init();
