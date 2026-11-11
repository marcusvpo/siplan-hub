/**
 * Camada oficial do Siplan HUB para geração de documentos e relatórios em PDF.
 * Padrão obrigatório com @react-pdf/renderer para fluxos de UI e automações programáticas.
 */

// Tokens e Estilos
export * from './styles/tokens';
export * from './styles/base';

// Componentes Estruturais
export * from './components/PdfHeader';
export * from './components/PdfFooter';
export * from './components/PdfStatusBadge';
export * from './components/PdfSummarySection';
export * from './components/PdfTable';
export * from './components/PdfSignatureBlock';

// Serviços e Utilitários
export * from './services/pdfService';

// Templates Padrão
export * from './templates/BaseReportTemplate';
export * from './templates/WeeklyExecutiveReportTemplate';
export * from './templates/SdClosuresReportTemplate';

// Relatório Executivo Semanal de Implantação
export * from './types/weeklyReport';
export * from './services/weeklyReportDataCollector';
