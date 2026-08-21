import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosAiVisitorAnalyticsKpis {
  registered_users: number;
  active_users: number;
  active_sectors: number;
  user_questions: number;
  total_sessions: number;
  total_messages: number;
  identified_messages: number;
  unidentified_messages: number;
  total_tokens: number;
  estimated_cost_usd: number;
  unidentified_cost_usd: number;
  identification_rate: number;
  avg_questions_per_user: number;
}

export interface PosAiVisitorAnalyticsUser {
  visitor_id: string;
  project_id: string;
  client_name: string;
  name: string;
  sector: string;
  user_questions: number;
  assistant_replies: number;
  total_messages: number;
  total_sessions: number;
  total_tokens: number;
  estimated_cost_usd: number;
  helpful_count: number;
  unhelpful_count: number;
  satisfaction_rate: number | null;
  last_activity: string | null;
}

export interface PosAiVisitorAnalyticsSector {
  sector: string;
  active_users: number;
  user_questions: number;
  assistant_replies: number;
  total_messages: number;
  total_sessions: number;
  total_tokens: number;
  estimated_cost_usd: number;
  helpful_count: number;
  unhelpful_count: number;
  satisfaction_rate: number | null;
  last_activity: string | null;
}

export interface PosAiVisitorAnalyticsData {
  kpis: PosAiVisitorAnalyticsKpis;
  by_user: PosAiVisitorAnalyticsUser[];
  by_sector: PosAiVisitorAnalyticsSector[];
}

const EMPTY_DATA: PosAiVisitorAnalyticsData = {
  kpis: {
    registered_users: 0,
    active_users: 0,
    active_sectors: 0,
    user_questions: 0,
    total_sessions: 0,
    total_messages: 0,
    identified_messages: 0,
    unidentified_messages: 0,
    total_tokens: 0,
    estimated_cost_usd: 0,
    unidentified_cost_usd: 0,
    identification_rate: 0,
    avg_questions_per_user: 0,
  },
  by_user: [],
  by_sector: [],
};

export function usePosAiVisitorAnalytics(projectId?: string | null, days: number = 30) {
  return useQuery({
    queryKey: ["posAiVisitorAnalytics", projectId || "all", days],
    queryFn: async (): Promise<PosAiVisitorAnalyticsData> => {
      const { data, error } = await supabase.rpc(
        "get_pos_chat_visitor_admin_analytics",
        {
          p_project_id: projectId || null,
          p_days: days,
        },
      );

      if (error) throw error;

      return (data as unknown as PosAiVisitorAnalyticsData) || EMPTY_DATA;
    },
    staleTime: 1000 * 30,
  });
}
