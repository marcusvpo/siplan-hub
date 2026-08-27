import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useAiTextImprovement } from "@/hooks/useAiTextImprovement";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { useToast } from "@/hooks/use-toast";
import {
  plainTextToLexicalJson,
  richTextToPlainText,
} from "@/lib/lexical";

interface AiRichTextFieldProps {
  label: string;
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  requestedBy?: string;
  targetField: string;
}

/** Editor rico com revisão humana obrigatória antes de aplicar a sugestão. */
export function AiRichTextField({
  label,
  content,
  onChange,
  placeholder,
  requestedBy,
  targetField,
}: AiRichTextFieldProps) {
  const { toast } = useToast();
  const { online } = useModelWorkerStatus();
  const { improve, reset, job, active, error } = useAiTextImprovement(
    targetField,
    requestedBy,
  );
  const [editorKey, setEditorKey] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const reportedErrorRef = useRef<string | null>(null);
  const plainText = richTextToPlainText(content);
  const suggestion =
    job?.status === "done" ? job.resultText?.trim() || "" : "";
  const formattedSuggestion = suggestion
    ? plainTextToLexicalJson(suggestion)
    : "";
  const isRunning = isStarting || active;
  const canImprove =
    Boolean(requestedBy) && online && !isRunning && plainText.trim().length >= 10;

  useEffect(() => {
    const message =
      job?.status === "error"
        ? job.errorMessage || "Não foi possível melhorar o texto."
        : error instanceof Error
          ? error.message
          : "";
    if (!message || reportedErrorRef.current === message) return;
    reportedErrorRef.current = message;
    toast({
      title: "Não foi possível melhorar com IA",
      description: message,
      variant: "destructive",
    });
  }, [error, job?.errorMessage, job?.status, toast]);

  const improveText = async () => {
    if (!canImprove) return;
    reportedErrorRef.current = null;
    setIsStarting(true);
    try {
      await improve(content);
      toast({
        title: "Melhoria em processamento",
        description:
          "O Codex está revisando o texto. A sugestão aparecerá aqui quando estiver pronta.",
      });
    } catch (improveError) {
      toast({
        title: "Não foi possível iniciar a melhoria",
        description: messageOf(improveError),
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    onChange(plainTextToLexicalJson(suggestion));
    setEditorKey((current) => current + 1);
    reset();
  };

  const improveTitle = !requestedBy
    ? "Usuário não identificado"
    : !online
      ? "O gerador da IA está offline no momento"
      : plainText.trim().length < 10
        ? "Escreva um pouco mais antes de melhorar com IA"
        : isRunning
          ? job?.progress || "Aguarde a melhoria em andamento"
          : "O Codex sugere uma versão melhor; você decide se quer aplicá-la";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void improveText()}
          disabled={!canImprove}
          title={improveTitle}
          className="h-7 gap-1 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          {isRunning ? "Melhorando…" : "Melhorar com IA"}
        </Button>
      </div>

      <RichTextEditor
        key={editorKey}
        content={content}
        onChange={onChange}
        placeholder={placeholder}
      />

      <AlertDialog
        open={Boolean(suggestion)}
        onOpenChange={(open) => !open && reset()}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Sugestão de melhoria da IA
            </AlertDialogTitle>
            <AlertDialogDescription>
              Revise a sugestão abaixo. Seu texto atual só será substituído se
              você confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className="max-h-[45vh] overflow-y-auto rounded-md border bg-muted/30 p-2"
            aria-label="Previa formatada da sugestao"
          >
            <RichTextEditor
              content={formattedSuggestion}
              onChange={() => undefined}
              editable={false}
              className="min-h-0 border-0 bg-transparent [&_[contenteditable]]:min-h-0"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter meu texto</AlertDialogCancel>
            <AlertDialogAction
              onClick={applySuggestion}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Substituir pela sugestão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
