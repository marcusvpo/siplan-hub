-- Permite que a Consulta de Chamados envie o recorte exato ao worker e receba
-- os chamados encontrados naquela fotografia. O sync geral de uma hora continua
-- usando filters = {} e nao muda de comportamento.

alter table public.chamados_sync_requests
  add column if not exists filters jsonb not null default '{}'::jsonb,
  add column if not exists result_ticket_ids text[];

comment on column public.chamados_sync_requests.filters is
  'Filtros parametrizados da Consulta de Chamados para sync processo_venda sob demanda.';

comment on column public.chamados_sync_requests.result_ticket_ids is
  'Numeros dos chamados encontrados pelo worker para reutilizacao pela tela e pelo PDF.';
