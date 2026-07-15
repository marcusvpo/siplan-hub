-- Expande o catálogo de permissões para cobrir todas as telas do app.
-- Espelha src/constants/permissions.ts — ao mudar um, mude o outro.
-- Descrições são reescritas no conflito para manter os rótulos alinhados.

INSERT INTO public.app_permissions (resource, action, description) VALUES
    -- Dashboard
    ('dashboard', 'view', 'Acesso ao menu de Dashboard'),
    ('dashboard_view', 'view', 'Visualizar o Dashboard principal'),
    ('kanban', 'view', 'Visualizar o Quadro Kanban'),
    ('kanban', 'edit', 'Mover e editar cards no Quadro Kanban'),

    -- Implantação & Projetos
    ('menu_implantacao', 'view', 'Acesso ao menu de Implantação'),
    ('projects', 'view', 'Visualizar Projetos'),
    ('projects', 'create', 'Criar Projetos'),
    ('projects', 'edit', 'Editar Projetos'),
    ('projects', 'delete', 'Excluir Projetos'),
    ('deployments_next', 'view', 'Visualizar Próximas Implantações'),
    ('deployments_latest', 'view', 'Visualizar Últimas Implantações'),
    ('compare_projects', 'view', 'Comparar Projetos lado a lado'),

    -- Relatórios & Arquivos
    ('menu_reports', 'view', 'Acesso ao menu de Relatórios'),
    ('reports', 'view', 'Visualizar Relatórios'),
    ('reports', 'export', 'Exportar Relatórios (PDF / planilha)'),
    ('analytics', 'view', 'Visualizar Analytics'),
    ('files', 'upload', 'Fazer upload de arquivos'),
    ('files', 'download', 'Baixar arquivos'),
    ('files', 'delete', 'Excluir arquivos'),

    -- Calendário
    ('menu_calendario', 'view', 'Acesso ao menu de Calendário'),
    ('calendar_projects', 'view', 'Visualizar o Calendário de Projetos'),
    ('calendar_projects', 'edit', 'Criar e editar eventos no Calendário de Projetos'),
    ('calendar_analysts', 'view', 'Visualizar a Agenda dos Analistas'),
    ('calendar_analysts', 'edit', 'Editar alocações na Agenda dos Analistas'),

    -- Comercial
    ('menu_comercial', 'view', 'Acesso ao menu Comercial'),
    ('commercial_customers', 'view', 'Visualizar o Painel de Clientes'),
    ('commercial_customers', 'edit', 'Editar dados de Clientes'),
    ('commercial_blockers', 'view', 'Visualizar Bloqueios'),
    ('commercial_blockers', 'create', 'Registrar Bloqueios'),
    ('commercial_blockers', 'edit', 'Editar Bloqueios'),
    ('commercial_blockers', 'delete', 'Excluir Bloqueios'),
    ('commercial_contacts', 'view', 'Visualizar Contatos'),
    ('commercial_contacts', 'create', 'Registrar Contatos'),
    ('commercial_contacts', 'edit', 'Editar Contatos'),
    ('commercial_contacts', 'delete', 'Excluir Contatos'),
    ('commercial_deployment_forms', 'view', 'Visualizar Formulários de Nova Implantação'),
    ('commercial_deployment_forms', 'create', 'Criar Formulários de Nova Implantação'),
    ('commercial_deployment_forms', 'edit', 'Editar Formulários de Nova Implantação'),
    ('commercial_checklists', 'view', 'Visualizar o Checklist do Cliente'),
    ('commercial_checklists', 'edit', 'Preencher e editar o Checklist do Cliente'),
    ('commercial_checklist_questions', 'manage', 'Gerenciar as perguntas do Checklist Comercial'),

    -- Conversão
    ('menu_conversao', 'view', 'Acesso ao menu de Conversão'),
    ('conversion_home', 'view', 'Visualizar a Gestão de Atividades de Conversão'),
    ('conversion_home', 'edit', 'Editar atividades e filas de Conversão'),
    ('conversion_engines', 'view', 'Visualizar os Motores de Conversão'),
    ('conversion_engines', 'manage', 'Configurar os Motores de Conversão'),

    -- Implantadores
    ('menu_implantadores', 'view', 'Acesso ao menu de Implantadores'),
    ('implantadores_home', 'view', 'Visualizar a Visão Geral de Implantadores'),
    ('implantadores_aderencia', 'view', 'Visualizar o Editor de Aderência'),
    ('implantadores_aderencia', 'edit', 'Preencher e editar formulários de Aderência'),
    ('implantadores_aderencia_finalizadas', 'view', 'Visualizar Aderências Finalizadas'),
    ('conversion_homologation', 'view', 'Visualizar a Homologação de Conversões'),
    ('conversion_homologation', 'execute', 'Aprovar e reprovar etapas de Homologação'),
    ('implantadores_treinamento', 'view', 'Visualizar o Roteiro de Treinamento'),
    ('implantadores_transicao', 'view', 'Visualizar o Documento de Transição'),
    ('implantadores_transicao', 'edit', 'Editar o Documento de Transição'),
    ('templates', 'manage', 'Gerenciar templates de formulários'),

    -- Modelos Editor OrionTN
    ('menu_orion', 'view', 'Acesso ao menu OrionTN Models'),
    ('orion_dashboard', 'view', 'Visualizar o Dashboard OrionTN'),
    ('orion_projects', 'view', 'Visualizar os Projetos OrionTN'),
    ('orion_editor', 'view', 'Acesso ao Editor de Modelos OrionTN'),
    ('orion_editor', 'edit', 'Editar e salvar Modelos OrionTN'),
    ('orion_export', 'execute', 'Exportar Modelos XML (OrionTN)'),

    -- Copiloto
    ('copilot_admin', 'view', 'Visualizar os acessos e cotas do Copiloto'),
    ('copilot_admin', 'manage', 'Conceder acessos e definir cotas do Copiloto'),
    ('copilot_usage', 'view', 'Visualizar o consumo do Copiloto'),

    -- Administração
    ('admin_panel', 'view', 'Acessar o Painel Administrativo'),
    ('admin_dashboard', 'view', 'Visualizar o Dashboard do Painel Administrativo'),
    ('users', 'view', 'Visualizar Usuários (Admin)'),
    ('users', 'manage', 'Gerenciar Usuários (Admin)'),
    ('teams', 'view', 'Visualizar Configurações do Time (Admin)'),
    ('teams', 'manage', 'Gerenciar Configurações do Time (Admin)'),
    ('roles', 'view', 'Visualizar Perfis de Acesso (Admin)'),
    ('roles', 'manage', 'Gerenciar Perfis de Acesso (Admin)'),
    ('vacations', 'view', 'Visualizar Férias (Admin)'),
    ('vacations', 'manage', 'Gerenciar Férias (Admin)'),
    ('settings', 'view', 'Visualizar a Saúde dos Projetos (Admin)'),
    ('settings', 'manage', 'Gerenciar a Saúde dos Projetos (Admin)'),
    ('storage', 'view', 'Visualizar o Armazenamento do sistema (Admin)'),
    ('storage', 'manage', 'Gerenciar arquivos do Armazenamento (Admin)'),
    ('inactive_users', 'view', 'Visualizar Usuários Inativos (Admin)'),
    ('inactive_users', 'manage', 'Reativar e remover Usuários Inativos (Admin)'),
    ('audit_logs', 'view', 'Visualizar Logs de Auditoria (Admin)'),
    ('audit_logs', 'export', 'Exportar Logs de Auditoria (Admin)')
ON CONFLICT (resource, action) DO UPDATE
    SET description = EXCLUDED.description;

-- Admin continua com acesso total.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.app_roles r, public.app_permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Perfis que já viam um recurso herdam a nova permissão 'view' equivalente,
-- para nenhum usuário perder acesso ao aplicar esta migration.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT arp.role_id, new_p.id
FROM public.app_role_permissions arp
JOIN public.app_permissions old_p ON old_p.id = arp.permission_id
JOIN public.app_permissions new_p ON new_p.resource = old_p.resource AND new_p.action = 'view'
WHERE old_p.action = 'manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;
