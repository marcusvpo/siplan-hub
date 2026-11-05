---
name: react-pdf-reports
description: Diretrizes obrigatórias e padrões arquiteturais para geração de documentos e relatórios em PDF no Siplan HUB utilizando @react-pdf/renderer.
allowed-tools: Read, Write, Edit
version: 1.0
priority: CRITICAL
---

# Padrão Oficial de Relatórios e PDFs — Siplan HUB

> **REGRA FUNDAMENTAL:** O `@react-pdf/renderer` é a **única biblioteca oficial e obrigatória** para a criação, renderização e exportação de documentos e relatórios em PDF no Siplan HUB.

---

## 1. Diretrizes Estritas de Governança

1. **Proibições Absolutas:**
   - ❌ NUNCA crie scripts avulsos ou one-offs em Node/Python/PowerShell que gerem HTML estático temporário para impressão via headless Chrome/Edge.
   - ❌ NUNCA utilize `html2canvas` ou capturas de tela do DOM para criar PDFs (gera artefatos pesados, texto não selecionável e baixa fidelidade visual).
   - ❌ NUNCA use `window.print()` do navegador para fluxos de exportação de relatórios gerenciais ou operacionais.

2. **Obrigatoriedades:**
   - ✅ Todo novo relatório deve ser construído como componentes declarativos do `@react-pdf/renderer`.
   - ✅ Toda implementação deve consumir a camada modular `@/modules/pdf`.
   - ✅ As cores e tipografia devem consumir `pdfTokens` (`@/modules/pdf/styles/tokens`).
   - ✅ A geração e download devem utilizar o `pdfService` (`@/modules/pdf/services/pdfService`).

---

## 2. Estrutura da Camada `@/modules/pdf`

| Arquivo / Módulo | Finalidade |
|------------------|------------|
| `styles/tokens.ts` | Tokens corporativos: bordô `#881337`, slate `#0f172a`, tipografia Helvetica, tamanhos e margens A4. |
| `styles/base.ts` | Folha de estilos `StyleSheet.create` com estilos de página, containers, cartões e divisores. |
| `components/PdfHeader.tsx` | Cabeçalho institucional com título, subtítulo, dados do cartório/projeto e data. |
| `components/PdfFooter.tsx` | Rodapé com numeração automática de páginas (`render={({ pageNumber, totalPages }) => ...}`) e confidencialidade. |
| `components/PdfTable.tsx` | Tabela de dados modular com colunas tipadas, alinhamentos e zebrado alternado. |
| `components/PdfSummarySection.tsx` | Grade de cartões de resumo executivo e métricas / KPIs. |
| `components/PdfStatusBadge.tsx` | Badges de status semânticos (success, warning, danger, info, default). |
| `components/PdfSignatureBlock.tsx` | Bloco formal de assinaturas, data e responsabilidade técnica. |
| `services/pdfService.ts` | Métodos `downloadPdfDocument`, `openPdfPreview`, `generatePdfBlob` e `generatePdfBuffer`. |
| `templates/BaseReportTemplate.tsx` | Template de referência unindo cabeçalho, KPIs, tabela, notas e assinaturas. |

---

## 3. Como Criar um Novo Relatório

### 3.1. Usando o Template Base

```tsx
import React from 'react';
import { BaseReportTemplate, downloadPdfDocument } from '@/modules/pdf';

export function exportMeuRelatorio(dados: any) {
  const doc = (
    <BaseReportTemplate
      title="Relatório de Aderência e Implantação"
      subtitle="Auditoria de Requisitos Cartorários"
      clientName="2º Registro de Imóveis"
      projectName="Orion PRO"
      summaryItems={[
        { label: 'Total de Itens', value: 120, variant: 'info' },
        { label: 'Aderentes', value: 115, variant: 'success' },
        { label: 'Pontos de Atenção', value: 5, variant: 'warning' },
      ]}
      tableTitle="Itens Auditados"
      tableColumns={[
        { id: 'item', header: 'Requisito', width: '50%' },
        { id: 'status', header: 'Situação', width: '25%', align: 'center' },
        { id: 'impacto', header: 'Impacto', width: '25%', align: 'right' },
      ]}
      tableData={dados.itens}
      signatureParties={[
        { role: 'Responsável Técnico Siplan', name: 'Analista Responsável' },
        { role: 'Representante da Serventia', name: 'Oficial do Cartório' },
      ]}
    />
  );

  return downloadPdfDocument(doc, 'Relatorio_Aderencia_Cartorio.pdf');
}
```

### 3.2. Execução Programática e Headless (Scheduled Tasks)

Para tarefas agendadas, disparos de relatórios por e-mail ou workers em background:

```ts
import { generatePdfBuffer } from '@/modules/pdf';

// Retorna Uint8Array / Buffer limpo sem depender de window/DOM
const pdfBuffer = await generatePdfBuffer(meuDocumentoReactPdf);

// Salvar no Supabase Storage ou anexar ao e-mail:
await supabase.storage.from('reports').upload('relatorio.pdf', pdfBuffer, {
  contentType: 'application/pdf',
});
```
