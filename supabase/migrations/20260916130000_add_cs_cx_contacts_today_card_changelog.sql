INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
)
SELECT
  'changelog',
  'release_improvement',
  'cs_cx_contatos',
  'Contatos realizados hoje em destaque',
  'A tela de Contatos do CS/CX agora conta com um card que mostra os contatos realizados hoje e facilita o acompanhamento da equipe a cada dia.',
  '/cs-cx/contatos'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'cs_cx_contatos'
    AND title = 'Contatos realizados hoje em destaque'
    AND action_url = '/cs-cx/contatos'
);
