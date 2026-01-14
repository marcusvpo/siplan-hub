import { useCommercial, type Project } from "@/hooks/useCommercial";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  FileText,
  Hourglass,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Helper to determine active blockers
const getBlockers = (projectObj: Project) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project: any = projectObj;
  const blockers = [];

  // User requested ONLY Infrastructure blockers
  const stages = [{ key: "infra", label: "Infraestrutura" }];

  stages.forEach((stage) => {
    const status = project[`${stage.key}_status`];
    const blockingReason = project[`${stage.key}_blocking_reason`];

    if (
      status === "blocked" ||
      status === "reproved" ||
      status === "impediment"
    ) {
      blockers.push({
        stage: stage.label,
        reason: blockingReason || "", // Removed "Motivo não especificado"
        startDate: project[`${stage.key}_end_date`] || project.updated_at,
        severity: "high",
        // Extract extra infra fields if stage is Infra
        details:
          stage.key === "infra"
            ? {
                stations: project.infra_workstations_status,
                server: project.infra_server_status,
              }
            : null,
      });
    }
  });

  return blockers;
};

export default function CommercialBlockers() {
  const { projectsWithClients, isLoadingProjects } = useCommercial();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [selectedSystemFilter, setSelectedSystemFilter] =
    useState<string>("all");
  const [viewedProjects, setViewedProjects] = useState<string[]>(() => {
    const saved = localStorage.getItem("commercial_viewed_projects");
    return saved ? JSON.parse(saved) : [];
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to mark project as viewed
  const markAsViewed = (projectId: string) => {
    if (!viewedProjects.includes(projectId)) {
      const newViewed = [...viewedProjects, projectId];
      setViewedProjects(newViewed);
      localStorage.setItem(
        "commercial_viewed_projects",
        JSON.stringify(newViewed)
      );
    }
  };

  // Filter projects logic
  const blockedProjects =
    projectsWithClients
      ?.filter((project) => {
        const blockers = getBlockers(project);
        if (blockers.length === 0) return false;

        // Search Term Filter
        const matchesSearch =
          project.client_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          project.system_type?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // System Filter
        if (selectedSystemFilter !== "all") {
          if (project.system_type !== selectedSystemFilter) return false;
        }

        return true;
      })
      .map((p) => ({
        ...p,
        blockers: getBlockers(p),
      }))
      .sort((a, b) => {
        // Sort by updated_at ASC (most outdated first)
        return (
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        );
      }) || [];

  const handleOpenDetails = (project: Project) => {
    markAsViewed(project.id);
    setSelectedProject(project);
    setEditorContent(project.commercial_notes || "");
  };

  const handleSaveNotes = async () => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase
        .from("projects")
        .update({ commercial_notes: editorContent })
        .eq("id", selectedProject.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Observações comerciais salvas com sucesso.",
      });
      // Don't close modal, just notify success or close if needed
      // setSelectedProject(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar observações.",
        variant: "destructive",
      });
    }
  };

  const handleMarkResolved = async (
    project: Project,
    blockerStage?: string
  ) => {
    if (
      !confirm(
        "Confirmar que este bloqueio foi resolvido pelo comercial? Isso atualizará o status do projeto e adicionará uma tag."
      )
    )
      return;

    try {
      const currentTags = project.tags || [];
      const newTags = currentTags.includes("Resolvido por Comercial")
        ? currentTags
        : [...currentTags, "Resolvido por Comercial"];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = {
        tags: newTags,
        updated_at: new Date().toISOString(),
      };

      // Since we only track Infra now
      updates["infra_status"] = "concluded";

      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", project.id);

      if (error) throw error;

      toast({
        title: "Resolvido",
        description: "Projeto marcado como resolvido e atualizado.",
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["commercial-projects"] });
      if (selectedProject?.id === project.id) setSelectedProject(null);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao marcar como resolvido.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Hourglass className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-muted-foreground">Carregando bloqueios...</p>
        </div>
      </div>
    );
  }

  // Extract unique values for filters
  const availableSystems = Array.from(
    new Set(projectsWithClients?.map((p) => p.system_type).filter(Boolean))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Central de Bloqueios
          </h1>
          <p className="text-muted-foreground mt-2">
            Priorize e resolva as pendências de Infraestrutura que impedem o
            avanço dos projetos.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <div className="bg-muted px-3 py-1 rounded-full text-xs font-medium text-muted-foreground border">
            Total: {blockedProjects.length}
          </div>

          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={selectedSystemFilter}
            onChange={(e) => setSelectedSystemFilter(e.target.value)}
          >
            <option value="all">Sistemas: Todos</option>
            {availableSystems.map((sys) => (
              <option key={sys} value={sys}>
                {sys}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative shrink-0">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, sistema ou observações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-card/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 pb-8">
          {blockedProjects.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/10">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 opacity-80" />
              <h3 className="text-xl font-semibold text-foreground">
                Tudo limpo!
              </h3>
              <p className="text-muted-foreground max-w-md mt-2">
                Nenhum bloqueio de infraestrutura encontrado com os filtros
                atuais.
              </p>
              {(searchTerm || selectedSystemFilter !== "all") && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedSystemFilter("all");
                  }}
                  className="mt-4"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            blockedProjects.map((project) => {
              const isNew = !viewedProjects.includes(project.id);

              return (
                <Card
                  key={project.id}
                  className="overflow-hidden border-t-4 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full bg-card/95 hover:bg-card border-t-red-500"
                  onClick={() => handleOpenDetails(project)}
                >
                  <CardContent className="p-4 flex flex-col flex-1 gap-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                            {project.client_name}
                          </h3>
                          {isNew && (
                            <Badge className="bg-blue-600 hover:bg-blue-700 h-5 px-1.5 text-[10px] animate-pulse">
                              NOVO
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs font-normal text-muted-foreground bg-muted/50 border-input"
                          >
                            {project.system_type}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* UAT & Chamado Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground py-2 border-b border-dashed">
                      <div className="flex flex-col justify-center">
                        <span className="uppercase text-[10px] font-bold tracking-wider opacity-70">
                          UAT (Update)
                        </span>
                        <div className="flex items-center gap-1.5 text-foreground/80 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(project.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center items-end text-right">
                        <span className="uppercase text-[10px] font-bold tracking-wider opacity-70">
                          Chamado
                        </span>
                        <span className="font-mono text-foreground/80 mt-0.5">
                          {project.ticket_number || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Blockers List */}
                    <div className="flex-1 space-y-2.5 mt-1">
                      {project.blockers.map((blocker, idx) => (
                        <div
                          key={idx}
                          className="rounded-md p-2.5 text-sm border shadow-sm bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-900/30"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                            <span className="font-semibold text-red-700 dark:text-red-300">
                              {blocker.stage}
                            </span>
                          </div>

                          {blocker.reason && (
                            <p className="text-foreground/90 pl-6 leading-relaxed text-xs md:text-sm">
                              {blocker.reason}
                            </p>
                          )}

                          {/* Extra Infra Fields */}
                          {blocker.details && (
                            <div className="mt-2 ml-6 grid grid-cols-2 gap-2 text-xs bg-white/50 dark:bg-black/20 p-2 rounded border border-red-100/50">
                              <div>
                                <span className="font-semibold text-red-800 dark:text-red-200 block">
                                  Status Estações
                                </span>
                                <span className="text-foreground/80">
                                  {blocker.details.stations || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-red-800 dark:text-red-200 block">
                                  Status Servidor
                                </span>
                                <span className="text-foreground/80">
                                  {blocker.details.server || "-"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-3 flex justify-between items-center">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hourglass className="h-3 w-3" />
                        <span>
                          {project.sold_hours ? `${project.sold_hours}h` : "0h"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkResolved(project);
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Resolver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedProject?.client_name}
              <Badge variant="secondary">{selectedProject?.system_type}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Chamado
                  </h4>
                  <p className="font-mono text-sm">
                    {selectedProject.ticket_number || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Horas Vendidas
                  </h4>
                  <p className="font-medium text-sm">
                    {selectedProject.sold_hours || "-"}h
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status Geral
                  </h4>
                  <Badge variant="outline" className="capitalize">
                    {selectedProject.global_status || "N/A"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ultima atualização
                  </h4>
                  <p className="font-medium text-sm">
                    {new Date(selectedProject.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2 text-indigo-600">
                  <FileText className="h-4 w-4" />
                  Observações Comerciais
                </h3>
                <div className="border rounded-md shadow-sm">
                  <RichTextEditor
                    content={editorContent}
                    onChange={setEditorContent}
                    placeholder="Registre aqui o andamento comercial..."
                    editable={true}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={handleSaveNotes}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Salvar Observações
                </Button>
                <Button
                  variant="secondary"
                  className="ml-auto text-green-700 bg-green-100 hover:bg-green-200"
                  onClick={() => handleMarkResolved(selectedProject)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como Resolvido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
