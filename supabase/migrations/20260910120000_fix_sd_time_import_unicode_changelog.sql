-- Informa os usuários autorizados sobre a correção da importação de horas do SD.
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
  'release_fix',
  'sd_time_management',
  'Correção na importação de horas do SD',
  'A importação geral de horas agora trata caracteres Unicode incompatíveis presentes nas descrições do 0800, evitando falhas ao atualizar os lançamentos importados.',
  '/sd/consulta-horas'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications
  WHERE category = 'changelog'
    AND type = 'release_fix'
    AND permission_resource = 'sd_time_management'
    AND title = 'Correção na importação de horas do SD'
    AND action_url = '/sd/consulta-horas'
);
