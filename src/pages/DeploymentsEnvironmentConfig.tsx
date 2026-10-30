import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ServerCog,
  Search,
  Filter,
  Users,
  RefreshCw,
  Info,
  ShieldCheck,
  Eye,
  SlidersHorizontal,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectsList } from "@/hooks/useProjectsList";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectV2, StageStatus } from "@/types/ProjectV2";
import {
  EnvironmentKanbanColumnId,
  canManageEnvironmentConfig,
  createEnvironmentTimelineItem,
} from "@/lib/environment-config";
import { EnvironmentKanbanBoard } from "@/components/EnvironmentConfig/EnvironmentKanbanBoard";
import { EnvironmentProjectModal } from "@/components/EnvironmentConfig/EnvironmentProjectModal";
import { cn } from "@/lib/utils";

type ResponsibleFilter = "all" | "bruno" | "alex" | "unassigned" | string;

export default function DeploymentsEnvironmentConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, fullName } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();
  const { updateProject } = useProjectsV2();

  // Permissão de gestão: Admin, Bruno Fernandes, Alex Silva ou permissão explícita
  const canEdit = useMemo(
    () => canManageEnvironmentConfig(fullName, isAdmin, hasPermission),
    [fullName, isAdmin, hasPermission]
  );

  // Split Query padrão: carrega a listagem leve
  const { projects = [], isLoading } = useProjectsList();
  const allProjects = projects as ProjectV2[];
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  // Estados dos Filtros
  const [responsibleFilter, setResponsibleFilter] = useState<ResponsibleFilter>("all");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Estado do Modal de Detalhes
  const [selectedProject, setSelectedProject] = useState<ProjectV2 | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<EnvironmentKanbanColumnId>("not_started");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Filtrar apenas projetos elegíveis para a fila de Configuração de Ambiente
  // Regras:
  // - Não deletados
  // - Sistema NÃO pode ser "Modelos TN" (ou qualquer variante de modelos)
  // - Entra no Kanban SE:
  //   a) Etapa 4 já estiver em andamento ('in-progress') ou concluída ('done'), OU
  //   b) Projeto já possui data prevista cadastrada na etapa "Fase 1 Treinamento & Acompanhamento"
  //      (sobrescreve o status da etapa 4 para permitir a visão de planejamento 360 da equipe)
  const environmentProjects = useMemo(() => {
    return allProjects.filter((p) => {
      if (p.isDeleted) return false;

      // Exclusão estrita de projetos de "Modelos TN"
      const sys = (p.systemType || "").trim().toLowerCase();
      if (sys.includes("modelo")) return false;

      const env = p.stages?.environment;
      const envStatus = env?.status;

      // Verificar se possui data prevista cadastrada em Fase 1 Treinamento & Acompanhamento
      const phase1 = p.stages?.implementation?.phase1 as any;
      const hasPhase1Date = Boolean(
        phase1?.startDate ||
        phase1?.start_date ||
        phase1?.endDate ||
        phase1?.end_date ||
        p.stages?.implementation?.startDate
      );

      // REGRA: entra se etapa 4 estiver 'in-progress' / 'done', OU se já tiver data prevista na Fase 1
      return envStatus === "in-progress" || envStatus === "done" || hasPhase1Date;
    });
  }, [allProjects]);

  // 2. Extrair responsáveis secundários (além de Bruno Fernandes e Alex Silva) para botões dinâmicos de filtro.
  // REGRA: analistas secundários só recebem botão de filtro se possuírem demandas ATIVAS (Não Iniciadas ou Em Andamento).
  // Se todas as demandas do analista secundário estiverem concluídas/finalizadas (na fila "Concluídos"), o botão não deve existir.
  // Bruno Fernandes e Alex Silva permanecem SEMPRE fixos.
  const extraResponsibles = useMemo(() => {
    const activeSet = new Set<string>();
    environmentProjects.forEach((p) => {
      const env = p.stages?.environment;
      const resp = env?.responsible?.trim();
      if (!resp) return;
      const lower = resp.toLowerCase();
      const isBruno = lower.includes("bruno") && lower.includes("fernandes");
      const isAlex = lower.includes("alex") && lower.includes("silva");
      if (isBruno || isAlex) return;

      const kanbanCol =
        env?.kanbanStatus ||
        (env?.status === "done"
          ? "completed"
          : env?.status === "in-progress"
          ? "in_progress"
          : "not_started");
      const isDone = kanbanCol === "completed" || env?.status === "done";

      // Só adiciona ao filtro se tiver pelo menos 1 demanda ativa (não concluída)
      if (!isDone) {
        activeSet.add(resp);
      }
    });
    return Array.from(activeSet).sort();
  }, [environmentProjects]);

  // Se o filtro selecionado for de um analista secundário cujas demandas foram todas finalizadas, voltar para "all"
  useEffect(() => {
    if (
      responsibleFilter !== "all" &&
      responsibleFilter !== "bruno" &&
      responsibleFilter !== "alex" &&
      responsibleFilter !== "unassigned" &&
      !extraResponsibles.includes(responsibleFilter)
    ) {
      setResponsibleFilter("all");
    }
  }, [extraResponsibles, responsibleFilter]);

  // 3. Extrair lista única de sistemas disponíveis nos projetos para o filtro
  const availableSystems = useMemo(() => {
    const set = new Set<string>();
    environmentProjects.forEach((p) => {
      if (p.systemType) set.add(p.systemType);
    });
    return Array.from(set).sort();
  }, [environmentProjects]);

  // 4. Métricas de carga de trabalho operacional por analista (Workload Counters)
  const workloadStats = useMemo(() => {
    let brunoInProgress = 0;
    let brunoNotStarted = 0;
    let alexInProgress = 0;
    let alexNotStarted = 0;
    let unassigned = 0;

    const othersMap: Record<string, { inProgress: number; notStarted: number }> = {};

    environmentProjects.forEach((p) => {
      const env = p.stages?.environment;
      const resp = (env?.responsible || "").trim().toLowerCase();
      const kanbanCol =
        env?.kanbanStatus ||
        (env?.status === "done"
          ? "completed"
          : env?.status === "in-progress"
          ? "in_progress"
          : "not_started");
      const isDone = kanbanCol === "completed" || env?.status === "done";

      if (isDone) return; // A contagem de carga operacional foca nos chamados ativos (em andamento e a iniciar)

      const isInProg = kanbanCol === "in_progress";

      if (!resp) {
        unassigned++;
      } else if (resp.includes("alex") && resp.includes("silva")) {
        if (isInProg) alexInProgress++;
        else alexNotStarted++;
      } else if (resp.includes("bruno") && resp.includes("fernandes")) {
        if (isInProg) brunoInProgress++;
        else brunoNotStarted++;
      } else {
        const originalName = env?.responsible?.trim() || "Outro";
        if (!othersMap[originalName]) {
          othersMap[originalName] = { inProgress: 0, notStarted: 0 };
        }
        if (isInProg) othersMap[originalName].inProgress++;
        else othersMap[originalName].notStarted++;
      }
    });

    return {
      alex: { inProgress: alexInProgress, notStarted: alexNotStarted, total: alexInProgress + alexNotStarted },
      bruno: { inProgress: brunoInProgress, notStarted: brunoNotStarted, total: brunoInProgress + brunoNotStarted },
      unassigned,
      others: Object.entries(othersMap).map(([name, counts]) => ({
        name,
        inProgress: counts.inProgress,
        notStarted: counts.notStarted,
        total: counts.inProgress + counts.notStarted,
      })),
    };
  }, [environmentProjects]);

  // 5. Aplicar filtros de Responsável, Sistema e Busca Textual
  const filteredProjects = useMemo(() => {
    return environmentProjects.filter((p) => {
      const env = p.stages?.environment;
      const resp = (env?.responsible || "").trim().toLowerCase();

      // Filtro de Responsável
      if (responsibleFilter === "bruno") {
        if (!resp.includes("bruno") && !resp.includes("fernandes")) return false;
      } else if (responsibleFilter === "alex") {
        if (!resp.includes("alex") && !resp.includes("silva")) return false;
      } else if (responsibleFilter === "unassigned") {
        if (resp !== "") return false;
      } else if (responsibleFilter !== "all") {
        // Analista secundário identificado dinamicamente
        if (!resp.includes(responsibleFilter.toLowerCase())) return false;
      }

      // Filtro de Sistema
      if (selectedSystem !== "all" && p.systemType !== selectedSystem) {
        return false;
      }

      // Busca Textual (Nome do Cartório/Cliente ou Número do Chamado)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.trim().toLowerCase();
        const client = (p.clientName || "").toLowerCase();
        const ticket = (p.ticketNumber || "").toLowerCase();
        if (!client.includes(q) && !ticket.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [environmentProjects, responsibleFilter, selectedSystem, searchQuery]);

  // Handler para mover cards entre colunas
  const handleMoveCard = useCallback(
    async (
      projectId: string,
      sourceCol: EnvironmentKanbanColumnId,
      destinationCol: EnvironmentKanbanColumnId
    ) => {
      if (!canEdit) {
        toast({
          title: "Ação não permitida",
          description: "Apenas administradores e analistas responsáveis podem mover cards neste Kanban.",
          variant: "destructive",
        });
        return;
      }

      const project = allProjects.find((p) => p.id === projectId);
      if (!project) return;

      const currentEnv = project.stages?.environment || {
        status: "in-progress" as StageStatus,
        approvedByInfra: false,
        testAvailable: false,
      };

      const now = new Date();

      // Determinar as alterações no estágio de ambiente
      let nextStatus: StageStatus = currentEnv.status;
      let nextEndDate = currentEnv.endDate;
      let nextRealDate = currentEnv.realDate;

      // Regra fundamental:
      // Mover para 'completed' => etapa 4 vira 'done' e 'Finalizado Em' preenchido com a data atual
      if (destinationCol === "completed") {
        nextStatus = "done";
        nextEndDate = now;
        nextRealDate = now;
      } else if (sourceCol === "completed") {
        // Se estava em Concluídos e voltou para Em Andamento ou Não Iniciados => etapa 4 volta para 'in-progress'
        nextStatus = "in-progress";
        nextEndDate = undefined;
        nextRealDate = undefined;
      } else {
        // Entre 'not_started' e 'in_progress', o status geral permanece 'in-progress'
        nextStatus = "in-progress";
      }

      const destLabel =
        destinationCol === "completed"
          ? "Concluídos"
          : destinationCol === "in_progress"
          ? "Em Andamento"
          : "Não Iniciados";

      const newTimelineItem = createEnvironmentTimelineItem(
        "moved_column",
        fullName || "Analista",
        `Card movido de "${sourceCol === "completed" ? "Concluídos" : sourceCol === "in_progress" ? "Em Andamento" : "Não Iniciados"}" para "${destLabel}".`
      );
      const updatedTimeline = [newTimelineItem, ...(currentEnv.timeline || [])];

      try {
        await updateProject.mutateAsync({
          projectId,
          updates: {
            stages: {
              ...project.stages,
              environment: {
                ...currentEnv,
                status: nextStatus,
                endDate: nextEndDate,
                realDate: nextRealDate,
                kanbanStatus: destinationCol,
                timeline: updatedTimeline,
              },
            },
          },
        });

        await queryClient.invalidateQueries({ queryKey: ["projectsList"] });
        await queryClient.invalidateQueries({ queryKey: ["projectDetails", projectId] });

        toast({
          title: "Card Movimentado",
          description: `Projeto movido para "${
            destinationCol === "completed"
              ? "Concluídos"
              : destinationCol === "in_progress"
              ? "Em Andamento"
              : "Não Iniciados"
          }".`,
        });
      } catch (err) {
        console.error("Erro ao mover card no kanban:", err);
        toast({
          title: "Erro ao movimentar",
          description: "Ocorreu um erro ao atualizar o status do projeto.",
          variant: "destructive",
        });
      }
    },
    [canEdit, allProjects, updateProject, queryClient, toast, fullName]
  );

  // Abertura do modal detalhado
  const handleCardClick = useCallback(
    (project: ProjectV2, columnId: EnvironmentKanbanColumnId) => {
      setSelectedProject(project);
      setSelectedColumn(columnId);
      setIsModalOpen(true);
    },
    []
  );

  return (
    <div
      className="container mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 sm:px-6 py-4 sm:py-6"
      data-testid="environment-config-page"
    >
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <ServerCog className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Configuração de Ambiente
            </h1>
            <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary">
              Kanban Operacional
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhamento centralizado das configurações de ambiente para implantações com alertas de prazo e sincronização em tempo real.
          </p>
        </div>

        {/* Status de Permissão e Botão de Atualizar */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {!canEdit && (
            <Badge variant="secondary" className="gap-1 text-xs font-semibold py-1">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              Modo Visualização
            </Badge>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isRefreshing || isLoading) && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Indicadores Estáticos de Carga de Trabalho Operacional (Workload KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Alex Silva */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/80 p-2.5 sm:p-3 text-left shadow-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black shadow-xs">
            AS
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-foreground block truncate">
              Alex Silva
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {workloadStats.alex.inProgress} em andamento
              </span>
              <span>•</span>
              <span>{workloadStats.alex.notStarted} a iniciar</span>
            </div>
          </div>
        </div>

        {/* Bruno Fernandes */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/80 p-2.5 sm:p-3 text-left shadow-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black shadow-xs">
            BF
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-foreground block truncate">
              Bruno Fernandes
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {workloadStats.bruno.inProgress} em andamento
              </span>
              <span>•</span>
              <span>{workloadStats.bruno.notStarted} a iniciar</span>
            </div>
          </div>
        </div>

        {/* Sem Responsável (Alerta Ativo) */}
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl border p-2.5 sm:p-3 text-left shadow-xs",
            workloadStats.unassigned > 0
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border/80 bg-card/80"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white text-xs font-black shadow-xs">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block truncate">
              Sem Responsável
            </span>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
              {workloadStats.unassigned} aguardando analista
            </span>
          </div>
        </div>

        {/* Resumo da Esteira Geral */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/80 p-2.5 sm:p-3 text-left shadow-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-black shadow-xs">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-foreground block truncate">
              Fila Completa
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
              <span className="text-foreground font-bold">
                {environmentProjects.length} cartórios
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {environmentProjects.filter((p) => p.stages?.environment?.status === "done" || (p.stages?.environment?.kanbanStatus || "") === "completed").length} concluídos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Responsiva */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border bg-card/60 p-3 sm:p-4 shadow-sm">
        {/* Botões Rápidos de Responsável: Fila Geral, Bruno Fernandes, Alex Silva, Sem Responsável */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Responsável:
          </span>

          <Button
            type="button"
            size="sm"
            variant={responsibleFilter === "all" ? "default" : "outline"}
            className="h-8 text-xs font-semibold rounded-lg"
            onClick={() => setResponsibleFilter("all")}
          >
            Fila Geral
          </Button>

          <Button
            type="button"
            size="sm"
            variant={responsibleFilter === "bruno" ? "default" : "outline"}
            className={cn(
              "h-8 text-xs font-semibold rounded-lg",
              responsibleFilter === "bruno" && "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            )}
            onClick={() => setResponsibleFilter("bruno")}
          >
            Bruno Fernandes
          </Button>

          <Button
            type="button"
            size="sm"
            variant={responsibleFilter === "alex" ? "default" : "outline"}
            className={cn(
              "h-8 text-xs font-semibold rounded-lg",
              responsibleFilter === "alex" && "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            )}
            onClick={() => setResponsibleFilter("alex")}
          >
            Alex Silva
          </Button>

          {/* Botões dinâmicos para analistas secundários identificados nos cards */}
          {extraResponsibles.map((extraName) => (
            <Button
              key={extraName}
              type="button"
              size="sm"
              variant={responsibleFilter === extraName ? "default" : "outline"}
              className={cn(
                "h-8 text-xs font-semibold rounded-lg",
                responsibleFilter === extraName &&
                  "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              )}
              onClick={() => setResponsibleFilter(extraName)}
            >
              {extraName}
            </Button>
          ))}

          <Button
            type="button"
            size="sm"
            variant={responsibleFilter === "unassigned" ? "secondary" : "ghost"}
            className="h-8 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            onClick={() => setResponsibleFilter("unassigned")}
          >
            Sem Responsável
          </Button>
        </div>

        {/* Filtro por Sistema e Busca Textual */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Select de Sistema */}
          <div className="w-full sm:w-44">
            <Select value={selectedSystem} onValueChange={setSelectedSystem}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Todos os Sistemas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Sistemas</SelectItem>
                {availableSystems.map((sys) => (
                  <SelectItem key={sys} value={sys}>
                    {sys}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campo de Busca Textual */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar cliente ou chamado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* Informações de Total e Legenda Rápida */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          Mostrando <strong className="text-foreground">{filteredProjects.length}</strong> de{" "}
          <strong className="text-foreground">{environmentProjects.length}</strong> ambientes em esteira
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> &gt;= 2 semanas
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Semana pré-prazo
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Semana final / Vencendo
          </span>
        </div>
      </div>

      {/* Tabuleiro Kanban */}
      <EnvironmentKanbanBoard
        projects={filteredProjects}
        canEdit={canEdit}
        onMoveCard={handleMoveCard}
        onCardClick={handleCardClick}
      />

      {/* Modal Detalhado do Card Selecionado */}
      {selectedProject && (
        <EnvironmentProjectModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProject(null);
          }}
          columnId={selectedColumn}
        />
      )}
    </div>
  );
}
