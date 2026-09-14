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
  'sd_attendance_bi',
  'Detalhes dos chamados no BI de Atendimento',
  'A tabela de chamados com maior esforço agora permite abrir os detalhes de cada chamado, incluindo responsáveis, descrição e histórico de trâmites.',
  '/sd/bi-atendimento'
where not exists (
  select 1
  from public.notifications existing
  where existing.category = 'changelog'
    and existing.type = 'release_improvement'
    and existing.permission_resource = 'sd_attendance_bi'
    and existing.title = 'Detalhes dos chamados no BI de Atendimento'
    and existing.action_url = '/sd/bi-atendimento'
);
