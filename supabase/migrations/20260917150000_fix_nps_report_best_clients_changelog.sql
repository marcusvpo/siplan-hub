-- Registra de forma idempotente a correção do relatório PDF de NPS.
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
  'release_fix',
  'cs_cx_nps',
  'Correção dos melhores clientes no relatório NPS',
  'O PDF do relatório NPS agora lista os clientes com notas 9 e 10 do recorte selecionado e corrige a apresentação enganosa de NPS 0 por cartório.',
  '/cs-cx/nps'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'cs_cx_nps'
    AND title = 'Correção dos melhores clientes no relatório NPS'
    AND action_url = '/cs-cx/nps'
);
