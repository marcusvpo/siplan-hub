-- Alinha app_permissions com o que o codigo de fato aplica.
--
-- A migration anterior (20260715093000) semeou acoes que nao existem no app:
-- exportacao de XML no Orion, exportacao em Relatorios e Logs, edicao na Agenda
-- dos Analistas (embed Power BI), etc. Checkbox sem enforcement mente para quem
-- configura o perfil. Aqui removemos as fantasma e adicionamos as reais que
-- faltavam.
--
-- Espelha src/constants/permissions.ts.

-- 1. Remove permissoes sem funcionalidade correspondente no app.
--    O ON DELETE CASCADE de app_role_permissions limpa os vinculos.
DELETE FROM public.app_permissions WHERE (resource, action) IN (
    -- Nao existe exportacao de XML no Orion (o unico "XML" no codigo e o
    -- atributo xmlns de um <svg>). Vinha da migration original de RBAC.
    ('orion_export', 'execute'),
    -- Relatorios, Logs e Armazenamento sao telas de leitura.
    ('reports', 'export'),
    ('audit_logs', 'export'),
    ('storage', 'manage'),
    ('inactive_users', 'manage'),
    -- Agenda dos Analistas e embed do Power BI.
    ('calendar_analysts', 'edit'),
    -- "Editar Cliente" no painel comercial esta desabilitado no proprio codigo.
    ('commercial_customers', 'edit'),
    -- Bloqueios so permite salvar observacoes.
    ('commercial_blockers', 'create'),
    ('commercial_blockers', 'delete'),
    -- Form. Nova Implantacao nao tem update; Checklist do Cliente e read-only
    -- nas respostas.
    ('commercial_deployment_forms', 'edit'),
    ('commercial_checklists', 'edit'),
    -- Trocados por acoes granulares reais logo abaixo.
    ('conversion_engines', 'manage'),
    ('users', 'manage'),
    ('teams', 'manage'),
    ('vacations', 'manage'),
    ('settings', 'manage')
);

-- 2. Adiciona/atualiza as acoes que possuem ponto de aplicacao real.
INSERT INTO public.app_permissions (resource, action, description) VALUES
    ('calendar_projects', 'create', 'Criar eventos no Calendario de Projetos'),
    ('calendar_projects', 'delete', 'Remover eventos do Calendario de Projetos'),

    ('commercial_customers', 'create', 'Adicionar tags e notas ao cliente'),
    ('commercial_deployment_forms', 'delete', 'Excluir Formularios de Nova Implantacao'),
    ('commercial_checklists', 'create', 'Criar Checklist do Cliente'),
    ('commercial_checklists', 'delete', 'Excluir Checklist do Cliente'),

    ('conversion_home', 'delete', 'Remover projeto da fila de Conversao'),
    ('conversion_home', 'execute', 'Enviar para conversor, homologacao e aprovar'),
    ('conversion_engines', 'edit', 'Atualizar o status dos Motores de Conversao'),

    ('implantadores_aderencia_finalizadas', 'delete', 'Excluir Aderencias Finalizadas'),
    ('implantadores_transicao', 'execute', 'Mudar status do DTC, gerar com IA e exportar PDF'),

    ('users', 'create', 'Criar Usuarios (Admin)'),
    ('users', 'edit', 'Editar Usuarios (Admin)'),
    ('users', 'delete', 'Excluir Usuarios (Admin)'),
    ('users', 'execute', 'Resetar senha de Usuarios (Admin)'),

    ('teams', 'create', 'Criar Times (Admin)'),
    ('teams', 'edit', 'Editar Times (Admin)'),
    ('teams', 'delete', 'Excluir Times (Admin)'),

    ('vacations', 'create', 'Registrar Ferias (Admin)'),
    ('vacations', 'edit', 'Editar Ferias (Admin)'),
    ('vacations', 'delete', 'Excluir Ferias (Admin)'),

    ('settings', 'edit', 'Editar os parametros de Saude dos Projetos (Admin)')
ON CONFLICT (resource, action) DO UPDATE
    SET description = EXCLUDED.description;

-- 3. Admin continua com acesso total.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.app_roles r, public.app_permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Perfis que tinham 'view' num recurso herdam as acoes granulares que
--    substituiram um 'manage' removido acima, para ninguem perder acesso.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT arp.role_id, new_p.id
FROM public.app_role_permissions arp
JOIN public.app_permissions old_p ON old_p.id = arp.permission_id
JOIN public.app_permissions new_p
  ON new_p.resource = old_p.resource
 AND new_p.action IN ('create', 'edit', 'delete', 'execute')
WHERE old_p.action = 'view'
  AND old_p.resource IN ('users', 'teams', 'vacations', 'settings', 'conversion_engines')
ON CONFLICT (role_id, permission_id) DO NOTHING;
