-- Migration: Release da Super Agenda dos Analistas (Changelog Notification)
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
  'calendar_analysts',
  'Nova Super Agenda Geral dos Analistas no Siplan HUB',
  'Substituição definitiva da antiga agenda externa do SAP pela nova Super Agenda nativa. Integração 100% em tempo real com as implantações previstas e confirmadas (Fase 1), agendamentos de Aderência (Etapa 2), Homologação de Conversão (Etapa 3), puxada de chamados do Ellevo 0800 por número de chamado, réguas de horários com divisão proporcional de turnos, comparação multi-analista lado a lado no Dia e proteção preventiva contra conflitos de férias e feriados forenses (2026-2028).',
  '/agenda-analistas'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_feature'
    AND permission_resource = 'calendar_analysts'
    AND action_url = '/agenda-analistas'
);
