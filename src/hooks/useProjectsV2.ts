import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
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
import { useTimeline } from "./useTimeline";
import { transformToProjectV3, transformToDB, resolveResponsibleIds } from "@/utils/project-transformers";

export const useProjectsV2 = () => {
  const queryClient = useQueryClient();
  const { addAutoLog, getCurrentUserName } = useTimeline();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projectsV3_with_dates"], // Changed key to force refresh
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
      // Get current project state for comparison
      let currentProject = queryClient.getQueryData<ProjectV2[]>(["projectsV3_with_dates"])?.find(p => p.id === projectId);

      // If not in cache, try to fetch it to ensure we have valid old state for comparisons
      if (!currentProject) {
        const { data: fetchedProject } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (fetchedProject) {
          currentProject = transformToProjectV3(fetchedProject);
        }
      }

      // Ensure the current user's name is recorded
      const updatesWithUser = {
        ...updates,
        lastUpdatedBy: getCurrentUserName(),
      };

      const dbUpdates = transformToDB(updatesWithUser, currentProject);

      // Resolve responsible names → profile UUIDs
      await resolveResponsibleIds(dbUpdates);

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
        if (updates.stages?.modelosEditor?.status && currentProject.stages.modelosEditor && hasChanged(updates.stages.modelosEditor.status, currentProject.stages.modelosEditor.status)) {
          logMessages.push(`Status de Modelos Editor alterado para ${updates.stages.modelosEditor.status}`);
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
        if (updates.stages?.modelosEditor?.responsible && currentProject.stages.modelosEditor && hasChanged(updates.stages.modelosEditor.responsible, currentProject.stages.modelosEditor.responsible)) {
          logMessages.push(`Responsável de Modelos Editor definido como ${updates.stages.modelosEditor.responsible}`);
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

        // System & Products
        if (updates.systemType && hasChanged(updates.systemType, currentProject.systemType)) {
          logMessages.push(`Sistema alterado para ${updates.systemType}`);
        }

        if (updates.products) {
          const oldProducts = currentProject.products || [];
          const newProducts = updates.products;
          // Simple array comparison
          const isDifferent = newProducts.length !== oldProducts.length ||
            !newProducts.every(p => oldProducts.includes(p)) ||
            !oldProducts.every(p => newProducts.includes(p));

          if (isDifferent) {
            logMessages.push(`Produtos atualizados para: ${newProducts.join(", ")}`);
          }
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
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
      queryClient.invalidateQueries({ queryKey: ["projectsV3_with_dates"] });
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
      // Ensure the current user's name is recorded
      const projectWithUser = {
        ...project,
        lastUpdatedBy: getCurrentUserName(),
      };

      const dbProject = transformToDB(projectWithUser) as TablesInsert<"projects">;

      // Resolve responsible names → profile UUIDs
      await resolveResponsibleIds(dbProject as Record<string, unknown>);

      const { data, error } = await supabase
        .from("projects")
        .insert(dbProject)
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
