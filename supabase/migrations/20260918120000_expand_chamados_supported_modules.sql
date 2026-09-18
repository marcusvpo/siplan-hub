-- Amplia a Consulta de Chamados para os módulos adicionais do catálogo atual.
-- O frontend e o worker filtram pelo campo Software da origem Ellevo.

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
  and lower(btrim(coalesce(cpv.software, ''))) like any (
    array['orion%', 'lcw%', 'sga%', 'siplan%nfse%']
  )
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
  if v_client_name is null or not (
    lower(btrim(coalesce(new.software, ''))) like any (
      array['orion%', 'lcw%', 'sga%', 'siplan%nfse%']
    )
  ) then
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
  'release_improvement',
  'chamados_query',
  'Novos módulos na Consulta de Chamados',
  'A Consulta de Chamados agora permite filtrar também pelos módulos LCW, SGA, OrionGED e Siplan NFSe, além de Orion TN, Orion PRO e Orion REG.',
  '/deployments/tickets'
where not exists (
  select 1
  from public.notifications existing
  where existing.category = 'changelog'
    and existing.type = 'release_improvement'
    and existing.permission_resource = 'chamados_query'
    and existing.title = 'Novos módulos na Consulta de Chamados'
    and existing.action_url = '/deployments/tickets'
);
