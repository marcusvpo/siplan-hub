-- ============================================================================
-- Migration: Super Agenda Geral - Tabela de Agendamentos, Permissões RBAC e RLS
-- ============================================================================

-- 1. Registrar novas ações para calendar_analysts no catálogo de permissões
INSERT INTO public.app_permissions (resource, action, description) VALUES
  ('calendar_analysts', 'view', 'Visualizar a Agenda dos Analistas'),
  ('calendar_analysts', 'create', 'Cadastrar chamados e atividades na Agenda dos Analistas'),
  ('calendar_analysts', 'edit', 'Editar chamados e atividades na Agenda dos Analistas'),
  ('calendar_analysts', 'delete', 'Excluir chamados e atividades na Agenda dos Analistas'),
  ('calendar_analysts', 'manage', 'Gestão completa da Agenda dos Analistas')
ON CONFLICT (resource, action) DO UPDATE
SET description = EXCLUDED.description;

-- 2. Conceder todas as permissões para o perfil admin
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r
CROSS JOIN public.app_permissions p
WHERE r.name = 'admin'
  AND p.resource = 'calendar_analysts'
ON CONFLICT DO NOTHING;

-- 3. Preservar permissão de visualização (view) para quem já tinha acesso
-- (qualquer papel que já possuía calendar_analysts:view permanece intacto)

-- 4. Função auxiliar de segurança para validação de privilégios de gestão da agenda
CREATE OR REPLACE FUNCTION public.can_manage_analyst_agenda(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_email text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Privilégio explícito para os perfis das gestoras da agenda (Maria Santos e Lunna Santana)
  IF p_user_id IN (
    '428879ee-95b3-429f-a48e-2fba91da9ff8'::uuid, -- Maria Santos
    'c9bc1cb5-29d5-426e-b178-bedc76cdfbd0'::uuid  -- Lunna Santana
  ) THEN
    RETURN true;
  END IF;

  SELECT role, email INTO v_role, v_email
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  IF lower(COALESCE(v_email, '')) IN ('maria.santos@siplan.com.br', 'lunna.santana@siplan.com.br') THEN
    RETURN true;
  END IF;

  IF public.has_permission(p_user_id, 'calendar_analysts', 'manage')
     OR public.has_permission(p_user_id, 'calendar_analysts', 'create')
     OR public.has_permission(p_user_id, 'calendar_analysts', 'edit') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 5. Criar a tabela analyst_agenda_entries
CREATE TABLE IF NOT EXISTS public.analyst_agenda_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  ticket_catalog TEXT NOT NULL DEFAULT 'orion' CHECK (ticket_catalog IN ('orion', 'legacy')),
  client_name TEXT NOT NULL,
  client_code TEXT,
  subject TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'chamado',
  date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE,
  end_time TIME WITHOUT TIME ZONE,
  is_all_day BOOLEAN NOT NULL DEFAULT true,
  observations TEXT,
  ticket_data JSONB DEFAULT '{}'::jsonb,
  bulk_group_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentários na tabela e colunas
COMMENT ON TABLE public.analyst_agenda_entries IS 'Lançamentos e agendamentos de chamados e atividades na Super Agenda dos analistas';
COMMENT ON COLUMN public.analyst_agenda_entries.ticket_catalog IS 'Catálogo do chamado: orion ou legacy';
COMMENT ON COLUMN public.analyst_agenda_entries.activity_type IS 'Tipo da atividade: chamado, implantacao, aderencia, homologacao, configuracao, migracao, treinamento, apoio_sd, compensacao_horas, reuniao, outro';
COMMENT ON COLUMN public.analyst_agenda_entries.bulk_group_id IS 'Identificador comum para agendamentos efetuados em lote (múltiplos dias)';

-- Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_analyst_agenda_entries_date_user ON public.analyst_agenda_entries(date, user_id);
CREATE INDEX IF NOT EXISTS idx_analyst_agenda_entries_ticket ON public.analyst_agenda_entries(ticket_number);
CREATE INDEX IF NOT EXISTS idx_analyst_agenda_entries_bulk ON public.analyst_agenda_entries(bulk_group_id);
CREATE INDEX IF NOT EXISTS idx_analyst_agenda_entries_created_by ON public.analyst_agenda_entries(created_by);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_analyst_agenda_entries_updated_at ON public.analyst_agenda_entries;
CREATE TRIGGER trg_analyst_agenda_entries_updated_at
  BEFORE UPDATE ON public.analyst_agenda_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. Configurar Row Level Security (RLS)
ALTER TABLE public.analyst_agenda_entries ENABLE ROW LEVEL SECURITY;

-- Leitura: Qualquer usuário autenticado pode visualizar todos os agendamentos da agenda
DROP POLICY IF EXISTS "Authenticated users can view agenda entries" ON public.analyst_agenda_entries;
CREATE POLICY "Authenticated users can view agenda entries"
  ON public.analyst_agenda_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Inserção: Apenas Admins, Maria Santos, Lunna Santana ou usuários com permissão
DROP POLICY IF EXISTS "Authorized users can insert agenda entries" ON public.analyst_agenda_entries;
CREATE POLICY "Authorized users can insert agenda entries"
  ON public.analyst_agenda_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_analyst_agenda(auth.uid()));

-- Atualização: Apenas Admins, Maria Santos, Lunna Santana ou usuários com permissão
DROP POLICY IF EXISTS "Authorized users can update agenda entries" ON public.analyst_agenda_entries;
CREATE POLICY "Authorized users can update agenda entries"
  ON public.analyst_agenda_entries
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_analyst_agenda(auth.uid()))
  WITH CHECK (public.can_manage_analyst_agenda(auth.uid()));

-- Exclusão: Apenas Admins, Maria Santos, Lunna Santana ou usuários com permissão
DROP POLICY IF EXISTS "Authorized users can delete agenda entries" ON public.analyst_agenda_entries;
CREATE POLICY "Authorized users can delete agenda entries"
  ON public.analyst_agenda_entries
  FOR DELETE
  TO authenticated
  USING (public.can_manage_analyst_agenda(auth.uid()));

-- Concessão de privilégios de tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyst_agenda_entries TO authenticated;
