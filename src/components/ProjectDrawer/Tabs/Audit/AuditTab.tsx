import { ProjectV2, AuditEntry } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { History } from "lucide-react";

interface AuditTabProps {
  project: ProjectV2;
}

export const AuditTab = ({ project }: AuditTabProps) => {
  // Mock audit logs if not present (since we just added the type)
  const auditLogs: AuditEntry[] = project.auditLog || [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <History className="h-5 w-5" />
          Logs de Auditoria
        </h3>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="divide-y">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum registro de auditoria encontrado.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.changedAt), "dd/MM/yyyy HH:mm:ss")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        por <span className="text-foreground">{log.changedBy}</span>
                      </span>
                      {log.ipAddress && (
                        <span className="text-xs text-muted-foreground font-mono">
                          IP: {log.ipAddress}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <div className="mt-2 text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
