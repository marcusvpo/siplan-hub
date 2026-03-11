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
    <div className="space-y-2.5">
      {logs.slice(0, 8).map((log) => (
        <div key={log.id} className="flex items-center">
          <Avatar className="h-7 w-7 text-[10px]">
            <AvatarFallback>
              {log.profile?.full_name?.substring(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 space-y-0.5">
            <p className="text-[13px] font-medium leading-tight">
              {log.profile?.full_name || "Usuário desconhecido"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatAction(log.action)}
            </p>
          </div>
          <div className="ml-auto font-medium">
            <span className="text-[10px] text-muted-foreground">
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
