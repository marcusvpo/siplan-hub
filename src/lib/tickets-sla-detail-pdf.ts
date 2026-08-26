import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import {
  buildTicketFlowAnalysis,
  chronologicalTramites,
  elapsedHours,
  formatSlaDuration,
  getResolutionSlaState,
  parseSlaDate,
} from "@/lib/tickets-sla";

interface TicketSlaDetailOptions {
  firstResponseHours: number;
  resolutionDays: number;
}

function safeText(value?: string | null): string {
  return (value?.trim() || "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
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

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function generateTicketSlaDetailPdf(
  chamado: Chamado0800,
  tramites: ChamadoTramite[],
  options: TicketSlaDetailOptions,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;
  const bottomMargin = 14;
  const timeline = chronologicalTramites(tramites);
  const flow = buildTicketFlowAnalysis(chamado, timeline);
  const resolution = getResolutionSlaState(chamado, options.resolutionDays);
  const openedAt = parseSlaDate(chamado.abertoEm || chamado.dataAbertura);
  const firstResponse = timeline.find((item) => (
    parseSlaDate(item.dataTramite)
    && Boolean(item.responsavel || item.equipeResponsavel || item.atividade)
  ));
  const firstResponseElapsed = elapsedHours(openedAt, parseSlaDate(firstResponse?.dataTramite));
  const firstResponseLabel = firstResponseElapsed === null
    ? "Sem atendimento identificado"
    : firstResponseElapsed <= options.firstResponseHours ? "Dentro do SLA" : "Fora do SLA";
  let y = 0;

  const drawTopBar = () => {
    pdf.setFillColor(190, 0, 48);
    pdf.rect(0, 0, pageWidth, 4, "F");
  };

  const addContinuationPage = (section: string) => {
    pdf.addPage();
    drawTopBar();
    y = 10;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 38, 50);
    pdf.text(`Chamado #${chamado.numeroChamado} - ${section}`, marginX, y);
    y += 6;
  };

  const ensureSpace = (height: number, section: string) => {
    if (y + height > pageHeight - bottomMargin) addContinuationPage(section);
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(9, title);
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

  const drawHeader = () => {
    drawTopBar();
    y = 12;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(20, 25, 35);
    pdf.text(`Análise detalhada de atendimento - Chamado #${chamado.numeroChamado}`, marginX, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(95, 105, 120);
    pdf.text(`Gerado pelo SiplanHUB em ${new Date().toLocaleString("pt-BR")}`, pageWidth - marginX, y, { align: "right" });
    y += 7;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 38, 50);
    pdf.text(safeText(chamado.nomeCliente), marginX, y);
    y += 4.5;
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
  };

  const drawSummaryCards = () => {
    const cards = [
      { label: "Tempo total", value: formatSlaDuration(resolution.hours), accent: [190, 0, 48] as const },
      { label: "SLA resolução", value: resolution.label, accent: [5, 150, 105] as const },
      { label: "Primeiro atendimento", value: formatSlaDuration(firstResponseElapsed), accent: [37, 99, 235] as const },
      { label: "SLA primeiro atendimento", value: firstResponseLabel, accent: [225, 29, 72] as const },
      { label: "Transferências", value: String(flow.transfers.length), accent: [124, 58, 237] as const },
      { label: "Maior permanência", value: flow.bottleneck ? `${flow.bottleneck.area} · ${formatSlaDuration(flow.bottleneck.hours)}` : "-", accent: [217, 119, 6] as const },
    ];
    const gap = 3;
    const cardWidth = (contentWidth - gap * 2) / 3;
    const cardHeight = 13;

    cards.forEach((card, index) => {
      const row = Math.floor(index / 3);
      const column = index % 3;
      const x = marginX + column * (cardWidth + gap);
      const cardY = y + row * (cardHeight + gap);
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(225, 230, 237);
      pdf.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, "FD");
      pdf.setFillColor(...card.accent);
      pdf.rect(x, cardY, 2, cardHeight, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(25, 32, 44);
      const valueLines = pdf.splitTextToSize(card.value, cardWidth - 8) as string[];
      pdf.text(valueLines.slice(0, 2), x + 5, cardY + 5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.7);
      pdf.setTextColor(100, 110, 125);
      pdf.text(card.label, x + 5, cardY + 10.5);
    });
    y += cardHeight * 2 + gap + 5;
  };

  drawHeader();
  drawSummaryCards();

  drawSectionTitle("Tempo acumulado por área / etapa");
  const areaColumns = [95, 35, 35, 102];
  const areaHeaders = ["Área / etapa", "Tempo", "Participação", "Intervalos contabilizados"];
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
    ensureSpace(7, "Tempo por área");
    const participation = flow.totalTrackedHours > 0
      ? `${Math.round((area.hours / flow.totalTrackedHours) * 100)}%`
      : "-";
    const values = [area.area, formatSlaDuration(area.hours), participation, String(area.intervals)];
    x = marginX;
    values.forEach((value, columnIndex) => {
      pdf.setFillColor(...(index % 2 === 0 ? [255, 255, 255] : [247, 249, 252]) as [number, number, number]);
      pdf.setDrawColor(220, 225, 232);
      pdf.rect(x, y, areaColumns[columnIndex], 7, "FD");
      pdf.setFont("helvetica", columnIndex === 0 ? "bold" : "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(30, 38, 50);
      pdf.text(safeText(value), x + 1.5, y + 4.4);
      x += areaColumns[columnIndex];
    });
    y += 7;
  });
  y += 4;

  drawSectionTitle("Transferências entre áreas");
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(6.8);
  pdf.setTextColor(95, 105, 120);
  const disclaimer = "Estimativa: o intervalo de repasse vai do último trâmite da área de origem ao primeiro trâmite da área de destino; a origem não registra envio e aceite separadamente.";
  const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth) as string[];
  pdf.text(disclaimerLines, marginX, y);
  y += disclaimerLines.length * 3 + 2;

  if (flow.transfers.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Nenhuma troca de área identificada nos trâmites sincronizados.", marginX, y);
    y += 7;
  } else {
    const transferColumns = [35, 55, 55, 27, 95];
    const transferHeaders = ["Data da entrada", "Área de origem", "Área de destino", "Intervalo", "Atividade / responsável no destino"];
    x = marginX;
    transferHeaders.forEach((header, index) => {
      pdf.setFillColor(37, 45, 58);
      pdf.rect(x, y, transferColumns[index], 6.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.8);
      pdf.setTextColor(255, 255, 255);
      pdf.text(header, x + 1.5, y + 4.1);
      x += transferColumns[index];
    });
    y += 6.5;

    flow.transfers.forEach((transfer, index) => {
      const destinationDetail = [transfer.activity, transfer.responsible].filter(Boolean).join(" · ") || "-";
      const values = [
        formatDateTime(transfer.transferredAt),
        transfer.fromArea,
        transfer.toArea,
        formatSlaDuration(transfer.waitHours),
        destinationDetail,
      ];
      const wrapped = values.map((value, columnIndex) => (
        (pdf.splitTextToSize(safeText(value), transferColumns[columnIndex] - 3) as string[]).slice(0, 3)
      ));
      const rowHeight = Math.max(7, Math.max(...wrapped.map((lines) => lines.length)) * 3 + 2.5);
      ensureSpace(rowHeight, "Transferências entre áreas");
      x = marginX;
      wrapped.forEach((lines, columnIndex) => {
        pdf.setFillColor(...(index % 2 === 0 ? [255, 255, 255] : [247, 249, 252]) as [number, number, number]);
        pdf.setDrawColor(220, 225, 232);
        pdf.rect(x, y, transferColumns[columnIndex], rowHeight, "FD");
        pdf.setFont("helvetica", columnIndex === 2 ? "bold" : "normal");
        pdf.setFontSize(6.7);
        pdf.setTextColor(30, 38, 50);
        pdf.text(lines, x + 1.5, y + 3.8);
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
    pdf.text("Nenhum trâmite sincronizado.", marginX, y);
  } else {
    let previousAt = openedAt;
    timeline.forEach((tramite, index) => {
      const currentAt = parseSlaDate(tramite.dataTramite);
      const gap = elapsedHours(previousAt, currentAt);
      const title = [
        `${index + 1}. ${formatDateTime(tramite.dataTramite)}`,
        `+${formatSlaDuration(gap)}`,
        safeText(tramite.equipeResponsavel),
        safeText(tramite.atividade),
      ].join("  |  ");
      const responsible = tramite.responsavel ? `Responsável: ${safeText(tramite.responsavel)}` : "";
      const descriptionLines = (pdf.splitTextToSize(safeText(tramite.descricao), contentWidth - 8) as string[]).slice(0, 10);
      const blockHeight = 9 + descriptionLines.length * 3;
      ensureSpace(blockHeight, "Linha do tempo dos trâmites");

      pdf.setFillColor(...(index % 2 === 0 ? [248, 250, 252] : [243, 246, 249]) as [number, number, number]);
      pdf.setDrawColor(220, 225, 232);
      pdf.roundedRect(marginX, y, contentWidth, blockHeight - 2, 1, 1, "FD");
      pdf.setFillColor(190, 0, 48);
      pdf.rect(marginX, y, 1.5, blockHeight - 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.3);
      pdf.setTextColor(35, 44, 58);
      pdf.text(title, marginX + 4, y + 4.2);
      if (responsible) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.6);
        pdf.setTextColor(90, 100, 115);
        pdf.text(responsible, pageWidth - marginX - 3, y + 4.2, { align: "right" });
      }
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.8);
      pdf.setTextColor(45, 55, 70);
      pdf.text(descriptionLines, marginX + 4, y + 8);
      y += blockHeight;
      previousAt = currentAt;
    });
  }

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(125, 135, 150);
    pdf.setDrawColor(225, 230, 237);
    pdf.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);
    pdf.text("SiplanHUB · Análise de fluxo do atendimento", marginX, pageHeight - 5);
    pdf.text(`Página ${page} de ${totalPages}`, pageWidth - marginX, pageHeight - 5, { align: "right" });
  }

  pdf.save(`chamado-${chamado.numeroChamado}-analise-atendimento-${localIsoDate()}.pdf`);
}
