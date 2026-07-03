-- Migration para criar a tabela de pendências de conversão e triggers associados

CREATE TABLE IF NOT EXISTS public.conversion_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  ticket_number_0800 TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

-- Habilitar RLS
ALTER TABLE public.conversion_issues ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir tudo para manter compatibilidade com o schema atual)
CREATE POLICY "Permitir tudo em conversion_issues" ON public.conversion_issues
  FOR ALL USING (true) WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_conversion_issues_project_id ON public.conversion_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_conversion_issues_status ON public.conversion_issues(status);
CREATE INDEX IF NOT EXISTS idx_conversion_issues_assigned_to ON public.conversion_issues(assigned_to);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_conversion_issues_updated_at ON public.conversion_issues;
CREATE TRIGGER update_conversion_issues_updated_at
  BEFORE UPDATE ON public.conversion_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Trigger de logs automáticos na timeline do projeto
CREATE OR REPLACE FUNCTION public.fn_conversion_issues_log_timeline()
RETURNS TRIGGER AS $$
DECLARE
  v_author TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.timeline_events (
      project_id,
      type,
      author,
      message,
      timestamp,
      metadata
    ) VALUES (
      NEW.project_id,
      'comment',
      NEW.reported_by,
      'Pendência de conversão relatada: "' || NEW.title || '"' || COALESCE(' (Chamado 0800 #' || NEW.ticket_number_0800 || ')', ''),
      NOW(),
      jsonb_build_object('action', 'issue_created', 'issue_id', NEW.id, 'priority', NEW.priority)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
      -- Determinar nome do autor da resolução
      SELECT COALESCE(full_name, email, 'Sistema') INTO v_author
      FROM public.profiles
      WHERE id = NEW.resolved_by;
      
      IF v_author IS NULL THEN
        v_author := 'Sistema';
      END IF;

      INSERT INTO public.timeline_events (
        project_id,
        type,
        author,
        message,
        timestamp,
        metadata
      ) VALUES (
        NEW.project_id,
        'field_change',
        v_author,
        'Pendência de conversão resolvida: "' || NEW.title || '"' || COALESCE('. Notas: ' || NEW.resolution_notes, ''),
        NOW(),
        jsonb_build_object('action', 'issue_resolved', 'issue_id', NEW.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversion_issues_log_timeline ON public.conversion_issues;
CREATE TRIGGER trg_conversion_issues_log_timeline
  AFTER INSERT OR UPDATE ON public.conversion_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_conversion_issues_log_timeline();
