import type { Chamado0800, ChamadoReportRow } from "@/hooks/useChamados0800";
import {
  formatChamadosProductLabel,
  getChamadosProductLabel,
  type ChamadosCatalog,
} from "@/lib/chamados-catalog";

export interface ChamadosReportFilters {
  catalog?: ChamadosCatalog;
  startDate?: string | null;
  endDate?: string | null;
  clients: string[];
  product?: string | null;
  products?: string[];
  softwares?: string[];
  nature?: string | null;
  statuses: string[];
  searchTerm?: string | null;
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "data não informada";
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!match) return value;
  const [, year, month, day, hour, minute, second] = match;
  const time = hour && minute ? ` ${hour}:${minute}${second ? `:${second}` : ""}` : "";
  return `${day}/${month}/${year}${time}`;
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

function latestTramiteText(item: ChamadoReportRow): string {
  const tramite = item.ultimoTramite;
  if (!tramite) return "Último trâmite: nenhum trâmite registrado.";

  const metadata = [
    tramite.numeroTramite ? `Trâmite ${tramite.numeroTramite}` : "Último trâmite",
    formatDateTime(tramite.dataTramite),
    tramite.responsavel,
    tramite.atividade,
  ].filter(Boolean);

  return `${metadata.join(" | ")} - ${text(tramite.descricao)}`;
}

export async function generateChamadosReportPdf(
  chamados: ChamadoReportRow[],
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

  const catalog = filters.catalog ?? "orion";
  const productLabel = catalog === "legacy"
    ? filters.products?.length ? filters.products.join(", ") : "Todos os produtos"
    : getChamadosProductLabel(filters.product, catalog);
  const softwareLabel = filters.softwares?.length
    ? filters.softwares.join(", ")
    : "Todos os softwares";
  const reportTitle = catalog === "legacy"
    ? "Relatório de Chamados - Ellevo/0800 - Legado"
    : "Relatório de Chamados - Ellevo/0800";
  const natureLabel =
    !filters.nature || filters.nature === "todas" ? "Todas" : filters.nature;
  const statusLabel = filters.statuses.length > 0 ? filters.statuses.join(", ") : "Todos";
  const generatedAt = new Date().toLocaleString("pt-BR");
  const uniqueClients = new Set(chamados.map((item) => item.nomeCliente).filter(Boolean)).size;
  const concluded = chamados.filter((item) =>
    (item.status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("conclu")
  ).length;
  const open = chamados.length - concluded;
  const natureGroups = Array.from(
    chamados.reduce((groups, item) => {
      const nature = item.natureza?.trim() || "Sem natureza";
      const key = nature
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
      const group = groups.get(key) || { label: nature, items: [] };
      group.items.push(item);
      groups.set(key, group);
      return groups;
    }, new Map<string, { label: string; items: ChamadoReportRow[] }>())
  )
    .map(([, group]) => [group.label, group.items] as const)
    .sort(([natureA], [natureB]) =>
      natureA.localeCompare(natureB, "pt-BR", { sensitivity: "base" })
  );

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

  const drawNatureSummary = () => {
    const cardsPerRow = 4;
    const gap = 2;
    const cardWidth = (pageWidth - marginX * 2 - gap * (cardsPerRow - 1)) / cardsPerRow;
    const cardHeight = 9;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(65, 75, 90);
    pdf.text("Chamados por natureza", marginX, y);
    y += 2.5;

    natureGroups.forEach(([nature, items], index) => {
      const column = index % cardsPerRow;
      const x = marginX + column * (cardWidth + gap);
      if (column === 0 && index > 0) y += cardHeight + gap;

      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(225, 230, 237);
      pdf.roundedRect(x, y, cardWidth, cardHeight, 1.2, 1.2, "FD");
      pdf.setFillColor(190, 0, 48);
      pdf.rect(x, y, 1.2, cardHeight, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(25, 32, 44);
      pdf.text(String(items.length), x + 4, y + 5.4);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(85, 95, 110);
      const natureLines = pdf.splitTextToSize(nature, cardWidth - 15) as string[];
      const label = natureLines[0] || "Sem natureza";
      pdf.text(label.length > 34 ? `${label.slice(0, 31)}...` : label, x + 12, y + 5.3);
    });

    y += cardHeight + 5;
  };

  const drawReportHeader = () => {
    pdf.setFillColor(190, 0, 48);
    pdf.rect(0, 0, pageWidth, 4, "F");
    y = 12;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(20, 25, 35);
    pdf.text(reportTitle, marginX, y);

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
      ...(catalog === "legacy" ? [`Software: ${softwareLabel}`] : []),
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
    drawNatureSummary();
  };

  const columns = catalog === "legacy"
    ? [
        { label: "Chamado", width: 18, value: (item: Chamado0800) => `#${item.numeroChamado}` },
        { label: "Serventia / Cliente", width: 50, value: (item: Chamado0800) => text(item.nomeCliente) },
        { label: "Título", width: 48, value: (item: Chamado0800) => text(item.titulo) },
        { label: "Natureza", width: 32, value: (item: Chamado0800) => text(item.natureza) },
        { label: "Produto", width: 22, value: (item: Chamado0800) => text(item.produto) },
        { label: "Software", width: 42, value: (item: Chamado0800) => text(item.software) },
        { label: "Status", width: 28, value: (item: Chamado0800) => text(item.status) },
        { label: "Abertura", width: 22, value: (item: Chamado0800) => formatDate(item.dataAbertura) },
      ]
    : [
        { label: "Chamado", width: 20, value: (item: Chamado0800) => `#${item.numeroChamado}` },
        { label: "Serventia / Cliente", width: 62, value: (item: Chamado0800) => text(item.nomeCliente) },
        { label: "Título", width: 62, value: (item: Chamado0800) => text(item.titulo) },
        { label: "Natureza", width: 40, value: (item: Chamado0800) => text(item.natureza) },
        { label: "Produto", width: 28, value: (item: Chamado0800) => formatChamadosProductLabel(item.software, catalog) },
        { label: "Status", width: 32, value: (item: Chamado0800) => text(item.status) },
        { label: "Abertura", width: 23, value: (item: Chamado0800) => formatDate(item.dataAbertura) },
      ];
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);

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
    pdf.text(`${reportTitle} - continuação`, marginX, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 110, 125);
    pdf.text(`${chamados.length} chamado(s) no relatório`, pageWidth - marginX, y, {
      align: "right",
    });
    y += 5;
    drawTableHeader();
  };

  const drawNatureGroupHeader = (
    nature: string,
    count: number,
    continuation = false
  ) => {
    const height = 7;
    pdf.setFillColor(235, 238, 244);
    pdf.setDrawColor(215, 221, 230);
    pdf.rect(marginX, y, tableWidth, height, "FD");
    pdf.setFillColor(190, 0, 48);
    pdf.rect(marginX, y, 1.5, height, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(35, 44, 58);
    pdf.text(
      `${nature}${continuation ? " (continuação)" : ""}`,
      marginX + 3.5,
      y + 4.5
    );
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(90, 100, 115);
    pdf.text(`${count} chamado(s)`, marginX + tableWidth - 3, y + 4.5, {
      align: "right",
    });
    y += height;
  };

  const prepareChamadoLayout = (item: ChamadoReportRow) => {
    const wrappedCells = columns.map((column) => {
      const lines = pdf.splitTextToSize(text(column.value(item)), column.width - 3) as string[];
      if (lines.length <= 5) return lines;
      const visible = lines.slice(0, 5);
      visible[4] = `${visible[4].replace(/\s+$/, "")}...`;
      return visible;
    });
    const rowHeight = Math.max(
      7,
      Math.max(...wrappedCells.map((lines) => lines.length)) * lineHeight + 3
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.4);
    const allTramiteLines = pdf.splitTextToSize(
      text(latestTramiteText(item)),
      tableWidth - 5
    ) as string[];
    const tramiteLines = allTramiteLines.slice(0, 3);
    if (allTramiteLines.length > 3) {
      tramiteLines[2] = `${tramiteLines[2].replace(/\s+$/, "")}...`;
    }
    const tramiteRowHeight = Math.max(5.8, tramiteLines.length * 2.7 + 2.2);

    return {
      wrappedCells,
      rowHeight,
      tramiteLines,
      tramiteRowHeight,
      totalHeight: rowHeight + tramiteRowHeight,
    };
  };

  drawReportHeader();
  drawTableHeader();

  let rowIndex = 0;
  natureGroups.forEach(([nature, items]) => {
    const firstLayout = items[0] ? prepareChamadoLayout(items[0]) : null;
    if (
      firstLayout &&
      y + 7 + firstLayout.totalHeight > pageHeight - bottomMargin
    ) {
      startContinuationPage();
    }
    drawNatureGroupHeader(nature, items.length);

    items.forEach((item, itemIndex) => {
      const layout = itemIndex === 0 && firstLayout ? firstLayout : prepareChamadoLayout(item);
      if (y + layout.totalHeight > pageHeight - bottomMargin) {
        startContinuationPage();
        drawNatureGroupHeader(nature, items.length, true);
      }

      let x = marginX;
      layout.wrappedCells.forEach((lines, index) => {
        const column = columns[index];
        const fill: [number, number, number] =
          rowIndex % 2 === 0 ? [255, 255, 255] : [247, 249, 252];
        // O jsPDF consome o estilo de pintura depois de cada retângulo. As cores
        // precisam ser reaplicadas em cada célula para não herdarem o cabeçalho.
        pdf.setFillColor(...fill);
        pdf.setDrawColor(220, 225, 232);
        pdf.rect(x, y, column.width, layout.rowHeight, "F");
        pdf.rect(x, y, column.width, layout.rowHeight, "S");

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
      y += layout.rowHeight;

      const tramiteFill: [number, number, number] =
        rowIndex % 2 === 0 ? [246, 248, 251] : [241, 244, 248];
      pdf.setFillColor(...tramiteFill);
      pdf.setDrawColor(220, 225, 232);
      pdf.rect(marginX, y, tableWidth, layout.tramiteRowHeight, "F");
      pdf.rect(marginX, y, tableWidth, layout.tramiteRowHeight, "S");
      pdf.setFillColor(190, 0, 48);
      pdf.rect(marginX, y, 1.2, layout.tramiteRowHeight, "F");
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(6.4);
      pdf.setTextColor(75, 85, 100);
      pdf.text(layout.tramiteLines, marginX + 2.5, y + 3.2);
      y += layout.tramiteRowHeight;
      rowIndex += 1;
    });
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

  pdf.save(`relatorio-chamados${catalog === "legacy" ? "-legado" : ""}-${localIsoDate()}.pdf`);
}
