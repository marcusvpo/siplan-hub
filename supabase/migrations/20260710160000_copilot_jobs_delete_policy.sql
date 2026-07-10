-- Migration: permite o usuario limpar a propria conversa do Copiloto.
-- O botao "Limpar conversa" apaga os copilot_jobs do proprio usuario; sem uma
-- policy de DELETE a RLS bloquearia a operacao.

CREATE POLICY "copilot_jobs self delete" ON public.copilot_jobs
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
