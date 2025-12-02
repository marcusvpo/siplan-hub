import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AdminLayout() {
  const { user, role, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">Carregando...</div>;
  }

  if (!user || role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Usuários", icon: Users },
    { href: "/admin/team", label: "Equipe", icon: Users },
    { href: "/admin/settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/10 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b">
            <span className="font-bold text-xl tracking-tight text-primary">Siplan Admin</span>
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
              const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
              
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start mb-1",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20"
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
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    AD
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Administrador</p>
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
                {navItems.find(i => i.href === location.pathname)?.label || "Painel Administrativo"}
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
