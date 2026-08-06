-- O produto licenciado vem de uma relacao 1:N e nao identifica o software do
-- chamado. Usar o software atendido evita omitir clientes Orion que tambem
-- possuem itens de Livro Caixa, IA ou outros produtos no processo de venda.

create index if not exists idx_chamados_processo_venda_orion_clientes
  on public.chamados_processo_venda (nome_cliente)
  where lower(btrim(software)) like 'orion%';

create or replace function public.get_distinct_chamados_clientes()
returns table (nome_cliente text)
language sql
security definer
set search_path = public
as $$
  select distinct cpv.nome_cliente
  from public.chamados_processo_venda as cpv
  where nullif(btrim(cpv.nome_cliente), '') is not null
    and lower(btrim(cpv.software)) like 'orion%'
  order by cpv.nome_cliente;
$$;

revoke all on function public.get_distinct_chamados_clientes() from public;
grant execute on function public.get_distinct_chamados_clientes() to authenticated;
