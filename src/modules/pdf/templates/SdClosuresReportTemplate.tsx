import { Text } from "@react-pdf/renderer";
import type {
  SdClosureAnalystSummary,
  SdClosureDetail,
  SdClosuresData,
  SdClosuresFilters,
} from "@/hooks/useSdClosures";
import { BaseReportTemplate } from "./BaseReportTemplate";
import type { PdfTableColumn } from "../components/PdfTable";
import { pdfTokens } from "../styles/tokens";

export type SdClosuresReportMode = "consolidated" | "analytical";

interface SdClosuresReportTemplateProps {
  data: SdClosuresData;
  filters: SdClosuresFilters;
  mode: SdClosuresReportMode;
}

type ConsolidatedRow = Record<string, unknown> & SdClosureAnalystSummary;
type AnalyticalRow = Record<string, unknown> & SdClosureDetail;

export function SdClosuresReportTemplate({
  data,
  filters,
  mode,
}: SdClosuresReportTemplateProps) {
  const metrics = data.metrics;
  const eligibleForSla = metrics.within_sla + metrics.outside_sla;
  const slaRate = eligibleForSla
    ? `${Math.round((metrics.within_sla / eligibleForSla) * 100)}%`
    : "—";
  const filtersSummary = [
    `Período de encerramento: ${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`,
    `Produtos: ${summarize(filters.products)}`,
    `Analistas: ${summarize(filters.analysts)}`,
    `Grupos: ${summarize(filters.groups)}`,
    `Clientes: ${summarize(filters.clients)}`,
  ];

  if (mode === "consolidated") {
    return (
      <BaseReportTemplate<ConsolidatedRow>
        title="Encerramentos do SD — Consolidado"
        subtitle="Chamados fechados no Ellevo/0800 por atendente"
        badge="SD · 0800"
        orientation="landscape"
        summaryItems={[
          { label: "Encerrados", value: metrics.total_closed },
          { label: "No prazo", value: metrics.within_sla, variant: "success" },
          { label: "Fora do prazo", value: metrics.outside_sla, variant: "danger" },
          { label: "Cumprimento de SLA", value: slaRate, variant: "info" },
          { label: "Sem vencimento", value: metrics.without_deadline, variant: "warning" },
        ]}
        tableTitle="Encerramentos por analista"
        tableColumns={consolidatedColumns}
        tableData={data.by_analyst as ConsolidatedRow[]}
        observationNotes={filtersSummary}
      />
    );
  }

  return (
    <BaseReportTemplate<AnalyticalRow>
      title="Encerramentos do SD — Analítico"
      subtitle="Detalhamento dos chamados fechados no Ellevo/0800"
      badge="SD · 0800"
      orientation="landscape"
      summaryItems={[
        { label: "Encerrados", value: metrics.total_closed },
        { label: "Clientes", value: metrics.client_count },
        { label: "Analistas", value: metrics.analyst_count },
        { label: "No prazo", value: metrics.within_sla, variant: "success" },
        { label: "Fora do prazo", value: metrics.outside_sla, variant: "danger" },
      ]}
      tableTitle="Chamados encerrados"
      tableColumns={analyticalColumns}
      tableData={data.details as AnalyticalRow[]}
      observationNotes={filtersSummary}
    />
  );
}

const consolidatedColumns: PdfTableColumn<ConsolidatedRow>[] = [
  { id: "analyst_name", header: "Atendente", width: "24%" },
  { id: "group_name", header: "Grupo", width: "20%" },
  { id: "total_closed", header: "Total", width: "9%", align: "right" },
  { id: "without_deadline", header: "Sem venc.", width: "10%", align: "right" },
  { id: "within_sla", header: "No prazo", width: "10%", align: "right" },
  {
    id: "within_percent",
    header: "% prazo",
    width: "10%",
    align: "right",
    renderCell: (row) => <Text style={cellStyle}>{formatPercent(row.within_percent)}</Text>,
  },
  { id: "outside_sla", header: "Fora", width: "8%", align: "right" },
  { id: "reopened", header: "Reabertos", width: "9%", align: "right" },
];

const analyticalColumns: PdfTableColumn<AnalyticalRow>[] = [
  { id: "ticket_number", header: "Chamado", width: "8%" },
  { id: "client_name", header: "Cliente", width: "20%" },
  { id: "ticket_title", header: "Título", width: "21%" },
  { id: "product", header: "Produto", width: "14%" },
  { id: "analyst_name", header: "Analista", width: "14%" },
  {
    id: "closed_at",
    header: "Encerramento",
    width: "11%",
    renderCell: (row) => <Text style={cellStyle}>{formatDateTime(row.closed_at)}</Text>,
  },
  {
    id: "sla_status",
    header: "SLA",
    width: "12%",
    renderCell: (row) => <Text style={cellStyle}>{slaLabel(row.sla_status)}</Text>,
  },
];

const cellStyle = {
  fontFamily: pdfTokens.fonts.family,
  fontSize: pdfTokens.fontSizes.xs,
  color: pdfTokens.colors.text,
  paddingVertical: 5,
};

function summarize(values: string[]) {
  if (values.length === 0) return "Todos";
  if (values.length <= 3) return values.join(", ");
  return `${values.slice(0, 3).join(", ")} e mais ${values.length - 3}`;
}

function formatPercent(value: number) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function slaLabel(status: SdClosureDetail["sla_status"]) {
  if (status === "within") return "No prazo";
  if (status === "outside") return "Fora do prazo";
  return "Sem vencimento";
}
