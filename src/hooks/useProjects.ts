import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectV2, TimelineEventV2 } from "@/types/ProjectV2";
import { calculateHealthScore } from "@/utils/calculations";

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((proj: Record<string, any>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeline: TimelineEventV2[] = (proj.timeline_events || []).map((event: Record<string, any>) => ({
          id: event.id,
          projectId: event.project_id,
          type: event.type,
          author: event.author,
          authorName: event.author, // Fallback
          message: event.message,
          timestamp: new Date(event.timestamp),
          details: event.metadata || {},
          visibility: "public",
          action: event.message, // Fallback
          changedBy: event.author,
          changedAt: new Date(event.timestamp),
        }));

        const tempProject: ProjectV2 = {
          id: proj.id,
          clientName: proj.client_name,
          ticketNumber: proj.ticket_number,
          systemType: proj.system_type,
          projectLeader: proj.project_leader,
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
              status: proj.infra_status || "todo",
              responsible: proj.infra_responsible || "",
              startDate: proj.infra_start_date ? new Date(proj.infra_start_date) : undefined,
              endDate: proj.infra_end_date ? new Date(proj.infra_end_date) : undefined,
              blockingReason: proj.infra_blocking_reason,
              observations: proj.infra_observations,
            },
            adherence: {
              status: proj.adherence_status || "todo",
              responsible: proj.adherence_responsible || "",
              startDate: proj.adherence_start_date ? new Date(proj.adherence_start_date) : undefined,
              endDate: proj.adherence_end_date ? new Date(proj.adherence_end_date) : undefined,
              hasProductGap: proj.adherence_has_product_gap || false,
              devTicket: proj.adherence_dev_ticket,
              devEstimatedDate: proj.adherence_dev_estimated_date ? new Date(proj.adherence_dev_estimated_date) : undefined,
              observations: proj.adherence_observations,
              analysisComplete: proj.adherence_analysis_complete || false,
            },
            environment: {
              status: proj.environment_status || "todo",
              responsible: proj.environment_responsible || "",
              realDate: proj.environment_real_date ? new Date(proj.environment_real_date) : undefined,
              osVersion: proj.environment_os_version,
              approvedByInfra: proj.environment_approved_by_infra || false,
              observations: proj.environment_observations,
              testAvailable: proj.environment_test_available || false,
            },
            conversion: {
              status: proj.conversion_status || "todo",
              responsible: proj.conversion_responsible || "",
              // sourceSystem: proj.conversion_source_system, // Removed in V2? Check type.
              observations: proj.conversion_observations,
            },
            implementation: {
              status: proj.implementation_status || "todo",
              responsible: proj.implementation_responsible || "",
              observations: proj.implementation_observations,
              phase1: proj.implementation_phase1 || {},
              phase2: proj.implementation_phase2 || {},
            },
            post: {
              status: proj.post_status || "todo",
              responsible: proj.post_responsible || "",
              startDate: proj.post_start_date ? new Date(proj.post_start_date) : undefined,
              endDate: proj.post_end_date ? new Date(proj.post_end_date) : undefined,
              observations: proj.post_observations,
              followupNeeded: proj.post_followup_needed || false,
            },
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
        type: "project_created",
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updates: Partial<Record<string, any>>;
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
