/* ===== 3D 卦象网格 — 阴阳师符咒风格 ===== */
import * as THREE from 'three';
import type { Hexagram } from './data.js';

export class HexagramMesh {
  group: THREE.Group;
  lines: THREE.Mesh[] = [];
  hexagram: Hexagram;
  private highlightIntensity: number = 0;
  private baseY: number = 0;
  private auraPlane!: THREE.Mesh;
  private glowRing!: THREE.Mesh;
  private outerRing!: THREE.Mesh;
  private sealDisc!: THREE.Mesh;
  private spawnProgress: number = 0;
  private spawnStarted: boolean = false;

  constructor(hexagram: Hexagram, position: THREE.Vector3) {
    this.hexagram = hexagram;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.userData.hexagramNumber = hexagram.number;
    this.baseY = position.y;

    this.createSealDisc();
    this.createAuraPlane();
    this.createLines();
    this.createGlowRing();
    this.createOuterRing();
  }

  private createSealDisc() {
    // 符咒底座 — 发光圆盘
    const yangCount = this.hexagram.lines.filter((l) => l === 1).length;
    const yinCount = 6 - yangCount;
    const isYangDominant = yangCount > yinCount;

    const discColor = isYangDominant ? 0xe8c547 : 0x7a5aaa;
    const discGeo = new THREE.CircleGeometry(1.2, 48);
    const discMat = new THREE.MeshBasicMaterial({
      color: discColor,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });
    this.sealDisc = new THREE.Mesh(discGeo, discMat);
    this.sealDisc.rotation.x = -Math.PI / 2;
    this.sealDisc.position.y = -3.0;
    this.group.add(this.sealDisc);
  }

  private createAuraPlane() {
    // 符咒背景光面 — 根据阴阳比例变色
    const yangCount = this.hexagram.lines.filter((l) => l === 1).length;
    const yinCount = 6 - yangCount;
    const isYangDominant = yangCount > yinCount;

    const auraColor = isYangDominant ? 0xe8c547 : 0x7a5aaa;
    const auraGeo = new THREE.PlaneGeometry(2.4, 3.2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: auraColor,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    });
    this.auraPlane = new THREE.Mesh(auraGeo, auraMat);
    this.auraPlane.position.y = -0.5;
    this.group.add(this.auraPlane);
  }

  private createLines() {
    const lineHeight = 1.2;
    const lineWidth = 0.18;
    const lineDepth = 0.18;
    const gap = 0.2;
    const spacing = lineHeight + gap;

    this.hexagram.lines.forEach((line, i) => {
      let geometry: THREE.BoxGeometry;
      let material: THREE.MeshStandardMaterial;

      if (line === 1) {
        // 阳爻 — 金色发光，更亮更宽
        geometry = new THREE.BoxGeometry(lineWidth, lineHeight, lineDepth);
        material = new THREE.MeshStandardMaterial({
          color: 0xe8c547,
          emissive: 0xe8c547,
          emissiveIntensity: 0.6,
          metalness: 0.9,
          roughness: 0.1,
        });
      } else {
        // 阴爻 — 紫色分段，更亮
        const halfHeight = (lineHeight - gap) / 2;
        geometry = new THREE.BoxGeometry(lineWidth, halfHeight, lineDepth);
        material = new THREE.MeshStandardMaterial({
          color: 0x9b6bcf,
          emissive: 0x7a5aaa,
          emissiveIntensity: 0.4,
          metalness: 0.7,
          roughness: 0.3,
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = i * spacing - (this.hexagram.lines.length - 1) * spacing / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.group.add(mesh);
      this.lines.push(mesh);
    });
  }

  private createGlowRing() {
    // 内圈光环 — 选中时更亮
    const ringGeo = new THREE.RingGeometry(0.6, 0.75, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc41e3a,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    this.glowRing = new THREE.Mesh(ringGeo, ringMat);
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = -3.1;
    this.group.add(this.glowRing);
  }

  private createOuterRing() {
    // 外圈 — 符咒边框
    const outerGeo = new THREE.RingGeometry(1.3, 1.45, 48);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xc41e3a,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    this.outerRing = new THREE.Mesh(outerGeo, outerMat);
    this.outerRing.rotation.x = -Math.PI / 2;
    this.outerRing.position.y = -3.05;
    this.group.add(this.outerRing);
  }

  update(elapsed: number, index: number, selectedNum: number) {
    // 弹入动画 — 符咒展开效果
    if (!this.spawnStarted) {
      this.spawnStarted = true;
      //  staggered spawn based on index
      setTimeout(() => {
        this.spawnProgress = 0;
      }, index * 30);
    }

    if (this.spawnProgress < 1) {
      this.spawnProgress = Math.min(this.spawnProgress + 0.03, 1);
      // Ease out cubic for smooth unfold
      const t = 1 - Math.pow(1 - this.spawnProgress, 3);
      this.group.scale.setScalar(t);
      // 初始微旋转，展开时归零
      this.group.rotation.z = (1 - t) * 0.3;
      this.group.rotation.x = (1 - t) * 0.1;
    }

    const isSelected = this.hexagram.number === selectedNum;
    const targetHighlight = isSelected ? 1 : 0;
    this.highlightIntensity += (targetHighlight - this.highlightIntensity) * 0.08;

    // 更新发光强度
    this.lines.forEach((line, i) => {
      if (line.material instanceof THREE.MeshStandardMaterial) {
        const baseEmissive = this.hexagram.lines[i] === 1 ? 0.6 : 0.4;
        line.material.emissiveIntensity = baseEmissive + this.highlightIntensity * 1.2;
      }
    });

    // 光环和背景随选中状态变化
    if (this.auraPlane.material instanceof THREE.MeshBasicMaterial) {
      const baseOpacity = isSelected ? 0.12 : 0.04;
      this.auraPlane.material.opacity = baseOpacity + this.highlightIntensity * 0.15;
    }

    if (this.glowRing.material instanceof THREE.MeshBasicMaterial) {
      const baseRingOpacity = isSelected ? 0.4 : 0.15;
      this.glowRing.material.opacity = baseRingOpacity + Math.sin(elapsed * 3) * 0.05 * this.highlightIntensity;
    }

    if (this.outerRing.material instanceof THREE.MeshBasicMaterial) {
      const baseOuterOpacity = isSelected ? 0.3 : 0.08;
      this.outerRing.material.opacity = baseOuterOpacity + this.highlightIntensity * 0.2;
    }

    if (this.sealDisc.material instanceof THREE.MeshBasicMaterial) {
      const baseDiscOpacity = isSelected ? 0.08 : 0.03;
      this.sealDisc.material.opacity = baseDiscOpacity + this.highlightIntensity * 0.06;
    }

    // 选中时浮动 + 旋转 + 脉动
    if (isSelected) {
      this.group.position.y = this.baseY + Math.sin(elapsed * 2) * 0.4;
      this.group.rotation.y += 0.012;
      // 脉动缩放
      const pulse = 1 + Math.sin(elapsed * 3) * 0.03;
      if (this.spawnProgress >= 1) {
        this.group.scale.setScalar(pulse);
      }
    } else {
      this.group.position.y = this.baseY + Math.sin(elapsed * 0.5 + index * 0.15) * 0.15;
      // 缓慢旋转
      this.group.rotation.y += 0.003;
    }

  }

  dispose() {
    this.lines.forEach((line: THREE.Mesh) => {
      line.geometry?.dispose();
      if (Array.isArray(line.material)) {
        line.material.forEach((m: THREE.Material) => m.dispose());
      } else {
        line.material?.dispose();
      }
    });
    this.lines = [];

    this.group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }
}
