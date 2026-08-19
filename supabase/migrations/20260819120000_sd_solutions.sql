-- Integra o módulo SD / Soluções ao HUB.
-- As tabelas recebem prefixo sd_ para evitar colisões com domínios existentes.

CREATE TABLE IF NOT EXISTS public.sd_sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 2 AND 100),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sd_sistemas_nome_unique
  ON public.sd_sistemas (lower(trim(nome)));

CREATE TABLE IF NOT EXISTS public.sd_rotinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 2 AND 120),
  sistema_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sd_rotinas_sistema_id_fkey
    FOREIGN KEY (sistema_id) REFERENCES public.sd_sistemas(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS sd_rotinas_sistema_nome_unique
  ON public.sd_rotinas (sistema_id, lower(trim(nome)));

CREATE TABLE IF NOT EXISTS public.sd_solucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (char_length(trim(titulo)) BETWEEN 2 AND 180),
  descricao text,
  sistema_id uuid NOT NULL,
  rotina_id uuid,
  palavras_chave text[] NOT NULL DEFAULT '{}'::text[],
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  atualizado_por uuid DEFAULT auth.uid(),
  CONSTRAINT sd_solucoes_sistema_id_fkey
    FOREIGN KEY (sistema_id) REFERENCES public.sd_sistemas(id) ON DELETE RESTRICT,
  CONSTRAINT sd_solucoes_rotina_id_fkey
    FOREIGN KEY (rotina_id) REFERENCES public.sd_rotinas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS sd_solucoes_sistema_idx
  ON public.sd_solucoes (sistema_id);
CREATE INDEX IF NOT EXISTS sd_solucoes_rotina_idx
  ON public.sd_solucoes (rotina_id);
CREATE INDEX IF NOT EXISTS sd_solucoes_atualizado_idx
  ON public.sd_solucoes (atualizado_em DESC);
CREATE INDEX IF NOT EXISTS sd_solucoes_palavras_chave_idx
  ON public.sd_solucoes USING gin (palavras_chave);

CREATE OR REPLACE FUNCTION public.set_sd_solucao_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  NEW.atualizado_por = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sd_solucao_audit_fields ON public.sd_solucoes;
CREATE TRIGGER set_sd_solucao_audit_fields
  BEFORE UPDATE ON public.sd_solucoes
  FOR EACH ROW EXECUTE FUNCTION public.set_sd_solucao_audit_fields();

ALTER TABLE public.sd_sistemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sd_rotinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sd_solucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View SD systems" ON public.sd_sistemas;
CREATE POLICY "View SD systems"
  ON public.sd_sistemas FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'view'));

DROP POLICY IF EXISTS "Manage SD systems insert" ON public.sd_sistemas;
CREATE POLICY "Manage SD systems insert"
  ON public.sd_sistemas FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

DROP POLICY IF EXISTS "Manage SD systems update" ON public.sd_sistemas;
CREATE POLICY "Manage SD systems update"
  ON public.sd_sistemas FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

DROP POLICY IF EXISTS "Manage SD systems delete" ON public.sd_sistemas;
CREATE POLICY "Manage SD systems delete"
  ON public.sd_sistemas FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

DROP POLICY IF EXISTS "View SD routines" ON public.sd_rotinas;
CREATE POLICY "View SD routines"
  ON public.sd_rotinas FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'view'));

DROP POLICY IF EXISTS "Manage SD routines insert" ON public.sd_rotinas;
CREATE POLICY "Manage SD routines insert"
  ON public.sd_rotinas FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

DROP POLICY IF EXISTS "Manage SD routines update" ON public.sd_rotinas;
CREATE POLICY "Manage SD routines update"
  ON public.sd_rotinas FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

DROP POLICY IF EXISTS "Manage SD routines delete" ON public.sd_rotinas;
CREATE POLICY "Manage SD routines delete"
  ON public.sd_rotinas FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

DROP POLICY IF EXISTS "View SD solutions" ON public.sd_solucoes;
CREATE POLICY "View SD solutions"
  ON public.sd_solucoes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'view'));

DROP POLICY IF EXISTS "Create SD solutions" ON public.sd_solucoes;
CREATE POLICY "Create SD solutions"
  ON public.sd_solucoes FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'sd_solutions', 'create'));

DROP POLICY IF EXISTS "Edit SD solutions" ON public.sd_solucoes;
CREATE POLICY "Edit SD solutions"
  ON public.sd_solucoes FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'sd_solutions', 'edit'));

DROP POLICY IF EXISTS "Delete SD solutions" ON public.sd_solucoes;
CREATE POLICY "Delete SD solutions"
  ON public.sd_solucoes FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sd_sistemas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sd_rotinas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sd_solucoes TO authenticated;

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('menu_sd', 'view', 'Visualizar o menu SD'),
  ('sd_solutions', 'view', 'Visualizar a base de soluções do SD'),
  ('sd_solutions', 'create', 'Cadastrar soluções do SD'),
  ('sd_solutions', 'edit', 'Editar soluções do SD'),
  ('sd_solutions', 'delete', 'Excluir soluções do SD'),
  ('sd_solutions', 'manage', 'Gerenciar sistemas e rotinas do SD')
ON CONFLICT (resource, action) DO UPDATE
  SET description = EXCLUDED.description;

-- Administradores recebem todas as ações do módulo.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
CROSS JOIN public.app_permissions permission
WHERE role.name = 'admin'
  AND permission.resource IN ('menu_sd', 'sd_solutions')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Perfis que já acessam o dashboard recebem leitura do novo módulo.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT current_permission.role_id, new_permission.id
FROM public.app_role_permissions current_permission
JOIN public.app_permissions current_definition
  ON current_definition.id = current_permission.permission_id
 AND current_definition.resource = 'dashboard_view'
 AND current_definition.action = 'view'
JOIN public.app_permissions new_permission
  ON (new_permission.resource = 'menu_sd' AND new_permission.action = 'view')
  OR (new_permission.resource = 'sd_solutions' AND new_permission.action = 'view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Mantém para o SD a mesma granularidade de escrita já configurada em Projetos.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT DISTINCT current_permission.role_id, new_permission.id
FROM public.app_role_permissions current_permission
JOIN public.app_permissions current_definition
  ON current_definition.id = current_permission.permission_id
 AND current_definition.resource = 'projects'
JOIN public.app_permissions new_permission
  ON new_permission.resource = 'sd_solutions'
 AND new_permission.action = current_definition.action
WHERE current_definition.action IN ('create', 'edit', 'delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.sd_sistemas (nome) VALUES
  ('DevOps'),
  ('SiplanTN'),
  ('SiplanRC'),
  ('SiplanPRO'),
  ('NFS-e'),
  ('Global Notas'),
  ('Global Protesto')
ON CONFLICT DO NOTHING;
