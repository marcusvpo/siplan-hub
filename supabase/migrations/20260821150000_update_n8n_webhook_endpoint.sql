-- Migration: Atualização do Endpoint Webhook n8n e Criação do Database Webhook Trigger no Supabase

-- 1. Atualizar a URL na tabela de configurações
INSERT INTO public.settings (key, value)
VALUES (
  'n8n_openai_vector_webhook',
  jsonb_build_object(
    'url', 'http://n8n.siplan.com.br:5678/webhook/update-openai-vector-store',
    'enabled', true,
    'auth_header', 'x-webhook-token'
  )
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- 2. Atualizar a função RPC register_knowledge_version com o novo endpoint
CREATE OR REPLACE FUNCTION public.register_knowledge_version(
  p_backup_file_path text,
  p_article_id text DEFAULT NULL,
  p_article_title text DEFAULT NULL,
  p_summary_changes text DEFAULT NULL,
  p_diff_summary jsonb DEFAULT '{}'::jsonb,
  p_content_size_bytes integer DEFAULT NULL,
  p_is_restoration boolean DEFAULT false,
  p_restored_from_version_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id uuid;
  v_version_number integer;
  v_version_tag text;
  v_user_email text;
  v_user_name text;
  v_webhook_url text;
  v_webhook_setting jsonb;
BEGIN
  -- Obter próximo número sequencial de versão
  SELECT public.get_next_knowledge_version_number() INTO v_version_number;
  v_version_tag := 'v' || v_version_number::text;

  -- Obter dados do usuário
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = auth.uid();
  IF v_user_name IS NULL OR v_user_name = '' THEN
    v_user_name := split_part(v_user_email, '@', 1);
  END IF;

  -- Inserir registro de versão
  INSERT INTO public.assistant_knowledge_versions (
    version_number,
    version_tag,
    bucket,
    file_path,
    backup_file_path,
    article_id,
    article_title,
    summary_changes,
    diff_summary,
    author_id,
    author_email,
    author_name,
    content_size_bytes,
    webhook_sync_status,
    is_restoration,
    restored_from_version_id,
    metadata
  ) VALUES (
    v_version_number,
    v_version_tag,
    'assistant-oriontn-doc',
    'OrionTN pos.md',
    p_backup_file_path,
    p_article_id,
    p_article_title,
    p_summary_changes,
    p_diff_summary,
    auth.uid(),
    v_user_email,
    v_user_name,
    p_content_size_bytes,
    'synced',
    p_is_restoration,
    p_restored_from_version_id,
    p_metadata
  ) RETURNING id INTO v_version_id;

  -- Registrar também na tabela de logs de sincronização
  INSERT INTO public.assistant_knowledge_sync_logs (
    bucket,
    file_path,
    article_id,
    article_title,
    updated_by,
    updated_by_email,
    status,
    content_size,
    metadata
  ) VALUES (
    'assistant-oriontn-doc',
    'OrionTN pos.md',
    p_article_id,
    p_article_title,
    auth.uid(),
    v_user_email,
    'synced',
    p_content_size_bytes,
    jsonb_build_object(
      'version_id', v_version_id,
      'version_number', v_version_number,
      'version_tag', v_version_tag,
      'backup_file_path', p_backup_file_path,
      'is_restoration', p_is_restoration,
      'summary_changes', p_summary_changes
    )
  );

  -- Disparar webhook n8n diretamente via net.http_post
  SELECT value INTO v_webhook_setting FROM public.settings WHERE key = 'n8n_openai_vector_webhook';
  IF v_webhook_setting IS NOT NULL AND (v_webhook_setting->>'enabled')::boolean = true THEN
    v_webhook_url := v_webhook_setting->>'url';
    IF v_webhook_url IS NOT NULL AND v_webhook_url <> '' THEN
      BEGIN
        PERFORM net.http_post(
          url := v_webhook_url,
          body := json_build_object(
            'bucket', 'assistant-oriontn-doc',
            'file_path', 'OrionTN pos.md',
            'backup_file_path', p_backup_file_path,
            'version_id', v_version_id,
            'version_number', v_version_number,
            'version_tag', v_version_tag,
            'article_id', p_article_id,
            'article_title', p_article_title,
            'summary_changes', p_summary_changes,
            'is_restoration', p_is_restoration,
            'updated_by', v_user_email,
            'updated_by_name', v_user_name,
            'updated_at', now()::text
          )::jsonb,
          headers := json_build_object(
            'Content-Type', 'application/json'
          )::jsonb,
          timeout_milliseconds := 5000
        );
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.assistant_knowledge_versions
        SET webhook_sync_status = 'failed',
            metadata = metadata || jsonb_build_object('webhook_error', SQLERRM)
        WHERE id = v_version_id;
      END;
    END IF;
  END IF;

  RETURN v_version_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_knowledge_version TO authenticated;

-- 3. Criar Database Webhook Trigger no Supabase (visível em Database > Webhooks)
DROP TRIGGER IF EXISTS n8n_openai_vector_webhook_trigger ON public.assistant_knowledge_versions;

CREATE TRIGGER n8n_openai_vector_webhook_trigger
  AFTER INSERT ON public.assistant_knowledge_versions
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'http://n8n.siplan.com.br:5678/webhook/update-openai-vector-store',
    'POST',
    '{"Content-type":"application/json"}',
    '{}',
    '5000'
  );
