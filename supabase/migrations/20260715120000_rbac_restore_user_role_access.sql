-- URGENTE: restaura o acesso do perfil 'user', quebrado pelas migrations
-- 20260715093000 / 20260715103000 somadas as guardas de rota do front.
--
-- O QUE DEU ERRADO
-- Recursos criados do zero (implantadores_*, kanban.edit, calendar_projects.*,
-- commercial_* de escrita, conversion_home.edit/delete/execute, etc.) foram
-- concedidos apenas ao admin. A regra de heranca que escrevi cobria so dois
-- casos: 'manage' -> 'view', e cinco recursos administrativos. Nenhum recurso
-- novo foi herdado por 'user'.
--
-- Antes dessas migrations NAO havia guarda de rota nem checagem de acao nessas
-- telas: qualquer autenticado usava tudo. Depois, 'user' perdeu o modulo de
-- Implantadores inteiro, o drag do Kanban e do Calendario, a escrita no
-- Comercial, as acoes de Conversao e a aprovacao de Homologacao (estas duas
-- porque o gate virou "time E permissao").
--
-- PRINCIPIO DESTA CORRECAO
-- Permissao nova deve nascer permissiva e ser restringida de proposito pelo
-- admin -- nunca restringir em silencio no deploy. Concedemos a 'user' o que
-- ele ja conseguia fazer antes, e nada alem disso.
--
-- DELIBERADAMENTE FORA (o front ja barrava 'user' nestes casos, entao conceder
-- seria AMPLIAR acesso, nao restaurar):
--   projects.create / projects.delete -> NewProjectDialog e ProjectCardV3 ja
--     checavam canCreateProjects / canDeleteProjects.
--   files.delete -> FilesTab ja checava canDeleteFiles.
--   Categoria Administracao inteira (users, teams, roles, vacations, settings,
--     storage, inactive_users, audit_logs, admin_panel, admin_dashboard,
--     copilot_admin, copilot_usage) -> AdminLayout ja barrava via
--     canManageUsers.

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r
CROSS JOIN public.app_permissions p
WHERE r.name = 'user'
  AND (p.resource, p.action) IN (
    -- Implantadores: modulo inteiro estava inacessivel.
    ('implantadores_home', 'view'),
    ('implantadores_aderencia', 'view'),
    ('implantadores_aderencia', 'edit'),
    ('implantadores_aderencia_finalizadas', 'view'),
    ('implantadores_aderencia_finalizadas', 'delete'),
    ('implantadores_treinamento', 'view'),
    ('implantadores_transicao', 'view'),
    ('implantadores_transicao', 'edit'),
    ('implantadores_transicao', 'execute'),
    -- Homologacao: o gate virou isImplantador && permissao; sem isto o
    -- implantador com perfil 'user' nao aprova mais nada.
    ('conversion_homologation', 'execute'),
    -- Conversao: idem com isConversionTeam.
    ('conversion_home', 'edit'),
    ('conversion_home', 'delete'),
    ('conversion_home', 'execute'),
    -- Kanban e Calendario: o drag-and-drop persistia sem checagem nenhuma.
    ('kanban', 'edit'),
    ('calendar_projects', 'create'),
    ('calendar_projects', 'edit'),
    ('calendar_projects', 'delete'),
    -- Comercial: toda a escrita era livre.
    ('commercial_customers', 'create'),
    ('commercial_blockers', 'edit'),
    ('commercial_contacts', 'create'),
    ('commercial_contacts', 'edit'),
    ('commercial_contacts', 'delete'),
    ('commercial_deployment_forms', 'create'),
    ('commercial_deployment_forms', 'delete'),
    ('commercial_checklists', 'create'),
    ('commercial_checklists', 'delete'),
    ('commercial_checklist_questions', 'manage')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
