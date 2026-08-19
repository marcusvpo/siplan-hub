import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CsCxNpsAiJob {
  id: string;
  status: string;
  resultText?: string;
  errorMessage?: string;
  progress?: string;
  createdAt: string;
}

function hashKey(value: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(
    second >>> 0
  )
    .toString(16)
    .padStart(8, "0")}`;
}

/**
 * Usa o job `improve_text`, já suportado pelo worker em produção. O prefixo do
 * target permite que workers atualizados apliquem o prompt analítico de NPS,
 * sem exigir um novo tipo de job ou uma migração de banco.
 */
export function useCsCxNpsAiReport(reportKey: string, requestedBy?: string) {
  const queryClient = useQueryClient();
  const targetField = `nps_analysis:v1:${hashKey(reportKey)}`;
  const queryKey = ["cs-cx", "nps-ai-report", requestedBy, targetField];

  const { data: jobs = [] } = useQuery<CsCxNpsAiJob[]>({
    queryKey,
    enabled: Boolean(requestedBy && reportKey),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .select("id, status, result_text, error_message, progress, created_at")
        .eq("job_type", "improve_text")
        .eq("requested_by", requestedBy as string)
        .eq("target_field", targetField)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;

      return (data ?? []).map((job) => ({
        id: String(job.id),
        status: String(job.status),
        resultText: job.result_text ?? undefined,
        errorMessage: job.error_message ?? undefined,
        progress: job.progress ?? undefined,
        createdAt: String(job.created_at),
      }));
    },
    refetchInterval: (query) => {
      const current = query.state.data as CsCxNpsAiJob[] | undefined;
      return current?.some(
        (job) => job.status === "pending" || job.status === "processing",
      )
        ? 3_000
        : false;
    },
  });

  const generate = async (source: string) => {
    if (!requestedBy) throw new Error("Usuário não identificado.");
    const { error } = await supabase.from("dtc_ai_jobs").insert({
      project_id: null,
      job_type: "improve_text",
      target_field: targetField,
      input_text: source,
      requested_by: requestedBy,
    });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  };

  const active = jobs.find(
    (job) => job.status === "pending" || job.status === "processing",
  );
  const latest = jobs.find(
    (job) => job.status === "done" && job.resultText,
  );
  const latestError =
    !active && jobs[0]?.status === "error" ? jobs[0] : undefined;

  return { generate, active, latest, latestError };
}
