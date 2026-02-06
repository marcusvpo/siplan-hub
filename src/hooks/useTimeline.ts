import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useTimeline = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get the current user's name
  const getCurrentUserName = (): string => {
    if (!user) return "Sistema";
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";
  };

  const addComment = useMutation({
    mutationFn: async ({
      projectId,
      message,
    }: {
      projectId: string;
      message: string;
    }) => {
      const authorName = getCurrentUserName();
      
      const { error } = await supabase.from("timeline_events").insert({
        project_id: projectId,
        type: "comment",
        author: authorName,
        message,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
    },
  });

  const addAutoLog = useMutation({
    mutationFn: async ({
      projectId,
      message,
      metadata,
      authorOverride,
    }: {
      projectId: string;
      message: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>;
      authorOverride?: string;
    }) => {
      // Use override if provided, otherwise get current user name
      const authorName = authorOverride || getCurrentUserName();
      
      const { error } = await supabase.from("timeline_events").insert({
        project_id: projectId,
        type: "auto",
        author: authorName,
        message,
        metadata,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
    },
  });

  return {
    addComment,
    addAutoLog,
    getCurrentUserName,
  };
};
