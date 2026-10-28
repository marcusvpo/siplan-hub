-- Registra a abertura padrão da galeria de imagens da preparação de ambiente.
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
  'Galeria de imagens aberta por padrão',
  'A galeria de imagens da Preparação de Ambiente passa a abrir expandida, facilitando o envio e a consulta dos prints do sistema configurado.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications existing
  WHERE existing.category = 'changelog'
    AND existing.type = 'release_improvement'
    AND existing.permission_resource = 'projects'
    AND existing.title = 'Galeria de imagens aberta por padrão'
    AND existing.action_url = '/projects'
);
