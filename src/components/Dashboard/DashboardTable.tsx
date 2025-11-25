import { useProjectStore } from "@/stores/projectStore";
import { useProjects } from "@/hooks/useProjects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthBadge } from "./HealthBadge";
import { PipelineStatus } from "./PipelineStatus";
import { Eye, Loader2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getRelativeTime } from "@/utils/calculations";
import { cn } from "@/lib/utils";

export const DashboardTable = () => {
  const { setSelectedProject } = useProjectStore();
  const { projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.healthScore === "critical" && b.healthScore !== "critical") return -1;
    if (b.healthScore === "critical" && a.healthScore !== "critical") return 1;
    if (a.healthScore === "warning" && b.healthScore === "ok") return -1;
    if (b.healthScore === "warning" && a.healthScore === "ok") return 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      {sortedProjects.map((project) => (
        <Card
          key={project.id}
          className="p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setSelectedProject(project)}
        >
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-6 items-center">
            <div>
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-semibold text-base">{project.clientName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{project.systemType}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground font-mono">#{project.ticketNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PipelineStatus project={project} />
            </div>

            <div>
              <HealthBadge
                healthScore={project.healthScore!}
                daysSince={project.daysSinceUpdate!}
              />
            </div>

            <div className="text-center min-w-[100px]">
              {project.nextFollowUpDate ? (
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isPast(project.nextFollowUpDate) && "text-critical"
                    )}
                  >
                    {format(project.nextFollowUpDate, "dd/MM", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isPast(project.nextFollowUpDate) ? "Vencido" : "Próximo"}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right min-w-[100px]">
                <div className="text-xs text-muted-foreground">
                  {getRelativeTime(project.updatedAt)}
                </div>
                <div className="text-xs text-muted-foreground">
                  por {project.lastUpdateBy}
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Detalhes
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
