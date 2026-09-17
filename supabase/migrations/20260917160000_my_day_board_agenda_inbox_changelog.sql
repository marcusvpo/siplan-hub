-- Entrada inteligente da agenda e movimentação responsiva no Meu Quadro.

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
  'Agenda integrada ao Meu Quadro',
  'A entrada da agenda reúne tarefas pessoais e compromissos de CS/CX e Implantação para conversão em cartões. O arrastar e soltar agora funciona por manipuladores visíveis no desktop, celular e PWA.',
  '/meu-dia/quadro'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'work_board'
    AND title = 'Agenda integrada ao Meu Quadro'
    AND action_url = '/meu-dia/quadro'
);
