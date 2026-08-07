import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketsAiAnalysisJob {
  id: string;
  status: string;
  resultText?: string;
  errorMessage?: string;
  progress?: string;
  createdAt: string;
}
function hashFilterKey(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

/** Parecer da IA isolado pelo usuario e pela combinacao atual de filtros. */
export function useTicketsAiAnalysis(filterKey: string, requestedBy?: string) {
  const queryClient = useQueryClient();
  const targetField = `tickets_analysis:${hashFilterKey(filterKey)}`;
  const queryKey = ["ticketsAiAnalysis", requestedBy, targetField];

  const { data: jobs = [] } = useQuery<TicketsAiAnalysisJob[]>({
    queryKey,
    enabled: Boolean(requestedBy && filterKey),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dtc_ai_jobs")
        .select("id, status, result_text, error_message, progress, created_at")
        .eq("job_type", "tickets_analysis")
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
      const current = query.state.data as TicketsAiAnalysisJob[] | undefined;
      return current?.some((job) => job.status === "pending" || job.status === "processing")
        ? 3000
        : false;
    },
  });

  const generate = async (inputJson: string): Promise<void> => {
    if (!requestedBy) throw new Error("Usuario nao identificado.");
    const { error } = await supabase.from("dtc_ai_jobs").insert({
      project_id: null,
      job_type: "tickets_analysis",
      target_field: targetField,
      input_text: inputJson,
      requested_by: requestedBy,
    });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  };

  const active = jobs.find((job) => job.status === "pending" || job.status === "processing");
  const latest = jobs.find((job) => job.status === "done" && job.resultText);
  const latestError = !active && jobs[0]?.status === "error" ? jobs[0] : undefined;

  return { generate, active, latest, latestError };
}
