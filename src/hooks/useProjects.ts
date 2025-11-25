import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Project, TimelineEvent } from "@/types/project";
import { calculateHealthScore, getDaysSinceUpdate } from "@/utils/calculations";

export const useProjects = () => {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, timeline_events(*)")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return data.map((proj: any) => {
        const timeline: TimelineEvent[] = (proj.timeline_events || []).map((event: any) => ({
          id: event.id,
          type: event.type,
          author: event.author,
          message: event.message,
          timestamp: new Date(event.timestamp),
          metadata: event.metadata,
        }));

        const tempProject = {
          id: proj.id,
          clientName: proj.client_name,
          ticketNumber: proj.ticket_number,
          systemType: proj.system_type,
          projectLeader: proj.project_leader,
          createdAt: new Date(proj.created_at),
          updatedAt: new Date(proj.updated_at),
          lastUpdateBy: proj.last_update_by,
          nextFollowUpDate: proj.next_follow_up_date ? new Date(proj.next_follow_up_date) : undefined,
          stages: {
            infra: {
              status: proj.infra_status,
              responsible: proj.infra_responsible || "",
              startDate: proj.infra_start_date ? new Date(proj.infra_start_date) : undefined,
              endDate: proj.infra_end_date ? new Date(proj.infra_end_date) : undefined,
              blockingReason: proj.infra_blocking_reason,
              observations: proj.infra_observations,
            },
            adherence: {
              status: proj.adherence_status,
              responsible: proj.adherence_responsible || "",
              startDate: proj.adherence_start_date ? new Date(proj.adherence_start_date) : undefined,
              endDate: proj.adherence_end_date ? new Date(proj.adherence_end_date) : undefined,
              hasProductGap: proj.adherence_has_product_gap,
              devTicket: proj.adherence_dev_ticket,
              devEstimatedDate: proj.adherence_dev_estimated_date ? new Date(proj.adherence_dev_estimated_date) : undefined,
              observations: proj.adherence_observations,
            },
            environment: {
              status: proj.environment_status,
              responsible: proj.environment_responsible || "",
              realDate: proj.environment_real_date ? new Date(proj.environment_real_date) : undefined,
              osVersion: proj.environment_os_version,
              approvedByInfra: proj.environment_approved_by_infra,
              observations: proj.environment_observations,
            },
            conversion: {
              status: proj.conversion_status,
              responsible: proj.conversion_responsible || "",
              sourceSystem: proj.conversion_source_system,
              observations: proj.conversion_observations,
            },
            implementation: {
              status: proj.implementation_status,
              responsible: proj.implementation_responsible || "",
              remoteInstallDate: proj.implementation_remote_install_date ? new Date(proj.implementation_remote_install_date) : undefined,
              trainingStartDate: proj.implementation_training_start_date ? new Date(proj.implementation_training_start_date) : undefined,
              trainingEndDate: proj.implementation_training_end_date ? new Date(proj.implementation_training_end_date) : undefined,
              switchType: proj.implementation_switch_type,
              observations: proj.implementation_observations,
            },
            post: {
              status: proj.post_status,
              responsible: proj.post_responsible || "",
              startDate: proj.post_start_date ? new Date(proj.post_start_date) : undefined,
              endDate: proj.post_end_date ? new Date(proj.post_end_date) : undefined,
              observations: proj.post_observations,
            },
          },
          timeline,
        };

        const project: Project = {
          ...tempProject,
          healthScore: calculateHealthScore(tempProject as Project),
          daysSinceUpdate: getDaysSinceUpdate(tempProject as Project),
        };

        return project;
      });
    },
  });

  const createProject = useMutation({
    mutationFn: async (newProject: Partial<Project>) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          client_name: newProject.clientName,
          ticket_number: newProject.ticketNumber,
          system_type: newProject.systemType,
          project_leader: newProject.projectLeader || "Bruno Fernandes",
          last_update_by: "Sistema",
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar evento de criação
      await supabase.from("timeline_events").insert({
        project_id: data.id,
        type: "auto",
        author: "Sistema",
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
      updates: Partial<any>;
    }) => {
      const { error } = await supabase
        .from("projects")
        .update({ ...updates, last_update_by: "Bruno Fernandes" })
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
  };
};
