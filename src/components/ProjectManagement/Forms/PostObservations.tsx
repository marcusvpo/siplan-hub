import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { plainTextToLexicalJson } from "@/lib/lexical";
import { cn } from "@/lib/utils";
import { useImproveTextJobs } from "@/hooks/useImproveTextJobs";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { DtcAiJob } from "@/types/ProjectV2";
import { Plus, Trash2, Sparkles, Loader2, Wand2, FileText, ChevronDown, ChevronRight } from "lucide-react";
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

interface Block {
  id: string;
  content: string; // JSON serializado do Lexical (ou texto legado)
  editorKey: number; // incrementa para forcar remount ao aplicar texto da IA
}

// Alvo de uma geracao com IA em andamento: um bloco especifico ou o resumo geral.
type AiTarget = { kind: "block"; id: string } | { kind: "summary" };

const SUMMARY_ID = "__summary__";

const newId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `b_${Math.round(Math.random() * 1e9)}`;

const makeBlock = (content = "", id?: string): Block => ({
  id: id || newId(),
  content,
  editorKey: 0,
});

interface PostState {
  blocks: Block[];
  summary: Block;
}

// Formato multi-bloco persistido em post_observations:
// {"v":2,"blocks":[{id,content}],"summary":"<lexical>"}.
// Retrocompatibilidade: valor legado (string unica do Lexical/texto) vira 1 bloco.
function parseState(obs?: string): PostState {
  const empty: PostState = { blocks: [makeBlock("")], summary: makeBlock("", SUMMARY_ID) };
  if (!obs || !obs.trim()) return empty;
  try {
    const p = JSON.parse(obs);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (p && p.v === 2 && Array.isArray(p.blocks)) {
      const blocks = (p.blocks as any[]).map((b) =>
        makeBlock(
          typeof b?.content === "string" ? b.content : b?.content ? JSON.stringify(b.content) : "",
          typeof b?.id === "string" ? b.id : undefined
        )
      );
      const summaryContent =
        typeof p.summary === "string" ? p.summary : p.summary ? JSON.stringify(p.summary) : "";
      return {
        blocks: blocks.length ? blocks : [makeBlock("")],
        summary: makeBlock(summaryContent, SUMMARY_ID),
      };
    }
  } catch {
    /* valor legado (nao e o wrapper): trata como bloco unico */
  }
  return { blocks: [makeBlock(obs)], summary: makeBlock("", SUMMARY_ID) };
}

function serialize(blocks: Block[], summary: Block): string {
  return JSON.stringify({
    v: 2,
    blocks: blocks.map((b) => ({ id: b.id, content: b.content })),
    summary: summary.content,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkText(nodes: any[]): string {
  return nodes.map((n) => n.text ?? (n.children ? walkText(n.children) : "")).join("");
}

// Comprimento do texto puro de um bloco (para habilitar/desabilitar botoes de IA).
function blockTextLen(content: string): number {
  if (!content) return 0;
  try {
    const p = JSON.parse(content);
    if (p?.root?.children) return walkText(p.root.children).trim().length;
  } catch {
    return content.trim().length;
  }
  return content.trim().length;
}

// Texto puro de um bloco preservando quebras por paragrafo/item (para o resumo).
function blockToPlain(content: string): string {
  if (!content) return "";
  try {
    const p = JSON.parse(content);
    if (!p?.root?.children) return content.trim();
    const lines: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (nodes: any[]): void => {
      for (const node of nodes) {
        if (node?.type === "text" && typeof node.text === "string") {
          if (lines.length === 0) lines.push("");
          lines[lines.length - 1] += node.text;
        } else if (node?.type === "listitem") {
          lines.push("- ");
          if (Array.isArray(node.children)) walk(node.children);
        } else if (node?.type === "paragraph") {
          lines.push("");
          if (Array.isArray(node.children)) walk(node.children);
        } else if (Array.isArray(node?.children)) {
          walk(node.children);
        }
      }
    };
    walk(p.root.children);
    return lines.map((l) => l.trimEnd()).filter((l) => l !== "").join("\n").trim();
  } catch {
    return content.trim();
  }
}

interface PostObservationsProps {
  observations?: string;
  onChange: (obs: string) => void;
  canEdit: boolean;
  projectId?: string;
  requestedBy?: string;
}

export function PostObservations({
  observations,
  onChange,
  canEdit,
  projectId,
  requestedBy,
}: PostObservationsProps) {
  const initial = parseState(observations);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [summary, setSummary] = useState<Block>(initial.summary);
  const lastEmitted = useRef<string | undefined>(observations);

  // Sincroniza quando o valor vem de fora (carga inicial / troca de projeto) e nao
  // foi este componente quem emitiu - evita sobrescrever o que o usuario digita.
  useEffect(() => {
    if (observations !== lastEmitted.current) {
      lastEmitted.current = observations;
      const s = parseState(observations);
      setBlocks(s.blocks);
      setSummary(s.summary);
    }
  }, [observations]);

  const commit = useCallback(
    (nextBlocks: Block[], nextSummary: Block) => {
      setBlocks(nextBlocks);
      setSummary(nextSummary);
      const s = serialize(nextBlocks, nextSummary);
      lastEmitted.current = s;
      onChange(s);
    },
    [onChange]
  );

  const updateBlock = (id: string, content: string) =>
    commit(blocks.map((b) => (b.id === id ? { ...b, content } : b)), summary);
  const addBlock = () => commit([...blocks, makeBlock("")], summary);
  const removeBlock = (id: string) => commit(blocks.filter((b) => b.id !== id), summary);
  const updateSummary = (content: string) => commit(blocks, { ...summary, content });

  // --- IA (melhorar bloco / gerar resumo) ---
  const { online } = useModelWorkerStatus();
  const aiTargetRef = useRef<AiTarget | null>(null);
  const [aiTarget, setAiTarget] = useState<AiTarget | null>(null);
  const [pending, setPending] = useState<{ target: AiTarget; generated: string } | null>(null);

  // Colapsar/expandir cada secao (recolhidas por padrao)
  const [obsOpen, setObsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const onResult = useCallback((job: DtcAiJob) => {
    const text = (job.resultText || "").trim();
    const target = aiTargetRef.current;
    aiTargetRef.current = null;
    setAiTarget(null);
    if (!text || !target) return;
    setPending({ target, generated: text });
  }, []);

  const { enqueueJob, activeJob } = useImproveTextJobs(projectId, onResult);
  const aiRunning =
    !!aiTarget || activeJob?.status === "processing" || activeJob?.status === "pending";

  const improveBlock = (b: Block) => {
    if (aiRunning || !canEdit) return;
    aiTargetRef.current = { kind: "block", id: b.id };
    setAiTarget({ kind: "block", id: b.id });
    enqueueJob.mutate({ inputText: b.content || "", requestedBy, jobType: "improve_text" });
  };

  const hasBlockText = blocks.some((b) => blockTextLen(b.content) >= 3);

  const generateSummary = () => {
    if (aiRunning || !canEdit) return;
    // Junta o texto de todos os blocos, rotulado, para o resumo consolidar tudo.
    const combined = blocks
      .map((b, i) => {
        const t = blockToPlain(b.content);
        return t ? `Bloco ${i + 1}:\n${t}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
    if (combined.trim().length < 3) return;
    aiTargetRef.current = { kind: "summary" };
    setAiTarget({ kind: "summary" });
    enqueueJob.mutate({ inputText: combined, requestedBy, jobType: "summary_blocks" });
  };

  const applyGenerated = () => {
    if (!pending) return;
    const lexical = plainTextToLexicalJson(pending.generated);
    if (pending.target.kind === "summary") {
      commit(blocks, { ...summary, content: lexical, editorKey: summary.editorKey + 1 });
    } else {
      const id = pending.target.id;
      commit(
        blocks.map((b) => (b.id === id ? { ...b, content: lexical, editorKey: b.editorKey + 1 } : b)),
        summary
      );
    }
    setPending(null);
  };

  const summaryGenerating = aiTarget?.kind === "summary";
  const canSummarize = canEdit && !aiRunning && online && hasBlockText;
  const summaryTitle = !online
    ? "O gerador da IA está offline no momento"
    : !hasBlockText
    ? "Escreva algo nos blocos de Observações & Detalhes antes de gerar o resumo"
    : aiRunning
    ? "Aguarde a geração em andamento"
    : "Lê todos os blocos e gera um resumo (você revisa antes de aplicar)";

  return (
    <div className="space-y-4">
      {/* ===== Observações & Detalhes (multi-bloco) ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setObsOpen((v) => !v)}
            className="flex items-center gap-1.5 group"
            title={obsOpen ? "Recolher" : "Expandir"}
          >
            {obsOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground cursor-pointer group-hover:text-foreground transition-colors">
              Observações & Detalhes
            </Label>
            {blocks.length > 1 && (
              <span className="text-[10px] font-medium text-muted-foreground">
                ({blocks.length} blocos)
              </span>
            )}
          </button>
          {canEdit && obsOpen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBlock}
              className="h-7 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar bloco
            </Button>
          )}
        </div>

        {obsOpen && blocks.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">
            Nenhum bloco. Clique em "Adicionar bloco" para incluir observações.
          </p>
        )}

        <div className={cn("space-y-3", !obsOpen && "hidden")}>
          {blocks.map((block, idx) => {
            const generating = aiTarget?.kind === "block" && aiTarget.id === block.id;
            const canImprove = canEdit && !aiRunning && online && blockTextLen(block.content) >= 3;
            const improveTitle = !online
              ? "O gerador da IA está offline no momento"
              : blockTextLen(block.content) < 3
              ? "Escreva algum texto no bloco antes de melhorar com IA"
              : aiRunning
              ? "Aguarde a geração em andamento"
              : "Reescreve este bloco com IA (você revisa antes de aplicar)";

            return (
              <div
                key={`${block.id}:${block.editorKey}`}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-950/5"
              >
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Bloco {idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => improveBlock(block)}
                        disabled={!canImprove}
                        title={improveTitle}
                        className="h-7 gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                      >
                        {generating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5" />
                        )}
                        {generating ? "Melhorando…" : "Melhorar texto com IA"}
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBlock(block.id)}
                        title="Excluir este bloco"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="overflow-hidden">
                  <RichTextEditor
                    content={block.content}
                    onChange={(content) => updateBlock(block.id, content)}
                    placeholder={`Detalhes da pós-implantação (bloco ${idx + 1})...`}
                    editable={canEdit}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Resumo Geral ===== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            className="flex items-center gap-1.5 group"
            title={summaryOpen ? "Recolher" : "Expandir"}
          >
            {summaryOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 cursor-pointer group-hover:text-foreground transition-colors">
              <FileText className="h-3 w-3 text-indigo-500" />
              Resumo Geral
            </Label>
          </button>
          {canEdit && summaryOpen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateSummary}
              disabled={!canSummarize}
              title={summaryTitle}
              className="h-7 gap-1 text-xs text-indigo-600 border-indigo-200 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900/50 dark:hover:bg-indigo-950/30"
            >
              {summaryGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {summaryGenerating ? "Gerando…" : "Gerar resumo com IA"}
            </Button>
          )}
        </div>
        <div className={cn("space-y-2", !summaryOpen && "hidden")}>
          <p className="text-[11px] text-muted-foreground px-1">
            Consolida todos os blocos de Observações & Detalhes. Digite manualmente ou gere com IA.
          </p>
          <div className="rounded-lg border border-indigo-100 dark:border-indigo-900/40 overflow-hidden bg-indigo-50/20 dark:bg-indigo-950/10">
            <RichTextEditor
              key={`${summary.id}:${summary.editorKey}`}
              content={summary.content}
              onChange={updateSummary}
              placeholder="Resumo geral da pós-implantação..."
              editable={canEdit}
            />
          </div>
        </div>
      </div>

      {/* Confirmacao: manter meu texto ou substituir pelo gerado pela IA */}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              {pending?.target.kind === "summary" ? "Resumo gerado pela IA" : "Texto melhorado pela IA"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Revise o texto gerado. Você pode manter o seu texto atual ou substituí-lo
              pelo texto abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[45vh] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3 text-sm whitespace-pre-wrap">
            {pending?.generated}
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
