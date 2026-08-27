import type { Chamado0800 } from "@/hooks/useChamados0800";
import {
  getChamadosProductLabel,
} from "@/lib/chamados-catalog";
import type { ChamadosReportFilters } from "@/lib/chamados-report-pdf";
import {
  formatSlaDuration,
  getOfficialSlaState,
  getSlaCheckpointDisplay,
  parseSlaDate,
} from "@/lib/tickets-sla";

export interface TicketsSlaReportFilters extends ChamadosReportFilters {
  slaClassification?: string;
}

function safeText(value?: string | null): string {
  return (value?.trim() || "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatDateTime(value?: string): string {
  const date = parseSlaDate(value);
  if (!date) return "-";
  const hasTime = Boolean(value && !/^\d{4}-\d{2}-\d{2}$/.test(value));
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(hasTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

function summarize(values: string[], emptyLabel: string): string {
  if (values.length === 0) return emptyLabel;
  if (values.length <= 3) return values.join(", ");
  return `${values.slice(0, 3).join(", ")} e mais ${values.length - 3}`;
}

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function generateTicketsSlaReportPdf(
  chamados: Chamado0800[],
  filters: TicketsSlaReportFilters,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 15;
  const bottomMargin = 13;
  const reportTitle = filters.catalog === "legacy"
    ? "Relatório de Tempos e SLA - Ellevo/0800 - Legado"
    : "Relatório de Tempos e SLA - Ellevo/0800";
  let y = 0;

  const states = chamados.map((chamado) => getOfficialSlaState(chamado));
  const firstWithin = states.filter((state) => state.firstResponse.status === "met").length;
  const firstOutside = states.filter((state) => state.firstResponse.status === "breached").length;
  const resolutionWithin = states.filter((state) => state.resolution.status === "met").length;
  const resolutionOutside = states.filter((state) => state.resolution.status === "breached").length;

  const productLabel = filters.catalog === "legacy"
    ? summarize(filters.products || [], "Todos os produtos")
    : getChamadosProductLabel(filters.product, filters.catalog ?? "orion");
  const filterDescription = [
    `Período: ${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`,
    `Produto: ${safeText(productLabel)}`,
    ...(filters.catalog === "legacy"
      ? [`Software: ${safeText(summarize(filters.softwares || [], "Todos os softwares"))}`]
      : []),
    `Natureza: ${!filters.nature || filters.nature === "todas" ? "Todas" : safeText(filters.nature)}`,
    `Status: ${safeText(summarize(filters.statuses, "Todos"))}`,
    `Classificação SLA: ${safeText(filters.slaClassification || "Todos")}`,
    `Clientes: ${safeText(summarize(filters.clients, "Todos"))}`,
    `Busca: ${safeText(filters.searchTerm)}`,
  ].join("  |  ");

  const drawSummaryCard = (
    x: number,
    label: string,
    value: number,
    accent: [number, number, number],
  ) => {
    const width = 51;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(225, 230, 237);
    pdf.roundedRect(x, y, width, 12, 1.5, 1.5, "FD");
    pdf.setFillColor(...accent);
    pdf.rect(x, y, 2, 12, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(25, 32, 44);
    pdf.text(String(value), x + 5, y + 5.2);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 110, 125);
    pdf.text(label, x + 5, y + 9.2);
  };

  const columns = [
    { label: "Chamado", width: 18, value: (item: Chamado0800) => `#${item.numeroChamado}` },
    { label: "Cliente / serventia", width: 40, value: (item: Chamado0800) => safeText(item.nomeCliente) },
    { label: "Título", width: 46, value: (item: Chamado0800) => safeText(item.titulo) },
    { label: "Criticidade", width: 27, value: (item: Chamado0800) => safeText(item.criticidade) },
    { label: "Abertura", width: 27, value: (item: Chamado0800) => formatDateTime(item.abertoEm || item.dataAbertura) },
    { label: "Encerramento", width: 27, value: (item: Chamado0800) => formatDateTime(item.encerradoEm || item.dataEncerramento) },
    { label: "Duração", width: 20, value: (item: Chamado0800) => formatSlaDuration(getOfficialSlaState(item).hours) },
    {
      label: "1ª resposta",
      width: 31,
      value: (item: Chamado0800) => {
        const state = getOfficialSlaState(item);
        const display = getSlaCheckpointDisplay(state.firstResponse, "firstResponse");
        return `${display.label} · ${formatDateTime(item.slaPrimeiraRespostaPrevistaEm)}`;
      },
    },
    {
      label: "Resolução",
      width: 31,
      value: (item: Chamado0800) => {
        const state = getOfficialSlaState(item);
        const display = getSlaCheckpointDisplay(state.resolution, "resolution");
        return `${display.label} · ${formatDateTime(item.slaVencimentoEm)}`;
      },
    },
  ];

  const drawTableHeader = () => {
    let x = marginX;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.1);
    for (const column of columns) {
      pdf.setFillColor(37, 45, 58);
      pdf.setDrawColor(37, 45, 58);
      pdf.rect(x, y, column.width, 6.5, "FD");
      pdf.setTextColor(255, 255, 255);
      pdf.text(column.label, x + 1.5, y + 4.1);
      x += column.width;
    }
    y += 6.5;
  };

  const drawPageHeader = (continuation = false) => {
    pdf.setFillColor(190, 0, 48);
    pdf.rect(0, 0, pageWidth, continuation ? 3 : 4, "F");
    y = continuation ? 9 : 12;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(continuation ? 9 : 16);
    pdf.setTextColor(20, 25, 35);
    pdf.text(`${reportTitle}${continuation ? " - continuação" : ""}`, marginX, y);

    if (continuation) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 110, 125);
      pdf.text(`${chamados.length} chamado(s) no relatório`, pageWidth - marginX, y, { align: "right" });
      y += 5;
      drawTableHeader();
      return;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(95, 105, 120);
    pdf.text(`Gerado pelo SiplanHUB em ${new Date().toLocaleString("pt-BR")}`, pageWidth - marginX, y, { align: "right" });
    y += 6;

    pdf.setFontSize(8);
    pdf.setTextColor(45, 55, 70);
    pdf.text("Prazos oficiais do Ellevo: criticidade, calendário, equipe vigente, ajustes e pausas da origem.", marginX, y);
    y += 4;
    const filterLines = pdf.splitTextToSize(filterDescription, pageWidth - marginX * 2) as string[];
    pdf.text(filterLines, marginX, y);
    y += filterLines.length * 3.5 + 3;

    drawSummaryCard(marginX, "Chamados analisados", chamados.length, [190, 0, 48]);
    drawSummaryCard(marginX + 54, "1ª resposta no prazo", firstWithin, [5, 150, 105]);
    drawSummaryCard(marginX + 108, "1ª resposta fora", firstOutside, [225, 29, 72]);
    drawSummaryCard(marginX + 162, "Resolução no prazo", resolutionWithin, [5, 150, 105]);
    drawSummaryCard(marginX + 216, "Resolução fora", resolutionOutside, [225, 29, 72]);
    y += 16;
    drawTableHeader();
  };

  drawPageHeader();

  chamados.forEach((item, rowIndex) => {
    const wrappedCells = columns.map((column) => {
      const lines = pdf.splitTextToSize(column.value(item), column.width - 3) as string[];
      if (lines.length <= 2) return lines;
      const visible = lines.slice(0, 2);
      visible[1] = `${visible[1].replace(/\s+$/, "")}...`;
      return visible;
    });
    const rowHeight = Math.max(7, Math.max(...wrappedCells.map((lines) => lines.length)) * 3.1 + 2.5);
    if (y + rowHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      drawPageHeader(true);
    }

    let x = marginX;
    wrappedCells.forEach((lines, columnIndex) => {
      const column = columns[columnIndex];
      const fill: [number, number, number] = rowIndex % 2 === 0
        ? [255, 255, 255]
        : [247, 249, 252];
      pdf.setFillColor(...fill);
      pdf.setDrawColor(220, 225, 232);
      pdf.rect(x, y, column.width, rowHeight, "FD");
      pdf.setFont("helvetica", columnIndex === 0 ? "bold" : "normal");
      pdf.setFontSize(6.8);

      if (columnIndex === 0) {
        pdf.setTextColor(190, 0, 48);
      } else if (columnIndex >= columns.length - 2) {
        const state = getOfficialSlaState(item);
        const checkpoint = columnIndex === columns.length - 2
          ? getSlaCheckpointDisplay(state.firstResponse, "firstResponse")
          : getSlaCheckpointDisplay(state.resolution, "resolution");
        if (checkpoint.classification === "within") pdf.setTextColor(5, 130, 90);
        else if (checkpoint.classification === "inProgress") pdf.setTextColor(37, 99, 235);
        else if (checkpoint.classification === "unavailable") pdf.setTextColor(100, 110, 125);
        else pdf.setTextColor(190, 18, 60);
      } else {
        pdf.setTextColor(30, 38, 50);
      }
      pdf.text(lines, x + 1.5, y + 3.8);
      x += column.width;
    });
    y += rowHeight;
  });

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(125, 135, 150);
    pdf.setDrawColor(225, 230, 237);
    pdf.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);
    pdf.text("SiplanHUB · Tempos e SLA", marginX, pageHeight - 5);
    pdf.text(`Página ${page} de ${totalPages}`, pageWidth - marginX, pageHeight - 5, { align: "right" });
  }

  pdf.save(`relatorio-tempos-sla${filters.catalog === "legacy" ? "-legado" : ""}-${localIsoDate()}.pdf`);
}
