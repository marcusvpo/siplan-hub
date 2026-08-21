-- Migration: Aumentar timeout do webhook trigger para 30 segundos e garantir payload completo

DROP TRIGGER IF EXISTS n8n_openai_vector_webhook_trigger ON public.assistant_knowledge_versions;

CREATE TRIGGER n8n_openai_vector_webhook_trigger
  AFTER INSERT ON public.assistant_knowledge_versions
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'http://n8n.siplan.com.br:5678/webhook/update-openai-vector-store',
    'POST',
    '{"Content-Type":"application/json"}',
    '{}',
    '30000'
  );
