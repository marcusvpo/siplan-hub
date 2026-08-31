import { useCommercial, type Project } from "@/hooks/useCommercial";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [selectedSystemFilter, setSelectedSystemFilter] =
    useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState<number | null>(null);
  const itemsPerPage = selectedPageSize ?? (isMobile ? 3 : 9);
  const [viewedProjects, setViewedProjects] = useState<string[]>(() => {
    const saved = localStorage.getItem("commercial_viewed_projects");
    return saved ? JSON.parse(saved) : [];
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canEditBlockers = hasPermission("commercial_blockers", "edit");
  const hasActiveFilters =
    searchTerm.trim() !== "" || selectedSystemFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSystemFilter("all");
  };

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

  // Helper to check if project is finalized/concluded
  const isFinalizedProject = (project: Project) => {
    const gStatus = (project.global_status || "").toLowerCase();
    const status = (
      (project as Project & { status?: string | null }).status || ""
    ).toLowerCase();
    return (
      gStatus === "done" ||
      gStatus === "archived" ||
      gStatus === "canceled" ||
      gStatus === "concluded" ||
      status === "concluded" ||
      status === "finalizado" ||
      status === "done"
    );
  };

  // Filter projects logic
  const blockedProjects =
    projectsWithClients
      ?.filter((project) => {
        if (project.system_type === "Modelos TN") return false;
        if (isFinalizedProject(project)) return false;

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

  const totalPages = Math.max(
    1,
    Math.ceil(blockedProjects.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = blockedProjects.slice(
    startIndex,
    startIndex + itemsPerPage
  );
  const firstVisibleItem = blockedProjects.length === 0 ? 0 : startIndex + 1;
  const lastVisibleItem = Math.min(
    startIndex + itemsPerPage,
    blockedProjects.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSystemFilter, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleOpenDetails = (project: Project) => {
    markAsViewed(project.id);
    setSelectedProject(project);
    setEditorContent(project.commercial_notes || "");
  };

  const handleSaveNotes = async () => {
    if (!canEditBlockers) return;
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
    if (!canEditBlockers) return;

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
    new Set(
      (projectsWithClients || [])
        .map((project) => project.system_type)
        .filter((system): system is string => Boolean(system))
    )
  );

  return (
    <div
      className="flex min-w-0 flex-col gap-4 overflow-x-hidden animate-in fade-in duration-500 md:h-[calc(100vh-6rem)] md:gap-6"
      data-testid="commercial-blockers-page"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-xl font-bold leading-tight tracking-tight text-transparent sm:text-2xl md:text-3xl">
            Central de Bloqueios
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:mt-2 sm:text-base">
            Priorize e resolva as pendências de Infraestrutura que impedem o
            avanço dos projetos.
          </p>
        </div>

        <Badge
          variant="outline"
          className="h-7 w-fit shrink-0 bg-muted px-3 text-xs font-medium text-muted-foreground"
        >
          {blockedProjects.length} bloqueio
          {blockedProjects.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div
        className="min-w-0 rounded-xl border bg-muted/20 p-3 sm:p-4"
        data-testid="commercial-blockers-filters"
      >
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 shrink-0 text-primary" />
            <span>Filtros dos bloqueios</span>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-2 text-xs"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, sistema ou observações..."
              aria-label="Buscar bloqueio"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 min-w-0 bg-background pl-9"
            />
          </div>

          <Select
            value={selectedSystemFilter}
            onValueChange={setSelectedSystemFilter}
          >
            <SelectTrigger
              className="h-10 w-full min-w-0 bg-background"
              aria-label="Filtrar bloqueios por sistema"
            >
              <SelectValue placeholder="Sistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os sistemas</SelectItem>
              {availableSystems.map((system) => (
                <SelectItem key={system} value={system}>
                  {system}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-w-0 md:-mr-2 md:flex-1 md:overflow-y-auto md:pr-2">
        <div className="grid min-w-0 gap-3 pb-8 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
          {blockedProjects.length === 0 ? (
            <div
              className="col-span-full flex min-w-0 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/10 px-4 py-8 text-center sm:p-12"
              data-testid="commercial-blockers-empty-state"
            >
              <CheckCircle2 className="mb-3 h-12 w-12 text-green-500 opacity-80 sm:mb-4 sm:h-16 sm:w-16" />
              <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                Tudo limpo!
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Nenhum bloqueio de infraestrutura encontrado com os filtros
                atuais.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            paginatedProjects.map((project) => {
              const isNew = !viewedProjects.includes(project.id);

              return (
                <Card
                  key={project.id}
                  className="group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden border-t-4 border-t-red-500 bg-card/95 transition-all hover:bg-card hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => handleOpenDetails(project)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenDetails(project);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir detalhes do bloqueio de ${project.client_name || "cliente sem nome"}`}
                  data-testid="commercial-blocker-card"
                >
                  <CardContent className="flex min-w-0 flex-1 flex-col gap-3 p-3.5 sm:p-4">
                    {/* Header */}
                    <div className="flex min-w-0 items-start justify-between">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex min-w-0 flex-wrap items-start gap-2">
                          <h3
                            className="min-w-0 break-words text-base font-bold leading-snug transition-colors group-hover:text-primary sm:text-lg"
                            data-testid="commercial-blocker-client-name"
                          >
                            {project.client_name || "Cliente não informado"}
                          </h3>
                          {isNew && (
                            <Badge className="h-5 shrink-0 animate-pulse bg-blue-600 px-1.5 text-[10px] hover:bg-blue-700">
                              NOVO
                            </Badge>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className="h-auto max-w-full whitespace-normal break-words border-input bg-muted/50 px-2 py-1 text-left text-xs font-normal leading-snug text-muted-foreground"
                          >
                            {project.system_type || "Sistema não informado"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* UAT & Chamado Info */}
                    <div className="grid min-w-0 grid-cols-2 gap-2 border-b border-dashed py-2 text-xs text-muted-foreground">
                      <div className="flex min-w-0 flex-col justify-center">
                        <span className="uppercase text-[10px] font-bold tracking-wider opacity-70">
                          UAT (Update)
                        </span>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-foreground/80">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="break-words">
                            {new Date(project.updated_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-col items-end justify-center text-right">
                        <span className="uppercase text-[10px] font-bold tracking-wider opacity-70">
                          Chamado
                        </span>
                        <span className="mt-0.5 max-w-full break-all font-mono text-foreground/80">
                          {project.ticket_number || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Blockers List */}
                    <div className="mt-1 min-w-0 flex-1 space-y-2.5">
                      {project.blockers.map((blocker, idx) => (
                        <div
                          key={idx}
                          className="min-w-0 rounded-md border border-red-200 bg-red-50/80 p-2.5 text-sm shadow-sm dark:border-red-900/30 dark:bg-red-950/20"
                        >
                          <div className="mb-1 flex min-w-0 items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                            <span className="min-w-0 break-words font-semibold text-red-700 dark:text-red-300">
                              {blocker.stage}
                            </span>
                          </div>

                          {blocker.reason && (
                            <p
                              className="break-words text-xs leading-relaxed text-foreground/90 sm:pl-6 md:text-sm"
                              data-testid="commercial-blocker-reason"
                            >
                              {blocker.reason}
                            </p>
                          )}

                          {/* Extra Infra Fields */}
                          {blocker.details && (
                            <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 rounded border border-red-100/50 bg-white/50 p-2 text-xs dark:bg-black/20 sm:ml-6 sm:grid-cols-2">
                              <div className="min-w-0">
                                <span className="font-semibold text-red-800 dark:text-red-200 block">
                                  Status Estações
                                </span>
                                <span className="break-words text-foreground/80">
                                  {blocker.details.stations || "-"}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-red-800 dark:text-red-200 block">
                                  Status Servidor
                                </span>
                                <span className="break-words text-foreground/80">
                                  {blocker.details.server || "-"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto flex min-w-0 flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Hourglass className="h-3 w-3 shrink-0" />
                        <span>
                          {project.sold_hours ? `${project.sold_hours}h` : "0h"}
                        </span>
                      </div>
                      {canEditBlockers && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full text-xs hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30 sm:h-7 sm:w-auto"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMarkResolved(project);
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Resolver
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {blockedProjects.length > 0 && (
          <div
            className="flex min-w-0 flex-col gap-3 border-t px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-2"
            data-testid="commercial-blockers-pagination"
          >
            <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              Mostrando{" "}
              <strong className="font-semibold text-foreground">
                {firstVisibleItem}–{lastVisibleItem}
              </strong>{" "}
              de{" "}
              <strong className="font-semibold text-foreground">
                {blockedProjects.length}
              </strong>
            </p>

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                <span>Por página</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setSelectedPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    className="h-8 w-[68px]"
                    aria-label="Bloqueios por página"
                  >
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <span className="whitespace-nowrap text-xs font-medium sm:text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(page - 1, 1))
                  }
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      >
        <DialogContent
          className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-4xl flex-col overflow-x-hidden overflow-y-auto p-4 sm:p-6"
          data-testid="commercial-blocker-dialog"
        >
          <DialogHeader className="min-w-0 pr-10">
            <DialogTitle className="flex min-w-0 flex-col items-start gap-2 text-lg sm:flex-row sm:items-center sm:text-xl">
              <span className="min-w-0 break-words">
                {selectedProject?.client_name || "Cliente não informado"}
              </span>
              <Badge
                variant="secondary"
                className="h-auto max-w-full shrink-0 whitespace-normal break-words py-1 text-left leading-snug"
              >
                {selectedProject?.system_type || "Sistema não informado"}
              </Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detalhes do bloqueio de infraestrutura e observações comerciais do projeto.
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="min-w-0 flex-1 space-y-4 sm:space-y-6">
              {/* Info Grid */}
              <div className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4 lg:gap-4">
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Chamado
                  </h4>
                  <p className="break-all font-mono text-sm">
                    {selectedProject.ticket_number || "-"}
                  </p>
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Horas Vendidas
                  </h4>
                  <p className="font-medium text-sm">
                    {selectedProject.sold_hours || "-"}h
                  </p>
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status Geral
                  </h4>
                  <Badge
                    variant="outline"
                    className="h-auto max-w-full whitespace-normal break-words py-1 capitalize"
                  >
                    {selectedProject.global_status || "N/A"}
                  </Badge>
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Ultima atualização
                  </h4>
                  <p className="font-medium text-sm">
                    {new Date(selectedProject.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="min-w-0 space-y-2">
                <h3 className="flex min-w-0 items-center gap-2 font-semibold text-indigo-600">
                  <FileText className="h-4 w-4 shrink-0" />
                  Observações Comerciais
                </h3>
                <div className="min-w-0 overflow-hidden rounded-md border shadow-sm">
                  <RichTextEditor
                    content={editorContent}
                    onChange={setEditorContent}
                    placeholder="Registre aqui o andamento comercial..."
                    editable={canEditBlockers}
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                  className="w-full sm:w-auto"
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={!canEditBlockers}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto"
                >
                  Salvar Observações
                </Button>
                {canEditBlockers && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full bg-green-100 text-green-700 hover:bg-green-200 sm:w-auto"
                    onClick={() => handleMarkResolved(selectedProject)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Marcar como Resolvido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
