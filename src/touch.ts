/**
 * 触摸端浮动双摇杆：左半屏生成移动杆，右半屏生成视角杆。
 * 摇杆本身不接收指针，画布在 pointerdown 时取得 capture，因此两根手指
 * 可以各自跨越中线而不会互换角色。桌面鼠标完全不走这条路径。
 */

export interface TouchAxis {
  /** -1（左）… 1（右） */
  x: number;
  /** -1（上）… 1（下） */
  y: number;
  /** 指针是否仍按在画布上 */
  active: boolean;
}

export interface TouchControls {
  /** 当前浏览器是否按触摸设备处理 */
  readonly enabled: boolean;
  readonly move: TouchAxis;
  readonly look: TouchAxis;
  /** 清空两根摇杆并释放 capture（失焦 / 旋转 / 退出漫游时调用） */
  reset(): void;
  dispose(): void;
}

type Options = {
  isWalking: () => boolean;
  onChange: () => void;
};

const THUMB_LIMIT = 44; // 拇指最大位移
const DEAD_ZONE = 0.14;

// 指针落点在这些 UI 上时不生成摇杆。画布通常不会收到 controls 等元素上的
// 事件，但 #top 是 pointer-events:none，必须按包围盒再判一次。
const UI_SELECTOR = "#controls, #top, #stylePanel, #styles, #orientation-gate";

function hitsUi(clientX: number, clientY: number) {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(UI_SELECTOR))) {
    if (el.hidden) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return true;
  }
  return false;
}

function makeStick(role: "move" | "look", label: string) {
  const stick = document.createElement("div");
  stick.className = `touch-stick touch-stick--${role}`;
  stick.id = `${role}Stick`;
  stick.dataset.role = role;
  stick.hidden = true;
  stick.setAttribute("role", "presentation");
  stick.setAttribute("aria-hidden", "true");

  const ring = document.createElement("span");
  ring.className = "touch-stick__ring";

  const thumb = document.createElement("span");
  thumb.className = "touch-stick__thumb";

  const text = document.createElement("span");
  text.className = "touch-stick__label";
  text.textContent = label;

  stick.append(ring, thumb, text);
  return { stick, thumb };
}

export function createTouchControls(canvas: HTMLCanvasElement, opts: Options): TouchControls {
  const enabled =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);

  const overlay = document.createElement("div");
  overlay.className = "touch-controls";
  overlay.id = "touchControls";
  overlay.setAttribute("aria-hidden", "true");

  const moveStick = makeStick("move", "移动");
  const lookStick = makeStick("look", "视角");
  overlay.append(moveStick.stick, lookStick.stick);

  const axes: Record<"move" | "look", TouchAxis> = {
    move: { x: 0, y: 0, active: false },
    look: { x: 0, y: 0, active: false },
  };

  const pointers: Record<"move" | "look", number | null> = { move: null, look: null };
  const origins: Record<"move" | "look", { x: number; y: number }> = {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
  };

  let disposed = false;

  function show(which: "move" | "look", event: PointerEvent) {
    const parts = which === "move" ? moveStick : lookStick;
    pointers[which] = event.pointerId;
    origins[which] = { x: event.clientX, y: event.clientY };
    parts.stick.style.left = `${event.clientX}px`;
    parts.stick.style.top = `${event.clientY}px`;
    parts.stick.hidden = false;
    parts.thumb.style.transform = "translate(0, 0)";
    axes[which] = { x: 0, y: 0, active: true };
  }

  function update(which: "move" | "look", event: PointerEvent) {
    if (pointers[which] !== event.pointerId) return;
    const parts = which === "move" ? moveStick : lookStick;
    const origin = origins[which];
    let dx = event.clientX - origin.x;
    let dy = event.clientY - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance > THUMB_LIMIT) {
      dx = (dx / distance) * THUMB_LIMIT;
      dy = (dy / distance) * THUMB_LIMIT;
    }
    parts.thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    let ax = dx / THUMB_LIMIT;
    let ay = dy / THUMB_LIMIT;
    if (Math.hypot(ax, ay) < DEAD_ZONE) {
      ax = 0;
      ay = 0;
    }
    axes[which].x = ax;
    axes[which].y = ay;
  }

  function hide(which: "move" | "look") {
    const parts = which === "move" ? moveStick : lookStick;
    parts.stick.hidden = true;
    parts.stick.style.left = "";
    parts.stick.style.top = "";
    parts.thumb.style.transform = "translate(0, 0)";
    axes[which] = { x: 0, y: 0, active: false };
  }

  function release(which: "move" | "look", pointerId?: number) {
    const held = pointers[which];
    if (held === null) return;
    if (pointerId !== undefined && held !== pointerId) return;
    pointers[which] = null;
    hide(which);
    try {
      if (canvas.hasPointerCapture(held)) canvas.releasePointerCapture(held);
    } catch {
      // 浏览器可能已经因 cancel 释放了 capture。
    }
  }

  function reset() {
    release("move");
    release("look");
  }

  function stickFromEvent(event: PointerEvent): "move" | "look" {
    return event.clientX < window.innerWidth / 2 ? "move" : "look";
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== "touch") return;
    // 触摸永远不进入 orbit 拖拽；先截断，避免冒泡到 main.ts 的鼠标逻辑。
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!opts.isWalking()) return;
    const target = event.target as Element | null;
    if (target?.closest?.(UI_SELECTOR)) return;
    if (hitsUi(event.clientX, event.clientY)) return;
    if (isPortraitGateOpen()) return;

    const which = stickFromEvent(event);
    if (pointers[which] !== null) return;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // 合成事件或已分离的画布可能不支持 capture。
    }
    show(which, event);
    opts.onChange();
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType !== "touch") return;
    // capture 保证移动事件仍回到画布；这里也阻止鼠标 pointermove 逻辑。
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.pointerId === pointers.move) update("move", event);
    else if (event.pointerId === pointers.look) update("look", event);
    opts.onChange();
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerType !== "touch") return;
    release("move", event.pointerId);
    release("look", event.pointerId);
    opts.onChange();
  }

  function onLostCapture(event: PointerEvent) {
    release("move", event.pointerId);
    release("look", event.pointerId);
    opts.onChange();
  }

  function onVisibility() {
    if (document.hidden) {
      reset();
      opts.onChange();
    }
  }

  function onBlur() {
    reset();
    opts.onChange();
  }

  function isPortraitGateOpen() {
    return window.matchMedia("(max-width: 1024px) and (orientation: portrait)").matches;
  }

  function onViewportChange() {
    reset();
    opts.onChange();
  }

  if (enabled) {
    canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
    canvas.addEventListener("pointermove", onPointerMove, { capture: true });
    canvas.addEventListener("pointerup", onPointerUp, { capture: true });
    canvas.addEventListener("pointercancel", onPointerUp, { capture: true });
    canvas.addEventListener("lostpointercapture", onLostCapture, { capture: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("orientationchange", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    document.body.append(overlay);
  }

  return {
    enabled,
    get move() {
      return axes.move;
    },
    get look() {
      return axes.look;
    },
    reset,
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      canvas.removeEventListener("pointerdown", onPointerDown, { capture: true });
      canvas.removeEventListener("pointermove", onPointerMove, { capture: true });
      canvas.removeEventListener("pointerup", onPointerUp, { capture: true });
      canvas.removeEventListener("pointercancel", onPointerUp, { capture: true });
      canvas.removeEventListener("lostpointercapture", onLostCapture, { capture: true });
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("orientationchange", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      overlay.remove();
    },
  };
}
