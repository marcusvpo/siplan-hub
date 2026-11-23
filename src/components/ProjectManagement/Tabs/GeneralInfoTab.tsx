import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectV2, ContentBlock } from "@/types/ProjectV2";
import { useProjectForm } from "@/hooks/useProjectForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Server,
  Database,
  RefreshCw,
  Rocket,
  Power,
  Check,
  FileEdit,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectHeaderForm } from "@/components/ProjectManagement/Forms/ProjectHeaderForm";
import { ObservationsWithAI } from "@/components/ProjectManagement/Forms/ObservationsWithAI";
import { StageNotesAccordion } from "@/components/ProjectManagement/Forms/StageNotesAccordion";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  createDefaultObservationsState,
  isLexicalContentEmpty,
  prependDefaultObservationsToLexical,
  syncProjectStagesIntoObservations,
} from "@/utils/default-project-observations";
import { computeObservationsDrift } from "@/utils/project-observations-sync";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
  onStageClick?: (stageId: string) => void;
  onOpenSecondaryTab?: () => void;
}

export function GeneralInfoTab({
  project,
  onUpdate,
  onStageClick,
  onOpenSecondaryTab,
}: TabProps) {
  // We use useProjectForm mainly for Autosave management of Notes here
  const { data, updateField, saveState } = useProjectForm(project, onUpdate);
  const { canEditProjects } = usePermissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserName =
    user?.user_metadata?.full_name || user?.email || "Usuário";

  const isOrionTN =
    project.systemType === "Orion TN" ||
    project.systemType === "Modelos TN" ||
    project.products?.includes("Orion TN") ||
    project.products?.includes("OrionTN");

  const isModelosTN = project.systemType === "Modelos TN";

  const baseStages = isModelosTN ? [] : [
    {
      id: "infra",
      label: "Infraestrutura",
      status: data.stages.infra.status,
      icon: Server,
    },
    {
      id: "adherence",
      label: "Aderência",
      status: data.stages.adherence.status,
      icon: CheckCircle2,
    },
    {
      id: "conversion",
      label: "Conversão",
      status: data.stages.conversion.status,
      icon: RefreshCw,
    },
    {
      id: "environment",
      label: "Ambiente",
      status: data.stages.environment.status,
      icon: Database,
    },
  ];

  const orionStages = isOrionTN ? [{
    id: "modelosEditor",
    label: "Modelos Editor",
    status: data.stages.modelosEditor?.status || "todo",
    icon: FileEdit,
  }] : [];

  const endStages = [
    {
      id: "implementation",
      label: "Implantação",
      status: data.stages.implementation.status,
      icon: Rocket,
    },
    ...(isModelosTN ? [] : [{
      id: "post",
      label: "Pós-Implantação",
      status: data.stages.post.status,
      icon: Power,
    }]),
  ];

  const stages = [...baseStages, ...orionStages, ...endStages];

  // Conteudo bruto (string Lexical) guardado no primeiro bloco de notes.
  const notesContent = data.notes?.blocks?.[0]?.content || "";

  const [editorRefreshKey, setEditorRefreshKey] = useState(0);
  const [driftDismissed, setDriftDismissed] = useState(false);
  const [concurrencyConflict, setConcurrencyConflict] = useState<{
    editedBy: string;
    editedAt: string;
    remoteNotes: ProjectV2["notes"];
    pendingContent: string;
  } | null>(null);

  const observationsDrift = useMemo(
    () => computeObservationsDrift(notesContent, data),
    [notesContent, data],
  );

  const handleNavigateToMentionStage = (stageId: string, route?: string) => {
    if (route) {
      navigate(route);
      return;
    }
    onStageClick?.(stageId);
  };

  const initializedProjectRef = useRef<string | null>(null);
  const loadedNotesAtRef = useRef<number>(
    project.notes?.lastEditedAt ? new Date(project.notes.lastEditedAt).getTime() : 0,
  );
  const lastConflictCheckRef = useRef<number>(0);

  // Atualiza baseline de timestamp quando troca de projeto
  useEffect(() => {
    loadedNotesAtRef.current = project.notes?.lastEditedAt
      ? new Date(project.notes.lastEditedAt).getTime()
      : 0;
    setConcurrencyConflict(null);
    setDriftDismissed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const applyNotesUpdate = (content: string, forceTimestamp?: Date) => {
    const now = forceTimestamp || new Date();
    const blocks: ContentBlock[] = [
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        content,
        checked: false,
      },
    ];

    const newNotes = {
      ...data.notes,
      id: data.notes?.id || crypto.randomUUID(),
      projectId: data.id,
      blocks,
      lastEditedBy: currentUserName,
      lastEditedAt: now,
    };

    loadedNotesAtRef.current = now.getTime();
    updateField("notes", newNotes);
  };

  // Auto-inicializa projetos ativos/pausados que abrirem com Observações Gerais vazio
  useEffect(() => {
    if (!canEditProjects) return;
    if (initializedProjectRef.current === data.id) return;
    const isActiveOrPaused =
      data.globalStatus === "in-progress" || data.globalStatus === "blocked";
    if (!isActiveOrPaused) return;

    initializedProjectRef.current = data.id;
    if (isLexicalContentEmpty(notesContent)) {
      const initialContent = createDefaultObservationsState(data);
      applyNotesUpdate(initialContent);
      setEditorRefreshKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id, data.globalStatus, canEditProjects]);

  const updateEditorContent = (content: string) => {
    // Se já há um conflito aberto, apenas mantém o rascunho pendente até o usuário decidir
    if (concurrencyConflict) {
      setConcurrencyConflict((prev) =>
        prev ? { ...prev, pendingContent: content } : null,
      );
      return;
    }

    // Proteção leve contra sobrescrita concorrente (verifica no máximo a cada 8s)
    const nowMs = Date.now();
    const shouldCheckRemote =
      Boolean(data.id) && nowMs - lastConflictCheckRef.current > 8000;

    if (shouldCheckRemote) {
      lastConflictCheckRef.current = nowMs;
      void (async () => {
        try {
          const { data: remoteRow } = await supabase
            .from("projects")
            .select("notes, updated_at")
            .eq("id", data.id)
            .maybeSingle();

          const remoteNotes = remoteRow?.notes as ProjectV2["notes"] | null | undefined;
          const remoteTime = remoteNotes?.lastEditedAt
            ? new Date(remoteNotes.lastEditedAt).getTime()
            : 0;
          const remoteAuthor = remoteNotes?.lastEditedBy?.trim();

          if (
            remoteTime > loadedNotesAtRef.current + 2000 &&
            remoteAuthor &&
            remoteAuthor !== "User" &&
            remoteAuthor !== currentUserName
          ) {
            setConcurrencyConflict({
              editedBy: remoteAuthor,
              editedAt: new Date(remoteTime).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              remoteNotes: remoteNotes || undefined,
              pendingContent: content,
            });
            return;
          }
        } catch {
          // Best-effort: em erro de rede, não bloqueia edição local
        }
        applyNotesUpdate(content);
      })();
      return;
    }

    applyNotesUpdate(content);
  };

  const handleReloadRemoteNotes = () => {
    if (!concurrencyConflict?.remoteNotes) {
      setConcurrencyConflict(null);
      return;
    }
    const remote = concurrencyConflict.remoteNotes;
    loadedNotesAtRef.current = remote.lastEditedAt
      ? new Date(remote.lastEditedAt).getTime()
      : Date.now();
    updateField("notes", remote);
    setConcurrencyConflict(null);
    setEditorRefreshKey((k) => k + 1);
    toast.success("Versão mais recente das Observações Gerais recarregada.");
  };

  const handleForceSaveNotes = () => {
    if (!concurrencyConflict) return;
    const pending = concurrencyConflict.pendingContent;
    setConcurrencyConflict(null);
    applyNotesUpdate(pending);
    toast.success("Suas alterações foram mantidas e salvas.");
  };

  const handleInsertDefaultTemplate = (mode: "prepend" | "replace") => {
    const nextContent =
      mode === "prepend"
        ? prependDefaultObservationsToLexical(notesContent, data)
        : createDefaultObservationsState(data);
    applyNotesUpdate(nextContent);
    setEditorRefreshKey((k) => k + 1);
    toast.success(
      mode === "prepend"
        ? "Modelo padrão inserido no topo preservando o texto anterior."
        : "Modelo padrão aplicado em Observações Gerais.",
    );
  };

  const handleSyncStages = () => {
    const { content, updatedCount } = syncProjectStagesIntoObservations(notesContent, data);
    applyNotesUpdate(content);
    setEditorRefreshKey((k) => k + 1);
    toast.success(
      updatedCount > 0
        ? `Sincronização concluída (${updatedCount} ${updatedCount === 1 ? "linha atualizada" : "linhas atualizadas"}) preservando suas anotações.`
        : "Observações Gerais sincronizadas com as etapas do projeto.",
    );
  };

  const secondaryCount = project.secondaryTicketsCount || 0;
  const secondaryPendingCount = project.secondaryTicketsPendingCount || 0;
  const secondaryNames = project.secondaryProductsNames || [];

  return (
    <div className="w-full min-w-0 space-y-3 pb-2">
      {/* Feedback Visual do Autosave */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-16 z-50 md:right-4">
        {saveState.status === "saving" && (
          <Badge variant="secondary" className="animate-pulse">
            Salvando...
          </Badge>
        )}
        {saveState.status === "success" && (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
          >
            {saveState.message}
          </Badge>
        )}
        {saveState.status === "error" && (
          <Badge variant="destructive">{saveState.message}</Badge>
        )}
      </div>

      {/* 1. Pipeline Visual Moderno */}
      <div data-testid="project-stage-overview" className="relative w-full overflow-hidden rounded-xl border bg-card/50 px-2 py-2 shadow-sm backdrop-blur-sm sm:overflow-x-auto sm:rounded-2xl sm:px-4 scrollbar-none">
        <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-2 gap-2 py-1 sm:flex sm:min-w-[500px] sm:items-center sm:justify-between sm:gap-0">
          {/* Connecting Line */}
          <div className="absolute top-[1.3rem] left-0 right-0 -z-10 hidden h-0.5 rounded-full bg-muted sm:block" />

          {/* Active Progress Line */}
          <div
            className="absolute top-[1.3rem] left-0 -z-10 hidden h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-in-out sm:block"
            style={{
              width: `${Math.min(
                100,
                Math.max(
                  0,
                  (stages.reduce((acc, stage, index) => {
                    if (
                      stage.status === "done" ||
                      stage.status === "in-progress" ||
                      stage.status === "waiting_adjustment" ||
                      stage.status === "blocked"
                    )
                      return index;
                    return acc;
                  }, 0) /
                    (stages.length - 1)) *
                  100
                )
              )}%`,
            }}
          />

          {stages.map((stage) => {
            const Icon = stage.icon;
            const isDone = stage.status === "done";
            const isActive = stage.status === "in-progress";
            const isWaitingAdjustment = stage.status === "waiting_adjustment";
            const isBlocked = stage.status === "blocked";

            return (
              <div
                key={stage.id}
                className="group relative flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg bg-background/50 p-2 sm:bg-transparent sm:p-0"
                onClick={() => onStageClick?.(stage.id)}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl rotate-2 flex items-center justify-center transition-all duration-500 border-2 shadow-md",
                    isDone
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-emerald-500/30 rotate-0"
                      : isWaitingAdjustment
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 text-white shadow-orange-500/30 scale-105 -rotate-2 ring-4 ring-orange-500/20"
                        : isBlocked
                          ? "bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 text-white shadow-amber-500/30 scale-105"
                          : isActive
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 text-white shadow-blue-500/30 scale-110 -rotate-3 ring-4 ring-blue-500/20"
                            : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {isDone ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="max-w-full rounded-md border border-transparent bg-background/80 px-1.5 py-0.5 text-center backdrop-blur-md transition-colors group-hover:border-border/50">
                  <p
                    className={cn(
                      "break-words text-[9px] font-bold uppercase tracking-wide sm:text-[10px] sm:tracking-widest",
                      isDone
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isWaitingAdjustment
                          ? "text-orange-600 dark:text-orange-400"
                          : isBlocked
                            ? "text-amber-600 dark:text-amber-400"
                            : isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                    {isWaitingAdjustment && (
                      <span className="block text-[8px] font-medium text-orange-500 dark:text-orange-300 mt-0.5">
                        Em Adequação
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner de Destaque: Produtos Secundários Contratados */}
      {secondaryCount > 0 && (
        <div
          className={cn(
            "flex flex-col gap-2.5 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5",
            secondaryPendingCount > 0
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-emerald-500/35 bg-emerald-500/10"
          )}
        >
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {secondaryPendingCount > 0 ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <PackageCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span
                className={cn(
                  "text-xs font-bold sm:text-sm",
                  secondaryPendingCount > 0
                    ? "text-amber-900 dark:text-amber-200"
                    : "text-emerald-900 dark:text-emerald-200"
                )}
              >
                {secondaryPendingCount > 0
                  ? `Atenção na Implantação: ${secondaryCount} produto(s) secundário(s) vinculado(s) (${secondaryPendingCount} pendente(s) de conclusão/trâmite no 0800)`
                  : `${secondaryCount} produto(s) secundário(s) vinculado(s) — todos encaminhados/concluídos`}
              </span>
            </div>
            {secondaryNames.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {secondaryNames.map((prodName) => (
                  <Badge
                    key={prodName}
                    variant="outline"
                    className="bg-background/80 text-[11px] font-semibold text-foreground"
                  >
                    {prodName}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {onOpenSecondaryTab && (
            <Button
              type="button"
              size="sm"
              variant={secondaryPendingCount > 0 ? "default" : "outline"}
              className="h-9 shrink-0 gap-1.5 text-xs font-semibold"
              onClick={onOpenSecondaryTab}
            >
              Abrir Aba Produtos Secundários
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* 2. Dados do Projeto (Componente Extraído) */}
      <ProjectHeaderForm
        project={data}
        onProjectUpdated={(patch) => {
          if (patch) {
            if (patch.soldHours !== undefined) updateField("soldHours", patch.soldHours);
            if (patch.legacySystem !== undefined) updateField("legacySystem", patch.legacySystem);
          }
        }}
      />

      {/* 3. Observações Gerais (Rich Editor + Semáforo + Sincronização com Etapas + IA) */}
      <div className="space-y-3 pt-2">
        {/* Banner Inteligente: Detecção Automática de Desatualização das Etapas */}
        {canEditProjects && observationsDrift.hasDrift && !driftDismissed && (
          <div className="flex flex-col gap-2 rounded-lg border border-blue-500/35 bg-blue-500/10 p-3 text-xs text-blue-900 dark:text-blue-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>
                  {observationsDrift.driftedStages.length}{" "}
                  {observationsDrift.driftedStages.length === 1
                    ? "etapa foi atualizada"
                    : "etapas foram atualizadas"}
                </strong>{" "}
                desde a última edição (
                {observationsDrift.driftedStages.map((d) => d.label).join(", ")}). Deseja
                sincronizar as linhas preservando suas anotações manuais?
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  handleSyncStages();
                  setDriftDismissed(true);
                }}
                className="h-7 bg-blue-600 text-xs text-white hover:bg-blue-700"
              >
                Atualizar linhas
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDriftDismissed(true)}
                className="h-7 text-xs"
              >
                Ignorar
              </Button>
            </div>
          </div>
        )}

        {concurrencyConflict && (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-500/45 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Edição concorrente detectada:</strong>{" "}
                <strong>{concurrencyConflict.editedBy}</strong> atualizou este campo às{" "}
                {concurrencyConflict.editedAt}. Escolha como prosseguir para não sobrescrever
                alterações:
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleReloadRemoteNotes}
                className="h-7 text-xs"
              >
                Recarregar versão atual
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleForceSaveNotes}
                className="h-7 text-xs"
              >
                Manter e forçar salvamento
              </Button>
            </div>
          </div>
        )}

        <ObservationsWithAI
          title="Observações Gerais"
          placeholder="Digite suas observações gerais aqui..."
          observations={notesContent}
          onChange={updateEditorContent}
          canEdit={canEditProjects}
          projectId={data.id}
          requestedBy={currentUserName}
          isGeneralObservations
          enableVoice
          lastEditedBy={data.notes?.lastEditedBy}
          lastEditedAt={data.notes?.lastEditedAt}
          onInsertDefaultTemplate={handleInsertDefaultTemplate}
          onSyncStages={handleSyncStages}
          externalRefreshKey={editorRefreshKey}
          project={data}
          onNavigateToStage={handleNavigateToMentionStage}
        />

        {/* 4. Ponte Passiva: Notas das Etapas (somente leitura, recolhido por padrão) */}
        <StageNotesAccordion project={data} onOpenStage={onStageClick} />
      </div>
    </div>
  );
}
