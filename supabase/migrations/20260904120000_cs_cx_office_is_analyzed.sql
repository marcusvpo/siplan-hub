-- Adiciona coluna is_analyzed na tabela cs_cx_registry_offices para controle manual de análise por interruptor (switch)
ALTER TABLE public.cs_cx_registry_offices
ADD COLUMN IF NOT EXISTS is_analyzed BOOLEAN NOT NULL DEFAULT false;

-- Atualiza cartórios que já possuíam todos os itens de rotina analisados para is_analyzed = true
UPDATE public.cs_cx_registry_offices ro
SET is_analyzed = true
WHERE EXISTS (
  SELECT 1
  FROM public.cs_cx_office_routines routine
  JOIN public.cs_cx_office_routine_items item ON item.office_routine_id = routine.id
  WHERE routine.registry_office_id = ro.id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.cs_cx_office_routines routine
  JOIN public.cs_cx_office_routine_items item ON item.office_routine_id = routine.id
  WHERE routine.registry_office_id = ro.id
  AND item.analyzed_at IS NULL
);

-- Registro de notificação do changelog para a novidade
INSERT INTO public.notifications (
  category,
  type,
  permission_resource,
  title,
  message,
  action_url
) VALUES (
  'changelog',
  'release_feature',
  'cs_cx_rotinas',
  'Controle de Análise de Cartórios por Interruptor',
  'Adicionado controle manual via interruptor (switch) para alterar a situação de análise dos cartórios na tela de Rotinas, refletindo diretamente nos indicadores.',
  '/cs-cx/rotinas'
);
