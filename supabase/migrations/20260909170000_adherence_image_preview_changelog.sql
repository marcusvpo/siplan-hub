-- Informa os usuários autorizados sobre a ampliação das imagens da Aderência.
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
  'Imagens ampliadas na Análise de Aderência',
  'Agora é possível clicar nas miniaturas anexadas aos itens da Análise de Aderência para abrir a imagem completa em um pop-up responsivo, com o título da evidência e fechamento por botão, clique externo ou tecla Esc.',
  '/implantadores/aderencia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'implantadores_aderencia'
    AND title = 'Imagens ampliadas na Análise de Aderência'
    AND action_url = '/implantadores/aderencia'
);
