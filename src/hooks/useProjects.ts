import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectV2, TimelineEventV2, StageStatus, InfraStageV2, AdherenceStageV2, EnvironmentStageV2, ConversionStageV2, ModelosEditorStageV2, ImplementationStageV2, PostStageV2, AuditEntry } from "@/types/ProjectV2";
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
    queryKey: ["projectsV3_with_dates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((proj: Record<string, any>) => {
        const timeline: TimelineEventV2[] = [];

        const createStage = <T extends { status: StageStatus }>(prefix: string): T => {
          const stage = {
            status: (proj[`${prefix}_status`] as StageStatus) || 'todo',
            responsible: (proj[`${prefix}_responsible`] as string) || '',
            startDate: proj[`${prefix}_start_date`] ? new Date(proj[`${prefix}_start_date`] as string) : undefined,
            endDate: proj[`${prefix}_end_date`] ? new Date(proj[`${prefix}_end_date`] as string) : undefined,
            observations: (proj[`${prefix}_observations`] as string) || '',
            ...Object.keys(proj).reduce((acc, key) => {
              if (key.startsWith(prefix + '_') &&
                key !== `${prefix}_status` &&
                key !== `${prefix}_responsible` &&
                key !== `${prefix}_start_date` &&
                key !== `${prefix}_end_date` &&
                key !== `${prefix}_observations`) {
                const propName = key.replace(prefix + '_', '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                acc[propName] = proj[key];
              }
              return acc;
            }, {} as Record<string, unknown>)
          };
          return stage as unknown as T;
        };

        const tempProject: ProjectV2 = {
          id: proj.id as string,
          clientName: proj.client_name as string,
          ticketNumber: proj.ticket_number as string,
          systemType: proj.system_type as string,
          implantationType: (proj.implantation_type as ProjectV2['implantationType']) || "new",
          projectType: (proj.project_type as ProjectV2['projectType']) || "new",
          opNumber: proj.op_number as number | undefined,
          salesOrderNumber: proj.sales_order_number as number | undefined,
          soldHours: proj.sold_hours as number | undefined,
          legacySystem: proj.legacy_system as string | undefined,
          specialty: proj.specialty as string | undefined,
          products: (proj.products as string[]) || [],
          healthScore: calculateHealthScore(proj as any),
          globalStatus: (proj.global_status as ProjectV2['globalStatus']) || "in-progress",
          overallProgress: (proj.overall_progress as number) || 0,
          projectLeader: (proj.project_leader as string) || '',
          clientPrimaryContact: (proj.client_primary_contact as string) || '',
          clientEmail: proj.client_email as string,
          clientPhone: proj.client_phone as string,
          responsibleInfra: (proj.infra_responsible as string) || '',
          responsibleAdherence: (proj.adherence_responsible as string) || '',
          responsibleConversion: (proj.conversion_responsible as string) || '',
          responsibleImplementation: (proj.implementation_responsible as string) || '',
          responsiblePost: (proj.post_responsible as string) || '',
          startDatePlanned: proj.start_date_planned ? new Date(proj.start_date_planned as string) : undefined,
          endDatePlanned: proj.end_date_planned ? new Date(proj.end_date_planned as string) : undefined,
          startDateActual: proj.start_date_actual ? new Date(proj.start_date_actual as string) : undefined,
          endDateActual: proj.end_date_actual ? new Date(proj.end_date_actual as string) : undefined,
          nextFollowUpDate: proj.next_follow_up_date ? new Date(proj.next_follow_up_date as string) : undefined,
          createdAt: new Date(proj.created_at as string),
          lastUpdatedAt: new Date(proj.updated_at as string),
          lastUpdatedBy: (proj.last_update_by as string) || 'Sistema',
          stages: {
            infra: createStage<InfraStageV2>('infra'),
            adherence: createStage<AdherenceStageV2>('adherence'),
            environment: createStage<EnvironmentStageV2>('environment'),
            conversion: createStage<ConversionStageV2>('conversion'),
            implementation: createStage<ImplementationStageV2>('implementation'),
            modelosEditor: createStage<ModelosEditorStageV2>('modelos_editor'),
            post: createStage<PostStageV2>('post'),
          },
          timeline: timeline || [],
          auditLog: [],
          notes: {} as any,
          relatedTickets: (proj.related_tickets as { name: string; number: string }[]) || [],
          tags: (proj.tags as string[]) || [],
          priority: (proj.priority as ProjectV2['priority']) || "normal",
          isDeleted: (proj.is_deleted as boolean) || false,
          isArchived: (proj.is_archived as boolean) || false,
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
      queryClient.invalidateQueries({ queryKey: ["projectsV3_with_dates"] });
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
      queryClient.invalidateQueries({ queryKey: ["projectsV3_with_dates"] });
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
