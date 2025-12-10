import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ProjectV2, 
  StageStatus, 
  InfraStageV2, 
  AdherenceStageV2, 
  EnvironmentStageV2, 
  ConversionStageV2, 
  ImplementationStageV2, 
  PostStageV2,
  RichContent,
  ContentBlock,
  GlobalStatus,
  Priority
} from "@/types/ProjectV2";

export const useProjectsList = () => {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projectsList"],
    queryFn: async () => {
      // Fetch only essential columns for dashboard
      // We purposefully exclude 'notes' and 'timeline_events' and heavy 'stages' JSON if possible,
      // but 'stages' is a JSONB column so we cannot easily select partial properties in Supabase without a Function.
      // So we fetch everything BUT 'timeline_events' (which is a join) and 'notes' (if it were a separate table or large text).
      // Notes is a JSONB column in projects, so we fetch it. 
      // Actually, for list view, we don't need notes.
      
      const { data, error } = await supabase
        .from("projects")
        .select("id, client_name, ticket_number, system_type, global_status, updated_at, project_leader, client_primary_contact, overall_progress, priority, is_deleted, created_at, start_date_planned, end_date_planned, infra_status, adherence_status, environment_status, conversion_status, implementation_status, post_status") 
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(row => userProjectsListTransform(row));
    },
  });

  return {
    projects: projects || [],
    isLoading,
    error
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
    environment_status?: string;
    conversion_status?: string;
    implementation_status?: string;
    post_status?: string;
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
        // Mock stages status for the dashboard pipeline view
        stages: {
            infra: { status: row.infra_status || 'todo' } as InfraStageV2,
            adherence: { status: row.adherence_status || 'todo' } as AdherenceStageV2,
            environment: { status: row.environment_status || 'todo' } as EnvironmentStageV2,
            conversion: { status: row.conversion_status || 'todo' } as ConversionStageV2,
            implementation: { status: row.implementation_status || 'todo' } as ImplementationStageV2,
            post: { status: row.post_status || 'todo' } as PostStageV2,
        },
    };
}
