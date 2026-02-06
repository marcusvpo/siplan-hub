import { useCallback } from "react";
import { activityLogger, LogAction, LogDetails } from "@/services/activityLogger";

/**
 * Hook to easily log user activities in components.
 *
 * Usage:
 * ```tsx
 * const { logAction, logProjectUpdate, logStatusChange } = useActivityLog();
 *
 * // Log a generic action
 * await logAction('project_updated', { projectId, field: 'status', newValue: 'done' });
 *
 * // Log a project field update
 * await logProjectUpdate(projectId, projectName, 'status', oldValue, newValue);
 * ```
 */
export function useActivityLog() {
  const logAction = useCallback(
    async (action: LogAction, details: LogDetails) => {
      await activityLogger.log({ action, details });
    },
    [],
  );

  const logProjectUpdate = useCallback(
    async (
      projectId: string,
      projectName: string,
      field: string,
      oldValue: unknown,
      newValue: unknown,
    ) => {
      await activityLogger.logProjectUpdate(
        projectId,
        projectName,
        field,
        oldValue,
        newValue,
      );
    },
    [],
  );

  const logStageUpdate = useCallback(
    async (
      projectId: string,
      projectName: string,
      stageName: string,
      field: string,
      oldValue: unknown,
      newValue: unknown,
    ) => {
      await activityLogger.logStageUpdate(
        projectId,
        projectName,
        stageName,
        field,
        oldValue,
        newValue,
      );
    },
    [],
  );

  const logStatusChange = useCallback(
    async (
      projectId: string,
      projectName: string,
      statusType: string,
      oldStatus: string,
      newStatus: string,
    ) => {
      await activityLogger.logStatusChange(
        projectId,
        projectName,
        statusType,
        oldStatus,
        newStatus,
      );
    },
    [],
  );

  const logFileAction = useCallback(
    async (
      action: "file_uploaded" | "file_deleted",
      projectId: string,
      projectName: string,
      fileName: string,
    ) => {
      await activityLogger.logFileAction(action, projectId, projectName, fileName);
    },
    [],
  );

  const logChecklistAction = useCallback(
    async (
      projectId: string,
      projectName: string,
      itemLabel: string,
      completed: boolean,
    ) => {
      await activityLogger.logChecklistAction(
        projectId,
        projectName,
        itemLabel,
        completed,
      );
    },
    [],
  );

  return {
    logAction,
    logProjectUpdate,
    logStageUpdate,
    logStatusChange,
    logFileAction,
    logChecklistAction,
  };
}
