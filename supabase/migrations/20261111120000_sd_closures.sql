-- Tela Encerramentos do SD: sincronizacao por data real de fechamento no
-- Ellevo, consolidacao por analista e relatorio analitico com SLA.

alter table public.chamados_sync_requests
  drop constraint if exists chamados_sync_requests_scope_check;

alter table public.chamados_sync_requests
  add constraint chamados_sync_requests_scope_check
  check (scope in ('chamados_0800', 'processo_venda', 'processo_venda_legado', 'sd_closures'));

alter table public.chamados_sync_requests
  drop constraint if exists chamados_sync_requests_processo_period_check;

alter table public.chamados_sync_requests
  add constraint chamados_sync_requests_processo_period_check
  check (
    scope not in ('processo_venda', 'processo_venda_legado', 'sd_closures')
    or (start_date is not null and end_date is not null and start_date <= end_date)
  );

comment on column public.chamados_sync_requests.scope is
  'chamados_0800: projetos; processo_venda: Orion; processo_venda_legado: Control-M, Global e Siplan; sd_closures: encerramentos por data de fechamento.';

create index if not exists idx_chamados_processo_venda_encerramento
  on public.chamados_processo_venda (data_encerramento desc)
  where data_encerramento is not null;

create index if not exists idx_chamados_processo_venda_encerramento_analista
  on public.chamados_processo_venda (data_encerramento desc, analista_responsavel)
  where data_encerramento is not null;

insert into public.app_permissions (resource, action, description) values
  ('sd_closures', 'view', 'Visualizar relatorios de encerramentos do SD')
on conflict (resource, action) do update
set description = excluded.description;

insert into public.app_role_permissions (role_id, permission_id)
select role.id, permission.id
from public.app_roles role
join public.app_permissions permission
  on permission.resource = 'sd_closures'
 and permission.action = 'view'
where role.name = 'admin'
on conflict (role_id, permission_id) do nothing;

-- Preserva o acesso de quem ja possuia uma visao gerencial equivalente.
insert into public.app_role_permissions (role_id, permission_id)
select distinct current_access.role_id, new_permission.id
from public.app_role_permissions current_access
join public.app_permissions current_permission
  on current_permission.id = current_access.permission_id
 and current_permission.resource in ('sd_attendance_bi', 'chamados_query')
 and current_permission.action = 'view'
join public.app_permissions new_permission
  on new_permission.resource = 'sd_closures'
 and new_permission.action = 'view'
on conflict (role_id, permission_id) do nothing;

create or replace function public.request_sd_closures_sync(
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester text := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if not public.has_permission(auth.uid(), 'sd_closures', 'view') then
    raise exception 'Sem permissao para consultar encerramentos do SD' using errcode = '42501';
  end if;

  if p_start_date is null
     or p_end_date is null
     or p_start_date > p_end_date
     or p_end_date - p_start_date > 366 then
    raise exception 'Periodo de consulta invalido';
  end if;

  update public.chamados_sync_requests
     set status = 'error',
         detail = 'Substituida por uma consulta mais recente do mesmo usuario.',
         finished_at = now()
   where scope = 'sd_closures'
     and requested_by = v_requester
     and status in ('pending', 'processing');

  insert into public.chamados_sync_requests (
    requested_by,
    scope,
    start_date,
    end_date,
    filters
  ) values (
    v_requester,
    'sd_closures',
    p_start_date,
    p_end_date,
    '{}'::jsonb
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.request_sd_closures_sync(date, date) from public;
grant execute on function public.request_sd_closures_sync(date, date) to authenticated;

comment on function public.request_sd_closures_sync(date, date) is
  'Solicita ao vm-worker a sincronizacao dos chamados encerrados no periodo informado.';

create or replace function public.get_sd_closures_report(
  p_start_date date,
  p_end_date date,
  p_products text[],
  p_analysts text[],
  p_clients text[],
  p_groups text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.has_permission(auth.uid(), 'sd_closures', 'view') then
    raise exception 'Sem permissao para visualizar encerramentos do SD' using errcode = '42501';
  end if;

  if p_start_date is null
     or p_end_date is null
     or p_start_date > p_end_date
     or p_end_date - p_start_date > 366 then
    raise exception 'Periodo de consulta invalido';
  end if;

  with base as materialized (
    select
      chamado.numero_chamado::text as ticket_number,
      coalesce(nullif(btrim(chamado.nome_cliente), ''), 'Cliente nao identificado')::text as client_name,
      coalesce(nullif(btrim(chamado.titulo), ''), 'Sem titulo')::text as ticket_title,
      coalesce(
        nullif(btrim(chamado.software), ''),
        nullif(btrim(chamado.produto), ''),
        'Nao informado'
      )::text as product,
      coalesce(nullif(btrim(chamado.analista_responsavel), ''), 'Sem analista')::text as analyst_name,
      coalesce(nullif(btrim(chamado.equipe_responsavel), ''), 'Sem grupo')::text as group_name,
      coalesce(nullif(btrim(chamado.natureza), ''), 'Nao classificado')::text as nature,
      coalesce(nullif(btrim(chamado.status), ''), 'Nao informado')::text as status,
      coalesce(chamado.aberto_em, chamado.data_abertura::timestamp) as opened_at,
      coalesce(chamado.encerrado_em, chamado.data_encerramento::timestamp) as closed_at,
      chamado.sla_vencimento_em as due_at,
      case
        when chamado.sla_vencimento_em is null then 'without_deadline'
        when coalesce(chamado.encerrado_em, chamado.data_encerramento::timestamp) <= chamado.sla_vencimento_em
          then 'within'
        else 'outside'
      end::text as sla_status,
      case
        when coalesce(chamado.aberto_em, chamado.data_abertura::timestamp) is null then null
        else greatest(
          0,
          round(extract(epoch from (
            coalesce(chamado.encerrado_em, chamado.data_encerramento::timestamp)
            - coalesce(chamado.aberto_em, chamado.data_abertura::timestamp)
          )) / 60)::integer
        )
      end as duration_minutes,
      lower(coalesce(chamado.status, '')) like '%reabert%' as reopened
    from public.chamados_processo_venda chamado
    where chamado.data_encerramento between p_start_date and p_end_date
  ),
  filtered as materialized (
    select item.*
    from base item
    where (coalesce(cardinality(p_products), 0) = 0 or item.product = any(p_products))
      and (coalesce(cardinality(p_analysts), 0) = 0 or item.analyst_name = any(p_analysts))
      and (coalesce(cardinality(p_clients), 0) = 0 or item.client_name = any(p_clients))
      and (coalesce(cardinality(p_groups), 0) = 0 or item.group_name = any(p_groups))
  )
  select jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'metrics', jsonb_build_object(
      'total_closed', (select count(*)::integer from filtered),
      'within_sla', (select count(*)::integer from filtered where sla_status = 'within'),
      'outside_sla', (select count(*)::integer from filtered where sla_status = 'outside'),
      'without_deadline', (select count(*)::integer from filtered where sla_status = 'without_deadline'),
      'reopened', (select count(*)::integer from filtered where reopened),
      'analyst_count', (select count(distinct analyst_name)::integer from filtered),
      'client_count', (select count(distinct client_name)::integer from filtered)
    ),
    'by_analyst', coalesce((
      select jsonb_agg(to_jsonb(summary) order by summary.total_closed desc, summary.analyst_name)
      from (
        select
          item.analyst_name,
          item.group_name,
          count(*)::integer as total_closed,
          count(*) filter (where item.sla_status = 'within')::integer as within_sla,
          count(*) filter (where item.sla_status = 'outside')::integer as outside_sla,
          count(*) filter (where item.sla_status = 'without_deadline')::integer as without_deadline,
          count(*) filter (where item.reopened)::integer as reopened,
          round(
            count(*) filter (where item.sla_status = 'within') * 100.0 / nullif(count(*), 0),
            2
          ) as within_percent,
          round(
            count(*) filter (where item.sla_status = 'outside') * 100.0 / nullif(count(*), 0),
            2
          ) as outside_percent
        from filtered item
        group by item.analyst_name, item.group_name
      ) summary
    ), '[]'::jsonb),
    'by_product', coalesce((
      select jsonb_agg(to_jsonb(summary) order by summary.total_closed desc, summary.product)
      from (
        select
          item.product,
          count(*)::integer as total_closed,
          count(*) filter (where item.sla_status = 'within')::integer as within_sla,
          count(*) filter (where item.sla_status = 'outside')::integer as outside_sla,
          count(*) filter (where item.sla_status = 'without_deadline')::integer as without_deadline
        from filtered item
        group by item.product
      ) summary
    ), '[]'::jsonb),
    'details', coalesce((
      select jsonb_agg(to_jsonb(detail) order by detail.closed_at desc, detail.ticket_number desc)
      from (
        select
          item.ticket_number,
          item.client_name,
          item.ticket_title,
          item.product,
          item.analyst_name,
          item.group_name,
          item.nature,
          item.status,
          item.opened_at,
          item.closed_at,
          item.due_at,
          item.sla_status,
          item.duration_minutes,
          item.reopened
        from filtered item
      ) detail
    ), '[]'::jsonb),
    'filters', jsonb_build_object(
      'products', coalesce((
        select jsonb_agg(option_value order by option_value)
        from (select distinct product as option_value from base) options
      ), '[]'::jsonb),
      'analysts', coalesce((
        select jsonb_agg(option_value order by option_value)
        from (select distinct analyst_name as option_value from base) options
      ), '[]'::jsonb),
      'clients', coalesce((
        select jsonb_agg(option_value order by option_value)
        from (select distinct client_name as option_value from base) options
      ), '[]'::jsonb),
      'groups', coalesce((
        select jsonb_agg(option_value order by option_value)
        from (select distinct group_name as option_value from base) options
      ), '[]'::jsonb)
    )
  ) into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.get_sd_closures_report(date, date, text[], text[], text[], text[]) from public;
grant execute on function public.get_sd_closures_report(date, date, text[], text[], text[], text[]) to authenticated;

comment on function public.get_sd_closures_report(date, date, text[], text[], text[], text[]) is
  'Retorna indicadores consolidados e chamados encerrados do SD com filtros e classificacao oficial de SLA.';

insert into public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
select
  'changelog',
  'release_screen',
  'sd_closures',
  'Nova tela de Encerramentos do SD',
  'Consulte os chamados fechados no Ellevo por periodo, produto, analista, grupo e cliente, com visoes consolidada e analitica e exportacao oficial em PDF.',
  '/sd/encerramentos'
where not exists (
  select 1
  from public.notifications notification
  where notification.category = 'changelog'
    and notification.type = 'release_screen'
    and notification.permission_resource = 'sd_closures'
    and notification.title = 'Nova tela de Encerramentos do SD'
    and notification.action_url = '/sd/encerramentos'
);

notify pgrst, 'reload schema';
