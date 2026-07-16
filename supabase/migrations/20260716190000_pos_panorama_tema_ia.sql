-- Panorama Pos-Implantacao: tema IA por chamado + permissao da tela nova.
--
-- 1) chamados_0800 ganha tema_ia: categoria curta gerada pelo worker (Claude
--    haiku) a partir do titulo/descricao, para agregar recorrencia entre
--    cartorios ("selo digital", "livro caixa"...). tema_ia_em marca quando foi
--    classificado; null = ainda nao processado pelo worker.
-- 2) Recurso 'pos_panorama' (view) para a tela /dashboard/pos-implantacao.
--    Nasce PERMISSIVA (regra do repo): admin + todo perfil que ja enxerga o
--    Dashboard (dashboard_view) ganham acesso; restringir depois e decisao
--    consciente do admin em /admin/roles.

alter table public.chamados_0800
  add column if not exists tema_ia text,
  add column if not exists tema_ia_em timestamptz;

comment on column public.chamados_0800.tema_ia is
  'Categoria curta gerada por IA (worker) para agregacao de recorrencia; null = pendente de classificacao.';

-- Panorama filtra por faixa de abertura sem passar por cliente.
create index if not exists idx_chamados_0800_abertura
  on public.chamados_0800 (data_abertura desc);

-- Catalogo de permissoes (espelha src/constants/permissions.ts)
INSERT INTO public.app_permissions (resource, action, description) VALUES
    ('pos_panorama', 'view', 'Visualizar o Panorama Pós-Implantação (Dashboard)')
ON CONFLICT (resource, action) DO UPDATE
    SET description = EXCLUDED.description;

-- Admin continua com acesso total.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r, public.app_permissions p
WHERE r.name = 'admin' AND p.resource = 'pos_panorama'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissiva: todo perfil que ja visualiza o Dashboard herda a tela nova
-- (ninguem perde acesso no deploy; restricao posterior e proposital).
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT rp.role_id, novo.id
FROM public.app_role_permissions rp
JOIN public.app_permissions atual
  ON atual.id = rp.permission_id
 AND atual.resource = 'dashboard_view'
 AND atual.action = 'view'
JOIN public.app_permissions novo
  ON novo.resource = 'pos_panorama'
 AND novo.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
