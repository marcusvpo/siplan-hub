-- Informa os usuários autorizados sobre a visualização rápida das observações dos agendamentos.
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
  'cs_cx_agendamentos',
  'Visualização rápida das observações dos agendamentos',
  'A tela de Agendamentos do CS/CX agora permite visualizar rapidamente as observações pelo ícone de olho, sem precisar entrar na edição.',
  '/cs-cx/agendamentos'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'cs_cx_agendamentos'
    AND title = 'Visualização rápida das observações dos agendamentos'
    AND action_url = '/cs-cx/agendamentos'
);
