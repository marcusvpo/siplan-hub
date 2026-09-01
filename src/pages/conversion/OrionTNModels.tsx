import { FileText, Search, Loader2, ChevronRight, Layout, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { usePermissions } from "@/hooks/usePermissions";
import { ModelosEditorWorkspace } from "@/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

import { getMarqueeStyle } from "@/lib/marquee";

// Text area width in sidebar item (px): w-80(320) - px-2.5*2(20) - gap(4) - chevron(12) ≈ 284px
const TEXT_AREA_PX = 284;

export default function OrionTNModels() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, isLoading, updateProject } = useProjectsV2();
  const { hasPermission } = usePermissions();
  const canEditOrionModels = hasPermission("orion_editor", "edit");
  const isMobile = useIsMobile();
  const [projectSearch, setProjectSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window === "undefined" || window.innerWidth >= 768 || !projectId
  );

  useEffect(() => {
    if (isMobile && projectId) setIsSidebarOpen(false);
  }, [isMobile, projectId]);

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
    navigate(`/orion-tn-models/editor/${id}`);
    if (isMobile) setIsSidebarOpen(false);
  };

  const updateStage = async (proj: typeof selectedProject, stageKey: string, updates: any) => {
    if (!proj || !canEditOrionModels) return;
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
      <div className="flex h-[calc(100dvh-3rem)] items-center justify-center md:h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="orion-models-editor" className="relative flex h-[calc(100dvh-3rem)] min-w-0 overflow-hidden bg-neutral-50 md:h-[calc(100vh-4rem)] dark:bg-neutral-950/50">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar lista de projetos"
          className="absolute inset-0 z-30 bg-black/35 backdrop-blur-[1px] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Sidebar de Projetos */}
      <div className={cn(
        "absolute inset-y-0 left-0 z-40 flex w-[calc(100%_-_1rem)] max-w-xs shrink-0 flex-col overflow-hidden border-r bg-white shadow-xl transition-all duration-300 ease-in-out md:relative md:z-auto md:w-80 md:shadow-none dark:bg-neutral-900",
        isSidebarOpen
          ? "translate-x-0 opacity-100 md:w-80"
          : "-translate-x-full pointer-events-none opacity-0 md:w-0 md:translate-x-0 md:border-r-0"
      )}>
        <div className="p-3 border-b space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layout className="h-3.5 w-3.5" />
              Projetos OrionTN
            </h2>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{orionProjects.length}</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setIsSidebarOpen(false)}
                title="Recolher barra lateral"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>
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
                      "flex w-full items-start justify-between gap-1 rounded px-2 py-2.5 text-left transition-all duration-200 md:items-center md:py-1.5",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border border-transparent"
                    )}
                  >
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <span className="block whitespace-normal break-words text-[10.5px] font-semibold leading-snug md:hidden">
                        {p.clientName}
                      </span>
                      <span
                        className="hidden whitespace-nowrap text-[10.5px] font-semibold leading-tight md:inline-block"
                        style={getMarqueeStyle(p.clientName, animate, TEXT_AREA_PX)}
                      >
                        {p.clientName}
                      </span>
                      <p className="text-[8.5px] text-muted-foreground uppercase tracking-wide mt-0.5">
                        {p.systemType}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      "hidden h-3 w-3 shrink-0 transition-all duration-200 md:block",
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
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center border-b bg-white px-2.5 sm:px-4 dark:bg-neutral-900">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 mr-1"
                onClick={() => setIsSidebarOpen(true)}
                title="Expandir barra lateral"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}
            <div className="bg-indigo-100 dark:bg-indigo-950/50 p-1.5 rounded-lg shrink-0">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm md:text-base leading-none text-foreground" title={selectedProject?.clientName || "Modelos Editor"}>
                {selectedProject ? selectedProject.clientName : "Modelos Editor"}
              </h1>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {selectedProject
                  ? `Central de Modelos - ${selectedProject.systemType}`
                  : "Selecione um projeto para gerenciar modelos"}
              </p>
            </div>
          </div>
        </header>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
          {selectedProject ? (
            <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col min-h-0 space-y-3">
              <ModelosEditorWorkspace
                project={selectedProject}
                onUpdate={(u) => updateStage(selectedProject, "modelosEditor", u)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-full border border-dashed border-neutral-200 dark:border-neutral-800 mb-1">
                <Layout className="h-10 w-10 text-neutral-300 dark:text-neutral-700" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Nenhum projeto selecionado</h3>
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
