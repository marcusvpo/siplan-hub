-- Navegação horizontal e ferramentas de produtividade no Meu Quadro.

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
  'work_board',
  'Meu Quadro com visual Trello',
  'O Kanban ganhou faixa horizontal sobre grade, navegacao por arrastar a area livre, busca e filtros, densidade, colunas recolhiveis, criacao rapida, cabecalhos fixos, desfazer movimentacao, zoom de 50% a 130%, ajuste a tela, minimapa e preferencias salvas por usuario e quadro.',
  '/meu-dia/quadro'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'work_board'
    AND title = 'Meu Quadro com visual Trello'
    AND action_url = '/meu-dia/quadro'
);
