import { Bell, CheckCheck, Inbox, User, RefreshCw, AlertTriangle, MessageSquare, CheckCircle2, PartyPopper, Megaphone, Folder, Pin } from "lucide-react";
import { ComponentType } from "react";
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
import { toast } from "sonner";
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
};

export function NotificationBell() {
  const { user, team } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications({
      userId: user?.id,
      team: team as TeamArea | undefined,
      limit: 30,
    });
  const navigate = useNavigate();

  const handleNotificationClick = (notification: (typeof notifications)[0]) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.projectId) {
      navigate(`/projects?id=${notification.projectId}`);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  };

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
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Notificações</DropdownMenuLabel>
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
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação.
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer border-l-2",
                  notification.read
                    ? "border-transparent opacity-70"
                    : "border-primary bg-primary/5",
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-muted-foreground shrink-0">
                      {(() => {
                        const Icon = NOTIFICATION_TYPE_ICONS[notification.type] || Pin;
                        return <Icon className="h-4 w-4" />;
                      })()}
                    </span>
                    <span className="font-semibold text-sm">
                      {notification.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(notification.createdAt, {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 pl-7">
                  {notification.message}
                </p>
                {notification.projectName && (
                  <span className="text-[10px] text-primary/80 pl-7 flex items-center gap-1">
                    <Folder className="h-3 w-3 shrink-0" />
                    {notification.projectName}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
