import * as THREE from "three";
import { applyStyle, buildLab, type Lab } from "./build";
import { PHASES, ROOM_NAMES, STYLES, styleById, type PhaseId, type StyleSpec } from "./styles";

const VERSION = "1.0.0";

interface ViewDef {
  room: string;
  id: string;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const VIEWS: ViewDef[] = [
  { room: "all", id: "all-overview", label: "全屋透视", pos: [15.6, 10.2, 14.8], target: [6.0, 0.5, 4.7], fov: 42 },
  { room: "all", id: "all-top", label: "全屋俯视", pos: [6.42, 19.5, 4.70], target: [6.42, 0, 4.68], fov: 38 },
  { room: "living", id: "living-entry", label: "从走廊看客厅", pos: [7.25, 1.55, 5.45], target: [11.2, 0.95, 8.5], fov: 48 },
  { room: "living", id: "living-sofa", label: "从阳台看沙发", pos: [11.35, 1.5, 8.95], target: [7.8, 1.0, 6.3], fov: 48 },
  { room: "kitchen", id: "kitchen-through", label: "透过玻璃门", pos: [4.62, 1.55, 4.92], target: [0.7, 1.05, 4.4], fov: 56 },
  { room: "kitchen", id: "kitchen-inside", label: "厨房内", pos: [4.3, 1.6, 5.5], target: [0.8, 1.0, 3.9], fov: 55 },
  { room: "bar", id: "bar-from-kitchen", label: "从出品窗看水吧", pos: [2.5, 1.55, 8.25], target: [2.2, 1.05, 5.9], fov: 58 },
  { room: "bar", id: "bar-from-living", label: "从走廊看水吧", pos: [4.4, 1.55, 6.6], target: [0.6, 1.05, 8.0], fov: 58 },
  { room: "master", id: "master-door", label: "从门口", pos: [7.2, 1.55, 4.15], target: [10.6, 0.95, 1.3], fov: 48 },
  { room: "master", id: "master-bed", label: "从床边看工位", pos: [11.2, 1.5, 1.35], target: [7.7, 1.0, 3.85], fov: 48 },
  { room: "guest", id: "guest-door", label: "从门口", pos: [4.55, 1.55, 3.15], target: [1.3, 0.95, 1.05], fov: 48 },
  { room: "guest", id: "guest-screen", label: "从工位看沙发床", pos: [0.62, 1.55, 2.95], target: [2.8, 0.85, 0.9], fov: 50 },
  { room: "bath", id: "bath-door", label: "从门口", pos: [5.85, 1.55, 1.9], target: [6.35, 1.0, 0.55], fov: 62 },
  { room: "hall", id: "hall-entry", label: "入户视角", pos: [5.55, 1.58, 8.1], target: [4.5, 1.0, 4.9], fov: 50 },
  { room: "balcony", id: "balcony-entry", label: "阳台", pos: [12.32, 1.55, 8.15], target: [12.3, 1.0, 4.9], fov: 50 },
];

const canvas = document.getElementById("view") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
// 概念模型：关闭实时阴影贴图。掠过表面的墙体/柜体会产生大面积自阴影噪点，
// 对"看材质与配色"这个目的弊大于利；改由环境光和三点光塑造体积。
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d6dc, 22, 46);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.05, 90);

const lab: Lab = buildLab();
scene.add(lab.root);
scene.add(lab.hemi);
scene.add(lab.sun);
scene.add(lab.sun.target);
for (const l of Object.values(lab.lights)) {
  scene.add(l);
  if (l instanceof THREE.DirectionalLight) scene.add(l.target);
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 90),
  new THREE.MeshStandardMaterial({ color: 0x94a382, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.03;
ground.receiveShadow = true;
scene.add(ground);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(48, 20, 14),
  new THREE.MeshBasicMaterial({ color: 0xcfe0ea, side: THREE.BackSide }),
);
scene.add(sky);

// ---------- 相机：阻尼轨道 + 第一人称漫游 ----------
const orbit = {
  yaw: 0.9,
  pitch: 0.35,
  radius: 8,
  gyaw: 0.9,
  gpitch: 0.35,
  gradius: 8,
  target: new THREE.Vector3(6, 0.6, 4.7),
  gtarget: new THREE.Vector3(6, 0.6, 4.7),
  fov: 40,
  gfov: 40,
};

function goalFromView(v: ViewDef) {
  const p = new THREE.Vector3(...v.pos);
  const t = new THREE.Vector3(...v.target);
  const d = p.clone().sub(t);
  const r = d.length();
  orbit.gyaw = Math.atan2(d.x, d.z);
  orbit.gpitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(d.y / r, -1, 1)), -1.45, 1.45);
  orbit.gradius = r;
  orbit.gtarget.copy(t);
  orbit.gfov = v.fov;
}

function applyOrbitCam() {
  const cp = Math.cos(orbit.pitch);
  camera.position.set(
    orbit.target.x + Math.sin(orbit.yaw) * cp * orbit.radius,
    orbit.target.y + Math.sin(orbit.pitch) * orbit.radius,
    orbit.target.z + Math.cos(orbit.yaw) * cp * orbit.radius,
  );
  camera.lookAt(orbit.target);
  if (Math.abs(camera.fov - orbit.fov) > 0.01) {
    camera.fov = orbit.fov;
    camera.updateProjectionMatrix();
  }
}

let walking = false;
const walk = { x: 5.6, z: 8.0, yaw: 1.2, pitch: -0.05, keys: new Set<string>() };

function enterWalk() {
  walking = true;
  walk.x = camera.position.x;
  walk.z = camera.position.z;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  walk.yaw = Math.atan2(dir.x, dir.z) + Math.PI;
  walk.pitch = 0;
  document.body.classList.add("walking");
  hud.textContent = "漫游中：WASD 移动 · 拖动转视角 · Esc 退出";
}

function exitWalk() {
  walking = false;
  document.body.classList.remove("walking");
  hud.textContent = "";
  applyOrbitCam();
}

function collide(nx: number, nz: number): [number, number] {
  const r = 0.26;
  let x = nx;
  let z = nz;
  for (const s of lab.segments) {
    const dx = s.x2 - s.x1;
    const dz = s.z2 - s.z1;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - s.x1) * dx + (z - s.z1) * dz) / len2;
    t = THREE.MathUtils.clamp(t, 0, 1);
    const cx = s.x1 + dx * t;
    const cz = s.z1 + dz * t;
    const ox = x - cx;
    const oz = z - cz;
    const dist = Math.hypot(ox, oz);
    if (dist < r && dist > 1e-5) {
      x = cx + (ox / dist) * r;
      z = cz + (oz / dist) * r;
    }
  }
  return [x, z];
}

// ---------- 交互 ----------
let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener("pointerdown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  if (walking) {
    walk.yaw -= dx * 0.005;
    walk.pitch = THREE.MathUtils.clamp(walk.pitch - dy * 0.004, -0.9, 0.7);
  } else {
    orbit.gyaw -= dx * 0.0038;
    orbit.gpitch = THREE.MathUtils.clamp(orbit.gpitch + dy * 0.003, -0.1, 1.25);
  }
});
canvas.addEventListener("pointerup", (e) => {
  dragging = false;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (walking) return;
    orbit.gradius = THREE.MathUtils.clamp(orbit.gradius * (1 + e.deltaY * 0.0011), 1.2, 22);
  },
  { passive: false },
);

// ---------- UI ----------
const els = {
  idx: document.getElementById("idx")!,
  name: document.getElementById("name")!,
  sub: document.getElementById("sub")!,
  idea: document.getElementById("idea")!,
  note: document.getElementById("note")!,
  risk: document.getElementById("risk")!,
  chips: document.getElementById("chips")!,
  styles: document.getElementById("styles")!,
  phases: document.getElementById("phases")!,
  roomSel: document.getElementById("roomSel") as HTMLSelectElement,
  viewSel: document.getElementById("viewSel") as HTMLSelectElement,
  reset: document.getElementById("reset")!,
  shot: document.getElementById("shot")!,
  walkBtn: document.getElementById("walkBtn")!,
  toggle: document.getElementById("togglePanel")!,
  panel: document.getElementById("controls")!,
  flash: document.getElementById("flash")!,
  ver: document.getElementById("ver")!,
  hud: document.getElementById("hud")!,
};
const hud = els.hud;

els.ver.textContent = `R1 / ${VERSION}`;

let current: StyleSpec = STYLES[0];
let phase: PhaseId = "day";
let currentView: ViewDef = VIEWS[0];
let ready = false;

// 空间
for (const key of ["all", "living", "kitchen", "bar", "master", "guest", "bath", "hall", "balcony"]) {
  const o = document.createElement("option");
  o.value = key;
  o.textContent = ROOM_NAMES[key] ?? key;
  els.roomSel.appendChild(o);
}
function fillViews() {
  const room = els.roomSel.value;
  els.viewSel.innerHTML = "";
  for (const v of VIEWS.filter((x) => x.room === room)) {
    const o = document.createElement("option");
    o.value = v.id;
    o.textContent = v.label;
    els.viewSel.appendChild(o);
  }
  const first = VIEWS.find((x) => x.room === room);
  if (first) selectView(first);
}

function selectView(v: ViewDef) {
  currentView = v;
  if (walking) exitWalk();
  goalFromView(v);
  els.viewSel.value = v.id;
  const url = new URL(location.href);
  url.searchParams.set("view", v.id);
  history.replaceState(null, "", url);
}

els.roomSel.addEventListener("change", fillViews);
els.viewSel.addEventListener("change", () => {
  const v = VIEWS.find((x) => x.id === els.viewSel.value);
  if (v) selectView(v);
});

// 日夜
const PHASE_LABEL: Record<PhaseId, string> = { day: "日间", night: "夜间", cinema: "观影" };
for (const id of Object.keys(PHASES) as PhaseId[]) {
  const b = document.createElement("button");
  b.dataset.id = id;
  b.textContent = PHASE_LABEL[id];
  b.addEventListener("click", () => setPhase(id));
  els.phases.appendChild(b);
}

let phaseTween: { t0: number; from: number; to: number; fromSky: THREE.Color; toSky: THREE.Color } | null = null;

function setPhase(id: PhaseId, opts: { tween?: boolean } = {}) {
  const from = lab.hemi.intensity;
  const fromSky = (sky.material as THREE.MeshBasicMaterial).color.clone();
  phase = id;
  const spec = styleById(current.id);
  const ph = applyStyle(lab, spec, id);
  const toSky = new THREE.Color(ph.sky);
  (sky.material as THREE.MeshBasicMaterial).color.copy(toSky);
  scene.fog = new THREE.Fog(new THREE.Color(ph.fog), 22, 46);
  renderer.toneMappingExposure = ph.exposure;
  if (opts.tween !== false) {
    phaseTween = { t0: performance.now(), from, to: lab.hemi.intensity, fromSky, toSky };
    lab.hemi.intensity = from;
    (sky.material as THREE.MeshBasicMaterial).color.copy(fromSky);
  }
  for (const b of Array.from(els.phases.querySelectorAll("button"))) {
    b.setAttribute("aria-pressed", String(b.dataset.id === id));
  }
  const url = new URL(location.href);
  url.searchParams.set("phase", id);
  history.replaceState(null, "", url);
}

// 风格
const TWEEN_KEYS = ["wall", "ceiling", "wood", "wood2", "stone", "cabinet", "cabinetUpper", "counter", "tile", "frame", "metal", "soft", "bed", "rug", "art", "a", "b", "c"];
let tween: { t0: number; from: Record<string, THREE.Color>; to: Record<string, THREE.Color>; sunFrom: THREE.Color; sunTo: THREE.Color } | null = null;

function snapshot() {
  const out: Record<string, THREE.Color> = {};
  for (const k of TWEEN_KEYS) out[k] = lab.mats[k].color.clone();
  return out;
}

function setStyle(id: string, opts: { flash?: boolean } = {}) {
  const next = styleById(id);
  const from = snapshot();
  const sunFrom = lab.sun.color.clone();
  current = next;
  applyStyle(lab, next, phase);
  const sunTo = lab.sun.color.clone();
  tween = { t0: performance.now(), from, to: snapshot(), sunFrom, sunTo };

  if (opts.flash !== false) {
    els.flash.style.background = next.palette.wall;
    els.flash.style.transition = "none";
    els.flash.style.opacity = "0.85";
    requestAnimationFrame(() => {
      els.flash.style.transition = "opacity 0.45s ease";
      els.flash.style.opacity = "0";
    });
  }

  els.idx.textContent = String(next.index).padStart(2, "0");
  els.name.textContent = next.name;
  els.sub.textContent = next.sub;
  els.idea.textContent = next.idea;
  els.note.textContent = next.note;
  els.risk.textContent = next.risk;
  els.chips.innerHTML = ([
    ["A", next.palette.a],
    ["B", next.palette.b],
    ["C", next.palette.c],
    ["WOOD", next.palette.wood],
    ["TILE", next.palette.tile],
  ] as [string, string][])
    .map(([, hex]) => `<span class="chip"><i style="background:${hex}"></i>${hex.toUpperCase()}</span>`)
    .join("");
  for (const b of Array.from(els.styles.querySelectorAll("button"))) {
    b.setAttribute("aria-pressed", String(b.dataset.id === next.id));
  }
  const url = new URL(location.href);
  url.searchParams.set("style", next.id);
  history.replaceState(null, "", url);
}

for (const s of STYLES) {
  const b = document.createElement("button");
  b.dataset.id = s.id;
  b.innerHTML = `<i style="background:${s.palette.a}"></i>${String(s.index).padStart(2, "0")} ${s.sub}`;
  b.addEventListener("click", () => setStyle(s.id));
  els.styles.appendChild(b);
}

// 复位 / 导出 / 漫游
els.reset.addEventListener("click", () => {
  if (walking) exitWalk();
  goalFromView(currentView);
});
els.walkBtn.addEventListener("click", () => (walking ? exitWalk() : enterWalk()));
els.shot.addEventListener("click", () => {
  renderer.render(scene, camera);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `muko-style-lab-${current.id}-${currentView.id}-${phase}.png`;
  a.click();
});
els.toggle.addEventListener("click", () => els.panel.classList.toggle("collapsed"));

window.addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (!walking && n >= 1 && n <= STYLES.length) setStyle(STYLES[n - 1].id);
  if (e.key === "Escape" && walking) exitWalk();
  if (walking) walk.keys.add(e.key.toLowerCase());
});
window.addEventListener("keyup", (e) => walk.keys.delete(e.key.toLowerCase()));

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- 启动 ----------
const params = new URLSearchParams(location.search);
const startView = VIEWS.find((v) => v.id === params.get("view")) ?? VIEWS[0];
els.roomSel.value = startView.room;
fillViews();
selectView(startView);
goalFromView(startView);
orbit.yaw = orbit.gyaw;
orbit.pitch = orbit.gpitch;
orbit.radius = orbit.gradius;
orbit.target.copy(orbit.gtarget);
orbit.fov = orbit.gfov;
setStyle(styleById(params.get("style")).id, { flash: false });
setPhase((params.get("phase") as PhaseId) ?? "day", { tween: false });

const clock = new THREE.Clock();
let frames = 0;
const tmpDir = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (walking) {
    const speed = 2.1;
    let fwd = 0;
    let side = 0;
    if (walk.keys.has("w") || walk.keys.has("arrowup")) fwd += 1;
    if (walk.keys.has("s") || walk.keys.has("arrowdown")) fwd -= 1;
    if (walk.keys.has("a")) side -= 1;
    if (walk.keys.has("d")) side += 1;
    if (walk.keys.has("q")) walk.yaw += dt * 1.4;
    if (walk.keys.has("e")) walk.yaw -= dt * 1.4;
    const len = Math.hypot(fwd, side) || 1;
    const dirX = Math.sin(walk.yaw) * -1;
    const dirZ = Math.cos(walk.yaw) * -1;
    const nx = walk.x + ((dirX * fwd) / len + Math.cos(walk.yaw) * side) * speed * dt;
    const nz = walk.z + ((dirZ * fwd) / len - Math.sin(walk.yaw) * side) * speed * dt;
    const [cx, cz] = collide(nx, nz);
    walk.x = THREE.MathUtils.clamp(cx, 0.3, 12.55);
    walk.z = THREE.MathUtils.clamp(cz, 0.3, 9.05);
    camera.position.set(walk.x, 1.55, walk.z);
    camera.rotation.set(0, walk.yaw, 0, "YXZ");
    camera.rotateX(walk.pitch);
  } else {
    const k = 1 - Math.pow(0.0016, dt);
    orbit.yaw += (orbit.gyaw - orbit.yaw) * k;
    orbit.pitch += (orbit.gpitch - orbit.pitch) * k;
    orbit.radius += (orbit.gradius - orbit.radius) * k;
    orbit.target.lerp(orbit.gtarget, k);
    orbit.fov += (orbit.gfov - orbit.fov) * k;
    applyOrbitCam();
  }

  if (tween) {
    const p = THREE.MathUtils.clamp((performance.now() - tween.t0) / 460, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    for (const key of TWEEN_KEYS) lab.mats[key].color.lerpColors(tween.from[key], tween.to[key], e);
    lab.sun.color.lerpColors(tween.sunFrom, tween.sunTo, e);
    if (p >= 1) tween = null;
  }
  if (phaseTween) {
    const p = THREE.MathUtils.clamp((performance.now() - phaseTween.t0) / 520, 0, 1);
    if (p >= 1) phaseTween = null;
  }

  sky.position.copy(camera.position);
  renderer.render(scene, camera);
  frames += 1;
  if (!ready && frames > 2) ready = true;
});

// ---------- 调试 / 自动化 API ----------
(window as unknown as { styleLab: unknown }).styleLab = {
  version: VERSION,
  _scene: scene,
  _camera: camera,
  _renderer: renderer,
  _THREE: THREE,
  probe: () => {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(0, 0), camera);
    return rc.intersectObjects(scene.children, true).slice(0, 4).map((h) => ({
      name: h.object.name || "(unnamed)",
      dist: Number(h.distance.toFixed(2)),
      mat: (h.object as THREE.Mesh).material && ((h.object as THREE.Mesh).material as THREE.MeshStandardMaterial).name,
      color: (h.object as THREE.Mesh).material && ((h.object as THREE.Mesh).material as THREE.MeshStandardMaterial).color?.getHexString(),
    }));
  },
  getState: () => ({
    version: VERSION,
    style: current.id,
    phase,
    room: els.roomSel.value,
    view: currentView.id,
    ready,
    views: VIEWS.map((v) => v.id),
    styles: STYLES.map((s) => s.id),
    floors: lab.floors.length,
    objects: lab.furniture.children.length,
  }),
  setStyle: (id: string) => setStyle(id, { flash: false }),
  setPhase: (id: PhaseId) => setPhase(id, { tween: false }),
  setView: (id: string) => {
    const v = VIEWS.find((x) => x.id === id);
    if (!v) return false;
    els.roomSel.value = v.room;
    fillViews();
    selectView(v);
    orbit.yaw = orbit.gyaw;
    orbit.pitch = orbit.gpitch;
    orbit.radius = orbit.gradius;
    orbit.target.copy(orbit.gtarget);
    orbit.fov = orbit.gfov;
    applyOrbitCam();
    return true;
  },
  debugCam: (pos: [number, number, number], target: [number, number, number], fov = 50) => {
    if (walking) exitWalk();
    goalFromView({ room: "all", id: "debug", label: "debug", pos, target, fov });
    orbit.yaw = orbit.gyaw;
    orbit.pitch = orbit.gpitch;
    orbit.radius = orbit.gradius;
    orbit.target.copy(orbit.gtarget);
    orbit.fov = orbit.gfov;
    applyOrbitCam();
  },
};
