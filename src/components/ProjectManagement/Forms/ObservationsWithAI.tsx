import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { recordProjectButtonLog } from "@/services/projectLogService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { convertBlocksToTiptap } from "@/lib/editor-utils";
import { appendPlainTextToLexicalJson, plainTextToLexicalJson } from "@/lib/lexical";
import {
  isLexicalContentEmpty,
  isValidLexicalState,
  STAGE_TRAFFIC_LIGHT_COLORS,
} from "@/utils/default-project-observations";
import { useImproveTextJobs } from "@/hooks/useImproveTextJobs";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { DtcAiJob, type ProjectV2 } from "@/types/ProjectV2";
import {
  Wand2,
  Loader2,
  Sparkles,
  RefreshCw,
  LayoutTemplate,
  History,
  X,
  Maximize2,
} from "lucide-react";
import { VoiceDictationButton } from "@/components/ui/voice-dictation-button";
import { ObservationsHistoryDialog } from "@/components/ProjectManagement/Forms/ObservationsHistoryDialog";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

function walkText(nodes: any[]): string {
  return nodes.map((n) => n.text ?? (n.children ? walkText(n.children) : "")).join("");
}

// Comprimento do texto puro (para habilitar/desabilitar o botao de IA).
function obsTextLen(obs?: string): number {
  if (!obs) return 0;
  try {
    const p = JSON.parse(obs);
    if (p?.root?.children) return walkText(p.root.children).trim().length;
  } catch {
    return obs.trim().length;
  }
  return obs.trim().length;
}

// Mesma conversao de conteudo legado usada pelo StageCard.
function getEditorContent(obs?: string): string | object {
  if (!obs) return "";
  try {
    const parsed = JSON.parse(obs);
    if (Array.isArray(parsed)) return convertBlocksToTiptap(parsed);
    return parsed;
  } catch {
    return obs;
  }
}

function formatAuditTimestamp(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

interface ObservationsWithAIProps {
  label?: string; // usado no placeholder padrao ("Detalhes da etapa de {label}...")
  title?: string; // rotulo do cabecalho (default "Observações & Detalhes")
  hideTitle?: boolean; // oculta o rotulo interno (ex.: quando um wrapper ja exibe o titulo)
  placeholder?: string;
  observations?: string;
  onChange: (obs: string) => void;
  canEdit: boolean;
  projectId?: string;
  requestedBy?: string;
  /** Quando true, ativa prompt estruturado de Observações Gerais (checklist + semáforo). */
  isGeneralObservations?: boolean;
  /** Habilita ditado por voz no editor. */
  enableVoice?: boolean;
  /** Metadados de rastreabilidade da última edição. */
  lastEditedBy?: string;
  lastEditedAt?: Date | string | null;
  /** Callback para inserir modelo padrão ("prepend" preserva texto abaixo; "replace" substitui). */
  onInsertDefaultTemplate?: (mode: "prepend" | "replace") => void;
  /** Callback para sincronizar status/responsáveis das etapas de forma não-destrutiva. */
  onSyncStages?: () => void;
  /** Key externa para forçar remount do Lexical quando o conteúdo muda fora do editor. */
  externalRefreshKey?: number;
  /** Contexto do projeto para menções inteligentes (@analista e #etapa). */
  project?: Partial<ProjectV2>;
  onNavigateToStage?: (stageId: string, route?: string) => void;
}

function countChecklistProgress(obs?: string): { done: number; total: number } {
  if (!obs) return { done: 0, total: 0 };
  try {
    const parsed = JSON.parse(obs);
    let done = 0;
    let total = 0;
    const walk = (nodes: any[]) => {
      for (const n of nodes || []) {
        if (n?.type === "listitem" && typeof n.checked === "boolean") {
          total += 1;
          if (n.checked) done += 1;
        }
        if (Array.isArray(n?.children)) walk(n.children);
      }
    };
    if (Array.isArray(parsed?.root?.children)) walk(parsed.root.children);
    return { done, total };
  } catch {
    return { done: 0, total: 0 };
  }
}

/**
 * Campo "Observacoes & Detalhes" das etapas 1-6 e "Observacoes Gerais" com botao
 * "Melhorar texto com IA". Reusa a fila dtc_ai_jobs (job_type='improve_text').
 */
export function ObservationsWithAI({
  label = "",
  title = "Observações & Detalhes",
  hideTitle = false,
  placeholder,
  observations,
  onChange,
  canEdit,
  projectId,
  requestedBy,
  isGeneralObservations = false,
  enableVoice = false,
  lastEditedBy,
  lastEditedAt,
  onInsertDefaultTemplate,
  onSyncStages,
  externalRefreshKey = 0,
  project,
  onNavigateToStage,
}: ObservationsWithAIProps) {
  const { online } = useModelWorkerStatus();
  const queryClient = useContext(QueryClientContext) || undefined;
  const awaitingRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFocusExpanded, setIsFocusExpanded] = useState(false);
  const [activeColorFilter, setActiveColorFilter] = useState<string | null>(null);

  const handleApplyVoiceText = (text: string, mode: "append" | "replace") => {
    const next =
      mode === "append"
        ? appendPlainTextToLexicalJson(observations, text)
        : plainTextToLexicalJson(text);
    onChange(next);
    setEditorKey((k) => k + 1);
  };

  const checklistProgress = useMemo(
    () => (isGeneralObservations ? countChecklistProgress(observations) : { done: 0, total: 0 }),
    [isGeneralObservations, observations],
  );

  const onResult = useCallback((job: DtcAiJob) => {
    if (!awaitingRef.current) return;
    awaitingRef.current = false;
    setRunning(false);
    const text = (job.resultText || "").trim();
    if (text) setPending(text);
  }, []);

  const { enqueueJob, activeJob } = useImproveTextJobs(projectId, onResult);
  const aiRunning =
    running || activeJob?.status === "processing" || activeJob?.status === "pending";
  const canImprove = canEdit && !aiRunning && online && obsTextLen(observations) >= 3;
  const isGeneral = isGeneralObservations || title === "Observações Gerais";

  const improve = () => {
    if (!canImprove || !projectId) return;
    awaitingRef.current = true;
    setRunning(true);
    enqueueJob.mutate({
      inputText: observations || "",
      requestedBy,
      jobType: "improve_text",
      targetField: isGeneral ? "general_observations" : "observations",
    });
    void recordProjectButtonLog({
      projectId,
      category: isGeneral ? "general" : "stages",
      tabLabel: isGeneral ? "Informações Gerais" : "Etapas",
      stageLabel: label || undefined,
      actionType: "ai_action",
      buttonLabel: "Melhorar texto com IA",
      message: `Solicitada melhoria de texto com IA em "${title}"${label ? ` (${label})` : ""}`,
      queryClient,
    });
  };

  const applyGenerated = () => {
    if (!pending) return;
    // Se a IA retornou um SerializedEditorState JSON válido (ex: general_observations),
    // aplica diretamente preservando headings, checklists, sub-bullets e cores; caso contrário,
    // converte Markdown leve para Lexical JSON.
    const nextLexical = isValidLexicalState(pending)
      ? pending
      : plainTextToLexicalJson(pending);
    onChange(nextLexical);
    setEditorKey((k) => k + 1); // forca remount para carregar o novo conteudo
    if (projectId) {
      void recordProjectButtonLog({
        projectId,
        category: isGeneral ? "general" : "stages",
        tabLabel: isGeneral ? "Informações Gerais" : "Etapas",
        stageLabel: label || undefined,
        actionType: "ai_action",
        buttonLabel: "Aplicar texto gerado pela IA",
        message: `Texto melhorado pela IA aplicado em "${title}"${label ? ` (${label})` : ""}`,
        queryClient,
      });
    }
    setPending(null);
  };

  const handleInsertTemplateClick = () => {
    if (!onInsertDefaultTemplate) return;
    if (isLexicalContentEmpty(observations)) {
      onInsertDefaultTemplate("replace");
      setEditorKey((k) => k + 1);
      return;
    }
    setTemplateConfirmOpen(true);
  };

  const formattedAuditDate = formatAuditTimestamp(lastEditedAt);
  const showAuditMeta = Boolean(
    isGeneral && lastEditedBy && lastEditedBy !== "User" && formattedAuditDate,
  );

  const improveTitle = !online
    ? "O gerador da IA está offline no momento"
    : obsTextLen(observations) < 3
    ? "Escreva algum texto antes de melhorar com IA"
    : aiRunning
    ? "Aguarde a geração em andamento"
    : "Reescreve este campo com IA (você revisa antes de aplicar)";

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-wrap items-center gap-2 ${
          hideTitle ? "justify-end" : "justify-between"
        }`}
      >
        {!hideTitle && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="h-0.5 w-6 bg-neutral-300 dark:bg-neutral-700 rounded-full shrink-0" />
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {title}
            </Label>
            {showAuditMeta && (
              <span className="border-l border-border pl-2 text-[11px] text-muted-foreground">
                Última edição por{" "}
                <span className="font-medium text-foreground/80">{lastEditedBy}</span> em{" "}
                {formattedAuditDate}
              </span>
            )}
            {isGeneral && projectId && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                title="Ver histórico visual de versões (diff) das Observações Gerais"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <History className="h-3 w-3" />
                <span>Histórico</span>
              </button>
            )}
          </div>
        )}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-1">
            {onSyncStages && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSyncStages();
                  setEditorKey((k) => k + 1);
                }}
                title="Atualiza status, responsáveis e datas das etapas preservando seus sub-bullets manuais"
                className="h-7 gap-1 px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sincronizar etapas</span>
              </Button>
            )}
            {onInsertDefaultTemplate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleInsertTemplateClick}
                title="Inserir modelo padrão de acompanhamento"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Inserir modelo padrão</span>
              </Button>
            )}
            {projectId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={improve}
                disabled={!canImprove}
                title={improveTitle}
                className="h-7 gap-1 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
              >
                {aiRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                {aiRunning ? "Melhorando…" : "Melhorar texto com IA"}
              </Button>
            )}
            {enableVoice && projectId && (
              <VoiceDictationButton
                projectId={projectId}
                requestedBy={requestedBy}
                onApply={handleApplyVoiceText}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFocusExpanded(true)}
              title="Modo Foco (Tela Cheia)"
              aria-label="Abrir editor em tela cheia"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div
        data-color-filter={activeColorFilter || undefined}
        className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50/10 dark:bg-neutral-950/5 w-full"
      >
        <RichTextEditor
          key={`${editorKey}-${externalRefreshKey}`}
          content={getEditorContent(observations)}
          onChange={onChange}
          placeholder={placeholder ?? `Detalhes da etapa de ${label}...`}
          editable={canEdit}
          enableVoice={enableVoice}
          projectId={projectId}
          requestedBy={requestedBy}
          project={project}
          onNavigateToStage={onNavigateToStage}
          hideFloatingControls
          expanded={isFocusExpanded}
          onExpandedChange={setIsFocusExpanded}
        />

        {/* Rodapé interativo com legenda/filtros de leitura por farol + progresso */}
        {isGeneral && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1.5">
              {STAGE_TRAFFIC_LIGHT_COLORS.map((item) => {
                const isSelected = activeColorFilter === item.hex;
                return (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() =>
                      setActiveColorFilter((prev) => (prev === item.hex ? null : item.hex))
                    }
                    title={`Filtrar leitura por: ${item.label}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground shadow-xs"
                        : "border-transparent hover:border-border hover:bg-accent/60",
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span>{item.label.split(" / ")[0]}</span>
                  </button>
                );
              })}
              {activeColorFilter && (
                <button
                  type="button"
                  onClick={() => setActiveColorFilter(null)}
                  className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-accent"
                >
                  <X className="h-2.5 w-2.5" />
                  Limpar filtro
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-[10.5px]">
              {checklistProgress.total > 0 && (
                <span className="font-semibold text-foreground/80">
                  {checklistProgress.done}/{checklistProgress.total} concluídas
                </span>
              )}
              <span className="hidden sm:inline">
                Digite <kbd className="rounded border border-border bg-card px-1 font-mono text-[10px]">@</kbd> analista ou{" "}
                <kbd className="rounded border border-border bg-card px-1 font-mono text-[10px]">#</kbd> etapa
              </span>
            </div>
          </div>
        )}
      </div>

      {isGeneral && projectId && (
        <ObservationsHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          projectId={projectId}
          canEdit={canEdit}
          onRestoreVersion={(plainTextVersion) => {
            onChange(plainTextToLexicalJson(plainTextVersion));
            setEditorKey((k) => k + 1);
          }}
        />
      )}

      {/* Confirmacao: manter meu texto ou substituir pelo gerado pela IA */}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Texto melhorado pela IA
            </AlertDialogTitle>
            <AlertDialogDescription>
              Revise o texto gerado. Você pode manter o seu texto atual ou substituí-lo
              pelo texto abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[45vh] overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 p-3 text-sm whitespace-pre-wrap">
            {pending && isValidLexicalState(pending)
              ? walkText(JSON.parse(pending).root.children)
              : pending}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter meu texto</AlertDialogCancel>
            <AlertDialogAction
              onClick={applyGenerated}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Substituir pelo gerado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmacao ao inserir modelo padrao quando ja ha texto */}
      <AlertDialog open={templateConfirmOpen} onOpenChange={setTemplateConfirmOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Inserir modelo padrão</AlertDialogTitle>
            <AlertDialogDescription>
              Este campo já possui observações preenchidas. Como você prefere aplicar o
              modelo padrão?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onInsertDefaultTemplate?.("replace");
                setEditorKey((k) => k + 1);
                setTemplateConfirmOpen(false);
              }}
            >
              Substituir tudo
            </Button>
            <AlertDialogAction
              onClick={() => {
                onInsertDefaultTemplate?.("prepend");
                setEditorKey((k) => k + 1);
                setTemplateConfirmOpen(false);
              }}
            >
              Inserir no topo (preservar texto)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
