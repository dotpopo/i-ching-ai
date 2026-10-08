/* ===== 3D 卦象网格 — 阴阳师风格 ===== */
import * as THREE from 'three';
import type { Hexagram } from './data.js';

export class HexagramMesh {
  group: THREE.Group;
  lines: THREE.Mesh[] = [];
  hexagram: Hexagram;
  private targetScale: number = 1;
  private currentScale: number = 0.01;
  private highlightIntensity: number = 0;
  private baseY: number = 0;
  private aura!: THREE.Mesh;

  constructor(hexagram: Hexagram, position: THREE.Vector3) {
    this.hexagram = hexagram;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.userData.hexagramNumber = hexagram.number;
    this.baseY = position.y;

    this.createLines();
    this.createAura();
    this.createGlowRing();
  }

  private createLines() {
    const lineHeight = 1.2;
    const lineWidth = 0.14;
    const lineDepth = 0.14;
    const gap = 0.18;
    const spacing = lineHeight + gap;

    this.hexagram.lines.forEach((line, i) => {
      let geometry: THREE.BoxGeometry;
      let material: THREE.MeshStandardMaterial;

      if (line === 1) {
        // 阳爻 — 金色发光
        geometry = new THREE.BoxGeometry(lineWidth, lineHeight, lineDepth);
        material = new THREE.MeshStandardMaterial({
          color: 0xe8c547,
          emissive: 0xe8c547,
          emissiveIntensity: 0.4,
          metalness: 0.8,
          roughness: 0.2,
        });
      } else {
        // 阴爻 — 紫色分段
        const halfHeight = (lineHeight - gap) / 2;
        geometry = new THREE.BoxGeometry(lineWidth, halfHeight, lineDepth);
        material = new THREE.MeshStandardMaterial({
          color: 0x7a5aaa,
          emissive: 0x7a5aaa,
          emissiveIntensity: 0.2,
          metalness: 0.5,
          roughness: 0.4,
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

  private createAura() {
    // 卦象光环 — 根据阴阳比例变色
    const yangCount = this.hexagram.lines.filter((l) => l === 1).length;
    const yinCount = 6 - yangCount;
    const isYangDominant = yangCount > yinCount;

    const auraColor = isYangDominant ? 0xe8c547 : 0x7a5aaa;
    const auraGeo = new THREE.CircleGeometry(0.8, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: auraColor,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    this.aura = new THREE.Mesh(auraGeo, auraMat);
    this.aura.rotation.x = -Math.PI / 2;
    this.aura.position.y = -2.8;
    this.group.add(this.aura);
  }

  private createGlowRing() {
    const ringGeo = new THREE.RingGeometry(0.5, 0.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc41e3a,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.9;
    this.group.add(ring);
  }

  update(elapsed: number, index: number, selectedNum: number) {
    // 弹入动画
    if (this.currentScale < this.targetScale) {
      this.currentScale = Math.min(this.currentScale + 0.02, this.targetScale);
      this.group.scale.setScalar(this.currentScale);
    }

    const isSelected = this.hexagram.number === selectedNum;
    const targetHighlight = isSelected ? 1 : 0;
    this.highlightIntensity += (targetHighlight - this.highlightIntensity) * 0.1;

    // 更新发光强度
    this.lines.forEach((line, i) => {
      if (line.material instanceof THREE.MeshStandardMaterial) {
        const baseEmissive = this.hexagram.lines[i] === 1 ? 0.4 : 0.2;
        line.material.emissiveIntensity = baseEmissive + this.highlightIntensity * 0.8;
      }
    });

    // 选中时浮动 + 旋转
    if (isSelected) {
      this.group.position.y = this.baseY + Math.sin(elapsed * 2) * 0.3;
      this.group.rotation.y += 0.008;
      if (this.aura.material instanceof THREE.MeshBasicMaterial) {
        this.aura.material.opacity = 0.15 + Math.sin(elapsed * 3) * 0.05;
      }
    } else {
      this.group.position.y = this.baseY + Math.sin(elapsed * 0.5 + index * 0.1) * 0.1;
      if (this.aura.material instanceof THREE.MeshBasicMaterial) {
        this.aura.material.opacity = 0.06;
      }
    }

    // 选中时放大
    const targetScale = isSelected ? 1.3 : 1.0;
    this.targetScale = targetScale;
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
