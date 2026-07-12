import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { convertBlocksToTiptap } from "@/lib/editor-utils";
import { plainTextToLexicalJson } from "@/lib/lexical";
import { useImproveTextJobs } from "@/hooks/useImproveTextJobs";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { DtcAiJob } from "@/types/ProjectV2";
import { Wand2, Loader2, Sparkles } from "lucide-react";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

interface ObservationsWithAIProps {
  label?: string; // usado no placeholder padrao ("Detalhes da etapa de {label}...")
  title?: string; // rotulo do cabecalho (default "Observações & Detalhes")
  placeholder?: string;
  observations?: string;
  onChange: (obs: string) => void;
  canEdit: boolean;
  projectId?: string;
  requestedBy?: string;
}

/**
 * Campo "Observacoes & Detalhes" das etapas 1-6 com botao "Melhorar texto com IA".
 * Reusa a fila dtc_ai_jobs (job_type='improve_text') do mesmo worker da etapa 7.
 * O usuario revisa (manter/substituir) antes de o texto gerado ser aplicado.
 */
export function ObservationsWithAI({
  label = "",
  title = "Observações & Detalhes",
  placeholder,
  observations,
  onChange,
  canEdit,
  projectId,
  requestedBy,
}: ObservationsWithAIProps) {
  const { online } = useModelWorkerStatus();
  const awaitingRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [pending, setPending] = useState<string | null>(null);

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

  const improve = () => {
    if (!canImprove || !projectId) return;
    awaitingRef.current = true;
    setRunning(true);
    enqueueJob.mutate({ inputText: observations || "", requestedBy, jobType: "improve_text" });
  };

  const applyGenerated = () => {
    if (!pending) return;
    onChange(plainTextToLexicalJson(pending));
    setEditorKey((k) => k + 1); // forca remount para carregar o novo conteudo
    setPending(null);
  };

  const improveTitle = !online
    ? "O gerador da IA está offline no momento"
    : obsTextLen(observations) < 3
    ? "Escreva algum texto antes de melhorar com IA"
    : aiRunning
    ? "Aguarde a geração em andamento"
    : "Reescreve este campo com IA (você revisa antes de aplicar)";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-slate-300 dark:bg-slate-700 rounded-full" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </Label>
        </div>
        {canEdit && projectId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={improve}
            disabled={!canImprove}
            title={improveTitle}
            className="h-7 gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
          >
            {aiRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {aiRunning ? "Melhorando…" : "Melhorar texto com IA"}
          </Button>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/10 dark:bg-slate-950/5 w-full">
        <RichTextEditor
          key={editorKey}
          content={getEditorContent(observations)}
          onChange={onChange}
          placeholder={placeholder ?? `Detalhes da etapa de ${label}...`}
          editable={canEdit}
        />
      </div>

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
          <div className="max-h-[45vh] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3 text-sm whitespace-pre-wrap">
            {pending}
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
    </div>
  );
}
