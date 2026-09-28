-- Migration: Função RPC para sincronização manual da Base de Conhecimento Orion TN a partir do Supabase Storage
-- Permite que analistas que subiram o arquivo diretamente no Supabase Storage e na OpenAI sincronizem a base com um clique

-- 1. Atualizar o trigger para não disparar quando for sincronização manual (evita duplicação no n8n)
DROP TRIGGER IF EXISTS n8n_openai_vector_webhook_trigger ON public.assistant_knowledge_versions;

CREATE TRIGGER n8n_openai_vector_webhook_trigger
  AFTER INSERT ON public.assistant_knowledge_versions
  FOR EACH ROW
  WHEN (NEW.webhook_sync_status = 'syncing' AND (NEW.metadata->>'manual_sync') IS NULL)
  EXECUTE FUNCTION supabase_functions.http_request(
    'http://n8n.siplan.com.br:5678/webhook/update-openai-vector-store',
    'POST',
    '{"Content-Type":"application/json"}',
    '{}',
    '30000'
  );

-- 2. Criar a RPC sync_manual_knowledge_version
CREATE OR REPLACE FUNCTION public.sync_manual_knowledge_version(
  p_summary_changes text DEFAULT 'Sincronização manual com Supabase Storage & OpenAI'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  v_storage_obj record;
  v_next_version_num integer;
  v_version_tag text;
  v_version_id uuid;
  v_user_email text;
  v_user_name text;
  v_content_size integer;
  v_backup_file_path text;
  v_storage_updated_at timestamptz;
BEGIN
  -- Obter metadados do arquivo atual no storage.objects
  SELECT id, updated_at, created_at, metadata
  INTO v_storage_obj
  FROM storage.objects
  WHERE bucket_id = 'assistant-oriontn-doc' AND name = 'OrionTN pos.md'
  LIMIT 1;

  IF v_storage_obj.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Arquivo OrionTN pos.md não foi encontrado no bucket assistant-oriontn-doc.'
    );
  END IF;

  v_storage_updated_at := COALESCE(v_storage_obj.updated_at, v_storage_obj.created_at, now());
  v_content_size := COALESCE(
    (v_storage_obj.metadata->>'size')::integer,
    (v_storage_obj.metadata->>'contentLength')::integer,
    0
  );

  -- Obter próximo número sequencial de versão
  SELECT public.get_next_knowledge_version_number() INTO v_next_version_num;
  v_version_tag := 'v' || v_next_version_num::text;
  v_backup_file_path := 'backup/OrionTN pos_' || v_version_tag || '_' || to_char(now(), 'YYYYMMDD_HH24MISS') || '.md';

  -- Obter dados do usuário autenticado (se disponível)
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = auth.uid();
  IF v_user_name IS NULL OR v_user_name = '' THEN
    v_user_name := COALESCE(split_part(v_user_email, '@', 1), 'Sincronização Manual');
  END IF;

  -- Inserir registro na tabela assistant_knowledge_versions
  INSERT INTO public.assistant_knowledge_versions (
    version_number,
    version_tag,
    bucket,
    file_path,
    backup_file_path,
    article_title,
    summary_changes,
    content_size_bytes,
    webhook_sync_status,
    is_restoration,
    author_id,
    author_email,
    author_name,
    created_at,
    metadata
  ) VALUES (
    v_next_version_num,
    v_version_tag,
    'assistant-oriontn-doc',
    'OrionTN pos.md',
    v_backup_file_path,
    'Sincronização Manual da Base Orion TN',
    COALESCE(p_summary_changes, 'Sincronização manual com Supabase Storage & OpenAI'),
    v_content_size,
    'synced',
    false,
    auth.uid(),
    v_user_email,
    v_user_name,
    now(),
    jsonb_build_object(
      'manual_sync', true,
      'storage_object_id', v_storage_obj.id,
      'storage_updated_at', v_storage_updated_at
    )
  ) RETURNING id INTO v_version_id;

  -- Inserir registro na tabela assistant_knowledge_sync_logs
  INSERT INTO public.assistant_knowledge_sync_logs (
    bucket,
    file_path,
    article_title,
    status,
    content_size,
    updated_by,
    updated_by_email,
    created_at,
    metadata
  ) VALUES (
    'assistant-oriontn-doc',
    'OrionTN pos.md',
    'Sincronização Manual da Base Orion TN',
    'synced',
    v_content_size,
    auth.uid(),
    v_user_email,
    now(),
    jsonb_build_object(
      'version_id', v_version_id,
      'version_number', v_next_version_num,
      'version_tag', v_version_tag,
      'manual_sync', true,
      'storage_updated_at', v_storage_updated_at
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'version_id', v_version_id,
    'version_number', v_next_version_num,
    'version_tag', v_version_tag,
    'content_size', v_content_size,
    'backup_file_path', v_backup_file_path,
    'storage_updated_at', v_storage_updated_at,
    'synced_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_manual_knowledge_version TO authenticated, service_role;
