import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Palmtree,
  Shield,
  History,
  Settings2,
  Activity,
  HardDrive,
  UserMinus,
  ArrowLeft,
  Sparkles,
  BarChart3,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { activityLogger } from "@/services/activityLogger";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

export default function AdminLayout() {
  const { user, role, loading, permissionsLoaded, signOut } = useAuth();
  const { canManageUsers, hasPermission } = usePermissions();
  const { theme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const location = useLocation();
  const userId = user?.id;

  useEffect(() => {
    window.localStorage.setItem(
      ADMIN_SIDEBAR_COLLAPSED_KEY,
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);

  // Heartbeat to keep user marked as online while in admin area
  useEffect(() => {
    if (!userId || loading || !permissionsLoaded) return;

    const sendHeartbeat = () => {
      activityLogger.log({
        action: "custom_action",
        details: { 
          additionalInfo: { type: "heartbeat" } 
        }
      });
    };

    // Initial heartbeat
    sendHeartbeat();

    // Periodic heartbeat every 10 minutes
    const interval = setInterval(sendHeartbeat, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, loading, permissionsLoaded]);

  if (loading || !permissionsLoaded) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  // canManageUsers mantém o acesso dos perfis criados antes de admin_panel existir
  const canAccessAdmin =
    role === "admin" || hasPermission("admin_panel", "view") || canManageUsers;

  if (!user || !canAccessAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, resource: "admin_dashboard" },
    { href: "/admin/users", label: "Usuários", icon: Users, resource: "users" },
    { href: "/admin/roles", label: "Perfis de Acesso", icon: Shield, resource: "roles" },
    { href: "/admin/copilot", label: "Copiloto", icon: Sparkles, resource: "copilot_admin" },
    { href: "/admin/copilot-usage", label: "Uso do Copiloto", icon: BarChart3, resource: "copilot_usage" },
    { href: "/admin/pos-ai-logs", label: "Logs Assistente IA", icon: Bot, resource: "pos_ai_logs" },
    { href: "/admin/teams-config", label: "Configurações do Time", icon: Settings2, resource: "teams" },
    { href: "/admin/inactive-users", label: "Usuários Inativos", icon: UserMinus, resource: "inactive_users" },
    { href: "/admin/vacations", label: "Férias", icon: Palmtree, resource: "vacations" },
    { href: "/admin/settings", label: "Saúde dos Projetos", icon: Activity, resource: "settings" },
    { href: "/admin/storage", label: "Armazenamento", icon: HardDrive, resource: "storage" },
    { href: "/admin/audit", label: "Logs", icon: History, resource: "audit_logs" },
  ].filter((item) => hasPermission(item.resource, "view"));

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] overflow-hidden bg-muted/10">
      {/* Sidebar */}
      <aside
        aria-label="Navegação administrativa"
        data-collapsed={sidebarCollapsed}
        data-mobile-open={mobileSidebarOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card shadow-xl transition-[transform,width] duration-300 ease-out lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:shadow-sm",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "lg:w-[72px]" : "lg:w-64",
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              "flex h-16 shrink-0 items-center border-b px-4 transition-[padding] duration-300",
              sidebarCollapsed ? "lg:justify-center lg:px-2" : "lg:px-6",
            )}
          >
            <div className={cn("flex min-w-0 items-center", sidebarCollapsed && "lg:hidden")}>
              <img
                src={
                  theme === "dark" ||
                  (theme === "system" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches)
                    ? "/assets/Siplan_logo_branco.png"
                    : "/assets/Siplan_logo.png"
                }
                alt="Siplan Logo"
                className="h-8 w-auto max-w-[150px] object-contain drop-shadow-md transition-all"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto shrink-0 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Fechar menu lateral"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hidden shrink-0 lg:inline-flex",
                !sidebarCollapsed && "ml-auto",
              )}
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
          </div>

          <nav
            className={cn(
              "flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-5 transition-[padding] duration-300",
              sidebarCollapsed && "lg:px-2",
            )}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/admin" &&
                  location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    title={sidebarCollapsed ? item.label : undefined}
                    aria-label={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      "mb-1 w-full justify-start overflow-hidden transition-[padding] duration-300",
                      sidebarCollapsed && "lg:justify-center lg:px-0",
                      isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 mr-2",
                        sidebarCollapsed && "lg:mr-0",
                      )}
                    />
                    <span className={cn("truncate", sidebarCollapsed && "lg:sr-only")}>
                      {item.label}
                    </span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div
            className={cn(
              "shrink-0 space-y-2 border-t p-4 transition-[padding] duration-300",
              sidebarCollapsed && "lg:px-2",
            )}
          >
            <div
              className={cn(
                "mb-4 flex items-center gap-3 px-2",
                sidebarCollapsed && "lg:justify-center lg:px-0",
              )}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary"
                title={sidebarCollapsed ? user.email || "Usuário" : undefined}
              >
                {user.email?.substring(0, 2) || "U"}
              </div>
              <div className={cn("flex-1 overflow-hidden", sidebarCollapsed && "lg:hidden")}>
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {role === "admin" ? "Administrador" : role === "user" ? "Usuário Padrão" : role || "Sem Papel"}
                </p>
              </div>
            </div>

            <Link to="/">
              <Button
                variant="outline"
                title={sidebarCollapsed ? "Acessar Sistema" : undefined}
                className={cn(
                  "w-full justify-start overflow-hidden text-muted-foreground hover:text-foreground",
                  sidebarCollapsed && "lg:justify-center lg:px-0",
                )}
              >
                <ArrowLeft className={cn("h-4 w-4 shrink-0 mr-2", sidebarCollapsed && "lg:mr-0")} />
                <span className={cn("truncate", sidebarCollapsed && "lg:sr-only")}>
                  Acessar Sistema
                </span>
              </Button>
            </Link>

            <Button
              variant="outline"
              title={sidebarCollapsed ? "Sair" : undefined}
              className={cn(
                "w-full justify-start overflow-hidden border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive",
                sidebarCollapsed && "lg:justify-center lg:px-0",
              )}
              onClick={() => signOut()}
            >
              <LogOut className={cn("h-4 w-4 shrink-0 mr-2", sidebarCollapsed && "lg:mr-0")} />
              <span className={cn("truncate", sidebarCollapsed && "lg:sr-only")}>
                Sair
              </span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b bg-card/80 px-3 backdrop-blur-sm sm:px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Abrir menu lateral"
            aria-expanded={mobileSidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {navItems.find((i) => i.href === location.pathname)?.label ||
              "Painel Administrativo"}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
}
