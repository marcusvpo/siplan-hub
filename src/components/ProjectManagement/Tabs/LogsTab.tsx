import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LogsTabProps {
  project: ProjectV2;
}

import { useTimelineEvents } from "@/hooks/useTimelineEvents";
import { Loader2 } from "lucide-react";

export function LogsTab({ project }: LogsTabProps) {
  const { data: timelineEvents, isLoading } = useTimelineEvents(project.id);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const logsPerPage = 5;

  const logs = (timelineEvents || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((event: any) => ({
      id: event.id,
      projectId: event.project_id,
      action: event.message,
      changedBy: event.author,
      changedAt: new Date(event.timestamp),
      details: event.metadata || {},
    }))
    .sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.changedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, startIndex + logsPerPage);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-4 border-b flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold shrink-0">
            <History className="h-4 w-4" />
            Histórico de Alterações
          </CardTitle>
          <div className="relative max-w-xs w-full flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filtrar logs..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-7 text-xs border border-slate-200 focus:border-slate-400"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {filteredLogs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  Nenhuma alteração registrada até o momento.
                </div>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                currentLogs.map((log: any, index: number) => (
                  <div
                    key={log.id || index}
                    className="flex flex-col gap-0.5 py-2 px-4 border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground/90">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(
                          new Date(log.changedAt),
                          "dd/MM/yyyy 'às' HH:mm",
                          {
                            locale: ptBR,
                          }
                        )}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {log.changedBy}
                      </span>{" "}
                      realizou uma alteração.
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-2 px-4 bg-slate-50/50 dark:bg-slate-950/20 text-xs shrink-0">
              <span className="text-muted-foreground text-[11px]">
                Página {currentPage} de {totalPages} ({filteredLogs.length} logs)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-7 text-[10px] px-2.5 font-bold"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-7 text-[10px] px-2.5 font-bold"
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
