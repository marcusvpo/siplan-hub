import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface CopilotAccess {
  userId: string;
  enabled: boolean;
  dailyTokenLimit: number;
  tokensUsedToday: number;
  periodResetAt: string;
}

export interface CopilotJob {
  id: string;
  userId: string;
  question: string;
  status: "pending" | "processing" | "done" | "error" | "cancelled";
  resultText?: string;
  errorMessage?: string;
  progress?: string;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAccess = (a: any): CopilotAccess => ({
  userId: a.user_id,
  enabled: !!a.enabled,
  dailyTokenLimit: a.daily_token_limit ?? 0,
  tokensUsedToday: a.tokens_used_today ?? 0,
  periodResetAt: a.period_reset_at,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapJob = (j: any): CopilotJob => ({
  id: j.id,
  userId: j.user_id,
  question: j.question,
  status: j.status,
  resultText: j.result_text ?? undefined,
  errorMessage: j.error_message ?? undefined,
  progress: j.progress ?? undefined,
  tokensIn: j.tokens_in ?? 0,
  tokensOut: j.tokens_out ?? 0,
  createdAt: j.created_at,
});

/**
 * Copiloto Operacional: chat com IA sobre o portfolio de projetos.
 * O frontend apenas enfileira a pergunta (copilot_jobs); o mesmo worker da VM que
 * gera modelos monta o contexto dos projetos, roda o Claude e devolve a resposta.
 * Acesso e cota diaria de tokens sao controlados por copilot_access (tela admin).
 */
export function useCopilot() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Cota/permissao do usuario atual. A linha pode nao existir (=> sem acesso).
  const { data: access, isLoading: accessLoading } = useQuery({
    queryKey: ["copilotAccess", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_access")
        .select("*")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return data ? mapAccess(data) : null;
    },
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["copilotJobs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_jobs")
        .select("*")
        .eq("user_id", userId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map(mapJob);
    },
    refetchInterval: (query) => {
      const data = query.state.data as CopilotJob[] | undefined;
      const active = data?.some((j) => j.status === "pending" || j.status === "processing");
      return active ? 4000 : false;
    },
  });

  const enqueue = useMutation({
    mutationFn: async (question: string) => {
      const { data, error } = await supabase
        .from("copilot_jobs")
        .insert({ user_id: userId, question })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["copilotJobs", userId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      // A RLS barra o INSERT quando o usuario nao tem acesso ou estourou a cota.
      if (/row-level security|violates|policy/i.test(msg)) {
        toast.error("Sem acesso ao copiloto ou cota diaria de tokens atingida.");
      } else {
        toast.error(`Nao foi possivel enviar a pergunta: ${msg}`);
      }
    },
  });

  const cancelJob = async (job: CopilotJob) => {
    try {
      if (job.status === "pending") {
        await supabase
          .from("copilot_jobs")
          .update({ status: "cancelled", finished_at: new Date().toISOString() })
          .eq("id", job.id);
      } else if (job.status === "processing") {
        await supabase.from("copilot_jobs").update({ cancel_requested: true }).eq("id", job.id);
        toast.info("Cancelamento solicitado.");
      }
    } catch (err) {
      console.error("Erro ao cancelar job do copiloto:", err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`copilot-jobs-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "copilot_jobs", filter: `user_id=eq.${userId}` },
        (payload) => {
          const raw = payload.new as Record<string, unknown> | null;
          const oldRaw = payload.old as Record<string, unknown> | null;
          queryClient.setQueryData<CopilotJob[]>(["copilotJobs", userId], (prev = []) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((j) => j.id !== (oldRaw?.id as string));
            }
            if (!raw) return prev;
            const mapped = mapJob(raw);
            const idx = prev.findIndex((j) => j.id === mapped.id);
            if (idx === -1) return [...prev, mapped];
            const copy = prev.slice();
            copy[idx] = mapped;
            return copy;
          });
          // Ao concluir um job, atualiza a cota consumida.
          if (raw?.status === "done" || raw?.status === "error") {
            queryClient.invalidateQueries({ queryKey: ["copilotAccess", userId] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const activeJob = jobs.find((j) => j.status === "processing" || j.status === "pending");

  return {
    access,
    accessLoading,
    jobs,
    jobsLoading,
    enqueue,
    cancelJob,
    activeJob,
    hasAccess: !!access?.enabled,
  };
}
