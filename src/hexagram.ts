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
  private talismanPaper!: THREE.Mesh;
  private redSeal!: THREE.Mesh;
  private edgeGlow!: THREE.Mesh;
  private spawnProgress: number = 0;
  private spawnStarted: boolean = false;
  private selectProgress: number = 0;

  constructor(hexagram: Hexagram, position: THREE.Vector3) {
    this.hexagram = hexagram;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.userData.hexagramNumber = hexagram.number;
    this.baseY = position.y;

    this.createTalismanPaper();
    this.createSealDisc();
    this.createAuraPlane();
    this.createLines();
    this.createGlowRing();
    this.createOuterRing();
    this.createRedSeal();
    this.createEdgeGlow();
  }

  /** 符咒纸面 — 淡金色矩形背景 */
  private createTalismanPaper() {
    const paperGeo = new THREE.PlaneGeometry(1.8, 4.5);
    const paperMat = new THREE.MeshBasicMaterial({
      color: 0xf5e6c8,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
    });
    this.talismanPaper = new THREE.Mesh(paperGeo, paperMat);
    this.talismanPaper.position.y = -0.3;
    this.group.add(this.talismanPaper);
  }

  /** 底座光盘 */
  private createSealDisc() {
    const yangCount = this.hexagram.lines.filter((l) => l === 1).length;
    const isYangDominant = yangCount > 3;
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

  /** 背景光面 */
  private createAuraPlane() {
    const yangCount = this.hexagram.lines.filter((l) => l === 1).length;
    const isYangDominant = yangCount > 3;
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

  /** 卦象线条 — 更宽更亮，像书法笔触 */
  private createLines() {
    const lineHeight = 1.2;
    const lineWidth = 0.22;
    const lineDepth = 0.22;
    const gap = 0.2;
    const spacing = lineHeight + gap;

    this.hexagram.lines.forEach((line, i) => {
      let geometry: THREE.BoxGeometry;
      let material: THREE.MeshStandardMaterial;

      if (line === 1) {
        // 阳爻 — 金色，更亮更宽
        geometry = new THREE.BoxGeometry(lineWidth, lineHeight, lineDepth);
        material = new THREE.MeshStandardMaterial({
          color: 0xe8c547,
          emissive: 0xe8c547,
          emissiveIntensity: 0.7,
          metalness: 0.9,
          roughness: 0.1,
        });
      } else {
        // 阴爻 — 紫色分段
        const halfHeight = (lineHeight - gap) / 2;
        geometry = new THREE.BoxGeometry(lineWidth, halfHeight, lineDepth);
        material = new THREE.MeshStandardMaterial({
          color: 0x9b6bcf,
          emissive: 0x7a5aaa,
          emissiveIntensity: 0.5,
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

  /** 内圈光环 */
  private createGlowRing() {
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

  /** 外圈边框 */
  private createOuterRing() {
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

  /** 红色印章 — 符咒上的红色印记 */
  private createRedSeal() {
    const sealGeo = new THREE.CircleGeometry(0.35, 32);
    const sealMat = new THREE.MeshBasicMaterial({
      color: 0xc41e3a,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    this.redSeal = new THREE.Mesh(sealGeo, sealMat);
    this.redSeal.position.set(0.6, 1.8, 0.1);
    this.group.add(this.redSeal);
  }

  /** 边缘光晕 — 符咒边缘发光 */
  private createEdgeGlow() {
    const edgeGeo = new THREE.PlaneGeometry(1.8, 4.5);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xe8c547,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    this.edgeGlow = new THREE.Mesh(edgeGeo, edgeMat);
    this.edgeGlow.position.y = -0.3;
    this.edgeGlow.position.z = -0.05;
    this.group.add(this.edgeGlow);
  }

  update(elapsed: number, index: number, selectedNum: number) {
    // 弹入动画 — 符咒展开效果
    if (!this.spawnStarted) {
      this.spawnStarted = true;
      setTimeout(() => {
        this.spawnProgress = 0;
      }, index * 25);
    }

    if (this.spawnProgress < 1) {
      this.spawnProgress = Math.min(this.spawnProgress + 0.04, 1);
      const t = 1 - Math.pow(1 - this.spawnProgress, 3);
      this.group.scale.setScalar(t);
      this.group.rotation.z = (1 - t) * 0.2;
      this.group.rotation.x = (1 - t) * 0.08;
    }

    const isSelected = this.hexagram.number === selectedNum;

    // 选中时的降临效果
    if (isSelected && this.selectProgress < 1) {
      this.selectProgress = Math.min(this.selectProgress + 0.06, 1);
    } else if (!isSelected && this.selectProgress > 0) {
      this.selectProgress = Math.max(this.selectProgress - 0.08, 0);
    }

    const targetHighlight = isSelected ? 1 : 0;
    this.highlightIntensity += (targetHighlight - this.highlightIntensity) * 0.08;

    // 更新发光强度
    this.lines.forEach((line, i) => {
      if (line.material instanceof THREE.MeshStandardMaterial) {
        const baseEmissive = this.hexagram.lines[i] === 1 ? 0.7 : 0.5;
        line.material.emissiveIntensity = baseEmissive + this.highlightIntensity * 1.5;
      }
    });

    // 符咒纸面随选中状态变化
    if (this.talismanPaper.material instanceof THREE.MeshBasicMaterial) {
      const baseOpacity = isSelected ? 0.08 : 0.02;
      this.talismanPaper.material.opacity = baseOpacity + this.selectProgress * 0.1;
    }

    if (this.auraPlane.material instanceof THREE.MeshBasicMaterial) {
      const baseOpacity = isSelected ? 0.15 : 0.04;
      this.auraPlane.material.opacity = baseOpacity + this.highlightIntensity * 0.2;
    }

    if (this.glowRing.material instanceof THREE.MeshBasicMaterial) {
      const baseRingOpacity = isSelected ? 0.5 : 0.15;
      this.glowRing.material.opacity = baseRingOpacity + Math.sin(elapsed * 3) * 0.08 * this.selectProgress;
    }

    if (this.outerRing.material instanceof THREE.MeshBasicMaterial) {
      const baseOuterOpacity = isSelected ? 0.35 : 0.08;
      this.outerRing.material.opacity = baseOuterOpacity + this.highlightIntensity * 0.25;
    }

    if (this.sealDisc.material instanceof THREE.MeshBasicMaterial) {
      const baseDiscOpacity = isSelected ? 0.1 : 0.03;
      this.sealDisc.material.opacity = baseDiscOpacity + this.highlightIntensity * 0.08;
    }

    if (this.redSeal.material instanceof THREE.MeshBasicMaterial) {
      const baseSealOpacity = isSelected ? 0.35 : 0.1;
      this.redSeal.material.opacity = baseSealOpacity + this.selectProgress * 0.2;
      // 印章脉动
      const pulse = 1 + Math.sin(elapsed * 4) * 0.1 * this.selectProgress;
      this.redSeal.scale.setScalar(pulse);
    }

    if (this.edgeGlow.material instanceof THREE.MeshBasicMaterial) {
      const baseEdgeOpacity = isSelected ? 0.08 : 0.0;
      this.edgeGlow.material.opacity = baseEdgeOpacity + this.selectProgress * 0.12;
    }

    // 选中时浮动 + 旋转 + 脉动 + 降临效果
    if (isSelected) {
      // 符咒降临 — 从上方缓缓下降
      const descendOffset = (1 - this.selectProgress) * 2;
      this.group.position.y = this.baseY + Math.sin(elapsed * 2) * 0.4 - descendOffset;
      this.group.rotation.y += 0.015;
      // 脉动缩放
      const pulse = 1.4 + Math.sin(elapsed * 3) * 0.05 * this.selectProgress;
      if (this.spawnProgress >= 1) {
        this.group.scale.setScalar(pulse);
      }
    } else {
      this.group.position.y = this.baseY + Math.sin(elapsed * 0.5 + index * 0.15) * 0.15;
      this.group.rotation.y += 0.003;
      if (this.spawnProgress >= 1) {
        this.group.scale.setScalar(1);
      }
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
