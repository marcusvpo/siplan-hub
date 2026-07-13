import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectV2 } from "@/types/ProjectV2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthBadge } from "./HealthBadge";
import { PipelineStatus } from "./PipelineStatus";
import { ChartEmptyState } from "./ChartEmptyState";
import { Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
  const { projects, isLoading } = useProjectsV2();
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
    <div className="space-y-4">
      <div className="space-y-2">
        {paginatedProjects.map((project) => (
          <Card
            key={project.id}
            className="p-3 hover:bg-muted/30 transition-all cursor-pointer border-muted/20 shadow-none hover:shadow-sm"
            onClick={() => {
              setSelectedProject(project);
              onProjectClick?.(project);
            }}
          >
            <div className="flex flex-col space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1.5fr_1.2fr_0.8fr_1fr] gap-2 sm:gap-4 items-stretch sm:items-center">
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

              <div className="flex items-center justify-between sm:justify-center border-t border-border/40 pt-2 sm:border-0 sm:pt-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase sm:hidden">Progresso</span>
                <PipelineStatus project={project} />
              </div>

              <div className="flex items-center justify-between sm:justify-center border-t border-border/40 pt-2 sm:border-0 sm:pt-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase sm:hidden">Saúde</span>
                <HealthBadge
                  healthScore={project.healthScore!}
                  daysSince={getDaysSinceUpdate(project)}
                />
              </div>



              <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-border/40 pt-2 sm:border-0 sm:pt-0">
                <div className="text-left sm:text-right">
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
        <Pagination className="justify-center mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={cn(
                  "cursor-pointer hover:bg-muted select-none",
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

            <PaginationItem>
              <PaginationNext 
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={cn(
                  "cursor-pointer hover:bg-muted select-none",
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
