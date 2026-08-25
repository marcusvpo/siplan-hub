import type { ChamadoReportRow } from "@/hooks/useChamados0800";
import type { ChamadosReportFilters } from "@/lib/chamados-report-pdf";
import { getChamadosProductLabel } from "@/lib/chamados-catalog";
import {
  buildTicketsAiAnalytics,
  ticketDaysOpen,
  type TicketsAnalyticsItem,
} from "@/lib/tickets-ai-analytics";

export interface TicketsAiReportAnalysis {
  text: string;
  createdAt: string;
}

const ACCENT: [number, number, number] = [190, 0, 48];
const NAVY: [number, number, number] = [37, 45, 58];
const MUTED: [number, number, number] = [92, 105, 125];

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function clean(value?: string | null): string {
  return (value?.trim() || "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function summarizeClients(clients: string[]): string {
  if (clients.length === 0) return "Todos";
  if (clients.length <= 2) return clients.join(", ");
  return `${clients.slice(0, 2).join(", ")} e mais ${clients.length - 2}`;
}

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function generateTicketsAiAnalysisPdf(
  rows: ChamadoReportRow[],
  filters: ChamadosReportFilters,
  analysis: TicketsAiReportAnalysis
): Promise<void> {
  if (!analysis.text.trim()) {
    throw new Error("Gere as considerações da IA antes de emitir este relatório.");
  }

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const catalog = filters.catalog ?? "orion";
  const analytics = buildTicketsAiAnalytics(rows, catalog);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 13;
  let y = 0;

  const drawTopBar = () => {
    pdf.setFillColor(...ACCENT);
    pdf.rect(0, 0, pageWidth, 4, "F");
  };

  const addPage = (continuationTitle?: string) => {
    pdf.addPage();
    drawTopBar();
    y = 10;
    if (continuationTitle) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...NAVY);
      pdf.text(continuationTitle, marginX, y);
      y += 6;
    }
  };

  const drawSectionTitle = (title: string, subtitle?: string) => {
    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(marginX, y, contentWidth, 8, 1.2, 1.2, "F");
    pdf.setFillColor(...ACCENT);
    pdf.rect(marginX, y, 1.5, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...NAVY);
    pdf.text(title, marginX + 4, y + 5.2);
    if (subtitle) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...MUTED);
      pdf.text(subtitle, pageWidth - marginX - 3, y + 5.2, { align: "right" });
    }
    y += 11;
  };

  drawTopBar();
  y = 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(20, 25, 35);
  pdf.text(
    catalog === "legacy"
      ? "Análise de Chamados IA - Ellevo/0800 - Legado"
      : "Análise de Chamados IA - Ellevo/0800",
    marginX,
    y,
  );
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  pdf.text(`Gerado pelo SiplanHUB em ${new Date().toLocaleString("pt-BR")}`, pageWidth - marginX, y, {
    align: "right",
  });
  y += 6;

  const productLabel = catalog === "legacy"
    ? filters.products?.length ? filters.products.join(", ") : "Todos os produtos"
    : getChamadosProductLabel(filters.product, catalog);
  const softwareLabel = filters.softwares?.length
    ? filters.softwares.join(", ")
    : "Todos os softwares";
  const filterText = [
    `Período: ${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`,
    `Produto: ${productLabel}`,
    ...(catalog === "legacy" ? [`Software: ${softwareLabel}`] : []),
    `Natureza: ${!filters.nature || filters.nature === "todas" ? "Todas" : filters.nature}`,
    `Status: ${filters.statuses.length ? filters.statuses.join(", ") : "Todos"}`,
    `Clientes: ${summarizeClients(filters.clients)}`,
    `Busca: ${clean(filters.searchTerm)}`,
  ].join("  |  ");
  const filterLines = pdf.splitTextToSize(clean(filterText), contentWidth) as string[];
  pdf.setFontSize(7.5);
  pdf.setTextColor(55, 65, 80);
  pdf.text(filterLines, marginX, y);
  y += filterLines.length * 3.2 + 3;

  const cards = [
    { label: "Chamados", value: analytics.total, color: ACCENT },
    { label: "Concluídos", value: `${analytics.completed} (${analytics.completionRate}%)`, color: [5, 150, 105] as [number, number, number] },
    { label: "Em aberto", value: analytics.open, color: [37, 99, 235] as [number, number, number] },
    { label: "Bugs resolvidos", value: `${analytics.bugCompleted}/${analytics.bugLike}`, color: [245, 158, 11] as [number, number, number] },
    { label: "Abertos > 30 dias", value: analytics.openOver30Days, color: [220, 38, 38] as [number, number, number] },
    { label: "Média de resolução", value: analytics.averageResolutionDays === null ? "-" : `${analytics.averageResolutionDays} dias`, color: [8, 145, 178] as [number, number, number] },
  ];
  const cardGap = 2;
  const cardWidth = (contentWidth - cardGap * (cards.length - 1)) / cards.length;
  cards.forEach((card, index) => {
    const x = marginX + index * (cardWidth + cardGap);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(225, 230, 237);
    pdf.roundedRect(x, y, cardWidth, 13, 1.5, 1.5, "FD");
    pdf.setFillColor(...card.color);
    pdf.rect(x, y, 1.5, 13, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...NAVY);
    pdf.text(String(card.value), x + 4, y + 5.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...MUTED);
    pdf.text(card.label, x + 4, y + 10);
  });
  y += 17;

  const drawHorizontalBars = (
    title: string,
    data: TicketsAnalyticsItem[],
    x: number,
    top: number,
    width: number,
    height: number,
    color: [number, number, number]
  ) => {
    pdf.setDrawColor(225, 230, 237);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, top, width, height, 1.5, 1.5, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...NAVY);
    pdf.text(title, x + 4, top + 6);

    const items = data.slice(0, 8);
    const max = Math.max(1, ...items.map((item) => item.total));
    const labelWidth = Math.min(52, width * 0.43);
    const rowHeight = (height - 12) / Math.max(items.length, 1);
    items.forEach((item, index) => {
      const rowY = top + 11 + index * rowHeight;
      const label = item.name.length > 30 ? `${item.name.slice(0, 28)}...` : item.name;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.3);
      pdf.setTextColor(65, 75, 90);
      pdf.text(clean(label), x + 4, rowY + 2.4);
      const barX = x + labelWidth;
      const barWidth = Math.max(1, ((width - labelWidth - 12) * item.total) / max);
      pdf.setFillColor(235, 239, 245);
      pdf.roundedRect(barX, rowY, width - labelWidth - 9, 3.2, 0.8, 0.8, "F");
      pdf.setFillColor(...color);
      pdf.roundedRect(barX, rowY, barWidth, 3.2, 0.8, 0.8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...NAVY);
      pdf.text(String(item.total), x + width - 4, rowY + 2.5, { align: "right" });
    });
  };

  const chartGap = 3;
  const chartWidth = (contentWidth - chartGap) / 2;
  const chartHeight = 63;
  drawHorizontalBars("Distribuição por status", analytics.byStatus, marginX, y, chartWidth, chartHeight, [16, 185, 129]);
  drawHorizontalBars("Principais naturezas", analytics.byNature, marginX + chartWidth + chartGap, y, chartWidth, chartHeight, ACCENT);
  y += chartHeight + 5;

  addPage("Indicadores do recorte");
  const secondTop = y;
  drawHorizontalBars("Clientes com maior volume", analytics.byClient, marginX, secondTop, chartWidth, 65, [99, 102, 241]);
  drawHorizontalBars("Envelhecimento dos chamados em aberto", analytics.aging, marginX + chartWidth + chartGap, secondTop, chartWidth, 65, [245, 158, 11]);
  y = secondTop + 70;

  drawSectionTitle("Fluxo mensal de chamados", "Comparativo entre aberturas e encerramentos");
  const timeline = analytics.monthlyFlow.slice(-12);
  const timelineHeight = 38;
  const maxFlow = Math.max(1, ...timeline.flatMap((item) => [item.opened, item.closed]));
  const groupWidth = contentWidth / Math.max(timeline.length, 1);
  const baseline = y + timelineHeight - 7;
  pdf.setDrawColor(215, 222, 232);
  pdf.line(marginX, baseline, pageWidth - marginX, baseline);
  timeline.forEach((item, index) => {
    const center = marginX + groupWidth * index + groupWidth / 2;
    const barWidth = Math.min(6, groupWidth * 0.28);
    const openedHeight = ((timelineHeight - 13) * item.opened) / maxFlow;
    const closedHeight = ((timelineHeight - 13) * item.closed) / maxFlow;
    pdf.setFillColor(14, 165, 233);
    pdf.rect(center - barWidth - 0.5, baseline - openedHeight, barWidth, openedHeight, "F");
    pdf.setFillColor(16, 185, 129);
    pdf.rect(center + 0.5, baseline - closedHeight, barWidth, closedHeight, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(...MUTED);
    pdf.text(item.month, center, baseline + 4, { align: "center" });
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(14, 116, 180);
    if (item.opened) pdf.text(String(item.opened), center - barWidth / 2 - 0.5, baseline - openedHeight - 1, { align: "center" });
    pdf.setTextColor(5, 145, 95);
    if (item.closed) pdf.text(String(item.closed), center + barWidth / 2 + 0.5, baseline - closedHeight - 1, { align: "center" });
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...MUTED);
  pdf.setFillColor(14, 165, 233);
  pdf.rect(pageWidth - marginX - 47, y - 7, 3, 3, "F");
  pdf.text("Abertos", pageWidth - marginX - 42.5, y - 4.5);
  pdf.setFillColor(16, 185, 129);
  pdf.rect(pageWidth - marginX - 25, y - 7, 3, 3, "F");
  pdf.text("Concluídos", pageWidth - marginX - 20.5, y - 4.5);
  y += timelineHeight + 4;

  drawSectionTitle("Chamados em aberto há mais tempo", `${analytics.open} chamado(s) em aberto no recorte`);
  const oldest = analytics.oldestOpen.slice(0, 8);
  oldest.forEach((row, index) => {
    const rowHeight = 7.5;
    pdf.setFillColor(index % 2 ? 248 : 252, index % 2 ? 250 : 252, index % 2 ? 252 : 253);
    pdf.rect(marginX, y, contentWidth, rowHeight, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...ACCENT);
    pdf.text(`#${row.numeroChamado}`, marginX + 2, y + 4.8);
    pdf.setTextColor(...NAVY);
    const title = clean(row.titulo || "Sem título");
    pdf.text(title.length > 72 ? `${title.slice(0, 69)}...` : title, marginX + 20, y + 4.8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...MUTED);
    const client = clean(row.nomeCliente || "Cliente não informado");
    pdf.text(client.length > 65 ? `${client.slice(0, 62)}...` : client, marginX + 135, y + 4.8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(190, 70, 20);
    pdf.text(`${ticketDaysOpen(row.dataAbertura)} dias`, pageWidth - marginX - 2, y + 4.8, { align: "right" });
    y += rowHeight;
  });

  addPage("Parecer executivo da IA");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...MUTED);
  pdf.text(`Análise gerada em ${new Date(analysis.createdAt).toLocaleString("pt-BR")}`, marginX, y);
  y += 5;
  pdf.setDrawColor(225, 230, 237);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  const ensureAnalysisSpace = (height = 5) => {
    if (y + height <= bottomLimit) return;
    addPage("Parecer executivo da IA - continuação");
  };

  const drawRichParagraph = (source: string, prefix = "") => {
    const text = source.replace(/^\s+|\s+$/g, "");
    if (!text) {
      y += 2;
      return;
    }

    const segments: Array<{ value: string; bold: boolean }> = [];
    let bold = false;
    for (const part of text.split(/(\*\*)/)) {
      if (part === "**") {
        bold = !bold;
      } else if (part) {
        segments.push({ value: part, bold });
      }
    }

    const indent = prefix ? 6 : 0;
    let x = marginX + indent;
    const maxX = pageWidth - marginX;
    const lineHeight = 4;
    ensureAnalysisSpace(lineHeight);
    if (prefix) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.2);
      pdf.setTextColor(...ACCENT);
      pdf.text(prefix, marginX + 1, y);
    }

    for (const segment of segments) {
      const words = segment.value.split(/\s+/).filter(Boolean);
      for (const word of words) {
        pdf.setFont("helvetica", segment.bold ? "bold" : "normal");
        pdf.setFontSize(8.2);
        pdf.setTextColor(segment.bold ? 28 : 48, segment.bold ? 35 : 58, segment.bold ? 48 : 72);
        const rendered = clean(word);
        const wordWidth = pdf.getTextWidth(rendered);
        const spaceWidth = pdf.getTextWidth(" ");
        if (x + wordWidth > maxX && x > marginX + indent) {
          y += lineHeight;
          ensureAnalysisSpace(lineHeight);
          x = marginX + indent;
        }
        pdf.text(rendered, x, y);
        x += wordWidth + spaceWidth;
      }
    }
    y += lineHeight + 1;
  };

  for (const rawLine of analysis.text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^\*\*(.+)\*\*:?$/);
    if (heading) {
      ensureAnalysisSpace(9);
      y += 2;
      pdf.setFillColor(247, 249, 252);
      pdf.roundedRect(marginX, y - 4, contentWidth, 7, 1, 1, "F");
      pdf.setFillColor(...ACCENT);
      pdf.rect(marginX, y - 4, 1.2, 7, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.2);
      pdf.setTextColor(...NAVY);
      pdf.text(clean(heading[1]), marginX + 4, y + 0.8);
      y += 7;
    } else if (/^[-*]\s+/.test(line)) {
      drawRichParagraph(line.replace(/^[-*]\s+/, ""), "•");
    } else if (/^\d+[.)]\s+/.test(line)) {
      const match = line.match(/^(\d+[.)])\s+(.+)$/);
      drawRichParagraph(match?.[2] || line, match?.[1] || "");
    } else {
      drawRichParagraph(line);
    }
  }

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(225, 230, 237);
    pdf.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.8);
    pdf.setTextColor(125, 135, 150);
    pdf.text("SiplanHUB · Análise de Chamados IA", marginX, pageHeight - 5);
    pdf.text(`Página ${page} de ${totalPages}`, pageWidth - marginX, pageHeight - 5, { align: "right" });
  }

  pdf.save(`analise-chamados-ia${catalog === "legacy" ? "-legado" : ""}-${localIsoDate()}.pdf`);
}
