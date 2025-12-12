import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectV2, RichContent, ContentBlock, StageStatus, InfraStageV2, AdherenceStageV2, EnvironmentStageV2, ConversionStageV2, ImplementationStageV2, PostStageV2 } from "@/types/ProjectV2";

export const useProjectDetails = (projectId: string | null) => {
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["projectDetails", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("projects")
        .select("*, timeline_events(*)")
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

// Re-using the transformer from useProjectsV2 (copied here to avoid circular deps or complex refactoring of useProjectsV2 right now)
// In a real refactor, this transformer would be in a utils file.
function transformToProjectV3(row: Record<string, unknown>): ProjectV2 {
  const createStage = <T extends { status: StageStatus }>(prefix: string): T => {
    const stage = {
      status: (row[`${prefix}_status`] as StageStatus) || 'todo',
      responsible: (row[`${prefix}_responsible`] as string) || '',
      startDate: row[`${prefix}_start_date`] ? new Date(row[`${prefix}_start_date`] as string) : undefined,
      endDate: row[`${prefix}_end_date`] ? new Date(row[`${prefix}_end_date`] as string) : undefined,
      observations: (row[`${prefix}_observations`] as string) || '',
      ...Object.keys(row).reduce((acc, key) => {
        if (key.startsWith(prefix + '_') && 
            !key.endsWith('_status') && 
            !key.endsWith('_responsible') && 
            !key.endsWith('_start_date') && 
            !key.endsWith('_end_date') && 
            !key.endsWith('_observations')) {
          const propName = key.replace(prefix + '_', '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          acc[propName] = row[key];
        }
        return acc;
      }, {} as Record<string, unknown>)
    };
    return stage as unknown as T;
  };

  let notesData: { blocks: ContentBlock[], id?: string } | undefined;
  if (typeof row.notes === 'string') {
    try {
      notesData = JSON.parse(row.notes);
    } catch (e) {
      console.error("Error parsing project notes:", e);
      notesData = undefined;
    }
  } else {
    notesData = row.notes as { blocks: ContentBlock[], id?: string } | undefined;
  }

  const notes: RichContent = {
    id: notesData?.id || crypto.randomUUID(),
    projectId: row.id as string,
    blocks: notesData?.blocks ? notesData.blocks : [
      { id: '1', type: 'paragraph', content: (row.description as string) || '' }
    ],
    lastEditedBy: (row.last_update_by as string) || 'Sistema',
    lastEditedAt: row.updated_at ? new Date(row.updated_at as string) : new Date()
  };

  const timelineEvents = (row.timeline_events as Record<string, unknown>[]) || [];
  const auditLog = timelineEvents.map(event => ({
    id: event.id as string,
    projectId: event.project_id as string,
    action: event.message as string,
    changedBy: event.author as string,
    changedAt: new Date(event.timestamp as string),
    details: (event.metadata as Record<string, unknown>) || {},
  }));

  return {
    id: row.id as string,
    clientName: row.client_name as string,
    ticketNumber: row.ticket_number as string,
    systemType: row.system_type as string,
    implantationType: (row.implantation_type as ProjectV2['implantationType']) || "new",
    projectType: (row.project_type as ProjectV2['projectType']) || "new",
    opNumber: row.op_number as number | undefined,
    salesOrderNumber: row.sales_order_number as number | undefined,
    soldHours: row.sold_hours as number | undefined,
    legacySystem: row.legacy_system as string | undefined,
    specialty: row.specialty as string | undefined,
    healthScore: calculateHealthScore(row),
    globalStatus: (row.global_status as ProjectV2['globalStatus']) || "in-progress",
    overallProgress: (row.overall_progress as number) || 0,
    projectLeader: (row.project_leader as string) || '',
    clientPrimaryContact: (row.client_primary_contact as string) || '',
    clientEmail: row.client_email as string,
    clientPhone: row.client_phone as string,
    responsibleInfra: (row.infra_responsible as string) || '',
    responsibleAdherence: (row.adherence_responsible as string) || '',
    responsibleConversion: (row.conversion_responsible as string) || '',
    responsibleImplementation: (row.implementation_responsible as string) || '',
    responsiblePost: (row.post_responsible as string) || '',
    startDatePlanned: row.start_date_planned ? new Date(row.start_date_planned as string) : undefined,
    endDatePlanned: row.end_date_planned ? new Date(row.end_date_planned as string) : undefined,
    startDateActual: row.start_date_actual ? new Date(row.start_date_actual as string) : undefined,
    endDateActual: row.end_date_actual ? new Date(row.end_date_actual as string) : undefined,
    nextFollowUpDate: row.next_follow_up_date ? new Date(row.next_follow_up_date as string) : undefined,
    createdAt: new Date(row.created_at as string),
    lastUpdatedAt: new Date(row.updated_at as string),
    lastUpdatedBy: (row.last_update_by as string) || 'Sistema',
    stages: {
      infra: {
        ...createStage<InfraStageV2>('infra'),
        // Explicitly read infra-specific status fields that are excluded by the generic createStage
        // (because they end with _status which is filtered out)
        workstationsStatus: (row.infra_workstations_status as InfraStageV2['workstationsStatus']) || undefined,
        serverStatus: (row.infra_server_status as InfraStageV2['serverStatus']) || undefined,
        workstationsCount: row.infra_workstations_count as number | undefined,
      },
      adherence: createStage<AdherenceStageV2>('adherence'),
      environment: {
        ...createStage<EnvironmentStageV2>('environment'),
        startDate: row.environment_start_date ? new Date(row.environment_start_date as string) : undefined,
        endDate: row.environment_end_date ? new Date(row.environment_end_date as string) : undefined,
      },
      conversion: {
        ...createStage<ConversionStageV2>('conversion'),
        // Explicitly read conversion-specific status fields
        homologationStatus: (row.conversion_homologation_status as ConversionStageV2['homologationStatus']) || undefined,
        homologationResponsible: row.conversion_homologation_responsible as string | undefined,
        sentAt: row.conversion_sent_at ? new Date(row.conversion_sent_at as string) : undefined,
        finishedAt: row.conversion_finished_at ? new Date(row.conversion_finished_at as string) : undefined,
        startDate: row.conversion_sent_at 
          ? new Date(row.conversion_sent_at as string) 
          : (row.conversion_start_date ? new Date(row.conversion_start_date as string) : undefined),
        endDate: row.conversion_finished_at 
          ? new Date(row.conversion_finished_at as string) 
          : (row.conversion_end_date ? new Date(row.conversion_end_date as string) : undefined),
      },
      implementation: createStage<ImplementationStageV2>('implementation'),
      post: createStage<PostStageV2>('post'),
    },
    timeline: [], 
    auditLog: auditLog, 
    notes: notes,
    relatedTickets: (row.related_tickets as { name: string; number: string }[]) || [],
    tags: (row.tags as string[]) || [],
    priority: (row.priority as ProjectV2['priority']) || "normal",
    customFields: (row.custom_fields as Record<string, unknown>) || {},
    isDeleted: (row.is_deleted as boolean) || false,
    isArchived: (row.is_archived as boolean) || false,
  };
}

function calculateHealthScore(row: Record<string, unknown>): "ok" | "warning" | "critical" {
  const now = new Date();
  const lastUpdate = row.updated_at ? new Date(row.updated_at as string) : new Date();
  const diffDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
  if (diffDays > 7) return "critical";
  if (diffDays > 3) return "warning";
  return "ok";
}
