-- Migration: Atualizar check constraint de webhook_sync_status para permitir 'syncing'

ALTER TABLE public.assistant_knowledge_versions 
  DROP CONSTRAINT IF EXISTS assistant_knowledge_versions_webhook_sync_status_check;

ALTER TABLE public.assistant_knowledge_versions 
  ADD CONSTRAINT assistant_knowledge_versions_webhook_sync_status_check 
  CHECK (webhook_sync_status IN ('pending', 'syncing', 'synced', 'failed'));

-- Atualizar também na tabela de logs caso exista constraint
ALTER TABLE public.assistant_knowledge_sync_logs 
  DROP CONSTRAINT IF EXISTS assistant_knowledge_sync_logs_status_check;

ALTER TABLE public.assistant_knowledge_sync_logs 
  ADD CONSTRAINT assistant_knowledge_sync_logs_status_check 
  CHECK (status IN ('pending', 'syncing', 'synced', 'failed'));
