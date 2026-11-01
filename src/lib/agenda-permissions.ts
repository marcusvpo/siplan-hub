export interface AgendaUserContext {
  id?: string | null;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
}

export const AGENDA_MANAGER_USER_IDS = new Set<string>([
  "428879ee-95b3-429f-a48e-2fba91da9ff8", // Maria Santos
  "c9bc1cb5-29d5-426e-b178-bedc76cdfbd0", // Lunna Santana
]);

export const AGENDA_MANAGER_EMAILS = new Set<string>([
  "maria.santos@siplan.com.br",
  "lunna.santana@siplan.com.br",
]);

/**
 * Determina se o usuário autenticado possui controle e permissão de gestão
 * (cadastrar, editar, excluir chamados/atividades) sobre a Agenda Siplan.
 *
 * Conforme regra de negócio:
 * - Usuários Admin possuem acesso pleno.
 * - Os perfis de Maria Santos e Lunna Santana possuem 100% de controle e gestão.
 * - Usuários com permissão RBAC explícita (calendar_analysts:manage / create / edit).
 */
export function canManageAgenda(
  profile?: AgendaUserContext | null,
  hasPermissionFn?: (resource: string, action: string) => boolean
): boolean {
  if (!profile) return false;

  // 1. Administrador tem controle pleno
  if (profile.role === "admin") {
    return true;
  }

  // 2. Validação por UUID dos perfis de Maria Santos e Lunna Santana
  if (profile.id && AGENDA_MANAGER_USER_IDS.has(profile.id)) {
    return true;
  }

  // 3. Validação por e-mail corporativo
  if (profile.email && AGENDA_MANAGER_EMAILS.has(profile.email.toLowerCase().trim())) {
    return true;
  }

  // 4. Validação por nome
  const nameNorm = (profile.fullName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (nameNorm.includes("maria santos") || nameNorm.includes("lunna santana")) {
    return true;
  }

  // 5. Validação por permissões do RBAC
  if (hasPermissionFn) {
    if (
      hasPermissionFn("calendar_analysts", "manage") ||
      hasPermissionFn("calendar_analysts", "create") ||
      hasPermissionFn("calendar_analysts", "edit")
    ) {
      return true;
    }
  }

  return false;
}
