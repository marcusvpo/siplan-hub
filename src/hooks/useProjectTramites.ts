import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTramite } from "@/types/ProjectV2";

export const useProjectTramites = (projectId: string | null) => {
  return useQuery<ProjectTramite[]>({
    queryKey: ["projectTramites", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("project_tramites")
        .select("*")
        .eq("project_id", projectId)
        .order("data_tramite", { ascending: false });

      if (error) throw error;
      return (data as unknown as ProjectTramite[]) || [];
    },
    enabled: !!projectId,
  });
};
