import { supabase } from "@/integrations/supabase/client";

export interface LogDetails {
  projectId?: string;
  projectName?: string;
  entityType?: string;
  entityId?: string;
  field?: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
  additionalInfo?: Record<string, unknown>;
}

export type LogAction =
  // Project actions
  | "project_created"
  | "project_updated"
  | "project_archived"
  | "project_restored"
  | "project_status_changed"
  | "project_stage_updated"
  // Conversion actions
  | "conversion_queue_assigned"
  | "conversion_queue_transferred"
  | "conversion_queue_completed"
  | "conversion_queue_updated"
  | "conversion_status_changed"
  | "conversion_issue_created"
  | "conversion_issue_updated"
  | "conversion_issue_resolved"
  // Adherence actions
  | "adherence_updated"
  | "adherence_gap_identified"
  | "adherence_completed"
  // Implementation actions
  | "deployment_scheduled"
  | "deployment_updated"
  | "deployment_completed"
  | "homologation_started"
  | "homologation_approved"
  | "homologation_rejected"
  // Roadmap actions
  | "roadmap_created"
  | "roadmap_updated"
  | "roadmap_shared"
  // User actions
  | "user_login"
  | "user_logout"
  | "profile_updated"
  // Admin actions
  | "user_created"
  | "user_role_changed"
  | "user_team_changed"
  | "settings_updated"
  // Client actions
  | "client_created"
  | "client_updated"
  | "contact_added"
  | "contact_updated"
  | "note_added"
  // File actions
  | "file_uploaded"
  | "file_deleted"
  // Checklist actions
  | "checklist_item_completed"
  | "checklist_item_uncompleted"
  // Generic
  | "custom_action";

interface LogActionPayload {
  action: LogAction;
  details: LogDetails;
  userName?: string;
}

class ActivityLogger {
  private static instance: ActivityLogger;
  private userCache: { id: string; name: string } | null = null;

  private constructor() {}

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  private async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    if (this.userCache) return this.userCache;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const userName =
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";

      this.userCache = { id: user.id, name: userName };
      return this.userCache;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  clearUserCache(): void {
    this.userCache = null;
  }

  async log({ action, details, userName }: LogActionPayload): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        console.warn("Cannot log action: no authenticated user");
        return;
      }

      const enrichedDetails = {
        ...details,
        userName: userName || currentUser.name,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        additionalInfo: details.additionalInfo
          ? JSON.parse(JSON.stringify(details.additionalInfo))
          : undefined,
      };

      const { error } = await supabase.from("audit_logs").insert({
        user_id: currentUser.id,
        action,
        details: JSON.parse(JSON.stringify(enrichedDetails)),
      });

      if (error) {
        console.error("Error logging action:", error);
      }
    } catch (error) {
      console.error("Error in activity logger:", error);
    }
  }

  // Convenience methods for common actions
  async logProjectUpdate(
    projectId: string,
    projectName: string,
    field: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    await this.log({
      action: "project_updated",
      details: {
        projectId,
        projectName,
        field,
        oldValue: String(oldValue ?? ""),
        newValue: String(newValue ?? ""),
      },
    });
  }

  async logStageUpdate(
    projectId: string,
    projectName: string,
    stageName: string,
    field: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    await this.log({
      action: "project_stage_updated",
      details: {
        projectId,
        projectName,
        entityType: "stage",
        entityId: stageName,
        field,
        oldValue: String(oldValue ?? ""),
        newValue: String(newValue ?? ""),
      },
    });
  }

  async logConversionAction(
    action: LogAction,
    projectId: string,
    projectName: string,
    additionalInfo?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      action,
      details: {
        projectId,
        projectName,
        entityType: "conversion",
        additionalInfo,
      },
    });
  }

  async logStatusChange(
    projectId: string,
    projectName: string,
    statusType: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    await this.log({
      action: "project_status_changed",
      details: {
        projectId,
        projectName,
        field: statusType,
        oldValue: oldStatus,
        newValue: newStatus,
      },
    });
  }

  async logFileAction(
    action: "file_uploaded" | "file_deleted",
    projectId: string,
    projectName: string,
    fileName: string,
  ): Promise<void> {
    await this.log({
      action,
      details: {
        projectId,
        projectName,
        entityType: "file",
        additionalInfo: { fileName },
      },
    });
  }

  async logChecklistAction(
    projectId: string,
    projectName: string,
    itemLabel: string,
    completed: boolean,
  ): Promise<void> {
    await this.log({
      action: completed
        ? "checklist_item_completed"
        : "checklist_item_uncompleted",
      details: {
        projectId,
        projectName,
        entityType: "checklist",
        additionalInfo: { itemLabel },
      },
    });
  }

  async logAdminAction(
    action: LogAction,
    targetUserId: string,
    targetUserName: string,
    additionalInfo?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      action,
      details: {
        entityType: "user",
        entityId: targetUserId,
        additionalInfo: { targetUserName, ...additionalInfo },
      },
    });
  }
}

export const activityLogger = ActivityLogger.getInstance();
