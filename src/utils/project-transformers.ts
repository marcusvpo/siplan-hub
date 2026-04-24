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
  AuditEntry
} from "@/types/ProjectV2";

export function calculateHealthScore(row: Record<string, unknown>): "ok" | "warning" | "critical" {
  const now = new Date();
  const lastUpdate = row.updated_at ? new Date(row.updated_at as string) : new Date();
  const diffDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);

  if (row.global_status === "done") return "ok";
  if (diffDays > 7) return "critical";
  if (diffDays > 3) return "warning";
  return "ok";
}

// Transform DB row to Project V3 interface
export function transformToProjectV3(row: Record<string, unknown>): ProjectV2 {
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
          key !== `${prefix}_status` &&
          key !== `${prefix}_responsible` &&
          key !== `${prefix}_start_date` &&
          key !== `${prefix}_end_date` &&
          key !== `${prefix}_observations`) {
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
  // Timeline events are no longer fetched in the main query for performance
  // They should be fetched separately using useTimelineEvents hook when needed
  const auditLog: AuditEntry[] = [];

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
    products: (row.products as string[]) || [],

    // Integração 0800
    TituloChamado: row.TituloChamado as string | undefined,
    descricaotramite: row.descricaotramite as string | undefined,
    ResponsavelAtividade: row.ResponsavelAtividade as string | undefined,
    EtapasProjeto: row.EtapasProjeto as string | undefined,

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
    responsibleEnvironment: (row.environment_responsible as string) || '',

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
      modelosEditor: createStage<ModelosEditorStageV2>('modelos_editor'),
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

// Safe date formatter - prevents Invalid Date and standardizes output
export function formatDateForDB(date: Date | string | null | undefined): string | null {
  if (date === null || date === undefined) return null;
  if (typeof date === 'string') {
    if (!date) return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

// Resolve responsible names to profile UUIDs
export async function resolveResponsibleIds(dbRow: Record<string, unknown>): Promise<void> {
  const fields = [
    { nameCol: 'project_leader', idCol: 'project_leader_id' },
    { nameCol: 'infra_responsible', idCol: 'infra_responsible_id' },
    { nameCol: 'adherence_responsible', idCol: 'adherence_responsible_id' },
    { nameCol: 'environment_responsible', idCol: 'environment_responsible_id' },
    { nameCol: 'conversion_responsible', idCol: 'conversion_responsible_id' },
    { nameCol: 'implementation_responsible', idCol: 'implementation_responsible_id' },
    { nameCol: 'post_responsible', idCol: 'post_responsible_id' },
    { nameCol: 'conversion_homologation_responsible', idCol: 'conversion_homologation_responsible_id' },
  ];
  const names = fields
    .filter(f => typeof dbRow[f.nameCol] === 'string' && dbRow[f.nameCol])
    .map(f => dbRow[f.nameCol] as string);
  if (names.length === 0) return;
  const uniqueNames = [...new Set(names)];
  const { data: mappings } = await supabase
    .from('responsible_name_mapping')
    .select('name, user_id')
    .in('name', uniqueNames);
  if (!mappings || mappings.length === 0) return;
  const nameToId = new Map(mappings.map(m => [m.name, m.user_id]));
  for (const field of fields) {
    const name = dbRow[field.nameCol] as string;
    if (name && nameToId.has(name)) {
      dbRow[field.idCol] = nameToId.get(name);
    }
  }
}

// Transform Project V3 to DB row
export function transformToDB(project: Partial<ProjectV2>, currentProject?: ProjectV2): Record<string, unknown> {
  const dbRow: Record<string, unknown> = {};

  // All guards use !== undefined to allow saving falsy values (0, "", false)
  if (project.clientName !== undefined) dbRow.client_name = project.clientName;
  if (project.ticketNumber !== undefined) dbRow.ticket_number = project.ticketNumber;
  if (project.relatedTickets !== undefined) dbRow.related_tickets = project.relatedTickets;
  if (project.systemType !== undefined) dbRow.system_type = project.systemType;
  if (project.implantationType !== undefined) dbRow.implantation_type = project.implantationType;
  if (project.projectType !== undefined) dbRow.project_type = project.projectType;
  if (project.globalStatus !== undefined) dbRow.global_status = project.globalStatus;
  if (project.overallProgress !== undefined) dbRow.overall_progress = project.overallProgress;

  if (project.opNumber !== undefined) dbRow.op_number = project.opNumber;
  if (project.salesOrderNumber !== undefined) dbRow.sales_order_number = project.salesOrderNumber;
  if (project.soldHours !== undefined) dbRow.sold_hours = project.soldHours;
  if (project.legacySystem !== undefined) dbRow.legacy_system = project.legacySystem;
  if (project.specialty !== undefined) dbRow.specialty = project.specialty;
  if (project.products !== undefined) dbRow.products = project.products;

  // Missing field mappings added
  if (project.description !== undefined) dbRow.description = project.description;
  if (project.specialConsiderations !== undefined) dbRow.special_considerations = project.specialConsiderations;
  if (project.contractValue !== undefined) dbRow.contract_value = project.contractValue;
  if (project.paymentMethod !== undefined) dbRow.payment_method = project.paymentMethod;
  if (project.externalId !== undefined) dbRow.external_id = project.externalId;

  if (project.projectLeader !== undefined) dbRow.project_leader = project.projectLeader;
  if (project.clientPrimaryContact !== undefined) dbRow.client_primary_contact = project.clientPrimaryContact;
  if (project.clientEmail !== undefined) dbRow.client_email = project.clientEmail;
  if (project.clientPhone !== undefined) dbRow.client_phone = project.clientPhone;
  if (project.responsibleInfra !== undefined) dbRow.infra_responsible = project.responsibleInfra;
  if (project.responsibleAdherence !== undefined) dbRow.adherence_responsible = project.responsibleAdherence;
  if (project.responsibleEnvironment !== undefined) dbRow.environment_responsible = project.responsibleEnvironment;
  if (project.responsibleConversion !== undefined) dbRow.conversion_responsible = project.responsibleConversion;
  if (project.responsibleImplementation !== undefined) dbRow.implementation_responsible = project.responsibleImplementation;
  if (project.responsiblePost !== undefined) dbRow.post_responsible = project.responsiblePost;

  if (project.startDatePlanned !== undefined) dbRow.start_date_planned = formatDateForDB(project.startDatePlanned);
  if (project.endDatePlanned !== undefined) dbRow.end_date_planned = formatDateForDB(project.endDatePlanned);
  if (project.startDateActual !== undefined) dbRow.start_date_actual = formatDateForDB(project.startDateActual);
  if (project.endDateActual !== undefined) dbRow.end_date_actual = formatDateForDB(project.endDateActual);
  if (project.nextFollowUpDate !== undefined) dbRow.next_follow_up_date = formatDateForDB(project.nextFollowUpDate);

  if (project.tags !== undefined) dbRow.tags = project.tags;
  if (project.priority !== undefined) dbRow.priority = project.priority;
  if (project.customFields !== undefined) dbRow.custom_fields = project.customFields;

  if (project.isDeleted !== undefined) {
    dbRow.is_deleted = project.isDeleted;
    if (project.isDeleted && !currentProject?.isDeleted) {
      dbRow.deleted_at = new Date().toISOString();
      if (project.deletedBy) dbRow.deleted_by = project.deletedBy;
    }
  }
  if (project.isArchived !== undefined) {
    dbRow.is_archived = project.isArchived;
    if (project.isArchived && !currentProject?.isArchived) {
      dbRow.archived_at = new Date().toISOString();
    }
  }

  // Integração 0800
  if (project.TituloChamado !== undefined) dbRow.TituloChamado = project.TituloChamado;
  if (project.descricaotramite !== undefined) dbRow.descricaotramite = project.descricaotramite;
  if (project.ResponsavelAtividade !== undefined) dbRow.ResponsavelAtividade = project.ResponsavelAtividade;
  if (project.EtapasProjeto !== undefined) dbRow.EtapasProjeto = project.EtapasProjeto;

  // Stages flattening
  if (project.stages) {
    const stages = project.stages;

    // Infra
    if (stages.infra) {
      const s = stages.infra;
      const oldStatus = currentProject?.stages?.infra?.status;
      const newStatus = s.status;

      dbRow.infra_status = s.status;
      dbRow.infra_responsible = s.responsible;

      // Auto-fill startDate if changing to in-progress and no startDate exists
      if (newStatus === 'in-progress' && oldStatus !== 'in-progress' && !s.startDate) {
        dbRow.infra_start_date = new Date().toISOString();
      } else {
        dbRow.infra_start_date = formatDateForDB(s.startDate);
      }

      // Auto-fill endDate if changing to done and no endDate exists
      if (newStatus === 'done' && oldStatus !== 'done' && !s.endDate) {
        dbRow.infra_end_date = new Date().toISOString();
      } else {
        dbRow.infra_end_date = formatDateForDB(s.endDate);
      }

      dbRow.infra_observations = s.observations;
      dbRow.infra_technical_notes = s.technicalNotes;
      dbRow.infra_workstations_status = s.workstationsStatus;
      dbRow.infra_server_status = s.serverStatus;
      dbRow.infra_workstations_count = s.workstationsCount;
      dbRow.infra_blocking_reason = s.blockingReason;
      dbRow.infra_approved_by_infra = s.approvedByInfra;
      dbRow.infra_server_in_use = s.serverInUse;
      dbRow.infra_server_needed = s.serverNeeded;
    }

    // Adherence
    if (stages.adherence) {
      const s = stages.adherence;
      const oldStatus = currentProject?.stages?.adherence?.status;
      const newStatus = s.status;

      dbRow.adherence_status = s.status;
      dbRow.adherence_responsible = s.responsible;

      // Auto-fill dates
      if (newStatus === 'in-progress' && oldStatus !== 'in-progress' && !s.startDate) {
        dbRow.adherence_start_date = new Date().toISOString();
      } else {
        dbRow.adherence_start_date = formatDateForDB(s.startDate);
      }

      if (newStatus === 'done' && oldStatus !== 'done' && !s.endDate) {
        dbRow.adherence_end_date = new Date().toISOString();
      } else {
        dbRow.adherence_end_date = formatDateForDB(s.endDate);
      }

      dbRow.adherence_observations = s.observations;
      dbRow.adherence_has_product_gap = s.hasProductGap;
      dbRow.adherence_gap_description = s.gapDescription;
      dbRow.adherence_dev_ticket = s.devTicket;
      dbRow.adherence_dev_estimated_date = formatDateForDB(s.devEstimatedDate);
      dbRow.adherence_gap_priority = s.gapPriority;
      dbRow.adherence_analysis_complete = s.analysisComplete;
      dbRow.adherence_conformity_standards = s.conformityStandards;
    }

    // Environment
    if (stages.environment) {
      const s = stages.environment;
      const oldStatus = currentProject?.stages?.environment?.status;
      const newStatus = s.status;

      dbRow.environment_status = s.status;
      dbRow.environment_responsible = s.responsible;

      // Auto-fill dates
      if (newStatus === 'in-progress' && oldStatus !== 'in-progress' && !s.startDate) {
        dbRow.environment_start_date = new Date().toISOString();
      } else {
        dbRow.environment_start_date = formatDateForDB(s.startDate);
      }

      if (newStatus === 'done' && oldStatus !== 'done' && !s.endDate) {
        dbRow.environment_end_date = new Date().toISOString();
      } else {
        dbRow.environment_end_date = formatDateForDB(s.endDate);
      }

      dbRow.environment_real_date = formatDateForDB(s.realDate);
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
      const oldStatus = currentProject?.stages?.conversion?.status;
      const newStatus = s.status;

      dbRow.conversion_status = s.status;
      dbRow.conversion_responsible = s.responsible;

      // FIX: Write to correct columns (conversion_start_date/end_date)
      if (newStatus === 'in-progress' && oldStatus !== 'in-progress' && !s.startDate) {
        dbRow.conversion_start_date = new Date().toISOString();
      } else {
        dbRow.conversion_start_date = formatDateForDB(s.startDate);
      }

      if (newStatus === 'done' && oldStatus !== 'done' && !s.endDate) {
        dbRow.conversion_end_date = new Date().toISOString();
      } else {
        dbRow.conversion_end_date = formatDateForDB(s.endDate);
      }

      dbRow.conversion_observations = s.observations;
      dbRow.conversion_complexity = s.complexity;
      dbRow.conversion_data_volume_gb = s.dataVolumeGb ?? null;
      dbRow.conversion_tool_used = s.toolUsed;
      dbRow.conversion_homologation_date = formatDateForDB(s.homologationDate);
      dbRow.conversion_deviations = s.deviations;
      dbRow.conversion_homologation_status = s.homologationStatus;
      dbRow.conversion_homologation_responsible = s.homologationResponsible;
      dbRow.conversion_sent_at = formatDateForDB(s.sentAt);
      dbRow.conversion_finished_at = formatDateForDB(s.finishedAt);
      dbRow.conversion_homologation_complete = s.homologationComplete;
      dbRow.conversion_homologation_workflow_status = s.homologationWorkflowStatus;
      dbRow.conversion_record_count = s.recordCount;
    }

    // Implementation
    if (stages.implementation) {
      const s = stages.implementation;
      const oldStatus = currentProject?.stages?.implementation?.status;
      const newStatus = s.status;

      dbRow.implementation_status = s.status;
      dbRow.implementation_responsible = s.responsible;

      // Auto-fill dates
      if (newStatus === 'in-progress' && oldStatus !== 'in-progress' && !s.startDate) {
        dbRow.implementation_start_date = new Date().toISOString();
      } else {
        dbRow.implementation_start_date = formatDateForDB(s.startDate);
      }

      if (newStatus === 'done' && oldStatus !== 'done' && !s.endDate) {
        dbRow.implementation_end_date = new Date().toISOString();
      } else {
        dbRow.implementation_end_date = formatDateForDB(s.endDate);
      }

      dbRow.implementation_observations = s.observations;
      dbRow.implementation_phase1 = s.phase1;
      dbRow.implementation_phase2 = s.phase2;
    }

    // Modelos Editor
    if (stages.modelosEditor) {
      const s = stages.modelosEditor;
      const oldStatus = currentProject?.stages?.modelosEditor?.status;
      const newStatus = s.status;

      dbRow.modelos_editor_status = s.status;
      dbRow.modelos_editor_responsible = s.responsible;

      if (newStatus === 'in-progress' && oldStatus !== 'in-progress' && !s.startDate) {
        dbRow.modelos_editor_start_date = new Date().toISOString();
      } else {
        dbRow.modelos_editor_start_date = formatDateForDB(s.startDate);
      }

      if (newStatus === 'done' && oldStatus !== 'done' && !s.endDate) {
        dbRow.modelos_editor_end_date = new Date().toISOString();
      } else {
        dbRow.modelos_editor_end_date = formatDateForDB(s.endDate);
      }

      dbRow.modelos_editor_observations = s.observations;

      // Ensure specific file fields are handled for JSONB
      if (s.sentFiles !== undefined) {
        dbRow.modelos_editor_sent_files = s.sentFiles;
      }
      if (s.availableFiles !== undefined) {
        dbRow.modelos_editor_available_files = s.availableFiles;
      }
    }

    // Post
    if (stages.post) {
      const s = stages.post;
      const oldStatus = currentProject?.stages?.post?.status;
      const newStatus = s.status;

      dbRow.post_status = s.status;
      dbRow.post_responsible = s.responsible;

      // Auto-fill dates
      if (newStatus === 'in-progress' && oldStatus !== 'in-progress' && !s.startDate) {
        dbRow.post_start_date = new Date().toISOString();
      } else {
        dbRow.post_start_date = formatDateForDB(s.startDate);
      }

      if (newStatus === 'done' && oldStatus !== 'done' && !s.endDate) {
        dbRow.post_end_date = new Date().toISOString();
      } else {
        dbRow.post_end_date = formatDateForDB(s.endDate);
      }

      dbRow.post_observations = s.observations;
      dbRow.post_support_period_days = s.supportPeriodDays ?? null;
      dbRow.post_support_end_date = formatDateForDB(s.supportEndDate);
      dbRow.post_benefits_delivered = s.benefitsDelivered;
      dbRow.post_challenges_found = s.challengesFound;
      dbRow.post_roi_estimated = s.roiEstimated;
      dbRow.post_client_satisfaction = s.clientSatisfaction;
      dbRow.post_recommendations = s.recommendations;
      dbRow.post_followup_needed = s.followupNeeded;
      dbRow.post_followup_date = formatDateForDB(s.followupDate);
    }
  }

  // Notes
  if (project.notes) {
    // Ensure notes is passed as a plain object for JSONB column
    // Supabase client handles the serialization
    dbRow.notes = project.notes;
  }

  // Ensure last_update_by is always set (required by DB)
  // Note: The actual user name should be set by the calling code
  if (project.lastUpdatedBy) {
    dbRow.last_update_by = project.lastUpdatedBy;
  }
  // If not provided, caller should ensure it's set before calling

  return dbRow;
}
