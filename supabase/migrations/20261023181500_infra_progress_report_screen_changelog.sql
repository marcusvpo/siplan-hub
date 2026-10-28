-- Migration: 20261023181500_infra_progress_report_screen_changelog.sql
-- Description: Notificação de novidade (changelog) para a nova tela/aba Relatório Andamento Infra em /reports

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
  'release_feature',
  'reports',
  'Novo Relatório: Andamento Infraestrutura',
  'Adicionada nova visão analítica dedicada em Relatórios (/reports?tab=infra-progress): Relatório Andamento Infra. Permite auditar em tempo real todos os projetos com etapa 1 em andamento ou bloqueados, detalhando servidor, estações, tags e cronograma da Fase 1 (Treinamento & Acompanhamento com datas confirmadas e previstas), anotações com autosave e exportação executiva em PDF e HTML completo com notas.',
  '/reports?tab=infra-progress'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_feature'
    AND permission_resource = 'reports'
    AND title = 'Novo Relatório: Andamento Infraestrutura'
    AND action_url = '/reports?tab=infra-progress'
);
