-- Registra o novo subfiltro de status das etapas na gestão de projetos.
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
  'Filtro de projetos por status da etapa',
  'Os filtros avançados de projetos agora permitem escolher o status específico da etapa selecionada, respeitando somente as etapas aplicáveis a cada tipo de projeto e os estados próprios da Análise de Aderência.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications existing
  WHERE existing.category = 'changelog'
    AND existing.type = 'release_improvement'
    AND existing.permission_resource = 'projects'
    AND existing.title = 'Filtro de projetos por status da etapa'
    AND existing.action_url = '/projects'
);
