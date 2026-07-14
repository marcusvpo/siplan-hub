-- Migration: adiciona um quarto tipo de job na fila dtc_ai_jobs.
-- 'voice_note': preenchimento por voz dos campos de texto rico. O analista grava um
-- audio no navegador (mobile ou PC), o frontend sobe o arquivo para o Storage
-- (bucket project-files, prefixo voice-notes/) e enfileira o job com o caminho em
-- audio_path. O worker da VM baixa o audio, transcreve LOCALMENTE com whisper.cpp
-- (sem chave, sem dado saindo da VM) e passa a transcricao pelo mesmo Claude que ja
-- roda na VM para gerar um texto profissional, devolvido em result_text.
--
-- Claude Code headless NAO ingere audio: a transcricao (o "ouvir") e feita pelo
-- whisper.cpp; o Claude apenas eleva o texto transcrito.

ALTER TABLE public.dtc_ai_jobs
  ADD COLUMN IF NOT EXISTS audio_path TEXT;

-- Estende o CHECK de job_type para incluir 'voice_note' (idempotente).
ALTER TABLE public.dtc_ai_jobs DROP CONSTRAINT IF EXISTS dtc_ai_jobs_job_type_check;
ALTER TABLE public.dtc_ai_jobs
  ADD CONSTRAINT dtc_ai_jobs_job_type_check
  CHECK (job_type IN ('dtc_summary', 'improve_text', 'summary_blocks', 'voice_note'));

-- O claim atomico (claim_dtc_ai_job) retorna a linha inteira e nao filtra por
-- job_type, entao os jobs 'voice_note' sao reivindicados sem alteracao na RPC.
