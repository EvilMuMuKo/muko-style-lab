import { defineConfig } from "vite";

export default defineConfig({
  base: "/muko-style-lab/",
  server: { port: 5180 },
  preview: { port: 4180 },
  build: { target: "es2022", assetsInlineLimit: 0 },
});
