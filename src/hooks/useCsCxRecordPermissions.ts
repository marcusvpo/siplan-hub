import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export type CsCxOwnedResource =
  | "cs_cx_registros"
  | "cs_cx_cartorios"
  | "cs_cx_contatos"
  | "cs_cx_agendamentos"
  | "cs_cx_rotinas"
  | "cs_cx_visitas"
  | "cs_cx_nps";

export function canAccessCsCxRecord(
  baseAllowed: boolean,
  ownerId: string | null | undefined,
  currentUserId: string | null | undefined,
  othersAllowed: boolean,
) {
  return baseAllowed && (Boolean(ownerId && currentUserId && ownerId === currentUserId) || othersAllowed);
}

export function useCsCxRecordPermissions(resource: CsCxOwnedResource) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(resource, "edit");
  const canDelete = hasPermission(resource, "delete");
  const canManageOthers = hasPermission(resource, "manage_others");

  return {
    canCreate: hasPermission(resource, "create"),
    canViewOthers: hasPermission(resource, "view_others"),
    canManageOthers,
    canEditRecord: (ownerId: string | null | undefined) =>
      canAccessCsCxRecord(canEdit, ownerId, user?.id, canManageOthers),
    canDeleteRecord: (ownerId: string | null | undefined) =>
      canAccessCsCxRecord(canDelete, ownerId, user?.id, canManageOthers),
  };
}
