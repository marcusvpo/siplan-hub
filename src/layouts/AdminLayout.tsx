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
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { activityLogger } from "@/services/activityLogger";

export default function AdminLayout() {
  const { user, role, loading, permissionsLoaded, signOut } = useAuth();
  const { canManageUsers } = usePermissions();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Heartbeat to keep user marked as online while in admin area
  useEffect(() => {
    if (!user || loading || !permissionsLoaded) return;

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
  }, [user?.id, loading, permissionsLoaded]);

  if (loading || !permissionsLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  if (!user || (!canManageUsers && role !== "admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Usuários", icon: Users },
    { href: "/admin/roles", label: "Perfis de Acesso", icon: Shield },
    { href: "/admin/vacations", label: "Férias", icon: Palmtree },
    { href: "/admin/teams-config", label: "Configurações do Time", icon: Settings2 },
    { href: "/admin/audit", label: "Logs", icon: History },
    { href: "/admin/settings", label: "Saúde dos Projetos", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-muted/10 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b">
            <div className="flex items-center gap-2">
              <img
                src={
                  theme === "dark" ||
                  (theme === "system" &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches)
                    ? "/assets/Siplan_logo_branco.png"
                    : "/assets/Siplan_logo.png"
                }
                alt="Siplan Logo"
                className="h-8 w-auto object-contain drop-shadow-md transition-all"
              />
              <span className="font-bold text-xl tracking-tight text-primary sr-only">
                Siplan Admin
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 py-6 px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/admin" &&
                  location.pathname.startsWith(item.href));

              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start mb-1",
                      isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                {user.email?.substring(0, 2) || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {role === "admin" ? "Administrador" : role === "user" ? "Usuário Padrão" : role || "Sem Papel"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center px-4 lg:px-8 sticky top-0 z-40">
          <Button
            variant="ghost"
            size="icon"
            className="mr-4 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {navItems.find((i) => i.href === location.pathname)?.label ||
              "Painel Administrativo"}
          </h1>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
