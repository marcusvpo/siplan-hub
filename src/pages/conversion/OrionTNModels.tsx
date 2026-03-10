import { FileText, Search, Loader2, ChevronRight, Layout } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ModelosEditorWorkspace } from "@/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Text area width in sidebar item (px): w-80(320) - px-2.5*2(20) - gap(4) - chevron(12) ≈ 284px
// At font-size 11px bold, ~6.2px per char → threshold ≈ 45 chars
const TEXT_AREA_PX = 284;
const CHAR_WIDTH_PX = 6.2;

function getMarqueeStyle(text: string, active: boolean): React.CSSProperties {
  if (!active) return {};
  const estimatedWidth = text.length * CHAR_WIDTH_PX;
  const overflow = estimatedWidth - TEXT_AREA_PX;
  if (overflow <= 4) return {};
  const dist = Math.round(overflow + 4);
  const dur = Math.max(2.5, dist / 30);
  return {
    "--scroll-dist": `-${dist}px`,
    "--scroll-dur": `${dur}s`,
    animation: `scroll-text ${dur}s ease-in-out infinite`,
  } as React.CSSProperties;
}

export default function OrionTNModels() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, isLoading, updateProject } = useProjectsV2();
  const [projectSearch, setProjectSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const orionProjects = useMemo(() => {
    return projects.filter((p) =>
      p.systemType === "Orion TN" ||
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
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Projetos OrionTN
            </h2>
            <Badge variant="secondary" className="text-[10px]">{orionProjects.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projeto..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Nenhum projeto encontrado.</p>
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
                      "w-full text-left px-2.5 py-2 rounded-md transition-all duration-200 flex items-center justify-between gap-1",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-transparent"
                    )}
                  >
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <span
                        className="inline-block whitespace-nowrap font-semibold text-[11px] leading-tight"
                        style={getMarqueeStyle(p.clientName, animate)}
                      >
                        {p.clientName}
                      </span>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">
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
        <header className="h-16 border-b bg-white dark:bg-slate-900 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">
                {selectedProject ? selectedProject.clientName : "Modelos Editor"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedProject
                  ? `Central de Modelos - ${selectedProject.systemType}`
                  : "Selecione um projeto para gerenciar modelos"}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {selectedProject ? (
            <div className="max-w-6xl mx-auto space-y-6">
              <ModelosEditorWorkspace
                project={selectedProject}
                onUpdate={(u) => updateStage(selectedProject, "modelosEditor", u)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-full border border-dashed border-slate-200 dark:border-slate-800 mb-2">
                <Layout className="h-12 w-12 text-slate-300 dark:text-slate-700" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nenhum projeto selecionado</h3>
                <p className="text-sm text-muted-foreground mt-2">
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
