-- Registra de forma idempotente a melhoria do filtro por Produto nas Solicitações NPS.
INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
SELECT
  'changelog',
  'release_improvement',
  'cs_cx_nps',
  'Filtro por Produto nas Solicitações NPS',
  'A aba Solicitações do NPS agora permite filtrar localmente as solicitações por Produto, facilitando a análise dos registros já carregados.',
  '/cs-cx/nps'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'cs_cx_nps'
    AND title = 'Filtro por Produto nas Solicitações NPS'
    AND action_url = '/cs-cx/nps'
);
