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
      
      console.log("--- DEBUG: Update Project Payload ---", JSON.stringify(dbUpdates, null, 2));

      const { error } = await supabase.from("projects").update(dbUpdates).eq("id", projectId);

      if (error) {
        console.error("--- DEBUG: Supabase Update Error ---", error);
        throw error;
      }
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
    
    // Infra
    if (stages.infra) {
      const s = stages.infra;
      dbRow.infra_status = s.status;
      dbRow.infra_responsible = s.responsible;
      dbRow.infra_start_date = s.startDate || null;
      dbRow.infra_end_date = s.endDate || null;
      dbRow.infra_observations = s.observations;
      dbRow.infra_server_in_use = s.serverInUse;
      dbRow.infra_server_needed = s.serverNeeded;
      dbRow.infra_approved_by_infra = s.approvedByInfra;
      dbRow.infra_technical_notes = s.technicalNotes;
    }

    // Adherence
    if (stages.adherence) {
      const s = stages.adherence;
      dbRow.adherence_status = s.status;
      dbRow.adherence_responsible = s.responsible;
      dbRow.adherence_start_date = s.startDate || null;
      dbRow.adherence_end_date = s.endDate || null;
      dbRow.adherence_observations = s.observations;
      dbRow.adherence_has_product_gap = s.hasProductGap;
      dbRow.adherence_gap_description = s.gapDescription;
      dbRow.adherence_dev_ticket = s.devTicket;
      dbRow.adherence_dev_estimated_date = s.devEstimatedDate || null;
      dbRow.adherence_gap_priority = s.gapPriority;
      dbRow.adherence_analysis_complete = s.analysisComplete;
      dbRow.adherence_conformity_standards = s.conformityStandards;
    }

    // Environment
    if (stages.environment) {
      const s = stages.environment;
      dbRow.environment_status = s.status;
      dbRow.environment_responsible = s.responsible;
      dbRow.environment_real_date = s.realDate || null;
      dbRow.environment_observations = s.observations;
      dbRow.environment_os_version = s.osVersion;
      dbRow.environment_version = s.version;
      dbRow.environment_test_available = s.testAvailable;
      dbRow.environment_preparation_checklist = s.preparationChecklist;
      dbRow.environment_approved_by_infra = s.approvedByInfra;
    }

    // Conversion
    if (stages.conversion) {
      const s = stages.conversion;
      dbRow.conversion_status = s.status;
      dbRow.conversion_responsible = s.responsible;
      dbRow.conversion_observations = s.observations;
      dbRow.conversion_complexity = s.complexity;
      dbRow.conversion_record_count = s.recordCount || null;
      dbRow.conversion_data_volume_gb = s.dataVolumeGb || null;
      dbRow.conversion_tool_used = s.toolUsed;
      dbRow.conversion_homologation_complete = s.homologationComplete;
      dbRow.conversion_homologation_date = s.homologationDate || null;
      dbRow.conversion_deviations = s.deviations;
      dbRow.conversion_source_system = s.sourceSystem;
    }

    // Implementation
    if (stages.implementation) {
      const s = stages.implementation;
      dbRow.implementation_status = s.status;
      dbRow.implementation_responsible = s.responsible;
      dbRow.implementation_observations = s.observations;
      dbRow.implementation_remote_install_date = s.remoteInstallDate || null;
      dbRow.implementation_training_start_date = s.trainingStartDate || null;
      dbRow.implementation_training_end_date = s.trainingEndDate || null;
      dbRow.implementation_switch_type = s.switchType;
      dbRow.implementation_switch_start_time = s.switchStartTime || null;
      dbRow.implementation_switch_end_time = s.switchEndTime || null;
      dbRow.implementation_training_type = s.trainingType;
      dbRow.implementation_training_location = s.trainingLocation;
      dbRow.implementation_participants_count = s.participantsCount || null;
      dbRow.implementation_client_feedback = s.clientFeedback;
      dbRow.implementation_acceptance_status = s.acceptanceStatus;
    }

    // Post
    if (stages.post) {
      const s = stages.post;
      dbRow.post_status = s.status;
      dbRow.post_responsible = s.responsible;
      dbRow.post_start_date = s.startDate || null;
      dbRow.post_end_date = s.endDate || null;
      dbRow.post_observations = s.observations;
      dbRow.post_support_period_days = s.supportPeriodDays || null;
      dbRow.post_support_end_date = s.supportEndDate || null;
      dbRow.post_benefits_delivered = s.benefitsDelivered;
      dbRow.post_challenges_found = s.challengesFound;
      dbRow.post_roi_estimated = s.roiEstimated;
      dbRow.post_client_satisfaction = s.clientSatisfaction;
      dbRow.post_recommendations = s.recommendations;
      dbRow.post_followup_needed = s.followupNeeded;
      dbRow.post_followup_date = s.followupDate || null;
    }
  }

  // Notes
  if (project.notes) {
    dbRow.notes = project.notes; 
  }

  // Ensure last_update_by is always set (required by DB)
  if (project.lastUpdatedBy) {
    dbRow.last_update_by = project.lastUpdatedBy;
  } else {
    dbRow.last_update_by = "Sistema";
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
