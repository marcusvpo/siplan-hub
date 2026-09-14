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
  'implantadores_aderencia',
  'Conclusão da Análise de Aderência mais limpa',
  'O título redundante do campo de itens com impacto foi removido da conclusão da Análise de Aderência, mantendo o editor e as informações já preenchidas sem alterações.',
  '/implantadores/aderencia'
where not exists (
  select 1
  from public.notifications
  where category = 'changelog'
    and type = 'release_fix'
    and permission_resource = 'implantadores_aderencia'
    and title = 'Conclusão da Análise de Aderência mais limpa'
    and action_url = '/implantadores/aderencia'
);
