-- Informa os usuários autorizados sobre o salvamento de rascunho na Aderência.
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
  'release_improvement',
  'implantadores_aderencia',
  'Rascunho seguro na Análise de Aderência',
  'O formulário de Aderência agora salva automaticamente o preenchimento em rascunho, informa quando existem alterações pendentes e exibe o horário da última gravação. Também foi incluído o botão Salvar rascunho para confirmar o salvamento manualmente e continuar a análise depois, sem precisar finalizá-la.',
  '/implantadores/aderencia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'implantadores_aderencia'
    AND title = 'Rascunho seguro na Análise de Aderência'
    AND action_url = '/implantadores/aderencia'
);
