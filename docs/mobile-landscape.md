# 手机浏览器适配：横屏 gate + 浮动双摇杆

适用版本：R1 / 1.0.0，分支 `feat/mobile-landscape-sticks`。
参考实现：[muko-home](https://github.com/EvilMuMuKo/muko-home) 的 `orientation-gate`、`ghost-walk.ts` 浮动双摇杆与 `docs/mobile-runtime.md`。

## 范围

本轮只解决三件事：

1. 竖屏时不让用户对着被裁切的空间硬看，显示全屏「请横屏观看」。
2. 触摸设备进入漫游后，用左右半屏的浮动双摇杆替代 WASD / 鼠标拖拽。
3. 把渲染像素比压到 1.5，避免高 DPR 手机按 3x 渲染。

**没有**移植 muko-home 的 30Hz 帧预算、灯光探针合并、反射捕获降级、渐进贴图上传；桌面画质策略不变。

## 交互映射

| 输入 | 行为 |
|---|---|
| 左半屏触摸落下 | 在落点生成移动杆（圆环 112px，半径 56px） |
| 左摇杆上/下 | 前进 / 后退，模拟量按摇杆幅度缩放 |
| 左摇杆左/右 | 左右平移 |
| 右半屏触摸落下 | 在落点生成视角杆 |
| 右摇杆左/右 | yaw 速率（1.8 rad/s × 幅度） |
| 右摇杆上/下 | pitch 速率（1.3 rad/s × 幅度） |
| 死区 | 轴向量模长 < 0.14 归零 |
| 拇指位移上限 | 44px（超过后轴量饱和，不把圆环拖走） |

摇杆只在 `walking === true` 时生成。触摸画布由 capture 阶段拦截 `pointerType === "touch"`，
不进入原来的 orbit 拖拽；`pointerup`、`pointercancel`、`lostpointercapture`、`window.blur`、
`visibilitychange`、`orientationchange`、`resize` 都会复位轴向并隐藏摇杆。

触控落点按 `#controls` / `#top` / `#stylePanel` / `#styles` / `#orientation-gate` 的包围盒排除；
`#top` 是 `pointer-events:none`，所以不能只依赖 `event.target`。

## 运行预算

- `renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))`，初始化和 `resize` 都重算。
- 仍保持按需渲染：只有相机变化、摇杆按住、风格/日夜过渡或 warmup 时才提交帧。
- 桌面鼠标拖拽、滚轮缩放、`1`–`4`、Q/E、Esc 全部保留。

## 缓存穿透

GitHub Pages 对 HTML 固定 `cache-control: max-age=600`，无法在仓库侧修改响应头。
`vite.config.ts` 的 `muko-cache-bust-assets` 在构建后给 JS/CSS 引用追加：

```
?v=<package version>-<git short sha>
```

例如 `assets/index-xxxxxxxx.js?v=1.0.0-7b8c830`。如果用户仍持有旧 HTML，需要强制刷新
（`Cmd/Ctrl + Shift + R`）或加一次性查询参数。

## 本地验证（2026-10-21）

```text
npm run build                          PASS（tsc --noEmit + vite build）
CHROMIUM_PATH="…/Google Chrome" npm test PASS（12 passed）
竖屏 900x1200                          #orientation-gate 可见，截图 test-results/orientation-gate-900x1200.png
横屏 1200x600 触摸                     左摇杆生成 / 相机位移 / 松手轴归零 PASS
横屏 1200x600 触摸                     右摇杆生成 / yaw+pitch 变化 / 松手停止 PASS
DPR=3                                   renderer.getPixelRatio() === 1.5，resize 后仍为 1.5
桌面 1280x800                          无摇杆；orbit 拖拽与滚轮缩放 PASS
```

## 边界

- 真机 iOS Safari、Android Chrome、折叠屏/刘海安全区 **NOT RUN**；只在桌面 Chromium 的触摸模拟（CDP `Input.dispatchTouchEvent`）里验证。
- 真机帧率、发热、内存 **NOT RUN**；DPR 1.5 是预算，不是性能保证。
- 未实现摇杆灵敏度设置、左手模式、手柄/键盘与触摸混用时的优先级配置。
- 横屏 gate 只覆盖 `max-width:1024px` 且竖屏；桌面窄窗口（宽 ≤1024 且竖向）也会看到 gate，这是刻意与 muko-home 对齐的行为。
- 触摸滚动/双击缩放已由 `touch-action: none` 与 capture 拦截规避，但未在真机做手势冲突回归。
