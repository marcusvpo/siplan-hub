import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DtcAiJob } from "@/types/ProjectV2";

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

/**
 * Fila "Melhorar texto com IA" (botao nas Observacoes & Detalhes da etapa 7 -
 * Pos-Implantacao). Reusa a tabela dtc_ai_jobs com job_type='improve_text': o
 * frontend enfileira o texto do bloco em input_text; o worker da VM roda o Claude
 * para reescrever e devolve em result_text. Quando o job vira 'done', o callback
 * onResult recebe o job (o componente mostra manter/substituir antes de aplicar).
 */
export function useImproveTextJobs(
  projectId?: string,
  onResult?: (job: DtcAiJob) => void
) {
  const queryClient = useQueryClient();
  const awaitingRef = useRef<string | null>(null);
  const queryKey = ["improveTextJobs", projectId];

  const { data: jobs = [] } = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .select("*")
        .eq("project_id", projectId as string)
        .eq("job_type", "improve_text")
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

  const enqueueJob = useMutation({
    mutationFn: async (input: { inputText: string; requestedBy?: string }) => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .insert({
          project_id: projectId,
          job_type: "improve_text",
          target_field: "observations",
          input_text: input.inputText,
          requested_by: input.requestedBy,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      awaitingRef.current = (data?.id as string) || null;
      queryClient.invalidateQueries({ queryKey });
      toast.success("Melhorando o texto com IA. Isso pode levar alguns instantes.");
    },
    onError: (err) => {
      console.error("Erro ao enfileirar melhoria com IA:", err);
      toast.error("Não foi possível iniciar a melhoria com IA.");
    },
  });

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`improve-text-jobs-${projectId}`)
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

          // So trata jobs de melhoria de texto (a tabela e compartilhada com o DTC).
          if (raw && raw.job_type !== "improve_text") return;

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
              toast.error(`Falha ao melhorar o texto: ${(raw?.error_message as string) || "erro desconhecido"}`);
            } else if (newStatus === "cancelled") {
              awaitingRef.current = null;
              toast.info("Melhoria de texto cancelada.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      console.error("Erro ao cancelar melhoria com IA:", err);
      toast.error("Não foi possível cancelar a melhoria.");
    }
  };

  const activeJob = jobs.find((j) => j.status === "processing" || j.status === "pending");

  return { jobs, enqueueJob, cancelJob, activeJob };
}
