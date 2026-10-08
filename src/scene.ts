/* ===== Three.js 场景 — 阴阳师符咒风格 + OrbitControls ===== */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { hexagrams } from './data.js';
import { HexagramMesh } from './hexagram.js';

export class IChingScene {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;
  clock: THREE.Clock;
  hexagramMeshes: HexagramMesh[] = [];
  centralOrb!: THREE.Mesh;
  particles!: THREE.Points;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  selectedHexagram: number = 1;
  hoveredHexagram: number | null = null;
  animationId: number = 0;
  isRunning: boolean = false;
  onHexagramSelect?: (num: number) => void;
  onHexagramHover?: (num: number | null) => void;


  constructor(
    canvas: HTMLCanvasElement,
    options?: { onSelect?: (num: number) => void; onHover?: (num: number | null) => void }
  ) {
    this.onHexagramSelect = options?.onSelect;
    this.onHexagramHover = options?.onHover;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.clock = new THREE.Clock();

    this.initRenderer(canvas);
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initLights();
    this.createCentralOrb();
    this.createHexagrams();
    this.createParticles();
    this.createGround();
    this.createVignette();
    this.setupResize();
  }

  initRenderer(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
      console.warn('WebGL context lost');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored');
      this.start();
    });
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050308);
    this.scene.fog = new THREE.FogExp2(0x050308, 0.008);
  }

  initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
    this.camera.position.set(0, 14, 38);
    this.camera.lookAt(0, 0, 0);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 65;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.target.set(0, 1, 0);
    this.controls.update();
  }

  initLights() {
    // 微弱环境光
    const ambient = new THREE.AmbientLight(0x1a0a14, 0.3);
    this.scene.add(ambient);

    // 主方向光 — 月光
    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.6);
    dirLight.position.set(10, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    this.scene.add(dirLight);

    // 红色点光 — 灯笼光（更强）
    const pointLight1 = new THREE.PointLight(0xc41e3a, 3.5, 60);
    pointLight1.position.set(5, 10, 5);
    this.scene.add(pointLight1);

    // 金色点光（更强）
    const pointLight2 = new THREE.PointLight(0xe8c547, 2.5, 50);
    pointLight2.position.set(-8, 8, -5);
    this.scene.add(pointLight2);

    // 紫色点光 — 神秘感（更强）
    const pointLight3 = new THREE.PointLight(0x7a5aaa, 2, 45);
    pointLight3.position.set(0, 5, -12);
    this.scene.add(pointLight3);

    // 底部补光
    const pointLight4 = new THREE.PointLight(0x221133, 1.2, 30);
    pointLight4.position.set(0, -4, 0);
    this.scene.add(pointLight4);

    // 顶部冷光 — 增加层次感
    const pointLight5 = new THREE.PointLight(0x4422aa, 0.8, 40);
    pointLight5.position.set(0, 20, 0);
    this.scene.add(pointLight5);
  }

  createCentralOrb() {
    // 外层大球 — 柔和光晕
    const outerGeo = new THREE.SphereGeometry(2.2, 64, 64);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xc41e3a,
      transparent: true,
      opacity: 0.06,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.position.set(0, 2, 0);
    this.scene.add(outer);

    // 中间球 — 太极球
    const geo = new THREE.SphereGeometry(1.5, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc41e3a,
      emissive: 0xc41e3a,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1,
    });
    this.centralOrb = new THREE.Mesh(geo, mat);
    this.centralOrb.position.set(0, 2, 0);
    this.centralOrb.castShadow = true;
    this.scene.add(this.centralOrb);

    // 内核 — 金色（更亮）
    const coreGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xe8c547,
      emissive: 0xe8c547,
      emissiveIntensity: 1.0,
      metalness: 1.0,
      roughness: 0.0,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 2, 0);
    this.scene.add(core);

    // 光环 1 — 红色（更大更亮）
    const ringGeo = new THREE.TorusGeometry(2.5, 0.03, 16, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc41e3a,
      transparent: true,
      opacity: 0.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.centralOrb.position);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    // 光环 2 — 金色
    const ring2Geo = new THREE.TorusGeometry(3.2, 0.025, 16, 128);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xe8c547,
      transparent: true,
      opacity: 0.35,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.position.copy(this.centralOrb.position);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.z = Math.PI / 6;
    this.scene.add(ring2);

    // 光环 3 — 紫色
    const ring3Geo = new THREE.TorusGeometry(4.0, 0.02, 16, 128);
    const ring3Mat = new THREE.MeshBasicMaterial({
      color: 0x7a5aaa,
      transparent: true,
      opacity: 0.25,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.position.copy(this.centralOrb.position);
    ring3.rotation.x = Math.PI / 4;
    ring3.rotation.y = Math.PI / 5;
    this.scene.add(ring3);

    // 光环 4 — 白色微弱（增加神秘感）
    const ring4Geo = new THREE.TorusGeometry(4.8, 0.015, 16, 128);
    const ring4Mat = new THREE.MeshBasicMaterial({
      color: 0xccccff,
      transparent: true,
      opacity: 0.12,
    });
    const ring4 = new THREE.Mesh(ring4Geo, ring4Mat);
    ring4.position.copy(this.centralOrb.position);
    ring4.rotation.x = Math.PI / 5;
    ring4.rotation.z = Math.PI / 3;
    this.scene.add(ring4);
  }

  createHexagrams() {
    const radius = 18;
    const count = hexagrams.length;

    hexagrams.forEach((hex, i) => {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle * 2) * 1.5;

      const mesh = new HexagramMesh(hex, new THREE.Vector3(x, y, z));
      mesh.group.rotation.y = -angle + Math.PI;
      // 初始缩放为0，弹入动画
      mesh.group.scale.setScalar(0.01);
      this.scene.add(mesh.group);
      this.hexagramMeshes.push(mesh);
    });
  }

  createParticles() {
    const particleCount = 1200;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const crimson = new THREE.Color(0xc41e3a);
    const gold = new THREE.Color(0xe8c547);
    const purple = new THREE.Color(0x7a5aaa);
    const white = new THREE.Color(0xeeddff);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      sizes[i] = Math.random() * 2.5 + 0.2;

      const colorChoice = Math.random();
      let color: THREE.Color;
      if (colorChoice < 0.3) color = crimson;
      else if (colorChoice < 0.55) color = gold;
      else if (colorChoice < 0.75) color = purple;
      else color = white;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  createGround() {
    // 地面网格
    const groundGeo = new THREE.PlaneGeometry(120, 120, 60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x080410,
      emissive: 0x080410,
      emissiveIntensity: 0.15,
      metalness: 0.9,
      roughness: 0.5,
      transparent: true,
      opacity: 0.5,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 同心圆地面纹理
    const circleGeo = new THREE.RingGeometry(5, 50, 64);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x1a0a14,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = -4.98;
    this.scene.add(circle);

    // 内圈
    const innerCircleGeo = new THREE.RingGeometry(2, 18, 64);
    const innerCircleMat = new THREE.MeshBasicMaterial({
      color: 0x1a0a14,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const innerCircle = new THREE.Mesh(innerCircleGeo, innerCircleMat);
    innerCircle.rotation.x = -Math.PI / 2;
    innerCircle.position.y = -4.97;
    this.scene.add(innerCircle);

    // 网格线
    const gridHelper = new THREE.GridHelper(80, 40, 0x1a0a14, 0x0a0610);
    gridHelper.position.y = -4.96;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.1;
    this.scene.add(gridHelper);
  }

  /** 暗角效果 — 用 CSS overlay 实现更高效 */
  private createVignette() {
    // 暗角通过 CSS overlay 实现，不在此处创建
  }

  setupResize() {
    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);
  }

  private _onResize: () => void = () => {};

  setMouse(nx: number, ny: number) {
    this.mouse.x = nx;
    this.mouse.y = ny;
  }

  updateRaycast(): number | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.hexagramMeshes.map((h) => h.group),
      true
    );

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData.hexagramNumber) {
        obj = obj.parent;
      }
      if (obj.userData.hexagramNumber) {
        return obj.userData.hexagramNumber;
      }
    }
    return null;
  }

  selectHexagram(num: number) {
    this.selectedHexagram = num;
    this.onHexagramSelect?.(num);
  }

  /** 平滑移动相机到目标卦象 */
  focusOnHexagram(num: number) {
    const hex = hexagrams.find((h) => h.number === num);
    if (!hex) return;

    const idx = hexagrams.indexOf(hex);
    const count = hexagrams.length;
    const angle = (idx / count) * Math.PI * 2;
    const radius = 18;
    const targetX = Math.cos(angle) * radius;
    const targetZ = Math.sin(angle) * radius;
    const targetY = Math.sin(angle * 2) * 1.2;

    const startTarget = this.controls.target.clone();
    const endTarget = new THREE.Vector3(targetX, targetY, targetZ);

    const duration = 1200;
    const startTime = performance.now();

    const animateFocus = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateFocus);
      }
    };
    animateFocus();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
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

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // 更新控制器
    this.controls.update();

    // 更新中央球体
    if (this.centralOrb) {
      this.centralOrb.rotation.y += delta * 0.2;
      this.centralOrb.position.y = 2 + Math.sin(elapsed * 0.4) * 0.4;
    }

    // 更新卦象动画
    this.hexagramMeshes.forEach((mesh, i) => {
      mesh.update(elapsed, i, this.selectedHexagram);
    });

    // 粒子缓慢旋转 + 浮动
    if (this.particles) {
      this.particles.rotation.y += delta * 0.015;
      this.particles.rotation.x = Math.sin(elapsed * 0.1) * 0.02;
    }

    // 射线检测
    const hovered = this.updateRaycast();
    if (hovered !== this.hoveredHexagram) {
      this.hoveredHexagram = hovered;
      this.onHexagramHover?.(hovered);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();

    this.hexagramMeshes.forEach((mesh) => mesh.dispose());
    this.hexagramMeshes = [];

    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
