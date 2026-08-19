import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosChatRecentMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  feedback?: "helpful" | "unhelpful" | null;
  feedback_comment?: string | null;
  created_at: string;
}

export interface PosChatProjectSummary {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  helpful_count: number;
  unhelpful_count: number;
  total_sessions: number;
  last_interaction?: string | null;
  recent_messages: PosChatRecentMessage[];
}

export function usePosAiProjectSummary(projectId?: string) {
  return useQuery<PosChatProjectSummary | null>({
    queryKey: ["posAiProjectSummary", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_pos_chat_project_summary", {
        p_project_id: projectId,
      });

      if (error) {
        console.error("Error fetching pos chat project summary:", error);
        throw error;
      }

      return data as PosChatProjectSummary;
    },
    staleTime: 1000 * 30, // 30s
    refetchInterval: 1000 * 30, // auto poll every 30s
  });
}
