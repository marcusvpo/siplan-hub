-- Criar tabela de projetos
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  system_type TEXT NOT NULL,
  project_leader TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_update_by TEXT NOT NULL,
  next_follow_up_date DATE,
  
  -- Estágios
  infra_status TEXT NOT NULL DEFAULT 'todo',
  infra_responsible TEXT,
  infra_start_date DATE,
  infra_end_date DATE,
  infra_blocking_reason TEXT,
  infra_observations TEXT,
  
  adherence_status TEXT NOT NULL DEFAULT 'todo',
  adherence_responsible TEXT,
  adherence_start_date DATE,
  adherence_end_date DATE,
  adherence_has_product_gap BOOLEAN DEFAULT false,
  adherence_dev_ticket TEXT,
  adherence_dev_estimated_date DATE,
  adherence_observations TEXT,
  
  environment_status TEXT NOT NULL DEFAULT 'todo',
  environment_responsible TEXT,
  environment_real_date DATE,
  environment_os_version TEXT,
  environment_approved_by_infra BOOLEAN DEFAULT false,
  environment_observations TEXT,
  
  conversion_status TEXT NOT NULL DEFAULT 'todo',
  conversion_responsible TEXT,
  conversion_source_system TEXT,
  conversion_observations TEXT,
  
  implementation_status TEXT NOT NULL DEFAULT 'todo',
  implementation_responsible TEXT,
  implementation_remote_install_date DATE,
  implementation_training_start_date DATE,
  implementation_training_end_date DATE,
  implementation_switch_type TEXT,
  implementation_observations TEXT,
  
  post_status TEXT NOT NULL DEFAULT 'todo',
  post_responsible TEXT,
  post_start_date DATE,
  post_end_date DATE,
  post_observations TEXT
);

-- Criar tabela de eventos da timeline
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('auto', 'comment')),
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Criar tabela de arquivos
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mime_type TEXT
);

-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir tudo por enquanto, pois será usado apenas por 2 pessoas)
CREATE POLICY "Permitir tudo em projetos" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em timeline_events" ON public.timeline_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em project_files" ON public.project_files FOR ALL USING (true) WITH CHECK (true);

-- Criar índices
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX idx_timeline_events_project_id ON public.timeline_events(project_id);
CREATE INDEX idx_timeline_events_timestamp ON public.timeline_events(timestamp DESC);
CREATE INDEX idx_project_files_project_id ON public.project_files(project_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket de storage para arquivos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', false)
ON CONFLICT DO NOTHING;

-- Políticas de storage
CREATE POLICY "Permitir upload de arquivos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Permitir leitura de arquivos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'project-files');

CREATE POLICY "Permitir deletar arquivos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'project-files');