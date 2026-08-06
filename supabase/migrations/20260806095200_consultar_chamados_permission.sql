-- Migration: Registrar permissão para Consulta de Chamados e criar RPC de clientes distintos.
--
-- 1) Registra o recurso chamados_query
INSERT INTO public.app_permissions (resource, action, description) VALUES
    ('chamados_query', 'view', 'Visualizar a tela de Consultar Chamados')
ON CONFLICT (resource, action) DO UPDATE
    SET description = EXCLUDED.description;

-- 2) Associa a permissão ao perfil admin
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.app_roles r, public.app_permissions p
WHERE r.name = 'admin' AND p.resource = 'chamados_query'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3) Herda a permissão para qualquer perfil que já visualiza 'projects'
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT rp.role_id, novo.id
FROM public.app_role_permissions rp
JOIN public.app_permissions atual
  ON atual.id = rp.permission_id
 AND atual.resource = 'projects'
 AND atual.action = 'view'
JOIN public.app_permissions novo
  ON novo.resource = 'chamados_query'
 AND novo.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4) Função helper para retornar a lista de clientes distintos na tabela chamados_0800
CREATE OR REPLACE FUNCTION public.get_distinct_chamados_clientes()
RETURNS TABLE (nome_cliente text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT nome_cliente 
  FROM public.chamados_0800 
  WHERE nome_cliente IS NOT NULL 
  ORDER BY nome_cliente;
$$;

-- Concede privilégio de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_distinct_chamados_clientes() TO authenticated;
