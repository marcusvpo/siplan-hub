-- Respostas de clientes são evidências imutáveis.
-- Usuários do HUB podem consultar e, com permissão explícita, excluir; somente
-- os fluxos públicos protegidos (service_role) podem registrar novas respostas.

DROP POLICY IF EXISTS cs_cx_nps_responses_create
  ON public.cs_cx_nps_responses;
DROP POLICY IF EXISTS cs_cx_nps_responses_edit
  ON public.cs_cx_nps_responses;

REVOKE INSERT, UPDATE ON public.cs_cx_nps_responses
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cs_cx_import_nps(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;

UPDATE public.app_permissions
SET description = CASE action
  WHEN 'create' THEN 'Solicitar NPS e criar questionários'
  WHEN 'edit' THEN 'Gerenciar questionários e solicitações de NPS'
  ELSE description
END
WHERE resource = 'cs_cx_nps' AND action IN ('create', 'edit');

COMMENT ON TABLE public.cs_cx_nps_responses IS
  'Respostas imutáveis de clientes. INSERT/UPDATE de usuários autenticados são bloqueados; entrada somente pelos fluxos públicos protegidos.';
COMMENT ON FUNCTION public.cs_cx_import_nps(UUID, JSONB) IS
  'Importação histórica desativada após a migração inicial; sem EXECUTE para usuários da aplicação.';
