import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ModelGenerationJob, ModelType } from "@/types/ProjectV2";

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
});

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

  // Realtime: refletir status na UI e trazer o JSON gerado quando concluir
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
          queryClient.invalidateQueries({ queryKey: ["modelJobs", projectId] });

          const newRow = payload.new as Record<string, unknown> | null;
          if (newRow?.status === "done") {
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

  // Job mais recente para um arquivo de origem (para o badge por linha)
  const getLatestJobFor = (sourceFilePath: string): ModelGenerationJob | undefined =>
    jobs.find((j) => j.sourceFilePath === sourceFilePath);

  return { jobs, isLoading, error, enqueueJob, getLatestJobFor };
}
