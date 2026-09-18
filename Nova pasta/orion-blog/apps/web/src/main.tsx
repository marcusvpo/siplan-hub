//Author: Erik Marques
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AdminAccessProvider } from "./AdminAccess";
import "./styles.css";
import "./publication-view.css";
import "./filter-tabs.css";
import "./management.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><AdminAccessProvider><App /></AdminAccessProvider></StrictMode>,
);
