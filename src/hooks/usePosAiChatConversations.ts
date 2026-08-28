import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosAiConversationMessage {
  id: string;
  project_id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  feedback: "helpful" | "unhelpful" | null;
  created_at: string;
  visitor: { id: string; name: string; sector: string; is_active?: boolean } | null;
}

export interface PosAiConversationGroup {
  key: string;
  link_id: string;
  session_id: string;
  visitor_id: string | null;
  client_name: string;
  visitor_name: string;
  visitor_sector: string;
  visitor_active: boolean | null;
  messages: PosAiConversationMessage[];
  message_count: number;
  started_at: string;
  last_message_at: string;
  preview: string;
  helpful: number;
  unhelpful: number;
}

export interface PosAiConversationPage {
  items: PosAiConversationGroup[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PosAiConversationPageParams {
  page: number;
  pageSize: number;
  search?: string;
  linkId?: string | null;
  visitorId?: string | null;
  anonymousOnly?: boolean;
  identifiedOnly?: boolean;
}

export interface PosAiVisitorOption {
  id: string;
  project_id: string;
  name: string;
  sector: string;
  is_active: boolean;
  conversation_count: number;
}

function emptyPage(params: PosAiConversationPageParams): PosAiConversationPage {
  return { items: [], total: 0, page: params.page, page_size: params.pageSize, total_pages: 1 };
}

export async function fetchPosAiChatConversationsPage(
  params: PosAiConversationPageParams,
): Promise<PosAiConversationPage> {
  const { data, error } = await supabase.rpc("get_pos_ai_chat_conversations_page", {
    p_page: params.page,
    p_page_size: params.pageSize,
    p_search: params.search?.trim() || null,
    p_link_id: params.linkId || null,
    p_visitor_id: params.visitorId || null,
    p_anonymous_only: Boolean(params.anonymousOnly),
    p_identified_only: Boolean(params.identifiedOnly),
  });

  if (error) throw error;
  const result = (data || emptyPage(params)) as unknown as PosAiConversationPage;
  return {
    ...result,
    total: Number(result.total || 0),
    page: Number(result.page || params.page),
    page_size: Number(result.page_size || params.pageSize),
    total_pages: Number(result.total_pages || 1),
    items: (result.items || []).map((item) => ({
      ...item,
      helpful: Number(item.helpful || 0),
      unhelpful: Number(item.unhelpful || 0),
      message_count: Number(item.message_count || item.messages?.length || 0),
    })),
  };
}

export function usePosAiChatConversations(params: PosAiConversationPageParams, enabled = true) {
  return useQuery({
    queryKey: ["posAiChatConversations", params],
    enabled,
    queryFn: () => fetchPosAiChatConversationsPage(params),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}

export function usePosAiChatVisitorOptions(linkId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["posAiChatVisitorOptions", linkId || "all"],
    enabled,
    queryFn: async (): Promise<PosAiVisitorOption[]> => {
      const { data, error } = await supabase.rpc("get_pos_ai_chat_visitor_options", {
        p_link_id: linkId || null,
      });
      if (error) throw error;
      return ((data || []) as unknown as PosAiVisitorOption[]).map((visitor) => ({
        ...visitor,
        conversation_count: Number(visitor.conversation_count || 0),
      }));
    },
    staleTime: 30_000,
  });
}
