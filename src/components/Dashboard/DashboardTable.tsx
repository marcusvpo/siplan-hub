import { useProjectStore } from "@/stores/projectStore";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthBadge } from "./HealthBadge";
import { PipelineStatus } from "./PipelineStatus";
import { Eye, Loader2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getRelativeTime, getDaysSinceUpdate } from "@/utils/calculations";
import { cn } from "@/lib/utils";

interface DashboardTableProps {
  onProjectClick?: (project: ProjectV2) => void;
}

export const DashboardTable = ({ onProjectClick }: DashboardTableProps) => {
  const { setSelectedProject } = useProjectStore();
  const { projects, isLoading } = useProjectsV2();

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
    <div className="space-y-2">
      {sortedProjects.map((project) => (
        <Card
          key={project.id}
          className="p-3 hover:bg-muted/30 transition-all cursor-pointer border-muted/20 shadow-none hover:shadow-sm"
          onClick={() => {
            setSelectedProject(project);
            onProjectClick?.(project);
          }}
        >
          <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr] gap-4 items-center">
            <div className="min-w-0">
              <h3 className="font-bold text-sm tracking-tight truncate leading-tight">
                {project.clientName}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-wider">
                  {project.systemType}
                </span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-[10px] font-mono text-muted-foreground/80">
                  #{project.ticketNumber}
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <PipelineStatus project={project} />
            </div>

            <div className="flex justify-center">
              <HealthBadge
                healthScore={project.healthScore!}
                daysSince={getDaysSinceUpdate(project)}
              />
            </div>

            <div className="text-center">
              {project.nextFollowUpDate ? (
                <div className="inline-flex flex-col items-center">
                  <span className={cn(
                    "text-[11px] font-black tabular-nums",
                    isPast(project.nextFollowUpDate) ? "text-destructive" : "text-foreground"
                  )}>
                    {format(new Date(project.nextFollowUpDate), "dd MMM", { locale: ptBR })}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground/50 leading-none mt-0.5">
                    Follow-up
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground/30">—</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold text-muted-foreground/70 leading-tight">
                  {getRelativeTime(new Date(project.lastUpdatedAt))}
                </div>
                <div className="text-[9px] text-muted-foreground/50">
                  por {project.lastUpdatedBy.split(' ')[0]}
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProject(project);
                  onProjectClick?.(project);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
