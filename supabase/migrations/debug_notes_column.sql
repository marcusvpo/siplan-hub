-- 1. Verificar a estrutura da tabela 'projects' para garantir que a coluna 'notes' existe e é JSONB
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'projects' 
    AND column_name = 'notes';

-- 2. Verificar o conteúdo atual da coluna 'notes' para um projeto específico (substitua o ID se souber, ou pegue o último atualizado)
SELECT 
    id, 
    client_name, 
    updated_at, 
    notes 
FROM 
    projects 
ORDER BY 
    updated_at DESC 
LIMIT 5;

-- 3. Testar um UPDATE manual para ver se o banco aceita a escrita na coluna 'notes'
-- Substitua 'ID_DO_PROJETO' por um ID real retornado na query anterior
-- UPDATE projects 
-- SET notes = '{"id": "test-id", "blocks": [{"id": "1", "type": "paragraph", "content": "Teste de escrita manual via SQL"}]}'::jsonb 
-- WHERE id = 'ID_DO_PROJETO';

-- 4. Verificar logs de erro ou permissões (RLS)
-- Se o RLS estiver ativo, verifique se a policy permite UPDATE na coluna 'notes'
SELECT * FROM pg_policies WHERE tablename = 'projects';
