insert into public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
select
  'changelog',
  'release_fix',
  'projects',
  'Correção no motivo do impedimento',
  'O resumo da Análise de Aderência nos projetos agora exibe o motivo do impedimento em formato legível e apresenta uma mensagem adequada quando o campo está vazio.',
  '/projects'
where not exists (
  select 1
  from public.notifications
  where category = 'changelog'
    and type = 'release_fix'
    and permission_resource = 'projects'
    and title = 'Correção no motivo do impedimento'
    and action_url = '/projects'
);
