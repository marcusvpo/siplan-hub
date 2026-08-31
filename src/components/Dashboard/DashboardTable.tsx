import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectV2 } from "@/types/ProjectV2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthBadge } from "./HealthBadge";
import { PipelineStatus } from "./PipelineStatus";
import { ChartEmptyState } from "./ChartEmptyState";
import { Eye, Loader2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getRelativeTime, getDaysSinceUpdate } from "@/utils/calculations";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DashboardTableProps {
  onProjectClick?: (project: ProjectV2) => void;
}

const PROJECTS_PER_PAGE = 6;

export const DashboardTable = ({ onProjectClick }: DashboardTableProps) => {
  const { setSelectedProject } = useProjectStore();
  const { projects: rawProjects, isLoading } = useProjectsV2();
  const projects = rawProjects.filter((p) => p.systemType !== "Modelos TN");
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <ChartEmptyState
        message="Nenhum projeto cadastrado"
        hint="Os projetos aparecem aqui assim que forem criados."
      />
    );
  }

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.healthScore === "critical" && b.healthScore !== "critical") return -1;
    if (b.healthScore === "critical" && a.healthScore !== "critical") return 1;
    if (a.healthScore === "warning" && b.healthScore === "ok") return -1;
    if (b.healthScore === "warning" && a.healthScore === "ok") return 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedProjects.length / PROJECTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
  const paginatedProjects = sortedProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 space-y-2">
        {paginatedProjects.map((project) => (
          <Card
            key={project.id}
            className="min-w-0 overflow-hidden border-muted/20 p-3 shadow-none transition-all hover:bg-muted/30 hover:shadow-sm cursor-pointer"
            onClick={() => {
              setSelectedProject(project);
              onProjectClick?.(project);
            }}
          >
            <div className="flex min-w-0 flex-col items-stretch gap-2 sm:grid sm:grid-cols-[1.5fr_1.2fr_0.8fr_1fr] sm:items-center sm:gap-4 sm:space-y-0">
              <div className="min-w-0">
                <h3 className="whitespace-normal break-words text-sm font-bold leading-5 tracking-tight">
                  {project.clientName}
                </h3>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="break-words text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                    {project.systemType}
                  </span>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="shrink-0 text-[10px] font-mono text-muted-foreground/80">
                    #{project.ticketNumber}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-between border-t border-border/40 pt-2 sm:justify-center sm:border-0 sm:pt-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase sm:hidden">Progresso</span>
                <PipelineStatus project={project} />
              </div>

              <div className="flex min-w-0 items-center justify-between border-t border-border/40 pt-2 sm:justify-center sm:border-0 sm:pt-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase sm:hidden">Saúde</span>
                <HealthBadge
                  healthScore={project.healthScore!}
                  daysSince={getDaysSinceUpdate(project)}
                />
              </div>



              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border/40 pt-2 sm:justify-end sm:border-0 sm:pt-0">
                <div className="text-left sm:text-right">
                  <div className="text-[10px] font-bold text-muted-foreground/70 leading-tight">
                    {getRelativeTime(new Date(project.lastUpdatedAt))}
                  </div>
                  <div className="text-[9px] text-muted-foreground/50">
                    por {project.lastUpdatedBy.split(' ')[0]}
                  </div>
                </div>
                <Button 
                  aria-label={`Ver detalhes de ${project.clientName}`}
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary shrink-0"
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

      {totalPages > 1 && (
        <Pagination className="mt-4 min-w-0 justify-center overflow-hidden">
          <PaginationContent className="max-w-full justify-center">
            <PaginationItem>
              <PaginationPrevious 
                aria-label="Página anterior"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={cn(
                  "h-9 w-9 cursor-pointer select-none px-0 hover:bg-muted sm:w-auto sm:px-2.5 [&>span]:hidden sm:[&>span]:inline",
                  currentPage === 1 && "pointer-events-none opacity-50"
                )}
              >
                Anterior
              </PaginationPrevious>
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page} className="hidden sm:inline-block">
                <PaginationLink
                  onClick={() => handlePageChange(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem className="sm:hidden">
              <span className="flex h-9 min-w-16 items-center justify-center px-2 text-xs font-semibold text-muted-foreground">
                {currentPage} de {totalPages}
              </span>
            </PaginationItem>

            <PaginationItem>
              <PaginationNext 
                aria-label="Próxima página"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={cn(
                  "h-9 w-9 cursor-pointer select-none px-0 hover:bg-muted sm:w-auto sm:px-2.5 [&>span]:hidden sm:[&>span]:inline",
                  currentPage === totalPages && "pointer-events-none opacity-50"
                )}
              >
                Próximo
              </PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
