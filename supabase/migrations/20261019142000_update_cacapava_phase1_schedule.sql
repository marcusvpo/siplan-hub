-- Atualiza os projetos de CAÇAPAVA - REGISTRO IMOVEIS E ANEXOS (#763098 Orion REG e #763114 Orion PRO)
-- com o período confirmado de Fase 1 (23/11/2026 a 27/11/2026) e os responsáveis Julio Araujo e Rodrigo Mizuno.

UPDATE public.projects
SET
  implementation_responsible = 'Julio Araujo',
  implementation_responsible_id = (
    SELECT user_id FROM public.responsible_name_mapping WHERE name = 'Julio Araujo' LIMIT 1
  ),
  implementation_phase1 = jsonb_build_object(
    'status', 'todo',
    'responsible', 'Julio Araujo',
    'startDate', '2026-11-23T15:00:00.000Z',
    'endDate', '2026-11-27T15:00:00.000Z',
    'isConfirmed', true,
    'observations', 'Implantação conjunta na semana de 23/11 a 27/11 pelo Julio Araújo (Orion REG #763098) e Rodrigo Mizuno (Orion PRO #763114) - Data confirmada previamente pelo cliente.'
  ),
  related_tickets = '[{"name": "CAÇAPAVA - REGISTRO IMOVEIS E ANEXOS (Orion PRO)", "number": "763114"}]'::jsonb,
  updated_at = now()
WHERE ticket_number IN ('763098', '#763098')
  AND is_deleted = false;

UPDATE public.projects
SET
  implementation_responsible = 'Rodrigo Mizuno',
  implementation_responsible_id = (
    SELECT user_id FROM public.responsible_name_mapping WHERE name = 'Rodrigo Mizuno' LIMIT 1
  ),
  implementation_phase1 = jsonb_build_object(
    'status', 'todo',
    'responsible', 'Rodrigo Mizuno',
    'startDate', '2026-11-23T15:00:00.000Z',
    'endDate', '2026-11-27T15:00:00.000Z',
    'isConfirmed', true,
    'observations', 'Implantação conjunta na semana de 23/11 a 27/11 pelo Julio Araújo (Orion REG #763098) e Rodrigo Mizuno (Orion PRO #763114) - Data confirmada previamente pelo cliente.'
  ),
  related_tickets = '[{"name": "CAÇAPAVA - REGISTRO IMOVEIS E ANEXOS (Orion REG)", "number": "763098"}]'::jsonb,
  updated_at = now()
WHERE ticket_number IN ('763114', '#763114')
  AND is_deleted = false;
