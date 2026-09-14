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
  'sd_attendance_bi',
  'BI de Atendimento no menu do SD',
  'O menu lateral do módulo SD agora exibe o atalho para o BI de Atendimento aos usuários com a permissão correspondente.',
  '/sd/bi-atendimento'
where not exists (
  select 1
  from public.notifications
  where category = 'changelog'
    and type = 'release_fix'
    and permission_resource = 'sd_attendance_bi'
    and title = 'BI de Atendimento no menu do SD'
    and action_url = '/sd/bi-atendimento'
);
