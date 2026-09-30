-- Mantém a conclusão da etapa de Conversão alinhada com a Gestão de Atividades.
CREATE OR REPLACE FUNCTION public.sync_conversion_queue_project_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.conversion_status = 'done' THEN
    UPDATE public.conversion_queue
    SET
      queue_status = 'done',
      completed_at = COALESCE(completed_at, NOW()),
      updated_at = NOW()
    WHERE project_id = NEW.id
      AND queue_status IS DISTINCT FROM 'done';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_conversion_queue_project_status ON public.projects;
CREATE TRIGGER trg_sync_conversion_queue_project_status
  AFTER INSERT OR UPDATE OF conversion_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conversion_queue_project_status();

-- Saneia divergências anteriores à criação do trigger, inclusive projetos já finalizados.
UPDATE public.conversion_queue AS queue_item
SET
  queue_status = 'done',
  completed_at = COALESCE(queue_item.completed_at, NOW()),
  updated_at = NOW()
FROM public.projects AS project
WHERE queue_item.project_id = project.id
  AND project.conversion_status = 'done'
  AND queue_item.queue_status IS DISTINCT FROM 'done';

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
  'conversion_home',
  'Status finalizado sincronizado na Gestão de Atividades',
  'Projetos com a etapa de Conversão finalizada agora aparecem automaticamente como concluídos na Gestão de Atividades, inclusive para registros antigos.',
  '/conversion/atividades'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'conversion_home'
    AND title = 'Status finalizado sincronizado na Gestão de Atividades'
    AND action_url = '/conversion/atividades'
);
