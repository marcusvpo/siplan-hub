import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HubCollaborator {
  id: string; // UUID de profiles.id
  name: string; // Nome de exibição principal
  fullName: string | null;
  email: string;
  role: string;
  team: string;
  label: string;
}

/**
 * Hook para carregar todos os colaboradores e usuários cadastrados no Siplan HUB (profiles),
 * com cache, ordenação alfabética e identificação de seus times/departamentos.
 */
export function useHubCollaborators() {
  return useQuery<HubCollaborator[]>({
    queryKey: ["hubCollaborators"],
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, team")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Erro ao listar colaboradores de profiles:", error);
        throw error;
      }

      return (data || []).map((p: any) => {
        const rawName = p.full_name?.trim();
        const fallbackName = p.email ? p.email.split("@")[0] : "Sem nome";
        const displayName = rawName && rawName.length > 0 ? rawName : fallbackName;
        const teamName = p.team?.trim() || "Geral";

        return {
          id: p.id,
          name: displayName,
          fullName: p.full_name,
          email: p.email || "",
          role: p.role || "user",
          team: teamName,
          label: p.team ? `${displayName} (${teamName})` : displayName,
        };
      });
    },
  });
}
