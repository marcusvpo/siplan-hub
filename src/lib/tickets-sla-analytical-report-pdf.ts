import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import { getChamadosProductLabel } from "@/lib/chamados-catalog";
import {
  buildTicketFlowAnalysis,
  chronologicalTramites,
  elapsedHours,
  formatSlaDuration,
  getResolutionSlaState,
  parseSlaDate,
} from "@/lib/tickets-sla";
import type { TicketsSlaReportFilters } from "@/lib/tickets-sla-report-pdf";

export interface TicketsSlaAnalyticalEntry {
  chamado: Chamado0800;
  tramites: ChamadoTramite[];
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

export async function generateTicketsSlaAnalyticalReportPdf(
  entries: TicketsSlaAnalyticalEntry[],
  filters: TicketsSlaReportFilters,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;
  const bottomMargin = 14;
  const lineHeight = 3.2;
  const reportTitle = filters.catalog === "legacy"
    ? "Relatório SLA Analítico - Ellevo/0800 - Legado"
    : "Relatório SLA Analítico - Ellevo/0800";
  let y = 0;
  let currentTicket = "";

  const drawTopBar = () => {
    pdf.setFillColor(190, 0, 48);
    pdf.rect(0, 0, pageWidth, 4, "F");
  };

  const addTicketPage = (section: string) => {
    pdf.addPage();
    drawTopBar();
    y = 10;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(30, 38, 50);
    pdf.text(`Chamado #${currentTicket} - ${section} (continuação)`, marginX, y);
    y += 6;
  };

  const ensureSpace = (height: number, section: string) => {
    if (y + height > pageHeight - bottomMargin) addTicketPage(section);
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(10, title);
    pdf.setFillColor(241, 244, 248);
    pdf.setDrawColor(220, 225, 232);
    pdf.roundedRect(marginX, y, contentWidth, 7, 1, 1, "FD");
    pdf.setFillColor(190, 0, 48);
    pdf.rect(marginX, y, 1.5, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(35, 44, 58);
    pdf.text(title, marginX + 4, y + 4.6);
    y += 9;
  };

  const productLabel = filters.catalog === "legacy"
    ? summarize(filters.products || [], "Todos os produtos")
    : getChamadosProductLabel(filters.product, filters.catalog ?? "orion");
  const filterLines = [
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
  ];

  drawTopBar();
  y = 16;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.setTextColor(20, 25, 35);
  pdf.text(reportTitle, marginX, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(85, 95, 110);
  pdf.text(`Gerado pelo SiplanHUB em ${new Date().toLocaleString("pt-BR")}`, marginX, y);
  y += 12;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(225, 230, 237);
  pdf.roundedRect(marginX, y, contentWidth, 22, 2, 2, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.setTextColor(190, 0, 48);
  pdf.text(String(entries.length), marginX + 7, y + 10);
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 100);
  pdf.text("chamados detalhados", marginX + 7, y + 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`SLA primeiro atendimento: ${filters.firstResponseHours} h`, marginX + 67, y + 9);
  pdf.text(`SLA resolução: ${filters.resolutionDays} dia(s)`, marginX + 67, y + 15);
  pdf.text("Inclui tempos por área, transferências e todas as descrições dos trâmites.", marginX + 142, y + 12);
  y += 31;

  drawSectionTitle("Filtros aplicados");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 80);
  filterLines.forEach((line) => {
    const wrapped = pdf.splitTextToSize(line, contentWidth) as string[];
    pdf.text(wrapped, marginX, y);
    y += wrapped.length * 3.8 + 1;
  });
  y += 4;

  drawSectionTitle("Critério de cálculo");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 80);
  const methodology = "Os tempos são corridos. O tempo por área é estimado pela equipe registrada em cada trâmite. Como o Ellevo não registra separadamente os eventos de envio e aceite, uma transferência corresponde ao intervalo entre o último trâmite da área de origem e o primeiro trâmite da área de destino.";
  const methodologyLines = pdf.splitTextToSize(methodology, contentWidth) as string[];
  pdf.text(methodologyLines, marginX, y);

  entries.forEach(({ chamado, tramites }, ticketIndex) => {
    currentTicket = chamado.numeroChamado;
    pdf.addPage();
    drawTopBar();
    y = 11;

    const timeline = chronologicalTramites(tramites);
    const flow = buildTicketFlowAnalysis(chamado, timeline);
    const resolution = getResolutionSlaState(chamado, filters.resolutionDays);
    const openedAt = parseSlaDate(chamado.abertoEm || chamado.dataAbertura);
    const firstResponse = timeline.find((item) => (
      parseSlaDate(item.dataTramite)
      && Boolean(item.responsavel || item.equipeResponsavel || item.atividade)
    ));
    const firstResponseElapsed = elapsedHours(openedAt, parseSlaDate(firstResponse?.dataTramite));
    const firstResponseState = firstResponseElapsed === null
      ? "Sem atendimento identificado"
      : firstResponseElapsed <= filters.firstResponseHours ? "Dentro do SLA" : "Fora do SLA";

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(20, 25, 35);
    pdf.text(`Chamado #${chamado.numeroChamado}`, marginX, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 110, 125);
    pdf.text(`${ticketIndex + 1} de ${entries.length}`, pageWidth - marginX, y, { align: "right" });
    y += 6;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 38, 50);
    const clientLines = pdf.splitTextToSize(safeText(chamado.nomeCliente), contentWidth) as string[];
    pdf.text(clientLines, marginX, y);
    y += clientLines.length * 4;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const titleLines = pdf.splitTextToSize(safeText(chamado.titulo), contentWidth) as string[];
    pdf.text(titleLines, marginX, y);
    y += titleLines.length * 3.5 + 2;

    const metadata = [
      `Status: ${safeText(chamado.status)}`,
      `Produto: ${safeText(chamado.produto)}`,
      `Software: ${safeText(chamado.software)}`,
      `Abertura: ${formatDateTime(chamado.abertoEm || chamado.dataAbertura)}`,
      `Encerramento: ${formatDateTime(chamado.encerradoEm || chamado.dataEncerramento)}`,
    ].join("  |  ");
    const metadataLines = pdf.splitTextToSize(metadata, contentWidth) as string[];
    pdf.setTextColor(75, 85, 100);
    pdf.text(metadataLines, marginX, y);
    y += metadataLines.length * 3.5 + 4;

    const summary = [
      `Tempo total: ${formatSlaDuration(resolution.hours)}`,
      `SLA resolução: ${resolution.label}`,
      `Primeiro atendimento: ${formatSlaDuration(firstResponseElapsed)} (${firstResponseState})`,
      `Transferências: ${flow.transfers.length}`,
      `Movimentações: ${timeline.length}`,
      `Maior permanência: ${flow.bottleneck ? `${flow.bottleneck.area} - ${formatSlaDuration(flow.bottleneck.hours)}` : "-"}`,
    ];
    const summaryWidth = (contentWidth - 6) / 3;
    summary.forEach((value, index) => {
      const row = Math.floor(index / 3);
      const column = index % 3;
      const x = marginX + column * (summaryWidth + 3);
      const cardY = y + row * 11;
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(225, 230, 237);
      pdf.roundedRect(x, cardY, summaryWidth, 8, 1, 1, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      pdf.setTextColor(35, 44, 58);
      const lines = pdf.splitTextToSize(value, summaryWidth - 5) as string[];
      pdf.text(lines.slice(0, 2), x + 2.5, cardY + 3.5);
    });
    y += 25;

    drawSectionTitle("Tempo acumulado por área / etapa");
    const areaColumns = [125, 45, 45, 52];
    const areaHeaders = ["Área / etapa", "Tempo", "Participação", "Intervalos"];
    let x = marginX;
    areaHeaders.forEach((header, index) => {
      pdf.setFillColor(37, 45, 58);
      pdf.rect(x, y, areaColumns[index], 6.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(header, x + 1.5, y + 4.1);
      x += areaColumns[index];
    });
    y += 6.5;
    flow.areaTimes.forEach((area, index) => {
      const participation = flow.totalTrackedHours > 0
        ? `${Math.round((area.hours / flow.totalTrackedHours) * 100)}%`
        : "-";
      const values = [area.area, formatSlaDuration(area.hours), participation, String(area.intervals)];
      const wrapped = values.map((value, columnIndex) => (
        pdf.splitTextToSize(safeText(value), areaColumns[columnIndex] - 3) as string[]
      ));
      const rowHeight = Math.max(7, Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + 2.5);
      ensureSpace(rowHeight, "Tempo por área");
      x = marginX;
      wrapped.forEach((lines, columnIndex) => {
        pdf.setFillColor(...(index % 2 === 0 ? [255, 255, 255] : [247, 249, 252]) as [number, number, number]);
        pdf.setDrawColor(220, 225, 232);
        pdf.rect(x, y, areaColumns[columnIndex], rowHeight, "FD");
        pdf.setFont("helvetica", columnIndex === 0 ? "bold" : "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(30, 38, 50);
        pdf.text(lines, x + 1.5, y + 4);
        x += areaColumns[columnIndex];
      });
      y += rowHeight;
    });
    y += 4;

    drawSectionTitle("Transferências entre áreas");
    if (flow.transfers.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(75, 85, 100);
      pdf.text("Nenhuma troca de área identificada nos trâmites sincronizados.", marginX, y);
      y += 7;
    } else {
      const transferColumns = [33, 52, 52, 27, 103];
      const transferHeaders = ["Data de entrada", "Área de origem", "Área de destino", "Intervalo", "Atividade / responsável no destino"];
      x = marginX;
      transferHeaders.forEach((header, index) => {
        pdf.setFillColor(37, 45, 58);
        pdf.rect(x, y, transferColumns[index], 6.5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.7);
        pdf.setTextColor(255, 255, 255);
        pdf.text(header, x + 1.5, y + 4.1);
        x += transferColumns[index];
      });
      y += 6.5;
      flow.transfers.forEach((transfer, index) => {
        const values = [
          formatDateTime(transfer.transferredAt),
          transfer.fromArea,
          transfer.toArea,
          formatSlaDuration(transfer.waitHours),
          [transfer.activity, transfer.responsible].filter(Boolean).join(" · ") || "-",
        ];
        const wrapped = values.map((value, columnIndex) => (
          pdf.splitTextToSize(safeText(value), transferColumns[columnIndex] - 3) as string[]
        ));
        const rowHeight = Math.max(7, Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + 2.5);
        ensureSpace(rowHeight, "Transferências entre áreas");
        x = marginX;
        wrapped.forEach((lines, columnIndex) => {
          pdf.setFillColor(...(index % 2 === 0 ? [255, 255, 255] : [247, 249, 252]) as [number, number, number]);
          pdf.setDrawColor(220, 225, 232);
          pdf.rect(x, y, transferColumns[columnIndex], rowHeight, "FD");
          pdf.setFont("helvetica", columnIndex === 2 ? "bold" : "normal");
          pdf.setFontSize(6.7);
          pdf.setTextColor(30, 38, 50);
          pdf.text(lines, x + 1.5, y + 4);
          x += transferColumns[columnIndex];
        });
        y += rowHeight;
      });
    }
    y += 4;

    drawSectionTitle("Linha do tempo completa dos trâmites");
    if (timeline.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(75, 85, 100);
      pdf.text("Nenhum trâmite sincronizado.", marginX, y);
    } else {
      let previousAt = openedAt;
      timeline.forEach((tramite, index) => {
        const currentAt = parseSlaDate(tramite.dataTramite);
        const gap = elapsedHours(previousAt, currentAt);
        const heading = [
          `${index + 1}. ${formatDateTime(tramite.dataTramite)}`,
          `Intervalo: ${formatSlaDuration(gap)}`,
          `Área: ${safeText(tramite.equipeResponsavel)}`,
          `Atividade: ${safeText(tramite.atividade)}`,
          `Responsável: ${safeText(tramite.responsavel)}`,
        ].join("  |  ");
        const headingLines = pdf.splitTextToSize(heading, contentWidth - 8) as string[];
        const headingHeight = headingLines.length * lineHeight + 4;
        ensureSpace(headingHeight + 5, "Linha do tempo dos trâmites");
        pdf.setFillColor(243, 246, 249);
        pdf.setDrawColor(220, 225, 232);
        pdf.roundedRect(marginX, y, contentWidth, headingHeight, 1, 1, "FD");
        pdf.setFillColor(190, 0, 48);
        pdf.rect(marginX, y, 1.5, headingHeight, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.1);
        pdf.setTextColor(35, 44, 58);
        pdf.text(headingLines, marginX + 4, y + 4);
        y += headingHeight + 1;

        const descriptionLines = pdf.splitTextToSize(safeText(tramite.descricao), contentWidth - 8) as string[];
        let lineFrom = 0;
        while (lineFrom < descriptionLines.length) {
          const availableHeight = pageHeight - bottomMargin - y;
          const maxLines = Math.floor((availableHeight - 4) / lineHeight);
          if (maxLines < 1) {
            addTicketPage("Linha do tempo dos trâmites");
            continue;
          }
          const chunk = descriptionLines.slice(lineFrom, lineFrom + maxLines);
          const chunkHeight = chunk.length * lineHeight + 4;
          pdf.setFillColor(250, 251, 253);
          pdf.setDrawColor(230, 234, 240);
          pdf.roundedRect(marginX, y, contentWidth, chunkHeight, 1, 1, "FD");
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.8);
          pdf.setTextColor(45, 55, 70);
          pdf.text(chunk, marginX + 4, y + 3.8);
          y += chunkHeight + 1;
          lineFrom += chunk.length;
          if (lineFrom < descriptionLines.length) addTicketPage("Descrição do trâmite");
        }
        y += 2;
        previousAt = currentAt;
      });
    }
  });

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(125, 135, 150);
    pdf.setDrawColor(225, 230, 237);
    pdf.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);
    pdf.text("SiplanHUB · Relatório SLA Analítico", marginX, pageHeight - 5);
    pdf.text(`Página ${page} de ${totalPages}`, pageWidth - marginX, pageHeight - 5, { align: "right" });
  }

  pdf.save(`relatorio-sla-analitico-${filters.catalog === "legacy" ? "legado-" : ""}${localIsoDate()}.pdf`);
}
