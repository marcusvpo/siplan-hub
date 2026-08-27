import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AiTextImprovementJob {
  id: string;
  status: string;
  resultText?: string;
  errorMessage?: string;
  progress?: string;
}

function mapJob(job: Record<string, unknown>): AiTextImprovementJob {
  return {
    id: String(job.id),
    status: String(job.status),
    resultText:
      typeof job.result_text === "string" ? job.result_text : undefined,
    errorMessage:
      typeof job.error_message === "string" ? job.error_message : undefined,
    progress: typeof job.progress === "string" ? job.progress : undefined,
  };
}

/**
 * Enfileira uma melhoria de texto avulsa no worker Codex e acompanha somente o
 * job criado por esta instância. O project_id pode ser nulo para fluxos CS/CX.
 */
export function useAiTextImprovement(
  targetField: string,
  requestedBy?: string,
) {
  const [jobId, setJobId] = useState<string | null>(null);
  const queryKey = ["ai-text-improvement", jobId];

  const { data: job, error } = useQuery<AiTextImprovementJob>({
    queryKey,
    enabled: Boolean(jobId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .select("id, status, result_text, error_message, progress")
        .eq("id", jobId as string)
        .single();
      if (error) throw error;
      return mapJob(data as Record<string, unknown>);
    },
    refetchInterval: (query) => {
      const current = query.state.data as AiTextImprovementJob | undefined;
      return current?.status === "pending" || current?.status === "processing"
        ? 3_000
        : false;
    },
  });

  const improve = useCallback(
    async (inputText: string) => {
      if (!requestedBy) throw new Error("Usuário não identificado.");
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .insert({
          project_id: null,
          job_type: "improve_text",
          target_field: targetField,
          input_text: inputText,
          requested_by: requestedBy,
        })
        .select("id")
        .single();
      if (error) throw error;
      setJobId(String(data.id));
    },
    [requestedBy, targetField],
  );

  const reset = useCallback(() => setJobId(null), []);
  const active =
    job?.status === "pending" || job?.status === "processing";

  return { improve, reset, job, active, error };
}
