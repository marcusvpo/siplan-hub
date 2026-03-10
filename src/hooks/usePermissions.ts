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
  const canManageUsers = context.hasPermission("users", "manage");
  const canCreateProjects = context.hasPermission("projects", "create");
  const canDeleteProjects = context.hasPermission("projects", "delete");
  const canUploadFiles = context.hasPermission("files", "upload");
  const canDownloadFiles = context.hasPermission("files", "download");

  return {
    permissions: context.permissions,
    hasPermission: context.hasPermission,
    isAdmin,
    // Pre-computed permissions
    canManageUsers,
    canCreateProjects,
    canDeleteProjects,
    canUploadFiles,
    canDownloadFiles
  };
}
