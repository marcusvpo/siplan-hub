-- Permite que o link público do Orion Blog seja acessado sem permissão de usuário.

CREATE OR REPLACE FUNCTION public.orion_updates_public_versions(
  p_product TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_order TEXT DEFAULT 'criacao_desc',
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT COALESCE((SELECT public_enabled FROM public.orion_update_settings WHERE id = 1), true) THEN
    RAISE EXCEPTION 'Central de Atualizações indisponível' USING ERRCODE = '42501';
  END IF;
  IF p_order NOT IN ('versao_desc', 'versao_asc', 'criacao_desc', 'criacao_asc') THEN
    RAISE EXCEPTION 'Ordenação inválida';
  END IF;

  WITH rows AS (
    SELECT
      version.id,
      version.code AS codigo,
      version.created_at AS criado_em,
      product.slug AS sistema,
      product.name AS sistema_nome,
      max(publication.publicado_em) FILTER (WHERE publication.disponivel) AS ultima_publicacao,
      count(publication.id) FILTER (WHERE publication.disponivel)::INTEGER AS total_posts,
      count(publication.id) FILTER (
        WHERE publication.disponivel AND read.post_id IS NULL
      )::INTEGER AS nao_lidos,
      CASE
        WHEN version.code ~ '^[0-9]+([.][0-9]+)*$'
        THEN string_to_array(version.code, '.')::NUMERIC[]
      END AS numeric_code
    FROM public.orion_update_versions version
    JOIN public.orion_update_products product ON product.id = version.product_id
    LEFT JOIN public.orion_update_publications publication
      ON publication.versao_id = version.id
      AND (p_type IS NULL OR publication.tipo = p_type)
    LEFT JOIN public.orion_update_reads read
      ON read.post_id = publication.id AND read.user_id = auth.uid()
    WHERE product.active
      AND (p_product IS NULL OR product.slug = p_product)
      AND (p_search IS NULL OR strpos(version.code, p_search) > 0)
    GROUP BY version.id, product.id
  )
  SELECT jsonb_build_object(
    'data', COALESCE(jsonb_agg(
      to_jsonb(rows) - 'numeric_code'
      ORDER BY
        CASE WHEN p_order = 'versao_desc' THEN numeric_code END DESC NULLS LAST,
        CASE WHEN p_order = 'versao_asc' THEN numeric_code END ASC NULLS LAST,
        CASE WHEN p_order = 'criacao_desc' THEN criado_em END DESC,
        CASE WHEN p_order = 'criacao_asc' THEN criado_em END ASC,
        CASE WHEN p_order = 'versao_desc' THEN codigo END DESC,
        CASE WHEN p_order = 'versao_asc' THEN codigo END ASC,
        id DESC
    ), '[]'::JSONB),
    'meta', jsonb_build_object('nao_lidos', COALESCE(sum(nao_lidos), 0))
  ) INTO result
  FROM rows;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_public_posts(
  p_product TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_version_id BIGINT DEFAULT NULL,
  p_order TEXT DEFAULT 'destaques',
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT COALESCE((SELECT public_enabled FROM public.orion_update_settings WHERE id = 1), true) THEN
    RAISE EXCEPTION 'Central de Atualizações indisponível' USING ERRCODE = '42501';
  END IF;
  IF p_order NOT IN ('destaques', 'recentes', 'antigas') THEN
    RAISE EXCEPTION 'Ordenação inválida';
  END IF;
  p_page := greatest(1, p_page);
  p_limit := least(50, greatest(1, p_limit));

  WITH filtered AS (
    SELECT
      publication.id, publication.titulo, publication.subtitulo, publication.resumo,
      publication.slug, publication.versao_id, publication.versao,
      publication.sistema, publication.sistema_nome, publication.tipo,
      publication.corpo_formato, publication.publicado_em, publication.destaque,
      publication.critico, publication.capa_imagem_id, publication.status,
      publication.produtos, publication.tipos, publication.total_itens,
      EXISTS (
        SELECT 1 FROM public.orion_update_reads read
        WHERE read.post_id = publication.id AND read.user_id = auth.uid()
      ) AS ja_lido
    FROM public.orion_update_publications publication
    WHERE publication.disponivel
      AND (p_product IS NULL OR publication.sistema = p_product)
      AND (p_type IS NULL OR publication.tipo = p_type)
      AND (p_version_id IS NULL OR publication.versao_id = p_version_id)
      AND (
        p_search IS NULL
        OR strpos(
          translate(lower(concat_ws(' ', publication.titulo, publication.subtitulo, publication.corpo)),
            'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
          translate(lower(p_search), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
        ) > 0
      )
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY
      CASE WHEN p_order = 'destaques' THEN destaque::INTEGER END DESC,
      CASE WHEN p_order IN ('destaques', 'recentes') THEN publicado_em END DESC,
      CASE WHEN p_order = 'antigas' THEN publicado_em END ASC,
      id DESC
    LIMIT p_limit OFFSET (p_page - 1) * p_limit
  )
  SELECT jsonb_build_object(
    'data', COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY
      CASE WHEN p_order = 'destaques' THEN destaque::INTEGER END DESC,
      CASE WHEN p_order IN ('destaques', 'recentes') THEN publicado_em END DESC,
      CASE WHEN p_order = 'antigas' THEN publicado_em END ASC,
      id DESC
    ) FROM paged), '[]'::JSONB),
    'meta', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', (SELECT count(*) FROM filtered),
      'nao_lidos', (SELECT count(*) FROM filtered WHERE NOT ja_lido)
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_post_detail(
  p_slug TEXT DEFAULT NULL,
  p_id BIGINT DEFAULT NULL,
  p_management BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
  IF p_management THEN
    IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'view') THEN
      RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;
  ELSIF NOT COALESCE((SELECT public_enabled FROM public.orion_update_settings WHERE id = 1), true) THEN
    RAISE EXCEPTION 'Central de Atualizações indisponível' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(publication)
    - 'disponivel' - 'criado_em' - 'autor_nome'
    || jsonb_build_object(
      'ja_lido', EXISTS (
        SELECT 1 FROM public.orion_update_reads read
        WHERE read.post_id = publication.id AND read.user_id = auth.uid()
      ),
      'itens', '[]'::JSONB
    )
  INTO result
  FROM public.orion_update_publications publication
  WHERE (
    (p_id IS NOT NULL AND publication.id = p_id)
    OR (p_id IS NULL AND p_slug IS NOT NULL AND publication.slug = p_slug)
  )
  AND (p_management OR publication.disponivel)
  ORDER BY publication.id
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.orion_updates_public_versions(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_public_posts(TEXT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_post_detail(TEXT, BIGINT, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.orion_updates_public_versions(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_public_posts(TEXT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_post_detail(TEXT, BIGINT, BOOLEAN) TO anon, authenticated;

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
  'orion_updates',
  'Acesso público ao Orion Blog corrigido',
  'As publicações do Orion Blog agora podem ser consultadas por qualquer pessoa com o link público, sem exigir uma permissão de perfil.',
  '/atualizacoes'
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'orion_updates'
    AND action_url = '/atualizacoes'
);

NOTIFY pgrst, 'reload schema';