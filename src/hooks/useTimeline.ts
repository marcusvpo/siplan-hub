import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  resolveCurrentActor,
  type ProjectLogMetadata,
  type TimelineEventType,
} from "@/services/projectLogService";

export const useTimeline = () => {
  const queryClient = useQueryClient();
  const { user, fullName, role } = useAuth();

  const getCurrentUserName = (): string => {
    if (!user) return "Sistema";
    const profileName = typeof fullName === "string" ? fullName.trim() : "";
    const metaFullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";
    const metaName =
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name.trim()
        : "";
    const email = typeof user.email === "string" ? user.email.trim() : "";

    return profileName || metaFullName || metaName || email || "Usuário";
  };

  const addComment = useMutation({
    mutationFn: async ({
      projectId,
      message,
    }: {
      projectId: string;
      message: string;
    }) => {
      const actor = await resolveCurrentActor();
      const authorName =
        actor.userId || actor.fullName !== "Sistema"
          ? actor.fullName
          : getCurrentUserName();

      const metadata: ProjectLogMetadata = {
        category: "comment",
        actionType: "comment",
        tabLabel: "Logs",
        userId: actor.userId ?? user?.id ?? null,
        userEmail: actor.email ?? user?.email ?? null,
        userRole: actor.role ?? role ?? null,
      };

      const { error } = await supabase.from("timeline_events").insert({
        project_id: projectId,
        type: "comment",
        author: authorName,
        message,
        metadata,
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["timelineEvents", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
    },
  });

  const addAutoLog = useMutation({
    mutationFn: async ({
      projectId,
      message,
      metadata,
      authorOverride,
      type,
    }: {
      projectId: string;
      message: string;
      metadata?: Record<string, unknown>;
      authorOverride?: string;
      type?: TimelineEventType;
    }) => {
      const actor = await resolveCurrentActor();
      const resolvedName =
        actor.userId || actor.fullName !== "Sistema"
          ? actor.fullName
          : getCurrentUserName();
      const authorName = authorOverride || resolvedName;

      const enrichedMetadata: Record<string, unknown> = {
        ...(metadata || {}),
        userId: (metadata?.userId as string | null | undefined) ?? actor.userId ?? user?.id ?? null,
        userEmail: (metadata?.userEmail as string | null | undefined) ?? actor.email ?? user?.email ?? null,
        userRole: (metadata?.userRole as string | null | undefined) ?? actor.role ?? role ?? null,
      };

      const { error } = await supabase.from("timeline_events").insert({
        project_id: projectId,
        type: type || "auto",
        author: authorName,
        message,
        metadata: enrichedMetadata,
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["timelineEvents", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
    },
  });

  return {
    addComment,
    addAutoLog,
    getCurrentUserName,
  };
};
