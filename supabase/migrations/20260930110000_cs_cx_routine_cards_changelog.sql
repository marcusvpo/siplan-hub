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
  'cs_cx_rotinas',
  'Cards de rotinas CS/CX aprimorados',
  'Os cards da tela de Rotinas CS/CX foram aprimorados para tornar as informações e ações mais claras no acompanhamento dos cartórios.',
  '/cs-cx/rotinas'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'cs_cx_rotinas'
    AND title = 'Cards de rotinas CS/CX aprimorados'
    AND action_url = '/cs-cx/rotinas'
);
