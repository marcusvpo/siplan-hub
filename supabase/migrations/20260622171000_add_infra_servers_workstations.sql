-- Script de Migração: Adição das colunas infra_servers e infra_workstations
-- Data: 22/06/2026

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS infra_servers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS infra_workstations JSONB DEFAULT '[]'::jsonb;
