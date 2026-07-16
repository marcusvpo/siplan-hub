-- Parecer IA da CARTEIRA (Panorama Pos-Implantacao) + RPCs de alerta para n8n.
--
-- 1) dtc_ai_jobs.project_id vira nullable e o CHECK ganha 'panorama_parecer':
--    o parecer do Panorama analisa o recorte da carteira inteira, sem projeto
--    unico. Jobs por-projeto continuam obrigando project_id no front; os
--    pipelines existentes nao dependem de project_id para jobs de texto.
-- 2) RPCs para as automacoes n8n (polling agendado):
--    - pos_chamados_criticos_abertos(p_dias): chamados CRITICOS em aberto ha
--      p_dias+ dentro da janela de pos de algum projeto (mesmo criterio do
--      Panorama: cliente via ticket de origem + produto + periodo).
--    - pos_temas_recorrentes(p_min_cartorios, p_dias): temas IA presentes em
--      N+ cartorios nos ultimos p_dias.
--    SECURITY INVOKER; EXECUTE para authenticated e service_role.

alter table public.dtc_ai_jobs alter column project_id drop not null;

alter table public.dtc_ai_jobs drop constraint if exists dtc_ai_jobs_job_type_check;
alter table public.dtc_ai_jobs add constraint dtc_ai_jobs_job_type_check
  check (job_type = any (array[
    'dtc_summary'::text,
    'improve_text'::text,
    'summary_blocks'::text,
    'voice_note'::text,
    'pos_parecer'::text,
    'panorama_parecer'::text
  ]));

-- Normalizacao de produto igual a do front: minusculas, so alfanumericos,
-- system_type do projeto como prefixo do software do chamado (ou igual).
create or replace function public.pos_produto_match(p_software text, p_system_type text)
returns boolean
language sql
immutable
as $$
  select case
    when coalesce(p_software, '') = '' or coalesce(p_system_type, '') = '' then false
    else regexp_replace(lower(p_software), '[^a-z0-9]', '', 'g')
         like regexp_replace(lower(p_system_type), '[^a-z0-9]', '', 'g') || '%'
  end
$$;

create or replace function public.pos_chamados_criticos_abertos(p_dias integer default 3)
returns table (
  numero_chamado text,
  cliente text,
  produto text,
  titulo text,
  criticidade text,
  dias_aberto integer,
  data_abertura date,
  projeto_id uuid,
  lider text
)
language sql
stable
as $$
  select distinct on (c.numero_chamado)
         c.numero_chamado,
         c.nome_cliente,
         p.system_type,
         c.titulo,
         c.criticidade,
         (current_date - c.data_abertura)::integer,
         c.data_abertura,
         p.id,
         p.project_leader
  from public.projects p
  join public.chamados_0800 o on o.numero_chamado = trim(p.ticket_number)
  join public.chamados_0800 c on c.id_cliente_ellevo = o.id_cliente_ellevo
  where p.is_deleted is not true
    and p.post_start_date is not null
    and c.data_abertura >= p.post_start_date
    and c.data_abertura <= coalesce(
          case when p.post_status = 'done' then p.post_end_date end, current_date)
    and public.pos_produto_match(c.software, p.system_type)
    and c.data_encerramento is null
    and lower(coalesce(c.criticidade, '')) like '%cr%tico%'
    and lower(coalesce(c.criticidade, '')) not like '%n_o%'
    and lower(coalesce(c.natureza, '')) not in ('nova implantação', 'negociação comercial')
    and (current_date - c.data_abertura) >= p_dias
  order by c.numero_chamado, c.data_abertura
$$;

create or replace function public.pos_temas_recorrentes(
  p_min_cartorios integer default 3,
  p_dias integer default 30
)
returns table (
  tema text,
  chamados bigint,
  cartorios bigint,
  nomes text[]
)
language sql
stable
as $$
  select c.tema_ia,
         count(*)::bigint,
         count(distinct c.nome_cliente)::bigint,
         array_agg(distinct c.nome_cliente)
  from public.chamados_0800 c
  where c.tema_ia is not null
    and c.tema_ia not in ('interno', 'não classificado')
    and c.data_abertura >= current_date - p_dias
  group by c.tema_ia
  having count(distinct c.nome_cliente) >= p_min_cartorios
  order by count(distinct c.nome_cliente) desc, count(*) desc
$$;

grant execute on function public.pos_produto_match(text, text) to authenticated, service_role;
grant execute on function public.pos_chamados_criticos_abertos(integer) to authenticated, service_role;
grant execute on function public.pos_temas_recorrentes(integer, integer) to authenticated, service_role;
