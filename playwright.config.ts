import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: process.env.CI ? [["list"], ["line"]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4180/muko-style-lab/",
    // CI 用软件光栅化，视口小一点，避免每帧光栅化时间吃掉 actionability 预算
    viewport: { width: 1000, height: 640 },
    trace: "off",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: "npm run preview -- --port 4180 --host 127.0.0.1",
    url: "http://127.0.0.1:4180/muko-style-lab/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
