import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DtcAiJob } from "@/types/ProjectV2";

const BUCKET = "project-files";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapJob = (item: any): DtcAiJob => ({
  id: item.id,
  projectId: item.project_id,
  targetField: item.target_field,
  status: item.status,
  resultText: item.result_text ?? undefined,
  errorMessage: item.error_message ?? undefined,
  attempts: item.attempts ?? 0,
  requestedBy: item.requested_by ?? undefined,
  createdAt: item.created_at,
  startedAt: item.started_at ?? undefined,
  cancelRequested: !!item.cancel_requested,
  progress: item.progress ?? undefined,
  progressLog: Array.isArray(item.progress_log) ? item.progress_log : [],
  progressUpdatedAt: item.progress_updated_at ?? undefined,
});

const JOB_TYPE = "voice_note";

// Extensao do arquivo a partir do MIME do MediaRecorder (webm/opus no Chrome/Firefox,
// mp4/aac no Safari/iOS). ffmpeg na VM decodifica ambos.
function extFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

/**
 * Fila de preenchimento por voz (job_type='voice_note'). O componente sobe o audio
 * gravado no navegador para o Storage e enfileira um job; o worker da VM transcreve
 * localmente com whisper.cpp e eleva o texto com o Claude, devolvendo em result_text.
 * Quando o job vira 'done', onResult recebe o job (o componente mostra o texto antes
 * de aplicar). Compartilha a tabela dtc_ai_jobs com os demais jobs de IA de texto.
 */
export function useVoiceNoteJobs(
  projectId?: string,
  onResult?: (job: DtcAiJob) => void
) {
  const queryClient = useQueryClient();
  const awaitingRef = useRef<string | null>(null);
  const queryKey = ["voiceNoteJobs", projectId];

  const { data: jobs = [] } = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .select("*")
        .eq("project_id", projectId as string)
        .eq("job_type", JOB_TYPE)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapJob);
    },
    refetchInterval: (query) => {
      const data = query.state.data as DtcAiJob[] | undefined;
      const active = data?.some((j) => j.status === "pending" || j.status === "processing");
      return active ? 4000 : false;
    },
  });

  // Sobe o audio para o Storage e enfileira o job. Retorna o job criado.
  const enqueueVoice = async (audioBlob: Blob, requestedBy?: string) => {
    if (!projectId) throw new Error("projectId ausente");
    const ext = extFromMime(audioBlob.type || "audio/webm");
    const audioPath = `voice-notes/${projectId}/${crypto.randomUUID()}.${ext}`;

    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(audioPath, audioBlob, {
        contentType: audioBlob.type || "audio/webm",
      });
    if (upError) throw upError;

    const row = {
      project_id: projectId,
      job_type: JOB_TYPE,
      target_field: "voice",
      audio_path: audioPath,
      requested_by: requestedBy,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const { data, error } = await supabase
      .from("dtc_ai_jobs")
      .insert(row)
      .select()
      .single();
    if (error) throw error;

    awaitingRef.current = (data?.id as string) || null;
    queryClient.invalidateQueries({ queryKey });
    toast.success("Transcrevendo e elaborando o texto com IA. Isso pode levar alguns instantes.");
    return data;
  };

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`voice-note-jobs-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dtc_ai_jobs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown> | null;
          const oldRaw = payload.old as Record<string, unknown> | null;

          // So trata jobs de voz (a tabela e compartilhada com os demais jobs de IA).
          if (raw && raw.job_type !== JOB_TYPE) return;

          queryClient.setQueryData<DtcAiJob[]>(queryKey, (prev = []) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((j) => j.id !== (oldRaw?.id as string));
            }
            if (!raw) return prev;
            const mapped = mapJob(raw);
            const idx = prev.findIndex((j) => j.id === mapped.id);
            if (idx === -1) return [mapped, ...prev];
            const copy = prev.slice();
            copy[idx] = mapped;
            return copy;
          });

          const newStatus = raw?.status as string | undefined;
          const id = raw?.id as string | undefined;

          if (id && awaitingRef.current && id === awaitingRef.current) {
            if (newStatus === "done") {
              awaitingRef.current = null;
              onResult?.(mapJob(raw));
            } else if (newStatus === "error") {
              awaitingRef.current = null;
              toast.error(`Falha ao gerar o texto: ${(raw?.error_message as string) || "erro desconhecido"}`);
            } else if (newStatus === "cancelled") {
              awaitingRef.current = null;
              toast.info("Preenchimento por voz cancelado.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, queryClient, onResult]);

  // Fallback: se o evento realtime de 'done' se perder, aplica quando o job
  // aguardado aparecer concluido na lista (a query tambem refaz sozinha).
  useEffect(() => {
    if (!awaitingRef.current) return;
    const j = jobs.find((x) => x.id === awaitingRef.current);
    if (j && j.status === "done" && j.resultText) {
      awaitingRef.current = null;
      onResult?.(j);
    } else if (j && (j.status === "error" || j.status === "cancelled")) {
      awaitingRef.current = null;
    }
  }, [jobs, onResult]);

  const cancelJob = async (job: DtcAiJob) => {
    try {
      if (job.status === "pending") {
        await supabase
          .from("dtc_ai_jobs")
          .update({ status: "cancelled", finished_at: new Date().toISOString() })
          .eq("id", job.id);
      } else if (job.status === "processing") {
        await supabase
          .from("dtc_ai_jobs")
          .update({ cancel_requested: true })
          .eq("id", job.id);
        toast.info("Cancelamento solicitado.");
      }
    } catch (err) {
      console.error("Erro ao cancelar preenchimento por voz:", err);
      toast.error("Não foi possível cancelar.");
    }
  };

  const activeJob = jobs.find((j) => j.status === "processing" || j.status === "pending");

  return { jobs, enqueueVoice, cancelJob, activeJob };
}
