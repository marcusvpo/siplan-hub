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
        .select("*, timeline_events(*)")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(transformToProjectV3);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: Partial<ProjectV2> }) => {
      // Get current project state for comparison
      const currentProjects = queryClient.getQueryData<ProjectV2[]>(["projectsV3"]);
      const currentProject = currentProjects?.find(p => p.id === projectId);
      
      const dbUpdates = transformToDB(updates);
      
      console.log("--- DEBUG: Update Project Payload ---", JSON.stringify(dbUpdates, null, 2));

      const { error } = await supabase.from("projects").update(dbUpdates).eq("id", projectId);

      if (error) {
        console.error("--- DEBUG: Supabase Update Error ---", error);
        throw error;
      }

      // Generate specific log messages by comparing with current state
      const logMessages: string[] = [];
      
      if (currentProject) {
        // Helper to check if a value changed
        const hasChanged = (newVal: unknown, oldVal: unknown) => {
           if (newVal === undefined) return false; // Not updated
           if (newVal === null && oldVal === null) return false;
           // Simple equality check for primitives
           if (newVal instanceof Date && oldVal instanceof Date) {
             return newVal.getTime() !== oldVal.getTime();
           }
           return newVal !== oldVal;
        };

        // Stage Status Changes
        if (updates.stages?.infra?.status && hasChanged(updates.stages.infra.status, currentProject.stages.infra.status)) {
            logMessages.push(`Status de Infraestrutura alterado para ${updates.stages.infra.status}`);
        }
        if (updates.stages?.adherence?.status && hasChanged(updates.stages.adherence.status, currentProject.stages.adherence.status)) {
            logMessages.push(`Status de Aderência alterado para ${updates.stages.adherence.status}`);
        }
        if (updates.stages?.environment?.status && hasChanged(updates.stages.environment.status, currentProject.stages.environment.status)) {
            logMessages.push(`Status de Ambiente alterado para ${updates.stages.environment.status}`);
        }
        if (updates.stages?.conversion?.status && hasChanged(updates.stages.conversion.status, currentProject.stages.conversion.status)) {
            logMessages.push(`Status de Conversão alterado para ${updates.stages.conversion.status}`);
        }
        if (updates.stages?.implementation?.status && hasChanged(updates.stages.implementation.status, currentProject.stages.implementation.status)) {
            logMessages.push(`Status de Implantação alterado para ${updates.stages.implementation.status}`);
        }
        if (updates.stages?.post?.status && hasChanged(updates.stages.post.status, currentProject.stages.post.status)) {
            logMessages.push(`Status de Pós-Implantação alterado para ${updates.stages.post.status}`);
        }

        // Responsibles
        if (updates.stages?.infra?.responsible && hasChanged(updates.stages.infra.responsible, currentProject.stages.infra.responsible)) {
            logMessages.push(`Responsável de Infraestrutura definido como ${updates.stages.infra.responsible}`);
        }
        if (updates.stages?.adherence?.responsible && hasChanged(updates.stages.adherence.responsible, currentProject.stages.adherence.responsible)) {
            logMessages.push(`Responsável de Aderência definido como ${updates.stages.adherence.responsible}`);
        }
        if (updates.stages?.environment?.responsible && hasChanged(updates.stages.environment.responsible, currentProject.stages.environment.responsible)) {
            logMessages.push(`Responsável de Ambiente definido como ${updates.stages.environment.responsible}`);
        }
        if (updates.stages?.conversion?.responsible && hasChanged(updates.stages.conversion.responsible, currentProject.stages.conversion.responsible)) {
            logMessages.push(`Responsável de Conversão definido como ${updates.stages.conversion.responsible}`);
        }
        if (updates.stages?.implementation?.responsible && hasChanged(updates.stages.implementation.responsible, currentProject.stages.implementation.responsible)) {
            logMessages.push(`Responsável de Implantação definido como ${updates.stages.implementation.responsible}`);
        }
        if (updates.stages?.post?.responsible && hasChanged(updates.stages.post.responsible, currentProject.stages.post.responsible)) {
            logMessages.push(`Responsável de Pós-Implantação definido como ${updates.stages.post.responsible}`);
        }

        // Dates (Example for Infra)
        if (updates.stages?.infra?.startDate && hasChanged(updates.stages.infra.startDate, currentProject.stages.infra.startDate)) {
            logMessages.push("Data de início de Infraestrutura atualizada");
        }
        if (updates.stages?.infra?.endDate && hasChanged(updates.stages.infra.endDate, currentProject.stages.infra.endDate)) {
            logMessages.push("Data de fim de Infraestrutura atualizada");
        }
        
        // Global Status
        if (updates.globalStatus && hasChanged(updates.globalStatus, currentProject.globalStatus)) {
            logMessages.push(`Status Global alterado para ${updates.globalStatus}`);
        }

      } else {
        // Fallback if current project not found (shouldn't happen often)
        if (dbUpdates.infra_status) logMessages.push(`Status de Infraestrutura alterado para ${dbUpdates.infra_status}`);
        if (logMessages.length === 0 && Object.keys(dbUpdates).length > 1) {
             logMessages.push("Projeto atualizado");
        }
      }
      
      if (logMessages.length === 0 && Object.keys(dbUpdates).length > 1 && !currentProject) {
         logMessages.push("Projeto atualizado");
      }

      // Return messages to be used in onSuccess
      return logMessages;
    },
    onSuccess: (logMessages, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] }); // Invalidate list
      queryClient.invalidateQueries({ queryKey: ["projectDetails", variables.projectId] }); // Invalidate specific detail
      
      // Create a log entry for each message, or join them
      if (logMessages && logMessages.length > 0) {
        logMessages.forEach(msg => {
          addAutoLog.mutate({
            projectId: variables.projectId,
            message: msg,
            metadata: { action: "update", details: variables.updates },
          });
        });
      }
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
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });

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
    deleteProject: useMutation({
      mutationFn: async (projectId: string) => {
        const { error } = await supabase.from("projects").delete().eq("id", projectId);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
        queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      },
    }),
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

  // Map timeline events to AuditEntry
  const timelineEvents = (row.timeline_events as Record<string, unknown>[]) || [];
  const auditLog = timelineEvents.map(event => ({
    id: event.id as string,
    projectId: event.project_id as string,
    action: event.message as string, // Use message as action description
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
    
    // New fields
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
        // Explicitly read infra-specific status fields to ensure persistence
        workstationsStatus: row.infra_workstations_status as InfraStageV2['workstationsStatus'],
        serverStatus: row.infra_server_status as InfraStageV2['serverStatus'],
        workstationsCount: row.infra_workstations_count as number | undefined,
      },
      adherence: createStage<AdherenceStageV2>('adherence'),
      environment: createStage<EnvironmentStageV2>('environment'),
      conversion: {
        ...createStage<ConversionStageV2>('conversion'),
        // Explicitly read conversion-specific status fields
        homologationStatus: row.conversion_homologation_status as ConversionStageV2['homologationStatus'],
        homologationResponsible: row.conversion_homologation_responsible as string | undefined,
      },
      implementation: createStage<ImplementationStageV2>('implementation'),
      post: createStage<PostStageV2>('post'),
    },
    
    timeline: [], // Fetch separately or include if joined
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

// Transform Project V3 to DB row
function transformToDB(project: Partial<ProjectV2>): Record<string, unknown> {
  const dbRow: Record<string, unknown> = {};

  if (project.clientName) dbRow.client_name = project.clientName;
  if (project.ticketNumber) dbRow.ticket_number = project.ticketNumber;
  if (project.relatedTickets) dbRow.related_tickets = project.relatedTickets;
  if (project.systemType) dbRow.system_type = project.systemType;
  if (project.implantationType) dbRow.implantation_type = project.implantationType;
  if (project.projectType) dbRow.project_type = project.projectType;
  if (project.globalStatus) dbRow.global_status = project.globalStatus;
  if (project.overallProgress !== undefined) dbRow.overall_progress = project.overallProgress;
  
  // New fields
  if (project.opNumber) dbRow.op_number = project.opNumber;
  if (project.salesOrderNumber) dbRow.sales_order_number = project.salesOrderNumber;
  if (project.soldHours) dbRow.sold_hours = project.soldHours;
  if (project.legacySystem) dbRow.legacy_system = project.legacySystem;
  if (project.specialty) dbRow.specialty = project.specialty;

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
      dbRow.infra_technical_notes = s.technicalNotes;
      dbRow.infra_workstations_status = s.workstationsStatus;
      dbRow.infra_server_status = s.serverStatus;
      dbRow.infra_workstations_count = s.workstationsCount;
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
      dbRow.conversion_data_volume_gb = s.dataVolumeGb || null;
      dbRow.conversion_tool_used = s.toolUsed;
      dbRow.conversion_homologation_date = s.homologationDate || null;
      dbRow.conversion_deviations = s.deviations;
      
      // New Conversion Fields
      dbRow.conversion_homologation_status = s.homologationStatus;
      dbRow.conversion_homologation_responsible = s.homologationResponsible;
      // dbRow.conversion_sent_at = s.sentAt || null; 
      // dbRow.conversion_finished_at = s.finishedAt || null; 
    }

    // Implementation
    if (stages.implementation) {
      const s = stages.implementation;
      dbRow.implementation_status = s.status;
      dbRow.implementation_responsible = s.responsible;
      dbRow.implementation_observations = s.observations;
      dbRow.implementation_phase1 = s.phase1;
      dbRow.implementation_phase2 = s.phase2;
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
    // Ensure notes is passed as a plain object for JSONB column
    // Supabase client handles the serialization
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
