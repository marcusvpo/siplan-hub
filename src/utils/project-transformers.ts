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
  AuditEntry,
  ProjectTramite
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
    tramites: (row.project_tramites as ProjectTramite[]) || [],

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

// Helper to resolve stage start/end dates with auto-fill logic
function resolveStageDates(
  newStatus: StageStatus | undefined,
  oldStatus: StageStatus | undefined,
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): { startDate: string | null; endDate: string | null } {
  let finalStart: string | null = null;
  let finalEnd: string | null = null;

  if (newStatus === 'in-progress' && oldStatus !== 'in-progress' && !startDate) {
    finalStart = new Date().toISOString();
  } else {
    finalStart = formatDateForDB(startDate);
  }

  if (newStatus === 'done' && oldStatus !== 'done' && !endDate) {
    finalEnd = new Date().toISOString();
  } else {
    finalEnd = formatDateForDB(endDate);
  }

  return { startDate: finalStart, endDate: finalEnd };
}

// Stage-specific flattener helpers
function mapInfraStage(infra: InfraStageV2 | undefined, oldInfra?: InfraStageV2): Record<string, unknown> {
  if (!infra) return {};
  const { startDate, endDate } = resolveStageDates(infra.status, oldInfra?.status, infra.startDate, infra.endDate);

  return {
    infra_status: infra.status,
    infra_responsible: infra.responsible,
    infra_start_date: startDate,
    infra_end_date: endDate,
    infra_observations: infra.observations,
    infra_technical_notes: infra.technicalNotes,
    infra_workstations_status: infra.workstationsStatus,
    infra_server_status: infra.serverStatus,
    infra_workstations_count: infra.workstationsCount,
    infra_blocking_reason: infra.blockingReason,
    infra_approved_by_infra: infra.approvedByInfra,
    infra_server_in_use: infra.serverInUse,
    infra_server_needed: infra.serverNeeded,
  };
}

function mapAdherenceStage(adherence: AdherenceStageV2 | undefined, oldAdherence?: AdherenceStageV2): Record<string, unknown> {
  if (!adherence) return {};
  const { startDate, endDate } = resolveStageDates(adherence.status, oldAdherence?.status, adherence.startDate, adherence.endDate);

  return {
    adherence_status: adherence.status,
    adherence_responsible: adherence.responsible,
    adherence_start_date: startDate,
    adherence_end_date: endDate,
    adherence_observations: adherence.observations,
    adherence_has_product_gap: adherence.hasProductGap,
    adherence_gap_description: adherence.gapDescription,
    adherence_dev_ticket: adherence.devTicket,
    adherence_dev_estimated_date: formatDateForDB(adherence.devEstimatedDate),
    adherence_gap_priority: adherence.gapPriority,
    adherence_analysis_complete: adherence.analysisComplete,
    adherence_conformity_standards: adherence.conformityStandards,
  };
}

function mapEnvironmentStage(environment: EnvironmentStageV2 | undefined, oldEnvironment?: EnvironmentStageV2): Record<string, unknown> {
  if (!environment) return {};
  const { startDate, endDate } = resolveStageDates(environment.status, oldEnvironment?.status, environment.startDate, environment.endDate);

  return {
    environment_status: environment.status,
    environment_responsible: environment.responsible,
    environment_start_date: startDate,
    environment_end_date: endDate,
    environment_real_date: formatDateForDB(environment.realDate),
    environment_observations: environment.observations,
    environment_os_version: environment.osVersion,
    environment_version: environment.version,
    environment_test_available: environment.testAvailable,
    environment_preparation_checklist: environment.preparationChecklist,
    environment_approved_by_infra: environment.approvedByInfra,
  };
}

function mapConversionStage(conversion: ConversionStageV2 | undefined, oldConversion?: ConversionStageV2): Record<string, unknown> {
  if (!conversion) return {};
  const { startDate, endDate } = resolveStageDates(conversion.status, oldConversion?.status, conversion.startDate, conversion.endDate);

  return {
    conversion_status: conversion.status,
    conversion_responsible: conversion.responsible,
    conversion_start_date: startDate,
    conversion_end_date: endDate,
    conversion_observations: conversion.observations,
    conversion_complexity: conversion.complexity,
    conversion_data_volume_gb: conversion.dataVolumeGb ?? null,
    conversion_tool_used: conversion.toolUsed,
    conversion_homologation_date: formatDateForDB(conversion.homologationDate),
    conversion_deviations: conversion.deviations,
    conversion_homologation_status: conversion.homologationStatus,
    conversion_homologation_responsible: conversion.homologationResponsible,
    conversion_sent_at: formatDateForDB(conversion.sentAt),
    conversion_finished_at: formatDateForDB(conversion.finishedAt),
    conversion_homologation_complete: conversion.homologationComplete,
    conversion_homologation_workflow_status: conversion.homologationWorkflowStatus,
    conversion_record_count: conversion.recordCount,
  };
}

function mapImplementationStage(implementation: ImplementationStageV2 | undefined, oldImplementation?: ImplementationStageV2): Record<string, unknown> {
  if (!implementation) return {};
  const { startDate, endDate } = resolveStageDates(implementation.status, oldImplementation?.status, implementation.startDate, implementation.endDate);

  return {
    implementation_status: implementation.status,
    implementation_responsible: implementation.responsible,
    implementation_start_date: startDate,
    implementation_end_date: endDate,
    implementation_observations: implementation.observations,
    implementation_phase1: implementation.phase1,
    implementation_phase2: implementation.phase2,
  };
}

function mapModelosEditorStage(modelosEditor: ModelosEditorStageV2 | undefined, oldModelosEditor?: ModelosEditorStageV2): Record<string, unknown> {
  if (!modelosEditor) return {};
  const { startDate, endDate } = resolveStageDates(modelosEditor.status, oldModelosEditor?.status, modelosEditor.startDate, modelosEditor.endDate);

  const result: Record<string, unknown> = {
    modelos_editor_status: modelosEditor.status,
    modelos_editor_responsible: modelosEditor.responsible,
    modelos_editor_start_date: startDate,
    modelos_editor_end_date: endDate,
    modelos_editor_observations: modelosEditor.observations,
  };

  if (modelosEditor.sentFiles !== undefined) {
    result.modelos_editor_sent_files = modelosEditor.sentFiles;
  }
  if (modelosEditor.availableFiles !== undefined) {
    result.modelos_editor_available_files = modelosEditor.availableFiles;
  }

  return result;
}

function mapPostStage(post: PostStageV2 | undefined, oldPost?: PostStageV2): Record<string, unknown> {
  if (!post) return {};
  const { startDate, endDate } = resolveStageDates(post.status, oldPost?.status, post.startDate, post.endDate);

  return {
    post_status: post.status,
    post_responsible: post.responsible,
    post_start_date: startDate,
    post_end_date: endDate,
    post_observations: post.observations,
    post_support_period_days: post.supportPeriodDays ?? null,
    post_support_end_date: formatDateForDB(post.supportEndDate),
    post_benefits_delivered: post.benefitsDelivered,
    post_challenges_found: post.challengesFound,
    post_roi_estimated: post.roiEstimated,
    post_client_satisfaction: post.clientSatisfaction,
    post_recommendations: post.recommendations,
    post_followup_needed: post.followupNeeded,
    post_followup_date: formatDateForDB(post.followupDate),
  };
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
    const oldStages = currentProject?.stages;

    Object.assign(dbRow, {
      ...mapInfraStage(stages.infra, oldStages?.infra),
      ...mapAdherenceStage(stages.adherence, oldStages?.adherence),
      ...mapEnvironmentStage(stages.environment, oldStages?.environment),
      ...mapConversionStage(stages.conversion, oldStages?.conversion),
      ...mapImplementationStage(stages.implementation, oldStages?.implementation),
      ...mapModelosEditorStage(stages.modelosEditor, oldStages?.modelosEditor),
      ...mapPostStage(stages.post, oldStages?.post),
    });
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

  return dbRow;
}

