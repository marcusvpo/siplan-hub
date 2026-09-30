CREATE OR REPLACE FUNCTION public.cs_cx_set_registry_office_analysis_status(
  p_registry_office_id UUID,
  p_is_analyzed BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF p_registry_office_id IS NULL THEN
    RAISE EXCEPTION 'Informe o cartorio';
  END IF;

  IF p_is_analyzed IS NULL THEN
    RAISE EXCEPTION 'Informe o status de analise';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cs_cx_office_routines routine
    WHERE routine.registry_office_id = p_registry_office_id
      AND public.cs_cx_can_manage_office_record(
        'cs_cx_rotinas',
        'edit',
        routine.applied_by,
        routine.registry_office_id
      )
  ) THEN
    RAISE EXCEPTION 'Cartorio ou rotina nao encontrado, ou sem permissao para editar rotinas';
  END IF;

  UPDATE public.cs_cx_registry_offices
  SET is_analyzed = p_is_analyzed,
      analysis_at = CASE WHEN p_is_analyzed THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_registry_office_id
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RAISE EXCEPTION 'Cartorio nao encontrado';
  END IF;

  RETURN updated_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_cx_set_registry_office_analysis_status(UUID, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cs_cx_set_registry_office_analysis_status(UUID, BOOLEAN)
  TO authenticated;

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
  'cs_cx_rotinas',
  'Correção do status de análise nas rotinas CS/CX',
  'O interruptor de análise e os contadores da tela de Rotinas CS/CX voltam a atualizar corretamente após a alteração do status do cartório.',
  '/cs-cx/rotinas'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'cs_cx_rotinas'
    AND title = 'Correção do status de análise nas rotinas CS/CX'
    AND action_url = '/cs-cx/rotinas'
);
