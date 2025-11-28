import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Home, ArrowRight } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isProjectsPage = location.pathname === "/projects";

  return (
    <div className="flex h-screen w-full bg-muted/10 overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-6 shrink-0 z-10">
           <Breadcrumbs />
           
           <div className="flex items-center gap-2">
              {isProjectsPage ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 hidden md:flex"
                  onClick={() => navigate("/")}
                >
                  <Home className="h-4 w-4" />
                  Dashboard
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
              <ModeToggle />
           </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-muted-foreground/20">
           {children}
        </main>
      </div>
    </div>
  );
}
