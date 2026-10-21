/**
 * 四套大胆风格，作用在「整套房子」上：同一套平面与家具，只换材质、颜色与灯光。
 * 每套必须能独立解释：它凭什么成立、它在哪里不安全。
 */

export type Pattern = "plank" | "checker" | "terrazzo" | "large-tile" | "small-tile";

export interface FloorRecipe {
  pattern: Pattern;
  base: string;
  second: string;
  cell: number;
}

export interface Palette {
  wall: string;
  ceiling: string;
  wood: string;
  wood2: string;
  stone: string;
  cabinet: string;
  cabinetUpper: string;
  counter: string;
  tile: string;
  grout: string;
  frame: string;
  metal: string;
  soft: string;
  bed: string;
  rug: string;
  art: string;
  a: string;
  b: string;
  c: string;
  plaque: string;
  plaqueInk: string;
}

export interface StyleSpec {
  id: string;
  index: number;
  name: string;
  sub: string;
  idea: string;
  note: string;
  risk: string;
  palette: Palette;
  floors: {
    wood: FloorRecipe;
    kitchen: FloorRecipe;
    bar: FloorRecipe;
    bath: FloorRecipe;
    balcony: FloorRecipe;
  };
  light: { tone: string; gain: number; night: string };
  finish: { counter: number; cabinet: number; tile: number; metalness: number };
}

export const STYLES: StyleSpec[] = [
  {
    id: "bauhaus",
    index: 1,
    name: "BAUHAUS",
    sub: "包豪斯 · 原教旨",
    idea: "整屋压成一只白盒子：颜色只以三原色出现，且只出现在构件上，不做装饰。",
    note: "台面与柜门压到最白，红黄蓝各占一面墙，黑线收边，铬钢管与玻璃承担结构感。",
    risk: "白墙 + 白光对施工平整度最挑剔，任何一块砖缝不直都会暴露。",
    palette: {
      wall: "#F3F1EC",
      ceiling: "#FAF9F6",
      wood: "#E8E2D6",
      wood2: "#D9D2C3",
      stone: "#E4E1DA",
      cabinet: "#F4F2ED",
      cabinetUpper: "#F4F2ED",
      counter: "#232326",
      tile: "#F1EEE7",
      grout: "#B9B4A8",
      frame: "#111214",
      metal: "#C9CCD1",
      soft: "#2B2C30",
      bed: "#F4F2ED",
      rug: "#D2321E",
      art: "#1B4C8C",
      a: "#D2321E",
      b: "#1B4C8C",
      c: "#F2B300",
      plaque: "#111214",
      plaqueInk: "#F6F4EF",
    },
    floors: {
      wood: { pattern: "plank", base: "#E2DCCF", second: "#CFC7B6", cell: 1.2 },
      kitchen: { pattern: "terrazzo", base: "#EDEAE2", second: "#8E8A82", cell: 1.2 },
      bar: { pattern: "terrazzo", base: "#E6E2D8", second: "#8E8A82", cell: 1.2 },
      bath: { pattern: "small-tile", base: "#F1EEE7", second: "#B9B4A8", cell: 0.2 },
      balcony: { pattern: "large-tile", base: "#E4E1DA", second: "#C2BEB4", cell: 0.6 },
    },
    light: { tone: "#FFF7EA", gain: 1.0, night: "#FFE2BC" },
    finish: { counter: 0.32, cabinet: 0.52, tile: 0.26, metalness: 0.78 },
  },
  {
    id: "midcentury",
    index: 2,
    name: "MID-CENTURY",
    sub: "中古包豪斯 · 参考复刻",
    idea: "深蓝小方砖压住半墙，胡桃木与棕白棋盘把 60 年代的暖意加回来。",
    note: "厨房最接近参考图 03：100mm 蓝砖、木色柜门、棋盘格地面、黑框折窗与木台边。",
    risk: "木色与蓝砖都吃光，北向房间夜里容易发闷，需要灯带补。",
    palette: {
      wall: "#EFE8DC",
      ceiling: "#F5F0E6",
      wood: "#7A4E31",
      wood2: "#5E3A24",
      stone: "#DED5C6",
      cabinet: "#7A4E31",
      cabinetUpper: "#E8E2D6",
      counter: "#EDE7DC",
      tile: "#23405E",
      grout: "#D9D3C6",
      frame: "#14161A",
      metal: "#9AA0A6",
      soft: "#3B3A36",
      bed: "#F0E9DC",
      rug: "#C87941",
      art: "#23405E",
      a: "#C87941",
      b: "#23405E",
      c: "#D9A62E",
      plaque: "#6A4326",
      plaqueInk: "#F4EDE0",
    },
    floors: {
      wood: { pattern: "plank", base: "#B98A5C", second: "#96683F", cell: 1.2 },
      kitchen: { pattern: "checker", base: "#EDE6D8", second: "#C87941", cell: 0.25 },
      bar: { pattern: "plank", base: "#B98A5C", second: "#96683F", cell: 1.2 },
      bath: { pattern: "checker", base: "#EFE9DC", second: "#9FB0AE", cell: 0.2 },
      balcony: { pattern: "large-tile", base: "#DED5C6", second: "#B9AE9C", cell: 0.6 },
    },
    light: { tone: "#FFE9CC", gain: 0.94, night: "#FFC98F" },
    finish: { counter: 0.5, cabinet: 0.68, tile: 0.34, metalness: 0.3 },
  },
  {
    id: "wabi",
    index: 3,
    name: "WABI-BAUHAUS",
    sub: "侘寂 × 包豪斯线",
    idea: "面全部交给米白与浅橡木，包豪斯只留一条墨线和一点群青。",
    note: "最接近家里现有气质：亚光、低对比、漫射光；彩色只出现在酒瓶、画和一只凳子上。",
    risk: "低对比在阴天几乎没层次，需要靠材质粗糙度差而不是靠颜色区分。",
    palette: {
      wall: "#E8E2D6",
      ceiling: "#EFEBE1",
      wood: "#C9A882",
      wood2: "#AD8A63",
      stone: "#D6CFC0",
      cabinet: "#C9A882",
      cabinetUpper: "#E4DDD0",
      counter: "#DFD8CB",
      tile: "#E6E0D4",
      grout: "#CFC7B8",
      frame: "#1A1C1E",
      metal: "#B9BCBF",
      soft: "#CBBBA6",
      bed: "#F2EDE2",
      rug: "#C9B79B",
      art: "#2A4A6B",
      a: "#2A4A6B",
      b: "#C6A23A",
      c: "#8C6A4A",
      plaque: "#8D6848",
      plaqueInk: "#F4EFE4",
    },
    floors: {
      wood: { pattern: "plank", base: "#C9A882", second: "#B08F69", cell: 1.4 },
      kitchen: { pattern: "large-tile", base: "#DDD6C8", second: "#C4BCAC", cell: 0.6 },
      bar: { pattern: "plank", base: "#C09B72", second: "#A8855E", cell: 1.4 },
      bath: { pattern: "large-tile", base: "#D8D2C4", second: "#BDB5A5", cell: 0.6 },
      balcony: { pattern: "large-tile", base: "#D6CFC0", second: "#BAB2A2", cell: 0.6 },
    },
    light: { tone: "#FFF3E2", gain: 0.88, night: "#FFD9A8" },
    finish: { counter: 0.72, cabinet: 0.76, tile: 0.62, metalness: 0.1 },
  },
  {
    id: "dopamine",
    index: 4,
    name: "DOPAMINE",
    sub: "多巴胺 · 孟菲斯几何",
    idea: "把色块当构件：墙是粉的、下柜是蓝的、吊柜是黄的，靠黑白线把秩序拉回来。",
    note: "最不安全也最过瘾的一版；用来试探上限，不是用来原样落地的。",
    risk: "大面积高饱和会让木材发脏、让灯光显绿；这版是「越界测试」，不是方案。",
    palette: {
      wall: "#F7F1E6",
      ceiling: "#FBFAF5",
      wood: "#E9B949",
      wood2: "#2D6BE0",
      stone: "#FFFFFF",
      cabinet: "#2D6BE0",
      cabinetUpper: "#F5C518",
      counter: "#FFFFFF",
      tile: "#F28DA8",
      grout: "#FFFFFF",
      frame: "#111111",
      metal: "#111111",
      soft: "#D2321E",
      bed: "#F5C518",
      rug: "#F5C518",
      art: "#2E9E6B",
      a: "#F5C518",
      b: "#2D6BE0",
      c: "#2E9E6B",
      plaque: "#FFFFFF",
      plaqueInk: "#111111",
    },
    floors: {
      wood: { pattern: "plank", base: "#F0C86A", second: "#DDAE45", cell: 1.2 },
      kitchen: { pattern: "checker", base: "#FFFFFF", second: "#111111", cell: 0.4 },
      bar: { pattern: "checker", base: "#F7F1E6", second: "#F28DA8", cell: 0.4 },
      bath: { pattern: "checker", base: "#FFFFFF", second: "#2D6BE0", cell: 0.3 },
      balcony: { pattern: "checker", base: "#FFFFFF", second: "#2E9E6B", cell: 0.4 },
    },
    light: { tone: "#FFFFFF", gain: 1.05, night: "#FFE0B0" },
    finish: { counter: 0.2, cabinet: 0.42, tile: 0.16, metalness: 0.42 },
  },
];

export const PHASES = {
  day: { sun: 3.1, ambient: 0.82, interior: 0.55, exposure: 1.02, sky: "#C6D9E6", fog: "#C3D2DA" },
  night: { sun: 0.0, ambient: 0.16, interior: 1.0, exposure: 1.12, sky: "#0A0F17", fog: "#0B1017" },
  cinema: { sun: 0.0, ambient: 0.05, interior: 0.12, exposure: 0.9, sky: "#05070C", fog: "#05070C" },
} as const;

export type PhaseId = keyof typeof PHASES;

export function styleById(id: string | null): StyleSpec {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}

export const ROOM_NAMES: Record<string, string> = {
  all: "全屋",
  living: "可变客厅",
  kitchen: "半开放厨房",
  bar: "阅读·家庭水吧",
  master: "主卧",
  guest: "影音客房",
  bath: "卫浴",
  hall: "入户与走廊",
  balcony: "家务阳台",
};
