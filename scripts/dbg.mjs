import { chromium } from "@playwright/test";
const exe = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await b.newPage({ viewport: { width: 900, height: 600 } });
await p.goto("http://127.0.0.1:4180/muko-style-lab/", { waitUntil: "networkidle" });
await p.waitForFunction(() => window.styleLab && window.styleLab.getState().ready);
const probes = [
  ["k1",[4.72,1.55,5.15],[1.0,1.0,4.4],52],
  ["k2",[4.5,1.55,4.2],[1.0,1.0,4.8],52],
  ["halltop",[5.5,6,5.0],[5.5,0,5.0],45],
  ["hall-a",[4.2,1.55,4.6],[1.0,1.0,4.6],55],
  ["hall-b",[4.6,1.55,3.9],[1.0,1.0,4.6],55],
];
for (const [name,pos,target,fov] of probes) {
  const r = await p.evaluate(([po,tg,f])=>{ window.styleLab.debugCam(po,tg,f); return window.styleLab.probe(); },[pos,target,fov]);
  console.log(name, JSON.stringify(r));
}
await b.close();
