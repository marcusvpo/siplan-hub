-- Migration: 20261030113000_sanitize_orion_admin_config.sql
-- Descrição: Blindagem em 4 camadas contra corrupção de formatação no Arquivo de Propriedades (.properties) do Orion Admin.
-- Converte e sanitiza árvores Lexical JSON serializadas antigas e tags HTML para texto puro formatado.

-- 1. Função recursiva auxiliar para extrair texto de nós Lexical
CREATE OR REPLACE FUNCTION public._extract_lexical_node(p_node jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type text;
  v_res text := '';
  v_child jsonb;
  v_is_block boolean;
BEGIN
  IF p_node IS NULL THEN
    RETURN '';
  END IF;
  
  v_type := p_node->>'type';
  
  IF v_type = 'linebreak' THEN
    RETURN E'\n';
  END IF;
  
  IF p_node ? 'text' AND (p_node->>'text') IS NOT NULL THEN
    RETURN p_node->>'text';
  END IF;
  
  IF p_node ? 'children' AND jsonb_typeof(p_node->'children') = 'array' THEN
    v_is_block := (v_type IN ('paragraph', 'heading', 'listitem'));
    FOR v_child IN SELECT * FROM jsonb_array_elements(p_node->'children')
    LOOP
      v_res := v_res || public._extract_lexical_node(v_child);
    END LOOP;
    
    IF v_is_block THEN
      v_res := v_res || E'\n';
    END IF;
    RETURN v_res;
  END IF;
  
  RETURN '';
END;
$$;

-- 2. Função principal de sanitização do Orion Admin Config
CREATE OR REPLACE FUNCTION public.sanitize_orion_admin_config(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_trimmed text;
  v_json jsonb;
  v_clean text;
BEGIN
  IF p_raw IS NULL THEN
    RETURN NULL;
  END IF;
  v_trimmed := btrim(p_raw);
  IF v_trimmed = '' THEN
    RETURN '';
  END IF;

  -- 1. Se for Lexical JSON serializado (começa com {"root":)
  IF v_trimmed LIKE '{"root":%' THEN
    BEGIN
      v_json := v_trimmed::jsonb;
      IF v_json ? 'root' THEN
        v_clean := public._extract_lexical_node(v_json->'root');
        IF v_clean IS NOT NULL THEN
          v_clean := regexp_replace(v_clean, E'\r\n', E'\n', 'g');
          v_clean := regexp_replace(v_clean, E'\n{3,}', E'\n\n', 'g');
          RETURN btrim(v_clean);
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Em caso de erro de parse, mantém fluxo de texto
    END;
  END IF;

  -- 2. Se contiver tags HTML (<p>, <br>, etc.)
  IF v_trimmed ~* '<[a-z][^>]*>' THEN
    v_clean := regexp_replace(v_trimmed, '(?i)<br\s*/?>', E'\n', 'g');
    v_clean := regexp_replace(v_clean, '(?i)</?(p|div|li)[^>]*>', E'\n', 'g');
    v_clean := regexp_replace(v_clean, '<[^>]+>', '', 'g');
    v_clean := replace(v_clean, '&nbsp;', ' ');
    v_clean := replace(v_clean, '&amp;', '&');
    v_clean := replace(v_clean, '&lt;', '<');
    v_clean := replace(v_clean, '&gt;', '>');
    v_clean := regexp_replace(v_clean, E'\n{3,}', E'\n\n', 'g');
    RETURN btrim(v_clean);
  END IF;

  RETURN v_trimmed;
END;
$$;

-- 3. Trigger de sanitização automática em BEFORE INSERT OR UPDATE na tabela public.projects
CREATE OR REPLACE FUNCTION public.trg_fn_sanitize_orion_admin_config()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.custom_fields IS NOT NULL AND NEW.custom_fields ? 'environment_orion_admin_config' THEN
    DECLARE
      v_raw text := NEW.custom_fields->>'environment_orion_admin_config';
      v_clean text;
    BEGIN
      IF v_raw IS NOT NULL AND (v_raw LIKE '{"root":%' OR v_raw ~* '<[a-z][^>]*>') THEN
        v_clean := public.sanitize_orion_admin_config(v_raw);
        NEW.custom_fields := jsonb_set(
          NEW.custom_fields,
          '{environment_orion_admin_config}',
          to_jsonb(v_clean)
        );
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_orion_admin_config ON public.projects;

CREATE TRIGGER trg_sanitize_orion_admin_config
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_sanitize_orion_admin_config();

-- 4. Saneamento retroativo dos registros existentes gravados em formato Lexical JSON
UPDATE public.projects
SET
  custom_fields = jsonb_set(
    custom_fields,
    '{environment_orion_admin_config}',
    to_jsonb(public.sanitize_orion_admin_config(custom_fields->>'environment_orion_admin_config'))
  ),
  updated_at = now()
WHERE custom_fields->>'environment_orion_admin_config' LIKE '{"root":%';

-- 5. Registro de Changelog em public.notifications
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
  'release_fix',
  'projects',
  'Correção no Arquivo de Propriedades do Orion Admin',
  'Blindagem contra corrupção de formatação JSON no campo .properties da Preparação de Ambiente, restaurando o texto puro legível com saneamento retroativo e automático.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications existing
  WHERE existing.category = 'changelog'
    AND existing.type = 'release_fix'
    AND existing.permission_resource = 'projects'
    AND existing.title = 'Correção no Arquivo de Propriedades do Orion Admin'
    AND existing.action_url = '/projects'
);
