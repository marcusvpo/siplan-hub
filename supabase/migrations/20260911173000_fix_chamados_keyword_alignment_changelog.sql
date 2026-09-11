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
    'release_fix',
    'chamados_query',
    'Alinhamento da Busca Rápida',
    'O campo de palavras-chave da Busca Rápida foi alinhado aos demais filtros da Consulta de Chamados.',
    '/deployments/tickets'
  ),
  (
    'changelog',
    'release_fix',
    'chamados_legacy_query',
    'Alinhamento da Busca Rápida',
    'O campo de palavras-chave foi alinhado aos demais filtros da consulta de chamados legados.',
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
