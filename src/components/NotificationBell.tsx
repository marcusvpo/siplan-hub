import { useId, useState } from "react";
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
  ShieldAlert,
  CalendarClock,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatNotificationMessage } from "@/lib/format-notification";
import type { NotificationPriority, NotificationStage, TeamArea } from "@/types/conversion";

const NOTIFICATION_TYPE_ICONS: Record<string, LucideIcon> = {
  new_demand: Inbox,
  assignment: User,
  status_change: RefreshCw,
  issue_reported: AlertTriangle,
  client_response: MessageSquare,
  conversion_complete: CheckCircle2,
  homologation_approved: PartyPopper,
  homologation_issues: ShieldAlert,
  mention: Megaphone,
  task_completed: CheckCircle2,
  schedule_changed: CalendarClock,
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

const STAGE_LABELS: Record<NotificationStage, string> = {
  infra: "1. Infra",
  adherence: "2. Aderência",
  conversion: "3. Conversão",
  environment: "4. Ambiente",
  modelos_editor: "5. Modelos",
  implementation: "6. Implantação",
  post: "7. Pós",
  general: "Geral",
  sla_alert: "Alerta SLA",
};

const PRIORITY_BADGES: Record<NotificationPriority, { label: string; className: string } | null> = {
  urgent: { label: "Urgente", className: "bg-red-500/15 text-red-500 border-red-500/30" },
  high: { label: "Alta", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  normal: null,
  low: null,
};

export function NotificationBell() {
  const { user, role, team } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    operationalUnreadCount, 
    changelogUnreadCount, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    refetch 
  } = useNotifications({
    userId: user?.id,
    team: team as TeamArea | undefined,
    limit: 50,
    showToasts: true,
  });

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "operational" | "changelog">("all");
  const headingId = useId();

  const handleNotificationClick = (notification: (typeof notifications)[0]) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.projectId) {
      navigate(`/projects?id=${notification.projectId}`);
    }
  };

  const canMarkAllAsRead = !loading && !error && unreadCount > 0;

  const handleMarkAllAsRead = () => {
    if (!canMarkAllAsRead) return;
    markAllAsRead();
  };

  const handleOpenChange = (open: boolean) => {
    if (open) handleMarkAllAsRead();
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

  const operationalCount = notifications.filter(
    (n) => n.category !== "changelog" && !n.type.startsWith("release_")
  ).length;

  const changelogCount = notifications.filter(
    (n) => n.category === "changelog" || n.type.startsWith("release_")
  ).length;

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11 sm:h-11 sm:w-11" aria-label="Abrir notificações">
          <Bell className="h-5 w-5" />
          {/* Badge numérico alerta exclusivamente atividades operacionais pendentes */}
          {operationalUnreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white rounded-full text-[10px]">
              {operationalUnreadCount > 99 ? "99+" : operationalUnreadCount}
            </Badge>
          )}
          {/* Bolinha discreta para novidades se não houver alerta operacional urgente */}
          {operationalUnreadCount === 0 && changelogUnreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={8}
        aria-labelledby={headingId}
        className="flex w-[430px] min-w-0 flex-col p-0 shadow-2xl border-border"
        style={{
          maxWidth: "calc(100vw - 16px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))",
          maxHeight: "min(600px, var(--radix-dropdown-menu-content-available-height), calc(100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 px-3 pt-2 pb-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <DropdownMenuLabel id={headingId} className="p-0 font-bold text-base">Notificações</DropdownMenuLabel>
            {operationalUnreadCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20">
                {operationalUnreadCount} pendente{operationalUnreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <DropdownMenuItem asChild disabled={!canMarkAllAsRead} onSelect={(event) => {
              event.preventDefault();
              handleMarkAllAsRead();
            }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canMarkAllAsRead}
                className="h-11 sm:h-11 min-h-[44px] min-w-[44px] px-3 text-xs text-muted-foreground hover:text-foreground touch-manipulation"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar lidas
              </Button>
            </DropdownMenuItem>
          )}
        </div>

        {/* Três Abas Limpas: Todas vs Atividades vs Novidades */}
        <div className="grid shrink-0 grid-cols-3 gap-1 px-2 pb-2 border-b border-border/60">
          <DropdownMenuItem asChild onSelect={(event) => { event.preventDefault(); setActiveTab("all"); }}>
            <Button
              size="sm"
              variant={activeTab === "all" ? "secondary" : "ghost"}
              className={cn(
                "h-11 sm:h-11 min-h-[44px] min-w-[44px] text-xs px-2 rounded-md font-medium touch-manipulation",
                activeTab === "all" && "font-semibold bg-muted"
              )}
              aria-pressed={activeTab === "all"}
            >
              Todas ({notifications.length})
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild onSelect={(event) => { event.preventDefault(); setActiveTab("operational"); }}>
            <Button
              size="sm"
              variant={activeTab === "operational" ? "secondary" : "ghost"}
              className={cn(
                "h-11 sm:h-11 min-h-[44px] min-w-[44px] text-xs px-2 rounded-md font-medium touch-manipulation",
                activeTab === "operational" && "font-semibold bg-muted"
              )}
              aria-pressed={activeTab === "operational"}
            >
              Atividades ({operationalCount})
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild onSelect={(event) => { event.preventDefault(); setActiveTab("changelog"); }}>
            <Button
              size="sm"
              variant={activeTab === "changelog" ? "secondary" : "ghost"}
              className={cn(
                "h-11 sm:h-11 min-h-[44px] min-w-[44px] text-xs px-2 rounded-md gap-1.5 font-medium touch-manipulation",
                activeTab === "changelog" && "font-semibold bg-muted"
              )}
              aria-pressed={activeTab === "changelog"}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Novidades ({changelogCount})
              {changelogUnreadCount > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              )}
            </Button>
          </DropdownMenuItem>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-busy={loading}>
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground" role="status" aria-label="Carregando notificações">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
            </div>
          ) : error ? (
            <div className="space-y-3 p-4 text-center" role="alert">
              <p className="text-sm text-muted-foreground">Não foi possível carregar as notificações.</p>
              <DropdownMenuItem asChild onSelect={(event) => { event.preventDefault(); void refetch(); }}>
                <Button variant="outline" className="h-11 sm:h-11 min-h-[44px] min-w-[44px]">Tentar novamente</Button>
              </DropdownMenuItem>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {activeTab === "changelog"
                  ? "Nenhuma novidade recente."
                  : activeTab === "operational"
                    ? "Nenhuma atividade pendente no momento."
                    : "Nenhuma notificação."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredNotifications.map((notification) => {
                const isChangelog =
                  notification.category === "changelog" ||
                  notification.type.startsWith("release_");
                const releaseBadge = RELEASE_BADGES[notification.type];
                const priorityBadge = notification.priority ? PRIORITY_BADGES[notification.priority] : null;
                const stageLabel = notification.stage ? STAGE_LABELS[notification.stage] : null;
                const Icon = NOTIFICATION_TYPE_ICONS[notification.type] || Pin;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative flex items-start gap-1 p-2.5 transition-colors hover:bg-muted/50 sm:gap-2 sm:p-3",
                      notification.read ? "opacity-75" : "bg-primary/[0.03]",
                      notification.priority === 'urgent' && !notification.read && "border-l-2 border-red-500 bg-red-500/[0.04]",
                      isChangelog && !notification.read && "border-l-2 border-purple-500 bg-purple-500/[0.04]"
                    )}
                  >
                    <DropdownMenuItem asChild className="min-h-11 min-w-0 flex-1 items-start gap-2.5 p-0 text-left" onSelect={() => handleNotificationClick(notification)}>
                      <button type="button" aria-label={`Abrir notificação: ${notification.title}`}>
                        <span
                          className={cn(
                            "mt-0.5 p-1.5 rounded-lg shrink-0",
                            isChangelog
                              ? "bg-purple-500/10 text-purple-400"
                              : notification.priority === 'urgent'
                                ? "bg-red-500/10 text-red-500"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className="min-w-0 font-semibold text-sm leading-tight text-foreground [overflow-wrap:anywhere]">
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
                            {priorityBadge && (
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] px-1.5 py-0 h-4 font-normal", priorityBadge.className)}
                              >
                                {priorityBadge.label}
                              </Badge>
                            )}
                            {stageLabel && stageLabel !== "Geral" && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                              >
                                {stageLabel}
                              </Badge>
                            )}
                          </span>
                          <span className="block text-xs text-muted-foreground mt-1 leading-relaxed [overflow-wrap:anywhere]">
                            {formatNotificationMessage(notification.message)}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-muted-foreground">
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
                              <span className="min-w-0 text-primary/80 flex items-center gap-1 [overflow-wrap:anywhere]">
                                <Folder className="h-3 w-3 shrink-0" />
                                <span className="min-w-0">{notification.projectName}</span>
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild onSelect={(event) => {
                      event.preventDefault();
                      deleteNotification(notification.id);
                    }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 sm:h-11 sm:w-11 min-h-[44px] min-w-[44px] shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                        title="Limpar notificação"
                        aria-label={`Limpar notificação: ${notification.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuItem>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé Exclusivo para Administradores: Acesso Direto à Central de Notificações */}
        {role === "admin" && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-2 bg-muted/20">
              <DropdownMenuItem asChild onSelect={() => navigate("/admin/notifications")}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs h-11 sm:h-11 min-h-[44px] min-w-[44px] px-3 text-primary hover:text-primary font-medium touch-manipulation"
                >
                  <span>Central de Gestão de Notificações</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
