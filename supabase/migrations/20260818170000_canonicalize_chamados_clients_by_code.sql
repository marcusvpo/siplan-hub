-- Um mesmo cliente pode ter nomes historicos diferentes no Ellevo. A tela
-- filtra a origem pelo nome atual, entao oferecer um alias antigo no seletor
-- faz o sync retornar zero chamados. Consolida os aliases pelo codigo estavel
-- do cliente e preserva nomes sem codigo como identidades independentes.

create or replace function public.get_distinct_chamados_clientes()
returns table (nome_cliente text)
language sql
security definer
set search_path = public
as $$
  with ranked_clients as (
    select
      btrim(cpv.nome_cliente) as canonical_name,
      row_number() over (
        partition by coalesce(
          nullif(btrim(cpv.codigo_cliente), ''),
          'nome:' || lower(btrim(cpv.nome_cliente))
        )
        order by
          cpv.synced_at desc nulls last,
          cpv.data_abertura desc nulls last,
          cpv.nome_cliente
      ) as position
    from public.chamados_processo_venda as cpv
    where nullif(btrim(cpv.nome_cliente), '') is not null
      and lower(btrim(cpv.software)) like 'orion%'
  )
  select ranked_clients.canonical_name as nome_cliente
  from ranked_clients
  where ranked_clients.position = 1
  order by ranked_clients.canonical_name;
$$;

revoke all on function public.get_distinct_chamados_clientes() from public;
grant execute on function public.get_distinct_chamados_clientes() to authenticated;

-- Versao rica para o seletor: devolve o codigo estavel, o nome atual e todos
-- os aliases. Uma aba que ainda tenha um nome antigo em memoria pode assim
-- migrar a selecao automaticamente para o cliente correto.
create or replace function public.get_chamados_client_options()
returns table (
  codigo_cliente text,
  nome_cliente text,
  aliases text[]
)
language sql
security definer
set search_path = public
as $$
  with source_rows as (
    select
      coalesce(
        nullif(btrim(cpv.codigo_cliente), ''),
        'nome:' || lower(btrim(cpv.nome_cliente))
      ) as client_key,
      nullif(btrim(cpv.codigo_cliente), '') as client_code,
      btrim(cpv.nome_cliente) as source_name,
      cpv.synced_at,
      cpv.data_abertura
    from public.chamados_processo_venda as cpv
    where nullif(btrim(cpv.nome_cliente), '') is not null
      and lower(btrim(cpv.software)) like 'orion%'
  ),
  ranked_clients as (
    select
      source_rows.*,
      row_number() over (
        partition by source_rows.client_key
        order by
          source_rows.synced_at desc nulls last,
          source_rows.data_abertura desc nulls last,
          source_rows.source_name
      ) as position
    from source_rows
  ),
  client_aliases as (
    select
      source_rows.client_key,
      array_agg(distinct source_rows.source_name order by source_rows.source_name) as aliases
    from source_rows
    group by source_rows.client_key
  )
  select
    ranked_clients.client_code as codigo_cliente,
    ranked_clients.source_name as nome_cliente,
    client_aliases.aliases
  from ranked_clients
  join client_aliases using (client_key)
  where ranked_clients.position = 1
  order by ranked_clients.source_name;
$$;

revoke all on function public.get_chamados_client_options() from public;
grant execute on function public.get_chamados_client_options() to authenticated;
