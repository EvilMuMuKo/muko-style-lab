import * as THREE from "three";
import plan from "./plan.json";
import { PHASES, type PhaseId, type StyleSpec } from "./styles";
import { finishTexture, patternedCanvas, plaqueTexture, wallTile } from "./textures";

export const H = 2.7;
const T = 0.14;

interface Hole {
  a: number;
  b: number;
  y0: number;
  y1: number;
}

type Mat = THREE.MeshStandardMaterial;

export interface Lab {
  root: THREE.Group;
  ceiling: THREE.Group;
  mats: Record<string, Mat>;
  lights: Record<string, THREE.Light>;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  bulb: THREE.Mesh;
  floors: { mesh: THREE.Mesh; room: string; w: number; d: number }[];
  wallTiles: { mesh: THREE.Mesh; w: number; h: number }[];
  sign: { mat: THREE.MeshBasicMaterial };
  glassPanes: THREE.Mesh[];
  screens: THREE.Mesh[];
  segments: { x1: number; z1: number; x2: number; z2: number }[];
  wallsGroup: THREE.Group;
  furniture: THREE.Group;
  accents: THREE.Group;
}

function mat(color = 0xffffff, roughness = 0.9, metalness = 0): Mat {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(
  parent: THREE.Object3D,
  material: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  shadows = true,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001)), material);
  m.position.set(x, y, z);
  m.castShadow = shadows;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function flat(
  parent: THREE.Object3D,
  material: THREE.Material,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** 带洞墙：horizontal 沿 x 走，否则沿 z 走；fixed 为另一轴坐标 */
function wallRun(
  parent: THREE.Object3D,
  material: THREE.Material,
  horizontal: boolean,
  fixed: number,
  a0: number,
  a1: number,
  holes: Hole[],
): void {
  const solid = (s: number, e: number, y0: number, y1: number) => {
    const len = e - s;
    if (len <= 0.004 || y1 - y0 <= 0.004) return;
    const mid = (s + e) / 2;
    const yc = (y0 + y1) / 2;
    if (horizontal) box(parent, material, len, y1 - y0, T, mid, yc, fixed);
    else box(parent, material, T, y1 - y0, len, fixed, yc, mid);
  };
  const sorted = [...holes].sort((p, q) => p.a - q.a);
  let cursor = a0;
  for (const h of sorted) {
    if (h.a > cursor) solid(cursor, h.a, 0, H);
    if (h.y0 > 0.004) solid(h.a, h.b, 0, h.y0);
    if (h.y1 < H - 0.004) solid(h.a, h.b, h.y1, H);
    cursor = h.b;
  }
  if (cursor < a1) solid(cursor, a1, 0, H);
}

export function buildLab(): Lab {
  const root = new THREE.Group();
  const ceiling = new THREE.Group();
  const wallsGroup = new THREE.Group();
  const furniture = new THREE.Group();
  const accents = new THREE.Group();
  root.add(wallsGroup, furniture, accents);

  const M: Record<string, Mat> = {
    wall: mat(0xefebe2, 0.95),
    ceiling: mat(0xfaf8f3, 0.95),
    wood: mat(0xbfa07c, 0.7),
    wood2: mat(0x9a7a56, 0.72),
    stone: mat(0xdcd5c8, 0.6),
    cabinet: mat(0xd9cbb6, 0.66),
    cabinetUpper: mat(0xe8e4d8, 0.68),
    counter: mat(0xeee7da, 0.45),
    tile: mat(0xffffff, 0.4),
    frame: mat(0x16181c, 0.5, 0.2),
    metal: mat(0xc5c8cc, 0.32, 0.85),
    soft: mat(0x3b3a36, 0.82),
    bed: mat(0xf0e9dc, 0.9),
    rug: mat(0xc87941, 0.96),
    art: mat(0x2a4a6b, 0.8),
    a: mat(0xd2321e, 0.6),
    b: mat(0x1b4c8c, 0.6),
    c: mat(0xf2b300, 0.6),
    dark: mat(0x1b1d20, 0.42, 0.3),
    appliance: mat(0xcfd2d6, 0.4, 0.4),
    ceramic: mat(0xf6f4ef, 0.22),
    screen: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.16, metalness: 0.1, emissive: 0x141a24, emissiveIntensity: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xdfe8ea,
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    }) as unknown as Mat,
    floorWood: mat(0xffffff, 0.72),
    floorK: mat(0xffffff, 0.66),
    floorBar: mat(0xffffff, 0.7),
    floorBath: mat(0xffffff, 0.5),
    floorBalcony: mat(0xffffff, 0.55),
  };

  const segments: Lab["segments"] = [];
  const seg = (x1: number, z1: number, x2: number, z2: number) => segments.push({ x1, z1, x2, z2 });

  // ---------------- 外墙 ----------------
  wallRun(wallsGroup, M.wall, true, 0, 0, 11.65, [{ a: 5.425, b: 6.275, y0: 0.9, y1: 2.35 }]);
  seg(0, 0, 11.65, 0);
  wallRun(wallsGroup, M.wall, false, 0, 0, 8.45, [
    { a: 0.45, b: 2.55, y0: 0.6, y1: 2.35 },
    { a: 4.075, b: 5.325, y0: 0.95, y1: 2.3 },
    { a: 5.8, b: 7.2, y0: 0.9, y1: 2.35 },
  ]);
  seg(0, 0, 0, 8.45);
  wallRun(wallsGroup, M.wall, false, 11.65, 0, 4.4, [{ a: 0.95, b: 3.05, y0: 0.6, y1: 2.35 }]);
  seg(11.65, 0, 11.65, 4.4);
  wallRun(wallsGroup, M.wall, true, 4.4, 11.65, 12.85, []);
  wallRun(wallsGroup, M.wall, false, 12.85, 4.4, 9.35, [{ a: 5.05, b: 8.65, y0: 0.9, y1: 2.35 }]);
  seg(12.85, 4.4, 12.85, 9.35);
  wallRun(wallsGroup, M.wall, true, 9.35, 7.1, 12.85, []);
  seg(7.1, 9.35, 12.85, 9.35);
  wallRun(wallsGroup, M.wall, false, 7.1, 8.45, 9.35, []);
  wallRun(wallsGroup, M.wall, true, 8.45, 0, 7.1, [{ a: 5.225, b: 6.325, y0: 0, y1: 2.08 }]);
  seg(0, 8.45, 7.1, 8.45);

  // ---------------- 内墙 ----------------
  wallRun(wallsGroup, M.wall, true, 3.4, 0, 4.8, [{ a: 3.92, b: 4.78, y0: 0, y1: 2.08 }]);
  wallRun(wallsGroup, M.wall, false, 4.8, 0, 3.4, []);
  seg(4.8, 0, 4.8, 3.4);
  wallRun(wallsGroup, M.wall, true, 2.0, 4.8, 6.9, [{ a: 5.5, b: 6.3, y0: 0, y1: 2.08 }]);
  seg(4.8, 2, 6.9, 2);
  wallRun(wallsGroup, M.wall, false, 6.9, 0, 4.4, [{ a: 3.21, b: 4.09, y0: 0, y1: 2.08 }]);
  seg(6.9, 0, 6.9, 4.4);
  wallRun(wallsGroup, M.wall, true, 4.4, 6.9, 11.65, []);
  seg(6.9, 4.4, 11.65, 4.4);
  wallRun(wallsGroup, M.wall, true, 5.85, 0, 3.92, [{ a: 0.09, b: 3.83, y0: 0.95, y1: 2.35 }]);
  seg(0, 5.85, 3.92, 5.85);
  wallRun(wallsGroup, M.wall, false, 7.0, 4.4, 5.4, []);
  seg(7.0, 4.4, 7.0, 5.4);

  // 结构柱
  box(wallsGroup, M.wall, 0.5, H, 0.5, 5.15, H / 2, 4.56);
  box(wallsGroup, M.frame, 0.52, 0.02, 0.52, 5.15, 0.01, 4.56, false);

  // ---------------- 地面 ----------------
  const floorOf: Record<string, keyof Lab["mats"]> = {
    guest: "floorWood",
    master: "floorWood",
    living: "floorWood",
    hall: "floorWood",
    kitchen: "floorK",
    bar: "floorBar",
    bath: "floorBath",
    balcony: "floorBalcony",
  };
  const floors: Lab["floors"] = [];
  for (const r of plan.rooms) {
    const xs = r.polygon.map((p) => p[0]);
    const zs = r.polygon.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const z0 = Math.min(...zs);
    const z1 = Math.max(...zs);
    const m = flat(
      root,
      M[floorOf[r.id] ?? "floorWood"],
      x1 - x0,
      z1 - z0,
      (x0 + x1) / 2,
      0.002 + (r.id === "hall" ? 0.001 : 0),
      (z0 + z1) / 2,
      -Math.PI / 2,
      0,
    );
    m.receiveShadow = true;
    floors.push({ mesh: m, room: r.id, w: x1 - x0, d: z1 - z0 });
  }

  // ---------------- 天花 ----------------
  flat(ceiling, M.ceiling, 11.65, 4.4, 5.825, H - 0.001, 2.2, Math.PI / 2, 0);
  flat(ceiling, M.ceiling, 12.85, 4.95, 6.425, H - 0.001, 6.875, Math.PI / 2, 0);
  root.add(ceiling);

  // ---------------- 窗 ----------------
  const glassPanes: THREE.Mesh[] = [];
  const win = (
    horizontal: boolean,
    fixed: number,
    a: number,
    b: number,
    y0: number,
    y1: number,
    sill = true,
  ) => {
    const len = b - a;
    const mid = (a + b) / 2;
    const yc = (y0 + y1) / 2;
    const fw = 0.05;
    if (horizontal) {
      box(wallsGroup, M.frame, len, fw, T + 0.02, mid, y0, fixed, false);
      box(wallsGroup, M.frame, len, fw, T + 0.02, mid, y1, fixed, false);
      box(wallsGroup, M.frame, fw, y1 - y0, T + 0.02, a, yc, fixed, false);
      box(wallsGroup, M.frame, fw, y1 - y0, T + 0.02, b, yc, fixed, false);
      box(wallsGroup, M.frame, 0.04, y1 - y0, T, mid, yc, fixed, false);
      const g = flat(wallsGroup, M.glass, len - 0.04, y1 - y0 - 0.04, mid, yc, fixed, 0, 0);
      glassPanes.push(g);
      if (sill) box(wallsGroup, M.counter, len + 0.06, 0.03, T + 0.13, mid, y0 - 0.015, fixed, false);
    } else {
      box(wallsGroup, M.frame, T + 0.02, fw, len, fixed, y0, mid, false);
      box(wallsGroup, M.frame, T + 0.02, fw, len, fixed, y1, mid, false);
      box(wallsGroup, M.frame, T + 0.02, y1 - y0, fw, fixed, yc, a, false);
      box(wallsGroup, M.frame, T + 0.02, y1 - y0, fw, fixed, yc, b, false);
      box(wallsGroup, M.frame, T, y1 - y0, 0.04, fixed, yc, mid, false);
      const g = flat(wallsGroup, M.glass, len - 0.04, y1 - y0 - 0.04, fixed, yc, mid, 0, Math.PI / 2);
      glassPanes.push(g);
      if (sill) box(wallsGroup, M.counter, T + 0.13, 0.03, len + 0.06, fixed, y0 - 0.015, mid, false);
    }
  };

  win(true, 0, 5.425, 6.275, 0.9, 2.35);
  win(false, 0, 0.45, 2.55, 0.6, 2.35);
  win(false, 0, 4.075, 5.325, 0.95, 2.3);
  win(false, 0, 5.8, 7.2, 0.9, 2.35);
  win(false, 11.65, 0.95, 3.05, 0.6, 2.35);
  win(false, 12.85, 5.05, 8.65, 0.9, 2.35);

  // ---------------- 门（框 + 开启的门扇） ----------------
  const door = (horizontal: boolean, fixed: number, a: number, b: number, swing = 1) => {
    const w = b - a;
    const hh = 2.08;
    const mid = (a + b) / 2;
    if (horizontal) {
      box(wallsGroup, M.frame, w + 0.06, 0.05, T + 0.02, mid, hh + 0.02, fixed, false);
      box(wallsGroup, M.frame, 0.05, hh, T + 0.02, a, hh / 2, fixed, false);
      box(wallsGroup, M.frame, 0.05, hh, T + 0.02, b, hh / 2, fixed, false);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, hh - 0.03, 0.04), M.cabinetUpper);
      leaf.geometry.translate((w - 0.04) / 2, 0, 0);
      leaf.position.set(a, (hh - 0.03) / 2, fixed);
      leaf.rotation.y = swing * 1.15;
      leaf.castShadow = true;
      wallsGroup.add(leaf);
    } else {
      box(wallsGroup, M.frame, T + 0.02, 0.05, w + 0.06, fixed, hh + 0.02, mid, false);
      box(wallsGroup, M.frame, T + 0.02, hh, 0.05, fixed, hh / 2, a, false);
      box(wallsGroup, M.frame, T + 0.02, hh, 0.05, fixed, hh / 2, b, false);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.04, hh - 0.03, w - 0.04), M.cabinetUpper);
      leaf.geometry.translate(0, 0, (w - 0.04) / 2);
      leaf.position.set(fixed, (hh - 0.03) / 2, a);
      leaf.rotation.y = swing * 1.15;
      leaf.castShadow = true;
      wallsGroup.add(leaf);
    }
  };
  door(true, 3.4, 3.92, 4.78, -1);
  door(true, 2.0, 5.5, 6.3, 1);
  door(false, 6.9, 3.21, 4.09, 1);
  door(true, 8.45, 5.225, 6.325, -1);

  // ---------------- 厨房玻璃滑门（x=3.92, z3.4–5.85） ----------------
  const gx = 3.92;
  box(wallsGroup, M.frame, 0.10, 0.05, 2.45, gx, H - 0.025, 4.625, false);
  box(wallsGroup, M.frame, 0.10, 0.04, 2.45, gx, 0.02, 4.625, false);
  for (const z of [3.4, 4.22, 5.03, 5.85]) {
    box(wallsGroup, M.frame, 0.08, H, 0.05, gx, H / 2, z, false);
  }
  // 中间一扇沿 z 向滑开，停在相邻扇背后（不是往 x 方向凸出）
  const panes = [
    { z: 3.81, open: false, dz: 0 },
    { z: 4.625, open: true, dz: -0.80 },
    { z: 5.44, open: false, dz: 0 },
  ];
  for (const p of panes) {
    const dx = p.open ? 0.07 : 0;
    const dz = p.dz;
    // 每扇：四边细框 + 中间玻璃（不是实心板）
    const pw = 0.78;
    const cz = p.z + dz;
    box(wallsGroup, M.frame, 0.035, H - 0.1, 0.03, gx + dx, H / 2, cz - pw / 2, false);
    box(wallsGroup, M.frame, 0.035, H - 0.1, 0.03, gx + dx, H / 2, cz + pw / 2, false);
    box(wallsGroup, M.frame, 0.035, 0.05, pw, gx + dx, H - 0.075, cz, false);
    box(wallsGroup, M.frame, 0.035, 0.05, pw, gx + dx, 0.075, cz, false);
    const g = flat(wallsGroup, M.glass, pw - 0.06, H - 0.16, gx + dx, H / 2, cz, 0, Math.PI / 2);
    glassPanes.push(g);
  }

  // ---------------- 出品窗（厨房 ↔ 水吧） ----------------
  const px0 = 0.09;
  const px1 = 3.83;
  const sill = 0.95;
  const head = 2.35;
  const leaf = 0.7;
  const pz = 5.85;
  box(wallsGroup, M.frame, px1 - px0 + 0.06, 0.05, 0.12, (px0 + px1) / 2, sill - 0.02, pz, false);
  box(wallsGroup, M.frame, px1 - px0 + 0.06, 0.05, 0.12, (px0 + px1) / 2, head + 0.02, pz, false);
  box(wallsGroup, M.frame, 0.05, head - sill, 0.12, px0 - 0.02, (sill + head) / 2, pz, false);
  box(wallsGroup, M.frame, 0.05, head - sill, 0.12, px1 + 0.02, (sill + head) / 2, pz, false);
  box(wallsGroup, M.frame, 0.04, head - sill, 0.10, px0 + leaf * 2, (sill + head) / 2, pz, false);
  const fixedW = px1 - (px0 + leaf * 2);
  glassPanes.push(flat(wallsGroup, M.glass, fixedW - 0.06, head - sill - 0.06, px0 + leaf * 2 + fixedW / 2, (sill + head) / 2, pz, 0, 0));
  box(wallsGroup, M.frame, leaf, head - sill, 0.05, px0 + leaf / 2, (sill + head) / 2, pz, false);
  glassPanes.push(flat(wallsGroup, M.glass, leaf - 0.08, head - sill - 0.08, px0 + leaf / 2, (sill + head) / 2, pz + 0.004, 0, 0));
  const folded = new THREE.Group();
  folded.position.set(px0 + leaf * 2, (sill + head) / 2, pz - 0.02);
  folded.rotation.y = -1.36;
  wallsGroup.add(folded);
  box(folded, M.frame, leaf, 0.06, 0.05, -leaf / 2, (head - sill) / 2 - 0.02, 0, false);
  box(folded, M.frame, leaf, 0.06, 0.05, -leaf / 2, -(head - sill) / 2 + 0.02, 0, false);
  box(folded, M.frame, 0.05, head - sill, 0.05, -leaf + 0.02, 0, 0, false);
  glassPanes.push(flat(folded, M.glass, leaf - 0.08, head - sill - 0.1, -leaf / 2, 0, 0, 0, 0));
  // 木台边（水吧侧）
  box(wallsGroup, M.wood, px1 - px0, 0.03, 0.26, (px0 + px1) / 2, 0.935, pz + 0.13);

  // ---------------- 墙面砖（厨房 + 卫浴） ----------------
  const wallTiles: Lab["wallTiles"] = [];
  const addTile = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
    const m = flat(root, M.tile, w, h, x, y, z, 0, ry);
    wallTiles.push({ mesh: m, w, h });
  };
  addTile(3.9, 2.1, 1.96, 1.05, 3.4 + 0.075, 0);
  addTile(2.45, 2.1, 0.075, 1.05, 4.625, Math.PI / 2);
  addTile(3.74, 0.95, 1.96, 0.475, 5.85 + 0.075, 0);
  addTile(2.1, 2.1, 5.85, 1.05, 2.0 - 0.075, Math.PI);
  addTile(2.1, 2.1, 4.8 + 0.075, 1.05, 1.0, -Math.PI / 2);

  // ---------------- 家具 ----------------
  const softTop = (o: any, material: THREE.Material) => {
    const { x, z, y, w, d, h } = o;
    const baseH = Math.max(h * 0.42, 0.26);
    box(furniture, material, w, baseH, d, x, y + baseH / 2, z);
    box(furniture, material, w, Math.max(h * 0.5, 0.32), Math.max(d * 0.2, 0.14), x, y + baseH + Math.max(h * 0.25, 0.16), z + d * 0.4);
    for (const sx of [-1, 1]) {
      box(furniture, material, Math.max(w * 0.09, 0.1), Math.max(h * 0.5, 0.3), d * 0.92, x + (sx * (w - 0.1)) / 2, y + baseH + Math.max(h * 0.25, 0.15), z);
    }
  };

  for (const o of plan.objects) {
    const { x, z, y, w, d, h, type } = o as any;
    if (type === "door_leaf") continue;
    switch (type) {
      case "column":
        break;
      case "wall_storage":
        box(furniture, h > 2 ? M.cabinet : y > 1.2 ? M.cabinetUpper : M.cabinet, w, h, d, x, y + h / 2, z);
        if (h > 2) box(furniture, M.cabinetUpper, w * 0.9, 0.03, d * 0.96, x, y + h - 0.02, z, false);
        break;
      case "cabinet_frame":
        if (String(o.id).startsWith("master-bed")) {
          box(furniture, M.wood, w, h, d, x, y + h / 2, z);
          box(furniture, M.wood, w, 1.05, 0.07, x, y + 0.52, z - d / 2 + 0.03);
          break;
        }
        if (h <= 0.1) box(furniture, M.counter, w, Math.max(h, 0.03), d, x, y + Math.max(h, 0.03) / 2, z);
        else box(furniture, M.wood, w, h, d, x, y + h / 2, z);
        break;
      case "mattress":
        box(furniture, M.bed, w, h, d, x, y + h / 2, z);
        box(furniture, M.bed, w, 0.16, 0.42, x, y + 0.28, z - d / 2 + 0.24);
        break;
      case "modular_sofa":
      case "sofa_bed":
      case "study_sofa_bed":
        softTop(o, M.soft);
        break;
      case "lounge_chair":
        box(furniture, M.wood, w * 0.9, 0.12, d * 0.9, x, y + 0.4, z);
        box(furniture, M.wood, w * 0.9, 0.5, 0.1, x, y + 0.66, z + d * 0.38);
        box(furniture, M.metal, w * 0.8, 0.36, 0.06, x, y + 0.2, z - d * 0.32, false);
        break;
      case "office_chair":
        box(furniture, M.soft, w * 0.9, 0.1, d * 0.9, x, y + 0.46, z);
        box(furniture, M.soft, w * 0.85, 0.5, 0.08, x, y + 0.76, z + d * 0.36);
        box(furniture, M.metal, 0.06, 0.42, 0.06, x, y + 0.22, z, false);
        break;
      case "counter_stool":
      case "folding_chair":
        box(furniture, M.wood, w * 0.8, 0.05, d * 0.8, x, y + 0.6, z);
        box(furniture, M.wood, w * 0.72, 0.4, 0.06, x, y + 0.86, z + d * 0.34);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          box(furniture, M.metal, 0.03, 0.58, 0.03, x + (sx * w) / 3, y + 0.29, z + (sz * d) / 3, false);
        }
        break;
      case "desk":
      case "study_desk":
      case "folding_table":
      case "side_table":
      case "record_console":
      case "bar_sign":
        if (type === "bar_sign") {
          box(furniture, M.wood, w, h, 0.04, x, y + h / 2, z, false);
          break;
        }
        box(furniture, M.wood, w, Math.max(h * 0.08, 0.04), d, x, y + h, z);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          box(furniture, M.wood2, 0.05, h, 0.05, x + (sx * (w - 0.1)) / 2, y + h / 2, z + (sz * (d - 0.1)) / 2, false);
        }
        break;
      case "mobile_tv":
        box(furniture, M.screen, w, h, 0.04, x, y + h / 2 + 0.35, z);
        box(furniture, M.dark, 0.5, 0.1, 0.34, x, y + 0.06, z, false);
        box(furniture, M.dark, 0.06, 0.4, 0.06, x, y + 0.26, z, false);
        break;
      case "monitor":
        box(furniture, M.screen, w, h, 0.03, x, y + h / 2, z);
        box(furniture, M.dark, 0.16, 0.1, 0.12, x, y - 0.06, z, false);
        break;
      case "laptop":
        box(furniture, M.appliance, w, 0.02, d, x, y + 0.02, z, false);
        box(furniture, M.screen, w, 0.2, 0.02, x, y + 0.11, z - d / 2, false);
        break;
      case "pc":
        box(furniture, M.dark, w, h, d, x, y + h / 2, z);
        break;
      case "fridge": {
        // 嵌入高柜的双开门冰箱：整体前移 60mm，避免与柜体前脸共面 z-fighting
        const fz = z + (h > 1.2 ? 0.06 : 0);
        box(furniture, M.appliance, w, h, d, x, y + h / 2, fz);
        box(furniture, M.metal, 0.03, 0.55, 0.03, x - w * 0.06, y + h * 0.62, fz + d / 2 + 0.005, false);
        box(furniture, M.metal, 0.03, 0.55, 0.03, x + w * 0.06, y + h * 0.62, fz + d / 2 + 0.005, false);
        break;
      }
      case "dishwasher":
        box(furniture, M.appliance, w, h, d, x, y + h / 2, z);
        break;
      case "hob":
        box(furniture, M.dark, w, 0.02, d, x, y + 0.01, z, false);
        break;
      case "hood":
        box(furniture, M.metal, w, h, d, x, y + h / 2, z, false);
        break;
      case "sink":
        box(furniture, M.metal, w, 0.03, d, x, y + 0.01, z, false);
        break;
      case "coffee":
      case "grinder":
      case "kegerator":
      case "beer_font":
        box(furniture, M.appliance, w, h, d, x, y + h / 2, z);
        break;
      case "keg":
      case "co2":
        box(furniture, M.metal, w, h, d, x, y + h / 2, z);
        break;
      case "counter_appliance":
        box(furniture, M.dark, w, h, d, x, y + h / 2, z);
        break;
      case "rug":
        flat(furniture, M.rug, w, d, x, y + 0.008, z, -Math.PI / 2, 0);
        break;
      case "washer":
      case "dryer":
        box(furniture, M.appliance, w, h, d, x, y + h / 2, z);
        box(furniture, M.dark, w * 0.6, w * 0.6, 0.02, x, y + h / 2, z + d / 2 + 0.01, false);
        break;
      case "shower":
        box(furniture, M.ceramic, w, 0.06, d, x, y + 0.03, z, false);
        flat(furniture, M.glass, w, h - 0.1, x, y + h / 2, z + d / 2, 0, 0);
        box(furniture, M.metal, 0.05, h, 0.05, x + w / 2, y + h / 2, z + d / 2, false);
        break;
      case "toilet":
        box(furniture, M.ceramic, w, h * 0.55, d * 0.7, x, y + h * 0.28, z);
        box(furniture, M.ceramic, w, h * 0.4, d * 0.24, x, y + h * 0.7, z - d * 0.36);
        break;
      case "vanity":
        box(furniture, M.wood, w, h, d, x, y + h / 2, z);
        box(furniture, M.ceramic, w * 0.9, 0.04, d * 0.9, x, y + h + 0.02, z, false);
        break;
      case "study_basin":
        box(furniture, M.ceramic, w, h, d, x, y + h / 2, z);
        break;
      case "plant":
        box(furniture, M.ceramic, w * 0.7, h * 0.35, w * 0.7, x, y + h * 0.18, z);
        {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(w * 0.55, 10, 8), M.soft);
          leaf.position.set(x, y + h * 0.75, z);
          furniture.add(leaf);
        }
        break;
      case "floor_lamp":
        box(furniture, M.metal, 0.05, h, 0.05, x, y + h / 2, z, false);
        {
          const shade = new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, h * 0.16, 16, 1, true), M.cabinetUpper);
          shade.position.set(x, y + h - 0.06, z);
          furniture.add(shade);
        }
        break;
      case "pegboard":
        box(furniture, M.wood2, w, h, d, x, y + h / 2, z, false);
        break;
      case "drying_rack":
        box(furniture, M.metal, w, 0.04, d, x, y, z, false);
        break;
      case "basket":
      case "bin":
      case "vacuum":
      case "robot":
      case "key_tray":
      case "tray":
      case "folding_shelf":
      case "ceiling_equipment":
      case "speaker":
      case "subwoofer":
      case "ps5":
        box(furniture, type === "ps5" ? M.appliance : M.wood2, w, h, d, x, y + h / 2, z);
        break;
      default:
        box(furniture, M.wood2, w, h, d, x, y + h / 2, z);
    }
  }

  // 水吧招牌
  const signMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  flat(accents, signMat, 0.9, 0.2, 2.45, 2.52, 5.85 + 0.09, 0, 0);

  // 墙体只接收阴影、不投射：避免贴墙掠射角的自阴影噪点
  wallsGroup.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = false;
  });

  // ---------------- 灯光 ----------------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8b8578, 0.5);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4);
  sun.position.set(-6, 7.5, 12);
  sun.target.position.set(6, 0, 4.6);
  sun.castShadow = false;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -7.5;
  sun.shadow.camera.right = 7.5;
  sun.shadow.camera.top = 7.5;
  sun.shadow.camera.bottom = -7.5;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.14;

  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(9, 4.5, -4);
  fill.target.position.set(5, 1, 5);
  fill.castShadow = false;

  const lights: Record<string, THREE.Light> = { fill };
  const point = (name: string, x: number, y: number, z: number, intensity: number, dist: number) => {
    const l = new THREE.PointLight(0xffe3bd, intensity, dist, 2);
    l.position.set(x, y, z);
    lights[name] = l;
    return l;
  };
  point("kitchen", 1.5, 2.45, 4.5, 5, 7);
  point("bar", 1.9, 2.0, 7.4, 5, 7);
  point("living", 9.2, 2.45, 7.0, 6, 9);
  point("master", 9.4, 2.35, 2.2, 4, 7);
  point("guest", 2.2, 2.35, 1.6, 4, 7);
  point("bath", 5.8, 2.4, 1.0, 3, 5);
  point("hall", 5.6, 2.45, 6.2, 4, 7);
  point("balcony", 12.2, 2.2, 7.0, 2.5, 5);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff1d0 }));
  bulb.position.set(1.44, 1.5, 6.3);
  root.add(bulb);

  const screens: THREE.Mesh[] = [];
  furniture.traverse((o2) => {
    if ((o2 as THREE.Mesh).material === M.screen) screens.push(o2 as THREE.Mesh);
  });

  return {
    root,
    ceiling,
    mats: M,
    lights,
    sun,
    hemi,
    bulb,
    floors,
    wallTiles,
    sign: { mat: signMat },
    glassPanes,
    screens,
    segments,
    wallsGroup,
    furniture,
    accents,
  };
}

/** 材质 + 贴图 + 灯光一次落地 */
export function applyStyle(lab: Lab, spec: StyleSpec, phase: PhaseId) {
  const p = spec.palette;
  const M = lab.mats;
  M.wall.color.set(p.wall);
  M.ceiling.color.set(p.ceiling);
  M.wood.color.set(p.wood);
  M.wood2.color.set(p.wood2);
  M.stone.color.set(p.stone);
  M.cabinet.color.set(p.cabinet);
  M.cabinetUpper.color.set(p.cabinetUpper);
  M.counter.color.set(p.counter);
  M.tile.color.set(p.tile);
  M.frame.color.set(p.frame);
  M.metal.color.set(p.metal);
  M.metal.metalness = spec.finish.metalness;
  M.soft.color.set(p.soft);
  M.bed.color.set(p.bed);
  M.rug.color.set(p.rug);
  M.art.color.set(p.art);
  M.a.color.set(p.a);
  M.b.color.set(p.b);
  M.c.color.set(p.c);
  M.counter.roughness = spec.finish.counter;
  M.cabinet.roughness = spec.finish.cabinet;
  M.cabinetUpper.roughness = spec.finish.cabinet;
  M.tile.roughness = spec.finish.tile;

  // 地面
  const recipeOf: Record<string, keyof StyleSpec["floors"]> = {
    guest: "wood",
    master: "wood",
    living: "wood",
    hall: "wood",
    kitchen: "kitchen",
    bar: "bar",
    bath: "bath",
    balcony: "balcony",
  };
  for (const f of lab.floors) {
    const r = spec.floors[recipeOf[f.room] ?? "wood"];
    const material = f.mesh.material as THREE.MeshStandardMaterial;
    const canvas = patternedCanvas(r.pattern, r.base, r.second, r.second);
    const metres = r.pattern === "plank" ? 2.4 : r.pattern === "checker" ? r.cell * 4 : r.pattern === "small-tile" ? r.cell * 10 : r.cell * 2;
    const tex = finishTexture(canvas, [f.w / metres, f.d / metres]);
    material.map?.dispose();
    material.map = tex;
    material.color.set("#ffffff");
    material.needsUpdate = true;
  }
  // 墙面砖
  for (const t of lab.wallTiles) {
    const material = t.mesh.material as THREE.MeshStandardMaterial;
    const tex = finishTexture(wallTile(p.tile, p.grout, 10), [t.w, t.h]);
    material.map?.dispose();
    material.map = tex;
    material.needsUpdate = true;
  }
  // 招牌
  lab.sign.mat.map?.dispose();
  const tex = new THREE.CanvasTexture(plaqueTexture("MuKo's Bar", p.plaque, p.plaqueInk));
  tex.colorSpace = THREE.SRGBColorSpace;
  lab.sign.mat.map = tex;
  lab.sign.mat.needsUpdate = true;

  // 灯光
  const ph = PHASES[phase];
  applyPhase(lab, spec, phase);
  return ph;
}

/** 只切日夜：不动贴图，避免每次换档重生成 13 张 canvas 纹理 */
export function applyPhase(lab: Lab, spec: StyleSpec, phase: PhaseId) {
  const ph = PHASES[phase];
  lab.hemi.intensity = ph.ambient;
  const fillLight = lab.lights.fill as THREE.DirectionalLight;
  fillLight.intensity = ph.ambient * 0.62;
  fillLight.color.set(phase === "day" ? "#F2F6FF" : spec.light.night);
  lab.sun.intensity = ph.sun * spec.light.gain;
  lab.sun.color.set(phase === "day" ? spec.light.tone : spec.light.night);
  const gain = ph.interior * spec.light.gain;
  for (const [name, l] of Object.entries(lab.lights)) {
    if (!(l as THREE.PointLight).isPointLight) continue;
    (l as THREE.PointLight).intensity = (name === "bath" ? 3.2 : 7.5) * gain;
    (l as THREE.PointLight).color.set(spec.light.night);
  }
  for (const s of lab.screens) {
    const m = s.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = phase === "day" ? 0.2 : phase === "night" ? 0.9 : 1.6;
  }
  return ph;
}
