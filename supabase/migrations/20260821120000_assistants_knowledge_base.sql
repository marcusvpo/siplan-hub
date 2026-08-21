-- Migration: Assistants Knowledge Base & OpenAI Vector Store Sync
-- Módulo de Assistentes - Base de Conhecimento Orion TN

-- 1. Tabela de logs de sincronização da base de conhecimento
CREATE TABLE IF NOT EXISTS public.assistant_knowledge_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL DEFAULT 'assistant-oriontn-doc',
  file_path text NOT NULL DEFAULT 'OrionTN pos.md',
  article_id text,
  article_title text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_email text,
  status text NOT NULL DEFAULT 'synced' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  content_size integer,
  webhook_status integer,
  webhook_response jsonb,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta para histórico e auditoria
CREATE INDEX IF NOT EXISTS assistant_knowledge_sync_logs_created_at_idx
  ON public.assistant_knowledge_sync_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS assistant_knowledge_sync_logs_article_idx
  ON public.assistant_knowledge_sync_logs (article_id);

-- 2. Habilitar RLS na tabela de logs
ALTER TABLE public.assistant_knowledge_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View assistant knowledge sync logs" ON public.assistant_knowledge_sync_logs;
CREATE POLICY "View assistant knowledge sync logs"
  ON public.assistant_knowledge_sync_logs FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'assistants_knowledge', 'view') OR
    public.has_permission(auth.uid(), 'copilot_admin', 'view')
  );

DROP POLICY IF EXISTS "Insert assistant knowledge sync logs" ON public.assistant_knowledge_sync_logs;
CREATE POLICY "Insert assistant knowledge sync logs"
  ON public.assistant_knowledge_sync_logs FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'assistants_knowledge', 'edit') OR
    public.has_permission(auth.uid(), 'assistants_knowledge', 'manage')
  );

GRANT SELECT, INSERT ON public.assistant_knowledge_sync_logs TO authenticated;

-- 3. Políticas de Storage para o bucket 'assistant-oriontn-doc'
DROP POLICY IF EXISTS "Allow authenticated read to assistant-oriontn-doc" ON storage.objects;
CREATE POLICY "Allow authenticated read to assistant-oriontn-doc"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assistant-oriontn-doc');

DROP POLICY IF EXISTS "Allow public read to assistant-oriontn-doc" ON storage.objects;
CREATE POLICY "Allow public read to assistant-oriontn-doc"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'assistant-oriontn-doc');

DROP POLICY IF EXISTS "Allow authenticated insert to assistant-oriontn-doc" ON storage.objects;
CREATE POLICY "Allow authenticated insert to assistant-oriontn-doc"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assistant-oriontn-doc' AND (
      public.has_permission(auth.uid(), 'assistants_knowledge', 'edit') OR
      public.has_permission(auth.uid(), 'assistants_knowledge', 'manage')
    )
  );

DROP POLICY IF EXISTS "Allow authenticated update to assistant-oriontn-doc" ON storage.objects;
CREATE POLICY "Allow authenticated update to assistant-oriontn-doc"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assistant-oriontn-doc' AND (
      public.has_permission(auth.uid(), 'assistants_knowledge', 'edit') OR
      public.has_permission(auth.uid(), 'assistants_knowledge', 'manage')
    )
  )
  WITH CHECK (
    bucket_id = 'assistant-oriontn-doc' AND (
      public.has_permission(auth.uid(), 'assistants_knowledge', 'edit') OR
      public.has_permission(auth.uid(), 'assistants_knowledge', 'manage')
    )
  );

-- 4. Cadastrar Permissões do Módulo no RBAC
INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('menu_assistentes', 'view', 'Visualizar o menu Assistentes'),
  ('assistants_knowledge', 'view', 'Visualizar a base de conhecimento de assistentes'),
  ('assistants_knowledge', 'edit', 'Editar e salvar tutoriais na base de conhecimento'),
  ('assistants_knowledge', 'manage', 'Gerenciamento total e sincronização forçada de assistentes')
ON CONFLICT (resource, action) DO UPDATE
  SET description = EXCLUDED.description;

-- Atribuir permissões completas ao perfil admin
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
CROSS JOIN public.app_permissions permission
WHERE role.name = 'admin'
  AND permission.resource IN ('menu_assistentes', 'assistants_knowledge')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Perfis com acesso a dashboard recebem visualização do menu de assistentes
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT current_permission.role_id, new_permission.id
FROM public.app_role_permissions current_permission
JOIN public.app_permissions current_definition
  ON current_definition.id = current_permission.permission_id
 AND current_definition.resource = 'dashboard_view'
 AND current_definition.action = 'view'
JOIN public.app_permissions new_permission
  ON (new_permission.resource = 'menu_assistentes' AND new_permission.action = 'view')
  OR (new_permission.resource = 'assistants_knowledge' AND new_permission.action = 'view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Perfis com permissão de edição em SD ou Projetos recebem permissão de edição no conhecimento
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT current_permission.role_id, new_permission.id
FROM public.app_role_permissions current_permission
JOIN public.app_permissions current_definition
  ON current_definition.id = current_permission.permission_id
 AND (current_definition.resource = 'sd_solutions' OR current_definition.resource = 'projects')
 AND current_definition.action = 'edit'
JOIN public.app_permissions new_permission
  ON new_permission.resource = 'assistants_knowledge'
 AND new_permission.action = 'edit'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Configuração padrão do webhook n8n em settings
INSERT INTO public.settings (key, value, description, updated_at)
VALUES (
  'n8n_openai_vector_webhook',
  '{"url": "https://n8n.siplancontrol-m.com.br/webhook/update-openai-vector-store", "enabled": true, "auth_header": "x-webhook-token"}'::jsonb,
  'Configuração do webhook n8n para sincronização com OpenAI Vector Store',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- 6. Função RPC para registrar log e disparar webhook
CREATE OR REPLACE FUNCTION public.log_and_trigger_knowledge_sync(
  p_article_id text DEFAULT NULL,
  p_article_title text DEFAULT NULL,
  p_content_size integer DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_user_email text;
  v_webhook_url text;
  v_webhook_setting jsonb;
BEGIN
  -- Obter email do usuário autenticado
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  -- Criar registro de log
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
    p_content_size,
    p_metadata
  ) RETURNING id INTO v_log_id;

  -- Buscar URL de webhook configurada
  SELECT value INTO v_webhook_setting FROM public.settings WHERE key = 'n8n_openai_vector_webhook';
  IF v_webhook_setting IS NOT NULL AND (v_webhook_setting->>'enabled')::boolean = true THEN
    v_webhook_url := v_webhook_setting->>'url';
    IF v_webhook_url IS NOT NULL AND v_webhook_url <> '' THEN
      -- Disparo assíncrono via pg_net se disponível
      BEGIN
        PERFORM net.http_post(
          url := v_webhook_url,
          body := json_build_object(
            'bucket', 'assistant-oriontn-doc',
            'file_path', 'OrionTN pos.md',
            'article_id', p_article_id,
            'article_title', p_article_title,
            'updated_by', v_user_email,
            'updated_at', now()::text,
            'log_id', v_log_id
          )::jsonb,
          headers := json_build_object(
            'Content-Type', 'application/json'
          )::jsonb,
          timeout_milliseconds := 5000
        );
      EXCEPTION WHEN OTHERS THEN
        -- Não impede o salvamento caso a extensão pg_net falhe na chamada assíncrona
        UPDATE public.assistant_knowledge_sync_logs
        SET error_message = SQLERRM
        WHERE id = v_log_id;
      END;
    END IF;
  END IF;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_and_trigger_knowledge_sync TO authenticated;
