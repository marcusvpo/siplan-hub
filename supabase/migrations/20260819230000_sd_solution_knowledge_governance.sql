-- Governança, versionamento, métricas e segurança da base de soluções do SD.

ALTER TABLE public.sd_solucoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publicado',
  ADD COLUMN IF NOT EXISTS responsavel_id uuid,
  ADD COLUMN IF NOT EXISTS revisado_em timestamptz,
  ADD COLUMN IF NOT EXISTS proxima_revisao_em date,
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS visualizacoes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS votos_uteis bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS votos_nao_uteis bigint NOT NULL DEFAULT 0;

UPDATE public.sd_solucoes
SET revisado_em = COALESCE(revisado_em, atualizado_em, criado_em),
    proxima_revisao_em = COALESCE(
      proxima_revisao_em,
      (COALESCE(revisado_em, atualizado_em, criado_em) + interval '180 days')::date
    );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sd_solucoes_status_check'
      AND conrelid = 'public.sd_solucoes'::regclass
  ) THEN
    ALTER TABLE public.sd_solucoes
      ADD CONSTRAINT sd_solucoes_status_check
      CHECK (status IN ('rascunho', 'publicado', 'desatualizado'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sd_solucoes_responsavel_id_fkey'
      AND conrelid = 'public.sd_solucoes'::regclass
  ) THEN
    ALTER TABLE public.sd_solucoes
      ADD CONSTRAINT sd_solucoes_responsavel_id_fkey
      FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS sd_solucoes_status_idx
  ON public.sd_solucoes (status, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS sd_solucoes_revisao_idx
  ON public.sd_solucoes (proxima_revisao_em);
CREATE INDEX IF NOT EXISTS sd_solucoes_metricas_idx
  ON public.sd_solucoes (visualizacoes DESC, votos_uteis DESC);

CREATE TABLE IF NOT EXISTS public.sd_solucao_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solucao_id uuid NOT NULL REFERENCES public.sd_solucoes(id) ON DELETE CASCADE,
  versao integer NOT NULL CHECK (versao > 0),
  titulo text NOT NULL,
  descricao text,
  sistema_id uuid NOT NULL,
  rotina_id uuid,
  palavras_chave text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL CHECK (status IN ('rascunho', 'publicado', 'desatualizado')),
  responsavel_id uuid,
  revisado_em timestamptz,
  proxima_revisao_em date,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (solucao_id, versao)
);

CREATE INDEX IF NOT EXISTS sd_solucao_versoes_solucao_idx
  ON public.sd_solucao_versoes (solucao_id, versao DESC);

CREATE OR REPLACE FUNCTION public.set_sd_solucao_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF ROW(
    OLD.titulo, OLD.descricao, OLD.sistema_id, OLD.rotina_id,
    OLD.palavras_chave, OLD.status, OLD.responsavel_id,
    OLD.revisado_em, OLD.proxima_revisao_em
  ) IS DISTINCT FROM ROW(
    NEW.titulo, NEW.descricao, NEW.sistema_id, NEW.rotina_id,
    NEW.palavras_chave, NEW.status, NEW.responsavel_id,
    NEW.revisado_em, NEW.proxima_revisao_em
  ) THEN
    NEW.atualizado_em = now();
    NEW.atualizado_por = auth.uid();
    NEW.versao = OLD.versao + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_sd_solution_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.versao IS DISTINCT FROM OLD.versao THEN
    INSERT INTO public.sd_solucao_versoes (
      solucao_id, versao, titulo, descricao, sistema_id, rotina_id,
      palavras_chave, status, responsavel_id, revisado_em,
      proxima_revisao_em, criado_em, criado_por
    ) VALUES (
      NEW.id, NEW.versao, NEW.titulo, NEW.descricao, NEW.sistema_id,
      NEW.rotina_id, NEW.palavras_chave, NEW.status, NEW.responsavel_id,
      NEW.revisado_em, NEW.proxima_revisao_em,
      COALESCE(NEW.atualizado_em, NEW.criado_em),
      COALESCE(NEW.atualizado_por, NEW.criado_por, auth.uid())
    )
    ON CONFLICT (solucao_id, versao) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS save_sd_solution_version ON public.sd_solucoes;
CREATE TRIGGER save_sd_solution_version
  AFTER INSERT OR UPDATE ON public.sd_solucoes
  FOR EACH ROW EXECUTE FUNCTION public.save_sd_solution_version();

INSERT INTO public.sd_solucao_versoes (
  solucao_id, versao, titulo, descricao, sistema_id, rotina_id,
  palavras_chave, status, responsavel_id, revisado_em,
  proxima_revisao_em, criado_em, criado_por
)
SELECT id, versao, titulo, descricao, sistema_id, rotina_id,
  palavras_chave, status, responsavel_id, revisado_em,
  proxima_revisao_em, COALESCE(atualizado_em, criado_em),
  COALESCE(atualizado_por, criado_por)
FROM public.sd_solucoes
ON CONFLICT (solucao_id, versao) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sd_solucao_visualizacoes (
  solucao_id uuid NOT NULL REFERENCES public.sd_solucoes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dia date NOT NULL DEFAULT current_date,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (solucao_id, usuario_id, dia)
);

CREATE TABLE IF NOT EXISTS public.sd_solucao_feedback (
  solucao_id uuid NOT NULL REFERENCES public.sd_solucoes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  util boolean NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (solucao_id, usuario_id)
);

CREATE OR REPLACE FUNCTION public.refresh_sd_solution_feedback_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_solution_id uuid := COALESCE(NEW.solucao_id, OLD.solucao_id);
BEGIN
  UPDATE public.sd_solucoes solution
  SET votos_uteis = (
        SELECT count(*) FROM public.sd_solucao_feedback
        WHERE solucao_id = target_solution_id AND util
      ),
      votos_nao_uteis = (
        SELECT count(*) FROM public.sd_solucao_feedback
        WHERE solucao_id = target_solution_id AND NOT util
      )
  WHERE solution.id = target_solution_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_sd_solution_feedback_counts
  ON public.sd_solucao_feedback;
CREATE TRIGGER refresh_sd_solution_feedback_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.sd_solucao_feedback
  FOR EACH ROW EXECUTE FUNCTION public.refresh_sd_solution_feedback_counts();

CREATE OR REPLACE FUNCTION public.set_sd_solution_feedback_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sd_solution_feedback_updated_at
  ON public.sd_solucao_feedback;
CREATE TRIGGER set_sd_solution_feedback_updated_at
  BEFORE UPDATE ON public.sd_solucao_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_sd_solution_feedback_updated_at();

CREATE OR REPLACE FUNCTION public.register_sd_solution_view(target_solution_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_rows integer;
  total_views bigint;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'sd_solutions', 'view') THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  INSERT INTO public.sd_solucao_visualizacoes (solucao_id, usuario_id)
  VALUES (target_solution_id, auth.uid())
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  IF inserted_rows > 0 THEN
    UPDATE public.sd_solucoes
    SET visualizacoes = visualizacoes + 1
    WHERE id = target_solution_id;
  END IF;

  SELECT visualizacoes INTO total_views
  FROM public.sd_solucoes WHERE id = target_solution_id;
  RETURN COALESCE(total_views, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_sd_solution_version(target_version_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot public.sd_solucao_versoes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_permission(auth.uid(), 'sd_solutions', 'edit') THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT * INTO snapshot
  FROM public.sd_solucao_versoes
  WHERE id = target_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versão não encontrada.'; END IF;

  UPDATE public.sd_solucoes
  SET titulo = snapshot.titulo,
      descricao = snapshot.descricao,
      sistema_id = snapshot.sistema_id,
      rotina_id = snapshot.rotina_id,
      palavras_chave = snapshot.palavras_chave,
      status = snapshot.status,
      responsavel_id = snapshot.responsavel_id,
      revisado_em = snapshot.revisado_em,
      proxima_revisao_em = snapshot.proxima_revisao_em
  WHERE id = snapshot.solucao_id;
  RETURN snapshot.solucao_id;
END;
$$;

ALTER TABLE public.sd_solucao_anexos
  ADD COLUMN IF NOT EXISTS verificacao_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS verificacao_metodo text,
  ADD COLUMN IF NOT EXISTS verificacao_detalhes text,
  ADD COLUMN IF NOT EXISTS verificado_em timestamptz;

UPDATE public.sd_solucao_anexos
SET verificacao_status = 'seguro',
    verificacao_metodo = COALESCE(verificacao_metodo, 'legado'),
    verificacao_detalhes = COALESCE(verificacao_detalhes, 'Anexo anterior à verificação automática.'),
    verificado_em = COALESCE(verificado_em, criado_em)
WHERE verificacao_status = 'pendente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sd_solucao_anexos_verificacao_status_check'
      AND conrelid = 'public.sd_solucao_anexos'::regclass
  ) THEN
    ALTER TABLE public.sd_solucao_anexos
      ADD CONSTRAINT sd_solucao_anexos_verificacao_status_check
      CHECK (verificacao_status IN ('pendente', 'seguro', 'suspeito', 'erro'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_sd_attachment_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  extension text := lower(substring(NEW.nome_arquivo from '\.([^.]*)$'));
  normalized_mime text := lower(COALESCE(NEW.tipo_mime, ''));
BEGIN
  IF extension = ANY (ARRAY[
    'bat','cmd','com','exe','hta','msi','msix','ps1','scr','vbe','vbs','wsf','wsh'
  ]) THEN
    RAISE EXCEPTION 'Formato de anexo não permitido por segurança.';
  END IF;

  IF normalized_mime = ANY (ARRAY[
    'application/x-msdownload', 'application/x-msdos-program',
    'application/x-msi', 'application/x-dosexec'
  ]) THEN
    RAISE EXCEPTION 'Tipo de anexo não permitido por segurança.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_sd_attachment_metadata
  ON public.sd_solucao_anexos;
CREATE TRIGGER validate_sd_attachment_metadata
  BEFORE INSERT OR UPDATE OF nome_arquivo, tipo_mime ON public.sd_solucao_anexos
  FOR EACH ROW EXECUTE FUNCTION public.validate_sd_attachment_metadata();

ALTER TABLE public.sd_solucao_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sd_solucao_visualizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sd_solucao_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View SD solutions" ON public.sd_solucoes;
CREATE POLICY "View SD solutions"
  ON public.sd_solucoes FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'sd_solutions', 'view')
    AND (
      status = 'publicado'
      OR criado_por = auth.uid()
      OR public.has_permission(auth.uid(), 'sd_solutions', 'edit')
    )
  );

DROP POLICY IF EXISTS "View SD solution versions" ON public.sd_solucao_versoes;
CREATE POLICY "View SD solution versions"
  ON public.sd_solucao_versoes FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'sd_solutions', 'view')
    AND EXISTS (
      SELECT 1
      FROM public.sd_solucoes solution
      WHERE solution.id = sd_solucao_versoes.solucao_id
        AND (
          solution.status = 'publicado'
          OR solution.criado_por = auth.uid()
          OR public.has_permission(auth.uid(), 'sd_solutions', 'edit')
        )
    )
  );

DROP POLICY IF EXISTS "View own SD feedback" ON public.sd_solucao_feedback;
CREATE POLICY "View own SD feedback"
  ON public.sd_solucao_feedback FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    AND public.has_permission(auth.uid(), 'sd_solutions', 'view')
  );
DROP POLICY IF EXISTS "Create own SD feedback" ON public.sd_solucao_feedback;
CREATE POLICY "Create own SD feedback"
  ON public.sd_solucao_feedback FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND public.has_permission(auth.uid(), 'sd_solutions', 'view')
  );
DROP POLICY IF EXISTS "Update own SD feedback" ON public.sd_solucao_feedback;
CREATE POLICY "Update own SD feedback"
  ON public.sd_solucao_feedback FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
DROP POLICY IF EXISTS "Delete own SD feedback" ON public.sd_solucao_feedback;
CREATE POLICY "Delete own SD feedback"
  ON public.sd_solucao_feedback FOR DELETE TO authenticated
  USING (usuario_id = auth.uid());

GRANT SELECT ON public.sd_solucao_versoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sd_solucao_feedback TO authenticated;
REVOKE ALL ON FUNCTION public.register_sd_solution_view(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_sd_solution_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_sd_solution_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_sd_solution_version(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
