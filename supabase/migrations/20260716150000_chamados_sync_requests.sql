-- Sinal de "sincronizar agora" do espelho de chamados 0800.
--
-- O botao no card de Pos-Implantacao insere uma linha aqui; o vm-worker escuta
-- INSERT via Realtime (mesmo mecanismo das filas de IA) e dispara o sync na
-- hora, sem esperar o polling de 5 min. Ao terminar, o worker marca a linha
-- como done/error (via service key -- por isso NAO ha policy de UPDATE).

create table if not exists public.chamados_sync_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by text,
  status text not null default 'pending', -- pending | done | error
  detail text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

comment on table public.chamados_sync_requests is
  'Pedidos de sync imediato do espelho chamados_0800. INSERT pelo front (authenticated); processado e atualizado pelo vm-worker (service key).';

alter table public.chamados_sync_requests enable row level security;

-- Qualquer usuario logado pode pedir um sync e acompanhar o resultado.
-- Nunca TO public: a chave anon esta no bundle.
drop policy if exists "chamados_sync_requests_insert_authenticated" on public.chamados_sync_requests;
create policy "chamados_sync_requests_insert_authenticated"
  on public.chamados_sync_requests
  for insert
  to authenticated
  with check (true);

drop policy if exists "chamados_sync_requests_select_authenticated" on public.chamados_sync_requests;
create policy "chamados_sync_requests_select_authenticated"
  on public.chamados_sync_requests
  for select
  to authenticated
  using (true);

-- Worker escuta INSERT desta tabela em tempo real.
alter publication supabase_realtime add table public.chamados_sync_requests;
