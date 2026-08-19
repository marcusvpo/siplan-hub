-- Anexos privados para apoiar os procedimentos da base de soluções do SD.

CREATE TABLE IF NOT EXISTS public.sd_solucao_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solucao_id uuid NOT NULL,
  nome_arquivo text NOT NULL CHECK (char_length(trim(nome_arquivo)) BETWEEN 1 AND 255),
  caminho_storage text NOT NULL UNIQUE,
  tipo_mime text,
  tamanho_bytes bigint NOT NULL CHECK (tamanho_bytes > 0 AND tamanho_bytes <= 20971520),
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  CONSTRAINT sd_solucao_anexos_solucao_id_fkey
    FOREIGN KEY (solucao_id) REFERENCES public.sd_solucoes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sd_solucao_anexos_solucao_idx
  ON public.sd_solucao_anexos (solucao_id, criado_em);

CREATE OR REPLACE FUNCTION public.enforce_sd_solution_attachment_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.sd_solucoes WHERE id = NEW.solucao_id FOR UPDATE;

  IF (
    SELECT count(*)
    FROM public.sd_solucao_anexos
    WHERE solucao_id = NEW.solucao_id
  ) >= 10 THEN
    RAISE EXCEPTION 'Cada solução pode ter no máximo 10 anexos.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_sd_solution_attachment_limit() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_sd_solution_attachment_limit
  ON public.sd_solucao_anexos;
CREATE TRIGGER enforce_sd_solution_attachment_limit
  BEFORE INSERT ON public.sd_solucao_anexos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sd_solution_attachment_limit();

ALTER TABLE public.sd_solucao_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View SD solution attachments" ON public.sd_solucao_anexos;
CREATE POLICY "View SD solution attachments"
  ON public.sd_solucao_anexos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'view'));

DROP POLICY IF EXISTS "Create SD solution attachments" ON public.sd_solucao_anexos;
CREATE POLICY "Create SD solution attachments"
  ON public.sd_solucao_anexos FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'sd_solutions', 'create')
    OR public.has_permission(auth.uid(), 'sd_solutions', 'edit')
  );

DROP POLICY IF EXISTS "Delete SD solution attachments" ON public.sd_solucao_anexos;
CREATE POLICY "Delete SD solution attachments"
  ON public.sd_solucao_anexos FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'sd_solutions', 'edit')
    OR public.has_permission(auth.uid(), 'sd_solutions', 'delete')
  );

GRANT SELECT, INSERT, DELETE ON public.sd_solucao_anexos TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sd-solution-attachments', 'sd-solution-attachments', false, 20971520)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520;

DROP POLICY IF EXISTS sd_solution_attachments_read ON storage.objects;
CREATE POLICY sd_solution_attachments_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'sd-solution-attachments'
    AND public.has_permission(auth.uid(), 'sd_solutions', 'view')
  );

DROP POLICY IF EXISTS sd_solution_attachments_insert ON storage.objects;
CREATE POLICY sd_solution_attachments_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sd-solution-attachments'
    AND (
      public.has_permission(auth.uid(), 'sd_solutions', 'create')
      OR public.has_permission(auth.uid(), 'sd_solutions', 'edit')
    )
  );

DROP POLICY IF EXISTS sd_solution_attachments_delete ON storage.objects;
CREATE POLICY sd_solution_attachments_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'sd-solution-attachments'
    AND (
      public.has_permission(auth.uid(), 'sd_solutions', 'edit')
      OR public.has_permission(auth.uid(), 'sd_solutions', 'delete')
    )
  );

NOTIFY pgrst, 'reload schema';
