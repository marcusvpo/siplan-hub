-- Permite que usuários autorizados corrijam observações do histórico de solicitações.

DROP POLICY IF EXISTS cs_cx_request_updates_edit ON public.cs_cx_request_updates;
CREATE POLICY cs_cx_request_updates_edit
  ON public.cs_cx_request_updates FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_registros', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'cs_cx_registros', 'edit'));

GRANT UPDATE ON public.cs_cx_request_updates TO authenticated;
