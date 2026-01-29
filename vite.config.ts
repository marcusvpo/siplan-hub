import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa recharts para evitar dependências circulares
          recharts: ['recharts'],
          // Separa vendors principais para melhor caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Separa @tanstack/react-query (pode ser grande)
          query: ['@tanstack/react-query'],
          // Separa Supabase SDK
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
}));
