import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RecentActivity() {
  const { logs, isLoading } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="animate-spin h-6 w-6" />
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Nenhuma atividade recente.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {logs.slice(0, 5).map((log) => (
        <div key={log.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {log.profile?.full_name?.substring(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">
              {log.profile?.full_name || "Usuário desconhecido"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatAction(log.action)}
            </p>
          </div>
          <div className="ml-auto font-medium">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatAction(action: string) {
  // Simple constants for now, can be improved
  const map: Record<string, string> = {
    USER_CREATED: "Criou um usuário",
    USER_UPDATED: "Atualizou um usuário",
    USER_DELETED: "Removeu um usuário",
    TEAM_CREATED: "Criou um time",
    PROJECT_CREATED: "Criou um projeto",
  };
  return map[action] || action;
}
