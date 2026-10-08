/* ===== 3D 卦象网格 ===== */
import * as THREE from 'three';
import type { Hexagram } from './data.js';

export class HexagramMesh {
  group: THREE.Group;
  lines: THREE.Mesh[] = [];
  hexagram: Hexagram;
  private targetScale: number = 1;
  private currentScale: number = 0.01; // 从小开始弹入
  private highlightIntensity: number = 0;
  private baseY: number = 0;

  constructor(hexagram: Hexagram, position: THREE.Vector3) {
    this.hexagram = hexagram;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.userData.hexagramNumber = hexagram.number;
    this.baseY = position.y;

    this.createLines();
    this.createGlowRing();
  }

  private createLines() {
    const lineHeight = 1.2;
    const lineWidth = 0.12;
    const lineDepth = 0.12;
    const gap = 0.15; // 阴爻中间的间隙
    const spacing = lineHeight + gap;

    this.hexagram.lines.forEach((line, i) => {
      let geometry: THREE.BoxGeometry;
      let material: THREE.MeshStandardMaterial;

      if (line === 1) {
        // 阳爻 — 实心金色圆柱
        geometry = new THREE.BoxGeometry(lineWidth, lineHeight, lineDepth);
        material = new THREE.MeshStandardMaterial({
          color: 0xd4a853,
          emissive: 0xd4a853,
          emissiveIntensity: 0.3,
          metalness: 0.7,
          roughness: 0.3,
        });
      } else {
        // 阴爻 — 分段（中间有间隙）
        const halfHeight = (lineHeight - gap) / 2;
        geometry = new THREE.BoxGeometry(lineWidth, halfHeight, lineDepth);
        material = new THREE.MeshStandardMaterial({
          color: 0x5b7fa5,
          emissive: 0x5b7fa5,
          emissiveIntensity: 0.15,
          metalness: 0.5,
          roughness: 0.4,
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      // 从下到上排列
      mesh.position.y = i * spacing - (this.hexagram.lines.length - 1) * spacing / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.group.add(mesh);
      this.lines.push(mesh);
    });
  }

  private createGlowRing() {
    // 底部光环
    const ringGeo = new THREE.RingGeometry(0.6, 0.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4a853,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.5;
    this.group.add(ring);
  }

  /** 每帧更新 */
  update(elapsed: number, index: number, selectedNum: number) {
    // 弹入动画
    if (this.currentScale < this.targetScale) {
      this.currentScale = Math.min(this.currentScale + 0.02, this.targetScale);
      this.group.scale.setScalar(this.currentScale);
    }

    // 选中高亮
    const isSelected = this.hexagram.number === selectedNum;
    const targetHighlight = isSelected ? 1 : 0;
    this.highlightIntensity += (targetHighlight - this.highlightIntensity) * 0.1;

    // 更新发光强度
    this.lines.forEach((line, i) => {
      if (line.material instanceof THREE.MeshStandardMaterial) {
        const baseEmissive = this.hexagram.lines[i] === 1 ? 0.3 : 0.15;
        line.material.emissiveIntensity = baseEmissive + this.highlightIntensity * 0.7;
      }
    });

    // 选中时轻微浮动
    if (isSelected) {
      this.group.position.y = this.baseY + Math.sin(elapsed * 2) * 0.3;
      this.group.rotation.y += 0.005;
    } else {
      this.group.position.y = this.baseY + Math.sin(elapsed * 0.5 + index * 0.1) * 0.1;
    }

    // 选中时放大
    const targetScale = isSelected ? 1.3 : 1.0;
    this.targetScale = targetScale;
  }

  /** 释放资源 */
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

    // 释放 group 中的所有子对象
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
