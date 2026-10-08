/* ============================================================
   天机星阵 · Three.js 场景
   构成：夜空穹顶 / 星尘 / 天顶星盘 / 法阵盘 / 参道鸟居 /
        中央灵枢 / 六十四卦符咒 / 结界壁 / 鬼火 / 降临光柱
   后处理：UnrealBloom（让所有发光元素真的有光晕）
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { hexagrams } from './data.js';
import { HexagramTalisman } from './hexagram.js';

const RING_RADIUS = 23;
const WISP_COUNT = 150;
const BURST_COUNT = 260;
/** 渲染节流阈值：15ms 对应约 64fps 上限，60Hz 屏上仍逐帧渲染 */
const MIN_FRAME_MS = 15;

/**
 * 第 i 张符咒在星阵里的位置。
 * 半径与高度都做非均匀扰动，让 64 张符咒读作"悬浮星阵"而不是"一圈篱笆"。
 * 选中爆发、相机对焦、建阵三处都用这一个函数，避免三份算法各自漂移。
 */
function talismanPos(i: number, count: number): THREE.Vector3 {
  const angle = (i / count) * Math.PI * 2;
  const r = RING_RADIUS + Math.sin(angle * 3) * 1.8 + Math.cos(angle * 5 + 1.2) * 1.1;
  const y = Math.sin(angle * 2) * 3.6 + Math.cos(angle * 3 + 0.6) * 2.0;
  return new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
}

/* ---------- 法阵盘贴图：真绘制 ---------- */
function makeFormationTexture(): THREE.CanvasTexture {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  const c = S / 2;

  const GOLD = 'rgba(240, 200, 105,';
  const CRIMSON = 'rgba(232, 56, 79,';
  const VIOLET = 'rgba(169, 127, 232,';

  g.clearRect(0, 0, S, S);

  // 外圈三层
  const rings: Array<[number, number, string]> = [
    [470, 3, GOLD + ' 0.55)'],
    [446, 1.4, CRIMSON + ' 0.5)'],
    [430, 1, GOLD + ' 0.3)'],
    [352, 1.6, GOLD + ' 0.42)'],
    [268, 1.2, VIOLET + ' 0.36)'],
    [186, 1.4, GOLD + ' 0.34)'],
    [96, 1.6, CRIMSON + ' 0.42)'],
  ];
  rings.forEach(([r, w, color]) => {
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.strokeStyle = color;
    g.lineWidth = w;
    g.stroke();
  });

  // 刻度带：外圈短齿
  g.save();
  g.strokeStyle = GOLD + ' 0.34)';
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const long = i % 8 === 0;
    const r1 = 430;
    const r2 = long ? 352 : 398;
    g.lineWidth = long ? 2.6 : 1.2;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    g.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2);
    g.stroke();
  }
  g.restore();

  // 八卦符号环
  const trigrams = [7, 3, 5, 1, 6, 2, 4, 0]; // ☰☱☲☳☴☵☶☷
  trigrams.forEach((bits, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = 310;
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    g.save();
    g.translate(x, y);
    g.rotate(a + Math.PI / 2);
    for (let row = 0; row < 3; row++) {
      const on = (bits >> (2 - row)) & 1;
      const yy = (row - 1) * 22;
      g.fillStyle = on ? GOLD + ' 0.75)' : VIOLET + ' 0.62)';
      if (on) {
        g.fillRect(-30, yy - 4, 60, 8);
      } else {
        g.fillRect(-30, yy - 4, 25, 8);
        g.fillRect(5, yy - 4, 25, 8);
      }
    }
    g.restore();
  });

  // 放射线
  g.save();
  g.strokeStyle = CRIMSON + ' 0.22)';
  g.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * 96, c + Math.sin(a) * 96);
    g.lineTo(c + Math.cos(a) * 268, c + Math.sin(a) * 268);
    g.stroke();
  }
  g.restore();

  // 中心八芒
  g.save();
  g.translate(c, c);
  g.strokeStyle = GOLD + ' 0.6)';
  g.lineWidth = 2.4;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * 92, Math.sin(a) * 92);
    g.stroke();
  }
  // 中心双环
  g.beginPath();
  g.arc(0, 0, 62, 0, Math.PI * 2);
  g.strokeStyle = CRIMSON + ' 0.7)';
  g.lineWidth = 3;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 40, 0, Math.PI * 2);
  g.strokeStyle = GOLD + ' 0.55)';
  g.lineWidth = 1.6;
  g.stroke();
  g.restore();

  // 内圈符文：短弧段
  g.save();
  g.strokeStyle = GOLD + ' 0.42)';
  g.lineWidth = 3;
  for (let i = 0; i < 32; i++) {
    const a0 = (i / 32) * Math.PI * 2;
    g.beginPath();
    g.arc(c, c, 220, a0, a0 + 0.09);
    g.stroke();
  }
  g.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface SceneCallbacks {
  onHover?: (num: number | null) => void;
  onOrbHover?: (hovered: boolean) => void;
}

export class IChingScene {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;
  composer!: EffectComposer;
  bloom!: UnrealBloomPass;

  talismans: HexagramTalisman[] = [];
  /** 射线拾取目标缓存，随卦象一起建好 */
  private hitTargets: THREE.Mesh[] = [];
  centralOrb!: THREE.Mesh;

  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  /** 当前选中的卦号。0 表示还没择卦，此时阵中不突出任何一张。 */
  selectedHexagram = 0;
  hoveredHexagram: number | null = null;
  hoveredOrb = false;
  /** 灵枢点击反馈的衰减进度 */
  private orbPulse = 0;

  animationId = 0;
  isRunning = false;
  reducedMotion = false;

  private clock: { last: number; elapsed: number };   // 自己算，不用已废弃的 THREE.Clock
  private callbacks: SceneCallbacks;
  private canvas: HTMLCanvasElement;

  private skyDome!: THREE.Mesh;
  private starField!: THREE.Points;
  private starOrbit!: THREE.Group;
  private formation!: THREE.Mesh;
  private toriiGates: THREE.Group[] = [];
  private barrier!: THREE.Mesh;
  private barrierUniforms!: { uTime: { value: number } };
  private wisps!: THREE.Points;
  private wispBase!: Float32Array;
  private wispPhase!: Float32Array;
  private spindleRings: THREE.Mesh[] = [];
  private ropeKnots: THREE.Mesh[] = [];
  private floatingTalismans: THREE.Mesh[] = [];
  private descentBeam!: THREE.Mesh;

  private burstPoints!: THREE.Points;
  private burstPos!: Float32Array;
  private burstVel!: Float32Array;
  private burstLife!: Float32Array;
  private burstActive = false;

  private _onResize: () => void = () => {};
  private _onVisibility: () => void = () => {};

  constructor(canvas: HTMLCanvasElement, callbacks: SceneCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.clock = { last: 0, elapsed: 0 };
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.burstPos = new Float32Array(BURST_COUNT * 3);
    this.burstVel = new Float32Array(BURST_COUNT * 3);
    this.burstLife = new Float32Array(BURST_COUNT);

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initLights();
    this.createSky();
    this.createStars();
    this.createStarOrbit();
    this.createFormation();
    this.createTorii();
    this.createBarrier();
    this.createSpindle();
    this.createTalismans();
    this.createWisps();
    this.createBurst();
    this.createDescentBeam();
    this.initPostProcessing();
    this.bindEvents();
  }

  /* ---------- 渲染器 ---------- */
  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    // 1.5 而非 2：高 DPI 屏上像素数少 44%，肉眼几乎看不出差别
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
    });
    this.canvas.addEventListener('webglcontextrestored', () => this.start());
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05080f);
    this.scene.fog = new THREE.FogExp2(0x05080f, 0.0072);
  }

  private initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 600);
    this.camera.position.set(0, 17, 46);
    this.camera.lookAt(0, 2, 0);
  }

  private initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 78;
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.5;
    this.controls.target.set(0, 2.5, 0);
    this.controls.autoRotate = !this.reducedMotion;
    this.controls.autoRotateSpeed = 0.32;
    this.controls.update();
  }

  private initLights() {
    // 环境光偏暖，避免整体发蓝
    this.scene.add(new THREE.AmbientLight(0x3a2a30, 1.1));

    const key = new THREE.DirectionalLight(0xffe0b0, 1.6);
    key.position.set(16, 34, 18);
    this.scene.add(key);

    // 逆光：朱红描边，把鸟居与符咒的边缘勾出来
    const rim = new THREE.DirectionalLight(0xe8384f, 1.1);
    rim.position.set(-22, 10, -24);
    this.scene.add(rim);

    const crimsonLamp = new THREE.PointLight(0xe8384f, 90, 100, 2);
    crimsonLamp.position.set(9, 9, 9);
    this.scene.add(crimsonLamp);

    const goldLamp = new THREE.PointLight(0xf0c869, 110, 90, 2);
    goldLamp.position.set(0, 5, 0);
    this.scene.add(goldLamp);

    // 只留一点点灵紫做层次，不再做第二个主色
    const violetLamp = new THREE.PointLight(0xa97fe8, 26, 60, 2);
    violetLamp.position.set(-13, 6, -13);
    this.scene.add(violetLamp);
  }

  /* ---------- 夜空穹顶 ---------- */
  private createSky() {
    const geo = new THREE.SphereGeometry(260, 32, 24);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x04060e) },
        uMid: { value: new THREE.Color(0x12081a) },
        uHorizon: { value: new THREE.Color(0x3a0d1c) },
        uBottom: { value: new THREE.Color(0x04060e) },
      },
      vertexShader: /* glsl */ `
        varying float vH;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vH = normalize(wp.xyz).y;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        uniform vec3 uBottom;
        varying float vH;
        void main() {
          float h = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(uBottom, uMid, smoothstep(0.0, 0.5, h));
          col = mix(col, uTop, smoothstep(0.55, 1.0, h));
          // 地平线附近压一层朱红余晖，给"神社夜"一个落点
          float horizon = exp(-pow((h - 0.44) * 7.0, 2.0));
          col += uHorizon * horizon * 0.55;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(geo, mat);
    this.skyDome.frustumCulled = false;
    this.scene.add(this.skyDome);
  }

  /* ---------- 星尘 ---------- */
  private createStars() {
    const COUNT = 2600;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const gold = new THREE.Color(0xffe9a8);
    const warm = new THREE.Color(0xffd9a0);
    const cold = new THREE.Color(0xd8e4ff);
    const crimson = new THREE.Color(0xff8a9c);

    for (let i = 0; i < COUNT; i++) {
      const r = 120 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 1.0);
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      pos[i * 3 + 1] = Math.abs(Math.cos(phi)) * r * 0.85 - 10;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;

      // 星尘以金白为主，朱红做点缀，不再用紫做主调
      const roll = Math.random();
      const c = roll < 0.4 ? gold : roll < 0.74 ? cold : roll < 0.92 ? warm : crimson;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.85,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    this.starField = new THREE.Points(geo, mat);
    this.starField.frustumCulled = false;
    this.scene.add(this.starField);
  }

  /* ---------- 天顶星盘 ---------- */
  private createStarOrbit() {
    this.starOrbit = new THREE.Group();
    this.starOrbit.position.y = 27;

    const specs: Array<[number, number, number]> = [
      [42, 0xf0c869, 0.28],
      [56, 0xe8384f, 0.2],
      [70, 0xa97fe8, 0.11],
    ];

    specs.forEach(([radius, color, opacity], i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.14, 6, 160),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.16;
      ring.rotation.z = i * 0.4;
      this.starOrbit.add(ring);

      // 环上的"刻度珠"
      const beads = new THREE.Group();
      const beadCount = 48;
      for (let b = 0; b < beadCount; b++) {
        const a = (b / beadCount) * Math.PI * 2;
        const bead = new THREE.Mesh(
          new THREE.SphereGeometry(b % 6 === 0 ? 0.42 : 0.2, 6, 6),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          })
        );
        bead.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        beads.add(bead);
      }
      beads.rotation.copy(ring.rotation);
      this.starOrbit.add(beads);
    });

    this.scene.add(this.starOrbit);
  }

  /* ---------- 地面法阵 ---------- */
  private createFormation() {
    const tex = makeFormationTexture();

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(38, 80),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.9,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -6.2;
    this.formation = disc;
    this.scene.add(disc);

    // 地面用 Basic 材质：这里没有任何环境贴图，PBR 的高光本来也出不来，
    // 但每像素的金属度/粗糙度运算在软件渲染下要吃掉半个屏幕的开销。
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(90, 48),
      new THREE.MeshBasicMaterial({ color: 0x060a16 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6.6;
    this.scene.add(floor);
  }

  /* ---------- 参道鸟居 ---------- */
  private createTorii() {
    const specs: Array<[number, number, number]> = [
      [0, -46, 1],
      [-7, -62, 0.86],
      [6, -78, 0.74],
      [-4, -95, 0.63],
      [3, -112, 0.54],
    ];

    specs.forEach(([x, z, scale]) => {
      const gate = this.buildTorii(scale);
      gate.position.set(x, -6.4, z);
      this.scene.add(gate);
      this.toriiGates.push(gate);
    });
  }

  private buildTorii(scale: number): THREE.Group {
    const g = new THREE.Group();
    g.scale.setScalar(scale);

    const crimson = new THREE.MeshStandardMaterial({
      color: 0xc41e3a,
      emissive: 0x8c1226,
      emissiveIntensity: 0.55,
      metalness: 0.35,
      roughness: 0.55,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x1a1020,
      emissive: 0x2a0a18,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.6,
    });

    const pillarH = 15;
    const pillarR = 0.62;
    const spread = 6.4;

    [-1, 1].forEach((side) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(pillarR * 0.86, pillarR, pillarH, 12),
        crimson
      );
      pillar.position.set(side * spread, pillarH / 2, 0);
      g.add(pillar);
    });

    // 笠木（最上横梁）
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(spread * 2 + 5.2, 0.78, 1.5), dark);
    kasagi.position.y = pillarH + 1.5;
    g.add(kasagi);

    const kasagiGlow = new THREE.Mesh(
      new THREE.BoxGeometry(spread * 2 + 5.2, 0.14, 1.6),
      new THREE.MeshBasicMaterial({
        color: 0xf0c869,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    kasagiGlow.position.y = pillarH + 1.16;
    g.add(kasagiGlow);

    // 岛木（笠木下的第二层）
    const shimaki = new THREE.Mesh(new THREE.BoxGeometry(spread * 2 + 4.2, 0.44, 1.2), crimson);
    shimaki.position.y = pillarH + 0.86;
    g.add(shimaki);

    // 贯（第二横梁）
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(spread * 2 + 1.6, 0.6, 0.95), crimson);
    nuki.position.y = pillarH - 1.7;
    g.add(nuki);

    // 额束
    const gakuzuka = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.8), crimson);
    gakuzuka.position.y = pillarH - 0.3;
    g.add(gakuzuka);

    return g;
  }

  /* ---------- 结界壁 ---------- */
  private createBarrier() {
    // 高度从 46 收到 30：可见的那条光带没变，但覆盖的屏幕面积少了三分之一
    const geo = new THREE.CylinderGeometry(36, 36, 30, 48, 1, true);

    this.barrierUniforms = { uTime: { value: 0 } };

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.barrierUniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vY;
        void main() {
          vUv = uv;
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying float vY;
        void main() {
          // 竖向流光
          float streak = sin(vUv.x * 120.0 + uTime * 0.7) * 0.5 + 0.5;
          streak = pow(streak, 6.0);
          // 水平能量带
          float band = sin(vY * 0.42 - uTime * 1.1) * 0.5 + 0.5;
          band = pow(band, 3.0);
          // 上下淡出
          float fade = smoothstep(0.0, 0.24, vUv.y) * (1.0 - smoothstep(0.62, 1.0, vUv.y));
          float a = (streak * 0.13 + band * 0.07) * fade;
          // 朱红打底，金色做能量带，不要蓝
          vec3 col = mix(vec3(0.91, 0.22, 0.31), vec3(0.94, 0.78, 0.41), band);
          gl_FragColor = vec4(col, a);
        }
      `,
    });

    this.barrier = new THREE.Mesh(geo, mat);
    this.barrier.position.y = 8;
    this.scene.add(this.barrier);
  }

  /* ---------- 中央灵枢 ---------- */
  private createSpindle() {
    const hub = new THREE.Group();
    hub.position.set(0, 4.2, 0);

    // 外辉光球
    hub.add(new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xe8384f,
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    ));

    // 主球
    this.centralOrb = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0xe8384f,
        emissive: 0xe8384f,
        emissiveIntensity: 1.6,
        metalness: 0.85,
        roughness: 0.14,
      })
    );
    hub.add(this.centralOrb);

    // 金核
    hub.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, toneMapped: false })
    ));

    // 注连绳（三个绳结环）
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0xe8dcc0,
      emissive: 0x6a5a3a,
      emissiveIntensity: 0.4,
      metalness: 0.1,
      roughness: 0.9,
    });
    [2.35, 2.75, 3.15].forEach((r, i) => {
      const knot = new THREE.Mesh(new THREE.TorusGeometry(r, 0.1, 8, 96), ropeMat);
      knot.rotation.x = Math.PI / 2 + (i - 1) * 0.12;
      knot.rotation.z = i * 0.3;
      hub.add(knot);
      this.ropeKnots.push(knot);
    });

    // 三层法环
    const ringSpecs: Array<[number, number, number, number]> = [
      [3.6, 0xf0c869, 0.42, 0],
      [4.6, 0xe8384f, 0.32, 0.5],
      [5.7, 0xa97fe8, 0.24, 1.1],
    ];
    ringSpecs.forEach(([r, color, opacity, tilt]) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.045, 10, 140),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      ring.rotation.x = Math.PI / 2 + tilt;
      ring.rotation.z = tilt;
      hub.add(ring);
      this.spindleRings.push(ring);
    });

    // 悬浮符纸（小片，绕着灵枢飘）
    for (let i = 0; i < 6; i++) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 1.5),
        new THREE.MeshBasicMaterial({
          color: 0xffe9a8,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      const a = (i / 6) * Math.PI * 2;
      strip.position.set(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6);
      strip.userData.angle = a;
      strip.userData.radius = 2.6;
      hub.add(strip);
      this.floatingTalismans.push(strip);
    }

    this.scene.add(hub);
  }

  /* ---------- 六十四卦符咒 ---------- */
  private createTalismans() {
    const count = hexagrams.length;
    hexagrams.forEach((hex, i) => {
      const angle = (i / count) * Math.PI * 2;
      const t = new HexagramTalisman(hex, talismanPos(i, count), angle);
      this.scene.add(t.group);
      this.talismans.push(t);
      this.hitTargets.push(t.hitPlane);
    });
  }

  /* ---------- 鬼火 ---------- */
  private createWisps() {
    const pos = new Float32Array(WISP_COUNT * 3);
    const col = new Float32Array(WISP_COUNT * 3);
    this.wispBase = new Float32Array(WISP_COUNT * 3);
    this.wispPhase = new Float32Array(WISP_COUNT * 2);

    const gold = new THREE.Color(0xffe9a8);
    const crimson = new THREE.Color(0xff7a8c);
    const mint = new THREE.Color(0x5eead4);

    for (let i = 0; i < WISP_COUNT; i++) {
      const radius = 6 + Math.random() * 30;
      const angle = Math.random() * Math.PI * 2;
      const y = -5 + Math.random() * 20;

      this.wispBase[i * 3] = radius;
      this.wispBase[i * 3 + 1] = y;
      this.wispBase[i * 3 + 2] = angle;
      this.wispPhase[i * 2] = Math.random() * Math.PI * 2;
      this.wispPhase[i * 2 + 1] = 0.12 + Math.random() * 0.34;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      // 鬼火：金为主，朱红次之，灵青只留极少数做点缀
      const roll = Math.random();
      const c = roll < 0.58 ? gold : roll < 0.9 ? crimson : mint;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    this.wisps = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.62,
        transparent: true,
        opacity: 0.82,
        sizeAttenuation: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.scene.add(this.wisps);
  }

  /* ---------- 粒子爆发 ---------- */
  private createBurst() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.burstPos, 3));

    this.burstPoints = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffe9a8,
        size: 0.3,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.burstPoints.visible = false;
    this.scene.add(this.burstPoints);
  }

  /* ---------- 降临光柱 ---------- */
  private createDescentBeam() {
    const cv = document.createElement('canvas');
    cv.width = 4;
    cv.height = 128;
    const g = cv.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255, 233, 168, 0)');
    grad.addColorStop(0.3, 'rgba(255, 233, 168, 0.75)');
    grad.addColorStop(0.72, 'rgba(232, 56, 79, 0.45)');
    grad.addColorStop(1, 'rgba(232, 56, 79, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 128);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;

    this.descentBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 4.6, 40, 24, 1, true),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.descentBeam.visible = false;
    this.scene.add(this.descentBeam);
  }

  /* ---------- 后处理 ---------- */
  private initPostProcessing() {
    const halfW = Math.round(window.innerWidth / 2);
    const halfH = Math.round(window.innerHeight / 2);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom 用半分辨率：它是整条链路最贵的一环，而泛光本身就是模糊的，
    // 半分辨率几乎看不出差别，却能把这块开销砍掉约四分之三。
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(halfW, halfH),
      this.reducedMotion ? 0.28 : 0.5,
      0.5,
      0.72
    );
    this.composer.addPass(this.bloom);
    // 注意顺序：addPass 会把 pass 尺寸重置成整屏，必须在它之后再压回半分辨率
    this.bloom.setSize(halfW, halfH);
    this.composer.addPass(new OutputPass());
  }

  private bindEvents() {
    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
      this.bloom.setSize(Math.round(w / 2), Math.round(h / 2));
    };
    window.addEventListener('resize', this._onResize);

    // 后台暂停：省电，也避免切回来时 delta 爆炸
    this._onVisibility = () => {
      if (document.hidden) this.stop();
      else this.start();
    };
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  /* ---------- 交互 ---------- */
  setMouse(nx: number, ny: number) {
    this.mouse.x = nx;
    this.mouse.y = ny;
  }

  pick(): { hexagram: number | null; orb: boolean } {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 拾取目标只在卦象建好时算一次，别每帧重建数组
    const hits = this.raycaster.intersectObjects(this.hitTargets, false);
    let num: number | null = null;
    let hexDist = Infinity;
    if (hits.length > 0) {
      const n = hits[0].object.userData.hexagramNumber;
      if (typeof n === 'number') {
        num = n;
        hexDist = hits[0].distance;
      }
    }

    // 灵枢在阵心，只有它确实比卦象更靠前时才算命中。
    // 否则从阵心望向对面那圈符咒时，灵枢会把它们整片挡住。
    const orbHit = this.raycaster.intersectObject(this.centralOrb, false)[0];
    const orb = !!orbHit && orbHit.distance <= hexDist;

    // 命中灵枢时就不再报卦象，避免悬停提示被"第 N 卦"覆盖掉
    return { hexagram: orb ? null : num, orb };
  }

  /** 灵枢被点击时的反馈：核心炸开一圈粒子，并短暂膨胀 */
  pulseOrb() {
    this.orbPulse = 1;
    this.centralOrb.updateWorldMatrix(true, false);
    this.triggerBurst(this.centralOrb.getWorldPosition(new THREE.Vector3()));
  }

  /**
   * 程序化选中某个卦象。
   * 注意：这里**不**回调上层。选中态由应用层驱动，若在此回调会与
   * 应用层的 selectHexagram 形成相互递归（曾经把渲染进程打崩过）。
   */
  selectHexagram(num: number) {
    this.selectedHexagram = num;
    const idx = hexagrams.findIndex((h) => h.number === num);
    if (idx >= 0) {
      const p = talismanPos(idx, hexagrams.length);
      this.triggerBurst(new THREE.Vector3(p.x, p.y, p.z));
    }
  }

  /** 相机平滑靠向某个卦象 */
  focusOnHexagram(num: number) {
    const idx = hexagrams.findIndex((h) => h.number === num);
    if (idx < 0) return;

    const p = talismanPos(idx, hexagrams.length);
    const target = new THREE.Vector3(p.x * 0.55, 2.5, p.z * 0.55);

    const startTarget = this.controls.target.clone();
    const startTime = performance.now();
    const duration = 900;

    const step = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      this.controls.target.lerpVectors(startTarget, target, ease);
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  triggerBurst(position: THREE.Vector3) {
    for (let i = 0; i < BURST_COUNT; i++) {
      this.burstPos[i * 3] = position.x;
      this.burstPos[i * 3 + 1] = position.y;
      this.burstPos[i * 3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 3 + Math.random() * 9;

      this.burstVel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      this.burstVel[i * 3 + 1] = Math.cos(phi) * speed * 0.8 + 2;
      this.burstVel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      this.burstLife[i] = 1;
    }
    this.burstPoints.geometry.attributes.position.needsUpdate = true;
    (this.burstPoints.material as THREE.PointsMaterial).opacity = 1;
    this.burstPoints.visible = true;
    this.burstActive = true;
  }

  /* ---------- 主循环 ---------- */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.last = performance.now();
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private animate() {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const since = now - this.clock.last;

    // 上限约 60fps。这是一个慢速氛围场景，在 120/144Hz 屏上没必要把 GPU 跑满，
    // 而 60Hz 屏的 rAF 间隔约 16.7ms，仍会逐帧渲染，不会掉帧。
    if (since < MIN_FRAME_MS) return;

    // 上限 50ms：切回前台时不要因为一次巨大 delta 把整个场景跳过去
    const delta = Math.min(since / 1000, 0.05);
    this.clock.last = now;
    this.clock.elapsed += delta;
    const elapsed = this.clock.elapsed;
    const motion = this.reducedMotion ? 0.22 : 1;

    this.controls.update();

    // 星盘与星尘
    this.starOrbit.rotation.y += delta * 0.05 * motion;
    this.starField.rotation.y += delta * 0.006 * motion;
    if (this.skyDome) this.skyDome.position.copy(this.camera.position);

    // 结界
    this.barrierUniforms.uTime.value = elapsed;

    // 法阵缓转
    this.formation.rotation.z -= delta * 0.028 * motion;

    // 灵枢
    if (this.centralOrb) {
      this.centralOrb.rotation.y += delta * 0.34 * motion;
      this.centralOrb.position.y = Math.sin(elapsed * 0.55) * 0.26;

      // 点击反馈：先涨后落的一次脉冲
      if (this.orbPulse > 0) this.orbPulse = Math.max(0, this.orbPulse - delta * 2.2);
      const pop = Math.sin(this.orbPulse * Math.PI) * 0.45;

      const s = 1 + Math.sin(elapsed * 1.3) * 0.03 + pop + (this.hoveredOrb ? 0.05 : 0);
      this.centralOrb.scale.setScalar(s);

      // 悬停与点击都要看得出来，否则用户不知道"这个能点"
      if (this.centralOrb.material instanceof THREE.MeshStandardMaterial) {
        this.centralOrb.material.emissiveIntensity =
          1.6 + (this.hoveredOrb ? 1.1 : 0) + pop * 3;
      }
    }
    this.spindleRings.forEach((ring, i) => {
      ring.rotation.z += delta * (0.2 + i * 0.12) * motion * (i % 2 === 0 ? 1 : -1);
    });
    this.ropeKnots.forEach((knot, i) => {
      knot.rotation.z += delta * (0.06 + i * 0.02) * motion * (i % 2 === 0 ? 1 : -1);
    });
    this.floatingTalismans.forEach((strip) => {
      const a = strip.userData.angle + elapsed * 0.24 * motion;
      strip.position.set(Math.cos(a) * strip.userData.radius, Math.sin(elapsed * 0.9 + a) * 0.7, Math.sin(a) * strip.userData.radius);
      strip.rotation.y = -a + Math.PI / 2;
      strip.rotation.z = Math.sin(elapsed * 1.4 + a) * 0.22;
    });

    // 鸟居轻微呼吸
    this.toriiGates.forEach((gate, i) => {
      gate.position.y = -6.4 + Math.sin(elapsed * 0.5 + i * 0.7) * 0.16 * motion;
    });

    // 卦象符咒
    this.talismans.forEach((t, i) => {
      t.update(elapsed, i, this.selectedHexagram, this.hoveredHexagram);
    });

    // 鬼火绕行
    const wp = this.wisps.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < WISP_COUNT; i++) {
      const baseR = this.wispBase[i * 3];
      const baseY = this.wispBase[i * 3 + 1];
      const baseA = this.wispBase[i * 3 + 2];
      const phase = this.wispPhase[i * 2];
      const speed = this.wispPhase[i * 2 + 1];

      const a = baseA + elapsed * speed * motion;
      const r = baseR + Math.sin(elapsed * 0.5 + phase) * 2.2 * motion;
      wp.setXYZ(
        i,
        Math.cos(a) * r,
        baseY + Math.sin(elapsed * 0.7 + phase) * 1.9 * motion,
        Math.sin(a) * r
      );
    }
    wp.needsUpdate = true;

    // 粒子爆发
    if (this.burstActive) {
      let alive = false;
      for (let i = 0; i < BURST_COUNT; i++) {
        if (this.burstLife[i] > 0) {
          alive = true;
          this.burstLife[i] -= delta * 1.15;
          this.burstPos[i * 3] += this.burstVel[i * 3] * delta;
          this.burstPos[i * 3 + 1] += this.burstVel[i * 3 + 1] * delta;
          this.burstPos[i * 3 + 2] += this.burstVel[i * 3 + 2] * delta;
          this.burstVel[i * 3] *= 0.97;
          this.burstVel[i * 3 + 1] = this.burstVel[i * 3 + 1] * 0.97 - delta * 4.5;
          this.burstVel[i * 3 + 2] *= 0.97;
        }
      }
      this.burstPoints.geometry.attributes.position.needsUpdate = true;
      const mat = this.burstPoints.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, mat.opacity - delta * 1.25);
      if (!alive || mat.opacity <= 0) {
        this.burstActive = false;
        this.burstPoints.visible = false;
      }
    }

    // 降临光柱跟随选中卦象
    const sel = this.talismans.find((t) => t.hexagram.number === this.selectedHexagram);
    if (sel) {
      const p = sel.group.position;
      this.descentBeam.position.set(p.x, p.y + 22, p.z);
      const mat = this.descentBeam.material as THREE.MeshBasicMaterial;
      mat.opacity += (0.34 - mat.opacity) * 0.06;
      this.descentBeam.visible = true;
      this.descentBeam.rotation.y += delta * 0.5 * motion;
    } else if (this.descentBeam.visible) {
      // 还没择卦（或卦号失效）时把光柱收掉
      const mat = this.descentBeam.material as THREE.MeshBasicMaterial;
      mat.opacity += (0 - mat.opacity) * 0.12;
      if (mat.opacity < 0.01) this.descentBeam.visible = false;
    }

    // 悬停拾取
    const picked = this.pick();
    if (picked.hexagram !== this.hoveredHexagram) {
      this.hoveredHexagram = picked.hexagram;
      this.callbacks.onHover?.(picked.hexagram);
    }
    if (picked.orb !== this.hoveredOrb) {
      this.hoveredOrb = picked.orb;
      this.callbacks.onOrbHover?.(picked.orb);
    }

    this.composer.render();
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.controls.dispose();

    this.talismans.forEach((t) => t.dispose());
    this.talismans = [];
    this.hitTargets = [];

    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m && 'map' in m && (m as THREE.MeshBasicMaterial).map) {
            (m as THREE.MeshBasicMaterial).map?.dispose();
          }
          m?.dispose();
        });
      }
    });

    this.composer?.dispose();
    this.renderer.dispose();
  }
}
