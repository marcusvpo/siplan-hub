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
 * Fila de geracao com IA das "Consideracoes finais" (aba Relato Tecnico, item 6).
 * O frontend apenas enfileira o job; o mesmo worker da VM que gera modelos le o DTC,
 * roda o Claude e devolve o texto em result_text. Quando o job vira 'done', o
 * callback onResult recebe o texto para o componente injetar no editor (revisao).
 */
export function useDtcAiJobs(
  projectId?: string,
  onResult?: (job: DtcAiJob) => void
) {
  const queryClient = useQueryClient();
  // Id do job que o usuario acabou de disparar; aplicamos o resultado quando ELE
  // ficar 'done' (via realtime OU refetch), sem depender da transicao de status.
  const awaitingRef = useRef<string | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["dtcAiJobs", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .select("*")
        .eq("project_id", projectId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapJob);
    },
    // Enquanto houver job ativo, faz polling leve (rede de seguranca caso um
    // evento realtime se perca). Para sozinho quando nao ha mais job em andamento.
    refetchInterval: (query) => {
      const data = query.state.data as DtcAiJob[] | undefined;
      const active = data?.some((j) => j.status === "pending" || j.status === "processing");
      return active ? 4000 : false;
    },
  });

  const enqueueJob = useMutation({
    mutationFn: async (input: { requestedBy?: string }) => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .insert({
          project_id: projectId,
          target_field: "finalConsiderations",
          requested_by: input.requestedBy,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      awaitingRef.current = (data?.id as string) || null;
      queryClient.invalidateQueries({ queryKey: ["dtcAiJobs", projectId] });
      toast.success("Gerando resumo com IA. Isso pode levar alguns minutos.");
    },
    onError: (err) => {
      console.error("Erro ao enfileirar geração com IA:", err);
      toast.error("Não foi possível iniciar a geração com IA.");
    },
  });

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`dtc-ai-jobs-${projectId}`)
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

          const prevList =
            queryClient.getQueryData<DtcAiJob[]>(["dtcAiJobs", projectId]) || [];
          const prevJob = raw?.id ? prevList.find((j) => j.id === raw.id) : undefined;

          queryClient.setQueryData<DtcAiJob[]>(["dtcAiJobs", projectId], (prev = []) => {
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
          const changed = !!prevJob && prevJob.status !== newStatus;

          // Aplica o resultado do job que o usuario disparou, quando ELE concluir.
          if (id && awaitingRef.current && id === awaitingRef.current) {
            if (newStatus === "done") {
              awaitingRef.current = null;
              onResult?.(mapJob(raw));
              toast.success("Resumo gerado. Revise o texto antes de salvar.");
            } else if (newStatus === "error") {
              awaitingRef.current = null;
              toast.error(`Falha ao gerar o resumo: ${(raw?.error_message as string) || "erro desconhecido"}`);
            } else if (newStatus === "cancelled") {
              awaitingRef.current = null;
              toast.info("Geração de resumo cancelada.");
            }
          } else if (changed && newStatus === "error") {
            toast.error(`Falha ao gerar o resumo: ${(raw?.error_message as string) || "erro desconhecido"}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, onResult]);

  // Fallback: se o evento realtime de 'done' se perder, aplicamos assim que o job
  // aguardado aparecer concluido na lista (a query tambem invalida/refaz).
  useEffect(() => {
    if (!awaitingRef.current) return;
    const j = jobs.find((x) => x.id === awaitingRef.current);
    if (j && j.status === "done" && j.resultText) {
      awaitingRef.current = null;
      onResult?.(j);
      toast.success("Resumo gerado. Revise o texto antes de salvar.");
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
      console.error("Erro ao cancelar job de IA:", err);
      toast.error("Não foi possível cancelar a geração.");
    }
  };

  // Job ativo mais recente (processing > pending), para o botao mostrar andamento.
  const activeJob = jobs.find((j) => j.status === "processing" || j.status === "pending");

  return { jobs, isLoading, enqueueJob, cancelJob, activeJob };
}
