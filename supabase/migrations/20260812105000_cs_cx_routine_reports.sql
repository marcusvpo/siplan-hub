-- Permite que o perfil de relatórios consulte o domínio de rotinas sem receber
-- permissão operacional para criar, editar ou excluir registros.

CREATE POLICY cs_cx_routine_categories_reports_read ON public.cs_cx_routine_categories
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_routine_types_reports_read ON public.cs_cx_routine_types
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_routine_models_reports_read ON public.cs_cx_routine_models
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_routine_model_products_reports_read ON public.cs_cx_routine_model_products
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_routine_model_items_reports_read ON public.cs_cx_routine_model_items
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_office_routines_reports_read ON public.cs_cx_office_routines
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_office_routine_items_reports_read ON public.cs_cx_office_routine_items
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_routine_history_reports_read ON public.cs_cx_routine_history
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_products_reports_read ON public.cs_cx_products
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
CREATE POLICY cs_cx_registry_offices_reports_read ON public.cs_cx_registry_offices
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'cs_cx_reports', 'view'));
