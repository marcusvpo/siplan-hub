-- Informa os usuários autorizados sobre a agenda unificada do Meu Dia.
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
  'work_center',
  'Agenda unificada no Meu Dia',
  'A Minha agenda agora reúne tarefas pessoais, compromissos de CS/CX e eventos atribuídos de Implantação, com identificação e filtro por origem e acesso direto à tela responsável.',
  '/meu-dia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'work_center'
    AND title = 'Agenda unificada no Meu Dia'
    AND action_url = '/meu-dia'
);
