import { ProjectV2, StageStatus } from "@/types/ProjectV2";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PipelineStatusProps {
  project: ProjectV2;
}

export const PipelineStatus = ({ project }: PipelineStatusProps) => {
  const stages = [
    { key: "infra", label: "Infra", status: project.stages.infra.status },
    {
      key: "adherence",
      label: "Aderência",
      status: project.stages.adherence.status,
    },
    {
      key: "environment",
      label: "Ambiente",
      status: project.stages.environment.status,
    },
    {
      key: "conversion",
      label: "Conversão",
      status: project.stages.conversion.status,
    },
    {
      key: "implementation",
      label: "Implantação",
      status: project.stages.implementation.status,
    },
    { key: "post", label: "Pós", status: project.stages.post.status },
  ];

  const getStatusColor = (status: StageStatus) => {
    switch (status) {
      case "done":
        return "bg-success";
      case "in-progress":
        return "bg-warning";
      case "blocked":
        return "bg-critical";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: StageStatus) => {
    switch (status) {
      case "done":
        return "Finalizado";
      case "in-progress":
        return "Em Andamento";
      case "blocked":
        return "Bloqueado";
      default:
        return "Aguardando";
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {stages.map((stage) => (
        <TooltipProvider key={stage.key}>
          <Tooltip>
            <TooltipTrigger>
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all",
                  getStatusColor(stage.status)
                )}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{stage.label}</p>
              <p className="text-xs">{getStatusLabel(stage.status)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};
