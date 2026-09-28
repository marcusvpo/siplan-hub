-- Migration: 20260923180000_upgrade_orion_pro_and_reg_adherence_templates.sql
-- Padronização dos formulários de análise de aderência dos sistemas Orion PRO (v4) e Orion REG (v3)
-- Adiciona suporte a anexo de imagens por pergunta, editor de texto rico (Rich Text) e botões ergonômicos de aderência,
-- seguindo rigorosamente a arquitetura e especificações estabelecidas no Orion TN.

DO $$
DECLARE
  v_pro_v3_id uuid := '82ce9f49-85cd-49b9-879d-040ae634d3f7';
  v_reg_v2_id uuid := '530d567e-6f42-4511-a8ae-75d4468ec0db';
  v_pro_v4_id uuid := gen_random_uuid();
  v_reg_v3_id uuid := gen_random_uuid();
  v_pro_schema jsonb;
  v_pro_ui jsonb;
  v_reg_schema jsonb;
  v_reg_ui jsonb;
  v_img_def jsonb := '{"type": "array", "title": "Imagens do item", "items": {"type": "object", "title": "Imagem", "properties": {"url": {"type": "string", "title": "Imagem"}, "title": {"type": "string", "title": "Título da imagem"}}}}'::jsonb;
BEGIN
  -- 1. Construir novo schema para Orion PRO v4 a partir da v3 preservando títulos, chaves, tipos e ordenação
  SELECT 
    jsonb_set(
      schema_json,
      '{properties}',
      (
        SELECT jsonb_object_agg(
          sec_key,
          jsonb_build_object(
            'type', sec_val->>'type',
            'title', sec_val->>'title',
            'properties', (
              SELECT jsonb_object_agg(
                q_key,
                jsonb_set(
                  q_val,
                  '{properties,imagens}',
                  v_img_def,
                  true
                )
                ORDER BY substring(q_key from '([0-9]+)$')::int
              )
              FROM jsonb_each(sec_val->'properties') as q(q_key, q_val)
            )
          )
          ORDER BY substring(sec_key from '([0-9]+)')::int
        )
        FROM jsonb_each(schema_json->'properties') as s(sec_key, sec_val)
      )
    ),
    ui_json
  INTO v_pro_schema, v_pro_ui
  FROM public.form_templates
  WHERE id = v_pro_v3_id;

  -- 2. Construir novo schema para Orion REG v3 a partir da v2 preservando títulos, chaves, tipos e ordenação
  SELECT 
    jsonb_set(
      schema_json,
      '{properties}',
      (
        SELECT jsonb_object_agg(
          sec_key,
          jsonb_build_object(
            'type', sec_val->>'type',
            'title', sec_val->>'title',
            'properties', (
              SELECT jsonb_object_agg(
                q_key,
                jsonb_set(
                  q_val,
                  '{properties,imagens}',
                  v_img_def,
                  true
                )
                ORDER BY substring(q_key from '([0-9]+)$')::int
              )
              FROM jsonb_each(sec_val->'properties') as q(q_key, q_val)
            )
          )
          ORDER BY substring(sec_key from '([0-9]+)')::int
        )
        FROM jsonb_each(schema_json->'properties') as s(sec_key, sec_val)
      )
    ),
    ui_json
  INTO v_reg_schema, v_reg_ui
  FROM public.form_templates
  WHERE id = v_reg_v2_id;

  -- 3. Desativar versões anteriores de Orion PRO e Orion REG
  UPDATE public.form_templates
  SET is_active = false
  WHERE kind = 'adherence'
    AND system_type IN ('Orion PRO', 'Orion REG');

  -- 4. Inserir Orion PRO v4 como ativo
  INSERT INTO public.form_templates (
    id,
    kind,
    system_type,
    version,
    schema_json,
    ui_json,
    is_active,
    notes,
    created_at
  ) VALUES (
    v_pro_v4_id,
    'adherence',
    'Orion PRO',
    4,
    v_pro_schema,
    v_pro_ui,
    true,
    'Template v4 Orion PRO: Habilitado suporte a anexo de imagens por pergunta, editor de texto rico e botões ergonômicos de aderência, padronizado com o Orion TN.',
    NOW()
  );

  -- 5. Inserir Orion REG v3 como ativo
  INSERT INTO public.form_templates (
    id,
    kind,
    system_type,
    version,
    schema_json,
    ui_json,
    is_active,
    notes,
    created_at
  ) VALUES (
    v_reg_v3_id,
    'adherence',
    'Orion REG',
    3,
    v_reg_schema,
    v_reg_ui,
    true,
    'Template v3 Orion REG: Habilitado suporte a anexo de imagens por pergunta, editor de texto rico e botões ergonômicos de aderência, padronizado com o Orion TN.',
    NOW()
  );

  -- 6. Migrar respostas ativas do Orion REG (Franca e Carapicuíba) para o template v3
  -- Mantém 100% dos dados, respostas, notas e pareceres íntegros, habilitando anexos de imagens imediatamente
  UPDATE public.project_form_responses
  SET template_id = v_reg_v3_id
  WHERE template_id = v_reg_v2_id;

  -- 7. Registrar notificação de Changelog (Regra 12 do AGENTS.md)
  INSERT INTO public.notifications (
    category,
    type,
    permission_resource,
    title,
    message,
    action_url
  ) VALUES (
    'changelog',
    'release_improvement',
    'implantadores_aderencia',
    'Padronização dos Formulários de Aderência (Orion PRO e Orion REG)',
    'Formulários de análise de aderência dos sistemas Orion PRO (v4) e Orion REG (v3) atualizados com suporte a editor de texto rico (Rich Text), novos botões de avaliação e anexo de fotos por pergunta, seguindo o padrão do Orion TN.',
    '/implantadores/aderencia'
  );
END $$;
