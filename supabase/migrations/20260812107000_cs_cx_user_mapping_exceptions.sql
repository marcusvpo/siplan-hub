-- Permite registrar decisoes de negocio para usuarios legados que nao devem
-- receber uma conta correspondente no HUB.

ALTER TABLE public.cs_cx_user_map
  ADD COLUMN IF NOT EXISTS mapping_ignored BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cs_cx_user_map_mapping_ignored
  ON public.cs_cx_user_map(mapping_ignored)
  WHERE mapping_ignored;

COMMENT ON COLUMN public.cs_cx_user_map.mapping_ignored IS
  'Indica que o usuario legado foi deliberadamente excluido do de/para de perfis.';
