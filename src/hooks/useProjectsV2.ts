import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { ProjectV2, ProjectUpdate } from "@/types/ProjectV2";
import { createDefaultObservationsState, isLexicalContentEmpty } from "@/utils/default-project-observations";
import { buildSyncedNotesForProjectUpdate } from "@/utils/project-observations-sync";
import { useTimeline } from "./useTimeline";
import {
  transformToProjectV3,
  transformToDB,
  resolveResponsibleIds,
} from "@/utils/project-transformers";
import {
  computeProjectAuditChanges,
  translateStageStatus,
  type ComputedProjectAuditEvent,
} from "@/utils/project-audit-diff";
import {
  invalidateProjectTimelineQueries,
  recordProjectActivityLog,
  resolveCurrentActor,
} from "@/services/projectLogService";

function mergeProjectForAudit(
  currentProject: ProjectV2,
  updates: ProjectUpdate,
  effectiveGlobalStatus?: ProjectV2["globalStatus"],
): ProjectV2 {
  const oldStages = currentProject.stages;
  const updStages = updates.stages;

  const mergedImpl = updStages?.implementation
    ? {
        ...oldStages.implementation,
        ...updStages.implementation,
        phase1: {
          status:
            updStages.implementation.phase1?.status ||
            oldStages.implementation?.phase1?.status ||
            "todo",
          ...(oldStages.implementation?.phase1 || {}),
          ...(updStages.implementation.phase1 || {}),
        },
        phase2: {
          status:
            updStages.implementation.phase2?.status ||
            oldStages.implementation?.phase2?.status ||
            "todo",
          ...(oldStages.implementation?.phase2 || {}),
          ...(updStages.implementation.phase2 || {}),
        },
      }
    : oldStages.implementation;

  return {
    ...currentProject,
    ...updates,
    ...(effectiveGlobalStatus ? { globalStatus: effectiveGlobalStatus } : {}),
    stages: {
      infra: updStages?.infra
        ? { ...oldStages.infra, ...updStages.infra }
        : oldStages.infra,
      adherence: updStages?.adherence
        ? { ...oldStages.adherence, ...updStages.adherence }
        : oldStages.adherence,
      environment: updStages?.environment
        ? { ...oldStages.environment, ...updStages.environment }
        : oldStages.environment,
      conversion: updStages?.conversion
        ? { ...oldStages.conversion, ...updStages.conversion }
        : oldStages.conversion,
      modelosEditor: updStages?.modelosEditor
        ? {
            ...(oldStages.modelosEditor || { status: "todo" }),
            ...updStages.modelosEditor,
          }
        : oldStages.modelosEditor,
      implementation: mergedImpl,
      post: updStages?.post
        ? { ...oldStages.post, ...updStages.post }
        : oldStages.post,
    },
  };
}

export const useProjectsV2 = () => {
  const queryClient = useQueryClient();
  const { getCurrentUserName } = useTimeline();

  const projectsQuery = useQuery({
    queryKey: ["projectsV3_with_dates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(transformToProjectV3);
    },
    staleTime: 1000 * 60 * 5,
  });
  const { data: projects, isLoading } = projectsQuery;

  const updateProject = useMutation({
    mutationFn: async ({
      projectId,
      updates,
    }: {
      projectId: string;
      updates: ProjectUpdate;
    }): Promise<ComputedProjectAuditEvent[]> => {
      // Sempre busca o estado completo e fresco do banco antes da atualização para diff fiel
      let currentProject: ProjectV2 | undefined;
      try {
        const { data: fetchedProject } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (fetchedProject) {
          currentProject = transformToProjectV3(fetchedProject);
        }
      } catch {
        // Fallback para cache se consulta direta falhar
      }

      if (!currentProject) {
        currentProject =
          queryClient.getQueryData<ProjectV2>(["projectDetails", projectId]) ||
          queryClient
            .getQueryData<ProjectV2[]>(["projectsV3_with_dates"])
            ?.find((p) => p.id === projectId);
      }

      const actor = await resolveCurrentActor();
      const actorName =
        actor.userId || actor.fullName !== "Sistema"
          ? actor.fullName
          : getCurrentUserName();

      const updatesWithUser: ProjectUpdate = {
        ...updates,
        lastUpdatedBy: actorName,
      };

      // Espelhamento automático das Etapas (Infra, Aderência, Conversão, Ambiente e Fase 1)
      // para Observações Gerais quando o update altera `stages` sem edição manual simultânea de `notes`.
      if (currentProject && updates.stages && updates.notes === undefined) {
        const previewMerged = mergeProjectForAudit(
          currentProject,
          updates,
          updates.globalStatus || currentProject.globalStatus,
        );
        const syncedNotes = buildSyncedNotesForProjectUpdate({
          previousProject: currentProject,
          nextProject: previewMerged,
          actorName,
        });
        if (syncedNotes) {
          updatesWithUser.notes = syncedNotes;
        }
      }

      const dbUpdates = transformToDB(updatesWithUser, currentProject);

      // Resolve responsible names → profile UUIDs
      await resolveResponsibleIds(dbUpdates);

      const { error } = await supabase
        .from("projects")
        .update(dbUpdates)
        .eq("id", projectId);

      if (error) {
        console.error("--- DEBUG: Supabase Update Error ---", error);
        throw error;
      }

      if (currentProject) {
        const effectiveGlobalStatus =
          (dbUpdates.global_status as ProjectV2["globalStatus"] | undefined) ||
          currentProject.globalStatus;
        const mergedProject = mergeProjectForAudit(
          currentProject,
          updates,
          effectiveGlobalStatus,
        );
        return computeProjectAuditChanges(currentProject, mergedProject);
      }

      // Fallback mínimo caso o projeto anterior não tenha sido carregado
      const fallbackEvents: ComputedProjectAuditEvent[] = [];
      if (dbUpdates.infra_status) {
        const statusStr = String(dbUpdates.infra_status);
        fallbackEvents.push({
          type: "status_change",
          category: "stages",
          actionType: "status_change",
          tabLabel: "Etapas",
          stageId: "infra",
          stageLabel: "1. Análise de Infraestrutura",
          fieldLabel: "Status",
          message: `Status de 1. Análise de Infraestrutura alterado para "${translateStageStatus(statusStr)}"`,
          oldValue: "(não carregado)",
          newValue: translateStageStatus(statusStr),
          changes: [
            {
              field: "stages.infra.status",
              label: "Status",
              oldValue: "(não carregado)",
              newValue: translateStageStatus(statusStr),
            },
          ],
        });
      } else if (Object.keys(dbUpdates).length > 1) {
        fallbackEvents.push({
          type: "field_change",
          category: "edit",
          actionType: "field_change",
          tabLabel: "Edição do Projeto",
          fieldLabel: "Projeto",
          message: "Projeto atualizado",
          oldValue: "(não carregado)",
          newValue: "Atualizado",
          changes: [],
        });
      }

      return fallbackEvents;
    },
    onSuccess: async (logEvents, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
      queryClient.invalidateQueries({ queryKey: ["projectsV3_with_dates"] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      queryClient.invalidateQueries({
        queryKey: ["projectDetails", variables.projectId],
      });

      if (logEvents && logEvents.length > 0) {
        await Promise.all(
          logEvents.map((event) =>
            recordProjectActivityLog({
              projectId: variables.projectId,
              type: event.type,
              category: event.category,
              actionType: event.actionType,
              tabLabel: event.tabLabel,
              stageId: event.stageId,
              stageLabel: event.stageLabel,
              fieldLabel: event.fieldLabel,
              oldValue: event.oldValue,
              newValue: event.newValue,
              changes: event.changes,
              message: event.message,
              queryClient,
              skipInvalidation: true,
            }),
          ),
        );
      }

      await invalidateProjectTimelineQueries(queryClient, variables.projectId);
    },
  });

  const createProject = useMutation({
    mutationFn: async (project: Partial<ProjectV2>) => {
      const actor = await resolveCurrentActor();
      const actorName =
        actor.userId || actor.fullName !== "Sistema"
          ? actor.fullName
          : getCurrentUserName();

      const projectWithUser: Partial<ProjectV2> = {
        ...project,
        lastUpdatedBy: actorName,
        startDateActual: new Date(),
        globalStatus: "in-progress" as const,
      };

      const existingNotesContent = projectWithUser.notes?.blocks?.[0]?.content;
      if (isLexicalContentEmpty(existingNotesContent)) {
        const defaultContent = createDefaultObservationsState(projectWithUser);
        projectWithUser.notes = {
          id: projectWithUser.notes?.id || crypto.randomUUID(),
          projectId: projectWithUser.id || "",
          blocks: [
            {
              id: crypto.randomUUID(),
              type: "paragraph",
              content: defaultContent,
              checked: false,
            },
          ],
          lastEditedBy: actorName,
          lastEditedAt: new Date(),
        };
      }

      const dbProject = transformToDB(projectWithUser) as TablesInsert<"projects">;

      await resolveResponsibleIds(dbProject as Record<string, unknown>);

      const { data, error } = await supabase
        .from("projects")
        .insert(dbProject)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });

      await recordProjectActivityLog({
        projectId: data.id,
        type: "project_created",
        category: "general",
        actionType: "project_created",
        tabLabel: "Cadastro do Projeto",
        fieldLabel: "Criação do Projeto",
        newValue: data.client_name ? `${data.client_name} (${data.system_type || ""})` : "Criado",
        message: "Projeto criado",
        queryClient,
      });
    },
  });

  return {
    projects: projects || [],
    isLoading,
    isFetching: projectsQuery.isFetching,
    error: projectsQuery.error,
    refetch: projectsQuery.refetch,
    updateProject,
    createProject,
    deleteProject: useMutation({
      mutationFn: async (projectId: string) => {
        const { error } = await supabase
          .from("projects")
          .delete()
          .eq("id", projectId);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
        queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      },
    }),
  };
};
