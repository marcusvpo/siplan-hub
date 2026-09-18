-- Adiciona tabela de configurações e controle de manutenção da Central de Atualizações Orion

CREATE TABLE IF NOT EXISTS public.orion_update_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_enabled BOOLEAN NOT NULL DEFAULT true,
  maintenance_title VARCHAR(200) NOT NULL DEFAULT 'Estamos em manutenção',
  maintenance_message TEXT NOT NULL DEFAULT 'A Central de Atualizações Orion está passando por melhorias no momento. Voltaremos em breve.',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.orion_update_settings (id, public_enabled, maintenance_title, maintenance_message)
VALUES (1, true, 'Estamos em manutenção', 'A Central de Atualizações Orion está passando por melhorias no momento. Voltaremos em breve.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.orion_update_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orion_update_settings_public_select" ON public.orion_update_settings;
CREATE POLICY "orion_update_settings_public_select"
  ON public.orion_update_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "orion_update_settings_admin_update" ON public.orion_update_settings;
CREATE POLICY "orion_update_settings_admin_update"
  ON public.orion_update_settings
  FOR UPDATE
  USING (public.has_permission(auth.uid(), 'orion_updates_management', 'edit'));

CREATE OR REPLACE FUNCTION public.orion_updates_get_settings()
RETURNS TABLE (
  public_enabled BOOLEAN,
  maintenance_title VARCHAR(200),
  maintenance_message TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public_enabled, maintenance_title, maintenance_message, updated_at
  FROM public.orion_update_settings
  WHERE id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.orion_updates_get_settings() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.orion_updates_update_settings(
  p_public_enabled BOOLEAN,
  p_maintenance_title TEXT DEFAULT NULL,
  p_maintenance_message TEXT DEFAULT NULL
)
RETURNS TABLE (
  public_enabled BOOLEAN,
  maintenance_title VARCHAR(200),
  maintenance_message TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'edit') THEN
    RAISE EXCEPTION 'Acesso negado. Seu perfil não pode alterar as configurações da Central de Atualizações.';
  END IF;

  UPDATE public.orion_update_settings
  SET
    public_enabled = p_public_enabled,
    maintenance_title = COALESCE(NULLIF(btrim(p_maintenance_title), ''), 'Estamos em manutenção'),
    maintenance_message = COALESCE(NULLIF(btrim(p_maintenance_message), ''), 'A Central de Atualizações Orion está passando por melhorias no momento. Voltaremos em breve.'),
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = 1;

  RETURN QUERY
  SELECT s.public_enabled, s.maintenance_title, s.maintenance_message, s.updated_at
  FROM public.orion_update_settings s
  WHERE s.id = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.orion_updates_update_settings(BOOLEAN, TEXT, TEXT) TO authenticated;

-- Notificação de changelog
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
  'release_feature',
  'orion_updates_management',
  'Controle do Link Público da Central de Atualizações',
  'Adicionado controle na tela de Gestão para ativar ou desativar o link público da Central de Atualizações Orion com suporte a mensagem de manutenção.',
  '/atualizacoes/gestao'
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_feature'
    AND permission_resource = 'orion_updates_management'
    AND action_url = '/atualizacoes/gestao'
);

NOTIFY pgrst, 'reload schema';
