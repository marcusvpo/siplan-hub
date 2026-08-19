-- Organiza os sistemas e as soluções do SD em famílias.

CREATE TABLE IF NOT EXISTS public.sd_familias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 2 AND 100),
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sd_familias_nome_unique
  ON public.sd_familias (lower(trim(nome)));

ALTER TABLE public.sd_sistemas
  ADD COLUMN IF NOT EXISTS familia_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sd_sistemas_familia_id_fkey'
      AND conrelid = 'public.sd_sistemas'::regclass
  ) THEN
    ALTER TABLE public.sd_sistemas
      ADD CONSTRAINT sd_sistemas_familia_id_fkey
      FOREIGN KEY (familia_id)
      REFERENCES public.sd_familias(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS sd_sistemas_familia_idx
  ON public.sd_sistemas (familia_id);

ALTER TABLE public.sd_familias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View SD families" ON public.sd_familias;
CREATE POLICY "View SD families"
  ON public.sd_familias FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'view'));

DROP POLICY IF EXISTS "Manage SD families insert" ON public.sd_familias;
CREATE POLICY "Manage SD families insert"
  ON public.sd_familias FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

DROP POLICY IF EXISTS "Manage SD families update" ON public.sd_familias;
CREATE POLICY "Manage SD families update"
  ON public.sd_familias FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

DROP POLICY IF EXISTS "Manage SD families delete" ON public.sd_familias;
CREATE POLICY "Manage SD families delete"
  ON public.sd_familias FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'sd_solutions', 'manage'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sd_familias TO authenticated;

NOTIFY pgrst, 'reload schema';
