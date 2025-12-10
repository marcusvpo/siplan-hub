import { useState } from "react";
import { useProjectsList } from "@/hooks/useProjectsList";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectCardV3 } from "./ProjectCardV3";
import { ProjectModal } from "./ProjectModal";
import { ProjectV2 } from "@/types/ProjectV2";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, SlidersHorizontal, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Virtuoso } from 'react-virtuoso';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useFilterStore } from "@/stores/filterStore";

export function ProjectGrid() {
  const { projects, isLoading } = useProjectsList();
  const { updateProject, deleteProject } = useProjectsV2(); // Use V2 for mutations
  const [selectedProject, setSelectedProject] = useState<Partial<ProjectV2> | null>(null);
  
  // Use Zustand store
  const { 
    searchQuery, setSearchQuery,
    status: statusFilter, setStatus: setStatusFilter,
    healthScore: healthFilter, setHealthScore: setHealthFilter,
    savedFilters, saveFilter, loadFilter, deleteFilter, resetFilters
  } = useFilterStore();
  
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");

  // Removed manual localStorage effects as Zustand handles persistence

  const filteredProjects = projects.filter((project) => {
    // Safety check for search
    const clientName = project.clientName || '';
    const ticketNumber = project.ticketNumber || '';
    
    const matchesSearch =
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = false;
    if (activeTab === "active") {
        matchesStatus = project.globalStatus === "todo" || project.globalStatus === "in-progress";
    } else if (activeTab === "paused") {
        matchesStatus = project.globalStatus === "blocked";
    } else if (activeTab === "done") {
        matchesStatus = project.globalStatus === "done" || project.globalStatus === "archived";
    }

    const matchesHealth =
      healthFilter === "all" || project.healthScore === healthFilter;

    return matchesSearch && matchesStatus && matchesHealth;
  });

  const toggleSelection = (id: string, selected: boolean) => {
    if (selected) {
      if (selectedProjectIds.length >= 3) {
        return;
      }
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
      {/* Filters & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, ticket..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="active">Em andamento</TabsTrigger>
                    <TabsTrigger value="paused">Pausado</TabsTrigger>
                    <TabsTrigger value="done">Finalizado</TabsTrigger>
                </TabsList>
            </Tabs>

          <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" title="Filtros Salvos">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => {
                    const name = prompt("Nome do filtro:");
                    if (name) saveFilter(name);
                  }}>
                    <div className="flex items-center gap-2">
                        <span className="font-bold">+ Salvar Filtro Atual</span>
                    </div>
                  </DropdownMenuItem>
                  {savedFilters.length > 0 && <div className="h-px bg-border my-1" />}
                  {savedFilters.map((filter) => (
                    <DropdownMenuItem key={filter.id} className="justify-between group">
                      <span onClick={() => loadFilter(filter.id)} className="cursor-pointer flex-1">{filter.name}</span>
                      <span 
                        onClick={(e) => { e.stopPropagation(); deleteFilter(filter.id); }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-sm"
                      >
                        ×
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

            {selectedProjectIds.length > 0 && (
                <Button 
                variant="default" 
                onClick={handleCompare}
                disabled={selectedProjectIds.length < 2}
                >
                Comparar ({selectedProjectIds.length})
                </Button>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Mais Filtros
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setHealthFilter("all")}>
                    <CheckCircle2
                    className={cn(
                        "mr-2 h-4 w-4",
                        healthFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                    />
                    Todos os Health Scores
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHealthFilter("ok")}>
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                    Saúde OK
                    {healthFilter === "ok" && (
                    <CheckCircle2 className="ml-auto h-4 w-4" />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHealthFilter("warning")}>
                    <div className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                    Atenção (7+ dias)
                    {healthFilter === "warning" && (
                    <CheckCircle2 className="ml-auto h-4 w-4" />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHealthFilter("critical")}>
                    <div className="h-2 w-2 rounded-full bg-rose-500 mr-2" />
                    Crítico (15+ dias)
                    {healthFilter === "critical" && (
                    <CheckCircle2 className="ml-auto h-4 w-4" />
                    )}
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>



      {/* Grid with Virtualization */}
      <div className="flex-1 h-[calc(100vh-220px)] min-h-[400px]">
        <Virtuoso
          data={projects as ProjectV2[]} // Cast partial to ProjectV2 for now
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
                    if (confirm(`Tem certeza que deseja excluir o projeto "${project.clientName}"?\n\nEsta ação é irreversível e apagará TODOS os dados relacionados a este projeto permanentemente.`)) {
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

      {filteredProjects.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          Nenhum projeto encontrado com os filtros atuais.
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
