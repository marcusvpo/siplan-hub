-- Sincroniza a data de envio dos projetos para a fila de conversão e previne divergências entre projects e conversion_queue.

-- 1. Preenche conversion_sent_at em public.projects para projetos já presentes na fila de conversão que estavam com valor NULL
UPDATE public.projects AS p
SET
  conversion_sent_at = cq.sent_at::date,
  conversion_status = CASE 
    WHEN p.conversion_status = 'todo' THEN 'in-progress' 
    ELSE p.conversion_status 
  END,
  updated_at = NOW()
FROM public.conversion_queue AS cq
WHERE cq.project_id = p.id
  AND p.conversion_sent_at IS NULL;

-- 2. Função e Trigger para sincronizar projects.conversion_sent_at quando um item entra na fila de conversão
CREATE OR REPLACE FUNCTION public.sync_conversion_queue_insert_to_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.projects
  SET
    conversion_sent_at = COALESCE(conversion_sent_at, NEW.sent_at::date),
    conversion_status = CASE 
      WHEN conversion_status = 'todo' THEN 'in-progress' 
      ELSE conversion_status 
    END,
    updated_at = NOW()
  WHERE id = NEW.project_id
    AND (conversion_sent_at IS NULL OR conversion_status = 'todo');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_conversion_queue_insert_to_project ON public.conversion_queue;
CREATE TRIGGER trg_sync_conversion_queue_insert_to_project
  AFTER INSERT ON public.conversion_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conversion_queue_insert_to_project();

-- 3. Notificação no Changelog
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
  'Correção e sincronização no envio para a Fila de Conversão',
  'Corrigido erro 409 de chave duplicada ao enviar projetos para a conversão e sincronizada a data de envio dos projetos com a fila de atividades.',
  '/conversion/atividades'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'conversion_home'
    AND title = 'Correção e sincronização no envio para a Fila de Conversão'
    AND action_url = '/conversion/atividades'
);
