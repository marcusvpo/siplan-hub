import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosAiChatLink {
  id: string;
  project_id: string | null;
  client_name: string;
  system_type: string;
  enabled: boolean;
  activated_at: string | null;
  disabled_at: string | null;
  created_at: string | null;
  message_count: number;
  conversation_count: number;
  visitor_count: number;
  active_visitor_count: number;
  last_interaction_at: string | null;
  custom_fields: Record<string, unknown>;
  managed_by: "link" | "project";
}

export interface PosAiChatProjectCandidate {
  id: string;
  client_name: string;
  system_type: string;
  products: string[];
  custom_fields: Record<string, unknown>;
}

interface LinkRow {
  id: string;
  project_id: string | null;
  client_name: string;
  system_type: string;
  enabled: boolean;
  activated_at: string | null;
  disabled_at: string | null;
  created_at: string;
  message_count?: number | string;
  conversation_count?: number | string;
  visitor_count?: number | string;
  active_visitor_count?: number | string;
  last_interaction_at?: string | null;
}

const isOrionProject = (project: PosAiChatProjectCandidate) =>
  project.system_type === "Orion TN" ||
  project.system_type === "OrionTN" ||
  project.system_type === "Modelos TN" ||
  project.products.includes("Orion TN");

export function usePosAiChatProjectCandidates() {
  return useQuery({
    queryKey: ["posAiChatProjectCandidates"],
    queryFn: async (): Promise<PosAiChatProjectCandidate[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, client_name, system_type, products, custom_fields")
        .eq("is_deleted", false)
        .order("client_name", { ascending: true });
      if (error) throw error;
      return (data || [])
        .map((project) => ({
          id: project.id,
          client_name: project.client_name || "Cliente sem nome",
          system_type: project.system_type || "Orion TN",
          products: Array.isArray(project.products) ? project.products : [],
          custom_fields: (project.custom_fields || {}) as Record<string, unknown>,
        }))
        .filter(isOrionProject);
    },
    staleTime: 60_000,
  });
}

export function usePosAiChatLinks() {
  return useQuery({
    queryKey: ["posAiChatLinks"],
    queryFn: async (): Promise<PosAiChatLink[]> => {
      const [adminResult, projectsResult] = await Promise.all([
        supabase.rpc("get_pos_ai_chat_links_admin"),
        supabase
          .from("projects")
          .select("id, client_name, system_type, products, custom_fields")
          .eq("is_deleted", false)
          .order("client_name", { ascending: true }),
      ]);
      if (projectsResult.error) throw projectsResult.error;
      const projects = projectsResult.data || [];
      const projectCustomFields = new Map(
        projects.map((project) => [project.id, (project.custom_fields || {}) as Record<string, unknown>]),
      );

      if (adminResult.error) throw adminResult.error;
      return ((adminResult.data || []) as LinkRow[]).map((link) => ({
        ...link,
        message_count: Number(link.message_count || 0),
        conversation_count: Number(link.conversation_count || 0),
        visitor_count: Number(link.visitor_count || 0),
        active_visitor_count: Number(link.active_visitor_count ?? link.visitor_count ?? 0),
        last_interaction_at: link.last_interaction_at || null,
        custom_fields: link.project_id ? projectCustomFields.get(link.project_id) || {} : {},
        managed_by: "link" as const,
      }));
    },
    staleTime: 30_000,
  });
}
