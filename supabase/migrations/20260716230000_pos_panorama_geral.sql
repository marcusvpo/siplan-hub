-- Tela "Panorama Geral" (/dashboard/pos-panorama-geral): mesma analise do
-- Panorama Pos-Implantacao, incluindo projetos com pos FINALIZADO (historico).
-- Permissao nasce PERMISSIVA: admin + todo perfil que ja ve o Panorama
-- Pos-Implantacao (pos_panorama) herda a tela nova.

INSERT INTO public.app_permissions (resource, action, description) VALUES
    ('pos_panorama_geral', 'view', 'Visualizar o Panorama Geral (pós histórico, Dashboard)')
ON CONFLICT (resource, action) DO UPDATE
    SET description = EXCLUDED.description;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r, public.app_permissions p
WHERE r.name = 'admin' AND p.resource = 'pos_panorama_geral'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT rp.role_id, novo.id
FROM public.app_role_permissions rp
JOIN public.app_permissions atual
  ON atual.id = rp.permission_id
 AND atual.resource = 'pos_panorama'
 AND atual.action = 'view'
JOIN public.app_permissions novo
  ON novo.resource = 'pos_panorama_geral'
 AND novo.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
