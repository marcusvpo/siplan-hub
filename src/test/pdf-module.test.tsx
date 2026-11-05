import React from 'react';
import { describe, it, expect } from 'vitest';
import {
  pdfTokens,
  basePdfStyles,
  PdfHeader,
  PdfFooter,
  PdfStatusBadge,
  PdfSummarySection,
  PdfTable,
  PdfSignatureBlock,
  BaseReportTemplate,
  generatePdfBlob,
  generatePdfBuffer,
} from '@/modules/pdf';

describe('Módulo de PDF Oficial — @react-pdf/renderer', () => {
  it('exporta tokens de design alinhados ao Siplan HUB', () => {
    expect(pdfTokens.colors.primary).toBe('#881337');
    expect(pdfTokens.colors.navy).toBe('#0f172a');
    expect(pdfTokens.fonts.family).toBe('Helvetica');
  });

  it('exporta estilos base estruturados', () => {
    expect(basePdfStyles.page).toBeDefined();
    expect(basePdfStyles.pageLandscape).toBeDefined();
    expect(basePdfStyles.card).toBeDefined();
  });

  it('monta o documento de template padrão com dados válidos', () => {
    const doc = (
      <BaseReportTemplate
        title="Relatório de Homologação"
        subtitle="Auditoria de Implantação e Transição"
        clientName="Cartório de Teste da Comarca"
        projectName="Orion PRO e Orion TN"
        summaryItems={[
          { label: 'Total de Etapas', value: 5, variant: 'info' },
          { label: 'Concluídas', value: 4, variant: 'success' },
          { label: 'Pendentes', value: 1, variant: 'warning' },
        ]}
        tableTitle="Detalhamento das Etapas"
        tableColumns={[
          { id: 'etapa', header: 'Etapa', width: '40%' },
          { id: 'status', header: 'Status', width: '30%', align: 'center' },
          { id: 'data', header: 'Conclusão', width: '30%', align: 'right' },
        ]}
        tableData={[
          { etapa: 'Infraestrutura', status: 'Concluído', data: '10/10/2026' },
          { etapa: 'Conversão', status: 'Concluído', data: '15/10/2026' },
          { etapa: 'Treinamento', status: 'Em Andamento', data: '20/10/2026' },
        ]}
        signatureParties={[
          { role: 'Responsável Técnico Siplan', name: 'Bruno Matos' },
          { role: 'Representante do Cartório', name: 'Oficial Titular' },
        ]}
      />
    );

    expect(doc).toBeDefined();
    expect(doc.type).toBe(BaseReportTemplate);
  });

  it('gera Blob e Uint8Array programaticamente via pdfService', async () => {
    const doc = (
      <BaseReportTemplate
        title="Relatório Executivo Rápido"
        clientName="1º Ofício de Notas"
        summaryItems={[{ label: 'Status Geral', value: '100% Homologado', variant: 'success' }]}
      />
    );

    const blob = await generatePdfBlob(doc);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/pdf');

    const buffer = await generatePdfBuffer(doc);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
