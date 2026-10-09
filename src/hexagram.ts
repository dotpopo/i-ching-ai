/* ============================================================
   卦象符咒 · 3D 单元
   一张符纸 = 一个卦。纸面用 Canvas 真绘制（卦名 / 六爻 / 朱印），
   未选中时整体压暗成"灵体"，选中时"觉醒"为实体符纸。
   ============================================================ */
import * as THREE from 'three';
import type { Hexagram } from './data.js';

const TEX_W = 256;
const TEX_H = 448;

/** 把卦象画成符纸贴图。真绘制，不是拼图。 */
function makeTalismanTexture(hex: Hexagram): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = TEX_W;
  cv.height = TEX_H;
  const g = cv.getContext('2d')!;
  const yangCount = hex.lines.reduce((a: number, l) => a + l, 0);
  const isYangDominant = yangCount > 3;

  g.clearRect(0, 0, TEX_W, TEX_H);

  // --- 符纸底 ---
  const paper = g.createLinearGradient(0, 0, TEX_W, TEX_H);
  paper.addColorStop(0, '#f6efe0');
  paper.addColorStop(0.45, '#ece1cb');
  paper.addColorStop(1, '#ddd0b6');
  g.fillStyle = paper;
  roundRect(g, 6, 6, TEX_W - 12, TEX_H - 12, 10);
  g.fill();

  // --- 纸纹：细横纹，模拟和纸 ---
  g.save();
  g.globalAlpha = 0.05;
  g.strokeStyle = '#6b5a3e';
  g.lineWidth = 1;
  for (let y = 14; y < TEX_H - 14; y += 5) {
    g.beginPath();
    g.moveTo(12, y);
    g.lineTo(TEX_W - 12, y);
    g.stroke();
  }
  g.restore();

  // --- 双线金框 ---
  g.strokeStyle = 'rgba(185, 140, 44, 0.85)';
  g.lineWidth = 3;
  roundRect(g, 14, 14, TEX_W - 28, TEX_H - 28, 6);
  g.stroke();
  g.strokeStyle = 'rgba(185, 140, 44, 0.4)';
  g.lineWidth = 1;
  roundRect(g, 22, 22, TEX_W - 44, TEX_H - 44, 4);
  g.stroke();

  // --- 顶部：卦序 ---
  g.fillStyle = 'rgba(120, 96, 56, 0.9)';
  g.font = '600 22px "Shippori Mincho", "Noto Serif SC", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`第 ${hex.number} 卦`, TEX_W / 2, 52);

  // --- 中部：卦名（大字） ---
  g.save();
  g.shadowColor = 'rgba(163, 18, 42, 0.28)';
  g.shadowBlur = 10;
  g.fillStyle = '#1b1a17';
  g.font = '800 104px "Shippori Mincho", "Noto Serif SC", serif';
  g.fillText(hex.name, TEX_W / 2, 150);
  g.restore();

  // 卦名下的朱红短横
  g.fillStyle = 'rgba(163, 18, 42, 0.72)';
  g.fillRect(TEX_W / 2 - 44, 208, 88, 3);

  // --- 下部：六爻 ---
  const barW = 132;
  const barH = 15;
  const gap = 15;
  const startY = 246;
  const x0 = (TEX_W - barW) / 2;

  hex.lines.forEach((line, i) => {
    // lines[0] 是初爻（最下），画的时候要反过来
    const row = hex.lines.length - 1 - i;
    const y = startY + row * (barH + gap);

    if (line === 1) {
      const grad = g.createLinearGradient(x0, y, x0 + barW, y);
      grad.addColorStop(0, '#b98c2c');
      grad.addColorStop(0.5, '#f0c869');
      grad.addColorStop(1, '#b98c2c');
      g.fillStyle = grad;
      roundRect(g, x0, y, barW, barH, 4);
      g.fill();
    } else {
      const half = (barW - 22) / 2;
      g.fillStyle = '#6d4bb0';
      roundRect(g, x0, y, half, barH, 4);
      g.fill();
      roundRect(g, x0 + half + 22, y, half, barH, 4);
      g.fill();
    }
  });

  // --- 底部：朱红印章 ---
  const sealSize = 46;
  const sx = TEX_W / 2 - sealSize / 2;
  const sy = TEX_H - 78;
  g.fillStyle = 'rgba(163, 18, 42, 0.9)';
  roundRect(g, sx, sy, sealSize, sealSize, 6);
  g.fill();
  g.fillStyle = 'rgba(246, 239, 224, 0.95)';
  g.font = '700 27px "Shippori Mincho", "Noto Serif SC", serif';
  g.fillText(isYangDominant ? '阳' : '阴', TEX_W / 2, sy + sealSize / 2 + 1);

  // --- 底部标签 ---
  g.fillStyle = 'rgba(120, 96, 56, 0.72)';
  g.font = '500 15px "Zen Maru Gothic", "Noto Sans SC", sans-serif';
  g.fillText(hex.chinese, TEX_W / 2, TEX_H - 44);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** 一张卦象符咒 */
export class HexagramTalisman {
  group: THREE.Group;
  hexagram: Hexagram;
  /** 供射线拾取命中判定的可见体 */
  hitPlane!: THREE.Mesh;

  private face!: THREE.Mesh;
  private glow!: THREE.Mesh;
  private baseRing!: THREE.Mesh;
  private ringSpin!: THREE.Mesh;
  private baseY: number;
  private floatSeed: number;

  private awaken = 0;        // 0 = 灵体, 1 = 实体符纸
  private hoverGlow = 0;
  private descend = 0;       // 降临进度

  private static readonly DIM = new THREE.Color(0x8b8398);
  private static readonly FULL = new THREE.Color(0xffffff);

  constructor(hexagram: Hexagram, position: THREE.Vector3, angle: number) {
    this.hexagram = hexagram;
    this.baseY = position.y;
    this.floatSeed = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.userData.hexagramNumber = hexagram.number;
    // 面向阵外，让环绕观察时始终看到正面
    this.group.rotation.y = -angle + Math.PI / 2;

    this.buildFace();
    this.buildGlow();
    this.buildRings();

    this.group.scale.setScalar(0.01);
  }

  /** 符纸本体 */
  private buildFace() {
    const geo = new THREE.PlaneGeometry(2.3, 4.0);

    const mat = new THREE.MeshBasicMaterial({
      map: makeTalismanTexture(this.hexagram),
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      color: HexagramTalisman.DIM.clone(),
      depthWrite: false,
    });

    this.face = new THREE.Mesh(geo, mat);
    this.face.renderOrder = 2;
    this.group.add(this.face);

    // 拾取用：略大一点的不可见平面，射线更好命中
    // 拾取平面必须双面。
    //
    // 符卡是持续自转的（见 update()），转到背面时如果拾取平面是单面材质，
    // three 的 checkIntersection 会把背面当作 backface 剔除掉
    // （`material.side === FrontSide` 会作为 backfaceCulling 参数传给
    //   ray.intersectTriangle），表现就是「正面点得中，转到背面怎么点都没反应」。
    // 而可视面 buildFace 用的是 DoubleSide，所以看得见背面却点不中 —— 就是这个错配。
    //
    // 材质 visible:false 不影响射线拾取（Mesh.raycast 只看 material 是否存在、
    // 不看 material.visible），但 material.side 会参与剔除，所以这个 DoubleSide 不能省。
    // 拾取面只比纸面(2.3×4.0)大一点点。
    // 原来是 2.8×4.5，比纸面宽出 22%，相邻符卡的拾取区互相重叠，
    // 于是点 A 经常选中更近的 B。放大拾取区只是让"好点中"，
    // 代价是"点错"——用户要的是点得准，所以贴着纸面走。
    const hitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    this.hitPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), hitMat);
    this.hitPlane.userData.hexagramNumber = this.hexagram.number;
    this.group.add(this.hitPlane);
  }

  /** 背后的灵光 */
  private buildGlow() {
    const yangCount = this.hexagram.lines.reduce((a: number, l) => a + l, 0);
    const color = yangCount > 3 ? 0xf0c869 : 0xa97fe8;

    const geo = new THREE.PlaneGeometry(3.9, 5.7);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.glow = new THREE.Mesh(geo, mat);
    this.glow.position.z = -0.06;
    this.glow.renderOrder = 1;
    this.group.add(this.glow);
  }

  /** 脚下的法环 */
  private buildRings() {
    const yangCount = this.hexagram.lines.reduce((a: number, l) => a + l, 0);
    const color = yangCount > 3 ? 0xf0c869 : 0xa97fe8;

    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    this.baseRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.12, 40), ringMat.clone());
    this.baseRing.rotation.x = -Math.PI / 2;
    this.baseRing.position.y = -2.05;
    this.group.add(this.baseRing);

    this.ringSpin = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.44, 4), ringMat.clone());
    this.ringSpin.rotation.x = -Math.PI / 2;
    this.ringSpin.position.y = -2.05;
    this.group.add(this.ringSpin);
  }

  update(elapsed: number, index: number, selectedNum: number, hoveredNum: number | null) {
    const isSelected = this.hexagram.number === selectedNum;
    const isHovered = this.hexagram.number === hoveredNum;

    // --- 入场：从无到有，依次绽开 ---
    const spawnTarget = 1;
    const cur = this.group.scale.x;
    if (cur < spawnTarget) {
      const delay = index * 0.012;
      if (elapsed > delay) {
        const t = Math.min((elapsed - delay) / 0.85, 1);
        const ease = 1 - Math.pow(1 - t, 4);
        this.group.scale.setScalar(Math.max(0.01, ease));
      }
    }

    // --- 觉醒度：选中 1 / 悬停 0.55 / 其余 0 ---
    const awakenTarget = isSelected ? 1 : (isHovered ? 0.55 : 0);
    this.awaken += (awakenTarget - this.awaken) * 0.09;

    // --- 降临度 ---
    const descendTarget = isSelected ? 1 : 0;
    this.descend += (descendTarget - this.descend) * 0.07;

    const hoverTarget = isHovered && !isSelected ? 1 : 0;
    this.hoverGlow += (hoverTarget - this.hoverGlow) * 0.14;

    // --- 颜色：灵体压暗，觉醒还原 ---
    if (this.face.material instanceof THREE.MeshBasicMaterial) {
      const lit = Math.min(1, this.awaken * 1.15);
      this.face.material.color.copy(HexagramTalisman.DIM).lerp(HexagramTalisman.FULL, lit);
      this.face.material.opacity = 0.66 + lit * 0.34;
    }

    // --- 灵光 ---
    if (this.glow.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.2 + this.floatSeed);
      const base = isSelected ? 0.34 : 0.1;
      this.glow.material.opacity = base * (0.7 + pulse * 0.3) + this.hoverGlow * 0.16;
      const s = 1 + this.awaken * 0.3 + this.hoverGlow * 0.12;
      this.glow.scale.set(s, s, 1);
    }

    // --- 法环 ---
    const ringOn = Math.max(this.awaken, this.hoverGlow * 0.6);
    if (this.baseRing.material instanceof THREE.MeshBasicMaterial) {
      this.baseRing.material.opacity = ringOn * 0.5;
      this.baseRing.scale.setScalar(1 + this.awaken * 0.22 + Math.sin(elapsed * 3) * 0.02 * this.awaken);
    }
    if (this.ringSpin.material instanceof THREE.MeshBasicMaterial) {
      this.ringSpin.material.opacity = ringOn * 0.34;
      this.ringSpin.rotation.z += 0.012 + this.awaken * 0.03;
    }

    // --- 位移 ---
    if (isSelected) {
      // 降临：从上方落定 + 上浮
      const drop = (1 - this.descend) * 5.5;
      this.group.position.y = this.baseY + Math.sin(elapsed * 1.6) * 0.28 - drop;
      this.group.rotation.y += 0.006;
      const pulse = 1.85 + Math.sin(elapsed * 2.4) * 0.06 * this.descend;
      this.group.scale.setScalar(Math.max(0.01, pulse));
    } else {
      this.group.position.y = this.baseY + Math.sin(elapsed * 0.6 + this.floatSeed) * 0.22;
      this.group.rotation.y += 0.0016;
      const s = 1 + this.hoverGlow * 0.16;
      this.group.scale.setScalar(Math.max(0.01, s));
    }
  }

  dispose() {
    this.group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m instanceof THREE.MeshBasicMaterial && m.map) m.map.dispose();
          m?.dispose();
        });
      }
    });
  }
}
