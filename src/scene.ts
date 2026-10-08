/* ===== Three.js 场景设置 ===== */
import * as THREE from 'three';
import { hexagrams } from './data.js';
import { HexagramMesh } from './hexagram.js';

export class IChingScene {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  clock: THREE.Clock;
  hexagramMeshes: HexagramMesh[] = [];
  centralOrb!: THREE.Mesh;
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
    this.initLights();
    this.createCentralOrb();
    this.createHexagrams();
    this.createParticles();
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

    // 上下文丢失处理
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
    this.scene.background = new THREE.Color(0x08080e);
    this.scene.fog = new THREE.FogExp2(0x08080e, 0.012);
  }

  initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 500);
    this.camera.position.set(0, 8, 30);
    this.camera.lookAt(0, 0, 0);
  }

  initLights() {
    // 环境光
    const ambient = new THREE.AmbientLight(0x332211, 0.6);
    this.scene.add(ambient);

    // 主方向光
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(10, 20, 10);
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

    // 暖色点光
    const pointLight1 = new THREE.PointLight(0xd4a853, 2, 50);
    pointLight1.position.set(5, 10, 5);
    this.scene.add(pointLight1);

    // 冷色点光
    const pointLight2 = new THREE.PointLight(0x5b7fa5, 1.5, 40);
    pointLight2.position.set(-8, 5, -5);
    this.scene.add(pointLight2);

    // 底部补光
    const pointLight3 = new THREE.PointLight(0x334466, 1, 30);
    pointLight3.position.set(0, -5, 0);
    this.scene.add(pointLight3);
  }

  createCentralOrb() {
    // 太极球 — 中心发光体
    const geo = new THREE.SphereGeometry(1.5, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd4a853,
      emissive: 0xd4a853,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.centralOrb = new THREE.Mesh(geo, mat);
    this.centralOrb.position.set(0, 2, 0);
    this.centralOrb.castShadow = true;
    this.scene.add(this.centralOrb);

    // 外层光环
    const ringGeo = new THREE.TorusGeometry(2.2, 0.03, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4a853,
      transparent: true,
      opacity: 0.3,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.centralOrb.position);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    // 第二层光环
    const ring2Geo = new THREE.TorusGeometry(2.8, 0.02, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x5b7fa5,
      transparent: true,
      opacity: 0.2,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.position.copy(this.centralOrb.position);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.z = Math.PI / 6;
    this.scene.add(ring2);
  }

  createHexagrams() {
    const radius = 18;
    const count = hexagrams.length;

    hexagrams.forEach((hex, i) => {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle * 2) * 1.5; // 轻微起伏

      const mesh = new HexagramMesh(hex, new THREE.Vector3(x, y, z));
      mesh.group.rotation.y = -angle + Math.PI; // 面向中心
      this.scene.add(mesh.group);
      this.hexagramMeshes.push(mesh);
    });
  }

  createParticles() {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      sizes[i] = Math.random() * 2 + 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xd4a853,
      size: 0.08,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);
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

  /** 设置鼠标位置（归一化设备坐标） */
  setMouse(nx: number, ny: number) {
    this.mouse.x = nx;
    this.mouse.y = ny;
  }

  /** 执行射线检测 */
  updateRaycast(): number | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.hexagramMeshes.map((h) => h.group),
      true
    );

    if (intersects.length > 0) {
      // 找到对应的 hexagram mesh
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

  /** 选中卦象 */
  selectHexagram(num: number) {
    this.selectedHexagram = num;
    this.onHexagramSelect?.(num);
  }

  /** 相机平滑移动到目标卦象 */
  focusOnHexagram(num: number) {
    const hex = hexagrams.find((h) => h.number === num);
    if (!hex) return;

    const idx = hexagrams.indexOf(hex);
    const count = hexagrams.length;
    const angle = (idx / count) * Math.PI * 2;
    const radius = 18;
    const targetX = Math.cos(angle) * radius;
    const targetZ = Math.sin(angle) * radius;
    const targetY = Math.sin(angle * 2) * 1.5;

    // 简单的相机动画
    const startPos = this.camera.position.clone();
    const endPos = new THREE.Vector3(targetX * 0.6, targetY + 5, targetZ * 0.6 + 15);
    const startTarget = this.camera.position.clone();
    const endTarget = new THREE.Vector3(targetX, targetY, targetZ);

    const duration = 1000;
    const startTime = performance.now();

    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.camera.lookAt(
        THREE.MathUtils.lerp(startTarget.x, endTarget.x, ease),
        THREE.MathUtils.lerp(startTarget.y, endTarget.y, ease),
        THREE.MathUtils.lerp(startTarget.z, endTarget.z, ease)
      );

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      }
    };
    animateCamera();
  }

  /** 启动动画循环 */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  /** 停止动画循环 */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  /** 主动画循环 */
  private animate() {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // 更新中央球体
    if (this.centralOrb) {
      this.centralOrb.rotation.y += delta * 0.3;
      this.centralOrb.position.y = 2 + Math.sin(elapsed * 0.5) * 0.3;
    }

    // 更新卦象动画
    this.hexagramMeshes.forEach((mesh, i) => {
      mesh.update(elapsed, i, this.selectedHexagram);
    });

    // 射线检测
    const hovered = this.updateRaycast();
    if (hovered !== this.hoveredHexagram) {
      this.hoveredHexagram = hovered;
      this.onHexagramHover?.(hovered);
    }

    // 渲染
    this.renderer.render(this.scene, this.camera);
  }

  /** 释放资源 */
  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);

    this.hexagramMeshes.forEach((mesh) => mesh.dispose());
    this.hexagramMeshes = [];

    this.scene.traverse((obj) => {
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
