# 装修风格测试 · MuKo Style Lab

[打开风格实验室](https://evilmumuko.github.io/muko-style-lab/)

同一套 **102㎡ 户型、同一套家具布置**，只换材质、颜色、灯光与少量几何点缀，用来回答一个问题：
**这套房子在「包豪斯」这条线上，能推到多远还成立？**

当前版本 **R1 / 1.0.0**，四套风格：包豪斯原教旨、中古包豪斯（参考图复刻）、侘寂 × 包豪斯线、多巴胺孟菲斯。
这是可浏览的概念模型，不是施工图，也不是材料下单依据。

## 技术栈

与 [muko-home](https://github.com/EvilMuMuKo/muko-home) 同一条技术路线，去掉历史覆盖层，只保留一条链：

| 层 | 选型 |
|---|---|
| 渲染 | Three.js **0.186.0**（锁定）、WebGL2、ACES 色调映射 |
| 语言/构建 | TypeScript 7、Vite 8（`base=/muko-style-lab/`） |
| 数据 | `src/plan.json` —— 从 muko-home R7 导出模型里抽取的 8 个房间多边形 + 104 件家具的坐标与尺寸，构建时零处理，直接读 |
| 测试 | Playwright 1.64，12 项用例（桌面 + 触摸），CI 分 2 分片 |
| 发布 | GitHub Actions → Pages（artifact 部署，不在仓库里堆生成物） |

## 开发与发布

```sh
npm ci
npm run dev            # http://localhost:5180/muko-style-lab/
npm run build          # tsc --noEmit && vite build
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
# 线上手机适配验收（资源 hash / gate / 双摇杆 / DPR / console）
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node scripts/verify-mobile-live.mjs https://evilmumuko.github.io/muko-style-lab/
```

推 `main` 即自动：构建 → 2 分片测试 → 部署 Pages。

### 看不到更新时

GitHub Pages 对 `index.html` 下发 `cache-control: max-age=600`，这是托管平台的响应头，仓库改不了。
构建时会给 JS/CSS 引用追加 `?v=<版本>-<commit>`（见 `vite.config.ts` 的 `cache-bust-assets`），
所以只要拿到新 HTML，就一定会拉新资源；仍停留在旧 HTML 时请**强制刷新**：

- macOS：`Cmd + Shift + R`；Windows / Linux：`Ctrl + F5`
- 或在地址后加一个一次性参数，例如 `?v=20261021`

## 界面与操作

- **空间 / 镜头**：9 个空间（全屋 + 8 个房间），每个空间 1–2 个机位；「全屋透视」「全屋俯视」看整体。
- **复位**：回到当前机位；**导出 PNG**：当前画面存成图片（文件名带风格/机位/日夜）。
- **漫游**：WASD 移动、Q/E 转向、拖动转视角、Esc 退出；对角墙做圆形半径碰撞。
- **日夜**：日间 / 夜间 / 观影三档，只改这三档，不堆近似预设。
- **风格**：底部四个胶囊或键盘 `1`–`4`；切换时有一次短暂的白场过渡 + 颜色插值。
- 深链：`?style=midcentury&view=kitchen-through&phase=night`。

## 手机运行策略

- **竖屏 gate**：`max-width:1024px` 且 `orientation:portrait` 时显示「请横屏观看」，横屏后自动隐藏；旋转会清空摇杆输入。
- **浮动双摇杆**：仅触摸设备（`pointer:coarse` 或 `maxTouchPoints>0`）。进入漫游后，左半屏按下在落点生成移动杆，右半屏生成视角杆；死区 `0.14`、摇杆半径 `56px`、拇指位移上限 `44px`。
- 摇杆只在 `walking` 状态生效；触摸画布用 capture 阶段拦截，不触发桌面的 orbit 拖拽；落在控制面板、顶栏、风格面板、底部胶囊或 gate 上时不生成摇杆。
- `pointerup` / `pointercancel` / `lostpointercapture` / 窗口失焦 / 页面隐藏 / 旋转 / resize 都会复位并隐藏摇杆。
- **渲染预算**：`renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`，resize 时重算；桌面鼠标交互不变。
- 本轮只做 DPR 上限与按需渲染，**没有**移植 muko-home 的 30Hz 帧预算、灯光探针合并或反射捕获降级。


## 四套风格

| # | 风格 | 一句话主张 | 风险（刻意写在界面上） |
|---|---|---|---|
| 01 | **BAUHAUS** 包豪斯·原教旨 | 整屋压成白盒子，三原色只作为构件出现 | 白墙 + 白光最挑施工平整度 |
| 02 | **MID-CENTURY** 中古包豪斯 | 深蓝小方砖压半墙，胡桃木与棕白棋盘回暖 | 木色与蓝砖吃光，朝北房间夜里发闷 |
| 03 | **WABI-BAUHAUS** 侘寂 × 包豪斯线 | 面交给米白与浅橡木，包豪斯只留一条墨线 | 阴天几乎没层次，靠粗糙度不靠颜色 |
| 04 | **DOPAMINE** 多巴胺孟菲斯 | 色块当构件，靠黑白线拉回秩序 | 高饱和让木材发脏，属于越界测试 |

## 仓库结构

```
index.html            单页入口 + 控制面板骨架
src/plan.json         户型与家具数据（来自 muko-home R7 导出模型）
src/styles.ts         四套风格的调色板、地面配方、日夜档
src/textures.ts       运行时生成：棋盘格 / 木纹 / 水磨石 / 100mm 小方砖 / 招牌字
src/build.ts          墙体（带洞）、门窗、家具、灯光；applyStyle() 一次落地
src/main.ts           相机、漫游、UI、过渡、调试 API
src/touch.ts          触摸双摇杆、触摸 orbit 拦截、失焦/旋转复位
tests/smoke.spec.ts   4 项冒烟测试 + 构建版本号断言
tests/mobile.spec.ts  竖屏 gate、双摇杆、DPR、桌面回归（7 项）
docs/r1-design.md     R1 的设计范围、复核记录与边界
docs/mobile-landscape.md  手机适配的映射、参数、缓存穿透与未验证项
```

## 调试 / 自动化接口

```js
window.styleLab.getState()            // { version, style, phase, room, view, ready, floors, objects,
                                      //   walking, pixelRatio, touch, walkPose, orbit, camera }
window.styleLab.setStyle("wabi")      // 不触发白场过渡
window.styleLab.setPhase("night")
window.styleLab.setView("kitchen-inside")
window.styleLab.debugCam([4.6,1.55,4.9], [0.8,1.0,4.4], 56)
```

## 追加一版风格的做法（R2 及以后）

1. **先读** `docs/r1-design.md` 与 `src/plan.json`，确认是**加法**：布局、家具占位、房间尺寸不因视觉偏好改动。
2. 在 `src/styles.ts` 的 `STYLES` 里新增一项（调色板 + 五条地面配方 + 灯光增益 + 风险文案）。
3. 需要新几何点缀时，加在 `src/build.ts` 的 `accents` 分组里，用**已有材质槽**（a/b/c/wood/metal），不新增独立材质。
4. `applyStyle()` 必须能在**不新增纹理请求**的前提下落地；新增贴图要更新 `textures.ts` 并在文档写明尺寸与铺贴尺度。
5. 版本号 +1（`package.json` 与 `main.ts` 的 `VERSION` 同步），补 `tests/` 断言（风格 id 列表、`getState()` 字段）。
6. 写 `docs/rN-design.md`，**结尾必须有「边界」段**：哪些是效果目标、哪些没验证。
7. 跑 `npm run build` + `npm test`，推 PR；CI 通过后合 main，Pages 自动重建。

## 验证

本地（2026-10-21，Chromium 触摸模拟）：

| 项 | 结果 |
|---|---|
| `npm run build`（`tsc --noEmit` + Vite 8） | **PASS** |
| `npm test`（2 个 spec / 12 项） | **PASS**，12 passed |
| 竖屏 900×1200 | `#orientation-gate` 可见，截图 `test-results/orientation-gate-900x1200.png` |
| 横屏 1200×600 触摸 | 左摇杆在落点生成，拖动后相机位移，松手轴归零；右摇杆改变 yaw/pitch |
| DPR=3 | `renderer.getPixelRatio() === 1.5`，resize 后仍为 1.5 |
| 桌面 1280×800 | 无摇杆，orbit 拖拽 + 滚轮缩放正常 |

线上资源 hash、gate/摇杆实测与 CI 结果在合并后追加到 PR 评论；真机 iOS/Android **NOT RUN**。
详细参数与边界见 [`docs/mobile-landscape.md`](docs/mobile-landscape.md)。

## 边界

- 尺寸是**概念参数**，来自 muko-home 的虚拟模型（该仓库自述「未现场复尺，不能用于施工」）；本仓库不重新测量，也不因此变得更可靠。
- **实时阴影贴图已关闭**：在这套大量薄墙与柜体的几何里，掠射角自阴影会产生成片噪点，对"看材质与配色"这个目的弊大于利。因此没有真实投影与 AO，只有三点光 + 环境光。
- 材质是程序生成的近似：小方砖 100mm、棋盘格 250–400mm 只是比例示意，不代表实际砖规格、防滑等级、吸水率、阳角收口与勾缝。
- 灯光是效果目标，不是照度/眩光验收；夜间与观影档只调整亮度与色温，不做物理计算。
- 家具是**体块近似**，不是可下单的家具模型；柜内分格、五金、把手规格均未建模。
- 燃气、排烟、玻璃密封、五金承载、真机帧率均 **NOT RUN**。
