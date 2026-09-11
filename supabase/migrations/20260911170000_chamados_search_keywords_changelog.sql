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
    'Busca rápida com palavras-chave',
    'A Consulta de Chamados agora permite adicionar vários termos com Enter, pesquisar por qualquer uma das palavras-chave e remover cada termo individualmente.',
    '/deployments/tickets'
  ),
  (
    'changelog',
    'release_improvement',
    'chamados_legacy_query',
    'Busca rápida com palavras-chave',
    'A consulta de chamados legados agora permite combinar várias palavras-chave removíveis na mesma pesquisa.',
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
