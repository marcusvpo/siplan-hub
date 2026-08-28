import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosAiChatVisitorAdmin {
  id: string;
  project_id: string;
  name: string;
  sector: string;
  created_at: string;
  last_seen_at: string;
  updated_at?: string;
  is_active: boolean;
  deactivated_at: string | null;
  client_name: string;
  system_type: string;
  conversation_count: number;
  message_count: number;
}

export type PosAiVisitorStatus = "all" | "active" | "inactive";

export interface PosAiVisitorPageParams {
  page: number;
  pageSize: number;
  search?: string;
  linkId?: string | null;
  status?: PosAiVisitorStatus;
}

export interface PosAiVisitorPage {
  items: PosAiChatVisitorAdmin[];
  total: number;
  active: number;
  inactive: number;
  client_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function fetchPosAiChatVisitorsPage(
  params: PosAiVisitorPageParams,
): Promise<PosAiVisitorPage> {
  const { data, error } = await supabase.rpc("get_pos_ai_chat_visitors_page", {
    p_page: params.page,
    p_page_size: params.pageSize,
    p_search: params.search?.trim() || null,
    p_link_id: params.linkId || null,
    p_status: params.status || "all",
  });
  if (error) throw error;
  const result = data as unknown as PosAiVisitorPage;
  return {
    ...result,
    total: Number(result.total || 0),
    active: Number(result.active || 0),
    inactive: Number(result.inactive || 0),
    client_count: Number(result.client_count || 0),
    page: Number(result.page || params.page),
    page_size: Number(result.page_size || params.pageSize),
    total_pages: Number(result.total_pages || 1),
    items: (result.items || []).map((visitor) => ({
      ...visitor,
      conversation_count: Number(visitor.conversation_count || 0),
      message_count: Number(visitor.message_count || 0),
    })),
  };
}

export function usePosAiChatVisitors(params: PosAiVisitorPageParams, enabled = true) {
  return useQuery({
    queryKey: ["posAiChatVisitors", params],
    enabled,
    queryFn: () => fetchPosAiChatVisitorsPage(params),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}
