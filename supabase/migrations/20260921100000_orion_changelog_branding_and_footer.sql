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
  'release_improvement',
  'orion_updates',
  'Orion Changelog: Novo cabeçalho e rodapé institucional',
  'O módulo de atualizações foi renomeado para Orion Changelog, trazendo novo cabeçalho com o logotipo da Siplan ampliado e centralizado, e rodapé profissional com os canais oficiais de contato e Help Desk.',
  '/atualizacoes/inicio'
where not exists (
  select 1
  from public.notifications existing
  where existing.category = 'changelog'
    and existing.type = 'release_improvement'
    and existing.permission_resource = 'orion_updates'
    and existing.title = 'Orion Changelog: Novo cabeçalho e rodapé institucional'
    and existing.action_url = '/atualizacoes/inicio'
);
