import { chromium } from "@playwright/test";
import fs from "node:fs";

const out = "/tmp/sl";
fs.mkdirSync(out, { recursive: true });
const exe = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto("http://127.0.0.1:4180/muko-style-lab/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.styleLab && window.styleLab.getState().ready, null, { timeout: 20000 }).catch(() => {});

const args = process.argv.slice(2);
const views = args.length ? args : ["all-overview", "all-top", "bar-from-kitchen", "kitchen-through", "living-entry"];
const styles = ["bauhaus", "midcentury", "wabi", "dopamine"];
const shots = [];
for (const v of views) {
  for (const s of styles) {
    await page.evaluate(
      ([st, vw]) => {
        window.styleLab.setView(vw);
        window.styleLab.setStyle(st);
        window.styleLab.setPhase("day");
      },
      [s, v],
    );
    await page.waitForTimeout(650);
    const f = `${out}/${v}__${s}.png`;
    await page.screenshot({ path: f });
    shots.push(f);
  }
}
console.log("SHOTS", shots.length);
console.log("ERRORS", JSON.stringify(errors.slice(0, 6)));
await browser.close();
