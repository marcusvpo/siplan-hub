-- Migration: Função RPC para atualizar status de sincronização da versão da base de conhecimento
-- Usada pelo n8n ao concluir com sucesso ou erro

CREATE OR REPLACE FUNCTION public.update_knowledge_version_sync_status(
  p_version_id uuid,
  p_status text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assistant_knowledge_versions
  SET webhook_sync_status = p_status,
      metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata
  WHERE id = p_version_id;

  -- Atualizar também o log correspondente se existir
  UPDATE public.assistant_knowledge_sync_logs
  SET status = p_status,
      metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata,
      updated_at = now()
  WHERE (metadata->>'version_id')::uuid = p_version_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_knowledge_version_sync_status TO authenticated, anon, service_role;

-- Ajustar valor padrão para 'syncing' quando uma versão é criada
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

  -- Inserir registro de versão com status inicial 'syncing'
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
    'syncing',
    p_is_restoration,
    p_restored_from_version_id,
    p_metadata
  ) RETURNING id INTO v_version_id;

  -- Registrar também na tabela de logs de sincronização para histórico
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
    'syncing',
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

  RETURN v_version_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_knowledge_version TO authenticated;
