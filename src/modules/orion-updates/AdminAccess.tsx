import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { BlogAccess } from "./api";
import { ManagementIcon } from "./ManagementIcon";
import { navigate } from "./navigation";
import { appPath, blogBasePath, routePath } from "./paths";
import "./admin-access.css";

type AccessState = {
  status: "loading" | "ready";
  access: BlogAccess | null;
  refresh: () => Promise<BlogAccess | null>;
};

const AccessContext = createContext<AccessState | null>(null);

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const { user, permissionsLoaded } = useAuth();
  const { hasPermission } = usePermissions();

  const access = useMemo<BlogAccess | null>(() => {
    if (!permissionsLoaded || !user) return null;
    const canManage = hasPermission("orion_updates_management", "view");
    return {
      mode: "host",
      canManage,
      canCreate: canManage && hasPermission("orion_updates_management", "create"),
      canEdit: canManage && hasPermission("orion_updates_management", "edit"),
      canDelete: canManage && hasPermission("orion_updates_management", "delete"),
      admin: canManage ? { id: user.id, email: user.email ?? "Usuário do Siplan Hub" } : null,
      csrfToken: null,
    };
  }, [hasPermission, permissionsLoaded, user]);

  const value = useMemo<AccessState>(() => ({
    status: permissionsLoaded ? "ready" : "loading",
    access,
    refresh: async () => access,
  }), [access, permissionsLoaded]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAdminAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error("AdminAccessProvider ausente.");
  return value;
}

const RETURN_KEY = `orion-reader-return:${blogBasePath}`;

function readerPath() {
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    if (saved) {
      const url = new URL(saved, window.location.origin);
      const internalPath = routePath(url.pathname) ?? "";
      if (
        url.origin === window.location.origin &&
        /^\/(inicio|oriontn|orionpro|orionreg|novidades|melhorias|correcoes|avisos|posts)(\/|$)/.test(internalPath)
      ) {
        return url.pathname + url.search + url.hash;
      }
    }
  } catch {
    // O retorno à home continua disponível quando o armazenamento falhar.
  }
  return appPath("/inicio");
}

export function ViewModeSwitch({ management = false, disabled = false }: { management?: boolean; disabled?: boolean }) {
  const { access } = useAdminAccess();
  if (!access?.canManage || !access.admin) return null;

  return (
    <button
      type="button"
      className="view-mode-switch"
      disabled={disabled}
      onClick={() => {
        if (!management) {
          try {
            sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search + window.location.hash);
          } catch {
            // Preferência de retorno opcional; nunca armazena autorização.
          }
        }
        navigate(management ? readerPath() : appPath("/gestao"));
      }}
    >
      <ManagementIcon name={management ? "publicacoes" : "acompanhamento"} />
      <span>{management ? "Visualização do leitor" : "Acessar Gestão"}</span>
    </button>
  );
}

export function ReaderManagementAccess() {
  const { access } = useAdminAccess();
  if (!access?.canManage || !access.admin) return null;
  return <div className="container reader-management-access"><ViewModeSwitch /></div>;
}
