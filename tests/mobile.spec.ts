import { expect, test, type CDPSession, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => {
    const lab = (window as any).styleLab;
    return lab && lab.getState().ready === true;
  });
  // 首屏机位还有 620ms 缓动，等它结束再取基准，避免把 tween 当成触摸位移。
  await page.waitForTimeout(750);
}

async function state(page: Page) {
  return page.evaluate(() => (window as any).styleLab.getState());
}

async function touch(cdp: CDPSession, type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel", points: { x: number; y: number; id: number }[]) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
}

async function startWalk(page: Page) {
  await page.locator("#walkBtn").tap();
  await expect(page.locator("#hud")).toHaveText("漫游中：左半屏拖动行走 · 右半屏拖动转头");
  expect((await state(page)).walking).toBe(true);
  // 进入漫游后的第一帧会把全屋机位夹到可行走边界内，等它落定再记录基准。
  await expect
    .poll(async () => (await state(page)).camera[0], { timeout: 5000 })
    .toBeLessThanOrEqual(12.56);
}

test.describe("竖屏 gate", () => {
  test.use({ viewport: { width: 900, height: 1200 }, hasTouch: true, deviceScaleFactor: 2 });

  test("900x1200 竖屏显示请横屏观看，旋转后自动隐藏并清理摇杆", async ({ page }) => {
    await ready(page);
    const gate = page.locator("#orientation-gate");
    await expect(gate).toBeVisible();
    await expect(gate).toContainText("请横屏观看");
    await expect(gate.locator("svg")).toBeVisible();
    await page.screenshot({ path: "test-results/orientation-gate-900x1200.png", fullPage: false });

    await page.setViewportSize({ width: 1200, height: 600 });
    await expect(gate).toBeHidden();
  });
});

test.describe("横屏触摸双摇杆", () => {
  test.use({ viewport: { width: 1200, height: 600 }, hasTouch: true, deviceScaleFactor: 1 });

  test("漫游入口可点，左半屏落点生成移动杆、拖动相机、松手归零", async ({ page }) => {
    await ready(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });

    const boot = await state(page);
    expect(boot.touch.enabled).toBe(true);

    // 未进入漫游时触摸画布不生成摇杆，也不触发 orbit。
    const orbitBefore = boot.orbit;
    await touch(cdp, "touchStart", [{ x: 460, y: 420, id: 1 }]);
    await touch(cdp, "touchMove", [{ x: 520, y: 500, id: 1 }]);
    await touch(cdp, "touchEnd", []);
    await expect(page.locator("#moveStick")).toBeHidden();
    const orbitAfter = (await state(page)).orbit;
    expect(orbitAfter.yaw).toBeCloseTo(orbitBefore.yaw, 5);
    expect(orbitAfter.pitch).toBeCloseTo(orbitBefore.pitch, 5);

    await startWalk(page);
    const before = await state(page);

    await touch(cdp, "touchStart", [{ x: 460, y: 420, id: 1 }]);
    const moveStick = page.locator("#moveStick");
    await expect(moveStick).toBeVisible();
    await expect(page.locator("#lookStick")).toBeHidden();
    const box = (await moveStick.boundingBox())!;
    expect(box.x + box.width / 2).toBeCloseTo(460, 0);
    expect(box.y + box.height / 2).toBeCloseTo(420, 0);

    // 死区内不产生位移。
    await touch(cdp, "touchMove", [{ x: 463, y: 417, id: 1 }]);
    await page.waitForTimeout(120);
    const dead = await state(page);
    expect(dead.touch.move.x).toBe(0);
    expect(dead.touch.move.y).toBe(0);

    // 向上推 = 前进；位移轴有值且相机位置变化。
    await touch(cdp, "touchMove", [{ x: 460, y: 340, id: 1 }]);
    const axis = (await state(page)).touch.move;
    expect(axis.y).toBeLessThan(-0.9);
    await expect
      .poll(async () => {
        const now = await state(page);
        return Math.hypot(now.camera[0] - before.camera[0], now.camera[2] - before.camera[2]);
      }, { timeout: 5000 })
      .toBeGreaterThan(0.05);

    // 拖动行走不会改变视角。
    const moved = await state(page);
    expect(moved.walkPose.yaw).toBeCloseTo(before.walkPose.yaw, 5);
    expect(moved.orbit.yaw).toBeCloseTo(orbitBefore.yaw, 5);

    await touch(cdp, "touchEnd", []);
    await expect(moveStick).toBeHidden();
    const released = await state(page);
    expect(released.touch.move).toEqual({ x: 0, y: 0, active: false });
    await page.waitForTimeout(300);
    const stopped = await state(page);
    expect(stopped.walkPose.x).toBeCloseTo(released.walkPose.x, 5);
    expect(stopped.walkPose.z).toBeCloseTo(released.walkPose.z, 5);
  });

  test("右半屏落点生成视角杆，拖动改变 yaw/pitch，松手停止", async ({ page }) => {
    await ready(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
    await startWalk(page);
    const before = await state(page);

    await touch(cdp, "touchStart", [{ x: 980, y: 450, id: 2 }]);
    const lookStick = page.locator("#lookStick");
    await expect(lookStick).toBeVisible();
    await expect(page.locator("#moveStick")).toBeHidden();
    const box = (await lookStick.boundingBox())!;
    expect(box.x + box.width / 2).toBeCloseTo(980, 0);
    expect(box.y + box.height / 2).toBeCloseTo(450, 0);

    // 向右上拖：yaw 减小（右转），pitch 增大（抬头）。
    await touch(cdp, "touchMove", [{ x: 1040, y: 390, id: 2 }]);
    await expect
      .poll(async () => {
        const now = await state(page);
        return now.walkPose.yaw - before.walkPose.yaw < -0.05 && now.walkPose.pitch - before.walkPose.pitch > 0.03;
      }, { timeout: 5000 })
      .toBe(true);

    const looked = await state(page);
    expect(Math.hypot(looked.camera[0] - before.camera[0], looked.camera[2] - before.camera[2])).toBeLessThan(0.02);
    expect(looked.orbit.yaw).toBeCloseTo(before.orbit.yaw, 5);

    await touch(cdp, "touchEnd", []);
    await expect(lookStick).toBeHidden();
    const released = await state(page);
    expect(released.touch.look).toEqual({ x: 0, y: 0, active: false });
    await page.waitForTimeout(300);
    const stopped = await state(page);
    expect(stopped.walkPose.yaw).toBeCloseTo(released.walkPose.yaw, 5);
    expect(stopped.walkPose.pitch).toBeCloseTo(released.walkPose.pitch, 5);
  });

  test("双指同时按住时两根杆独立，跨过半屏中线也不换角色", async ({ page }) => {
    await ready(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
    await startWalk(page);
    const before = await state(page);

    const left = { x: 460, y: 420, id: 6 };
    const right = { x: 980, y: 450, id: 7 };
    await touch(cdp, "touchStart", [left]);
    await touch(cdp, "touchStart", [left, right]);
    await expect(page.locator("#moveStick")).toBeVisible();
    await expect(page.locator("#lookStick")).toBeVisible();

    // 左指向上推、右指向左上跨过中线：角色仍按最初落点锁定。
    await touch(cdp, "touchMove", [
      { x: 480, y: 340, id: left.id },
      { x: 500, y: 300, id: right.id },
    ]);
    const axes = await state(page);
    expect(axes.touch.move.y).toBeLessThan(-0.9);
    expect(axes.touch.move.x).toBeGreaterThan(0.1);
    expect(axes.touch.look.x).toBeLessThan(-0.9);
    expect(axes.touch.look.y).toBeLessThan(-0.2);
    expect(axes.walkPose.yaw).not.toBeCloseTo(before.walkPose.yaw, 2);

    const moveBox = (await page.locator("#moveStick").boundingBox())!;
    const lookBox = (await page.locator("#lookStick").boundingBox())!;
    expect(moveBox.x + moveBox.width / 2).toBeCloseTo(left.x, 0);
    expect(lookBox.x + lookBox.width / 2).toBeCloseTo(right.x, 0);

    await touch(cdp, "touchEnd", []);
    await expect(page.locator("#moveStick")).toBeHidden();
    await expect(page.locator("#lookStick")).toBeHidden();
    const released = await state(page);
    expect(released.touch.move).toEqual({ x: 0, y: 0, active: false });
    expect(released.touch.look).toEqual({ x: 0, y: 0, active: false });
  });

  test("cancel / lostpointercapture / blur 均复位摇杆，触摸不会触发 orbit", async ({ page }) => {
    await ready(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
    await startWalk(page);

    await touch(cdp, "touchStart", [{ x: 460, y: 420, id: 3 }]);
    await expect(page.locator("#moveStick")).toBeVisible();
    await touch(cdp, "touchCancel", []);
    await expect(page.locator("#moveStick")).toBeHidden();
    expect((await state(page)).touch.move).toEqual({ x: 0, y: 0, active: false });

    await touch(cdp, "touchStart", [{ x: 960, y: 430, id: 4 }]);
    await expect(page.locator("#lookStick")).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.locator("#lookStick")).toBeHidden();
    expect((await state(page)).touch.look).toEqual({ x: 0, y: 0, active: false });

    // #top 是 pointer-events:none，事件会落到画布；按包围盒也不应生成摇杆。
    await touch(cdp, "touchStart", [{ x: 600, y: 24, id: 5 }]);
    await expect(page.locator("#moveStick")).toBeHidden();
    await expect(page.locator("#lookStick")).toBeHidden();
    await touch(cdp, "touchCancel", []);
  });
});

test.describe("移动端 DPR 预算", () => {
  test.use({ viewport: { width: 1200, height: 600 }, hasTouch: true, deviceScaleFactor: 3 });

  test("deviceScaleFactor=3 时渲染像素比被压到 1.5，resize 后仍保持", async ({ page }) => {
    await ready(page);
    expect((await state(page)).pixelRatio).toBe(1.5);
    await page.setViewportSize({ width: 1100, height: 600 });
    await page.waitForTimeout(120);
    expect((await state(page)).pixelRatio).toBe(1.5);
    expect(await page.evaluate(() => (window as any).styleLab._renderer.getPixelRatio())).toBe(1.5);
  });
});

test.describe("桌面鼠标交互", () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false });

  test("不出现摇杆，orbit 拖拽与滚轮缩放正常", async ({ page }) => {
    await ready(page);
    await expect(page.locator("#touchControls")).toHaveCount(0);
    await expect(page.locator(".touch-stick")).toHaveCount(0);
    const before = await state(page);
    expect(before.touch.enabled).toBe(false);

    const box = (await page.locator("#view").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 18, { steps: 6 });
    await page.mouse.up();
    const dragged = await state(page);
    expect(dragged.orbit.yaw).not.toBeCloseTo(before.orbit.yaw, 3);
    expect(dragged.orbit.pitch).not.toBeCloseTo(before.orbit.pitch, 3);

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 260);
    await expect.poll(async () => (await state(page)).orbit.radius).toBeGreaterThan(dragged.orbit.radius + 0.1);
    await expect(page.locator(".touch-stick")).toHaveCount(0);
  });
});
