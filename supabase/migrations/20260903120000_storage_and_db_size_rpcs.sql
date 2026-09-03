-- Migration: 20260903120000_storage_and_db_size_rpcs.sql
-- Description: Funções RPC para consultar o tamanho real do banco de dados PostgreSQL e do Supabase Storage

-- 1. Função para retornar o tamanho do banco de dados em bytes
CREATE OR REPLACE FUNCTION public.get_db_size()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database());
$$;

-- 2. Função para retornar a soma total em bytes de todos os objetos gravados no Storage
CREATE OR REPLACE FUNCTION public.get_storage_size()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
  FROM storage.objects;
$$;

-- Conceder permissão de execução para usuários autenticados e service_role
GRANT EXECUTE ON FUNCTION public.get_db_size() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_storage_size() TO authenticated, service_role;
