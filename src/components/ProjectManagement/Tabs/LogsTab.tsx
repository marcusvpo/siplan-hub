import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History } from "lucide-react";

interface LogsTabProps {
  project: ProjectV2;
}

import { useTimelineEvents } from "@/hooks/useTimelineEvents";
import { Loader2 } from "lucide-react";

export function LogsTab({ project }: LogsTabProps) {
  const { data: timelineEvents, isLoading } = useTimelineEvents(project.id);

  const logs = (timelineEvents || [])
    .map((event: any) => ({
      id: event.id,
      projectId: event.project_id,
      action: event.message,
      changedBy: event.author,
      changedAt: new Date(event.timestamp),
      details: event.metadata || {},
    }))
    .sort(
      (a: any, b: any) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma alteração registrada até o momento.
                </div>
              ) : (
                logs.map((log: any, index: number) => (
                  <div
                    key={log.id || index}
                    className="flex flex-col gap-1 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(log.changedAt),
                          "dd/MM/yyyy 'às' HH:mm",
                          {
                            locale: ptBR,
                          }
                        )}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {log.changedBy}
                      </span>{" "}
                      realizou uma alteração.
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
