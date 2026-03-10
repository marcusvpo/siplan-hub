-- Script de Migração: Adição da etapa Modelos Editor para OrionTN
-- Data: 2026-03-10

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS modelos_editor_status TEXT NOT NULL DEFAULT 'todo',
ADD COLUMN IF NOT EXISTS modelos_editor_responsible TEXT,
ADD COLUMN IF NOT EXISTS modelos_editor_start_date DATE,
ADD COLUMN IF NOT EXISTS modelos_editor_end_date DATE,
ADD COLUMN IF NOT EXISTS modelos_editor_observations TEXT;

-- Atualizar o schema.sql global local para garantir que tipos fiquem sincronizados com supabase gen types
