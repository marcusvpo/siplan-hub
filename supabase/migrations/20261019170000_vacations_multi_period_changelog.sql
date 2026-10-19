-- Migration: 20261019170000_vacations_multi_period_changelog.sql
-- Notificação de changelog para a gestão de múltiplos períodos de férias por implantador
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
  'vacations',
  'Gestão de Múltiplos Períodos de Férias por Implantador',
  'A tela de Gestão de Férias (/admin/vacations) agora permite cadastrar, editar e remover múltiplos períodos de descanso para cada implantador. Conta com visualização em cards por colaborador, lista geral cronológica, cálculo dinâmico de dias corridos, alerta de sobreposição de datas e sincronização 100% automática com a Timeline (/calendar) e a etapa Fase 1.',
  '/admin/vacations'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'vacations'
    AND title = 'Gestão de Múltiplos Períodos de Férias por Implantador'
    AND action_url = '/admin/vacations'
);
