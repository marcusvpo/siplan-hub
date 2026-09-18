import { AdminAccessProvider } from "@/modules/orion-updates/AdminAccess";
import { App as OrionUpdatesApp } from "@/modules/orion-updates/App";
import "@/modules/orion-updates/styles.css";
import "@/modules/orion-updates/publication-view.css";
import "@/modules/orion-updates/filter-tabs.css";
import "@/modules/orion-updates/management.css";

export default function OrionUpdatesPage() {
  return (
    <div className="orion-blog-module min-h-full w-full min-w-0 overflow-x-hidden">
      <AdminAccessProvider>
        <OrionUpdatesApp />
      </AdminAccessProvider>
    </div>
  );
}
