-- Preserva data e hora da abertura/encerramento para a analise de SLA.
-- As colunas date existentes continuam sendo usadas nos filtros por periodo.

alter table public.chamados_processo_venda
  add column if not exists aberto_em timestamp without time zone,
  add column if not exists encerrado_em timestamp without time zone;

create index if not exists idx_chamados_processo_venda_catalogo_aberto_em
  on public.chamados_processo_venda (produto, aberto_em desc);

comment on column public.chamados_processo_venda.aberto_em is
  'Data e hora local de abertura do chamado na origem Ellevo.';

comment on column public.chamados_processo_venda.encerrado_em is
  'Data e hora local de encerramento do chamado na origem Ellevo.';

notify pgrst, 'reload schema';
