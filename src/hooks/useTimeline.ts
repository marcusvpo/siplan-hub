import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTimeline = () => {
  const queryClient = useQueryClient();

  const addComment = useMutation({
    mutationFn: async ({
      projectId,
      message,
    }: {
      projectId: string;
      message: string;
    }) => {
      const { error } = await supabase.from("timeline_events").insert({
        project_id: projectId,
        type: "comment",
        author: "Bruno Fernandes",
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
    }: {
      projectId: string;
      message: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>;
    }) => {
      const { error } = await supabase.from("timeline_events").insert({
        project_id: projectId,
        type: "auto",
        author: "Sistema",
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
  };
};
