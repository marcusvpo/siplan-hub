import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const config = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const rawBase = config.VITE_BLOG_BASE_PATH || "/";
  const base = rawBase.endsWith("/") ? rawBase : rawBase + "/";
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error("VITE_BLOG_BASE_PATH deve ser / ou um subcaminho como /blog/.");
  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        [`${base}api/`]: {
          target: config.API_PROXY_TARGET || "http://localhost:3333",
          rewrite: path => path.slice(base.length - 1),
        },
      },
    },
  };
});
