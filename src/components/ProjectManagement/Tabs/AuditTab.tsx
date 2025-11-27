import { Project } from "@/types/project";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TabProps {
  project: Project;
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
        {project.auditLog.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            Nenhum registro de auditoria encontrado.
          </div>
        )}

        {project.auditLog.map((entry) => (
          <Card key={entry.id} className="text-sm">
            <CardContent className="p-4 flex gap-4">
              <div className="min-w-[150px] text-xs text-muted-foreground">
                {format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{entry.author}</span>
                  <span className="text-muted-foreground">alterou</span>
                  <Badge variant="outline" className="font-mono text-xs">{entry.field}</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2 bg-muted/30 p-2 rounded border">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Anterior</span>
                    <code className="text-red-600 break-all">{JSON.stringify(entry.oldValue)}</code>
                  </div>
                  <div className="border-l pl-4">
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Novo</span>
                    <code className="text-green-600 break-all">{JSON.stringify(entry.newValue)}</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
