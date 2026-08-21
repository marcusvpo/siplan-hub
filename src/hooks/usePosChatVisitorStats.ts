import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosChatVisitorStats {
  visitor_id: string;
  name: string;
  sector: string;
  total_sessions: number;
  user_messages: number;
  total_messages: number;
  total_tokens: number;
  estimated_cost_usd: number;
  last_activity: string;
}

export function usePosChatVisitorStats(projectId?: string) {
  return useQuery<PosChatVisitorStats[]>({
    queryKey: ["posChatVisitorStats", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase.rpc("get_pos_chat_visitor_stats", {
        p_project_id: projectId,
      });

      if (error) throw error;
      return (data || []) as PosChatVisitorStats[];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
