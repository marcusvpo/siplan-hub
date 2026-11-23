import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  IndexedProjectNotes,
  ProjectNotesSearchRow,
  indexProjectFreeTextFields,
} from "@/lib/project-notes-search";

const PROJECT_FREE_TEXT_SELECT = [
  "id",
  "client_name",
  "ticket_number",
  "system_type",
  "global_status",
  "post_status",
  "project_leader",
  "updated_at",
  "notes",
  "description",
  "special_considerations",
  "commercial_notes",
  "infra_observations",
  "infra_technical_notes",
  "infra_blocking_reason",
  "infra_servers",
  "adherence_observations",
  "adherence_gap_description",
  "adherence_conformity_standards",
  "conversion_observations",
  "conversion_deviations",
  "environment_observations",
  "environment_preparation_checklist",
  "modelos_editor_observations",
  "implementation_observations",
  "implementation_phase1",
  "implementation_phase2",
  "implementation_client_feedback",
  "post_observations",
  "post_benefits_delivered",
  "post_challenges_found",
  "post_recommendations",
].join(", ");

interface AdherenceFormResponseRow {
  project_id: string;
  data?: {
    finalNotes?: unknown;
  } | null;
}

/**
 * Busca sob demanda (Split Query) apenas os campos de texto livre/anotações
 * de todos os projetos não excluídos, mantendo useProjectsList leve.
 */
export function useProjectsNotesSearch(enabled: boolean) {
  const {
    data: rawRows = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["projectsNotesSearch"],
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos de cache
    queryFn: async (): Promise<ProjectNotesSearchRow[]> => {
      const [projectsRes, adherenceRes] = await Promise.all([
        supabase
          .from("projects")
          .select(PROJECT_FREE_TEXT_SELECT)
          .eq("is_deleted", false)
          .order("updated_at", { ascending: false }),
        (supabase as any)
          .from("project_form_responses")
          .select("project_id, data"),
      ]);

      if (projectsRes.error) throw projectsRes.error;

      const adherenceFinalNotesByProject = new Map<string, string>();
      if (!adherenceRes.error && Array.isArray(adherenceRes.data)) {
        for (const item of adherenceRes.data as AdherenceFormResponseRow[]) {
          const finalNotes = item?.data?.finalNotes;
          if (!item?.project_id || !finalNotes) continue;
          const serialized =
            typeof finalNotes === "string"
              ? finalNotes
              : JSON.stringify(finalNotes);
          if (serialized.trim()) {
            const existing = adherenceFinalNotesByProject.get(item.project_id);
            adherenceFinalNotesByProject.set(
              item.project_id,
              existing ? `${existing}\n\n${serialized}` : serialized,
            );
          }
        }
      }

      const rows = (projectsRes.data as unknown as ProjectNotesSearchRow[]) || [];
      return rows.map((row) => {
        const finalNotes = adherenceFinalNotesByProject.get(row.id);
        return finalNotes ? { ...row, adherence_final_notes: finalNotes } : row;
      });
    },
  });

  const indexedProjects = useMemo<IndexedProjectNotes[]>(
    () => rawRows.map(indexProjectFreeTextFields),
    [rawRows],
  );

  return {
    indexedProjects,
    totalProjectsIndexed: indexedProjects.length,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
