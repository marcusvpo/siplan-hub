-- Migration: 20261110200000_create_assistant_knowledge_files.sql
-- Tabela de controle granular dos arquivos atômicos da Base de Conhecimento Orion TN
-- e mapeamento com a OpenAI Vector Store (Dual-Layer RAG V3.2)

CREATE TABLE IF NOT EXISTS public.assistant_knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL UNIQUE,       -- Ex: 'V-7.6.1', 'R-1.0', '_indice', '_glossario'
  file_path TEXT NOT NULL,               -- Ex: 'kb/rotinas/notas/V-7.6.1-abertura-cartao.md'
  file_name TEXT NOT NULL,               -- Ex: 'V-7.6.1-abertura-cartao.md'
  modulo TEXT NOT NULL,                  -- 'notas', 'caixa', 'firmas', 'selos', 'centrais', etc.
  secao TEXT NOT NULL,                   -- 'R', 'V', 'M', 'D', 'C', 'SYS'
  tem_video BOOLEAN NOT NULL DEFAULT false,
  categoria TEXT NOT NULL,               -- 'videoaula_tutorial', 'procedimento_geral', etc.
  sha256_hash TEXT NOT NULL,             -- Hash SHA-256 para controle delta incremental
  openai_file_id TEXT,                   -- ID do arquivo retornado por /v1/files
  vector_store_id TEXT NOT NULL DEFAULT 'vs_6a85e00895f081918844a28887a34a17',
  token_count INTEGER,                   -- Contagem aproximada de tokens (cl100k_base)
  sync_status TEXT NOT NULL DEFAULT 'synced', -- 'synced', 'pending', 'error'
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_assistant_knowledge_files_article_id ON public.assistant_knowledge_files (article_id);
CREATE INDEX IF NOT EXISTS idx_assistant_knowledge_files_modulo ON public.assistant_knowledge_files (modulo);
CREATE INDEX IF NOT EXISTS idx_assistant_knowledge_files_secao ON public.assistant_knowledge_files (secao);
CREATE INDEX IF NOT EXISTS idx_assistant_knowledge_files_sha256 ON public.assistant_knowledge_files (sha256_hash);
CREATE INDEX IF NOT EXISTS idx_assistant_knowledge_files_openai_file_id ON public.assistant_knowledge_files (openai_file_id);

-- Habilitar RLS
ALTER TABLE public.assistant_knowledge_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de arquivos de conhecimento" ON public.assistant_knowledge_files;
CREATE POLICY "Permitir leitura de arquivos de conhecimento"
  ON public.assistant_knowledge_files
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Permitir escrita de arquivos de conhecimento service_role" ON public.assistant_knowledge_files;
CREATE POLICY "Permitir escrita de arquivos de conhecimento service_role"
  ON public.assistant_knowledge_files
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir escrita de arquivos de conhecimento authenticated" ON public.assistant_knowledge_files;
CREATE POLICY "Permitir escrita de arquivos de conhecimento authenticated"
  ON public.assistant_knowledge_files
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Conceder permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_knowledge_files TO authenticated, service_role;
GRANT SELECT ON public.assistant_knowledge_files TO anon;

-- RPC para upsert em lote ultra-rápido de arquivos sincronizados
CREATE OR REPLACE FUNCTION public.upsert_assistant_knowledge_file_batch(
  p_files JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count INT := 0;
  v_item JSONB;
BEGIN
  IF p_files IS NULL OR jsonb_array_length(p_files) = 0 THEN
    RETURN jsonb_build_object('success', true, 'count', 0);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_files)
  LOOP
    INSERT INTO public.assistant_knowledge_files (
      article_id,
      file_path,
      file_name,
      modulo,
      secao,
      tem_video,
      categoria,
      sha256_hash,
      openai_file_id,
      vector_store_id,
      token_count,
      sync_status,
      last_synced_at,
      updated_at
    ) VALUES (
      v_item->>'article_id',
      v_item->>'file_path',
      COALESCE(v_item->>'file_name', v_item->>'article_id'),
      COALESCE(v_item->>'modulo', 'geral'),
      COALESCE(v_item->>'secao', 'R'),
      COALESCE((v_item->>'tem_video')::BOOLEAN, false),
      COALESCE(v_item->>'categoria', 'procedimento_geral'),
      v_item->>'sha256_hash',
      v_item->>'openai_file_id',
      COALESCE(v_item->>'vector_store_id', 'vs_6a85e00895f081918844a28887a34a17'),
      (v_item->>'token_count')::INTEGER,
      COALESCE(v_item->>'sync_status', 'synced'),
      now(),
      now()
    )
    ON CONFLICT (article_id) DO UPDATE SET
      file_path = EXCLUDED.file_path,
      file_name = EXCLUDED.file_name,
      modulo = EXCLUDED.modulo,
      secao = EXCLUDED.secao,
      tem_video = EXCLUDED.tem_video,
      categoria = EXCLUDED.categoria,
      sha256_hash = EXCLUDED.sha256_hash,
      openai_file_id = EXCLUDED.openai_file_id,
      vector_store_id = EXCLUDED.vector_store_id,
      token_count = EXCLUDED.token_count,
      sync_status = EXCLUDED.sync_status,
      last_synced_at = now(),
      updated_at = now();

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_inserted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_assistant_knowledge_file_batch(JSONB) TO authenticated, service_role, anon;
