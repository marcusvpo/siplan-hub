-- Historico de tramites dos chamados exibidos em Consulta de Chamados.
-- Mantem uma linha por chamado na tabela principal e o relacionamento 1:N aqui.

create table if not exists public.chamados_processo_venda_tramites (
  numero_chamado text not null
    references public.chamados_processo_venda(numero_chamado) on delete cascade,
  sequencia_tramite bigint not null,
  numero_tramite integer,
  data_tramite timestamp without time zone,
  responsavel text,
  equipe_responsavel text,
  atividade text,
  descricao text,
  synced_at timestamptz not null default now(),
  primary key (numero_chamado, sequencia_tramite)
);

comment on table public.chamados_processo_venda_tramites is
  'Historico 1:N de tramites dos chamados Orion, alimentado pelo vm-worker.';

create index if not exists idx_chamados_processo_venda_tramites_ordem
  on public.chamados_processo_venda_tramites
  (numero_chamado, data_tramite desc, numero_tramite desc);

alter table public.chamados_processo_venda_tramites enable row level security;

drop policy if exists "chamados_processo_venda_tramites_select_authenticated"
  on public.chamados_processo_venda_tramites;

create policy "chamados_processo_venda_tramites_select_authenticated"
  on public.chamados_processo_venda_tramites
  for select
  to authenticated
  using (true);
