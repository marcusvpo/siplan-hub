-- Remove dos templates ativos a galeria geral substituída pelos anexos por item.
WITH legacy_fields AS (
  SELECT
    template.id,
    array_agg(field.key) AS keys_to_remove
  FROM public.form_templates AS template
  CROSS JOIN LATERAL jsonb_each(
    COALESCE(template.schema_json -> 'properties', '{}'::jsonb)
  ) AS field(key, value)
  WHERE template.kind = 'adherence'
    AND template.is_active = true
    AND (
      field.key IN ('printer_photos', 'q_printer_photos')
      OR lower(btrim(field.value ->> 'title')) IN (
        'fotos dos periféricos',
        'fotos dos perifericos',
        'fotos e imagens das impressoras do cliente'
      )
    )
  GROUP BY template.id
)
UPDATE public.form_templates AS template
SET
  schema_json =
    (template.schema_json - 'required')
    || jsonb_build_object(
      'properties',
      COALESCE(template.schema_json -> 'properties', '{}'::jsonb) - legacy_fields.keys_to_remove
    )
    || CASE
      WHEN template.schema_json ? 'required' THEN
        jsonb_build_object(
          'required',
          COALESCE(
            (
              SELECT jsonb_agg(required_key)
              FROM jsonb_array_elements_text(template.schema_json -> 'required') AS required_entry(required_key)
              WHERE NOT required_key = ANY(legacy_fields.keys_to_remove)
            ),
            '[]'::jsonb
          )
        )
      ELSE '{}'::jsonb
    END,
  ui_json = CASE
    WHEN template.ui_json IS NULL THEN NULL
    ELSE template.ui_json - legacy_fields.keys_to_remove
  END
FROM legacy_fields
WHERE template.id = legacy_fields.id;

-- Registra de forma idempotente o pacote de melhorias da análise de aderência.
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
  'release_improvement',
  'implantadores_aderencia',
  'Análise de Aderência aprimorada',
  'O editor de Aderência agora permite habilitar ou remover imagens por item, inclusive em massa. Durante o preenchimento, o usuário conta com um layout mais compacto, setores recolhíveis e editores completos nas observações, nos itens com impacto e na justificativa técnica. O parecer pode ser gerado pelo Codex a partir de toda a análise e revisado antes de ser aplicado. As evidências ficam organizadas em uma galeria compacta, e a antiga galeria geral Fotos dos Periféricos foi removida.',
  '/implantadores/aderencia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'implantadores_aderencia'
    AND title = 'Análise de Aderência aprimorada'
    AND action_url = '/implantadores/aderencia'
);
