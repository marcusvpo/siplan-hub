-- Espelho read-only dos chamados 0800 (Ellevo).
--
-- Fonte: SQL Server interno 10.0.10.59, banco Siplan_AcessoIA,
-- view vw_2026_ChamadosTodosStatus (uma linha por tramite; o sync deduplica
-- por NumeroChamado). Alimentada pelo vm-worker a cada ~5 min via chave
-- secreta (bypassa RLS) -- por isso NAO existem policies de escrita aqui.
--
-- Uso no front: card de Pos-Implantacao lista os chamados do cliente do
-- projeto abertos dentro do periodo do pos. O vinculo projeto->cliente e
-- resolvido pelo proprio espelho: projects.ticket_number = numero_chamado
-- do chamado de origem, que carrega id_cliente_ellevo.

create table if not exists public.chamados_0800 (
  numero_chamado text primary key,
  id_cliente_ellevo integer not null,
  cardcode_0800 text,
  nome_cliente text,
  solicitante text,
  titulo text,
  descricao text,
  natureza text,
  status text,
  criticidade text,
  software text,
  produto text,
  equipe_responsavel text,
  data_abertura date,
  data_encerramento date,
  synced_at timestamptz not null default now()
);

comment on table public.chamados_0800 is
  'Espelho da vw_2026_ChamadosTodosStatus (Ellevo/0800), deduplicado por chamado. Escrita exclusiva do vm-worker (service key).';

-- Consulta tipica: chamados de um cliente dentro do periodo do pos.
create index if not exists idx_chamados_0800_cliente_abertura
  on public.chamados_0800 (id_cliente_ellevo, data_abertura desc);

alter table public.chamados_0800 enable row level security;

-- Leitura para qualquer usuario logado (dado operacional interno, mesma
-- exposicao de projects). Nunca TO public: a chave anon esta no bundle.
drop policy if exists "chamados_0800_select_authenticated" on public.chamados_0800;
create policy "chamados_0800_select_authenticated"
  on public.chamados_0800
  for select
  to authenticated
  using (true);
