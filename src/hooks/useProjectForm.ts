import { ImplementationStageV2, ProjectV2 } from "@/types/ProjectV2";
import { useCallback } from "react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { syncPostStageFromImplementation } from "@/utils/implementation-phase1";

interface UseProjectFormReturn {
  data: ProjectV2;
  updateField: <K extends keyof ProjectV2>(field: K, value: ProjectV2[K]) => void;
  updateStage: (stageKey: keyof ProjectV2['stages'], updates: Partial<ProjectV2['stages'][typeof stageKey]>) => void;
  saveState: {
    status: 'idle' | 'saving' | 'success' | 'error';
    message?: string;
  };
  hasUnsavedChanges: boolean;
}

export function useProjectForm(
  initialProject: ProjectV2,
  onUpdate: (project: ProjectV2) => void
): UseProjectFormReturn {
  const { data, updateData, saveState, hasUnsavedChanges } = useAutoSave(
    initialProject,
    async (newData) => {
      onUpdate(newData);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  );

  const updateField = useCallback(<K extends keyof ProjectV2>(field: K, value: ProjectV2[K]) => {
    updateData({
      ...data,
      [field]: value
    });
  }, [data, updateData]);

  const updateStage = useCallback((stageKey: keyof ProjectV2['stages'], updates: Partial<ProjectV2['stages'][typeof stageKey]>) => {
    const stageUpdates = { ...updates };
    if (stageKey === "adherence") {
      const currentStatus = data.stages?.adherence?.status || "todo";
      if (currentStatus === "todo" && stageUpdates.endDate) {
        stageUpdates.status = "in-progress";
      }
    }

    const mergedTargetStage = {
      ...data.stages[stageKey],
      ...stageUpdates,
    };

    const nextStages = {
      ...data.stages,
      [stageKey]: mergedTargetStage,
    };

    if (stageKey === "implementation" && data.systemType !== "Modelos TN") {
      nextStages.post = syncPostStageFromImplementation({
        implementationStage: mergedTargetStage as ImplementationStageV2,
        oldImplementationStage: data.stages.implementation,
        currentPostStage: data.stages.post,
        globalStatus: data.globalStatus,
        systemType: data.systemType,
      });
    }

    updateData({
      ...data,
      stages: nextStages,
    });
  }, [data, updateData]);

  return {
    data,
    updateField,
    updateStage,
    saveState,
    hasUnsavedChanges
  };
}
