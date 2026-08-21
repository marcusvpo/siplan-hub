import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosAiChatLink {
  id: string;
  client_name: string;
  system_type: string;
  enabled: boolean;
  activated_at: string | null;
  disabled_at: string | null;
  message_count: number;
  custom_fields: Record<string, unknown>;
}

export function usePosAiChatLinks() {
  return useQuery({
    queryKey: ["posAiChatLinks"],
    queryFn: async (): Promise<PosAiChatLink[]> => {
      const [{ data: projects, error: projectsError }, { data: messages, error: messagesError }] =
        await Promise.all([
          supabase
            .from("projects")
            .select("id, client_name, system_type, products, custom_fields")
            .eq("is_deleted", false)
            .order("client_name", { ascending: true }),
          supabase.from("pos_ai_chat_messages").select("project_id"),
        ]);

      if (projectsError) throw projectsError;
      if (messagesError) throw messagesError;

      const messageCountByProject = new Map<string, number>();
      for (const message of messages || []) {
        messageCountByProject.set(
          message.project_id,
          (messageCountByProject.get(message.project_id) || 0) + 1,
        );
      }

      return (projects || [])
        .flatMap((project) => {
          const customFields = (project.custom_fields || {}) as Record<string, unknown>;
          const rawEnabled = customFields.pos_assistant_enabled;
          const activatedAt =
            typeof customFields.pos_assistant_activated_at === "string"
              ? customFields.pos_assistant_activated_at
              : null;
          const disabledAt =
            typeof customFields.pos_assistant_disabled_at === "string"
              ? customFields.pos_assistant_disabled_at
              : null;
          const messageCount = messageCountByProject.get(project.id) || 0;
          const hasMessages = messageCount > 0;
          const isOrion =
            project.system_type === "Orion TN" ||
            project.system_type === "OrionTN" ||
            project.system_type === "Modelos TN" ||
            (Array.isArray(project.products) && project.products.includes("Orion TN"));
          const isConfigured =
            typeof rawEnabled === "boolean" || Boolean(activatedAt) || hasMessages;

          if (!isOrion || !isConfigured) return [];

          return [
            {
              id: project.id,
              client_name: project.client_name || "Cartório sem nome",
              system_type: project.system_type || "Orion TN",
              enabled: rawEnabled === true || (rawEnabled === undefined && hasMessages),
              activated_at: activatedAt,
              disabled_at: disabledAt,
              message_count: messageCount,
              custom_fields: customFields,
            },
          ];
        })
        .sort(
          (a, b) =>
            Number(b.enabled) - Number(a.enabled) ||
            a.client_name.localeCompare(b.client_name, "pt-BR"),
        );
    },
    staleTime: 1000 * 30,
  });
}
