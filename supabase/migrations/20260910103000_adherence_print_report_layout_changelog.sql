-- Informa os usuários autorizados sobre o novo relatório oficial da Aderência.
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
  'implantadores_aderencia',
  'Novo relatório da Análise de Aderência',
  'O relatório oficial da Análise de Aderência foi reorganizado para aproveitar melhor a folha A4. A nova versão inclui resumo executivo, metadados equilibrados, respostas compactas, observações em largura total, galerias proporcionais à quantidade de evidências e quebras de página mais previsíveis.',
  '/implantadores/aderencia'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_improvement'
    AND permission_resource = 'implantadores_aderencia'
    AND title = 'Novo relatório da Análise de Aderência'
    AND action_url = '/implantadores/aderencia'
);
