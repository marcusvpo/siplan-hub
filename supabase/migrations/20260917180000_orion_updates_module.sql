-- Central de Atualizações Orion integrada nativamente ao Siplan Hub.

INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('menu_atualizacoes', 'view', 'Acessar o módulo Atualizações Orion'),
  ('orion_updates', 'view', 'Visualizar publicações da Central de Atualizações Orion'),
  ('orion_updates_management', 'view', 'Visualizar a Gestão da Central de Atualizações Orion'),
  ('orion_updates_management', 'create', 'Criar versões e publicações da Central de Atualizações Orion'),
  ('orion_updates_management', 'edit', 'Editar e publicar conteúdos da Central de Atualizações Orion'),
  ('orion_updates_management', 'delete', 'Excluir publicações da Central de Atualizações Orion')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

-- O produto de origem era um blog público. No Hub, todos os perfis existentes
-- recebem a leitura; somente o perfil admin nasce com acesso à Gestão.
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
CROSS JOIN public.app_permissions permission
WHERE permission.resource IN ('menu_atualizacoes', 'orion_updates')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.app_roles role
CROSS JOIN public.app_permissions permission
WHERE role.name = 'admin'
  AND permission.resource = 'orion_updates_management'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE TABLE public.orion_update_products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(20) NOT NULL UNIQUE CHECK (slug IN ('oriontn', 'orionpro', 'orionreg')),
  description VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT true,
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.orion_update_versions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.orion_update_products(id) ON DELETE RESTRICT,
  code VARCHAR(30) NOT NULL CHECK (btrim(code) ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, code)
);

CREATE TABLE public.orion_update_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE CHECK (storage_path ~ '^[0-9a-f-]{36}\.webp$'),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.orion_update_posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id BIGINT NOT NULL REFERENCES public.orion_update_versions(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  subtitle VARCHAR(400) NOT NULL DEFAULT '' CHECK (length(subtitle) <= 400),
  slug VARCHAR(220) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 200000),
  post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('novidade', 'melhoria', 'correcao', 'aviso')),
  status VARCHAR(12) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'agendado', 'publicado', 'arquivado')),
  published_at TIMESTAMPTZ,
  featured BOOLEAN NOT NULL DEFAULT false,
  critical BOOLEAN NOT NULL DEFAULT false,
  cover_media_id UUID REFERENCES public.orion_update_media(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  author_name VARCHAR(254),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'agendado' OR published_at IS NOT NULL)
);

CREATE INDEX orion_update_posts_listing_idx
  ON public.orion_update_posts (status, published_at DESC, id DESC);
CREATE INDEX orion_update_posts_version_idx
  ON public.orion_update_posts (version_id, post_type, published_at DESC);

CREATE TABLE public.orion_update_reads (
  post_id BIGINT NOT NULL REFERENCES public.orion_update_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX orion_update_reads_post_idx ON public.orion_update_reads(post_id);

CREATE TABLE public.orion_update_reactions (
  post_id BIGINT NOT NULL REFERENCES public.orion_update_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  type VARCHAR(7) NOT NULL CHECK (type IN ('like', 'dislike')),
  reason VARCHAR(1000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id),
  CHECK (
    (type = 'like' AND reason IS NULL)
    OR (
      type = 'dislike'
      AND reason IS NOT NULL
      AND length(btrim(reason)) BETWEEN 1 AND 1000
    )
  )
);

CREATE INDEX orion_update_reactions_reason_idx
  ON public.orion_update_reactions(post_id, updated_at DESC)
  WHERE type = 'dislike';

CREATE TABLE public.orion_update_shares (
  id UUID PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES public.orion_update_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  channel VARCHAR(8) NOT NULL CHECK (channel IN ('copiar', 'nativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orion_update_shares_post_idx ON public.orion_update_shares(post_id);

CREATE TABLE public.orion_update_suggestions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name VARCHAR(100) NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  registry_office VARCHAR(180) NOT NULL CHECK (length(btrim(registry_office)) BETWEEN 1 AND 180),
  suggestion TEXT NOT NULL CHECK (length(btrim(suggestion)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.orion_update_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  action VARCHAR(30) NOT NULL,
  entity VARCHAR(30) NOT NULL,
  entity_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER orion_update_products_updated_at
BEFORE UPDATE ON public.orion_update_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER orion_update_versions_updated_at
BEFORE UPDATE ON public.orion_update_versions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER orion_update_posts_updated_at
BEFORE UPDATE ON public.orion_update_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.orion_update_reaction_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orion_update_reactions_updated_at
BEFORE UPDATE ON public.orion_update_reactions
FOR EACH ROW EXECUTE FUNCTION public.orion_update_reaction_updated_at();

INSERT INTO public.orion_update_products (name, slug, description, display_order) VALUES
  ('OrionTN', 'oriontn', 'Tabelionato de Notas', 1),
  ('OrionPRO', 'orionpro', 'Protesto', 2),
  ('OrionREG', 'orionreg', 'Registro', 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

ALTER TABLE public.orion_update_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_update_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_update_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_update_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_update_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_update_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_update_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_update_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_update_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY orion_update_products_read ON public.orion_update_products
FOR SELECT TO authenticated USING (
  public.has_permission(auth.uid(), 'orion_updates', 'view')
  OR public.has_permission(auth.uid(), 'orion_updates_management', 'view')
);

CREATE POLICY orion_update_versions_read ON public.orion_update_versions
FOR SELECT TO authenticated USING (
  public.has_permission(auth.uid(), 'orion_updates', 'view')
  OR public.has_permission(auth.uid(), 'orion_updates_management', 'view')
);

CREATE POLICY orion_update_versions_create ON public.orion_update_versions
FOR INSERT TO authenticated WITH CHECK (
  public.has_permission(auth.uid(), 'orion_updates_management', 'create')
  AND created_by = auth.uid()
);

CREATE POLICY orion_update_media_read ON public.orion_update_media
FOR SELECT TO authenticated USING (
  public.has_permission(auth.uid(), 'orion_updates', 'view')
  OR public.has_permission(auth.uid(), 'orion_updates_management', 'view')
);

CREATE POLICY orion_update_media_create ON public.orion_update_media
FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    public.has_permission(auth.uid(), 'orion_updates_management', 'create')
    OR public.has_permission(auth.uid(), 'orion_updates_management', 'edit')
  )
);

CREATE POLICY orion_update_media_delete ON public.orion_update_media
FOR DELETE TO authenticated USING (
  public.has_permission(auth.uid(), 'orion_updates_management', 'delete')
);

CREATE POLICY orion_update_posts_read ON public.orion_update_posts
FOR SELECT TO authenticated USING (
  public.has_permission(auth.uid(), 'orion_updates_management', 'view')
  OR (
    public.has_permission(auth.uid(), 'orion_updates', 'view')
    AND status IN ('publicado', 'agendado')
    AND published_at IS NOT NULL
    AND published_at <= now()
  )
);

CREATE POLICY orion_update_posts_create ON public.orion_update_posts
FOR INSERT TO authenticated WITH CHECK (
  public.has_permission(auth.uid(), 'orion_updates_management', 'create')
  AND author_id = auth.uid()
);

CREATE POLICY orion_update_posts_edit ON public.orion_update_posts
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'orion_updates_management', 'edit'))
WITH CHECK (public.has_permission(auth.uid(), 'orion_updates_management', 'edit'));

CREATE POLICY orion_update_posts_delete ON public.orion_update_posts
FOR DELETE TO authenticated USING (
  public.has_permission(auth.uid(), 'orion_updates_management', 'delete')
);

CREATE POLICY orion_update_reads_own ON public.orion_update_reads
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY orion_update_reads_create ON public.orion_update_reads
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'orion_updates', 'view')
  AND EXISTS (
    SELECT 1 FROM public.orion_update_posts post
    WHERE post.id = post_id
      AND post.status IN ('publicado', 'agendado')
      AND post.published_at IS NOT NULL
      AND post.published_at <= now()
  )
);

CREATE POLICY orion_update_reactions_read ON public.orion_update_reactions
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_permission(auth.uid(), 'orion_updates_management', 'view')
);
CREATE POLICY orion_update_reactions_create ON public.orion_update_reactions
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'orion_updates', 'view')
  AND EXISTS (
    SELECT 1 FROM public.orion_update_posts post
    WHERE post.id = post_id
      AND post.status IN ('publicado', 'agendado')
      AND post.published_at IS NOT NULL
      AND post.published_at <= now()
  )
);
CREATE POLICY orion_update_reactions_edit ON public.orion_update_reactions
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'orion_updates', 'view')
)
WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'orion_updates', 'view')
  AND EXISTS (
    SELECT 1 FROM public.orion_update_posts post
    WHERE post.id = post_id
      AND post.status IN ('publicado', 'agendado')
      AND post.published_at IS NOT NULL
      AND post.published_at <= now()
  )
);
CREATE POLICY orion_update_reactions_delete ON public.orion_update_reactions
FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'orion_updates', 'view')
);

CREATE POLICY orion_update_shares_read ON public.orion_update_shares
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_permission(auth.uid(), 'orion_updates_management', 'view')
);
CREATE POLICY orion_update_shares_create ON public.orion_update_shares
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'orion_updates', 'view')
  AND EXISTS (
    SELECT 1 FROM public.orion_update_posts post
    WHERE post.id = post_id
      AND post.status IN ('publicado', 'agendado')
      AND post.published_at IS NOT NULL
      AND post.published_at <= now()
  )
);

CREATE POLICY orion_update_suggestions_read ON public.orion_update_suggestions
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_permission(auth.uid(), 'orion_updates_management', 'view')
);
CREATE POLICY orion_update_suggestions_create ON public.orion_update_suggestions
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND public.has_permission(auth.uid(), 'orion_updates', 'view')
);

CREATE POLICY orion_update_audit_read ON public.orion_update_audit
FOR SELECT TO authenticated USING (
  public.has_permission(auth.uid(), 'orion_updates_management', 'view')
);

GRANT SELECT ON public.orion_update_products, public.orion_update_versions,
  public.orion_update_media, public.orion_update_posts, public.orion_update_reads,
  public.orion_update_reactions, public.orion_update_shares,
  public.orion_update_suggestions, public.orion_update_audit TO authenticated;
GRANT INSERT ON public.orion_update_versions, public.orion_update_media,
  public.orion_update_posts, public.orion_update_reads, public.orion_update_reactions,
  public.orion_update_shares, public.orion_update_suggestions TO authenticated;
GRANT UPDATE ON public.orion_update_posts, public.orion_update_reactions TO authenticated;
GRANT DELETE ON public.orion_update_media, public.orion_update_posts,
  public.orion_update_reactions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.orion_update_versions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.orion_update_posts_id_seq TO authenticated;

CREATE OR REPLACE VIEW public.orion_update_publications
WITH (security_invoker = true)
AS
SELECT
  post.id,
  post.title AS titulo,
  post.subtitle AS subtitulo,
  post.subtitle AS resumo,
  post.slug,
  version.id AS versao_id,
  version.code AS versao,
  product.slug AS sistema,
  product.name AS sistema_nome,
  post.post_type AS tipo,
  post.body AS corpo,
  'html'::TEXT AS corpo_formato,
  post.published_at AS publicado_em,
  post.featured AS destaque,
  post.critical AS critico,
  post.cover_media_id AS capa_imagem_id,
  CASE
    WHEN post.status = 'agendado' AND post.published_at <= now() THEN 'publicado'
    ELSE post.status
  END AS status,
  jsonb_build_array(jsonb_build_object('nome', product.name, 'slug', product.slug)) AS produtos,
  ARRAY[post.post_type]::TEXT[] AS tipos,
  0::INTEGER AS total_itens,
  post.created_at AS criado_em,
  post.author_name AS autor_nome,
  (
    product.active
    AND post.status IN ('publicado', 'agendado')
    AND post.published_at IS NOT NULL
    AND post.published_at <= now()
  ) AS disponivel
FROM public.orion_update_posts post
JOIN public.orion_update_versions version ON version.id = post.version_id
JOIN public.orion_update_products product ON product.id = version.product_id;

GRANT SELECT ON public.orion_update_publications TO authenticated;

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
  IF NOT public.has_permission(auth.uid(), 'orion_updates', 'view') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
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
    'meta', jsonb_build_object('nao_lidas', COALESCE(sum(nao_lidos), 0))
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
  IF NOT public.has_permission(auth.uid(), 'orion_updates', 'view') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
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
      'nao_lidas', (SELECT count(*) FROM filtered WHERE NOT ja_lido)
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
  ELSIF NOT public.has_permission(auth.uid(), 'orion_updates', 'view') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
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

CREATE OR REPLACE FUNCTION public.orion_updates_management_versions()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'view') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'data',
    COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY criado_em DESC, id DESC), '[]'::JSONB)
  )
  INTO result
  FROM (
    SELECT
      version.id, version.code AS codigo, version.created_at AS criado_em,
      product.slug AS sistema, product.name AS sistema_nome,
      count(post.id)::INTEGER AS total_posts
    FROM public.orion_update_versions version
    JOIN public.orion_update_products product ON product.id = version.product_id
    LEFT JOIN public.orion_update_posts post ON post.version_id = version.id
    WHERE product.active
    GROUP BY version.id, product.id
  ) row_data;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_management_posts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'view') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object('data', COALESCE(jsonb_agg(
    to_jsonb(publication) - 'corpo' - 'disponivel' - 'criado_em' - 'autor_nome'
    || jsonb_build_object('ja_lido', false)
    ORDER BY publication.criado_em DESC, publication.id DESC
  ), '[]'::JSONB))
  INTO result
  FROM public.orion_update_publications publication;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_create_version(p_code TEXT, p_system TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE created public.orion_update_versions;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'create') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  p_code := btrim(p_code);
  IF length(p_code) NOT BETWEEN 1 AND 30 OR p_code !~ '^[A-Za-z0-9][A-Za-z0-9._-]*$' THEN
    RAISE EXCEPTION 'Código de versão inválido';
  END IF;

  INSERT INTO public.orion_update_versions (product_id, code, created_by)
  SELECT product.id, p_code, auth.uid()
  FROM public.orion_update_products product
  WHERE product.slug = p_system AND product.active
  RETURNING * INTO created;

  IF created.id IS NULL THEN RAISE EXCEPTION 'Sistema indisponível'; END IF;
  INSERT INTO public.orion_update_audit (user_id, action, entity, entity_id)
  VALUES (auth.uid(), 'criar', 'versao', created.id);
  RETURN jsonb_build_object('id', created.id, 'codigo', created.code, 'sistema', p_system);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Esta versão já existe neste sistema' USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_save_post(p_post JSONB, p_id BIGINT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved public.orion_update_posts;
  previous public.orion_update_posts;
  version_system TEXT;
  requested_status TEXT := p_post->>'status';
  publish_at TIMESTAMPTZ;
  cover_id UUID;
BEGIN
  IF p_id IS NULL THEN
    IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'create') THEN
      RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'edit') THEN
      RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO previous FROM public.orion_update_posts WHERE id = p_id;
    IF previous.id IS NULL THEN RAISE EXCEPTION 'Publicação não encontrada'; END IF;
  END IF;

  IF length(btrim(COALESCE(p_post->>'titulo', ''))) NOT BETWEEN 1 AND 200
    OR length(COALESCE(p_post->>'subtitulo', '')) > 400
    OR COALESCE(p_post->>'slug', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    OR length(COALESCE(p_post->>'corpo', '')) NOT BETWEEN 1 AND 200000
    OR COALESCE(p_post->>'tipo', '') NOT IN ('novidade', 'melhoria', 'correcao', 'aviso')
    OR requested_status NOT IN ('rascunho', 'agendado', 'publicado')
  THEN
    RAISE EXCEPTION 'Dados da publicação inválidos';
  END IF;

  SELECT product.slug INTO version_system
  FROM public.orion_update_versions version
  JOIN public.orion_update_products product ON product.id = version.product_id
  WHERE version.id = (p_post->>'versao_id')::BIGINT AND product.active;
  IF version_system IS NULL OR version_system <> p_post->>'sistema' THEN
    RAISE EXCEPTION 'A versão precisa pertencer ao sistema selecionado';
  END IF;

  IF NULLIF(p_post->>'capa_imagem_id', '') IS NOT NULL THEN
    cover_id := (p_post->>'capa_imagem_id')::UUID;
    IF NOT EXISTS (SELECT 1 FROM public.orion_update_media media WHERE media.id = cover_id) THEN
      RAISE EXCEPTION 'A capa selecionada não está disponível';
    END IF;
  END IF;

  IF requested_status = 'agendado' THEN
    publish_at := (p_post->>'publicado_em')::TIMESTAMPTZ;
    IF publish_at IS NULL OR publish_at <= now() THEN
      RAISE EXCEPTION 'Escolha uma data e hora futuras para agendar';
    END IF;
  ELSIF requested_status = 'publicado' THEN
    publish_at := CASE
      WHEN previous.status IN ('publicado', 'agendado') AND previous.published_at <= now()
        THEN previous.published_at
      ELSE now()
    END;
  ELSE
    publish_at := NULL;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.orion_update_posts (
      version_id, title, subtitle, slug, body, post_type, status,
      published_at, cover_media_id, author_id, author_name
    ) VALUES (
      (p_post->>'versao_id')::BIGINT, btrim(p_post->>'titulo'), btrim(COALESCE(p_post->>'subtitulo', '')),
      p_post->>'slug', p_post->>'corpo', p_post->>'tipo', requested_status,
      publish_at, cover_id, auth.uid(), auth.jwt()->>'email'
    ) RETURNING * INTO saved;
  ELSE
    UPDATE public.orion_update_posts SET
      version_id = (p_post->>'versao_id')::BIGINT,
      title = btrim(p_post->>'titulo'),
      subtitle = btrim(COALESCE(p_post->>'subtitulo', '')),
      slug = p_post->>'slug',
      body = p_post->>'corpo',
      post_type = p_post->>'tipo',
      status = requested_status,
      published_at = publish_at,
      cover_media_id = cover_id
    WHERE id = p_id
    RETURNING * INTO saved;
  END IF;

  INSERT INTO public.orion_update_audit (user_id, action, entity, entity_id)
  VALUES (auth.uid(), CASE WHEN p_id IS NULL THEN 'criar' ELSE 'editar' END, 'publicacao', saved.id);
  RETURN jsonb_build_object('id', saved.id, 'slug', saved.slug, 'ok', true);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Já existe uma publicação com esta palavra-chave' USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_publish_post(p_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'edit') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  UPDATE public.orion_update_posts
  SET status = 'publicado', published_at = now()
  WHERE id = p_id AND status IN ('rascunho', 'agendado');
  IF NOT FOUND THEN RAISE EXCEPTION 'Publicação não encontrada ou já publicada'; END IF;
  INSERT INTO public.orion_update_audit (user_id, action, entity, entity_id)
  VALUES (auth.uid(), 'publicar', 'publicacao', p_id);
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_delete_post(p_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'delete') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.orion_update_posts WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publicação não encontrada'; END IF;
  INSERT INTO public.orion_update_audit (user_id, action, entity, entity_id)
  VALUES (auth.uid(), 'excluir', 'publicacao', p_id);
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_analytics(
  p_product TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'todos',
  p_focus TEXT DEFAULT 'todos',
  p_order TEXT DEFAULT 'feedback',
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_include_posts BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'view') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('todos', 'publicado', 'rascunho', 'agendado', 'arquivado')
    OR p_focus NOT IN ('todos', 'feedback', 'sem_visualizacoes', 'sem_avaliacoes')
    OR p_order NOT IN ('feedback', 'visualizacoes', 'compartilhamentos', 'aprovacao', 'recentes')
  THEN RAISE EXCEPTION 'Filtros inválidos'; END IF;
  p_page := greatest(1, p_page);
  p_limit := least(20, greatest(1, p_limit));

  WITH posts AS (
    SELECT publication.id, publication.titulo, publication.slug, publication.tipo,
      publication.criado_em, publication.publicado_em, publication.versao,
      publication.sistema, publication.sistema_nome, publication.disponivel,
      publication.status
    FROM public.orion_update_publications publication
    WHERE (p_product IS NULL OR publication.sistema = p_product)
      AND (p_type IS NULL OR publication.tipo = p_type)
      AND (
        p_search IS NULL
        OR strpos(
          translate(lower(publication.titulo), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
          translate(lower(p_search), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
        ) > 0
      )
  ), scoped AS (
    SELECT * FROM posts WHERE p_status = 'todos' OR status = p_status
  ), views AS (
    SELECT read.post_id, count(*)::INTEGER AS total
    FROM public.orion_update_reads read JOIN scoped ON scoped.id = read.post_id
    GROUP BY read.post_id
  ), reactions AS (
    SELECT reaction.post_id,
      count(*) FILTER (WHERE reaction.type = 'like')::INTEGER AS likes,
      count(*) FILTER (WHERE reaction.type = 'dislike')::INTEGER AS dislikes
    FROM public.orion_update_reactions reaction JOIN scoped ON scoped.id = reaction.post_id
    GROUP BY reaction.post_id
  ), shares AS (
    SELECT share.post_id, count(*)::INTEGER AS total
    FROM public.orion_update_shares share JOIN scoped ON scoped.id = share.post_id
    GROUP BY share.post_id
  ), metrics AS (
    SELECT scoped.*,
      COALESCE(views.total, 0) AS visualizacoes,
      COALESCE(reactions.likes, 0) AS likes,
      COALESCE(reactions.dislikes, 0) AS dislikes,
      COALESCE(shares.total, 0) AS compartilhamentos,
      round(100.0 * reactions.likes / NULLIF(reactions.likes + reactions.dislikes, 0), 1) AS aprovacao
    FROM scoped
    LEFT JOIN views ON views.post_id = scoped.id
    LEFT JOIN reactions ON reactions.post_id = scoped.id
    LEFT JOIN shares ON shares.post_id = scoped.id
  ), filtered AS (
    SELECT * FROM metrics
    WHERE p_focus = 'todos'
      OR (p_focus = 'feedback' AND dislikes > 0)
      OR (p_focus = 'sem_visualizacoes' AND disponivel AND visualizacoes = 0)
      OR (p_focus = 'sem_avaliacoes' AND disponivel AND visualizacoes > 0 AND likes + dislikes = 0)
  ), pagination AS (
    SELECT count(*)::INTEGER AS total,
      least(p_page, greatest(1, ceil(count(*) / p_limit::NUMERIC)::INTEGER)) AS page
    FROM filtered
  ), paged AS (
    SELECT * FROM filtered
    WHERE p_include_posts
    ORDER BY
      CASE WHEN p_order = 'feedback' THEN dislikes END DESC,
      CASE WHEN p_order = 'visualizacoes' THEN visualizacoes END DESC,
      CASE WHEN p_order = 'compartilhamentos' THEN compartilhamentos END DESC,
      CASE WHEN p_order = 'aprovacao' THEN aprovacao END ASC NULLS LAST,
      CASE WHEN p_order = 'recentes' THEN criado_em END DESC,
      id DESC
    LIMIT p_limit OFFSET ((SELECT page FROM pagination) - 1) * p_limit
  ), summary AS (
    SELECT count(*)::INTEGER AS publicacoes,
      count(*) FILTER (WHERE disponivel)::INTEGER AS disponiveis,
      COALESCE(sum(visualizacoes), 0)::BIGINT AS visualizacoes,
      COALESCE(sum(likes), 0)::BIGINT AS likes,
      COALESCE(sum(dislikes), 0)::BIGINT AS dislikes,
      COALESCE(sum(compartilhamentos), 0)::BIGINT AS compartilhamentos,
      round(100.0 * sum(likes) / NULLIF(sum(likes + dislikes), 0), 1) AS aprovacao,
      count(*) FILTER (WHERE dislikes > 0)::INTEGER AS com_feedback,
      count(*) FILTER (WHERE disponivel AND visualizacoes = 0)::INTEGER AS sem_visualizacoes,
      count(*) FILTER (WHERE disponivel AND visualizacoes > 0 AND likes + dislikes = 0)::INTEGER AS sem_avaliacoes,
      (SELECT count(DISTINCT read.user_id)::INTEGER
       FROM public.orion_update_reads read JOIN scoped ON scoped.id = read.post_id) AS visitantes_unicos
    FROM metrics
  )
  SELECT jsonb_build_object(
    'data', COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY
      CASE WHEN p_order = 'feedback' THEN dislikes END DESC,
      CASE WHEN p_order = 'visualizacoes' THEN visualizacoes END DESC,
      CASE WHEN p_order = 'compartilhamentos' THEN compartilhamentos END DESC,
      CASE WHEN p_order = 'aprovacao' THEN aprovacao END ASC NULLS LAST,
      CASE WHEN p_order = 'recentes' THEN criado_em END DESC,
      id DESC
    ) FROM paged), '[]'::JSONB),
    'resumo', (SELECT to_jsonb(summary) FROM summary),
    'meta', (SELECT jsonb_build_object('page', page, 'limit', p_limit, 'total', total) FROM pagination),
    'atualizado_em', now()
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_suggestions(
  p_search TEXT DEFAULT NULL,
  p_order TEXT DEFAULT 'recentes',
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'view') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_order NOT IN ('recentes', 'antigas') THEN RAISE EXCEPTION 'Ordenação inválida'; END IF;
  p_page := greatest(1, p_page);
  p_limit := least(20, greatest(1, p_limit));

  WITH filtered AS (
    SELECT suggestion.id, suggestion.name AS nome,
      suggestion.registry_office AS cartorio, suggestion.suggestion AS sugestao,
      suggestion.created_at AS criado_em
    FROM public.orion_update_suggestions suggestion
    WHERE p_search IS NULL OR strpos(
      translate(lower(concat_ws(' ', suggestion.name, suggestion.registry_office, suggestion.suggestion)),
        'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
      translate(lower(p_search), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
    ) > 0
  ), pagination AS (
    SELECT count(*)::INTEGER AS total,
      least(p_page, greatest(1, ceil(count(*) / p_limit::NUMERIC)::INTEGER)) AS page
    FROM filtered
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY
      CASE WHEN p_order = 'recentes' THEN criado_em END DESC,
      CASE WHEN p_order = 'antigas' THEN criado_em END ASC,
      id
    LIMIT p_limit OFFSET ((SELECT page FROM pagination) - 1) * p_limit
  )
  SELECT jsonb_build_object(
    'data', COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY
      CASE WHEN p_order = 'recentes' THEN criado_em END DESC,
      CASE WHEN p_order = 'antigas' THEN criado_em END ASC,
      id
    ) FROM paged), '[]'::JSONB),
    'meta', (SELECT jsonb_build_object('page', page, 'limit', p_limit, 'total', total) FROM pagination)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.orion_updates_dislike_reasons(
  p_post_id BIGINT,
  p_page INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE result JSONB; page_limit CONSTANT INTEGER := 20;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'orion_updates_management', 'view') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  p_page := greatest(1, p_page);
  SELECT jsonb_build_object(
    'data', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('motivo', reason, 'atualizado_em', updated_at) ORDER BY updated_at DESC)
      FROM (
        SELECT reason, updated_at FROM public.orion_update_reactions
        WHERE post_id = p_post_id AND type = 'dislike'
        ORDER BY updated_at DESC, user_id
        LIMIT page_limit OFFSET (p_page - 1) * page_limit
      ) rows
    ), '[]'::JSONB),
    'meta', jsonb_build_object(
      'page', p_page,
      'limit', page_limit,
      'total', (SELECT count(*) FROM public.orion_update_reactions WHERE post_id = p_post_id AND type = 'dislike')
    )
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.orion_updates_public_versions(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_public_posts(TEXT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_post_detail(TEXT, BIGINT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_management_versions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_management_posts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_create_version(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_save_post(JSONB, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_publish_post(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_delete_post(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_analytics(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_suggestions(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orion_updates_dislike_reasons(BIGINT, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.orion_updates_public_versions(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_public_posts(TEXT, TEXT, BIGINT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_post_detail(TEXT, BIGINT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_management_versions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_management_posts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_create_version(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_save_post(JSONB, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_publish_post(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_delete_post(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_analytics(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_suggestions(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orion_updates_dislike_reasons(BIGINT, INTEGER) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('orion-updates', 'orion-updates', true, 5242880, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY orion_updates_storage_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'orion-updates'
  AND (
    public.has_permission(auth.uid(), 'orion_updates', 'view')
    OR public.has_permission(auth.uid(), 'orion_updates_management', 'view')
  )
);

CREATE POLICY orion_updates_storage_create ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'orion-updates'
  AND name ~ '^[0-9a-f-]{36}\.webp$'
  AND (
    public.has_permission(auth.uid(), 'orion_updates_management', 'create')
    OR public.has_permission(auth.uid(), 'orion_updates_management', 'edit')
  )
);

CREATE POLICY orion_updates_storage_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'orion-updates'
  AND public.has_permission(auth.uid(), 'orion_updates_management', 'delete')
);

INSERT INTO public.notifications (
  category, type, permission_resource, title, message, action_url
)
SELECT
  'changelog',
  'release_screen',
  'orion_updates',
  'Central de Atualizações Orion',
  'O blog Orion foi integrado ao Siplan Hub com leitura de novidades por sistema e versão, Gestão de publicações, agendamentos, imagens, reações, sugestões e acompanhamento de resultados.',
  '/atualizacoes/inicio'
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_screen'
    AND permission_resource = 'orion_updates'
    AND action_url = '/atualizacoes/inicio'
);

NOTIFY pgrst, 'reload schema';
