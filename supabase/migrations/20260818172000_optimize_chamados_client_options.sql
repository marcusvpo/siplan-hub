-- Mantem um catalogo pequeno de codigos e nomes historicos. A RPC anterior
-- precisava reagrupar toda a tabela de chamados e excedia o statement_timeout
-- do PostgREST, fazendo a tela cair no fallback com aliases antigos.

create table if not exists public.chamados_cliente_aliases (
  client_key text not null,
  codigo_cliente text,
  nome_cliente text not null,
  last_synced_at timestamptz,
  last_data_abertura date,
  primary key (client_key, nome_cliente)
);

alter table public.chamados_cliente_aliases enable row level security;

insert into public.chamados_cliente_aliases (
  client_key,
  codigo_cliente,
  nome_cliente,
  last_synced_at,
  last_data_abertura
)
select
  coalesce(
    nullif(btrim(cpv.codigo_cliente), ''),
    'nome:' || lower(btrim(cpv.nome_cliente))
  ) as client_key,
  nullif(btrim(cpv.codigo_cliente), '') as codigo_cliente,
  btrim(cpv.nome_cliente) as nome_cliente,
  max(cpv.synced_at) as last_synced_at,
  max(cpv.data_abertura) as last_data_abertura
from public.chamados_processo_venda as cpv
where nullif(btrim(cpv.nome_cliente), '') is not null
  and lower(btrim(cpv.software)) like 'orion%'
group by 1, 2, 3
on conflict (client_key, nome_cliente) do update
set codigo_cliente = coalesce(excluded.codigo_cliente, chamados_cliente_aliases.codigo_cliente),
    last_synced_at = greatest(
      chamados_cliente_aliases.last_synced_at,
      excluded.last_synced_at
    ),
    last_data_abertura = greatest(
      chamados_cliente_aliases.last_data_abertura,
      excluded.last_data_abertura
    );

create or replace function public.track_chamados_cliente_alias()
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
  if v_client_name is null or lower(btrim(coalesce(new.software, ''))) not like 'orion%' then
    return new;
  end if;

  v_client_code := nullif(btrim(new.codigo_cliente), '');
  v_client_key := coalesce(v_client_code, 'nome:' || lower(v_client_name));

  insert into public.chamados_cliente_aliases (
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
  set codigo_cliente = coalesce(excluded.codigo_cliente, chamados_cliente_aliases.codigo_cliente),
      last_synced_at = greatest(
        chamados_cliente_aliases.last_synced_at,
        excluded.last_synced_at
      ),
      last_data_abertura = greatest(
        chamados_cliente_aliases.last_data_abertura,
        excluded.last_data_abertura
      );

  return new;
end;
$$;

drop trigger if exists track_chamados_cliente_alias_trigger
  on public.chamados_processo_venda;

create trigger track_chamados_cliente_alias_trigger
after insert or update of codigo_cliente, nome_cliente, software, synced_at, data_abertura
on public.chamados_processo_venda
for each row execute function public.track_chamados_cliente_alias();

create or replace function public.get_chamados_client_options()
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
    from public.chamados_cliente_aliases as catalog
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
    from public.chamados_cliente_aliases as catalog
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

create or replace function public.get_distinct_chamados_clientes()
returns table (nome_cliente text)
language sql
stable
security definer
set search_path = public
as $$
  select options.nome_cliente
  from public.get_chamados_client_options() as options
  order by options.nome_cliente;
$$;

revoke all on function public.get_chamados_client_options() from public;
grant execute on function public.get_chamados_client_options() to authenticated;
revoke all on function public.get_distinct_chamados_clientes() from public;
grant execute on function public.get_distinct_chamados_clientes() to authenticated;

notify pgrst, 'reload schema';
