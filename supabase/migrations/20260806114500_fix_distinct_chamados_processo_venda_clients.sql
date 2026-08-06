-- A tela Consulta de Chamados usa o espelho da view de processo de venda.
-- A funcao original consultava chamados_0800, deixando clientes exclusivos do
-- processo de venda fora do seletor.

create or replace function public.get_distinct_chamados_clientes()
returns table (nome_cliente text)
language sql
security definer
set search_path = public
as $$
  select distinct cpv.nome_cliente
  from public.chamados_processo_venda as cpv
  where nullif(btrim(cpv.nome_cliente), '') is not null
  order by cpv.nome_cliente;
$$;

revoke all on function public.get_distinct_chamados_clientes() from public;
grant execute on function public.get_distinct_chamados_clientes() to authenticated;
