-- Permite cadastrar ferramentas auxiliares que não são motores de conversão.

ALTER TABLE public.conversion_engines
  ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'conversion_engine',
  ADD COLUMN IF NOT EXISTS tool_name TEXT;

ALTER TABLE public.conversion_engines
  ALTER COLUMN source_system DROP NOT NULL,
  ALTER COLUMN target_system DROP NOT NULL;

ALTER TABLE public.conversion_engines
  DROP CONSTRAINT IF EXISTS conversion_engines_source_system_check,
  DROP CONSTRAINT IF EXISTS conversion_engines_target_system_check,
  DROP CONSTRAINT IF EXISTS conversion_engines_record_type_check,
  DROP CONSTRAINT IF EXISTS conversion_engines_required_fields_check;

ALTER TABLE public.conversion_engines
  ADD CONSTRAINT conversion_engines_record_type_check
    CHECK (record_type IN ('conversion_engine', 'other_tool')),
  ADD CONSTRAINT conversion_engines_required_fields_check
    CHECK (
      (
        record_type = 'conversion_engine'
        AND NULLIF(btrim(source_system), '') IS NOT NULL
        AND NULLIF(btrim(target_system), '') IS NOT NULL
        AND tool_name IS NULL
      )
      OR
      (
        record_type = 'other_tool'
        AND NULLIF(btrim(tool_name), '') IS NOT NULL
        AND source_system IS NULL
        AND target_system IS NULL
      )
    );

CREATE INDEX IF NOT EXISTS conversion_engines_record_type_idx
  ON public.conversion_engines(record_type);

COMMENT ON COLUMN public.conversion_engines.record_type IS
  'Tipo do cadastro: motor de conversão ou ferramenta auxiliar.';
COMMENT ON COLUMN public.conversion_engines.tool_name IS
  'Nome da ferramenta auxiliar quando record_type = other_tool.';
