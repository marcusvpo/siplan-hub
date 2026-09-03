-- Migration: 20260903130000_add_infra_hardware_permission.sql
-- Description: Insere a permissão para a nova tela de Infraestrutura & Hardware no painel de administração

INSERT INTO public.app_permissions (resource, action, role, description)
VALUES 
  ('infra_hardware', 'view', 'admin', 'Visualizar tela de Infraestrutura e Hardware no painel de administração')
ON CONFLICT (resource, action, role) DO NOTHING;
