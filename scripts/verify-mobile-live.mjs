/**
 * 线上手机适配验收：资源 hash / 竖屏 gate / 横屏双摇杆 / DPR / console。
 * 用法：
 *   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     node scripts/verify-mobile-live.mjs https://evilmumuko.github.io/muko-style-lab/
 */
import { chromium } from "@playwright/test";

const target = process.argv[2] ?? "https://evilmumuko.github.io/muko-style-lab/";
const executablePath =
  process.env.CHROMIUM_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const errors = [];
const results = { target, version: null, resources: {}, desktop: {}, portrait: {}, landscape: {}, errors };

function watch(page) {
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("favicon")) errors.push(`console: ${m.text()}`);
  });
}

async function waitReady(page) {
  await page.waitForFunction(() => window.styleLab && window.styleLab.getState().ready, null, { timeout: 45_000 });
  await page.waitForTimeout(800);
}

async function getState(page) {
  return page.evaluate(() => window.styleLab.getState());
}

async function dispatch(cdp, type, points) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
}

try {
  // 1) 线上 HTML 与实际资源，确认 index 引用的是本次构建。
  const htmlResponse = await fetch(target, { cache: "no-store" });
  const html = await htmlResponse.text();
  const script = html.match(/src="([^"]*assets\/index-[^"]+\.js[^"]*)"/)?.[1] ?? null;
  const css = html.match(/href="([^"]*assets\/index-[^"]+\.css[^"]*)"/)?.[1] ?? null;
  results.resources.index = {
    status: htmlResponse.status,
    lastModified: htmlResponse.headers.get("last-modified"),
    etag: htmlResponse.headers.get("etag"),
    cacheControl: htmlResponse.headers.get("cache-control"),
    script,
    css,
  };
  if (script) {
    const asset = await fetch(new URL(script, target), { method: "HEAD", cache: "no-store" });
    results.resources.script = {
      status: asset.status,
      lastModified: asset.headers.get("last-modified"),
      etag: asset.headers.get("etag"),
      cacheControl: asset.headers.get("cache-control"),
    };
  }

  // 2) 桌面：无错误、无摇杆、orbit 与滚轮可用。
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    watch(page);
    await page.goto(target, { waitUntil: "domcontentloaded" });
    await waitReady(page);
    const state = await getState(page);
    results.version = state.version;
    const before = { ...state.orbit };
    const box = await page.locator("#view").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 16, { steps: 5 });
    await page.mouse.up();
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(150);
    const after = await getState(page);
    results.desktop = {
      version: state.version,
      pixelRatio: state.pixelRatio,
      touchEnabled: state.touch.enabled,
      sticks: await page.locator(".touch-stick").count(),
      orbitYawDelta: Number((after.orbit.yaw - before.yaw).toFixed(4)),
      orbitPitchDelta: Number((after.orbit.pitch - before.pitch).toFixed(4)),
      orbitRadiusDelta: Number((after.orbit.radius - before.radius).toFixed(4)),
    };
    await page.screenshot({ path: "/tmp/stylelab-live-desktop.png" });
    await context.close();
  }

  // 3) 竖屏 900x1200：gate 可见并截图。
  {
    const context = await browser.newContext({
      viewport: { width: 900, height: 1200 },
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    watch(page);
    await page.goto(target, { waitUntil: "domcontentloaded" });
    await waitReady(page);
    results.portrait = {
      gateVisible: await page.locator("#orientation-gate").isVisible(),
      gateText: (await page.locator("#orientation-gate").innerText()).replace(/\s+/g, " ").trim(),
      pixelRatio: (await getState(page)).pixelRatio,
    };
    await page.screenshot({ path: "/tmp/stylelab-live-portrait.png" });
    await context.close();
  }

  // 4) 横屏 1200x600 触摸：左杆走路 + 右杆转头 + 松手归零。
  {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 600 },
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    watch(page);
    await page.goto(target, { waitUntil: "domcontentloaded" });
    await waitReady(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });

    await page.locator("#walkBtn").tap();
    await page.waitForFunction(() => window.styleLab.getState().walking);
    await page.waitForTimeout(250);
    const before = await getState(page);

    await dispatch(cdp, "touchStart", [{ x: 460, y: 420, id: 1 }]);
    const moveVisible = await page.locator("#moveStick").isVisible();
    await dispatch(cdp, "touchMove", [{ x: 460, y: 340, id: 1 }]);
    await page.waitForTimeout(600);
    const moved = await getState(page);
    await dispatch(cdp, "touchEnd", []);
    const releasedMove = await getState(page);

    await dispatch(cdp, "touchStart", [{ x: 980, y: 450, id: 2 }]);
    const lookVisible = await page.locator("#lookStick").isVisible();
    await dispatch(cdp, "touchMove", [{ x: 1040, y: 390, id: 2 }]);
    await page.waitForTimeout(500);
    const looked = await getState(page);
    await dispatch(cdp, "touchEnd", []);
    const releasedLook = await getState(page);

    results.landscape = {
      pixelRatio: before.pixelRatio,
      hud: await page.locator("#hud").innerText(),
      moveStickVisible: moveVisible,
      cameraDelta: Number(
        Math.hypot(moved.camera[0] - before.camera[0], moved.camera[2] - before.camera[2]).toFixed(3),
      ),
      moveReleased: releasedMove.touch.move,
      moveStickHiddenAfterRelease: await page.locator("#moveStick").isHidden(),
      lookStickVisible: lookVisible,
      yawDelta: Number((looked.walkPose.yaw - before.walkPose.yaw).toFixed(3)),
      pitchDelta: Number((looked.walkPose.pitch - before.walkPose.pitch).toFixed(3)),
      lookReleased: releasedLook.touch.look,
      lookStickHiddenAfterRelease: await page.locator("#lookStick").isHidden(),
    };
    await page.screenshot({ path: "/tmp/stylelab-live-landscape.png" });
    await context.close();
  }
} catch (error) {
  errors.push(`fatal: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await browser.close();
}

results.ok =
  errors.length === 0 &&
  results.resources.index.script?.includes("?v=") &&
  results.portrait.gateVisible === true &&
  results.landscape.moveStickVisible === true &&
  results.landscape.cameraDelta > 0.05 &&
  results.landscape.lookStickVisible === true &&
  Math.abs(results.landscape.yawDelta) > 0.02 &&
  Math.abs(results.landscape.pitchDelta) > 0.02 &&
  results.landscape.pixelRatio <= 1.5;

console.log(JSON.stringify(results, null, 2));
process.exit(results.ok ? 0 : 1);
