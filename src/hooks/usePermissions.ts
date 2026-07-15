import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContextValue";

export function usePermissions() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a AuthProvider");
  }

  // Helper properties
  const isAdmin = context.isAdmin;
  
  // Specific permission checks can be abstracted here as well
  // 'users.manage' foi trocado por ações granulares; 'edit' é o equivalente.
  // Perfis que tinham manage herdaram edit na migration 20260715103000.
  const canManageUsers = context.hasPermission("users", "edit");
  const canCreateProjects = context.hasPermission("projects", "create");
  const canEditProjects = context.hasPermission("projects", "edit");
  const canDeleteProjects = context.hasPermission("projects", "delete");
  const canUploadFiles = context.hasPermission("files", "upload");
  const canDownloadFiles = context.hasPermission("files", "download");
  const canDeleteFiles = context.hasPermission("files", "delete");

  return {
    permissions: context.permissions,
    hasPermission: context.hasPermission,
    isAdmin,
    // Pre-computed permissions
    canManageUsers,
    canCreateProjects,
    canEditProjects,
    canDeleteProjects,
    canUploadFiles,
    canDownloadFiles,
    canDeleteFiles
  };
}
