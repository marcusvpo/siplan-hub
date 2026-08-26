-- Campos oficiais de SLA do Ellevo para a Consulta de Chamados.
-- O HUB apenas espelha os valores calculados na origem; não permite editar
-- limites nem recalcula o calendário de atendimento no navegador.

alter table public.chamados_processo_venda
  add column if not exists criticidade text,
  add column if not exists equipe_responsavel text,
  add column if not exists sla_primeira_resposta_prevista_em timestamp without time zone,
  add column if not exists sla_primeira_resposta_real_em timestamp without time zone,
  add column if not exists sla_vencimento_em timestamp without time zone,
  add column if not exists sla_vencimento_pausado boolean not null default false,
  add column if not exists sla_vencimento_manual boolean not null default false,
  add column if not exists sla_tempo_primeira_resposta_minutos integer,
  add column if not exists sla_tempo_vencimento_minutos integer,
  add column if not exists sla_tempo_restante_minutos integer,
  add column if not exists sla_retorno_previsto_em timestamp without time zone,
  add column if not exists sla_retorno_real_em timestamp without time zone;

comment on column public.chamados_processo_venda.sla_primeira_resposta_prevista_em is
  'Data limite oficial da primeira resposta calculada pelo Ellevo.';
comment on column public.chamados_processo_venda.sla_primeira_resposta_real_em is
  'Data real da primeira resposta registrada pelo Ellevo.';
comment on column public.chamados_processo_venda.sla_vencimento_em is
  'Vencimento vigente do chamado calculado ou ajustado no Ellevo.';
comment on column public.chamados_processo_venda.sla_vencimento_pausado is
  'Indicador oficial de pausa do vencimento no Ellevo.';
comment on column public.chamados_processo_venda.sla_vencimento_manual is
  'Indica que o vencimento vigente foi informado manualmente no Ellevo.';
comment on column public.chamados_processo_venda.sla_retorno_previsto_em is
  'Retorno posterior previsto no Ellevo; não se confunde com primeira resposta.';

create index if not exists idx_chamados_processo_venda_sla_vencimento
  on public.chamados_processo_venda (sla_vencimento_em)
  where sla_vencimento_em is not null;

notify pgrst, 'reload schema';
