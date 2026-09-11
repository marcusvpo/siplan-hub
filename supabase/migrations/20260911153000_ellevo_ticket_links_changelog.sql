insert into public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
select
  release.category,
  release.type,
  release.permission_resource,
  release.title,
  release.message,
  release.action_url
from (values
  (
    'changelog',
    'release_improvement',
    'chamados_query',
    'Acesso direto aos chamados no Ellevo',
    'Os números dos chamados 0800 agora são links e abrem o histórico correspondente no Ellevo em uma nova aba nas consultas e telas internas relacionadas.',
    '/deployments/tickets'
  ),
  (
    'changelog',
    'release_improvement',
    'chamados_legacy_query',
    'Acesso direto aos chamados no Ellevo',
    'Os números dos chamados legados agora abrem diretamente o histórico correspondente no Ellevo em uma nova aba.',
    '/deployments/tickets-legacy'
  )
) as release(category, type, permission_resource, title, message, action_url)
where not exists (
  select 1
  from public.notifications existing
  where existing.category = release.category
    and existing.type = release.type
    and existing.permission_resource = release.permission_resource
    and existing.title = release.title
    and existing.action_url = release.action_url
);
