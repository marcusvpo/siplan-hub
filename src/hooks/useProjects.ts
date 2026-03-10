import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectV2, TimelineEventV2 } from "@/types/ProjectV2";
import { calculateHealthScore } from "@/utils/calculations";
import { useAuth } from "@/hooks/useAuth";

export const useProjects = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get the current user's name
  const getCurrentUserName = (): string => {
    if (!user) return "Sistema";
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";
  };

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((proj: Record<string, any>) => {
        const timeline: TimelineEventV2[] = [];

        const createStage = <T extends { status: any }>(prefix: string): T => {
          const stage = {
            status: proj[`${prefix}_status`] || 'todo',
            responsible: proj[`${prefix}_responsible`] || '',
            startDate: proj[`${prefix}_start_date`] ? new Date(proj[`${prefix}_start_date`]) : undefined,
            endDate: proj[`${prefix}_end_date`] ? new Date(proj[`${prefix}_end_date`]) : undefined,
            observations: proj[`${prefix}_observations`] || '',
            ...Object.keys(proj).reduce((acc, key) => {
              if (key.startsWith(prefix + '_') &&
                !key.endsWith('_status') &&
                !key.endsWith('_responsible') &&
                !key.endsWith('_start_date') &&
                !key.endsWith('_end_date') &&
                !key.endsWith('_observations')) {
                const propName = key.replace(prefix + '_', '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                acc[propName] = proj[key];
              }
              return acc;
            }, {} as Record<string, any>)
          };
          return stage as unknown as T;
        };

        const tempProject: ProjectV2 = {
          id: proj.id,
          clientName: proj.client_name,
          ticketNumber: proj.ticket_number,
          systemType: proj.system_type,
          projectLeader: proj.project_leader,
          soldHours: proj.sold_hours,
          opNumber: proj.op_number,
          salesOrderNumber: proj.sales_order_number,
          createdAt: new Date(proj.created_at),
          lastUpdatedAt: new Date(proj.updated_at),
          lastUpdatedBy: proj.last_update_by || "Sistema",
          nextFollowUpDate: proj.next_follow_up_date ? new Date(proj.next_follow_up_date) : undefined,

          // New fields defaults
          projectType: proj.project_type || "new",
          implantationType: proj.implantation_type || "new",
          globalStatus: proj.global_status || "in-progress",
          overallProgress: proj.overall_progress || 0,
          isDeleted: proj.is_deleted || false,
          isArchived: proj.is_archived || false,
          healthScore: "ok", // Placeholder, calculated below
          priority: proj.priority || "normal",
          tags: proj.tags || [],

          stages: {
            infra: {
              ...createStage('infra'),
              blockingReason: proj.infra_blocking_reason,
              workstationsStatus: proj.infra_workstations_status,
              serverStatus: proj.infra_server_status,
              workstationsCount: proj.infra_workstations_count,
            } as any,
            adherence: {
              ...createStage('adherence'),
              hasProductGap: proj.adherence_has_product_gap || false,
              gapDescription: proj.adherence_gap_description,
              devTicket: proj.adherence_dev_ticket,
              devEstimatedDate: proj.adherence_dev_estimated_date ? new Date(proj.adherence_dev_estimated_date) : undefined,
              gapPriority: proj.adherence_gap_priority,
              analysisComplete: proj.adherence_analysis_complete || false,
              conformityStandards: proj.adherence_conformity_standards,
            } as any,
            environment: {
              ...createStage('environment'),
              realDate: proj.environment_real_date ? new Date(proj.environment_real_date) : undefined,
              osVersion: proj.environment_os_version,
              version: proj.environment_version,
              approvedByInfra: proj.environment_approved_by_infra || false,
              testAvailable: proj.environment_test_available || false,
              preparationChecklist: proj.environment_preparation_checklist,
            } as any,
            conversion: {
              ...createStage('conversion'),
              homologationStatus: proj.conversion_homologation_status,
              homologationResponsible: proj.conversion_homologation_responsible,
              sentAt: proj.conversion_sent_at ? new Date(proj.conversion_sent_at) : undefined,
              finishedAt: proj.conversion_finished_at ? new Date(proj.conversion_finished_at) : undefined,
              complexity: proj.conversion_complexity,
              dataVolumeGb: proj.conversion_data_volume_gb,
              toolUsed: proj.conversion_tool_used,
              homologationDate: proj.conversion_homologation_date ? new Date(proj.conversion_homologation_date) : undefined,
              deviations: proj.conversion_deviations,
            } as any,
            modelosEditor: createStage('modelos_editor'),
            implementation: {
              ...createStage('implementation'),
              phase1: proj.implementation_phase1 || {},
              phase2: proj.implementation_phase2 || {},
            } as any,
            post: {
              ...createStage('post'),
              followupNeeded: proj.post_followup_needed || false,
              followupDate: proj.post_followup_date ? new Date(proj.post_followup_date) : undefined,
            } as any,
          },
          timeline,
        };

        // Calculate health score
        tempProject.healthScore = calculateHealthScore(tempProject);

        return tempProject;
      });
    },
  });

  const createProject = useMutation({
    mutationFn: async (newProject: Partial<ProjectV2>) => {
      const authorName = getCurrentUserName();

      const { data, error } = await supabase
        .from("projects")
        .insert({
          client_name: newProject.clientName,
          ticket_number: newProject.ticketNumber,
          system_type: newProject.systemType,
          project_leader: newProject.projectLeader || authorName,
          last_update_by: authorName,
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar evento de criação com nome real do usuário
      await supabase.from("timeline_events").insert({
        project_id: data.id,
        type: "project_created",
        author: authorName,
        message: "Projeto criado",
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({
      projectId,
      updates,
    }: {
      projectId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updates: Partial<Record<string, any>>;
    }) => {
      const authorName = getCurrentUserName();

      const { error } = await supabase
        .from("projects")
        .update({ ...updates, last_update_by: authorName })
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return {
    projects,
    isLoading,
    createProject,
    updateProject,
    getCurrentUserName,
  };
};
