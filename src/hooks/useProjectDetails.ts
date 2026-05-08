import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectV2 } from "@/types/ProjectV2";
import { transformToProjectV3 } from "@/utils/project-transformers";

export const useProjectDetails = (projectId: string | null) => {
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["projectDetails", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("projects")
        .select("*, project_tramites(*)")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return transformToProjectV3(data);
    },
    enabled: !!projectId,
    staleTime: 0, // Always fetch fresh details when opening modal
  });

  return {
    project,
    isLoading,
    error
  };
};


