-- Tabela espelho da view vw_2026_PROCESSO_VENDA_FATURAMENTO_ITEM_ATIVIDADES do Ellevo.
-- Utilizada especificamente para a tela de Consulta de Chamados de Implantação.

create table if not exists public.chamados_processo_venda (
  numero_chamado text primary key,
  codigo_cliente text,
  nome_cliente text,
  razao_social_cliente text,
  data_pedido_venda date,
  numero_pedido_venda text,
  titulo text,
  descricao text,
  natureza text,
  status text,
  software text,
  produto text,
  data_abertura date,
  data_encerramento date,
  synced_at timestamptz not null default now()
);

comment on table public.chamados_processo_venda is
  'Espelho da view vw_2026_PROCESSO_VENDA_FATURAMENTO_ITEM_ATIVIDADES (Ellevo), deduplicado por chamado. Alimentada pelo vm-worker.';

-- Índice para acelerar a busca e listagem
create index if not exists idx_chamados_processo_venda_cliente_abertura
  on public.chamados_processo_venda (nome_cliente, data_abertura desc);

alter table public.chamados_processo_venda enable row level security;

-- Política de leitura para usuários autenticados
drop policy if exists "chamados_processo_venda_select_authenticated" on public.chamados_processo_venda;
create policy "chamados_processo_venda_select_authenticated"
  on public.chamados_processo_venda
  for select
  to authenticated
  using (true);
