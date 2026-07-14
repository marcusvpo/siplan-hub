import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useVoiceNoteJobs } from "@/hooks/useVoiceNoteJobs";
import { useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { DtcAiJob } from "@/types/ProjectV2";
import { Mic, Square, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

// Escolhe um mimeType de gravacao suportado pelo navegador. Chrome/Firefox/Android
// gravam webm/opus; Safari/iOS gravam mp4/aac. ffmpeg na VM decodifica ambos.
function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return "";
}

const MAX_SECONDS = 300; // 5 min por gravacao (evita arquivos gigantes)

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VoiceDictationButtonProps {
  projectId?: string;
  requestedBy?: string;
  /** Aplica o texto gerado: 'append' anexa ao fim, 'replace' substitui tudo. */
  onApply: (text: string, mode: "append" | "replace") => void;
  disabled?: boolean;
}

/**
 * Botao de ditado por voz para campos de texto rico. Grava o audio no navegador
 * (MediaRecorder, funciona em PC e mobile), sobe para o Storage e enfileira um job
 * 'voice_note'. O worker transcreve com whisper.cpp e eleva com o Claude; o texto
 * gerado aparece num preview onde o analista escolhe anexar ou substituir.
 */
export function VoiceDictationButton({
  projectId,
  requestedBy,
  onApply,
  disabled,
}: VoiceDictationButtonProps) {
  const { online } = useModelWorkerStatus();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false); // enviando/processando na IA
  const [pending, setPending] = useState<string | null>(null); // texto gerado p/ revisar

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const onResult = useCallback((job: DtcAiJob) => {
    setBusy(false);
    const text = (job.resultText || "").trim();
    if (text) setPending(text);
  }, []);

  const { enqueueVoice, activeJob } = useVoiceNoteJobs(projectId, onResult);
  const processing = busy || activeJob?.status === "processing" || activeJob?.status === "pending";

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopTimer();
      releaseStream();
    };
  }, []);

  const startRecording = async () => {
    if (!projectId) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Seu navegador não permite gravar áudio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      cancelledRef.current = false;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stopTimer();
        releaseStream();
        setRecording(false);
        if (cancelledRef.current) {
          chunksRef.current = [];
          return;
        }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size < 1024) {
          toast.error("Gravação muito curta. Tente novamente.");
          return;
        }
        setBusy(true);
        try {
          await enqueueVoice(blob, requestedBy);
        } catch (err) {
          console.error("Erro ao enviar o áudio:", err);
          toast.error("Não foi possível enviar o áudio.");
          setBusy(false);
        }
      };

      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Permissão de microfone negada:", err);
      releaseStream();
      toast.error("Permita o acesso ao microfone para gravar.");
    }
  };

  const stopRecording = () => {
    cancelledRef.current = false;
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    stopTimer();
    releaseStream();
    setRecording(false);
  };

  const apply = (mode: "append" | "replace") => {
    if (!pending) return;
    onApply(pending, mode);
    setPending(null);
  };

  if (!projectId) return null;

  // Estado: gravando -> barra com timer + parar/cancelar
  if (recording) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-2 h-7">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
        <span className="text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400 min-w-[2.5rem]">
          {fmt(elapsed)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={stopRecording}
          className="h-6 gap-1 px-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/40"
          title="Parar e transcrever"
        >
          <Square className="h-3 w-3 fill-current" />
          Parar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="h-6 w-6 text-muted-foreground hover:text-rose-600"
          title="Descartar"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  const title = !online
    ? "A IA está offline no momento"
    : processing
    ? "Gerando o texto a partir do áudio…"
    : "Preencher por voz (você revisa antes de aplicar)";

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={startRecording}
        disabled={disabled || processing || !online}
        title={title}
        className="h-7 gap-1 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
      >
        {processing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
        {processing ? "Transcrevendo…" : "Preencher por voz"}
      </Button>

      {/* Preview: revisar o texto gerado antes de aplicar */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Texto gerado a partir do seu áudio
            </DialogTitle>
            <DialogDescription>
              Revise o texto que a IA elaborou. Você pode adicioná-lo ao fim do campo
              ou substituir todo o conteúdo atual.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[45vh] overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 p-3 text-sm whitespace-pre-wrap">
            {pending}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Descartar
            </Button>
            <Button variant="secondary" onClick={() => apply("replace")}>
              Substituir tudo
            </Button>
            <Button
              onClick={() => apply("append")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Adicionar ao texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
