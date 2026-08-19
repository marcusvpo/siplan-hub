-- Fundação do módulo CS/CX.
-- Espelha src/constants/permissions.ts e começa restrita ao perfil admin.

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('menu_cs_cx', 'view', 'Acesso ao menu CS/CX'),
  ('cs_cx_home', 'view', 'Visualizar a página inicial de CS/CX'),

  ('cs_cx_registros', 'view', 'Visualizar solicitações de CS/CX'),
  ('cs_cx_registros', 'create', 'Criar solicitações de CS/CX'),
  ('cs_cx_registros', 'edit', 'Editar solicitações de CS/CX'),
  ('cs_cx_registros', 'delete', 'Excluir solicitações de CS/CX'),

  ('cs_cx_cartorios', 'view', 'Visualizar cartórios no CS/CX'),
  ('cs_cx_cartorios', 'create', 'Criar cartórios no CS/CX'),
  ('cs_cx_cartorios', 'edit', 'Editar cartórios no CS/CX'),
  ('cs_cx_cartorios', 'delete', 'Excluir cartórios no CS/CX'),

  ('cs_cx_contatos', 'view', 'Visualizar contatos de CS/CX'),
  ('cs_cx_contatos', 'create', 'Criar contatos de CS/CX'),
  ('cs_cx_contatos', 'edit', 'Editar contatos de CS/CX'),
  ('cs_cx_contatos', 'delete', 'Excluir contatos de CS/CX'),

  ('cs_cx_agendamentos', 'view', 'Visualizar agendamentos de CS/CX'),
  ('cs_cx_agendamentos', 'create', 'Criar agendamentos de CS/CX'),
  ('cs_cx_agendamentos', 'edit', 'Editar agendamentos de CS/CX'),
  ('cs_cx_agendamentos', 'delete', 'Excluir agendamentos de CS/CX'),

  ('cs_cx_rotinas', 'view', 'Visualizar rotinas de CS/CX'),
  ('cs_cx_rotinas', 'create', 'Criar rotinas de CS/CX'),
  ('cs_cx_rotinas', 'edit', 'Editar rotinas de CS/CX'),
  ('cs_cx_rotinas', 'delete', 'Excluir rotinas de CS/CX'),

  ('cs_cx_visitas', 'view', 'Visualizar visitas de CS/CX'),
  ('cs_cx_visitas', 'create', 'Criar visitas de CS/CX'),
  ('cs_cx_visitas', 'edit', 'Editar visitas de CS/CX'),
  ('cs_cx_visitas', 'delete', 'Excluir visitas de CS/CX'),

  ('cs_cx_nps', 'view', 'Visualizar pesquisas NPS'),
  ('cs_cx_nps', 'create', 'Criar e importar pesquisas NPS'),
  ('cs_cx_nps', 'edit', 'Editar pesquisas NPS'),
  ('cs_cx_nps', 'delete', 'Excluir pesquisas NPS'),

  ('cs_cx_reports', 'view', 'Visualizar relatórios de CS/CX'),
  ('cs_cx_admin', 'view', 'Visualizar a administração de CS/CX'),
  ('cs_cx_admin', 'manage', 'Gerenciar modelos e configurações de CS/CX')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

-- A liberação para outros perfis será feita pela tela de Perfis de Acesso
-- depois que cada módulo estiver homologado.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r
CROSS JOIN public.app_permissions p
WHERE r.name = 'admin'
  AND (p.resource = 'menu_cs_cx' OR p.resource LIKE 'cs_cx_%')
ON CONFLICT (role_id, permission_id) DO NOTHING;
