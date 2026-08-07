import type { Chamado0800 } from "@/hooks/useChamados0800";
import { formatOrionProductLabel } from "@/lib/chamados-product-filter";

export interface ChamadosReportFilters {
  startDate?: string | null;
  endDate?: string | null;
  clients: string[];
  product?: string | null;
  nature?: string | null;
  statuses: string[];
  searchTerm?: string | null;
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function text(value?: string | null): string {
  return (value?.trim() || "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function summarizeClients(clients: string[]): string {
  if (clients.length === 0) return "Todos";
  if (clients.length <= 3) return clients.join(", ");
  return `${clients.slice(0, 3).join(", ")} e mais ${clients.length - 3}`;
}

export async function generateChamadosReportPdf(
  chamados: Chamado0800[],
  filters: ChamadosReportFilters
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 15;
  const bottomMargin = 12;
  const lineHeight = 3.2;
  let y = 0;

  const productLabel =
    !filters.product || filters.product === "todos"
      ? "Todos os produtos Orion"
      : formatOrionProductLabel(filters.product);
  const natureLabel =
    !filters.nature || filters.nature === "todas" ? "Todas" : filters.nature;
  const statusLabel = filters.statuses.length > 0 ? filters.statuses.join(", ") : "Todos";
  const generatedAt = new Date().toLocaleString("pt-BR");
  const uniqueClients = new Set(chamados.map((item) => item.nomeCliente).filter(Boolean)).size;
  const concluded = chamados.filter((item) =>
    (item.status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("conclu")
  ).length;
  const open = chamados.length - concluded;

  const drawSummaryCard = (
    x: number,
    label: string,
    value: number,
    accent: [number, number, number]
  ) => {
    const width = 63.75;
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

  const drawReportHeader = () => {
    pdf.setFillColor(190, 0, 48);
    pdf.rect(0, 0, pageWidth, 4, "F");
    y = 12;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(20, 25, 35);
    pdf.text("Relatório de Chamados - Ellevo/0800", marginX, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(95, 105, 120);
    pdf.text(`Gerado pelo SiplanHUB em ${generatedAt}`, pageWidth - marginX, y, {
      align: "right",
    });
    y += 7;

    pdf.setFontSize(8.5);
    pdf.setTextColor(45, 55, 70);
    const filterDescription = [
      `Período: ${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`,
      `Produto: ${productLabel}`,
      `Natureza: ${text(natureLabel)}`,
      `Status: ${text(statusLabel)}`,
      `Clientes: ${text(summarizeClients(filters.clients))}`,
      `Busca: ${text(filters.searchTerm)}`,
    ].join("  |  ");
    const filterLines = pdf.splitTextToSize(filterDescription, pageWidth - marginX * 2);
    pdf.text(filterLines, marginX, y);
    y += filterLines.length * 3.5 + 3;

    drawSummaryCard(marginX, "Chamados encontrados", chamados.length, [190, 0, 48]);
    drawSummaryCard(marginX + 67.75, "Clientes / serventias", uniqueClients, [71, 85, 105]);
    drawSummaryCard(marginX + 135.5, "Concluídos", concluded, [5, 150, 105]);
    drawSummaryCard(marginX + 203.25, "Em aberto", open, [37, 99, 235]);
    y += 16;
  };

  const columns = [
    { label: "Chamado", width: 20, value: (item: Chamado0800) => `#${item.numeroChamado}` },
    { label: "Serventia / Cliente", width: 62, value: (item: Chamado0800) => text(item.nomeCliente) },
    { label: "Título", width: 62, value: (item: Chamado0800) => text(item.titulo) },
    { label: "Natureza", width: 40, value: (item: Chamado0800) => text(item.natureza) },
    { label: "Produto", width: 28, value: (item: Chamado0800) => formatOrionProductLabel(item.software) },
    { label: "Status", width: 32, value: (item: Chamado0800) => text(item.status) },
    { label: "Abertura", width: 23, value: (item: Chamado0800) => formatDate(item.dataAbertura) },
  ];

  const drawTableHeader = () => {
    let x = marginX;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.3);
    for (const column of columns) {
      pdf.setFillColor(37, 45, 58);
      pdf.setDrawColor(37, 45, 58);
      pdf.rect(x, y, column.width, 6.5, "F");
      pdf.rect(x, y, column.width, 6.5, "S");
      pdf.setTextColor(255, 255, 255);
      pdf.text(column.label, x + 1.5, y + 4);
      x += column.width;
    }
    y += 6.5;
  };

  const startContinuationPage = () => {
    pdf.addPage();
    pdf.setFillColor(190, 0, 48);
    pdf.rect(0, 0, pageWidth, 3, "F");
    y = 9;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(45, 55, 70);
    pdf.text("Relatório de Chamados - continuação", marginX, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 110, 125);
    pdf.text(`${chamados.length} chamado(s) no relatório`, pageWidth - marginX, y, {
      align: "right",
    });
    y += 5;
    drawTableHeader();
  };

  drawReportHeader();
  drawTableHeader();

  chamados.forEach((item, rowIndex) => {
    const wrappedCells = columns.map((column) => {
      const lines = pdf.splitTextToSize(text(column.value(item)), column.width - 3) as string[];
      if (lines.length <= 5) return lines;
      const visible = lines.slice(0, 5);
      visible[4] = `${visible[4].replace(/\s+$/, "")}...`;
      return visible;
    });
    const rowHeight = Math.max(7, Math.max(...wrappedCells.map((lines) => lines.length)) * lineHeight + 3);

    if (y + rowHeight > pageHeight - bottomMargin) startContinuationPage();

    let x = marginX;
    wrappedCells.forEach((lines, index) => {
      const column = columns[index];
      const fill: [number, number, number] =
        rowIndex % 2 === 0 ? [255, 255, 255] : [247, 249, 252];
      // O jsPDF consome o estilo de pintura depois de cada retângulo. As cores
      // precisam ser reaplicadas em cada célula para não herdarem o cabeçalho.
      pdf.setFillColor(...fill);
      pdf.setDrawColor(220, 225, 232);
      pdf.rect(x, y, column.width, rowHeight, "F");
      pdf.rect(x, y, column.width, rowHeight, "S");

      pdf.setFont("helvetica", index === 0 ? "bold" : "normal");
      pdf.setFontSize(7);
      if (index === 0) {
        pdf.setTextColor(190, 0, 48);
      } else if (index === 5 && (item.status || "").toLowerCase().includes("conclu")) {
        pdf.setTextColor(5, 130, 90);
      } else {
        pdf.setTextColor(30, 38, 50);
      }
      pdf.text(lines, x + 1.5, y + 3.7);
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
    pdf.text("SiplanHUB · Consulta de Chamados", marginX, pageHeight - 5);
    pdf.text(`Página ${page} de ${totalPages}`, pageWidth - marginX, pageHeight - 5, {
      align: "right",
    });
  }

  pdf.save(`relatorio-chamados-${localIsoDate()}.pdf`);
}
