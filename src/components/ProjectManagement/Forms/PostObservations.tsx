import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { plainTextToLexicalJson } from "@/lib/lexical";
import { useImproveTextJobs } from "@/hooks/useImproveTextJobs";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { DtcAiJob } from "@/types/ProjectV2";
import { Plus, Trash2, Sparkles, Loader2, Wand2 } from "lucide-react";
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

const newId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `b_${Math.round(Math.random() * 1e9)}`;

const makeBlock = (content = "", id?: string): Block => ({
  id: id || newId(),
  content,
  editorKey: 0,
});

// Formato multi-bloco persistido em post_observations: {"v":2,"blocks":[{id,content}]}.
// Retrocompatibilidade: valor legado (string unica do Lexical/texto) vira 1 bloco.
function parseBlocks(obs?: string): Block[] {
  if (!obs || !obs.trim()) return [makeBlock("")];
  try {
    const p = JSON.parse(obs);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (p && p.v === 2 && Array.isArray(p.blocks)) {
      const bs = (p.blocks as any[]).map((b) =>
        makeBlock(
          typeof b?.content === "string" ? b.content : b?.content ? JSON.stringify(b.content) : "",
          typeof b?.id === "string" ? b.id : undefined
        )
      );
      return bs.length ? bs : [makeBlock("")];
    }
  } catch {
    /* valor legado (nao e o wrapper): trata como bloco unico */
  }
  return [makeBlock(obs)];
}

function serialize(blocks: Block[]): string {
  return JSON.stringify({ v: 2, blocks: blocks.map((b) => ({ id: b.id, content: b.content })) });
}

// Comprimento do texto puro de um bloco (para habilitar/desabilitar o botao de IA).
function blockTextLen(content: string): number {
  if (!content) return 0;
  try {
    const p = JSON.parse(content);
    if (p?.root?.children) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walk = (nodes: any[]): string =>
        nodes.map((n) => n.text ?? (n.children ? walk(n.children) : "")).join("");
      return walk(p.root.children).trim().length;
    }
  } catch {
    return content.trim().length;
  }
  return content.trim().length;
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
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(observations));
  const lastEmitted = useRef<string | undefined>(observations);

  // Sincroniza quando o valor vem de fora (carga inicial / troca de projeto) e nao
  // foi este componente quem emitiu - evita sobrescrever o que o usuario digita.
  useEffect(() => {
    if (observations !== lastEmitted.current) {
      lastEmitted.current = observations;
      setBlocks(parseBlocks(observations));
    }
  }, [observations]);

  const commit = useCallback(
    (next: Block[]) => {
      setBlocks(next);
      const s = serialize(next);
      lastEmitted.current = s;
      onChange(s);
    },
    [onChange]
  );

  const updateBlock = (id: string, content: string) =>
    commit(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  const addBlock = () => commit([...blocks, makeBlock("")]);
  const removeBlock = (id: string) => commit(blocks.filter((b) => b.id !== id));

  // --- Melhorar texto com IA ---
  const { online } = useModelWorkerStatus();
  const aiBlockRef = useRef<string | null>(null);
  const [aiBlockId, setAiBlockId] = useState<string | null>(null); // bloco gerando
  const [pending, setPending] = useState<{ blockId: string; generated: string } | null>(null);

  const onResult = useCallback((job: DtcAiJob) => {
    const text = (job.resultText || "").trim();
    const blockId = aiBlockRef.current;
    aiBlockRef.current = null;
    setAiBlockId(null);
    if (!text || !blockId) return;
    setPending({ blockId, generated: text });
  }, []);

  const { enqueueJob, activeJob } = useImproveTextJobs(projectId, onResult);
  const aiRunning =
    !!aiBlockId || activeJob?.status === "processing" || activeJob?.status === "pending";

  const improveBlock = (b: Block) => {
    if (aiRunning || !canEdit) return;
    aiBlockRef.current = b.id;
    setAiBlockId(b.id);
    enqueueJob.mutate({ inputText: b.content || "", requestedBy });
  };

  const applyGenerated = () => {
    if (!pending) return;
    const lexical = plainTextToLexicalJson(pending.generated);
    commit(
      blocks.map((b) =>
        b.id === pending.blockId ? { ...b, content: lexical, editorKey: b.editorKey + 1 } : b
      )
    );
    setPending(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-slate-300 dark:bg-slate-700 rounded-full" />
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Observações & Detalhes
          </Label>
          {blocks.length > 1 && (
            <span className="text-[10px] font-medium text-muted-foreground">
              ({blocks.length} blocos)
            </span>
          )}
        </div>
        {canEdit && (
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

      {blocks.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1">
          Nenhum bloco. Clique em "Adicionar bloco" para incluir observações.
        </p>
      )}

      <div className="space-y-3">
        {blocks.map((block, idx) => {
          const generating = aiBlockId === block.id;
          const canImprove =
            canEdit && !aiRunning && online && blockTextLen(block.content) >= 3;
          const improveTitle = !online
            ? "O gerador da IA está offline no momento"
            : blockTextLen(block.content) < 3
            ? "Escreva algum texto no bloco antes de melhorar com IA"
            : aiRunning
            ? "Aguarde a melhoria em andamento"
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
