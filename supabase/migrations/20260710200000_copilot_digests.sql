-- Migration: resumo diario automatico do portfolio (gerado pelo worker 1x/dia).
-- O worker gera um resumo executivo e grava aqui; o frontend mostra o mais recente
-- na tela do copiloto. Uma linha por dia (for_date unico).

CREATE TABLE IF NOT EXISTS public.copilot_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  for_date DATE NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.copilot_digests ENABLE ROW LEVEL SECURITY;

-- Qualquer usuario autenticado pode ler o resumo; o worker escreve via service_role.
CREATE POLICY "copilot_digests read" ON public.copilot_digests
  FOR SELECT USING (auth.uid() IS NOT NULL);
