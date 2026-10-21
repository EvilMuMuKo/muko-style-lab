import { chromium } from "@playwright/test";
import fs from "node:fs";

const out = "/tmp/probe";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const exe = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
await page.goto("http://127.0.0.1:4180/muko-style-lab/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.styleLab && window.styleLab.getState().ready, null, { timeout: 20000 });

const probes = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
await page.evaluate(() => window.styleLab.setStyle("midcentury"));
for (const p of probes) {
  await page.evaluate((q) => window.styleLab.debugCam(q.pos, q.target, q.fov ?? 50), p);
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${out}/${p.name}.png` });
  console.log("ok", p.name);
}
await browser.close();
