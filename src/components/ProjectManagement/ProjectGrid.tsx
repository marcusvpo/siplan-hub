import { useState, useEffect } from "react";
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

import { useFilterStore } from "@/stores/filterStore";

export function ProjectGrid() {
  const { projects, isLoading, updateProject } = useProjectsV2();
  const [selectedProject, setSelectedProject] = useState<ProjectV2 | null>(null);
  
  // Use Zustand store
  const { 
    searchQuery, setSearchQuery,
    status: statusFilter, setStatus: setStatusFilter,
    healthScore: healthFilter, setHealthScore: setHealthFilter,
    savedFilters, saveFilter, loadFilter, deleteFilter, resetFilters
  } = useFilterStore();
  
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const navigate = useNavigate();

  // Removed manual localStorage effects as Zustand handles persistence

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || project.globalStatus === statusFilter;
    const matchesHealth =
      healthFilter === "all" || project.healthScore === healthFilter;

    return matchesSearch && matchesStatus && matchesHealth;
  });

  const handleProjectUpdate = (updatedProject: ProjectV2) => {
    if (selectedProject?.id === updatedProject.id) {
      setSelectedProject(updatedProject);
    }
  };

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

        <div className="flex flex-wrap gap-2">
          <Button 
            variant={healthFilter === 'critical' ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              if (healthFilter === 'critical') {
                setHealthFilter('all');
              } else {
                setHealthFilter('critical');
                setStatusFilter('all');
              }
            }}
            className={cn(
              "h-8 transition-all",
              healthFilter === 'critical' 
                ? "bg-rose-500 hover:bg-rose-600 text-white border-rose-600" 
                : "hover:border-rose-500 hover:text-rose-500"
            )}
          >
            Críticos
          </Button>
          <Button 
            variant={statusFilter === 'blocked' ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              if (statusFilter === 'blocked') {
                setStatusFilter('all');
              } else {
                setStatusFilter('blocked');
                setHealthFilter('all');
              }
            }}
            className={cn(
              "h-8 transition-all",
              statusFilter === 'blocked' 
                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600" 
                : "hover:border-amber-500 hover:text-amber-500"
            )}
          >
            Bloqueados
          </Button>
          <Button 
            variant={statusFilter === 'done' ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              if (statusFilter === 'done') {
                setStatusFilter('all');
              } else {
                setStatusFilter('done');
                setHealthFilter('all');
              }
            }}
            className={cn(
              "h-8 transition-all",
              statusFilter === 'done' 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600" 
                : "hover:border-emerald-500 hover:text-emerald-500"
            )}
          >
            Concluídos
          </Button>
           {(statusFilter !== 'all' || healthFilter !== 'all' || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8">
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Saved Filters */}
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="todo">A Fazer</SelectItem>
              <SelectItem value="in-progress">Em Andamento</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
            </SelectContent>
          </Select>

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
                Atenção
                {healthFilter === "warning" && (
                  <CheckCircle2 className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHealthFilter("critical")}>
                <div className="h-2 w-2 rounded-full bg-rose-500 mr-2" />
                Crítico
                {healthFilter === "critical" && (
                  <CheckCircle2 className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>



      {/* Grid with Virtualization */}
      <div className="flex-1 h-[calc(100vh-220px)] min-h-[400px]">
        <Virtuoso
          data={filteredProjects}
          itemContent={(index, project) => (
            <div className="pb-3 pr-2">
              <ProjectCardV3
                key={project.id}
                project={project}
                onClick={() => setSelectedProject(project)}
                selected={selectedProjectIds.includes(project.id)}
                onSelect={(selected) => toggleSelection(project.id, selected)}
                onAction={(action, project) => {
                  console.log(`Action ${action} on project ${project.id}`);
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
        project={selectedProject}
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        onUpdate={(updatedProject) => {
          updateProject.mutate({
            projectId: updatedProject.id,
            updates: {
              ...updatedProject,
            },
          });

          handleProjectUpdate(updatedProject);
        }}
      />
    </div>
  );
}


