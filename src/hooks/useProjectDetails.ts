import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { transformToProjectV3 } from "@/utils/project-transformers";
import { mergeCredentialsIntoProjectRow } from "@/utils/project-credentials";

export const useProjectDetails = (projectId: string | null) => {
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["projectDetails", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const [projectRes, credsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single(),
        supabase
          .from("project_credentials")
          .select("credentials")
          .eq("project_id", projectId)
          .maybeSingle(),
      ]);

      if (projectRes.error) throw projectRes.error;
      if (!projectRes.data) return null;

      if (credsRes.error) {
        console.warn("[useProjectDetails] Credenciais protegidas ou indisponiveis:", credsRes.error.message);
      }

      const mergedRow = mergeCredentialsIntoProjectRow(
        projectRes.data,
        (credsRes.data?.credentials as Record<string, unknown> | undefined) ?? null,
      );

      return transformToProjectV3(mergedRow);
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutos de cache para evitar downloads repetidos de trâmites
  });

  return {
    project,
    isLoading,
    error
  };
};


