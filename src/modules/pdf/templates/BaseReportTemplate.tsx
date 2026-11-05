import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { basePdfStyles } from '../styles/base';
import { pdfTokens } from '../styles/tokens';
import { PdfHeader } from '../components/PdfHeader';
import { PdfFooter } from '../components/PdfFooter';
import { PdfSummarySection, PdfSummaryItem } from '../components/PdfSummarySection';
import { PdfTable, PdfTableColumn } from '../components/PdfTable';
import { PdfSignatureBlock, PdfSignatureParty } from '../components/PdfSignatureBlock';

export interface BaseReportTemplateProps<T extends Record<string, unknown> = Record<string, unknown>> {
  title: string;
  subtitle?: string;
  clientName?: string;
  projectName?: string;
  badge?: string;
  summaryItems?: PdfSummaryItem[];
  tableTitle?: string;
  tableColumns?: PdfTableColumn<T>[];
  tableData?: T[];
  observationNotes?: string[];
  signatureParties?: PdfSignatureParty[];
  orientation?: 'portrait' | 'landscape';
}

const styles = StyleSheet.create({
  notesContainer: {
    backgroundColor: pdfTokens.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: pdfTokens.colors.border,
    borderRadius: pdfTokens.radii.sm,
    padding: pdfTokens.spacing.sm,
    marginBottom: pdfTokens.spacing.md,
  },
  noteItem: {
    fontSize: pdfTokens.fontSizes.xs,
    color: pdfTokens.colors.textMuted,
    marginBottom: 4,
  },
});

export function BaseReportTemplate<T extends Record<string, unknown>>({
  title,
  subtitle,
  clientName,
  projectName,
  badge = 'Oficial',
  summaryItems,
  tableTitle,
  tableColumns,
  tableData,
  observationNotes,
  signatureParties,
  orientation = 'portrait',
}: BaseReportTemplateProps<T>) {
  const pageStyle = orientation === 'landscape' ? basePdfStyles.pageLandscape : basePdfStyles.page;

  return (
    <Document title={title} author="Siplan HUB">
      <Page size="A4" orientation={orientation} style={pageStyle}>
        {/* Cabeçalho Padronizado */}
        <PdfHeader
          title={title}
          subtitle={subtitle}
          clientName={clientName}
          projectName={projectName}
          badge={badge}
        />

        {/* Resumo Executivo / KPIs */}
        {summaryItems && summaryItems.length > 0 && (
          <PdfSummarySection items={summaryItems} title="Indicadores e Resumo da Operação" />
        )}

        {/* Tabela de Dados */}
        {tableColumns && tableData && (
          <View style={basePdfStyles.section}>
            {tableTitle && <Text style={basePdfStyles.sectionTitle}>{tableTitle}</Text>}
            <PdfTable columns={tableColumns} data={tableData} />
          </View>
        )}

        {/* Notas e Observações */}
        {observationNotes && observationNotes.length > 0 && (
          <View style={styles.notesContainer}>
            <Text style={basePdfStyles.sectionTitle}>Observações e Orientações Técnicas</Text>
            {observationNotes.map((note, idx) => (
              <Text key={idx} style={styles.noteItem}>
                • {note}
              </Text>
            ))}
          </View>
        )}

        {/* Assinaturas */}
        {signatureParties && signatureParties.length > 0 && (
          <PdfSignatureBlock parties={signatureParties} />
        )}

        {/* Rodapé Padronizado em Todas as Páginas */}
        <PdfFooter />
      </Page>
    </Document>
  );
}
