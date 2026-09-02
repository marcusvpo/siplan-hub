import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { configDefaults } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        id: "/",
        name: "Siplan HUB",
        short_name: "Siplan HUB",
        description:
          "Ecossistema de gestão de implantações, conversões e operações da Siplan.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        categories: ["business", "productivity"],
        shortcuts: [
          {
            name: "Painel de indicadores",
            short_name: "Indicadores",
            url: "/dashboard/indicadores",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Projetos",
            short_name: "Projetos",
            url: "/projects",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Calendário",
            short_name: "Calendário",
            url: "/calendar",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/functions\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        globIgnores: [
          "pwa-*.png",
          "maskable-icon-*.png",
          "assets/KnowledgeEditorPage-*.js",
          "assets/FormRenderer-*.js",
          "assets/recharts-*.js",
          "assets/BarChart-*.js",
          "assets/PieChart-*.js",
          "assets/LineChart-*.js",
          "assets/Line-*.js",
          "assets/CartesianGrid-*.js",
          "assets/Legend-*.js",
          "assets/getRadiusAndStrokeWidthFromDot-*.js",
          "assets/rich-text-editor-*.js",
          "assets/jszip.min-*.js",
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "script",
            handler: "NetworkFirst",
            options: {
              cacheName: "siplan-route-scripts",
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          // Separa recharts para evitar dependências circulares
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/react-router/") ||
            normalizedId.includes("/node_modules/react-router-dom/")
          ) return "vendor";
          // Separa vendors principais para melhor caching
          // Separa @tanstack/react-query (pode ser grande)
          if (normalizedId.includes("/node_modules/@tanstack/react-query/")) return "query";
          // Separa Supabase SDK
          if (normalizedId.includes("/node_modules/@supabase/")) return "supabase";
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: [...configDefaults.exclude, "vm-worker/**"],
  },
}));
