import { FileText, Search, Loader2, ChevronRight, Layout } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ModelosEditorWorkspace } from "@/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import { getMarqueeStyle } from "@/lib/marquee";

// Text area width in sidebar item (px): w-80(320) - px-2.5*2(20) - gap(4) - chevron(12) ≈ 284px
const TEXT_AREA_PX = 284;

export default function OrionTNModels() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, isLoading, updateProject } = useProjectsV2();
  const [projectSearch, setProjectSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const orionProjects = useMemo(() => {
    return projects.filter((p) =>
      p.systemType === "Orion TN" ||
      p.systemType === "Modelos TN" ||
      p.products?.includes("Orion TN") ||
      p.products?.includes("OrionTN")
    );
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return orionProjects
      .filter((p) => p.clientName.toLowerCase().includes(projectSearch.toLowerCase()))
      .sort((a, b) => a.clientName.localeCompare(b.clientName, "pt-BR"));
  }, [orionProjects, projectSearch]);

  const selectedProject = useMemo(() =>
    projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const handleSelectProject = (id: string) => {
    navigate(`/orion-tn-models/${id}`);
  };

  const updateStage = async (proj: typeof selectedProject, stageKey: string, updates: any) => {
    if (!proj) return;
    await updateProject.mutateAsync({
      projectId: proj.id,
      updates: {
        ...proj,
        stages: {
          ...proj.stages,
          [stageKey]: {
            ...(proj.stages[stageKey as keyof typeof proj.stages] || {}),
            ...updates,
          },
        },
      } as any,
    });
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950/50">
      {/* Sidebar de Projetos */}
      <div className="w-80 border-r bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-3 border-b space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layout className="h-3.5 w-3.5" />
              Projetos OrionTN
            </h2>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{orionProjects.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar projeto..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1 space-y-0.5">
            {filteredProjects.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Nenhum projeto encontrado.</p>
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = projectId === p.id;
                const isHovered = hoveredId === p.id;
                const animate = isSelected || isHovered;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProject(p.id)}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded transition-all duration-200 flex items-center justify-between gap-1",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-transparent"
                    )}
                  >
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <span
                        className="inline-block whitespace-nowrap font-semibold text-[10.5px] leading-tight"
                        style={getMarqueeStyle(p.clientName, animate, TEXT_AREA_PX)}
                      >
                        {p.clientName}
                      </span>
                      <p className="text-[8.5px] text-muted-foreground uppercase tracking-wide mt-0.5">
                        {p.systemType}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      "h-3 w-3 shrink-0 transition-all duration-200",
                      animate ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
                    )} />
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 border-b bg-white dark:bg-slate-900 flex items-center px-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 p-1.5 rounded-lg shrink-0">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm md:text-base leading-none text-foreground truncate max-w-[420px]" title={selectedProject?.clientName || "Modelos Editor"}>
                {selectedProject ? selectedProject.clientName : "Modelos Editor"}
              </h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedProject
                  ? `Central de Modelos - ${selectedProject.systemType}`
                  : "Selecione um projeto para gerenciar modelos"}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-3 flex flex-col">
          {selectedProject ? (
            <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col min-h-0 space-y-3">
              <ModelosEditorWorkspace
                project={selectedProject}
                onUpdate={(u) => updateStage(selectedProject, "modelosEditor", u)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-full border border-dashed border-slate-200 dark:border-slate-800 mb-1">
                <Layout className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Nenhum projeto selecionado</h3>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Escolha um projeto na barra lateral para começar a configurar os modelos e visualizar o progresso.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
