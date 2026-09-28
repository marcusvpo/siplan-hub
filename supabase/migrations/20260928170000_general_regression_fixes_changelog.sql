-- Registra as correções validadas na revisão geral de 28/09/2026.
-- Somente notificações: não altera permissões, policies ou dados de projetos.
INSERT INTO public.notifications (
  category, type, permission_resource, title, message, action_url
)
SELECT 'changelog', 'release_fix', fix.permission_resource, fix.title,
       fix.message, fix.action_url
FROM (VALUES
  ('projects', 'Recuperação de acesso e notificações no celular',
   'Falhas temporárias ao carregar o perfil ou as permissões agora mostram uma mensagem com nova tentativa. As notificações se adaptam ao celular, exibem textos completos e permitem repetir o carregamento quando houver erro.',
   '/projects'),
  ('orion_updates', 'Manutenção da Central de Atualizações corrigida',
   'Links públicos de posts exibem a mensagem de manutenção sem interromper a tela. O carregamento mantém o foco acessível e a ordenação continua consistente.',
   '/atualizacoes'),
  ('reports', 'Filtros interativos dos gráficos corrigidos',
   'A seleção por natureza de chamado, mês do NPS, data e analista voltou a aplicar os filtros corretos nos gráficos e relatórios.',
   '/reports'),
  ('implantadores_transicao', 'Preservação dos dados na transição',
   'A gravação do documento de transição preserva os campos já preenchidos de ambiente e pós-implantação, incluindo acompanhamento, datas e configurações.',
   '/implantadores/transicao'),
  ('cs_cx_registros', 'Autoria e data das observações de solicitações',
   'O histórico de observações exibe o responsável e a data registrados no atendimento, usando os dados corretos da solicitação.',
   '/cs-cx/registros'),
  ('projects', 'Carregamento da aplicação mais leve',
   'O layout autenticado e as bibliotecas de formulários são carregados em arquivos menores. O build passa a verificar tamanho e ciclos de dependência, com cobertura de navegador para login e PWA offline.',
   '/projects')
) AS fix(permission_resource, title, message, action_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.category = 'changelog' AND n.type = 'release_fix'
    AND n.permission_resource = fix.permission_resource
    AND n.title = fix.title AND n.action_url = fix.action_url
);
