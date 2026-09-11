-- Permite filtrar as consultas de chamados Orion e Legado pelo grupo atual e
-- pelo analista responsavel informados pelo Ellevo/0800.

alter table public.chamados_processo_venda
  add column if not exists analista_responsavel text;

comment on column public.chamados_processo_venda.analista_responsavel is
  'ResponsavelAtividade atual informado pela view de chamados do Ellevo.';

update public.chamados_processo_venda
set equipe_responsavel = nullif(btrim(equipe_responsavel), '')
where equipe_responsavel is distinct from nullif(btrim(equipe_responsavel), '');

create index if not exists idx_chamados_processo_venda_equipe_responsavel
  on public.chamados_processo_venda (equipe_responsavel)
  where equipe_responsavel is not null;

create index if not exists idx_chamados_processo_venda_analista_responsavel
  on public.chamados_processo_venda (analista_responsavel)
  where analista_responsavel is not null;

create or replace function public.get_chamados_assignment_options(
  p_catalog text default 'orion'
)
returns table (
  option_type text,
  option_value text
)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped as (
    select
      nullif(btrim(equipe_responsavel), '') as group_name,
      nullif(btrim(analista_responsavel), '') as analyst_name
    from public.chamados_processo_venda
    where case
      when lower(coalesce(p_catalog, 'orion')) = 'legacy'
        then produto in ('Siplan', 'Control-M', 'Global')
      else software ilike 'Orion%'
    end
  )
  select 'group'::text, group_name
  from scoped
  where group_name is not null
  group by group_name

  union all

  select 'analyst'::text, analyst_name
  from scoped
  where analyst_name is not null
  group by analyst_name

  order by 1, 2;
$$;

revoke all on function public.get_chamados_assignment_options(text) from public;
grant execute on function public.get_chamados_assignment_options(text) to authenticated;

comment on function public.get_chamados_assignment_options(text) is
  'Lista grupos e analistas distintos do espelho de chamados, separados por catalogo.';

insert into public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
select
  release.category,
  release.type,
  release.permission_resource,
  release.title,
  release.message,
  release.action_url
from (values
  (
    'changelog',
    'release_improvement',
    'chamados_query',
    'Novos filtros na Consulta de Chamados',
    'A Consulta de Chamados do Ellevo agora permite localizar atendimentos pelo grupo responsável, como SD, Conversão e Implantação, e também pelo nome do analista responsável.',
    '/deployments/tickets'
  ),
  (
    'changelog',
    'release_improvement',
    'chamados_legacy_query',
    'Novos filtros nos Chamados Legados',
    'A consulta de chamados legados agora permite localizar atendimentos pelo grupo responsável e pelo nome do analista responsável no Ellevo.',
    '/deployments/tickets-legacy'
  )
) as release(category, type, permission_resource, title, message, action_url)
where not exists (
  select 1
  from public.notifications existing
  where existing.category = release.category
    and existing.type = release.type
    and existing.permission_resource = release.permission_resource
    and existing.title = release.title
    and existing.action_url = release.action_url
);

notify pgrst, 'reload schema';
