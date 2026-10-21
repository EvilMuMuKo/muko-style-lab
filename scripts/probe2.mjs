import { chromium } from "@playwright/test";
const exe = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://127.0.0.1:4180/muko-style-lab/", { waitUntil: "networkidle" });
await p.waitForFunction(() => window.styleLab && window.styleLab.getState().ready);
await p.evaluate(() => { const S=window.styleLab; S.setStyle("midcentury"); S.setPhase("day"); S.setView("kitchen-through"); });
await p.waitForTimeout(500);
const out = await p.evaluate(() => {
  const S = window.styleLab, T = S._THREE, cam = S._camera, scene = S._scene;
  const res = [];
  for (const [x,y] of [[0.60,0.10],[0.55,-0.15],[0.65,0.35],[0.50,0.45]]) {
    const rc = new T.Raycaster();
    rc.setFromCamera(new T.Vector2(x,y), cam);
    const hs = rc.intersectObjects(scene.children, true).slice(0,2);
    res.push({ndc:[x,y], hits: hs.map(h=>({d:+h.distance.toFixed(2), mat:h.object.material?.name||h.object.material?.type,
      col:h.object.material?.color?.getHexString(), mapw:h.object.material?.map?.image?.width||null,
      geo:h.object.geometry?.type, world:h.object.getWorldPosition(new T.Vector3()).toArray().map(v=>+v.toFixed(2))}))});
  }
  return res;
});
console.log(JSON.stringify(out));
await b.close();
