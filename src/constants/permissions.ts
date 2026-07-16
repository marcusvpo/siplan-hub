/**
 * Catálogo central de permissões.
 *
 * Fonte da verdade para as telas do app. As linhas da tabela `app_permissions`
 * devem espelhar este arquivo — ao adicionar um recurso aqui, crie a migration
 * correspondente em supabase/migrations/, senão o checkbox não aparece em
 * /admin/roles (a tela lista o que vem do banco, não o que está no código).
 *
 * REGRA: só declare uma ação que tenha ponto de aplicação real no código.
 * Checkbox sem enforcement mente para quem configura o perfil — ele desmarca,
 * acha que bloqueou, e o botão continua funcionando.
 */

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "manage"
  | "execute"
  | "upload"
  | "download";

export type PermissionCategory =
  | "Dashboard"
  | "Implantação & Projetos"
  | "Relatórios & Arquivos"
  | "Calendário"
  | "Comercial"
  | "Conversão"
  | "Implantadores"
  | "Modelos Editor OrionTN"
  | "Copiloto"
  | "Administração";

/** Ordem de exibição dos grupos em /admin/roles. */
export const PERMISSION_CATEGORY_ORDER: PermissionCategory[] = [
  "Dashboard",
  "Implantação & Projetos",
  "Relatórios & Arquivos",
  "Calendário",
  "Comercial",
  "Conversão",
  "Implantadores",
  "Modelos Editor OrionTN",
  "Copiloto",
  "Administração",
];

export interface PermissionResourceDef {
  resource: string;
  label: string;
  category: PermissionCategory;
  actions: PermissionAction[];
}

export const PERMISSION_RESOURCES: PermissionResourceDef[] = [
  // Dashboard
  { resource: "dashboard", label: "Menu Dashboard", category: "Dashboard", actions: ["view"] },
  { resource: "dashboard_view", label: "Dashboard - Visão Geral", category: "Dashboard", actions: ["view"] },
  { resource: "kanban", label: "Dashboard - Quadro Kanban", category: "Dashboard", actions: ["view", "edit"] },
  { resource: "pos_panorama", label: "Dashboard - Panorama Pós-Implantação", category: "Dashboard", actions: ["view"] },
  { resource: "pos_panorama_geral", label: "Dashboard - Panorama Geral (pós histórico)", category: "Dashboard", actions: ["view"] },

  // Implantação & Projetos
  { resource: "menu_implantacao", label: "Menu Implantação", category: "Implantação & Projetos", actions: ["view"] },
  { resource: "projects", label: "Gerenciar Projetos", category: "Implantação & Projetos", actions: ["view", "create", "edit", "delete"] },
  { resource: "deployments_next", label: "Próximas Implantações", category: "Implantação & Projetos", actions: ["view"] },
  { resource: "deployments_latest", label: "Últimas Implantações", category: "Implantação & Projetos", actions: ["view"] },
  { resource: "compare_projects", label: "Comparar Projetos", category: "Implantação & Projetos", actions: ["view"] },

  // Relatórios & Arquivos
  { resource: "menu_reports", label: "Menu Relatórios", category: "Relatórios & Arquivos", actions: ["view"] },
  { resource: "reports", label: "Relatórios", category: "Relatórios & Arquivos", actions: ["view"] },
  { resource: "analytics", label: "Analytics", category: "Relatórios & Arquivos", actions: ["view"] },
  { resource: "files", label: "Arquivos", category: "Relatórios & Arquivos", actions: ["upload", "download", "delete"] },

  // Calendário
  { resource: "menu_calendario", label: "Menu Calendário", category: "Calendário", actions: ["view"] },
  { resource: "calendar_projects", label: "Calendário de Projetos", category: "Calendário", actions: ["view", "create", "edit", "delete"] },
  // Agenda dos Analistas é embed do Power BI: não há o que editar.
  { resource: "calendar_analysts", label: "Agenda dos Analistas", category: "Calendário", actions: ["view"] },

  // Comercial
  { resource: "menu_comercial", label: "Menu Comercial", category: "Comercial", actions: ["view"] },
  // Painel de Clientes é leitura; o create são as tags e notas do ClientOverview.
  { resource: "commercial_customers", label: "Painel de Clientes", category: "Comercial", actions: ["view", "create"] },
  // Bloqueios só permite salvar observações — não há criar nem excluir.
  { resource: "commercial_blockers", label: "Bloqueios", category: "Comercial", actions: ["view", "edit"] },
  { resource: "commercial_contacts", label: "Contatos", category: "Comercial", actions: ["view", "create", "edit", "delete"] },
  { resource: "commercial_deployment_forms", label: "Form. Nova Implantação", category: "Comercial", actions: ["view", "create", "delete"] },
  { resource: "commercial_checklists", label: "Checklist do Cliente", category: "Comercial", actions: ["view", "create", "delete"] },
  { resource: "commercial_checklist_questions", label: "Editor de Perguntas do Checklist", category: "Comercial", actions: ["manage"] },

  // Conversão
  { resource: "menu_conversao", label: "Menu Conversão", category: "Conversão", actions: ["view"] },
  { resource: "conversion_home", label: "Gestão de Atividades", category: "Conversão", actions: ["view", "edit", "delete", "execute"] },
  { resource: "conversion_engines", label: "Motores de Conversão", category: "Conversão", actions: ["view", "edit"] },

  // Implantadores
  { resource: "menu_implantadores", label: "Menu Implantadores", category: "Implantadores", actions: ["view"] },
  { resource: "implantadores_home", label: "Implantadores - Visão Geral", category: "Implantadores", actions: ["view"] },
  { resource: "implantadores_aderencia", label: "Editor de Aderência", category: "Implantadores", actions: ["view", "edit"] },
  { resource: "implantadores_aderencia_finalizadas", label: "Aderências Finalizadas", category: "Implantadores", actions: ["view", "delete"] },
  { resource: "conversion_homologation", label: "Homologação de Conversões", category: "Implantadores", actions: ["view", "execute"] },
  { resource: "implantadores_treinamento", label: "Roteiro de Treinamento", category: "Implantadores", actions: ["view"] },
  { resource: "implantadores_transicao", label: "Documento de Transição", category: "Implantadores", actions: ["view", "edit", "execute"] },
  { resource: "templates", label: "Templates de Formulários", category: "Implantadores", actions: ["manage"] },

  // Modelos Editor OrionTN
  // Dashboard e Projetos são leitura; a edição via ProjectModal cai em projects.edit.
  { resource: "menu_orion", label: "Menu OrionTN", category: "Modelos Editor OrionTN", actions: ["view"] },
  { resource: "orion_dashboard", label: "Orion - Dashboard", category: "Modelos Editor OrionTN", actions: ["view"] },
  { resource: "orion_projects", label: "Orion - Projetos", category: "Modelos Editor OrionTN", actions: ["view"] },
  { resource: "orion_editor", label: "Orion - Editor de Modelos", category: "Modelos Editor OrionTN", actions: ["view", "edit"] },

  // Copiloto
  { resource: "copilot_admin", label: "Copiloto - Acessos e Cotas (Admin)", category: "Copiloto", actions: ["view", "manage"] },
  { resource: "copilot_usage", label: "Copiloto - Uso (Admin)", category: "Copiloto", actions: ["view"] },

  // Administração
  { resource: "admin_panel", label: "Acesso ao Painel Administrativo", category: "Administração", actions: ["view"] },
  { resource: "admin_dashboard", label: "Admin - Dashboard", category: "Administração", actions: ["view"] },
  { resource: "users", label: "Admin - Usuários", category: "Administração", actions: ["view", "create", "edit", "delete", "execute"] },
  { resource: "teams", label: "Admin - Configurações do Time", category: "Administração", actions: ["view", "create", "edit", "delete"] },
  { resource: "roles", label: "Admin - Perfis de Acesso", category: "Administração", actions: ["view", "manage"] },
  { resource: "vacations", label: "Admin - Férias", category: "Administração", actions: ["view", "create", "edit", "delete"] },
  { resource: "settings", label: "Admin - Saúde dos Projetos", category: "Administração", actions: ["view", "edit"] },
  // Armazenamento, Usuários Inativos e Logs são telas de leitura.
  { resource: "storage", label: "Admin - Armazenamento", category: "Administração", actions: ["view"] },
  { resource: "inactive_users", label: "Admin - Usuários Inativos", category: "Administração", actions: ["view"] },
  { resource: "audit_logs", label: "Admin - Logs de Auditoria", category: "Administração", actions: ["view"] },
];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar / Modificar",
  delete: "Excluir / Remover",
  manage: "Gerenciamento Total",
  execute: "Executar Ação",
  upload: "Enviar Arquivos",
  download: "Baixar Arquivos",
};

const RESOURCE_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_RESOURCES.map((r) => [r.resource, r.label]),
);

const RESOURCE_CATEGORIES: Record<string, PermissionCategory> = Object.fromEntries(
  PERMISSION_RESOURCES.map((r) => [r.resource, r.category]),
);

export function getResourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] || resource;
}

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action as PermissionAction] || action;
}

/** Recurso ainda não catalogado cai em "Outros" para não sumir da tela. */
export function getResourceCategory(resource: string): string {
  return RESOURCE_CATEGORIES[resource] || "Outros";
}
