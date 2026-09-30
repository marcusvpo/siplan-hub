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
  'Indicadores de análise nas rotinas CS/CX',
  'A tela de Rotinas CS/CX agora destaca em verde os cartórios analisados e exibe a coluna Itens p/ validar para identificar itens com status Analisar.',
  '/cs-cx/rotinas'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'cs_cx_rotinas'
    AND title = 'Indicadores de análise nas rotinas CS/CX'
    AND action_url = '/cs-cx/rotinas'
);
