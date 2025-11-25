import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectV2 } from "@/types/ProjectV2";
import { useTimeline } from "./useTimeline";

export const useProjectsV2 = () => {
  const queryClient = useQueryClient();
  const { addAutoLog } = useTimeline();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projectsV2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(transformToProjectV2);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: any }) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectsV2"] });
      
      // Log automático de mudanças
      Object.keys(variables.updates).forEach((field) => {
        addAutoLog.mutate({
          projectId: variables.projectId,
          message: `Campo ${field} atualizado`,
          metadata: { field, newValue: variables.updates[field] },
        });
      });
    },
  });

  const createProject = useMutation({
    mutationFn: async (project: Partial<ProjectV2>) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          client_name: project.clientName,
          ticket_number: project.ticketNumber,
          system_type: project.systemType,
          project_leader: project.projectLeader,
          implantation_type: project.implantationType || "new",
          priority: project.priority || "normal",
          project_type: project.projectType || "new",
          global_status: "in-progress",
          overall_progress: 0,
          last_update_by: "Sistema",
          tags: project.tags || [],
          op_number: project.opNumber,
          sales_order_number: project.salesOrderNumber,
          sold_hours: project.soldHours,
          legacy_system: project.legacySystem,
          specialty: project.specialty,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projectsV2"] });
      
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

// Transform DB row to ProjectV2 interface
function transformToProjectV2(row: any): ProjectV2 {
  return {
    id: row.id,
    externalId: row.external_id,
    clientName: row.client_name,
    ticketNumber: row.ticket_number,
    opNumber: row.op_number,
    salesOrderNumber: row.sales_order_number,
    soldHours: row.sold_hours,
    legacySystem: row.legacy_system,
    specialty: row.specialty,
    systemType: row.system_type,
    implantationType: row.implantation_type || "new",
    tags: row.tags || [],
    priority: row.priority || "normal",
    projectType: row.project_type || "new",
    healthScore: calculateHealthScore(row),
    globalStatus: row.global_status || "in-progress",
    overallProgress: row.overall_progress || 0,
    description: row.description,
    specialConsiderations: row.special_considerations,
    contractValue: row.contract_value,
    paymentMethod: row.payment_method,
    projectLeader: row.project_leader,
    clientPrimaryContact: row.client_primary_contact,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    responsibleInfra: row.infra_responsible,
    responsibleAdherence: row.adherence_responsible,
    responsibleEnvironment: row.responsible_environment,
    responsibleConversion: row.conversion_responsible,
    responsibleImplementation: row.implementation_responsible,
    responsiblePost: row.post_responsible,
    createdAt: new Date(row.created_at),
    startDatePlanned: row.start_date_planned ? new Date(row.start_date_planned) : undefined,
    endDatePlanned: row.end_date_planned ? new Date(row.end_date_planned) : undefined,
    startDateActual: row.start_date_actual ? new Date(row.start_date_actual) : undefined,
    endDateActual: row.end_date_actual ? new Date(row.end_date_actual) : undefined,
    nextFollowUpDate: row.next_follow_up_date ? new Date(row.next_follow_up_date) : undefined,
    lastUpdatedAt: new Date(row.updated_at),
    lastUpdatedBy: row.last_update_by,
    stages: {
      infra: {
        status: row.infra_status,
        responsible: row.infra_responsible,
        startDate: row.infra_start_date ? new Date(row.infra_start_date) : undefined,
        endDate: row.infra_end_date ? new Date(row.infra_end_date) : undefined,
        blockingReason: row.infra_blocking_reason,
        serverInUse: row.infra_server_in_use,
        serverNeeded: row.infra_server_needed,
        approvedByInfra: row.infra_approved_by_infra || false,
        technicalNotes: row.infra_technical_notes,
        observations: row.infra_observations,
      },
      adherence: {
        status: row.adherence_status,
        responsible: row.adherence_responsible,
        startDate: row.adherence_start_date ? new Date(row.adherence_start_date) : undefined,
        endDate: row.adherence_end_date ? new Date(row.adherence_end_date) : undefined,
        hasProductGap: row.adherence_has_product_gap || false,
        gapDescription: row.adherence_gap_description,
        devTicket: row.adherence_dev_ticket,
        devEstimatedDate: row.adherence_dev_estimated_date ? new Date(row.adherence_dev_estimated_date) : undefined,
        gapPriority: row.adherence_gap_priority,
        analysisComplete: row.adherence_analysis_complete || false,
        conformityStandards: row.adherence_conformity_standards,
        observations: row.adherence_observations,
      },
      environment: {
        status: row.environment_status,
        responsible: row.environment_responsible,
        osVersion: row.environment_os_version,
        version: row.environment_version,
        realDate: row.environment_real_date ? new Date(row.environment_real_date) : undefined,
        approvedByInfra: row.environment_approved_by_infra || false,
        testAvailable: row.environment_test_available || false,
        preparationChecklist: row.environment_preparation_checklist,
        observations: row.environment_observations,
      },
      conversion: {
        status: row.conversion_status,
        responsible: row.conversion_responsible,
        sourceSystem: row.conversion_source_system,
        complexity: row.conversion_complexity,
        recordCount: row.conversion_record_count,
        dataVolumeGb: row.conversion_data_volume_gb,
        toolUsed: row.conversion_tool_used,
        homologationComplete: row.conversion_homologation_complete || false,
        homologationDate: row.conversion_homologation_date ? new Date(row.conversion_homologation_date) : undefined,
        deviations: row.conversion_deviations,
        observations: row.conversion_observations,
      },
      implementation: {
        status: row.implementation_status,
        responsible: row.implementation_responsible,
        remoteInstallDate: row.implementation_remote_install_date
          ? new Date(row.implementation_remote_install_date)
          : undefined,
        switchType: row.implementation_switch_type,
        switchStartTime: row.implementation_switch_start_time,
        switchEndTime: row.implementation_switch_end_time,
        trainingStartDate: row.implementation_training_start_date
          ? new Date(row.implementation_training_start_date)
          : undefined,
        trainingEndDate: row.implementation_training_end_date
          ? new Date(row.implementation_training_end_date)
          : undefined,
        trainingType: row.implementation_training_type,
        trainingLocation: row.implementation_training_location,
        participantsCount: row.implementation_participants_count,
        clientFeedback: row.implementation_client_feedback,
        acceptanceStatus: row.implementation_acceptance_status,
        observations: row.implementation_observations,
      },
      post: {
        status: row.post_status,
        responsible: row.post_responsible,
        startDate: row.post_start_date ? new Date(row.post_start_date) : undefined,
        endDate: row.post_end_date ? new Date(row.post_end_date) : undefined,
        supportPeriodDays: row.post_support_period_days,
        supportEndDate: row.post_support_end_date ? new Date(row.post_support_end_date) : undefined,
        benefitsDelivered: row.post_benefits_delivered,
        challengesFound: row.post_challenges_found,
        roiEstimated: row.post_roi_estimated,
        clientSatisfaction: row.post_client_satisfaction,
        recommendations: row.post_recommendations,
        followupNeeded: row.post_followup_needed || false,
        followupDate: row.post_followup_date ? new Date(row.post_followup_date) : undefined,
        observations: row.post_observations,
      },
    },
    isDeleted: row.is_deleted || false,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    deletedBy: row.deleted_by,
    isArchived: row.is_archived || false,
    archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
    customFields: row.custom_fields || {},
  };
}

function calculateHealthScore(row: any): "ok" | "warning" | "critical" {
  const now = new Date();
  const lastUpdate = new Date(row.updated_at);
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  // Follow-up vencido
  if (row.next_follow_up_date && new Date(row.next_follow_up_date) < now) {
    return "critical";
  }

  // Sem update > 5 dias
  if (daysSinceUpdate > 5) {
    return "critical";
  }

  // Bloqueado
  if (
    row.infra_status === "blocked" ||
    row.adherence_status === "blocked" ||
    row.conversion_status === "blocked"
  ) {
    return "warning";
  }

  // Sem update 2-5 dias
  if (daysSinceUpdate >= 2) {
    return "warning";
  }

  return "ok";
}
