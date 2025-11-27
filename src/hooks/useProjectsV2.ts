import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ContentBlock
} from "@/types/ProjectV2";
import { useTimeline } from "./useTimeline";

export const useProjectsV2 = () => {
  const queryClient = useQueryClient();
  const { addAutoLog } = useTimeline();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projectsV3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(transformToProjectV3);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: Partial<ProjectV2> }) => {
      const dbUpdates = transformToDB(updates);
      const { error } = await supabase.from("projects").update(dbUpdates).eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
      
      addAutoLog.mutate({
        projectId: variables.projectId,
        message: "Projeto atualizado",
        metadata: { action: "update" },
      });
    },
  });

  const createProject = useMutation({
    mutationFn: async (project: Partial<ProjectV2>) => {
      const dbProject = transformToDB(project);
      const { data, error } = await supabase
        .from("projects")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(dbProject as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
      
      addAutoLog.mutate({
        projectId: data.id,
        message: "Projeto criado",
        metadata: { action: "project_created" },
      });
    },
  });

  return {
    projects: projects || [],
    isLoading,
    updateProject,
    createProject,
  };
};

// Transform DB row to Project V3 interface
function transformToProjectV3(row: Record<string, unknown>): ProjectV2 {
  // Helper to create a basic stage
  // We need to cast to specific stage types because createStage is generic
  const createStage = <T extends { status: StageStatus }>(prefix: string): T => {
    const stage = {
      status: (row[`${prefix}_status`] as StageStatus) || 'todo',
      responsible: (row[`${prefix}_responsible`] as string) || '',
      startDate: row[`${prefix}_start_date`] ? new Date(row[`${prefix}_start_date`] as string) : undefined,
      endDate: row[`${prefix}_end_date`] ? new Date(row[`${prefix}_end_date`] as string) : undefined,
      observations: (row[`${prefix}_observations`] as string) || '',
      // Spread other specific fields
      ...Object.keys(row).reduce((acc, key) => {
        if (key.startsWith(prefix + '_') && 
            !key.endsWith('_status') && 
            !key.endsWith('_responsible') && 
            !key.endsWith('_start_date') && 
            !key.endsWith('_end_date') && 
            !key.endsWith('_observations')) {
          // Convert snake_case to camelCase for the property name
          const propName = key.replace(prefix + '_', '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          acc[propName] = row[key];
        }
        return acc;
      }, {} as Record<string, unknown>)
    };
    return stage as unknown as T;
  };

  // Mock Rich Content if not present
  const notesData = row.notes as { blocks: ContentBlock[] } | undefined;
  const notes: RichContent = {
    id: crypto.randomUUID(),
    projectId: row.id as string,
    blocks: notesData ? notesData.blocks : [
      { id: '1', type: 'paragraph', content: (row.description as string) || '' }
    ],
    lastEditedBy: (row.last_update_by as string) || 'Sistema',
    lastEditedAt: row.updated_at ? new Date(row.updated_at as string) : new Date()
  };

  return {
    id: row.id as string,
    clientName: row.client_name as string,
    ticketNumber: row.ticket_number as string,
    systemType: row.system_type as string,
    implantationType: (row.implantation_type as ProjectV2['implantationType']) || "new",
    projectType: (row.project_type as ProjectV2['projectType']) || "new",
    
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
      infra: createStage<InfraStageV2>('infra'),
      adherence: createStage<AdherenceStageV2>('adherence'),
      environment: createStage<EnvironmentStageV2>('environment'),
      conversion: createStage<ConversionStageV2>('conversion'),
      implementation: createStage<ImplementationStageV2>('implementation'),
      post: createStage<PostStageV2>('post'),
    },
    
    timeline: [], // Fetch separately or include if joined
    auditLog: [], // Fetch separately or include if joined
    
    notes: notes,
    
    tags: (row.tags as string[]) || [],
    priority: (row.priority as ProjectV2['priority']) || "normal",
    customFields: (row.custom_fields as Record<string, unknown>) || {},
    
    isDeleted: (row.is_deleted as boolean) || false,
    isArchived: (row.is_archived as boolean) || false,
  };
}

// Transform Project V3 to DB row
function transformToDB(project: Partial<ProjectV2>): Record<string, unknown> {
  const dbRow: Record<string, unknown> = {};

  if (project.clientName) dbRow.client_name = project.clientName;
  if (project.ticketNumber) dbRow.ticket_number = project.ticketNumber;
  if (project.systemType) dbRow.system_type = project.systemType;
  if (project.implantationType) dbRow.implantation_type = project.implantationType;
  if (project.projectType) dbRow.project_type = project.projectType;
  if (project.globalStatus) dbRow.global_status = project.globalStatus;
  if (project.overallProgress !== undefined) dbRow.overall_progress = project.overallProgress;
  if (project.projectLeader) dbRow.project_leader = project.projectLeader;
  if (project.clientPrimaryContact) dbRow.client_primary_contact = project.clientPrimaryContact;
  if (project.clientEmail) dbRow.client_email = project.clientEmail;
  if (project.clientPhone) dbRow.client_phone = project.clientPhone;
  if (project.responsibleInfra) dbRow.infra_responsible = project.responsibleInfra;
  if (project.responsibleAdherence) dbRow.adherence_responsible = project.responsibleAdherence;
  if (project.responsibleConversion) dbRow.conversion_responsible = project.responsibleConversion;
  if (project.responsibleImplementation) dbRow.implementation_responsible = project.responsibleImplementation;
  if (project.responsiblePost) dbRow.post_responsible = project.responsiblePost;
  
  if (project.startDatePlanned) dbRow.start_date_planned = project.startDatePlanned;
  if (project.endDatePlanned) dbRow.end_date_planned = project.endDatePlanned;
  if (project.startDateActual) dbRow.start_date_actual = project.startDateActual;
  if (project.endDateActual) dbRow.end_date_actual = project.endDateActual;
  if (project.nextFollowUpDate) dbRow.next_follow_up_date = project.nextFollowUpDate;
  
  if (project.tags) dbRow.tags = project.tags;
  if (project.priority) dbRow.priority = project.priority;
  if (project.customFields) dbRow.custom_fields = project.customFields;
  
  if (project.isDeleted !== undefined) dbRow.is_deleted = project.isDeleted;
  if (project.isArchived !== undefined) dbRow.is_archived = project.isArchived;

  // Stages flattening
  if (project.stages) {
    const stages = project.stages;
    const stageKeys = ['infra', 'adherence', 'environment', 'conversion', 'implementation', 'post'] as const;
    
    stageKeys.forEach(key => {
      if (stages[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stage = stages[key] as any;
        dbRow[`${key}_status`] = stage.status;
        dbRow[`${key}_responsible`] = stage.responsible;
        if (stage.startDate) dbRow[`${key}_start_date`] = stage.startDate;
        if (stage.endDate) dbRow[`${key}_end_date`] = stage.endDate;
        if (stage.observations) dbRow[`${key}_observations`] = stage.observations;
      }
    });
  }

  // Notes
  if (project.notes) {
    dbRow.notes = project.notes; 
  }

  return dbRow;
}

function calculateHealthScore(row: Record<string, unknown>): "ok" | "warning" | "critical" {
  const now = new Date();
  const lastUpdate = row.updated_at ? new Date(row.updated_at as string) : new Date();
  const diffDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);

  if (diffDays > 7) return "critical";
  if (diffDays > 3) return "warning";
  return "ok";
}
