import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  User,
  AlertTriangle,
  PackageCheck,
  ArrowRight,
  ExternalLink,
  Cpu,
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Database,
  Building2,
  ArrowRightLeft,
  Lock,
  Copy,
  Check,
  History,
} from "lucide-react";
import { ProjectV2, EnvironmentStageV2, StageStatus } from "@/types/ProjectV2";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  calculateEnvironmentTargetDate,
  formatEnvironmentTargetDate,
  getEnvironmentUrgency,
  canManageEnvironmentConfig,
  isUserCurrentResponsible,
  EnvironmentKanbanColumnId,
  createEnvironmentTimelineItem,
  formatEnvironmentConnectionSummary,
} from "@/lib/environment-config";
import { getProjectOrionAdminStatus } from "@/lib/secondary-products";
import { EnvironmentStageForm } from "@/components/ProjectManagement/Forms/StageForms/EnvironmentStageForm";
import { OrionAdminSection } from "@/components/ProjectManagement/Forms/OrionAdminSection";
import { EnvironmentScreenshots } from "@/components/ProjectManagement/Forms/EnvironmentScreenshots";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import { cn } from "@/lib/utils";

interface EnvironmentProjectModalProps {
  project: ProjectV2 | null;
  isOpen: boolean;
  onClose: () => void;
  columnId: EnvironmentKanbanColumnId;
}

export function EnvironmentProjectModal({
  project,
  isOpen,
  onClose,
  columnId,
}: EnvironmentProjectModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, fullName } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();
  const { updateProject } = useProjectsV2();

  // Permissão geral de gerenciamento (Admin, Bruno Fernandes, Alex Silva ou permissão explícita)
  const canEdit = useMemo(
    () => canManageEnvironmentConfig(fullName, isAdmin, hasPermission),
    [fullName, isAdmin, hasPermission]
  );

  // Lazy loading dos dados detalhados do projeto
  const { project: detailedProject } = useProjectDetails(project?.id);
  const currentProject = detailedProject || project;

  // Estado local do estágio de ambiente
  const [envStage, setEnvStage] = useState<EnvironmentStageV2>(() => {
    return (
      currentProject?.stages?.environment || {
        status: "in-progress",
        approvedByInfra: false,
        testAvailable: false,
      }
    );
  });

  const [hasPendings, setHasPendings] = useState<boolean>(
    Boolean(currentProject?.stages?.environment?.hasPendings)
  );

  const [observations, setObservations] = useState<string>(
    currentProject?.stages?.environment?.observations || ""
  );

  const [isCopied, setIsCopied] = useState(false);

  // Sincroniza estado quando o projeto detalhado for carregado
  useEffect(() => {
    if (currentProject?.stages?.environment) {
      setEnvStage(currentProject.stages.environment);
      setHasPendings(Boolean(currentProject.stages.environment.hasPendings));
      setObservations(currentProject.stages.environment.observations || "");
    }
  }, [currentProject]);

  // Cálculos de datas da Fase 1 e Data Limite
  const phase1 = currentProject?.stages?.implementation?.phase1 as any;
  const phase1StartDate = phase1?.startDate || phase1?.start_date;
  const targetDate = useMemo(
    () => calculateEnvironmentTargetDate(phase1StartDate),
    [phase1StartDate]
  );
  const formattedTargetDate = useMemo(
    () => formatEnvironmentTargetDate(targetDate),
    [targetDate]
  );
  const urgency = useMemo(
    () => getEnvironmentUrgency(targetDate, columnId, hasPendings),
    [targetDate, columnId, hasPendings]
  );

  // Produtos Secundários
  const secondaryCount = currentProject?.secondaryTicketsCount || 0;
  const secondaryPendingCount = currentProject?.secondaryTicketsPendingCount || 0;
  const secondaryNames = currentProject?.secondaryProductsNames || [];

  // Regra de Responsável:
  // 1. Está assumido se o campo responsible tiver texto válido
  const isAssigned = Boolean(envStage.responsible && envStage.responsible.trim() !== "");

  // 2. Verifica se quem está logado é o responsável atual daquele projeto
  const isCurrentResponsibleUser = useMemo(
    () => isUserCurrentResponsible(envStage.responsible, fullName, user?.email),
    [envStage.responsible, fullName, user?.email]
  );

  // 3. Regra de bloqueio de edição:
  // Enquanto não assumido por algum analista, a edição dos campos do modal deve estar 100% bloqueada!
  const canEditFields = canEdit && isAssigned;

  // Lista de destinatários para passar atribuição
  const targetResponsibles = useMemo(() => {
    const currentResp = (envStage.responsible || "").trim().toLowerCase();
    const allAnalystOptions = ["Bruno Fernandes", "Alex Silva"];
    return allAnalystOptions.filter(
      (name) => !currentResp.includes(name.toLowerCase().split(" ")[0])
    );
  }, [envStage.responsible]);

  // Salvar atualizações no estágio de ambiente
  const handleSaveStageUpdates = useCallback(
    async (patch: Partial<EnvironmentStageV2>) => {
      if (!currentProject || !canEdit) return;

      const updatedStage: EnvironmentStageV2 = {
        ...envStage,
        ...patch,
      };

      setEnvStage(updatedStage);

      try {
        await updateProject.mutateAsync({
          projectId: currentProject.id,
          updates: {
            stages: {
              ...currentProject.stages,
              environment: updatedStage,
            },
          },
        });

        await queryClient.invalidateQueries({ queryKey: ["projectsList"] });
        await queryClient.invalidateQueries({ queryKey: ["projectDetails", currentProject.id] });
      } catch (err) {
        console.error("Erro ao salvar atualização do ambiente:", err);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar as alterações da configuração de ambiente.",
          variant: "destructive",
        });
      }
    },
    [currentProject, canEdit, envStage, updateProject, queryClient, toast]
  );

  // Copiar resumo com acessos para o clipboard (1 clique)
  const handleCopySummary = useCallback(() => {
    if (!currentProject) return;
    const text = formatEnvironmentConnectionSummary(currentProject, envStage);
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({
      title: "Resumo Copiado para o Teams!",
      description: "Mensagem copiada no formato padrão para envio a Alex e Bruno.",
    });
  }, [currentProject, envStage, toast]);

  // Assumir configuração (define o usuário logado como responsável)
  const handleAssignToMe = useCallback(async () => {
    if (!currentProject || !canEdit) return;
    const currentName = fullName || user?.email || "Analista";

    // Se o status da etapa 4 ainda era 'todo', ao assumir ele avança para 'in-progress'
    const nextStatus: StageStatus =
      envStage.status === "todo" ? "in-progress" : envStage.status || "in-progress";

    const newTimelineItem = createEnvironmentTimelineItem(
      "assigned",
      currentName,
      `Configuração assumida por ${currentName}.`
    );

    const updatedTimeline = [newTimelineItem, ...(envStage.timeline || [])];

    await handleSaveStageUpdates({
      responsible: currentName,
      status: nextStatus,
      timeline: updatedTimeline,
    });

    toast({
      title: "Configuração Assumida!",
      description: `Você foi definido como o responsável pela configuração do ambiente de ${currentProject.clientName}. A edição dos campos foi liberada.`,
    });
  }, [currentProject, canEdit, fullName, user, envStage.status, envStage.timeline, handleSaveStageUpdates, toast]);

  // Passar Atribuição para outro analista
  const handleTransferAssignment = useCallback(
    async (newResponsible: string) => {
      if (!currentProject || !canEdit) return;
      const currentName = fullName || user?.email || "Analista";

      const newTimelineItem = createEnvironmentTimelineItem(
        "transferred",
        currentName,
        `Atribuição transferida de ${envStage.responsible || "Pendente"} para ${newResponsible}.`
      );

      const updatedTimeline = [newTimelineItem, ...(envStage.timeline || [])];

      await handleSaveStageUpdates({
        responsible: newResponsible,
        timeline: updatedTimeline,
      });

      toast({
        title: "Atribuição Transferida!",
        description: `A responsabilidade pelo ambiente de ${currentProject.clientName} foi passada para ${newResponsible}.`,
      });
    },
    [currentProject, canEdit, fullName, user, envStage.responsible, envStage.timeline, handleSaveStageUpdates, toast]
  );

  // Alternar interruptor de pendências
  const handleTogglePendings = useCallback(
    async (checked: boolean) => {
      if (!canEdit) return;
      const currentName = fullName || user?.email || "Analista";

      const newTimelineItem = createEnvironmentTimelineItem(
        "toggle_pendings",
        currentName,
        checked ? "Interruptor de pendências ativado." : "Pendências resolvidas (desativado)."
      );

      const updatedTimeline = [newTimelineItem, ...(envStage.timeline || [])];

      setHasPendings(checked);
      await handleSaveStageUpdates({
        hasPendings: checked,
        timeline: updatedTimeline,
      });

      toast({
        title: checked ? "Marcado com Pendências" : "Pendências Resolvidas",
        description: checked
          ? "Este ambiente permanecerá visível na coluna 'Concluídos' com a tag de Pendências."
          : "Este ambiente agora entrará na seção retraída de 'Finalizados'.",
      });
    },
    [canEdit, fullName, user, envStage.timeline, handleSaveStageUpdates, toast]
  );

  // Salvar observações ao perder o foco (blur)
  const handleBlurObservations = useCallback(() => {
    if (observations !== (envStage.observations || "")) {
      handleSaveStageUpdates({ observations });
    }
  }, [observations, envStage.observations, handleSaveStageUpdates]);

  if (!currentProject) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Topo / Cabeçalho do Modal */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-card/60 backdrop-blur-sm shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {currentProject.clientName}
                </DialogTitle>
                {currentProject.ticketNumber && (
                  <EllevoTicketLink ticketNumber={currentProject.ticketNumber}>
                    <Badge variant="outline" className="font-mono text-xs font-bold hover:bg-accent cursor-pointer">
                      Chamado #{currentProject.ticketNumber}
                      <ExternalLink className="h-3 w-3 ml-1 inline" />
                    </Badge>
                  </EllevoTicketLink>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Painel de Configuração de Ambiente (Etapa 4 da Implantação)
              </p>
            </div>

            {/* Ações Rápidas no Topo */}
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
              {/* Botão Copiar Acessos para Clipboard */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopySummary}
                className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted/80 shadow-xs cursor-pointer"
                title="Copiar dados de acesso e resumo formatado para envio no Teams"
              >
                {isCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>{isCopied ? "Copiado!" : "Copiar Acessos"}</span>
              </Button>

              {/* Interruptor de Pendências na cor Laranja */}
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 shadow-xs">
                <Switch
                  id="has-pendings-switch"
                  checked={hasPendings}
                  onCheckedChange={handleTogglePendings}
                  disabled={!canEdit}
                  className="data-[state=checked]:bg-amber-500"
                />
                <Label
                  htmlFor="has-pendings-switch"
                  className={cn(
                    "text-xs font-bold cursor-pointer select-none",
                    hasPendings ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground"
                  )}
                >
                  Pendências
                </Label>
              </div>

              {/* Botão ASSUMIR CONFIGURAÇÃO (Apenas quando NÃO assumido, com vermelho pulsante e alto destaque) */}
              {canEdit && !isAssigned && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAssignToMe}
                  className="h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-lg shadow-red-500/50 border-2 border-red-400 hover:border-red-300 animate-pulse transition-all transform hover:scale-105 gap-2 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 animate-spin text-white" />
                  Assumir Configuração
                </Button>
              )}

              {/* Botão PASSAR ATRIBUIÇÃO (Apenas quando JÁ assumido e o usuário for o responsável atual ou Admin) */}
              {canEdit && isAssigned && (isCurrentResponsibleUser || isAdmin) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 border-primary/50 bg-background text-foreground hover:bg-primary/10 hover:text-primary shadow-xs"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                      Passar Atribuição
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs font-bold">
                      Transferir atribuição para:
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {targetResponsibles.map((analystName) => (
                      <DropdownMenuItem
                        key={analystName}
                        onClick={() => handleTransferAssignment(analystName)}
                        className="text-xs font-semibold cursor-pointer gap-2 py-2"
                      >
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {analystName}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Cards de Métricas e Prazos Rápidos */}
          <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {/* Sistema */}
            <div className="rounded-lg border bg-background/50 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Cpu className="h-3 w-3 text-primary" /> Sistema
              </span>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-foreground truncate">
                {currentProject.systemType || "Não informado"}
              </p>
            </div>

            {/* Responsável */}
            <div className="rounded-lg border bg-background/50 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Responsável
              </span>
              <p
                className={cn(
                  "mt-0.5 text-xs sm:text-sm font-bold truncate",
                  envStage.responsible ? "text-foreground" : "text-red-600 dark:text-red-400 italic"
                )}
              >
                {envStage.responsible || "Pendente de atribuição"}
              </p>
            </div>

            {/* Data Final Limite */}
            <div className={cn("rounded-lg border p-2.5", urgency.cardBorderClass, urgency.cardBgClass)}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Data Final Limite
              </span>
              <p className="mt-0.5 text-xs sm:text-sm font-bold truncate">
                {formattedTargetDate}
              </p>
            </div>

            {/* Situação Atual */}
            <div className="rounded-lg border bg-background/50 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Situação Kanban
              </span>
              <div className="mt-0.5">
                <Badge className={cn("text-[10px] font-bold", urgency.badgeClass)}>
                  {columnId === "completed"
                    ? "Concluído"
                    : columnId === "in_progress"
                    ? "Em Andamento"
                    : "Não Iniciado"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo com Scroll */}
        <ScrollArea className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          {/* BANNER DE BLOQUEIO DE EDIÇÃO: Quando a configuração ainda não foi assumida */}
          {!isAssigned && (
            <div className="rounded-xl border-2 border-red-500 bg-red-500/10 dark:bg-red-950/40 p-4 text-red-950 dark:text-red-200 shadow-md flex items-start gap-3 animate-pulse mb-5">
              <Lock className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-black text-red-700 dark:text-red-300 uppercase tracking-wide">
                  Configuração não assumida — Edição Bloqueada
                </h4>
                <p className="text-xs leading-relaxed text-red-900/90 dark:text-red-200">
                  Nenhum analista assumiu este ambiente ainda. Para cadastrar dados de conexão, credenciais de SO, banco de dados ou observações, clique no botão vermelho <strong>&quot;Assumir Configuração&quot;</strong> acima.
                </p>
              </div>
            </div>
          )}

          {/* 1. Banner de Produtos Secundários (Espelhando a aba Geral) */}
          {secondaryCount > 0 && (
            <div
              className={cn(
                "rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5",
                secondaryPendingCount > 0
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-emerald-500/35 bg-emerald-500/10"
              )}
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  {secondaryPendingCount > 0 ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <PackageCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-bold",
                      secondaryPendingCount > 0
                        ? "text-amber-900 dark:text-amber-200"
                        : "text-emerald-900 dark:text-emerald-200"
                    )}
                  >
                    {secondaryPendingCount > 0
                      ? `Atenção na Implantação: ${secondaryCount} produto(s) secundário(s) vinculado(s) (${secondaryPendingCount} pendente(s) de conclusão/trâmite no 0800)`
                      : `${secondaryCount} produto(s) secundário(s) vinculado(s) — todos concluídos`}
                  </span>
                </div>

                {secondaryNames.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {secondaryNames.map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="bg-background/80 text-[11px] font-semibold text-foreground"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="button"
                size="sm"
                variant={secondaryPendingCount > 0 ? "default" : "outline"}
                className="h-8 shrink-0 gap-1.5 text-xs font-semibold self-start sm:self-center"
                onClick={() => {
                  onClose();
                  navigate(`/projects/${currentProject.id}?tab=secondary_products`);
                }}
              >
                Abrir Aba Produtos Secundários
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* 2. Aviso & Seção de Orion Admin quando aplicável */}
          <div className="mb-5">
            <OrionAdminSection
              stage={envStage}
              project={currentProject}
              canEdit={canEditFields}
              currentUserName={fullName || "Usuário"}
              onUpdate={handleSaveStageUpdates}
            />
          </div>

          <Separator className="my-4" />

          {/* 3. Espelhamento dos Dados de Conexão da Etapa 4 */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Dados de Conexão, Servidores e Banco de Dados (Postgres)
              </h3>
              {!canEditFields && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                  <Lock className="h-3 w-3" />
                  {!isAssigned ? "Bloqueado (Não Assumido)" : "Modo Somente Leitura"}
                </Badge>
              )}
            </div>

            <EnvironmentStageForm
              stage={envStage}
              canEditProjects={canEditFields}
              onUpdate={handleSaveStageUpdates}
              infraServers={currentProject.stages?.infra?.servers}
            />
          </div>

          <Separator className="my-4" />

          {/* 4. Observações da Configuração de Ambiente */}
          <div className="space-y-2 mb-5">
            <Label htmlFor="env-observations" className="text-xs font-bold text-foreground">
              Observações da Configuração de Ambiente
            </Label>
            <Textarea
              id="env-observations"
              rows={3}
              placeholder={
                !isAssigned
                  ? "Assuma a configuração para registrar observações deste ambiente..."
                  : "Descreva detalhes específicos, restrições ou passos tomados para a configuração deste ambiente..."
              }
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              onBlur={handleBlurObservations}
              disabled={!canEditFields}
              className="text-xs bg-background resize-y"
            />
          </div>

          {/* 5. Galeria de Imagens / Screenshots da Configuração */}
          <div className="space-y-3 mb-4">
            <EnvironmentScreenshots
              projectId={currentProject.id}
              screenshots={envStage.screenshots}
              onChange={(next) => handleSaveStageUpdates({ screenshots: next })}
              canEdit={canEditFields}
              uploadedBy={fullName || "Usuário"}
            />
          </div>

          <Separator className="my-4" />

          {/* 6. Histórico e Timeline de Ações do Ambiente */}
          <div className="space-y-3 mb-2 rounded-xl border bg-card/60 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico &amp; Timeline do Ambiente
              </h3>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {envStage.timeline?.length || 0} registro(s)
              </Badge>
            </div>

            {envStage.timeline && envStage.timeline.length > 0 ? (
              <div className="relative pl-6 space-y-3 border-l-2 border-border/80 ml-2 mt-2">
                {envStage.timeline.map((evt) => {
                  const dateStr = (() => {
                    try {
                      const d = new Date(evt.timestamp);
                      return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`;
                    } catch {
                      return evt.timestamp;
                    }
                  })();

                  return (
                    <div key={evt.id} className="relative group">
                      {/* Ponto indicador */}
                      <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-primary shadow-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      <div className="text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">{evt.author}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {dateStr}
                          </span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground leading-relaxed">
                          {evt.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-1">
                Nenhuma movimentação ou alteração registrada neste ambiente ainda.
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Rodapé do Modal */}
        <div className="p-3.5 sm:p-4 border-t bg-card/60 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs font-medium text-muted-foreground gap-1.5"
            onClick={() => {
              onClose();
              navigate(`/projects/${currentProject.id}?tab=steps`);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir Projeto Completo em /projects
          </Button>

          <Button
            type="button"
            size="sm"
            variant="default"
            className="text-xs font-semibold px-4"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
