-- Migration: Adicionar trigger n8n para finalização/envio da coleta pública de infraestrutura

DROP TRIGGER IF EXISTS n8n_coleta_infra_concluida ON public.projects;

CREATE TRIGGER n8n_coleta_infra_concluida
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  WHEN (
    NEW.last_update_by = 'Coleta Pública (Técnico)'
    AND (OLD.last_update_by IS DISTINCT FROM 'Coleta Pública (Técnico)')
  )
  EXECUTE FUNCTION supabase_functions.http_request(
    'http://n8n.siplan.com.br:5678/webhook/coleta-infra-concluida', 
    'POST', 
    '{"Content-type":"application/json"}', 
    '{}', 
    '5000'
  );
