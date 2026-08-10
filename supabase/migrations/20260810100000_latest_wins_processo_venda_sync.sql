-- Mantem apenas a consulta de chamados mais recente de cada usuario.
-- A funcao e SECURITY DEFINER porque o front nao possui (nem deve possuir)
-- permissao de UPDATE na fila processada pelo worker.

create or replace function public.request_processo_venda_sync(
  p_start_date date,
  p_end_date date,
  p_filters jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester text := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'Periodo de consulta invalido';
  end if;

  update public.chamados_sync_requests
     set status = 'error',
         detail = 'Substituida por uma consulta mais recente do mesmo usuario.',
         finished_at = now()
   where scope = 'processo_venda'
     and requested_by = v_requester
     and status in ('pending', 'processing');

  insert into public.chamados_sync_requests (
    requested_by,
    scope,
    start_date,
    end_date,
    filters
  ) values (
    v_requester,
    'processo_venda',
    p_start_date,
    p_end_date,
    coalesce(p_filters, '{}'::jsonb)
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.request_processo_venda_sync(date, date, jsonb) from public;
grant execute on function public.request_processo_venda_sync(date, date, jsonb) to authenticated;

comment on function public.request_processo_venda_sync(date, date, jsonb) is
  'Substitui pedidos pendentes/em processamento do mesmo usuario e cria a consulta processo_venda mais recente.';

