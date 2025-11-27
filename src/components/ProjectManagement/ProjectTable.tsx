import { useProjectStore } from "@/stores/projectStore";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Loader2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const ProjectTable = () => {
  const { setSelectedProject } = useProjectStore();
  const { projects, isLoading } = useProjectsV2();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-6 px-4 py-2 text-sm font-medium text-muted-foreground">
        <div className="w-4">
          <Checkbox />
        </div>
        <div>Projeto / Cliente</div>
        <div>Status Global</div>
        <div>Saúde</div>
        <div className="text-center">Follow-up</div>
        <div className="text-right">Atualização</div>
        <div className="w-24"></div>
      </div>

      {projects.map((project) => (
        <Card
          key={project.id}
          className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => setSelectedProject(project)}
        >
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-6 items-center">
            <div className="w-4" onClick={(e) => e.stopPropagation()}>
              <Checkbox />
            </div>
            
            <div>
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                {project.clientName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{project.systemType}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground font-mono">#{project.ticketNumber}</span>
              </div>
            </div>

            <div>
              <Badge variant={
                project.globalStatus === "done" ? "default" :
                project.globalStatus === "blocked" ? "destructive" :
                project.globalStatus === "in-progress" ? "secondary" : "outline"
              }>
                {project.globalStatus}
              </Badge>
            </div>

            <div>
              <Badge variant={
                project.healthScore === "ok" ? "outline" :
                project.healthScore === "warning" ? "secondary" : "destructive"
              }>
                {project.healthScore}
              </Badge>
            </div>

            <div className="text-center min-w-[100px]">
              {project.nextFollowUpDate ? (
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isPast(new Date(project.nextFollowUpDate)) && "text-destructive"
                    )}
                  >
                    {format(new Date(project.nextFollowUpDate), "dd/MM", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isPast(new Date(project.nextFollowUpDate)) ? "Vencido" : "Próximo"}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            <div className="text-right min-w-[100px]">
              <div className="text-xs text-muted-foreground">
                {format(new Date(project.lastUpdatedAt), "dd/MM HH:mm", { locale: ptBR })}
              </div>
              <div className="text-xs text-muted-foreground">
                por {project.lastUpdatedBy}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button size="sm" variant="ghost">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
