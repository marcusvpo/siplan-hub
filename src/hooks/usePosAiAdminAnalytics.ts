import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosAiAdminKpis {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  total_sessions: number;
  total_projects: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  helpful_count: number;
  unhelpful_count: number;
  with_comment_count?: number;
  total_feedbacks: number;
  satisfaction_rate: number | null;
  estimated_cost_usd: number;
  avg_cost_per_answer_usd?: number;
}

export interface PosAiAdminTimelineItem {
  date: string;
  messages_count: number;
  user_questions: number;
  assistant_replies?: number;
  tokens_count: number;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens?: number;
  cached_tokens?: number;
  avg_latency_ms: number;
  helpful_count: number;
  unhelpful_count: number;
  estimated_cost_usd?: number;
}

export interface PosAiAdminProjectItem {
  project_id: string;
  client_name: string;
  system_type: string;
  ticket_number: string | null;
  messages_count: number;
  user_questions: number;
  assistant_replies?: number;
  total_tokens: number;
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost_usd?: number;
  helpful_count: number;
  unhelpful_count: number;
  last_active: string | null;
}

export interface PosAiHourlyDistributionItem {
  hour_label: string;
  hour_number: number;
  questions_count: number;
  messages_count: number;
}

export interface PosAiAdminLogItem {
  id: string;
  project_id: string;
  client_name: string;
  system_type: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  response_id: string | null;
  feedback: "helpful" | "unhelpful" | null;
  feedback_comment: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  latency_ms: number;
  model: string | null;
  prompt_id: string | null;
  estimated_cost_usd?: number;
  created_at: string;
}

export interface PosAiLatencyDistribution {
  fast_count: number; // < 5s
  moderate_count: number; // 5-10s
  slow_count: number; // > 10s
}

export interface PosAiFeedbackItem {
  id: string;
  project_id: string;
  client_name: string;
  session_id: string;
  content: string;
  feedback: "helpful" | "unhelpful";
  feedback_comment: string | null;
  latency_ms: number;
  total_tokens: number;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_tokens?: number;
  estimated_cost_usd?: number;
  created_at: string;
}

export interface PosAiLatencyRankItem {
  id: string;
  project_id: string;
  client_name: string;
  session_id: string;
  content: string;
  feedback: "helpful" | "unhelpful" | null;
  feedback_comment: string | null;
  latency_ms: number;
  total_tokens: number;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens: number;
  cached_tokens?: number;
  estimated_cost_usd?: number;
  created_at: string;
}

export interface PosAiAdminAnalyticsData {
  kpis: PosAiAdminKpis;
  timeline: PosAiAdminTimelineItem[];
  by_project: PosAiAdminProjectItem[];
  hourly_distribution: PosAiHourlyDistributionItem[];
  latency_distribution: PosAiLatencyDistribution;
  slowest_responses: PosAiLatencyRankItem[];
  fastest_responses: PosAiLatencyRankItem[];
  helpful_responses: PosAiFeedbackItem[];
  unhelpful_responses: PosAiFeedbackItem[];
  logs: PosAiAdminLogItem[];
}

export function usePosAiAdminAnalytics(projectId?: string | null, days: number = 30) {
  return useQuery({
    queryKey: ["posAiAdminAnalytics", projectId || "all", days],
    queryFn: async (): Promise<PosAiAdminAnalyticsData> => {
      const { data, error } = await supabase.rpc("get_pos_ai_admin_analytics", {
        p_project_id: projectId || null,
        p_days: days,
      });

      if (error) {
        throw error;
      }

      return (
        data || {
          kpis: {
            total_messages: 0,
            user_messages: 0,
            assistant_messages: 0,
            total_sessions: 0,
            total_projects: 0,
            total_tokens: 0,
            input_tokens: 0,
            output_tokens: 0,
            reasoning_tokens: 0,
            cached_tokens: 0,
            avg_latency_ms: 0,
            min_latency_ms: 0,
            max_latency_ms: 0,
            helpful_count: 0,
            unhelpful_count: 0,
            total_feedbacks: 0,
            satisfaction_rate: null,
            estimated_cost_usd: 0,
            avg_cost_per_answer_usd: 0,
          },
          timeline: [],
          by_project: [],
          hourly_distribution: [],
          latency_distribution: { fast_count: 0, moderate_count: 0, slow_count: 0 },
          slowest_responses: [],
          fastest_responses: [],
          helpful_responses: [],
          unhelpful_responses: [],
          logs: [],
        }
      );
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export interface ActivePosAiProjectOption {
  id: string;
  client_name: string;
  system_type: string;
  hasMessages?: boolean;
}

/**
 * Retorna exclusivamente os projetos/cartórios que ativaram o Assistente de IA
 * (pos_assistant_enabled = true ou com mensagens registradas no histórico).
 */
export function useActivePosAiProjectsList() {
  return useQuery({
    queryKey: ["activePosAiProjectsList"],
    queryFn: async (): Promise<ActivePosAiProjectOption[]> => {
      const [{ data: projectsData, error: pErr }, { data: messagesProjects, error: mErr }] =
        await Promise.all([
          supabase
            .from("projects")
            .select("id, client_name, system_type, products, custom_fields")
            .eq("is_deleted", false)
            .order("client_name", { ascending: true }),
          supabase.from("pos_ai_chat_messages").select("project_id"),
        ]);

      if (pErr) throw pErr;

      const projectIdsWithMessages = new Set(
        (messagesProjects || []).map((m: any) => m.project_id)
      );

      // Filtra apenas projetos Orion TN que tiveram a funcionalidade ativada ou utilizada
      const activeProjects = (projectsData || []).filter((p) => {
        const isOrion =
          p.system_type === "Orion TN" ||
          p.system_type === "OrionTN" ||
          p.system_type === "Modelos TN" ||
          (p.products && Array.isArray(p.products) && p.products.includes("Orion TN"));

        if (!isOrion) return false;

        const isEnabledInCustomFields = Boolean(
          (p.custom_fields as Record<string, unknown>)?.pos_assistant_enabled
        );
        const hasMessages = projectIdsWithMessages.has(p.id);

        return isEnabledInCustomFields || hasMessages;
      });

      return activeProjects.map((p) => ({
        id: p.id,
        client_name: p.client_name || "Sem Nome",
        system_type: p.system_type || "Orion TN",
        hasMessages: projectIdsWithMessages.has(p.id),
      }));
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}
