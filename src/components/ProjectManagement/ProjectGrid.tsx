import { useState, useMemo } from "react";
import { useProjectsList } from "@/hooks/useProjectsList";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectCardV3 } from "./ProjectCardV3";
import { ProjectModal } from "./ProjectModal";
import { ProjectV2 } from "@/types/ProjectV2";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Virtuoso } from "react-virtuoso";
import { AdvancedFilters } from "./AdvancedFilters";
import { useFilterStore } from "@/stores/filterStore";

export function ProjectGrid() {
  const { projects, isLoading } = useProjectsList();
  const { updateProject, deleteProject } = useProjectsV2();
  const [selectedProject, setSelectedProject] =
    useState<Partial<ProjectV2> | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const navigate = useNavigate();

  const {
    searchQuery,
    viewPreset,
    healthScore,
    currentStage,
    projectLeader,
    systemType,
    sortOrder,
    dateFrom,
    dateTo,
  } = useFilterStore();

  // Extract unique values for filter dropdowns
  const uniqueLeaders = useMemo(() => {
    const leaders = new Set<string>();
    projects.forEach((p) => {
      if (p.projectLeader) leaders.add(p.projectLeader);
    });
    return Array.from(leaders).sort();
  }, [projects]);

  const uniqueSystemTypes = useMemo(() => {
    const types = new Set<string>();
    projects.forEach((p) => {
      if (p.systemType) types.add(p.systemType);
    });
    return Array.from(types).sort();
  }, [projects]);

  // Filter and Sort Logic
  const filteredAndSortedProjects = useMemo(() => {
    let result = projects.filter((project) => {
      // Search filter
      const clientName = project.clientName || "";
      const ticketNumber = project.ticketNumber || "";
      const matchesSearch =
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());

      // View preset (status) filter
      let matchesPreset = true;
      if (viewPreset === "active") {
        matchesPreset =
          project.globalStatus === "todo" ||
          project.globalStatus === "in-progress";
      } else if (viewPreset === "paused") {
        matchesPreset = project.globalStatus === "blocked";
      } else if (viewPreset === "done") {
        matchesPreset =
          project.globalStatus === "done" ||
          project.globalStatus === "archived";
      }

      // Health score filter
      const matchesHealth =
        healthScore === "all" || project.healthScore === healthScore;

      // Current stage filter
      let matchesStage = true;
      if (currentStage !== "all") {
        const stageData =
          project.stages[currentStage as keyof typeof project.stages];
        matchesStage = stageData?.status === "in-progress";
      }

      // Project leader filter
      const matchesLeader =
        !projectLeader || project.projectLeader === projectLeader;

      // System type filter
      const matchesSystemType =
        !systemType || project.systemType === systemType;

      // Date range filter
      let matchesDateRange = true;
      if (dateFrom) {
        const projectDate = new Date(project.createdAt);
        const fromDate = new Date(dateFrom);
        matchesDateRange = projectDate >= fromDate;
      }
      if (dateTo && matchesDateRange) {
        const projectDate = new Date(project.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = projectDate <= toDate;
      }

      return (
        matchesSearch &&
        matchesPreset &&
        matchesHealth &&
        matchesStage &&
        matchesLeader &&
        matchesSystemType &&
        matchesDateRange
      );
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOrder) {
        case "alpha-asc":
          return (a.clientName || "").localeCompare(b.clientName || "");
        case "alpha-desc":
          return (b.clientName || "").localeCompare(a.clientName || "");
        case "uat-desc":
          return (
            new Date(b.lastUpdatedAt).getTime() -
            new Date(a.lastUpdatedAt).getTime()
          );
        case "uat-asc":
          return (
            new Date(a.lastUpdatedAt).getTime() -
            new Date(b.lastUpdatedAt).getTime()
          );
        case "created-desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "created-asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "progress-desc":
          return (b.overallProgress || 0) - (a.overallProgress || 0);
        case "progress-asc":
          return (a.overallProgress || 0) - (b.overallProgress || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [
    projects,
    searchQuery,
    viewPreset,
    healthScore,
    currentStage,
    projectLeader,
    systemType,
    sortOrder,
    dateFrom,
    dateTo,
  ]);

  const toggleSelection = (id: string, selected: boolean) => {
    if (selected) {
      if (selectedProjectIds.length >= 3) return;
      setSelectedProjectIds([...selectedProjectIds, id]);
    } else {
      setSelectedProjectIds(selectedProjectIds.filter((pid) => pid !== id));
    }
  };

  const handleCompare = () => {
    if (selectedProjectIds.length < 2) return;
    navigate(`/compare?ids=${selectedProjectIds.join(",")}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <AdvancedFilters
        leaders={uniqueLeaders}
        systemTypes={uniqueSystemTypes}
        onCompare={handleCompare}
        selectedCount={selectedProjectIds.length}
      />

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredAndSortedProjects.length} projeto
          {filteredAndSortedProjects.length !== 1 ? "s" : ""} encontrado
          {filteredAndSortedProjects.length !== 1 ? "s" : ""}
        </span>
        {selectedProjectIds.length > 0 && (
          <span className="text-primary font-medium">
            {selectedProjectIds.length} selecionado
            {selectedProjectIds.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Grid with Virtualization */}
      {filteredAndSortedProjects.length > 0 ? (
        <div className="flex-1 h-[calc(100vh-320px)] min-h-[400px]">
          <Virtuoso
            data={filteredAndSortedProjects as ProjectV2[]}
            itemContent={(index, project) => (
              <div className="pb-3 pr-2">
                <ProjectCardV3
                  key={project.id}
                  project={project}
                  onClick={() => setSelectedProject(project)}
                  selected={selectedProjectIds.includes(project.id)}
                  onSelect={(selected) => toggleSelection(project.id, selected)}
                  onAction={(action, project) => {
                    if (action === "delete") {
                      if (
                        confirm(
                          `Tem certeza que deseja excluir o projeto "${project.clientName}"?\n\nEsta ação é irreversível e apagará TODOS os dados relacionados a este projeto permanentemente.`
                        )
                      ) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (deleteProject as any).mutate(project.id);
                      }
                    }
                  }}
                />
              </div>
            )}
          />
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Nenhum projeto encontrado
          </h3>
          <p className="text-sm text-muted-foreground">
            Tente ajustar os filtros ou realizar uma nova busca
          </p>
        </div>
      )}

      {/* Modal */}
      <ProjectModal
        project={selectedProject as ProjectV2}
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        onUpdate={(updatedProject) => {
          updateProject.mutate({
            projectId: updatedProject.id,
            updates: {
              ...updatedProject,
            },
          });
        }}
      />
    </div>
  );
}
