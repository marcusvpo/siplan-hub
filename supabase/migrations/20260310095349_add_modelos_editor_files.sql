-- Script de Migração: Adição de campos de anexo para Modelos Editor
-- Data: 2026-03-10

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS modelos_editor_sent_files JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS modelos_editor_available_files JSONB DEFAULT '[]'::jsonb;
