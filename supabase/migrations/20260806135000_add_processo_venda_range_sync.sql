-- Permite que a tela de Consulta de Chamados solicite ao worker somente o
-- periodo historico escolhido, sem voltar a varrer a view inteira.

alter table public.chamados_sync_requests
  add column if not exists scope text not null default 'chamados_0800',
  add column if not exists start_date date,
  add column if not exists end_date date;

alter table public.chamados_sync_requests
  drop constraint if exists chamados_sync_requests_scope_check;

alter table public.chamados_sync_requests
  add constraint chamados_sync_requests_scope_check
  check (scope in ('chamados_0800', 'processo_venda'));

alter table public.chamados_sync_requests
  drop constraint if exists chamados_sync_requests_processo_period_check;

alter table public.chamados_sync_requests
  add constraint chamados_sync_requests_processo_period_check
  check (
    scope <> 'processo_venda'
    or (start_date is not null and end_date is not null and start_date <= end_date)
  );

create index if not exists idx_chamados_sync_requests_pending_scope
  on public.chamados_sync_requests (scope, created_at)
  where status = 'pending';

create index if not exists idx_chamados_processo_venda_abertura
  on public.chamados_processo_venda (data_abertura desc);

comment on column public.chamados_sync_requests.scope is
  'chamados_0800: sync de projetos; processo_venda: sync historico por periodo.';

comment on column public.chamados_sync_requests.start_date is
  'Inicio do periodo solicitado para o espelho de processo de venda.';

comment on column public.chamados_sync_requests.end_date is
  'Fim do periodo solicitado para o espelho de processo de venda.';
