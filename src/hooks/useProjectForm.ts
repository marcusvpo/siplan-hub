import { ProjectV2, StageStatus } from "@/types/ProjectV2";
import { useState, useCallback } from "react";
import { useAutoSave } from "@/hooks/useAutoSave";

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
    updateData({
      ...data,
      stages: {
        ...data.stages,
        [stageKey]: {
          ...data.stages[stageKey],
          ...updates
        }
      }
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
