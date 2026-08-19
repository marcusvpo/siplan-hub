-- Controle da migracao do SistemaRegistro para o modulo CS/CX.
-- As tabelas desta migration nao fazem parte da interface de negocio.

CREATE TABLE IF NOT EXISTS public.cs_cx_user_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL UNIQUE,
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  legacy_role TEXT,
  legacy_access_profile_id BIGINT,
  active BOOLEAN NOT NULL DEFAULT true,
  can_view_all_entries BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ,
  source_hash TEXT NOT NULL,
  source_present BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_cx_migration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL CHECK (mode IN ('initial', 'delta', 'verify')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  source_name TEXT NOT NULL DEFAULT 'SistemaRegistro',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  table_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.cs_cx_migration_state (
  table_name TEXT PRIMARY KEY,
  source_row_count BIGINT NOT NULL DEFAULT 0,
  target_row_count BIGINT NOT NULL DEFAULT 0,
  source_max_legacy_id BIGINT,
  last_full_scan_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_id UUID REFERENCES public.cs_cx_migration_runs(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_cx_user_map_profile_id
  ON public.cs_cx_user_map(profile_id);
CREATE INDEX IF NOT EXISTS idx_cs_cx_user_map_source_present
  ON public.cs_cx_user_map(source_present);

ALTER TABLE public.cs_cx_user_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_migration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_cx_migration_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_cx_user_map_admin_read ON public.cs_cx_user_map
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));
CREATE POLICY cs_cx_user_map_admin_manage ON public.cs_cx_user_map
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_admin', 'manage'));

CREATE POLICY cs_cx_migration_runs_admin_read ON public.cs_cx_migration_runs
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));
CREATE POLICY cs_cx_migration_state_admin_read ON public.cs_cx_migration_state
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_admin', 'view'));

COMMENT ON TABLE public.cs_cx_user_map IS
  'Mapeia usuarios legados para profiles; hashes de senha nunca sao migrados.';
COMMENT ON TABLE public.cs_cx_migration_state IS
  'Checkpoint e contagens da ultima reconciliacao por tabela.';
