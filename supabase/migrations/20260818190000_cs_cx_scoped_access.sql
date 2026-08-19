-- Isola a administração de usuários e perfis do módulo CS/CX.
-- O perfil global do HUB continua independente e não pode ser alterado por estas rotinas.

CREATE TABLE IF NOT EXISTS public.cs_cx_access_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_cx_access_profile_permissions (
  access_profile_id UUID NOT NULL
    REFERENCES public.cs_cx_access_profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL
    REFERENCES public.app_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (access_profile_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.cs_cx_user_access (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_profile_id UUID NOT NULL
    REFERENCES public.cs_cx_access_profiles(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_access_profile_permissions_permission
  ON public.cs_cx_access_profile_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_cs_cx_user_access_profile
  ON public.cs_cx_user_access(access_profile_id);

ALTER TABLE public.cs_cx_access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_access_profile_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_user_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.cs_cx_validate_scoped_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.app_permissions permission
    WHERE permission.id = NEW.permission_id
      AND (
        permission.resource = 'menu_cs_cx'
        OR permission.resource LIKE 'cs\_cx\_%' ESCAPE '\'
      )
  ) THEN
    RAISE EXCEPTION 'A permissão informada não pertence ao módulo CS/CX.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_cs_cx_scoped_permission
  ON public.cs_cx_access_profile_permissions;
CREATE TRIGGER validate_cs_cx_scoped_permission
  BEFORE INSERT OR UPDATE OF permission_id
  ON public.cs_cx_access_profile_permissions
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_validate_scoped_permission();

-- Preserva o acesso atual do perfil global CS/CX antes de desacoplá-lo do HUB.
INSERT INTO public.cs_cx_access_profiles (name, description, active)
VALUES
  ('Administrador CS/CX', 'Acesso completo às telas e configurações do módulo CS/CX.', true),
  ('Operacional CS/CX', 'Acesso operacional ao CS/CX, sem administrar usuários e perfis.', true)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    active = true,
    updated_at = now();

INSERT INTO public.cs_cx_access_profile_permissions (access_profile_id, permission_id)
SELECT access_profile.id, permission.id
FROM public.cs_cx_access_profiles access_profile
CROSS JOIN public.app_permissions permission
WHERE access_profile.name = 'Administrador CS/CX'
  AND (
    permission.resource = 'menu_cs_cx'
    OR permission.resource LIKE 'cs\_cx\_%' ESCAPE '\'
  )
ON CONFLICT (access_profile_id, permission_id) DO NOTHING;

INSERT INTO public.cs_cx_access_profile_permissions (access_profile_id, permission_id)
SELECT access_profile.id, permission.id
FROM public.cs_cx_access_profiles access_profile
CROSS JOIN public.app_permissions permission
WHERE access_profile.name = 'Operacional CS/CX'
  AND (
    permission.resource = 'menu_cs_cx'
    OR permission.resource LIKE 'cs\_cx\_%' ESCAPE '\'
  )
  AND NOT (permission.resource = 'cs_cx_admin' AND permission.action = 'manage')
ON CONFLICT (access_profile_id, permission_id) DO NOTHING;

INSERT INTO public.cs_cx_user_access (user_id, access_profile_id, active)
SELECT profile.id, access_profile.id, true
FROM public.profiles profile
CROSS JOIN public.cs_cx_access_profiles access_profile
WHERE profile.role = 'CS/CX'
  AND access_profile.name = 'Administrador CS/CX'
ON CONFLICT (user_id) DO NOTHING;

-- Mantém no grupo os administradores do HUB explicitamente vinculados ao legado.
INSERT INTO public.cs_cx_user_access (user_id, access_profile_id, active)
SELECT profile.id, access_profile.id, true
FROM public.cs_cx_user_map legacy_user
JOIN public.profiles profile ON profile.id = legacy_user.profile_id
CROSS JOIN public.cs_cx_access_profiles access_profile
WHERE legacy_user.source_present
  AND legacy_user.active
  AND NOT legacy_user.mapping_ignored
  AND profile.role = 'admin'
  AND access_profile.name = 'Administrador CS/CX'
ON CONFLICT (user_id) DO NOTHING;

-- O perfil global CS/CX deixa de carregar permissões do módulo. A partir daqui,
-- elas são concedidas exclusivamente por cs_cx_user_access.
DELETE FROM public.app_role_permissions role_permission
USING public.app_roles role, public.app_permissions permission
WHERE role_permission.role_id = role.id
  AND role_permission.permission_id = permission.id
  AND role.name = 'CS/CX'
  AND (
    permission.resource = 'menu_cs_cx'
    OR permission.resource LIKE 'cs\_cx\_%' ESCAPE '\'
  );

CREATE OR REPLACE FUNCTION public.has_permission(
  user_id UUID,
  req_resource TEXT,
  req_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT profile.role INTO user_role
  FROM public.profiles profile
  WHERE profile.id = user_id;

  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_role_permissions role_permission
    JOIN public.app_roles role ON role.id = role_permission.role_id
    JOIN public.app_permissions permission
      ON permission.id = role_permission.permission_id
    WHERE role.name = user_role
      AND permission.resource = req_resource
      AND permission.action = req_action
  ) THEN
    RETURN true;
  END IF;

  IF req_resource = 'menu_cs_cx'
     OR req_resource LIKE 'cs\_cx\_%' ESCAPE '\' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.cs_cx_user_access user_access
      JOIN public.cs_cx_access_profiles access_profile
        ON access_profile.id = user_access.access_profile_id
      JOIN public.cs_cx_access_profile_permissions profile_permission
        ON profile_permission.access_profile_id = access_profile.id
      JOIN public.app_permissions permission
        ON permission.id = profile_permission.permission_id
      WHERE user_access.user_id = has_permission.user_id
        AND user_access.active
        AND access_profile.active
        AND permission.resource = req_resource
        AND permission.action = req_action
    );
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS cs_cx_access_profiles_read ON public.cs_cx_access_profiles;
CREATE POLICY cs_cx_access_profiles_read
  ON public.cs_cx_access_profiles FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'cs_cx_admin', 'view')
    OR EXISTS (
      SELECT 1 FROM public.cs_cx_user_access own_access
      WHERE own_access.user_id = auth.uid()
        AND own_access.access_profile_id = cs_cx_access_profiles.id
        AND own_access.active
    )
  );

DROP POLICY IF EXISTS cs_cx_access_profile_permissions_read
  ON public.cs_cx_access_profile_permissions;
CREATE POLICY cs_cx_access_profile_permissions_read
  ON public.cs_cx_access_profile_permissions FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'cs_cx_admin', 'view')
    OR EXISTS (
      SELECT 1 FROM public.cs_cx_user_access own_access
      WHERE own_access.user_id = auth.uid()
        AND own_access.access_profile_id = cs_cx_access_profile_permissions.access_profile_id
        AND own_access.active
    )
  );

DROP POLICY IF EXISTS cs_cx_user_access_read ON public.cs_cx_user_access;
CREATE POLICY cs_cx_user_access_read
  ON public.cs_cx_user_access FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_permission(auth.uid(), 'cs_cx_admin', 'view')
  );

REVOKE INSERT, UPDATE, DELETE ON public.cs_cx_access_profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cs_cx_access_profile_permissions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cs_cx_user_access FROM authenticated;

CREATE OR REPLACE FUNCTION public.cs_cx_get_my_permissions()
RETURNS TABLE(resource TEXT, action TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT permission.resource, permission.action
  FROM public.cs_cx_user_access user_access
  JOIN public.cs_cx_access_profiles access_profile
    ON access_profile.id = user_access.access_profile_id
  JOIN public.cs_cx_access_profile_permissions profile_permission
    ON profile_permission.access_profile_id = access_profile.id
  JOIN public.app_permissions permission
    ON permission.id = profile_permission.permission_id
  WHERE user_access.user_id = auth.uid()
    AND user_access.active
    AND access_profile.active;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_list_access_users()
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  global_role TEXT,
  access_profile_id UUID,
  access_profile_name TEXT,
  active BOOLEAN,
  is_hub_admin BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'view') THEN
    RAISE EXCEPTION 'Sem permissão para visualizar os usuários do CS/CX.';
  END IF;

  RETURN QUERY
  SELECT profile.id, profile.full_name, profile.email, profile.role,
         user_access.access_profile_id, access_profile.name,
         user_access.active, profile.role = 'admin'
  FROM public.cs_cx_user_access user_access
  JOIN public.profiles profile ON profile.id = user_access.user_id
  JOIN public.cs_cx_access_profiles access_profile
    ON access_profile.id = user_access.access_profile_id
  ORDER BY profile.full_name NULLS LAST, profile.email;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_list_access_candidates()
RETURNS TABLE(user_id UUID, full_name TEXT, email TEXT, global_role TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para vincular usuários ao CS/CX.';
  END IF;

  RETURN QUERY
  SELECT profile.id, profile.full_name, profile.email, profile.role
  FROM public.profiles profile
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cs_cx_user_access user_access
    WHERE user_access.user_id = profile.id
  )
  ORDER BY profile.full_name NULLS LAST, profile.email;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_list_access_profiles()
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  active BOOLEAN,
  permission_ids UUID[],
  user_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'view') THEN
    RAISE EXCEPTION 'Sem permissão para visualizar os perfis do CS/CX.';
  END IF;

  RETURN QUERY
  SELECT access_profile.id, access_profile.name, access_profile.description,
         access_profile.active,
         COALESCE(array_agg(DISTINCT profile_permission.permission_id)
           FILTER (WHERE profile_permission.permission_id IS NOT NULL), ARRAY[]::UUID[]),
         count(DISTINCT user_access.user_id)
  FROM public.cs_cx_access_profiles access_profile
  LEFT JOIN public.cs_cx_access_profile_permissions profile_permission
    ON profile_permission.access_profile_id = access_profile.id
  LEFT JOIN public.cs_cx_user_access user_access
    ON user_access.access_profile_id = access_profile.id
  GROUP BY access_profile.id
  ORDER BY access_profile.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_list_module_permissions()
RETURNS TABLE(id UUID, resource TEXT, action TEXT, description TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'view') THEN
    RAISE EXCEPTION 'Sem permissão para visualizar as permissões do CS/CX.';
  END IF;

  RETURN QUERY
  SELECT permission.id, permission.resource, permission.action, permission.description
  FROM public.app_permissions permission
  WHERE permission.resource = 'menu_cs_cx'
     OR permission.resource LIKE 'cs\_cx\_%' ESCAPE '\'
  ORDER BY permission.resource, permission.action;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_save_access_profile(
  p_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_active BOOLEAN,
  p_permission_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved_id UUID;
  invalid_count INTEGER;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar perfis do CS/CX.';
  END IF;
  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o nome do perfil.';
  END IF;

  SELECT count(*)::INTEGER INTO invalid_count
  FROM unnest(COALESCE(p_permission_ids, ARRAY[]::UUID[])) permission_id
  LEFT JOIN public.app_permissions permission ON permission.id = permission_id
  WHERE permission.id IS NULL
     OR NOT (
       permission.resource = 'menu_cs_cx'
       OR permission.resource LIKE 'cs\_cx\_%' ESCAPE '\'
     );
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'O perfil contém permissões fora do módulo CS/CX.';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.cs_cx_access_profiles
      (name, description, active, created_by)
    VALUES (trim(p_name), NULLIF(trim(p_description), ''), p_active, auth.uid())
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.cs_cx_access_profiles
    SET name = trim(p_name),
        description = NULLIF(trim(p_description), ''),
        active = p_active,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO saved_id;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Perfil CS/CX não encontrado.'; END IF;
  END IF;

  DELETE FROM public.cs_cx_access_profile_permissions
  WHERE access_profile_id = saved_id;
  INSERT INTO public.cs_cx_access_profile_permissions
    (access_profile_id, permission_id)
  SELECT saved_id, permission_id
  FROM unnest(COALESCE(p_permission_ids, ARRAY[]::UUID[])) permission_id
  ON CONFLICT (access_profile_id, permission_id) DO NOTHING;

  RETURN saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_delete_access_profile(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar perfis do CS/CX.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cs_cx_user_access user_access
    WHERE user_access.access_profile_id = p_id
  ) THEN
    RAISE EXCEPTION 'O perfil possui usuários vinculados.';
  END IF;
  DELETE FROM public.cs_cx_access_profiles WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_assign_user_access(
  p_user_id UUID,
  p_access_profile_id UUID,
  p_active BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar usuários do CS/CX.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário do HUB não encontrado.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cs_cx_access_profiles
    WHERE id = p_access_profile_id
  ) THEN
    RAISE EXCEPTION 'Perfil CS/CX não encontrado.';
  END IF;

  INSERT INTO public.cs_cx_user_access
    (user_id, access_profile_id, active, assigned_by)
  VALUES (p_user_id, p_access_profile_id, p_active, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
  SET access_profile_id = EXCLUDED.access_profile_id,
      active = EXCLUDED.active,
      assigned_by = auth.uid(),
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_cx_remove_user_access(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'cs_cx_admin', 'manage') THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar usuários do CS/CX.';
  END IF;
  DELETE FROM public.cs_cx_user_access WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_get_my_permissions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_list_access_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_list_access_candidates() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_list_access_profiles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_list_module_permissions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_save_access_profile(UUID, TEXT, TEXT, BOOLEAN, UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_delete_access_profile(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_assign_user_access(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cs_cx_remove_user_access(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.cs_cx_get_my_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_list_access_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_list_access_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_list_access_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_list_module_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_save_access_profile(UUID, TEXT, TEXT, BOOLEAN, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_delete_access_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_assign_user_access(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cs_cx_remove_user_access(UUID) TO authenticated;

COMMENT ON TABLE public.cs_cx_user_access IS
  'Grupo de usuários do CS/CX, independente do perfil global do Siplan HUB.';
COMMENT ON TABLE public.cs_cx_access_profiles IS
  'Perfis de acesso exclusivos do módulo CS/CX.';
