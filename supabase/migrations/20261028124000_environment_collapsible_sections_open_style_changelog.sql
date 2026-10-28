-- Registra o ajuste visual dos blocos expansíveis da preparação de ambiente.
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
  'Cores dos blocos expansíveis ajustadas',
  'Os blocos Dados de conexão e Configuração no Orion Admin mantêm o destaque vermelho apenas enquanto estão recolhidos e voltam ao visual neutro ao expandir.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications existing
  WHERE existing.category = 'changelog'
    AND existing.type = 'release_improvement'
    AND existing.permission_resource = 'projects'
    AND existing.title = 'Cores dos blocos expansíveis ajustadas'
    AND existing.action_url = '/projects'
);
