import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ProjectV2, 
  StageStatus, 
  InfraStageV2, 
  AdherenceStageV2, 
  EnvironmentStageV2, 
  ConversionStageV2, 
  ModelosEditorStageV2,
  ImplementationStageV2, 
  PostStageV2,
  RichContent,
  ContentBlock,
  GlobalStatus,
  Priority
} from "@/types/ProjectV2";

import { ViewPreset } from "@/stores/filterStore";

export const useProjectsList = (
  searchQuery: string = "",
  viewPreset: ViewPreset = "active"
) => {
  const { 
    data: projects = [], 
    isLoading, 
    error
  } = useQuery({
    queryKey: ["projectsList", searchQuery, viewPreset],
    queryFn: async () => {
      // Start building the query
      let query = supabase
        .from("projects")
        .select(`
          id, client_name, ticket_number, system_type, global_status, updated_at, 
          project_leader, client_primary_contact, overall_progress, priority, is_deleted, created_at,
          infra_status, infra_start_date, infra_end_date, infra_responsible,
          adherence_status, adherence_start_date, adherence_end_date, adherence_responsible, adherence_has_product_gap, adherence_gap_description,
          environment_status, environment_start_date, environment_end_date, environment_responsible,
          conversion_status, conversion_start_date, conversion_end_date, conversion_sent_at, conversion_finished_at, conversion_responsible,
          modelos_editor_status, modelos_editor_start_date, modelos_editor_end_date, modelos_editor_responsible,
          implementation_status, implementation_start_date, implementation_end_date, implementation_responsible,
          post_status, post_start_date, post_end_date, post_responsible,
          TituloChamado, descricaotramite, ResponsavelAtividade, EtapasProjeto
        `) 
        .eq("is_deleted", false);

      // Apply Search
      if (searchQuery) {
        query = query.or(`client_name.ilike.%${searchQuery}%,ticket_number.ilike.%${searchQuery}%`);
      }

      // Apply View Preset (Server-side filtering for proper performance)
      if (viewPreset === "post") {
        query = query.eq("post_status", "in-progress");
      } else if (viewPreset === "active") {
        query = query
          .eq("global_status", "in-progress")
          .not("post_status", "eq", "in-progress");
      } else if (viewPreset === "paused") {
        query = query
          .eq("global_status", "blocked")
          .not("post_status", "eq", "in-progress"); 
      } else if (viewPreset === "done") {
        query = query
          .in("global_status", ["done", "archived"])
          .not("post_status", "eq", "in-progress");
      }
      
      const { data, error } = await query
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return ((data as unknown as ProjectRow[]) || []).map(row => userProjectsListTransform(row));
    }
  });

  return {
    projects,
    isLoading,
    error,
    fetchNextPage: async () => {},
    hasNextPage: false,
    isFetchingNextPage: false
  };
};

// Helper interface for DB row
interface ProjectRow {
    id: string;
    client_name: string;
    ticket_number: string;
    system_type: string;
    global_status: string;
    updated_at: string;
    project_leader: string;
    overall_progress: number;
    priority: string; 
    infra_status?: string;
    adherence_status?: string;
    adherence_has_product_gap?: boolean;
    adherence_gap_description?: string;
    environment_status?: string;
    conversion_status?: string;
    modelos_editor_status?: string;
    implementation_status?: string;
    post_status?: string;
    TituloChamado?: string;
    descricaotramite?: string;
    ResponsavelAtividade?: string;
    EtapasProjeto?: string;
    [key: string]: unknown; // Allow other columns
}

import { differenceInDays } from "date-fns";

function userProjectsListTransform(row: ProjectRow): Partial<ProjectV2> {
    const lastUpdatedAt = new Date(row.updated_at);
    const daysSinceUpdate = differenceInDays(new Date(), lastUpdatedAt);
    
    let healthScore: "ok" | "warning" | "critical" = "ok";
    if (daysSinceUpdate >= 15) {
        healthScore = "critical";
    } else if (daysSinceUpdate >= 7) {
        healthScore = "warning";
    }

    // Returns a lightweight project object suitable for lists/cards
    return {
        id: row.id,
        clientName: row.client_name,
        ticketNumber: row.ticket_number,
        systemType: row.system_type,
        globalStatus: row.global_status as GlobalStatus,
        lastUpdatedAt: lastUpdatedAt, // Using updated_at as proxy for lastUpdatedAt which is in ProjectV2
        projectLeader: row.project_leader,
        overallProgress: row.overall_progress,
        priority: row.priority as unknown as Priority,
        healthScore,
        TituloChamado: row.TituloChamado,
        descricaotramite: row.descricaotramite,
        ResponsavelAtividade: row.ResponsavelAtividade,
        EtapasProjeto: row.EtapasProjeto,
        // Stages with complete date tracking for bottleneck detection
        stages: {
            infra: { 
                status: row.infra_status || 'todo',
                startDate: row.infra_start_date ? new Date(row.infra_start_date as string) : undefined,
                endDate: row.infra_end_date ? new Date(row.infra_end_date as string) : undefined,
                responsible: row.infra_responsible as string | undefined
            } as InfraStageV2,
            adherence: { 
                status: row.adherence_status || 'todo',
                startDate: row.adherence_start_date ? new Date(row.adherence_start_date as string) : undefined,
                endDate: row.adherence_end_date ? new Date(row.adherence_end_date as string) : undefined,
                responsible: row.adherence_responsible as string | undefined,
                hasProductGap: Boolean(row.adherence_has_product_gap),
                gapDescription: (row.adherence_gap_description as string) || undefined
            } as AdherenceStageV2,
            environment: { 
                status: row.environment_status || 'todo',
                startDate: row.environment_start_date ? new Date(row.environment_start_date as string) : undefined,
                endDate: row.environment_end_date ? new Date(row.environment_end_date as string) : undefined,
                responsible: row.environment_responsible as string | undefined
            } as EnvironmentStageV2,
            conversion: { 
                status: row.conversion_status || 'todo',
                sentAt: row.conversion_sent_at ? new Date(row.conversion_sent_at as string) : undefined,
                startDate: row.conversion_sent_at 
                    ? new Date(row.conversion_sent_at as string)
                    : (row.conversion_start_date ? new Date(row.conversion_start_date as string) : undefined),
                endDate: row.conversion_finished_at 
                    ? new Date(row.conversion_finished_at as string)
                    : (row.conversion_end_date ? new Date(row.conversion_end_date as string) : undefined),
                finishedAt: row.conversion_finished_at ? new Date(row.conversion_finished_at as string) : undefined,
                responsible: row.conversion_responsible as string | undefined
            } as ConversionStageV2,
            modelosEditor: {
                status: row.modelos_editor_status || 'todo',
                startDate: row.modelos_editor_start_date ? new Date(row.modelos_editor_start_date as string) : undefined,
                endDate: row.modelos_editor_end_date ? new Date(row.modelos_editor_end_date as string) : undefined,
                responsible: row.modelos_editor_responsible as string | undefined
            } as ModelosEditorStageV2,
            implementation: { 
                status: row.implementation_status || 'todo',
                startDate: row.implementation_start_date ? new Date(row.implementation_start_date as string) : undefined,
                endDate: row.implementation_end_date ? new Date(row.implementation_end_date as string) : undefined,
                responsible: row.implementation_responsible as string | undefined
            } as ImplementationStageV2,
            post: { 
                status: row.post_status || 'todo',
                startDate: row.post_start_date ? new Date(row.post_start_date as string) : undefined,
                endDate: row.post_end_date ? new Date(row.post_end_date as string) : undefined,
                responsible: row.post_responsible as string | undefined
            } as PostStageV2,
        },
    };
}
