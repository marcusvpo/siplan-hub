import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { useProjects } from "@/hooks/useProjects";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  Layers,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Database,
  ChevronDown,
  Users,
  BarChart3,
  LogOut,
  Calendar as CalendarIcon,
  Rocket,
  Briefcase,
  FolderClosed,
  Contact,
  UserCircle,
  Cog,
  AlertCircle,
  FileText,
  LayoutGrid,
  LayoutDashboard,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { UserProfileDrawer } from "./UserProfileDrawer";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { theme } = useTheme();
  const { projects } = useProjects();
  const [isDashboardOpen, setIsDashboardOpen] = useState(
    location.pathname.startsWith("/dashboard"),
  );
  const [isImplantacaoOpen, setIsImplantacaoOpen] = useState(false);
  const [isCalendarioOpen, setIsCalendarioOpen] = useState(false);
  const [isOrionTNModelsOpen, setIsOrionTNModelsOpen] = useState(
    location.pathname.startsWith("/orion-tn-models"),
  );
  const [isProjectsSubMenuOpen, setIsProjectsSubMenuOpen] = useState(
    location.pathname.startsWith("/orion-tn-models/"),
  );
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
      
  const { hasPermission } = usePermissions();
  const canViewImplantacao = hasPermission("menu_implantacao", "view");
  const canViewCalendario = hasPermission("menu_calendario", "view");
  const canViewComercial = hasPermission("menu_comercial", "view");
  const canViewConversao = hasPermission("menu_conversao", "view");
  const canViewOrion = hasPermission("menu_orion", "view");
  const canViewDashboardView = hasPermission("dashboard_view", "view");
  const canViewKanban = hasPermission("kanban", "view");
  
  const logoSrc = isDark
    ? "/assets/Siplan_logo_branco.png"
    : "/assets/Siplan_logo.png";

  const orionTNProjects = projects.filter(
    (p) => p.systemType === "Orion TN" || p.systemType === "OrionTN",
  );

  return (
    <aside
      className={cn(
        "bg-sidebar border-r transition-all duration-300 flex flex-col z-20 shadow-xl shadow-black/5",
        collapsed ? "w-20" : "w-72",
      )}
    >
      <div className="h-16 flex items-center justify-between px-6 border-b bg-sidebar/50 backdrop-blur-sm">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img
              src={logoSrc}
              alt="Siplan Logo"
              className="h-8 w-auto transition-all duration-300 ease-in-out opacity-100"
              key={logoSrc}
            />
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-primary to-rose-600 bg-clip-text text-transparent">
              HUB
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors",
            collapsed ? "mx-auto" : "",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 py-4 space-y-2 overflow-y-auto">
        {/* Início */}
        <div className="px-2">
          <Link to="/">
            <Button
              variant={isActive("/") ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                collapsed ? "justify-center px-0" : "",
              )}
              title="Início"
            >
              <Home className="h-5 w-5" />
              {!collapsed && <span>Início</span>}
            </Button>
          </Link>
        </div>

        {/* Dashboard Group */}
        <div className="px-2">
          {!collapsed ? (
            <Collapsible
              open={isDashboardOpen}
              onOpenChange={setIsDashboardOpen}
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between hover:bg-muted/50"
                  title="Dashboard"
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="h-5 w-5" />
                    <span>Dashboard</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isDashboardOpen ? "transform rotate-180" : "",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4 animate-in slide-in-from-top-2">
                <div className="pt-1 pb-2">
                  {canViewDashboardView && (
                    <Link to="/dashboard">
                      <Button
                        variant={isActive("/dashboard") ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-3 h-9"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span>Visão Geral</span>
                      </Button>
                    </Link>
                  )}
                  {canViewKanban && (
                    <Link to="/dashboard/kanban">
                      <Button
                        variant={isActive("/dashboard/kanban") ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-3 h-9"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Quadro Kanban</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link to="/dashboard">
              <Button
                variant={location.pathname.startsWith("/dashboard") ? "secondary" : "ghost"}
                className="w-full justify-center px-0"
                title="Dashboard"
              >
                <LayoutGrid className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>

        {/* Implantação Group */}
        {canViewImplantacao && (
        <div className="px-2">
          {!collapsed ? (
            <Collapsible
              open={isImplantacaoOpen}
              onOpenChange={setIsImplantacaoOpen}
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5" />
                    <span>Implantação</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isImplantacaoOpen ? "transform rotate-180" : "",
                    )}
                  />
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
                  <Link to="/reports">
                    <Button
                      variant={isActive("/reports") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Relatórios</span>
                    </Button>
                  </Link>
                  <Link to="/deployments">
                    <Button
                      variant={isActive("/deployments") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <Rocket className="h-4 w-4" />
                      <span>Próx. Implantações</span>
                    </Button>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
              <Link to="/projects">
                <Button
                  variant={
                    isActive("/projects") ||
                      isActive("/reports") ||
                      isActive("/deployments")
                      ? "secondary"
                      : "ghost"
                  }
                  className="w-full justify-center px-0"
                  title="Implantação (Gerenciar Projetos)"
                  onClick={() => setIsImplantacaoOpen(true)}
                >
                  <Layers className="h-5 w-5" />
                </Button>
              </Link>
          )}
        </div>
        )}

        {/* Calendário Group */}
        {canViewCalendario && (
        <div className="px-2">
          {!collapsed ? (
            <Collapsible
              open={isCalendarioOpen}
              onOpenChange={setIsCalendarioOpen}
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between hover:bg-muted/50"
                  title="Calendário"
                >
                  <div className="flex items-center gap-3">
                     <CalendarIcon className="h-5 w-5" />
                    <span>Calendário</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isCalendarioOpen ? "transform rotate-180" : "",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4 animate-in slide-in-from-top-2">
                <div className="pt-1 pb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-4 mb-2 block">
                    Cronogramas
                  </span>
                  <Link to="/calendar">
                    <Button
                      variant={isActive("/calendar") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      <span>Calendário de Projetos</span>
                    </Button>
                  </Link>
                  <Link to="/agenda-analistas">
                    <Button
                      variant={isActive("/agenda-analistas") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <Users className="h-4 w-4" />
                      <span>Agenda dos Analistas</span>
                    </Button>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link to="/calendar">
              <Button
                variant={
                  isActive("/calendar") || isActive("/agenda-analistas") ? "secondary" : "ghost"
                }
                className="w-full justify-center px-0"
                title="Calendário (Projetos e Agenda)"
                onClick={() => setIsCalendarioOpen(true)}
              >
                <CalendarIcon className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
        )}

        {/* Commercial Group */}
        {canViewComercial && (
        <div className="px-2">
          {!collapsed ? (
            <Collapsible className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between hover:bg-muted/50"
                  title="Comercial"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5" />
                    <span>Comercial</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4 animate-in slide-in-from-top-2">
                <div className="pt-1 pb-2">
                  <Link to="/commercial/customers">
                    <Button
                      variant={
                        isActive("/commercial/customers")
                          ? "secondary"
                          : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <Users className="h-4 w-4" />
                      <span>Painel de Clientes</span>
                    </Button>
                  </Link>
                  <Link to="/commercial/blockers">
                    <Button
                      variant={
                        isActive("/commercial/blockers") ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Bloqueios</span>
                    </Button>
                  </Link>
                  <Link to="/commercial/contacts">
                    <Button
                      variant={
                        isActive("/commercial/contacts") ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <Contact className="h-4 w-4" />
                      <span>Contatos</span>
                    </Button>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
              <Link to="/commercial/customers">
                <Button
                  variant={
                    isActive("/commercial/customers") ||
                      isActive("/commercial/blockers") ||
                      isActive("/commercial/contacts")
                      ? "secondary"
                      : "ghost"
                  }
                  className="w-full justify-center px-0"
                  title="Comercial (Painel de Clientes)"
                >
                  <Briefcase className="h-5 w-5" />
                </Button>
              </Link>
          )}
        </div>
        )}

        {/* Conversão Group */}
        {canViewConversao && (
        <div className="px-2">
          {!collapsed ? (
            <Collapsible className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button
                  variant={
                    location.pathname.startsWith("/conversion")
                      ? "secondary"
                      : "ghost"
                  }
                  className="w-full justify-between hover:bg-muted/50"
                  title="Conversão"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5" />
                    <span>Conversão</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4 animate-in slide-in-from-top-2">
                <div className="pt-1 pb-2">
                  <Link to="/conversion">
                    <Button
                      variant={isActive("/conversion") ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <Home className="h-4 w-4" />
                      <span>Gestão de Atividades</span>
                    </Button>
                  </Link>
                  <Link to="/conversion/engines">
                    <Button
                      variant={
                        isActive("/conversion/engines") ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <Cog className="h-4 w-4" />
                      <span>Motores</span>
                    </Button>
                  </Link>
                  <Link to="/conversion/homologation">
                    <Button
                      variant={
                        isActive("/conversion/homologation")
                          ? "secondary"
                          : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start gap-3 h-9"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Homologação</span>
                    </Button>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link to="/conversion">
              <Button
                variant={
                  location.pathname.startsWith("/conversion")
                    ? "secondary"
                    : "ghost"
                }
                className="w-full justify-center px-0"
                title="Conversão"
              >
                <Database className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
        )}

        {/* OrionTN Models */}
        {canViewOrion && (
        <div className="px-2">
          {!collapsed ? (
            <Collapsible
              open={isOrionTNModelsOpen}
              onOpenChange={setIsOrionTNModelsOpen}
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant={
                    location.pathname.startsWith("/orion-tn-models")
                      ? "secondary"
                      : "ghost"
                  }
                  className="w-full justify-between hover:bg-muted/50"
                  title="Modelos Editor OrionTN"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <span>Modelos Editor OrionTN</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOrionTNModelsOpen ? "transform rotate-180" : "",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4 animate-in slide-in-from-top-2">
                <div className="pt-1 pb-1">
                  <div className="px-4 py-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                      Gestão
                    </span>
                    <Link to="/orion-tn-models/dashboard">
                      <Button
                        variant={isActive("/orion-tn-models/dashboard") ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-3 h-9"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="text-xs font-medium">Dashboard</span>
                      </Button>
                    </Link>
                    <Link to="/orion-tn-models/projects">
                      <Button
                        variant={isActive("/orion-tn-models/projects") ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-3 h-9"
                      >
                        <FolderClosed className="h-4 w-4" />
                        <span className="text-xs font-medium">Gerenciar Projetos</span>
                      </Button>
                    </Link>
                    <Link to="/orion-tn-models">
                      <Button
                        variant={
                          location.pathname === "/orion-tn-models" ||
                          (location.pathname.startsWith("/orion-tn-models/") &&
                            location.pathname !== "/orion-tn-models/dashboard" &&
                            location.pathname !== "/orion-tn-models/projects")
                            ? "secondary"
                            : "ghost"
                        }
                        size="sm"
                        className="w-full justify-start gap-3 h-9"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-medium">Editor de Modelos</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link to="/orion-tn-models/projects">
              <Button
                variant={
                  location.pathname.startsWith("/orion-tn-models")
                    ? "secondary"
                    : "ghost"
                }
                className="w-full justify-center px-0"
                title="Modelos Editor OrionTN"
              >
                <FileText className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
        )}
      </div>

      <div className="p-2 border-t mt-auto space-y-1">
        <div className={cn("flex gap-1", collapsed ? "flex-col" : "")}>
          {/* Profile Button */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn(
              "justify-start gap-3 text-slate-600 hover:text-primary hover:bg-primary/10",
              collapsed ? "w-full justify-center px-0" : "flex-1",
            )}
            onClick={() => setIsProfileOpen(true)}
            title="Meu Perfil"
          >
            <UserCircle className="h-5 w-5" />
            {!collapsed && <span>Perfil</span>}
          </Button>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={cn(
              "justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20",
              collapsed ? "w-full justify-center px-0" : "",
            )}
            onClick={() => signOut()}
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </div>

      {/* User Profile Drawer */}
      <UserProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </aside>
  );
}
