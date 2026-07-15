-- SEGURANCA: fecha o acesso ANONIMO a sete tabelas.
--
-- O PROBLEMA
-- Estas policies foram criadas com `TO public`. Em Postgres, o role `public`
-- inclui `anon` -- nao e "qualquer usuario logado", e QUALQUER UM. Como a chave
-- anon do Supabase vai no bundle JavaScript do site, ela e publica por
-- construcao. Combinado com `USING (true) WITH CHECK (true)`, isso significa
-- que qualquer pessoa na internet podia ler, inserir, alterar e apagar estas
-- tabelas sem ter conta:
--
--   conversion_queue        -- fila de conversao inteira
--   conversion_issues       -- pendencias tecnicas dos clientes
--   conversion_activity_log -- historico de atividade
--   notifications           -- notificacoes de todo mundo
--   team_areas              -- estrutura de times
--   model_generation_jobs   -- fila de IA (enfileirar = gastar credito Claude)
--   dtc_ai_jobs             -- idem
--
-- POR QUE ESTA MUDANCA E SEGURA
-- 1. Nao afeta usuario logado: a expressao continua `true`, so o role muda de
--    `public` para `authenticated`. Quem tem sessao passa igual.
-- 2. Nao afeta as paginas publicas (/roadmap/:token, /public/checklist/:id,
--    /public/infra-coleta/:id): nenhuma delas le estas tabelas -- usam
--    form_templates, commercial_checklists, roadmaps e projects, intocadas aqui.
-- 3. Nao afeta o vm-worker: ele usa SUPABASE_SECRET_KEY (service_role), que
--    ignora RLS por definicao (ver vm-worker/src/config.ts).
--
-- ALTER POLICY ... TO troca so o role e preserva a expressao. Nao ha janela em
-- que a tabela fique sem policy, ao contrario de DROP + CREATE.

ALTER POLICY "Allow all conversion_queue"
  ON public.conversion_queue TO authenticated;

ALTER POLICY "Permitir tudo em conversion_issues"
  ON public.conversion_issues TO authenticated;

ALTER POLICY "Allow all activity_log"
  ON public.conversion_activity_log TO authenticated;

ALTER POLICY "Allow all notifications"
  ON public.notifications TO authenticated;

ALTER POLICY "Allow all team_areas"
  ON public.team_areas TO authenticated;

ALTER POLICY "Permitir tudo em model_generation_jobs"
  ON public.model_generation_jobs TO authenticated;

ALTER POLICY "Permitir tudo em dtc_ai_jobs"
  ON public.dtc_ai_jobs TO authenticated;

ALTER POLICY "Leitura do heartbeat do worker"
  ON public.model_worker_heartbeat TO authenticated;

-- NAO INCLUIDO DE PROPOSITO: profiles.SELECT ("Public profiles are viewable by
-- everyone", TO public USING true) tambem expoe nome/email/role de todos os
-- usuarios ao anonimo. Nao mexemos aqui porque as paginas publicas podem
-- depender de ler o nome do responsavel, e derrubar o acesso do cliente e pior
-- que a exposicao. Precisa de verificacao propria antes.
