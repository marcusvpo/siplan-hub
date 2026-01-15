import { useInfiniteQuery } from "@tanstack/react-query";
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

const ITEMS_PER_PAGE = 20;

export const useProjectsList = (searchQuery: string = "") => {
  const { 
    data, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ["projectsList", searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("projects")
        .select("id, client_name, ticket_number, system_type, global_status, updated_at, project_leader, client_primary_contact, overall_progress, priority, is_deleted, created_at, start_date_planned, end_date_planned, infra_status, adherence_status, environment_status, conversion_status, implementation_status, post_status") 
        .eq("is_deleted", false);

      if (searchQuery) {
        query = query.or(`client_name.ilike.%${searchQuery}%,ticket_number.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return (data || []).map(row => userProjectsListTransform(row));
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer items than ITEMS_PER_PAGE, we've reached the end
      if (lastPage.length < ITEMS_PER_PAGE) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
  });

  // Flatten the pages into a single array
  const projects = data?.pages.flatMap(page => page) || [];

  return {
    projects,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
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
