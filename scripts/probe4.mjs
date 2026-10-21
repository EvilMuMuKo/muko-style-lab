import { chromium } from "@playwright/test";
const exe = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 750 } });
await p.goto("http://127.0.0.1:4180/muko-style-lab/", { waitUntil: "networkidle" });
await p.waitForFunction(() => window.styleLab && window.styleLab.getState().ready);
await p.evaluate(() => { const S=window.styleLab; S.setStyle("midcentury"); S.setPhase("day"); S.setView("kitchen-through"); });
await p.waitForTimeout(500);
// 关掉所有投射，只留阴影贴图
await p.evaluate(() => { window.styleLab._scene.traverse(o=>{ if(o.isMesh) o.castShadow=false; }); window.styleLab._renderer.shadowMap.needsUpdate = true; });
await p.waitForTimeout(500);
await p.screenshot({ path: "/tmp/probe/nocaster.png" });
// 再单独开 sun 的阴影质量对比
await b.close();
