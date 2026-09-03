import { useState, ComponentType } from "react";
import {
  Bell,
  CheckCheck,
  Inbox,
  User,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  PartyPopper,
  Megaphone,
  Folder,
  Pin,
  Sparkles,
  Wrench,
  TrendingUp,
  Layers,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { TeamArea } from "@/types/conversion";

const NOTIFICATION_TYPE_ICONS: Record<string, ComponentType<any>> = {
  new_demand: Inbox,
  assignment: User,
  status_change: RefreshCw,
  issue_reported: AlertTriangle,
  client_response: MessageSquare,
  conversion_complete: CheckCircle2,
  homologation_approved: PartyPopper,
  homologation_issues: AlertTriangle,
  mention: Megaphone,
  release_feature: Sparkles,
  release_fix: Wrench,
  release_improvement: TrendingUp,
  release_screen: Layers,
};

const RELEASE_BADGES: Record<string, { label: string; className: string }> = {
  release_feature: { label: "Novidade", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  release_fix: { label: "Correção", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  release_improvement: { label: "Melhoria", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  release_screen: { label: "Nova tela", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

export function NotificationBell() {
  const { user, team } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications({
      userId: user?.id,
      team: team as TeamArea | undefined,
      limit: 50,
    });
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "changelog" | "operational">("all");

  const handleNotificationClick = (notification: (typeof notifications)[0]) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.projectId) {
      navigate(`/projects?id=${notification.projectId}`);
    }
  };

  const handleClearSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "changelog") {
      return n.category === "changelog" || n.type.startsWith("release_");
    }
    if (activeTab === "operational") {
      return n.category !== "changelog" && !n.type.startsWith("release_");
    }
    return true;
  });

  const changelogCount = notifications.filter(
    (n) => n.category === "changelog" || n.type.startsWith("release_")
  ).length;

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white rounded-full text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] p-0 shadow-2xl border-border">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="p-0 font-bold text-base">Notificações</DropdownMenuLabel>
            {changelogCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {changelogCount} novidades
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas lidas
            </Button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 px-3 pb-2 border-b border-border/60">
          <Button
            size="sm"
            variant={activeTab === "all" ? "secondary" : "ghost"}
            className="h-7 text-xs px-2.5 rounded-md"
            onClick={() => setActiveTab("all")}
          >
            Todas ({notifications.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "changelog" ? "secondary" : "ghost"}
            className={cn(
              "h-7 text-xs px-2.5 rounded-md gap-1",
              activeTab === "changelog" && "font-semibold"
            )}
            onClick={() => setActiveTab("changelog")}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            Novidades
          </Button>
          <Button
            size="sm"
            variant={activeTab === "operational" ? "secondary" : "ghost"}
            className="h-7 text-xs px-2.5 rounded-md"
            onClick={() => setActiveTab("operational")}
          >
            Atividades
          </Button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {activeTab === "changelog"
                ? "Nenhuma novidade recente."
                : activeTab === "operational"
                ? "Nenhuma atividade recente."
                : "Nenhuma notificação."}
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/40">
            {filteredNotifications.map((notification) => {
              const isChangelog =
                notification.category === "changelog" ||
                notification.type.startsWith("release_");
              const releaseBadge = RELEASE_BADGES[notification.type];
              const Icon = NOTIFICATION_TYPE_ICONS[notification.type] || Pin;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative flex items-start justify-between gap-2 p-3 cursor-pointer transition-colors hover:bg-muted/50",
                    notification.read ? "opacity-75" : "bg-primary/[0.03]",
                    isChangelog && !notification.read && "border-l-2 border-amber-500 bg-amber-500/[0.04]"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={cn(
                        "mt-0.5 p-1.5 rounded-lg shrink-0",
                        isChangelog
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm leading-tight text-foreground">
                          {notification.title}
                        </span>
                        {releaseBadge && (
                          <Badge
                            variant="outline"
                            className={cn("text-[9px] px-1.5 py-0 h-4 font-normal", releaseBadge.className)}
                          >
                            {releaseBadge.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {notification.actionUrl && (
                          <span className="text-primary hover:underline flex items-center gap-0.5">
                            Acessar <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {notification.projectName && (
                          <span className="text-primary/80 flex items-center gap-1">
                            <Folder className="h-3 w-3 shrink-0" />
                            {notification.projectName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Clear button on hover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Limpar notificação"
                    onClick={(e) => handleClearSingle(e, notification.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
