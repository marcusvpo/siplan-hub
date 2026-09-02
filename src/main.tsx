import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Tratamento e recuperação automática para novos deploys do Vite (stale chunk errors)
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const RELOAD_KEY = "siplan_vite_preload_reload";
  const lastReload = sessionStorage.getItem(RELOAD_KEY);
  const now = Date.now();

  // Permite no máximo um recarregamento automático por intervalo de 10s para evitar loops
  if (!lastReload || now - Number(lastReload) > 10000) {
    sessionStorage.setItem(RELOAD_KEY, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);

