-- Informa os usuários autorizados sobre a exibição da data de entrega nas solicitações.
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
  'cs_cx_registros',
  'Data de entrega nas Solicitações de CS/CX',
  'A lista de Solicitações de CS/CX agora exibe a data de entrega nos formatos desktop e mobile, facilitando a consulta dos registros concluídos.',
  '/cs-cx/registros'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'cs_cx_registros'
    AND title = 'Data de entrega nas Solicitações de CS/CX'
    AND action_url = '/cs-cx/registros'
);
