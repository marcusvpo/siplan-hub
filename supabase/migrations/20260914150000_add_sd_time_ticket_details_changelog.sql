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
  'sd_time_management',
  'Detalhes dos chamados na Consulta de Horas',
  'Os lançamentos importados do 0800 agora exibem o número do chamado como link e oferecem acesso aos detalhes, responsáveis e trâmites pelo ícone de olho.',
  '/sd/consulta-horas'
where not exists (
  select 1
  from public.notifications existing
  where existing.category = 'changelog'
    and existing.type = 'release_improvement'
    and existing.permission_resource = 'sd_time_management'
    and existing.title = 'Detalhes dos chamados na Consulta de Horas'
    and existing.action_url = '/sd/consulta-horas'
);
