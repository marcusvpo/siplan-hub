-- Corrige as políticas RLS para cs_cx_nps_questionnaires.
-- Modelos de questionário de NPS são templates globais do sistema e
-- devem ser visíveis para todos os usuários com permissão de visualização do CS/CX NPS,
-- sem restringir a leitura ao autor de criação (created_by).

DROP POLICY IF EXISTS cs_cx_nps_questionnaires_read ON public.cs_cx_nps_questionnaires;
DROP POLICY IF EXISTS cs_cx_nps_questionnaires_create ON public.cs_cx_nps_questionnaires;
DROP POLICY IF EXISTS cs_cx_nps_questionnaires_edit ON public.cs_cx_nps_questionnaires;
DROP POLICY IF EXISTS cs_cx_nps_questionnaires_delete ON public.cs_cx_nps_questionnaires;

CREATE POLICY cs_cx_nps_questionnaires_read ON public.cs_cx_nps_questionnaires
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'cs_cx_nps', 'view')
    OR public.has_permission(auth.uid(), 'cs_cx_admin', 'view')
    OR public.has_permission(auth.uid(), 'cs_cx_reports', 'view')
  );

CREATE POLICY cs_cx_nps_questionnaires_create ON public.cs_cx_nps_questionnaires
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'cs_cx_nps', 'create')
    OR public.has_permission(auth.uid(), 'cs_cx_admin', 'manage')
  );

CREATE POLICY cs_cx_nps_questionnaires_edit ON public.cs_cx_nps_questionnaires
  FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'cs_cx_nps', 'edit')
    OR public.has_permission(auth.uid(), 'cs_cx_admin', 'manage')
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'cs_cx_nps', 'edit')
    OR public.has_permission(auth.uid(), 'cs_cx_admin', 'manage')
  );

CREATE POLICY cs_cx_nps_questionnaires_delete ON public.cs_cx_nps_questionnaires
  FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'cs_cx_nps', 'delete')
    OR public.has_permission(auth.uid(), 'cs_cx_admin', 'manage')
  );
