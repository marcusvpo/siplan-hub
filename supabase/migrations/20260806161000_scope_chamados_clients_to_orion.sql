-- A Consulta de Chamados e exclusiva dos softwares Orion. Restringir a RPC
-- evita oferecer clientes que so possuem chamados de Caixa/SIPLAN no espelho.
create or replace function public.get_distinct_chamados_clientes()
returns table (nome_cliente text)
language sql
security definer
set search_path = public
as $$
  select distinct cpv.nome_cliente
  from public.chamados_processo_venda as cpv
  where nullif(btrim(cpv.nome_cliente), '') is not null
    and cpv.software ilike '%orion%'
  order by cpv.nome_cliente;
$$;

revoke all on function public.get_distinct_chamados_clientes() from public;
grant execute on function public.get_distinct_chamados_clientes() to authenticated;
