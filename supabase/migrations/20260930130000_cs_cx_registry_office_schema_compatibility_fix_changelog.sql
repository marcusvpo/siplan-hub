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
  'cs_cx_cartorios',
  'Compatibilidade no cadastro de cartórios CS/CX',
  'Os cadastros de cartórios voltam a carregar normalmente mesmo antes da atualização do schema que adiciona o nome do tabelião.',
  '/cs-cx/cartorios'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'cs_cx_cartorios'
    AND title = 'Compatibilidade no cadastro de cartórios CS/CX'
    AND action_url = '/cs-cx/cartorios'
);
