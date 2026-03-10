-- Create RBAC tables
CREATE TABLE IF NOT EXISTS public.app_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(resource, action)
);

CREATE TABLE IF NOT EXISTS public.app_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.app_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(role_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_role_permissions ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
-- Allow anyone to read roles and permissions
CREATE POLICY "Allow read access to app_roles" ON public.app_roles FOR SELECT USING (true);
CREATE POLICY "Allow read access to app_permissions" ON public.app_permissions FOR SELECT USING (true);
CREATE POLICY "Allow read access to app_role_permissions" ON public.app_role_permissions FOR SELECT USING (true);

-- Allow admins to manage roles and permissions
CREATE POLICY "Allow admin to manage app_roles" ON public.app_roles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
CREATE POLICY "Allow admin to manage app_permissions" ON public.app_permissions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
CREATE POLICY "Allow admin to manage app_role_permissions" ON public.app_role_permissions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Seed basic roles
INSERT INTO public.app_roles (name, description) VALUES
    ('admin', 'Administrador do sistema com acesso total'),
    ('user', 'Usuário padrão do sistema')
ON CONFLICT (name) DO NOTHING;

-- Seed some basic permissions
INSERT INTO public.app_permissions (resource, action, description) VALUES
    -- Projetos
    ('projects', 'view', 'Visualizar Projetos'),
    ('projects', 'create', 'Criar Projetos'),
    ('projects', 'edit', 'Editar Projetos'),
    ('projects', 'delete', 'Excluir Projetos'),
    
    -- Arquivos
    ('files', 'upload', 'Fazer upload de arquivos'),
    ('files', 'download', 'Baixar arquivos'),
    ('files', 'delete', 'Excluir arquivos'),
    
    -- Menus / Seções Principais (Acesso)
    ('menu_implantacao', 'view', 'Acesso ao menu de Implantação'),
    ('menu_calendario', 'view', 'Acesso ao menu de Calendário'),
    ('menu_comercial', 'view', 'Acesso ao menu Comercial'),
    ('menu_conversao', 'view', 'Acesso ao menu de Conversão'),
    ('menu_orion', 'view', 'Acesso ao menu OrionTN Models'),
    ('menu_reports', 'view', 'Acesso aos Relatórios e Analytics'),

    -- Sub-menus Comercial
    ('commercial_customers', 'view', 'Visualizar Clientes (Comercial)'),
    ('commercial_blockers', 'view', 'Visualizar Bloqueios (Comercial)'),
    ('commercial_contacts', 'view', 'Visualizar Contatos (Comercial)'),

    -- Sub-menus Conversão
    ('conversion_home', 'view', 'Visualizar Gestão de Atividades (Conversão)'),
    ('conversion_engines', 'view', 'Visualizar Motores (Conversão)'),
    ('conversion_homologation', 'view', 'Visualizar Homologação (Conversão)'),

    -- Sub-menus Calendário
    ('calendar_projects', 'view', 'Visualizar Calendário de Projetos'),
    ('calendar_analysts', 'view', 'Visualizar Agenda dos Analistas'),

    -- OrionTN Models
    ('orion_dashboard', 'view', 'Visualizar Dashboard (OrionTN)'),
    ('orion_projects', 'view', 'Visualizar Projetos (OrionTN)'),
    ('orion_editor', 'view', 'Acesso ao Editor de Modelos (OrionTN)'),
    ('orion_export', 'execute', 'Exportar Modelos XML (OrionTN)'),

    -- Administração
    ('users', 'manage', 'Gerenciar Usuários (Admin)'),
    ('teams', 'manage', 'Gerenciar Equipes (Admin)'),
    ('roles', 'manage', 'Gerenciar Perfis de Acesso (Admin)'),
    ('audit_logs', 'view', 'Visualizar Logs de Auditoria (Admin)'),
    ('vacations', 'manage', 'Gerenciar Férias (Admin)'),
    ('settings', 'manage', 'Gerenciar Configurações Globais do Sistema (Admin)')
ON CONFLICT (resource, action) DO NOTHING;

-- Associate all permissions to admin role
INSERT INTO public.app_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.app_roles r, public.app_permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Trigger for updated_at on app_roles
CREATE TRIGGER update_app_roles_updated_at
BEFORE UPDATE ON public.app_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
