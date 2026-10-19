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
  'calendar_projects',
  'Nova Timeline Executiva e Interativa de Implantações',
  'A tela de Calendário de Projetos (/calendar) foi reformulada como uma Timeline Executiva em estilo Gantt por Trimestres e 12 Meses, 100% integrada à etapa Fase 1 (Treinamento & Acompanhamento). Inclui visualização de férias dos implantadores, filtros por sistema (Orion REG, PRO e TN), mapa de simultaneidade semanal, Pipeline Sem Data Definida, Hover Card com todas as observações e edição rápida diretamente pela barra.',
  '/calendar'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'calendar_projects'
    AND title = 'Nova Timeline Executiva e Interativa de Implantações'
    AND action_url = '/calendar'
);
