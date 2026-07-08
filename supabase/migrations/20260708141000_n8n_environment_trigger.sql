-- Migration: Adicionar trigger n8n para início da preparação de ambiente

-- Criação do trigger condicional
DROP TRIGGER IF EXISTS n8n_preparacao_ambiente ON public.projects;

CREATE TRIGGER n8n_preparacao_ambiente
  AFTER UPDATE OF environment_status ON public.projects
  FOR EACH ROW
  WHEN (
    NEW.environment_status = 'in-progress' 
    AND (OLD.environment_status IS DISTINCT FROM 'in-progress')
  )
  EXECUTE FUNCTION supabase_functions.http_request(
    'http://n8n.siplan.com.br:5678/webhook/preparacao-ambiente', 
    'POST', 
    '{"Content-type":"application/json"}', 
    '{}', 
    '5000'
  );
