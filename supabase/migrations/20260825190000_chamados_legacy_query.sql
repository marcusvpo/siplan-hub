-- Consulta de Chamados Legado: Control-M, Global e Siplan.
-- Reutiliza o espelho e o historico da consulta Orion; o worker diferencia a
-- view de origem pelo scope da fila e grava no mesmo modelo paginavel.

alter table public.chamados_sync_requests
  drop constraint if exists chamados_sync_requests_scope_check;

alter table public.chamados_sync_requests
  add constraint chamados_sync_requests_scope_check
  check (scope in ('chamados_0800', 'processo_venda', 'processo_venda_legado'));

alter table public.chamados_sync_requests
  drop constraint if exists chamados_sync_requests_processo_period_check;

alter table public.chamados_sync_requests
  add constraint chamados_sync_requests_processo_period_check
  check (
    scope not in ('processo_venda', 'processo_venda_legado')
    or (start_date is not null and end_date is not null and start_date <= end_date)
  );

comment on column public.chamados_sync_requests.scope is
  'chamados_0800: projetos; processo_venda: Orion; processo_venda_legado: Control-M, Global e Siplan.';

create index if not exists idx_chamados_processo_venda_catalogo_abertura
  on public.chamados_processo_venda (produto, software, data_abertura desc);

insert into public.app_permissions (resource, action, description) values
  ('chamados_legacy_query', 'view', 'Visualizar a Consulta de Chamados Legado')
on conflict (resource, action) do update
set description = excluded.description;

-- Inicialmente, quem ja pode consultar chamados Orion tambem recebe a tela
-- Legado. Depois, o acesso pode ser separado normalmente em Admin > Perfis.
insert into public.app_role_permissions (role_id, permission_id)
select current_permission.role_id, legacy_permission.id
from public.app_role_permissions as current_permission
join public.app_permissions as current_definition
  on current_definition.id = current_permission.permission_id
 and current_definition.resource = 'chamados_query'
 and current_definition.action = 'view'
join public.app_permissions as legacy_permission
  on legacy_permission.resource = 'chamados_legacy_query'
 and legacy_permission.action = 'view'
on conflict (role_id, permission_id) do nothing;

create table if not exists public.chamados_legado_cliente_aliases (
  client_key text not null,
  codigo_cliente text,
  nome_cliente text not null,
  last_synced_at timestamptz,
  last_data_abertura date,
  primary key (client_key, nome_cliente)
);

alter table public.chamados_legado_cliente_aliases enable row level security;

create or replace function public.track_chamados_legado_cliente_alias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_key text;
  v_client_code text;
  v_client_name text;
begin
  v_client_name := nullif(btrim(new.nome_cliente), '');
  if v_client_name is null
     or btrim(coalesce(new.produto, '')) not in ('Siplan', 'Control-M', 'Global') then
    return new;
  end if;

  v_client_code := nullif(btrim(new.codigo_cliente), '');
  v_client_key := coalesce(v_client_code, 'nome:' || lower(v_client_name));

  insert into public.chamados_legado_cliente_aliases (
    client_key,
    codigo_cliente,
    nome_cliente,
    last_synced_at,
    last_data_abertura
  ) values (
    v_client_key,
    v_client_code,
    v_client_name,
    new.synced_at,
    new.data_abertura
  )
  on conflict (client_key, nome_cliente) do update
  set codigo_cliente = coalesce(excluded.codigo_cliente, chamados_legado_cliente_aliases.codigo_cliente),
      last_synced_at = greatest(chamados_legado_cliente_aliases.last_synced_at, excluded.last_synced_at),
      last_data_abertura = greatest(chamados_legado_cliente_aliases.last_data_abertura, excluded.last_data_abertura);

  return new;
end;
$$;

drop trigger if exists track_chamados_legado_cliente_alias_trigger
  on public.chamados_processo_venda;

create trigger track_chamados_legado_cliente_alias_trigger
after insert or update of codigo_cliente, nome_cliente, produto, synced_at, data_abertura
on public.chamados_processo_venda
for each row execute function public.track_chamados_legado_cliente_alias();

insert into public.chamados_legado_cliente_aliases (
  client_key,
  codigo_cliente,
  nome_cliente,
  last_synced_at,
  last_data_abertura
)
select
  coalesce(nullif(btrim(codigo_cliente), ''), 'nome:' || lower(btrim(nome_cliente))),
  nullif(btrim(codigo_cliente), ''),
  btrim(nome_cliente),
  max(synced_at),
  max(data_abertura)
from public.chamados_processo_venda
where nullif(btrim(nome_cliente), '') is not null
  and btrim(coalesce(produto, '')) in ('Siplan', 'Control-M', 'Global')
group by 1, 2, 3
on conflict (client_key, nome_cliente) do update
set codigo_cliente = coalesce(excluded.codigo_cliente, chamados_legado_cliente_aliases.codigo_cliente),
    last_synced_at = greatest(chamados_legado_cliente_aliases.last_synced_at, excluded.last_synced_at),
    last_data_abertura = greatest(chamados_legado_cliente_aliases.last_data_abertura, excluded.last_data_abertura);

create or replace function public.get_chamados_legacy_client_options()
returns table (
  codigo_cliente text,
  nome_cliente text,
  aliases text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with canonical_clients as (
    select distinct on (catalog.client_key)
      catalog.client_key,
      catalog.codigo_cliente,
      catalog.nome_cliente
    from public.chamados_legado_cliente_aliases as catalog
    order by
      catalog.client_key,
      catalog.last_synced_at desc nulls last,
      catalog.last_data_abertura desc nulls last,
      catalog.nome_cliente
  ),
  client_aliases as (
    select
      catalog.client_key,
      array_agg(catalog.nome_cliente order by catalog.nome_cliente) as aliases
    from public.chamados_legado_cliente_aliases as catalog
    group by catalog.client_key
  )
  select
    canonical_clients.codigo_cliente,
    canonical_clients.nome_cliente,
    client_aliases.aliases
  from canonical_clients
  join client_aliases using (client_key)
  order by canonical_clients.nome_cliente;
$$;

revoke all on function public.get_chamados_legacy_client_options() from public;
grant execute on function public.get_chamados_legacy_client_options() to authenticated;

create or replace function public.request_processo_venda_legado_sync(
  p_start_date date,
  p_end_date date,
  p_filters jsonb default '{}'::jsonb
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

  if not public.has_permission(auth.uid(), 'chamados_legacy_query', 'view') then
    raise exception 'Usuario sem permissao para consultar chamados legados';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'Periodo de consulta invalido';
  end if;

  update public.chamados_sync_requests
     set status = 'error',
         detail = 'Substituida por uma consulta mais recente do mesmo usuario.',
         finished_at = now()
   where scope = 'processo_venda_legado'
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
    'processo_venda_legado',
    p_start_date,
    p_end_date,
    coalesce(p_filters, '{}'::jsonb)
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.request_processo_venda_legado_sync(date, date, jsonb) from public;
grant execute on function public.request_processo_venda_legado_sync(date, date, jsonb) to authenticated;

comment on function public.request_processo_venda_legado_sync(date, date, jsonb) is
  'Cria uma consulta sob demanda das familias Control-M, Global e Siplan, mantendo apenas o pedido mais recente por usuario.';

notify pgrst, 'reload schema';
