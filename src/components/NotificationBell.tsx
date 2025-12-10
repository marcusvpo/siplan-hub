import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  projectId?: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Initial fetch (mock logic or real if we had a notifications table)
    // For now, we start empty and listen to realtime events.
    
    const channel = supabase
      .channel("public:projects")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        (payload) => {
          console.log("Realtime event:", payload);
          let title = "Atualização de Projeto";
          let description = "Um projeto foi atualizado.";
          const projectId = (payload.new as { id: string, client_name: string }).id;
          const projectName = (payload.new as { id: string, client_name: string }).client_name;

          if (payload.eventType === "INSERT") {
             title = "Novo Projeto";
             description = `Projeto ${projectName} foi criado.`;
          } else if (payload.eventType === "UPDATE") {
             const newData = payload.new as { global_status: string };
             const oldData = payload.old as { global_status: string };
             title = `Atualização: ${projectName}`;
             
             if (newData.global_status !== oldData.global_status) {
                 description = `Status alterado para ${newData.global_status}`;
             }
          }

          const newNotification: Notification = {
            id: crypto.randomUUID(),
            title,
            description,
            timestamp: new Date(),
            read: false,
            projectId
          };

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast(title, {
            description,
            action: {
                label: "Ver",
                onClick: () => navigate(`/projects?id=${projectId}`) // Or handle selection
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const markAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <DropdownMenu onOpenChange={(open) => {
        if (open) markAsRead();
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white rounded-full text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma notificação recente.
            </div>
        ) : (
            <div className="max-h-[300px] overflow-y-auto">
                {notifications.map((notification) => (
                    <DropdownMenuItem 
                        key={notification.id} 
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                        onClick={() => {
                            if (notification.projectId) {
                                // Logic to open project
                                // Since we are using query params or state in Grid, dealing with this is tricky without global state.
                                // Just navigate to projects for now.
                                navigate('/projects'); 
                            }
                        }}
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="font-semibold text-sm">{notification.title}</span>
                            <span className="text-[10px] text-muted-foreground">
                                {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.description}
                        </p>
                    </DropdownMenuItem>
                ))}
            </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
