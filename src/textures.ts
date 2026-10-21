import * as THREE from "three";
import type { Pattern } from "./styles";

const SIZE = 512;

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  return [c, ctx];
}

function finish(c: HTMLCanvasElement, repeat: [number, number]): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.needsUpdate = true;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, amount: number, alpha: number) {
  for (let i = 0; i < amount; i++) {
    const v = Math.random() * 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 1.6, 1.6);
  }
}

export function checker(base: string, second: string, cells = 4): HTMLCanvasElement {
  const [c, ctx] = canvas();
  const step = SIZE / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? base : second;
      ctx.fillRect(x * step, y * step, step, step);
    }
  }
  noise(ctx, 2600, 0.045);
  return c;
}

export function plank(base: string, second: string): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const rows = 6;
  const h = SIZE / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (SIZE / 4);
    ctx.fillStyle = r % 3 === 1 ? second : base;
    ctx.globalAlpha = r % 3 === 1 ? 0.85 : 0.55;
    ctx.fillRect(0, r * h, SIZE, h - 2);
    ctx.globalAlpha = 1;
    // 板缝
    ctx.strokeStyle = "rgba(0,0,0,0.16)";
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const x = offset + (k * SIZE) / 2.2;
      ctx.beginPath();
      ctx.moveTo(x, r * h);
      ctx.lineTo(x, r * h + h);
      ctx.stroke();
    }
    // 木纹
    for (let g = 0; g < 46; g++) {
      const y = r * h + Math.random() * h;
      ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
      ctx.lineWidth = 0.8 + Math.random();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(SIZE * 0.3, y + 4, SIZE * 0.6, y - 4, SIZE, y + 2);
      ctx.stroke();
    }
  }
  noise(ctx, 1600, 0.03);
  return c;
}

export function terrazzo(base: string, chip: string): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const colors = [chip, "#2B2B2B", "#C87A48", "#3E5C8A", "#8E8A82"];
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.globalAlpha = 0.35 + Math.random() * 0.45;
    const r = 1 + Math.random() * 3.6;
    ctx.beginPath();
    ctx.ellipse(Math.random() * SIZE, Math.random() * SIZE, r, r * 0.7, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  noise(ctx, 900, 0.02);
  return c;
}

export function largeTile(base: string, grout: string, tiles = 2): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const step = SIZE / tiles;
  ctx.strokeStyle = grout;
  ctx.lineWidth = 3;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(SIZE, i * step);
    ctx.stroke();
  }
  noise(ctx, 2200, 0.035);
  return c;
}

/** 100mm 小方砖：一格一砖，砖缝 2px（每块砖只有极轻的明度扰动，避免整墙死板） */
export function wallTile(base: string, grout: string, modules = 10): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const step = SIZE / modules;
  const pad = 1.6;
  const baseRgb = hexToRgb(base);
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const j = 0.985 + ((x * 7 + y * 13) % 5) * 0.007;
      ctx.fillStyle = `rgb(${Math.round(baseRgb[0] * j)},${Math.round(baseRgb[1] * j)},${Math.round(baseRgb[2] * j)})`;
      ctx.fillRect(x * step + pad, y * step + pad, step - pad * 2, step - pad * 2);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(x * step + pad, y * step + pad, step - pad * 2, 1.2);
    }
  }
  return c;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((ch) => ch + ch).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function patternedCanvas(pattern: Pattern, base: string, second: string, grout: string): HTMLCanvasElement {
  switch (pattern) {
    case "checker":
      return checker(base, second, 4);
    case "plank":
      return plank(base, second);
    case "terrazzo":
      return terrazzo(base, second);
    case "large-tile":
      return largeTile(base, grout, 2);
    case "small-tile":
      return wallTile(base, grout, 10);
  }
}

/** 招牌：一次绘制，换色时重绘 */
/** 通用灰度细节层：白底 + 极淡纹理，乘在材质颜色上，只加"表面感"不改色 */
function detailLayer(draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  draw(ctx);
  noise(ctx, 900, 0.02);
  return c;
}

/** 柜门/家具木纹：竖向细纹 + 轻微年轮带 */
export function woodPanel(): HTMLCanvasElement {
  return detailLayer((ctx) => {
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * SIZE;
      ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 6, SIZE * 0.35, x - 6, SIZE * 0.7, x + 2, SIZE);
      ctx.stroke();
    }
    for (let b = 0; b < 5; b++) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.02})`;
      ctx.fillRect(0, Math.random() * SIZE, SIZE, 6 + Math.random() * 18);
    }
  });
}

/** 布料：横竖交错织纹 + 绒面噪声 */
export function fabricWeave(): HTMLCanvasElement {
  return detailLayer((ctx) => {
    ctx.strokeStyle = "rgba(0,0,0,0.045)";
    ctx.lineWidth = 1;
    for (let y = 0; y < SIZE; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.035)";
    for (let x = 0; x < SIZE; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SIZE);
      ctx.stroke();
    }
  });
}

/** 台面石材：细颗粒 */
export function stoneTop(): HTMLCanvasElement {
  return detailLayer((ctx) => {
    for (let i = 0; i < 2600; i++) {
      const a = Math.random() * 0.09;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      const s = Math.random() < 0.85 ? 1 : 2;
      ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, s, s);
    }
  });
}

export function plaqueTexture(text: string, bg: string, ink: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 220;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.font = "600 92px ui-serif, 'Songti SC', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2 + 4);
  return c;
}

export { finish as finishTexture };
