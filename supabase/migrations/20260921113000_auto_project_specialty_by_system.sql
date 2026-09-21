-- Atualização dos projetos existentes de acordo com o Sistema Principal
UPDATE public.projects
SET specialty = 'Notas'
WHERE system_type = 'Orion TN';

UPDATE public.projects
SET specialty = 'Protesto'
WHERE system_type = 'Orion PRO';

UPDATE public.projects
SET specialty = 'TDPJ'
WHERE system_type IN ('Orion REG', 'Orion Reg TDPJ');

UPDATE public.projects
SET specialty = 'Registro de Imóveis'
WHERE system_type IN ('WEBRI', 'WebRI', 'WEB RI');

-- Normalizar possíveis especialidades legadas restantes
UPDATE public.projects
SET specialty = 'Registro Civil'
WHERE specialty = 'registro_civil';

UPDATE public.projects
SET specialty = 'Registro de Imóveis'
WHERE specialty = 'registro_imoveis';

-- Registro de notificação no changelog (Regra 12 AGENTS.md)
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
  'projects',
  'Projetos: Especialidade automática por Sistema',
  'O campo Especialidade agora é preenchido automaticamente de acordo com o Sistema (Orion TN -> Notas, Orion PRO -> Protesto, Orion REG -> TDPJ, WEBRI -> Registro de Imóveis), com padronização dos valores e exibição da especialidade nos cards de projetos ativos.',
  '/projects'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications existing
  WHERE existing.category = 'changelog'
    AND existing.type = 'release_improvement'
    AND existing.permission_resource = 'projects'
    AND existing.title = 'Projetos: Especialidade automática por Sistema'
    AND existing.action_url = '/projects'
);
