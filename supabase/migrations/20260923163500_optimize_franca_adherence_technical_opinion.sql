-- Migration: 20260923163500_optimize_franca_adherence_technical_opinion.sql
-- Otimização e resumo conciso do Parecer Técnico de Aderência do 2º RI de Franca (#758315) em texto limpo

-- 1. Atualizar finalNotes na resposta do formulário com resumo objetivo (sem cabeçalhos redundantes e sem tags/JSON)
UPDATE public.project_form_responses
SET 
  data = jsonb_set(
    data,
    '{finalNotes}',
    to_jsonb($TEXT_NORMAL$O sistema Orion REG mostrou-se plenamente aderente à operação da serventia, sem nenhum bloqueio de produto (0 gaps impeditivos). Foram mapeados 10 pontos de atenção prioritários para parametrização e treinamento:

1. Protocolos independentes: configurar contadores próprios para TD, PJ e Certidões.
2. Depósitos prévios: capacitar o financeiro no relatório nativo de devolução de saldos pendentes (> 60 dias).
3. Tabela de Custas TJ-SP: parametrizar detalhadamente as regras de cálculo e variáveis de orçamento prévio.
4. Notas Devolutivas: ajustar o fluxo de reentrada e sequências de controle apontadas.
5. Máscara de Averbações: adotar o padrão operacional [Protocolo]/[Registro] (ex.: 71855/5022).
6. Encadeamento de PJ: capacitar operadores no encadeamento de atos constitutivos e representação societária.
7. Certidões: unificar o controle sequencial entre RTD e RCPJ.
8. Imagens: mapear caminho UNC no servidor para busca e acervo histórico consolidado.
9. Livro Caixa: alinhar conciliação diária e fechamento consolidado (Provimento 45 CNJ).
10. Integração com Site: disponibilizar API de consulta pública de andamento de protocolos.$TEXT_NORMAL$::text)
  ),
  updated_at = NOW()
WHERE project_id = '3cf838a8-cd45-472a-84fc-40992f9b2f7d' AND stage = 'adherence';

-- 2. Atualizar as observações do projeto com texto conciso e direto
UPDATE public.projects
SET 
  adherence_observations = 'Aderente com Restrições (85,3% de aderência e 0 gaps de produto). Mapeados 10 pontos de atenção para parametrização e treinamento de RTD/RCPJ com o implantador Julio Araujo.'
WHERE id = '3cf838a8-cd45-472a-84fc-40992f9b2f7d';
