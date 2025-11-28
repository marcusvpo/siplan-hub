import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  FolderKanban,
  Database,
  ChevronDown
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const [isImplantacaoOpen, setIsImplantacaoOpen] = useState(true);

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside 
      className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col z-20",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-14 flex items-center justify-between px-4 border-b">
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight text-primary">Siplan Manager</span>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className={cn("h-8 w-8", collapsed ? "mx-auto" : "")}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 py-4 space-y-2 overflow-y-auto">
        {/* Dashboard */}
        <div className="px-2">
           <Link to="/">
            <Button 
              variant={isActive("/") ? "secondary" : "ghost"} 
              className={cn(
                "w-full justify-start gap-3", 
                collapsed ? "justify-center px-0" : ""
              )}
              title="Dashboard"
            >
              <Home className="h-5 w-5" />
              {!collapsed && <span>Dashboard</span>}
            </Button>
           </Link>
        </div>

        {/* Implantação Group */}
        <div className="px-2">
          {!collapsed ? (
            <Collapsible open={isImplantacaoOpen} onOpenChange={setIsImplantacaoOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5" />
                    <span>Implantação</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isImplantacaoOpen ? "transform rotate-180" : "")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4 animate-in slide-in-from-top-2">
                 <div className="pt-1 pb-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-4 mb-2 block">
                      Projetos
                    </span>
                    <Link to="/projects">
                      <Button 
                        variant={isActive("/projects") ? "secondary" : "ghost"} 
                        size="sm"
                        className="w-full justify-start gap-3 h-9"
                      >
                        <FolderKanban className="h-4 w-4" />
                        <span>Gerenciar Projetos</span>
                      </Button>
                    </Link>
                 </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Button 
              variant={isActive("/projects") ? "secondary" : "ghost"} 
              className="w-full justify-center px-0"
              title="Implantação"
            >
              <Layers className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Conversão (Placeholder) */}
        <div className="px-2">
           <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 opacity-50 cursor-not-allowed", 
                collapsed ? "justify-center px-0" : ""
              )}
              title="Conversão (Em breve)"
            >
              <Database className="h-5 w-5" />
              {!collapsed && <span>Conversão</span>}
            </Button>
        </div>
      </div>
    </aside>
  );
}
