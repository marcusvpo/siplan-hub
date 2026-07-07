-- Migration: RPC para marcar um modelo ENVIADO (cliente) como concluido (isDone)
-- de forma atomica, por caminho. O worker chama ao concluir a geracao, para que a
-- barra de progresso da aba "Modelos Enviados (Cliente)" preencha automaticamente.

CREATE OR REPLACE FUNCTION public.set_sent_model_done(p_project_id UUID, p_source_path TEXT, p_is_done BOOLEAN)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.projects
  SET modelos_editor_sent_files = COALESCE((
    SELECT jsonb_agg(
      CASE WHEN elem->>'path' = p_source_path
           THEN jsonb_set(elem, '{isDone}', to_jsonb(p_is_done))
           ELSE elem END
    )
    FROM jsonb_array_elements(COALESCE(modelos_editor_sent_files, '[]'::jsonb)) AS elem
  ), '[]'::jsonb)
  WHERE id = p_project_id;
$$;
