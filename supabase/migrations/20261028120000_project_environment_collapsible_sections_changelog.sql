-- Registra o destaque dos blocos expansíveis da preparação de ambiente.
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
  'projects',
  'Destaque nos blocos da preparação de ambiente',
  'Os blocos Dados de conexão e Configuração no Orion Admin receberam destaque visual e indicação clara de expansão para facilitar o preenchimento da preparação de ambiente.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications existing
  WHERE existing.category = 'changelog'
    AND existing.type = 'release_improvement'
    AND existing.permission_resource = 'projects'
    AND existing.title = 'Destaque nos blocos da preparação de ambiente'
    AND existing.action_url = '/projects'
);
