---
name: weekly-executive-report
description: Especialista na geração do Relatório Executivo Semanal de Projetos de Implantação para a Diretoria do Siplan HUB via @react-pdf/renderer e análise estratégica por IA.
allowed-tools: Read, Write, Edit, run_command
version: 1.0
priority: HIGH
---

# Skill: Relatório Executivo Semanal de Implantação (Antigravity AI)

Esta skill guia o agente na consolidação de dados em tempo real do Supabase e na geração do Relatório Executivo Semanal em PDF oficial utilizando `@react-pdf/renderer` para a Diretoria de Operações do Siplan HUB.

---

## 1. Gatilhos de Ativação

Ative este fluxo sempre que o usuário solicitar:
- "Gere o relatório semanal da diretoria"
- "Relatório de implantação da semana"
- "Resumo semanal dos projetos de implantação"
- "Relatório executivo semanal em PDF"
- `/relatorio-semanal` ou `/relatorio-diretoria`
- Notificações de cron agendado (segundas-feiras às 08:30h)

---

## 2. Conteúdo e Regras de Negócio Obrigatórias

O relatório contempla 8 dimensões operacionais auditadas:
1. **Avanço de Etapas:** Projetos com movimentação nos últimos 7 dias via `audit_logs` e datas de etapas.
2. **Início da Fase 1 nesta Semana:** Cartórios com `implementation_start_date` no intervalo de segunda a domingo da semana atual.
3. **Gargalos de Infraestrutura:** Projetos com `infra_status = 'in_progress'` ordenados pelos que estão há mais dias esperando liberação.
4. **Configurações de Ambiente da Semana:** Prazos calculados via regra oficial de `calculateEnvironmentTargetDate` (última sexta-feira anterior à Fase 1) e níveis de urgência SLA de `/deployments/environment-config`.
5. **Implantações Confirmadas vs Previstas:** Status de confirmação da agenda da Fase 1 nos próximos 45 dias.
6. **Fila de Conversão por Responsável:** Demandas em `public.conversion_queue` agrupadas por analista responsável.
7. **Pós-Implantação iniciando nesta Semana:** Regra oficial: o ciclo de pós-implantação (2 semanas) inicia pontualmente na primeira segunda-feira subsequente ao término da Fase 1 (`implementation_end_date` da semana anterior).
8. **Evolução Técnica do Siplan HUB:** Changelog extraído de `public.notifications` com `category = 'changelog'`.
9. **Parecer Executivo & Insights da IA:** Análise estratégica profunda em texto formal redigida pelo Antigravity com diagnósticos, riscos e recomendações táticas.

---

## 3. Como Executar a Geração

### Passo 1: Executar o Coletor e Gerador Oficial
Execute no terminal o comando:
```bash
npx tsx scripts/reports/generate-weekly-executive-report.ts
```

### Passo 2: Se Necessário Fornecer Parecer Customizado
O script aceita como parâmetro opcional o caminho de um arquivo JSON contendo a estrutura `AiExecutiveSummary`:
```json
{
  "overview": "Visão geral estratégica da semana...",
  "highlights": ["Destaque 1", "Destaque 2"],
  "criticalRisks": ["Risco 1", "Risco 2"],
  "strategicActions": ["Ação 1", "Ação 2"]
}
```
Exemplo de execução com síntese da IA:
```bash
npx tsx scripts/reports/generate-weekly-executive-report.ts caminho/do/resumo_ia.json
```

---

## 4. Apresentação no Chat

Após a geração com sucesso:
1. Apresente um resumo executivo claro em Markdown com os principais KPIs e destaques.
2. Forneça o link clicável direto para o arquivo PDF gerado:
   `[Abrir Relatório Executivo em PDF](file:///c:/Users/marcu/Desktop/Projects/siplan-hub/relatorios/Relatorio_Executivo_Implantacao_YYYY-MM-DD_Semana_WW.pdf)`
3. Destaque os 2 ou 3 pontos mais urgentes que requerem decisão imediata da Diretoria na semana.
