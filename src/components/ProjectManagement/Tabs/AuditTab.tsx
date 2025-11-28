import { ProjectV2 } from "@/types/ProjectV2";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TabProps {
  project: ProjectV2;
}

export function AuditTab({ project }: TabProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nos logs..." className="pl-8" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrar por Campo
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrar por Usuário
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {(project.auditLog?.length || 0) === 0 && (
          <div className="text-center text-muted-foreground py-10">
            Nenhum registro de auditoria encontrado.
          </div>
        )}

        {(project.auditLog || []).map((entry) => (
          <Card key={entry.id} className="text-sm">
            <CardContent className="p-4 flex gap-4">
              <div className="min-w-[150px] text-xs text-muted-foreground">
                {format(new Date(entry.changedAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{entry.changedBy}</span>
                  <span className="text-muted-foreground">executou</span>
                  <Badge variant="outline" className="font-mono text-xs">{entry.action}</Badge>
                </div>
                
                <div className="mt-2 bg-muted/30 p-2 rounded border overflow-x-auto">
                    <pre className="text-xs">{JSON.stringify(entry.details, null, 2)}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
