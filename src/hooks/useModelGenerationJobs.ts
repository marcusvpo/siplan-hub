import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ModelGenerationJob, ModelType, ModelWorkerStatus } from "@/types/ProjectV2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapJob = (item: any): ModelGenerationJob => ({
  id: item.id,
  projectId: item.project_id,
  sourceFilePath: item.source_file_path,
  sourceFileName: item.source_file_name,
  modelType: item.model_type as ModelType,
  status: item.status,
  resultFilePath: item.result_file_path ?? undefined,
  errorMessage: item.error_message ?? undefined,
  attempts: item.attempts ?? 0,
  requestedBy: item.requested_by ?? undefined,
  createdAt: item.created_at,
  progress: item.progress ?? undefined,
  progressLog: Array.isArray(item.progress_log) ? item.progress_log : [],
  progressUpdatedAt: item.progress_updated_at ?? undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapHeartbeat = (item: any): ModelWorkerStatus => ({
  workerId: item.worker_id,
  status: item.status,
  lastSeen: item.last_seen,
  note: item.note ?? undefined,
});

// Considera o worker online se deu sinal nos ultimos 90s e nao esta encerrando.
const HEARTBEAT_STALE_MS = 90_000;

/**
 * Fila de geracao automatica de modelos JSON (aba 5 - Modelos Editor).
 * O frontend apenas enfileira o job; o worker na VM processa e devolve o JSON
 * fazendo append em projects.modelos_editor_available_files. Quando o job vira
 * 'done', invalidamos projectDetails para a coluna JSON refletir o novo arquivo.
 */
export function useModelGenerationJobs(projectId?: string) {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ["modelJobs", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from("model_generation_jobs")
        .select("*")
        .eq("project_id", projectId as string)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      return (data || []).map(mapJob);
    },
  });

  // Enfileirar um novo job (status default 'pending' no banco)
  const enqueueJob = useMutation({
    mutationFn: async (input: {
      sourceFilePath: string;
      sourceFileName: string;
      modelType: ModelType;
      requestedBy?: string;
    }) => {
      const { data, error: insertError } = await supabase
        .from("model_generation_jobs")
        .insert({
          project_id: projectId,
          source_file_path: input.sourceFilePath,
          source_file_name: input.sourceFileName,
          model_type: input.modelType,
          requested_by: input.requestedBy,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelJobs", projectId] });
      toast.success("Geração de modelo enfileirada. Isso pode levar de 10 a 20 minutos.");
    },
    onError: (err) => {
      console.error("Erro ao enfileirar geração de modelo:", err);
      toast.error("Não foi possível enfileirar a geração do modelo.");
    },
  });

  // Realtime: atualiza o cache direto (o progresso muda a cada ~2-3s durante a
  // geracao, entao evitamos refetch a cada evento) e traz o JSON quando concluir.
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`model-jobs-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "model_generation_jobs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown> | null;
          const oldRaw = payload.old as Record<string, unknown> | null;

          queryClient.setQueryData<ModelGenerationJob[]>(["modelJobs", projectId], (prev = []) => {
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

          if (raw?.status === "done") {
            // O worker ja apendou o JSON em modelos_editor_available_files;
            // refetch do projeto faz a coluna "Modelos Disponiveis (JSON)" atualizar.
            queryClient.invalidateQueries({ queryKey: ["projectDetails", projectId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  // Job "mais relevante" para um arquivo de origem (badge por linha).
  // Prioriza job ativo (processing > pending) sobre um terminal mais novo, para
  // que enfileirar 2x o mesmo arquivo nao esconda a geracao em andamento.
  const getLatestJobFor = (sourceFilePath: string): ModelGenerationJob | undefined => {
    const forFile = jobs.filter((j) => j.sourceFilePath === sourceFilePath);
    if (forFile.length === 0) return undefined;
    const rank = (s: ModelGenerationJob["status"]) =>
      s === "processing" ? 0 : s === "pending" ? 1 : 2;
    return [...forFile].sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
  };

  return { jobs, isLoading, error, enqueueJob, getLatestJobFor };
}

/**
 * Estado do worker na VM (online/offline + ocupado), lido do heartbeat.
 * Atualiza via Realtime e reavalia "online" periodicamente (o worker some sem
 * mandar evento quando cai, entao precisamos reavaliar pelo tempo do ultimo sinal).
 */
export function useModelWorkerStatus() {
  const queryClient = useQueryClient();
  const [, forceTick] = useState(0);

  const { data: status = null } = useQuery({
    queryKey: ["modelWorkerStatus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_worker_heartbeat")
        .select("*")
        .order("last_seen", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? mapHeartbeat(data) : null;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("model-worker-heartbeat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_worker_heartbeat" },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          if (row?.worker_id) {
            queryClient.setQueryData(["modelWorkerStatus"], mapHeartbeat(row));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Reavalia "online" a cada 20s mesmo sem novos eventos
  useEffect(() => {
    const t = setInterval(() => forceTick((x) => x + 1), 20_000);
    return () => clearInterval(t);
  }, []);

  const lastSeenMs = status?.lastSeen ? new Date(status.lastSeen).getTime() : 0;
  const online =
    lastSeenMs > 0 && Date.now() - lastSeenMs < HEARTBEAT_STALE_MS && status?.status !== "stopping";

  return { status, online, busy: online && status?.status === "busy" };
}
