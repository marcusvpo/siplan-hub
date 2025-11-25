-- Adicionar novos campos na tabela projects para a seção "Dados do Projeto"
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS op_number integer,
ADD COLUMN IF NOT EXISTS sales_order_number integer,
ADD COLUMN IF NOT EXISTS sold_hours numeric,
ADD COLUMN IF NOT EXISTS legacy_system text,
ADD COLUMN IF NOT EXISTS specialty text;