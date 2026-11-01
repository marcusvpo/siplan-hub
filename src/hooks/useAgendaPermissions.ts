import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canManageAgenda } from "@/lib/agenda-permissions";

export function useAgendaPermissions() {
  const { user, fullName, role, isAdmin, hasPermission, loading } = useAuth();

  const isManager = useMemo(() => {
    if (isAdmin) return true;
    return canManageAgenda(
      {
        id: user?.id,
        email: user?.email,
        fullName,
        role,
      },
      hasPermission
    );
  }, [isAdmin, user, fullName, role, hasPermission]);

  return {
    isManager,
    canCreate: isManager,
    canEdit: isManager,
    canDelete: isManager,
    loading,
    restrictedTooltip:
      "Apenas administradores e gestores autorizados (Maria Santos e Lunna Santana) podem realizar esta alteração.",
  };
}
