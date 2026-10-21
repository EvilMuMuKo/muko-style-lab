import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

/**
 * GitHub Pages 对 index.html 下发 cache-control: max-age=600，构建产物虽然带
 * 内容 hash，但用户可能仍停留在一份旧 HTML 上。给 JS/CSS 引用追加构建版本，
 * 让缓存中的 HTML 与新资源明确区分；README 同时说明强制刷新。
 */
function buildVersion() {
  const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version?: string };
  let sha = process.env.GITHUB_SHA?.slice(0, 7) ?? "";
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      // tarball / 无 git 的构建环境退回纯版本号。
    }
  }
  return `${pkg.version ?? "0.0.0"}${sha ? `-${sha}` : ""}`;
}

function cacheBustAssets(): Plugin {
  return {
    name: "muko-cache-bust-assets",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      const version = encodeURIComponent(buildVersion());
      return html.replace(
        /\b(src|href)="([^"]*\/assets\/[^"]+)"/g,
        (_match, attr: string, url: string) => `${attr}="${url}?v=${version}"`,
      );
    },
  };
}

export default defineConfig({
  base: "/muko-style-lab/",
  server: { port: 5180 },
  preview: { port: 4180 },
  build: { target: "es2022", assetsInlineLimit: 0 },
  plugins: [cacheBustAssets()],
});
