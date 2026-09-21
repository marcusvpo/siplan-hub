-- Garante que as funções de trigger só sobrescrevam updated_at se ele não tiver sido definido explicitamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Restaura o updated_at real dos projetos baseado no último evento da timeline ou data de criação
UPDATE public.projects p
SET updated_at = COALESCE(
  (SELECT MAX(t.timestamp) FROM public.timeline_events t WHERE t.project_id = p.id),
  p.created_at
);

-- Registro de notificação no changelog (Regra 12 AGENTS.md)
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
  'projects',
  'Projetos: Correção na ordenação e preservação de updated_at',
  'Ajustadas as triggers de atualização de data para evitar que operações em massa alterem o updated_at de projetos não editados, restaurando a ordem cronológica real da listagem de projetos ativos.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications existing
  WHERE existing.category = 'changelog'
    AND existing.type = 'release_fix'
    AND existing.permission_resource = 'projects'
    AND existing.title = 'Projetos: Correção na ordenação e preservação de updated_at'
    AND existing.action_url = '/projects'
);
