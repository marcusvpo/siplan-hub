import { FileText, Search, Loader2, ChevronRight, Layout, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ModelosEditorWorkspace } from "@/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function OrionTNModels() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, isLoading, updateProject } = useProjectsV2();
  const [projectSearch, setProjectSearch] = useState("");

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

    const updatedProject = {
      ...proj,
      stages: {
        ...proj.stages,
        [stageKey]: {
          ...(proj.stages[stageKey as keyof typeof proj.stages] || {}),
          ...updates,
        }
      }
    };

    await updateProject.mutateAsync({
      projectId: proj.id,
      updates: updatedProject as any,
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
          <div className="p-2 space-y-1">
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Nenhum projeto encontrado.</p>
              </div>
            ) : (
              filteredProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProject(p.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg text-sm transition-all duration-200 group flex items-center justify-between",
                    projectId === p.id
                      ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-transparent"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{p.clientName}</p>
                    <p className="text-[10px] text-muted-foreground truncate uppercase">{p.systemType}</p>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    projectId === p.id ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                  )} />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">
                {selectedProject ? selectedProject.clientName : "Modelos Editor"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedProject ? `Central de Modelos - ${selectedProject.systemType}` : "Selecione um projeto para gerenciar modelos"}
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
