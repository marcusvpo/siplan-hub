import { lazy, ReactNode, Suspense } from "react";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { PwaInstallButton, PwaInstallDialog } from "@/components/pwa/PwaInstallControls";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { getContextualHeaderAction } from "./contextualHeaderAction";

const FloatingCopilot = lazy(() =>
  import("@/components/Copilot/FloatingCopilot").then((module) => ({
    default: module.FloatingCopilot,
  })),
);

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const normalizedPathname = location.pathname.replace(/\/+$/, "");

  const isProjectsPage = location.pathname === "/projects";
  const isModelsWorkspacePage = normalizedPathname.startsWith("/orion-tn-models/");
  const isAssistantsKnowledgePage = location.pathname === "/assistentes/conhecimento";
  const isPosAiLogsPage = location.pathname === "/assistentes/logs";
  const isPosAiLinksChatsPage = location.pathname === "/assistentes/links-chats";
  const isImplantadoresHomologationPage = location.pathname === "/implantadores/homologation";
  const isConversionActivitiesPage = location.pathname === "/conversion/atividades";
  const isNoScrollPage = isProjectsPage || isModelsWorkspacePage || isAssistantsKnowledgePage || isImplantadoresHomologationPage || isConversionActivitiesPage;
  const isFullBleedPage = isModelsWorkspacePage || isAssistantsKnowledgePage || isPosAiLogsPage || isPosAiLinksChatsPage || isImplantadoresHomologationPage || isConversionActivitiesPage;
  const isPrintMode = new URLSearchParams(location.search).get("print") === "true";
  const headerAction = getContextualHeaderAction(location.pathname, (permissionKey) => !permissionKey || hasPermission(permissionKey, "view"));
  const HeaderActionIcon = headerAction?.icon;

  if (isPrintMode) {
    return <div className="min-h-[100dvh] w-full bg-background print:bg-white print:text-black">{children}</div>;
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "18rem",
          "--sidebar-width-icon": "5rem",
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-[100dvh] w-full overflow-hidden bg-muted/10 pb-[env(safe-area-inset-bottom)]">
        <AppSidebar />

        <div className="flex flex-col flex-1 min-h-[100dvh] overflow-hidden transition-all duration-300 min-w-0">
          <header className="sticky top-0 z-10 flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-border/40 bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:h-16 sm:gap-4 sm:px-6 sm:pt-0">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <SidebarTrigger className="md:hidden shrink-0" />
              <Breadcrumbs />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {headerAction && HeaderActionIcon && (
                <Button variant="outline" size="sm" className="gap-2 hidden md:flex" title={`Ir para ${headerAction.label}`} onClick={() => navigate(headerAction.path)}>
                  <HeaderActionIcon className="h-4 w-4" />
                  {headerAction.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <PwaInstallButton visible={location.pathname === "/"} />
              <NotificationBell />
              <ModeToggle />
            </div>
          </header>

          <main className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden ${isNoScrollPage ? "overflow-y-hidden" : "overflow-y-auto"} ${isFullBleedPage ? "p-0" : "px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-6 sm:pt-3"}`}>{children}</main>
        </div>

        {/* Botao flutuante do Copiloto (so aparece para usuarios habilitados) */}
        <Suspense fallback={null}>
          <FloatingCopilot />
        </Suspense>
        <PwaInstallDialog />
      </div>
    </SidebarProvider>
  );
}
