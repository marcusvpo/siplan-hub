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
  'chamados_query',
  'Relatório analítico de chamados',
  'A Consulta de Chamados agora exporta uma planilha Excel completa com os chamados do filtro, todos os trâmites sincronizados — inclusive eventos sem descrição —, informações de SLA, jornada por área, consolidação por setor e os gráficos da Análise de IA.',
  '/deployments/tickets'
where not exists (
  select 1
  from public.notifications existing
  where existing.category = 'changelog'
    and existing.type = 'release_improvement'
    and existing.permission_resource = 'chamados_query'
    and existing.title = 'Relatório analítico de chamados'
    and existing.action_url = '/deployments/tickets'
);
