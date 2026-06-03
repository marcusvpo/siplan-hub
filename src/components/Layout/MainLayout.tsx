import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isProjectsPage = location.pathname === "/projects";
  const isPrintMode = new URLSearchParams(location.search).get("print") === "true";

  if (isPrintMode) {
    return (
      <div className="min-h-screen w-full bg-background print:bg-white print:text-black">
        {children}
      </div>
    );
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
      <div className="flex min-h-[100dvh] w-full bg-muted/10 overflow-hidden">
        <AppSidebar />

        <div className="flex flex-col flex-1 min-h-[100dvh] overflow-hidden transition-all duration-300 min-w-0">
          <header className="flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-4 md:px-6 shrink-0 z-10 sticky top-0 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="md:hidden shrink-0" />
              <Breadcrumbs />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isProjectsPage ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 hidden md:flex"
                  onClick={() => navigate("/")}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Início
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 hidden md:flex"
                  onClick={() => navigate("/projects")}
                >
                  Ver Todos os Projetos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <NotificationBell />
              <ModeToggle />
            </div>
          </header>

          <main className={`flex-1 flex flex-col ${isProjectsPage ? 'overflow-hidden' : 'overflow-auto'} p-4 md:p-6 min-w-0`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
