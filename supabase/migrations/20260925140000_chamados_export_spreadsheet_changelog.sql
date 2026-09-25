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
  'release_feature',
  'chamados_query',
  'Exportação em planilha de chamados e trâmites',
  'A Consulta de Chamados agora permite exportar em planilha (.xlsx e .csv) todos os chamados da visualização com descrições integrais e 100% dos trâmites, com suporte a busca de todo o histórico sem data inicial obrigatória.',
  '/deployments/tickets'
where not exists (
  select 1
  from public.notifications existing
  where existing.category = 'changelog'
    and existing.type = 'release_feature'
    and existing.permission_resource = 'chamados_query'
    and existing.title = 'Exportação em planilha de chamados e trâmites'
    and existing.action_url = '/deployments/tickets'
);
