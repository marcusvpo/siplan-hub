import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import {
  formatChamadosProductLabel,
  getChamadosProductLabel,
  type ChamadosCatalog,
} from "@/lib/chamados-catalog";
import type { ChamadosReportFilters } from "@/lib/chamados-report-pdf";
import {
  isTicketCompleted,
  ticketDaysBetween,
  type TicketsAiAnalytics,
  buildTicketsAiAnalytics,
} from "@/lib/tickets-ai-analytics";
import {
  chronologicalTramites,
  formatSlaDuration,
  getOfficialSlaState,
  getSlaCheckpointDisplay,
} from "@/lib/tickets-sla";
import {
  downloadXlsxWorkbook,
  type XlsxCellValue,
  type XlsxSheet,
} from "@/lib/xlsx-export";

const EXCEL_MAX_ROWS = 1_048_576;
const EXCEL_TEXT_PART_LENGTH = 30_000;

export interface ChamadosSpreadsheetOptions {
  generatedAt?: Date;
  format?: "xlsx" | "csv_chamados" | "csv_tramites";
}

interface TicketExportEntry {
  chamado: Chamado0800;
  tramites: ChamadoTramite[];
}

export function buildChamadosSpreadsheetWorkbook(
  chamados: Chamado0800[],
  tramitesPorChamado: ReadonlyMap<string, ChamadoTramite[]>,
  filters: ChamadosReportFilters,
  options: ChamadosSpreadsheetOptions = {},
): XlsxSheet[] {
  const generatedAt = options.generatedAt ?? new Date();
  const catalog = filters.catalog ?? "orion";

  const entries: TicketExportEntry[] = chamados.map((chamado) => {
    const ticketTramites = chronologicalTramites(
      tramitesPorChamado.get(chamado.numeroChamado) ?? [],
    );
    return {
      chamado,
      tramites: ticketTramites,
    };
  });

  const totalTramites = entries.reduce((total, entry) => total + entry.tramites.length, 0);

  const sheets: XlsxSheet[] = [
    buildDetailedTicketsSheet(entries, catalog, generatedAt),
    buildAllTramitesSheet(entries, catalog),
    buildFilterSummarySheet(entries, filters, generatedAt, totalTramites),
  ].flatMap(splitSheetAtExcelLimit);

  return sheets;
}

function buildDetailedTicketsSheet(
  entries: TicketExportEntry[],
  catalog: ChamadosCatalog,
  generatedAt: Date,
): XlsxSheet {
  const descriptions = entries.map(({ chamado }) => splitExcelText(chamado.descricao));
  const maxDescParts = Math.max(1, ...descriptions.map((parts) => parts.length));

  const headers = [
    "Chamado",
    "Cliente / Serventia",
    "Código do Cliente",
    "Título do Chamado",
    "Status",
    "Natureza",
    "Criticidade",
    "Tema (IA)",
    "Produto",
    "Software / Módulo",
    "Equipe Responsável",
    "Analista Responsável",
    "Solicitante",
    "Data de Abertura",
    "Abertura (Data/Hora)",
    "Data de Encerramento",
    "Encerramento (Data/Hora)",
    "Dias em Aberto / Resolução",
    "Tempo Formatado",
    "Situação Geral do SLA",
    "1ª Resposta Prevista",
    "1ª Resposta Realizada",
    "1ª Resposta Situação",
    "Tempo 1ª Resposta Previsto (min)",
    "Vencimento do SLA",
    "Tempo Resolução Previsto (min)",
    "Tempo Restante (min)",
    "Vencimento Pausado",
    "Vencimento Manual",
    "Retorno Previsto",
    "Retorno Realizado",
    "Qtd. de Trâmites",
    "Último Trâmite - Data/Hora",
    "Último Trâmite - Responsável",
    "Último Trâmite - Equipe",
    "Último Trâmite - Atividade",
    "Último Trâmite - Descrição",
    ...textPartHeaders("Descrição de Abertura", maxDescParts),
  ];

  const rows: XlsxCellValue[][] = [
    headers,
    ...entries.map(({ chamado, tramites }, index) => {
      const isCompleted = isTicketCompleted(chamado);
      const days = isCompleted
        ? ticketDaysBetween(chamado.dataAbertura, chamado.dataEncerramento)
        : ticketDaysOpenAt(chamado.dataAbertura, generatedAt);

      const daysLabel = days === null ? "—" : `${days} ${days === 1 ? "dia" : "dias"}`;

      const sla = getOfficialSlaState(chamado, generatedAt);
      const firstResponse = getSlaCheckpointDisplay(sla.firstResponse, "firstResponse");

      const ultimoTramite = tramites.length > 0 ? tramites[tramites.length - 1] : undefined;

      return [
        chamado.numeroChamado,
        chamado.nomeCliente || "—",
        chamado.codigoCliente || "",
        chamado.titulo || "(sem título)",
        chamado.status || "—",
        chamado.natureza || "—",
        chamado.criticidade || "—",
        chamado.tema || "—",
        chamado.produto || "—",
        formatChamadosProductLabel(chamado.software || chamado.produto, catalog),
        chamado.equipeResponsavel || "—",
        chamado.analistaResponsavel || "—",
        chamado.solicitante || "—",
        formatDate(chamado.dataAbertura),
        formatDateTime(chamado.abertoEm || chamado.dataAbertura),
        isCompleted ? formatDate(chamado.dataEncerramento) : "Em aberto",
        isCompleted ? formatDateTime(chamado.encerradoEm || chamado.dataEncerramento) : "Em aberto",
        days,
        daysLabel,
        sla.label,
        formatDateTime(sla.firstResponse.deadline),
        formatDateTime(sla.firstResponse.completedAt),
        firstResponse.label,
        chamado.slaTempoPrimeiraRespostaMinutos ?? "",
        formatDateTime(sla.resolution.deadline),
        chamado.slaTempoVencimentoMinutos ?? "",
        chamado.slaTempoRestanteMinutos ?? "",
        yesNo(chamado.slaVencimentoPausado),
        yesNo(chamado.slaVencimentoManual),
        formatDateTime(chamado.slaRetornoPrevistoEm),
        formatDateTime(chamado.slaRetornoRealEm),
        tramites.length,
        ultimoTramite ? formatDateTime(ultimoTramite.dataTramite) : "—",
        ultimoTramite?.responsavel || "—",
        ultimoTramite?.equipeResponsavel || "—",
        ultimoTramite?.atividade || "—",
        ultimoTramite?.descricao ? sanitizeSingleLine(ultimoTramite.descricao, 300) : "—",
        ...padTextParts(descriptions[index], maxDescParts),
      ];
    }),
  ];

  return {
    name: "Chamados Detalhados",
    rows,
    frozenRows: 1,
    autoFilter: true,
  };
}

function buildAllTramitesSheet(
  entries: TicketExportEntry[],
  catalog: ChamadosCatalog,
): XlsxSheet {
  const tramitesList = entries.flatMap(({ chamado, tramites }) =>
    tramites.map((tramite) => ({
      chamado,
      tramite,
      descriptionParts: splitExcelText(tramite.descricao),
    }))
  );

  const maxDescParts = Math.max(
    1,
    ...tramitesList.map(({ descriptionParts }) => descriptionParts.length),
  );

  const headers = [
    "Chamado",
    "Cliente / Serventia",
    "Título do Chamado",
    "Status Atual",
    "Módulo / Software",
    "Nº do Trâmite",
    "Sequência",
    "Data/Hora do Trâmite",
    "Responsável",
    "Equipe Responsável",
    "Atividade",
    ...textPartHeaders("Descrição do Trâmite", maxDescParts),
  ];

  const rows: XlsxCellValue[][] = [
    headers,
    ...tramitesList.map(({ chamado, tramite, descriptionParts }) => [
      chamado.numeroChamado,
      chamado.nomeCliente || "—",
      chamado.titulo || "(sem título)",
      chamado.status || "—",
      formatChamadosProductLabel(chamado.software || chamado.produto, catalog),
      tramite.numeroTramite ?? tramite.sequenciaTramite,
      tramite.sequenciaTramite,
      formatDateTime(tramite.dataTramite),
      tramite.responsavel || "—",
      tramite.equipeResponsavel || "—",
      tramite.atividade || "—",
      ...padTextParts(descriptionParts, maxDescParts),
    ]),
  ];

  return {
    name: "Histórico de Trâmites",
    rows,
    frozenRows: 1,
    autoFilter: true,
  };
}

function buildFilterSummarySheet(
  entries: TicketExportEntry[],
  filters: ChamadosReportFilters,
  generatedAt: Date,
  totalTramites: number,
): XlsxSheet {
  const catalog = filters.catalog ?? "orion";
  const productLabel = catalog === "legacy"
    ? formatList(filters.products, "Todas as famílias legadas")
    : getChamadosProductLabel(filters.product, catalog);

  const totalChamados = entries.length;
  const uniqueClients = new Set(entries.map((e) => e.chamado.nomeCliente).filter(Boolean)).size;
  const completed = entries.filter((e) => isTicketCompleted(e.chamado)).length;
  const open = totalChamados - completed;

  // Contagens por Status
  const statusCounts = new Map<string, number>();
  entries.forEach(({ chamado }) => {
    const s = chamado.status || "Não informado";
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  });

  // Contagens por Natureza
  const natureCounts = new Map<string, number>();
  entries.forEach(({ chamado }) => {
    const n = chamado.natureza || "Não informada";
    natureCounts.set(n, (natureCounts.get(n) ?? 0) + 1);
  });

  // Contagens por Equipe
  const groupCounts = new Map<string, number>();
  entries.forEach(({ chamado }) => {
    const g = chamado.equipeResponsavel || "Não informada";
    groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
  });

  const periodoTexto = filters.startDate && filters.endDate
    ? `${formatDate(filters.startDate)} até ${formatDate(filters.endDate)}`
    : filters.endDate
    ? `Até ${formatDate(filters.endDate)} (Todo o histórico)`
    : filters.startDate
    ? `A partir de ${formatDate(filters.startDate)}`
    : "Todo o histórico (sem limite de datas)";

  const rows: XlsxCellValue[][] = [
    ["Parâmetro do Filtro", "Valor Aplicado na Visualização"],
    ["Relatório", "Levantamento Completo de Chamados e Trâmites"],
    ["Data de Geração", formatDateTime(generatedAt)],
    ["Catálogo", catalog === "legacy" ? "Chamados Legados" : "Chamados Orion / Atuais"],
    ["Período de Abertura", periodoTexto],
    ["Clientes / Serventias", formatList(filters.clients, "Todos os clientes")],
    ["Produto / Família", productLabel],
    ["Software / Módulo", formatList(filters.softwares, "Todos os módulos")],
    ["Grupos / Equipes Responsáveis", formatList(filters.groups, "Todas as equipes")],
    ["Analistas Responsáveis", formatList(filters.analysts, "Todos os analistas")],
    ["Natureza", filters.nature && filters.nature !== "todas" ? filters.nature : "Todas as naturezas"],
    ["Status Selecionados", formatList(filters.statuses, "Todos os status")],
    ["Termos de Busca / Palavras-chave", filters.searchTerm?.trim() || "Nenhum"],
    ["", ""],
    ["Totais Gerais", "Quantidade"],
    ["Total de Chamados Exportados", totalChamados],
    ["Total de Trâmites Vinculados", totalTramites],
    ["Serventias / Clientes Distintos", uniqueClients],
    ["Chamados Concluídos", completed],
    ["Chamados em Aberto", open],
    ["Taxa de Conclusão", totalChamados > 0 ? `${round((completed / totalChamados) * 100)}%` : "0%"],
    ["", ""],
    ["Distribuição por Status", "Quantidade", "Percentual (%)"],
    ...Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([statusName, count]) => [
        statusName,
        count,
        totalChamados > 0 ? `${round((count / totalChamados) * 100)}%` : "0%",
      ]),
    ["", "", ""],
    ["Distribuição por Natureza", "Quantidade", "Percentual (%)"],
    ...Array.from(natureCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([natureName, count]) => [
        natureName,
        count,
        totalChamados > 0 ? `${round((count / totalChamados) * 100)}%` : "0%",
      ]),
    ["", "", ""],
    ["Distribuição por Equipe Responsável", "Quantidade", "Percentual (%)"],
    ...Array.from(groupCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([groupName, count]) => [
        groupName,
        count,
        totalChamados > 0 ? `${round((count / totalChamados) * 100)}%` : "0%",
      ]),
  ];

  return {
    name: "Resumo e Filtros",
    rows,
    frozenRows: 1,
    headerRows: [0, 14, 22, 22 + statusCounts.size + 2, 22 + statusCounts.size + 2 + natureCounts.size + 2],
    autoFilter: false,
  };
}

export async function generateChamadosSpreadsheet(
  chamados: Chamado0800[],
  tramitesPorChamado: ReadonlyMap<string, ChamadoTramite[]>,
  filters: ChamadosReportFilters,
  options: ChamadosSpreadsheetOptions = {},
): Promise<void> {
  if (!chamados.length) {
    throw new Error("Não há chamados na visualização atual para exportar.");
  }

  const generatedAt = options.generatedAt ?? new Date();
  const format = options.format ?? "xlsx";
  const catalog = filters.catalog ?? "orion";

  const baseFilename = [
    "chamados-levantamento",
    catalog,
    filters.startDate || "inicio",
    filters.endDate || "fim",
    localIsoDate(generatedAt),
  ].join("-");

  if (format === "csv_chamados") {
    downloadCsv(`${baseFilename}-chamados.csv`, buildChamadosCsvContent(chamados, tramitesPorChamado, catalog, generatedAt));
    return;
  }

  if (format === "csv_tramites") {
    downloadCsv(`${baseFilename}-tramites.csv`, buildTramitesCsvContent(chamados, tramitesPorChamado, catalog));
    return;
  }

  // Padrão: .xlsx completo com todas as abas
  const sheets = buildChamadosSpreadsheetWorkbook(chamados, tramitesPorChamado, filters, {
    ...options,
    generatedAt,
  });

  await downloadXlsxWorkbook(`${baseFilename}.xlsx`, sheets);
}

function buildChamadosCsvContent(
  chamados: Chamado0800[],
  tramitesPorChamado: ReadonlyMap<string, ChamadoTramite[]>,
  catalog: ChamadosCatalog,
  generatedAt: Date,
): string {
  const headers = [
    "Chamado",
    "Cliente",
    "Código Cliente",
    "Título",
    "Status",
    "Natureza",
    "Criticidade",
    "Tema",
    "Produto",
    "Software",
    "Equipe",
    "Analista",
    "Solicitante",
    "Data Abertura",
    "Data Encerramento",
    "Dias em Aberto",
    "SLA Situação",
    "1ª Resposta Prevista",
    "1ª Resposta Real",
    "Vencimento SLA",
    "Qtd Trâmites",
    "Descrição",
  ];

  const rows = chamados.map((c) => {
    const isCompleted = isTicketCompleted(c);
    const days = isCompleted
      ? ticketDaysBetween(c.dataAbertura, c.dataEncerramento)
      : ticketDaysOpenAt(c.dataAbertura, generatedAt);
    const sla = getOfficialSlaState(c, generatedAt);
    const tramites = tramitesPorChamado.get(c.numeroChamado) ?? [];

    return [
      c.numeroChamado,
      c.nomeCliente || "",
      c.codigoCliente || "",
      c.titulo || "",
      c.status || "",
      c.natureza || "",
      c.criticidade || "",
      c.tema || "",
      c.produto || "",
      formatChamadosProductLabel(c.software || c.produto, catalog),
      c.equipeResponsavel || "",
      c.analistaResponsavel || "",
      c.solicitante || "",
      formatDate(c.dataAbertura),
      isCompleted ? formatDate(c.dataEncerramento) : "Em aberto",
      days ?? "",
      sla.label,
      formatDateTime(sla.firstResponse.deadline),
      formatDateTime(sla.firstResponse.completedAt),
      formatDateTime(sla.resolution.deadline),
      tramites.length,
      c.descricao || "",
    ];
  });

  return toCsvString([headers, ...rows]);
}

function buildTramitesCsvContent(
  chamados: Chamado0800[],
  tramitesPorChamado: ReadonlyMap<string, ChamadoTramite[]>,
  catalog: ChamadosCatalog,
): string {
  const headers = [
    "Chamado",
    "Cliente",
    "Título",
    "Status Chamado",
    "Módulo",
    "Nº Trâmite",
    "Data Trâmite",
    "Responsável",
    "Equipe",
    "Atividade",
    "Descrição Trâmite",
  ];

  const rows = chamados.flatMap((c) => {
    const tramites = chronologicalTramites(tramitesPorChamado.get(c.numeroChamado) ?? []);
    return tramites.map((t) => [
      c.numeroChamado,
      c.nomeCliente || "",
      c.titulo || "",
      c.status || "",
      formatChamadosProductLabel(c.software || c.produto, catalog),
      t.numeroTramite ?? t.sequenciaTramite,
      formatDateTime(t.dataTramite),
      t.responsavel || "",
      t.equipeResponsavel || "",
      t.atividade || "",
      t.descricao || "",
    ]);
  });

  return toCsvString([headers, ...rows]);
}

function toCsvString(data: Array<Array<string | number | boolean | null | undefined>>): string {
  const bom = "\uFEFF";
  const lines = data.map((row) =>
    row
      .map((val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(";")
  );
  return bom + lines.join("\r\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function splitSheetAtExcelLimit(sheet: XlsxSheet): XlsxSheet[] {
  if (sheet.rows.length <= EXCEL_MAX_ROWS) return [sheet];

  const header = sheet.rows[0] ?? [];
  const dataRowsPerSheet = EXCEL_MAX_ROWS - 1;
  const dataRowCount = Math.max(0, sheet.rows.length - 1);
  const partCount = Math.ceil(dataRowCount / dataRowsPerSheet);

  return Array.from({ length: partCount }, (_, index) => {
    const start = 1 + index * dataRowsPerSheet;
    return {
      ...sheet,
      name: `${sheet.name} ${index + 1}`,
      rows: [header, ...sheet.rows.slice(start, start + dataRowsPerSheet)],
    };
  });
}

function splitExcelText(value?: string | null): string[] {
  if (!value) return [""];

  const parts: string[] = [];
  for (let start = 0; start < value.length;) {
    let end = Math.min(start + EXCEL_TEXT_PART_LENGTH, value.length);
    const lastCode = value.charCodeAt(end - 1);
    if (end < value.length && lastCode >= 0xD800 && lastCode <= 0xDBFF) end -= 1;
    parts.push(value.slice(start, end));
    start = end;
  }
  return parts;
}

function textPartHeaders(label: string, partCount: number): string[] {
  return Array.from({ length: partCount }, (_, index) => (
    index === 0 ? label : `${label} — continuação ${index + 1}`
  ));
}

function padTextParts(parts: string[], partCount: number): string[] {
  return Array.from({ length: partCount }, (_, index) => parts[index] ?? "");
}

function sanitizeSingleLine(value: string, maxLength: number): string {
  const singleLine = value.replace(/\r?\n+/g, " ").trim();
  return singleLine.length <= maxLength ? singleLine : `${singleLine.slice(0, maxLength)}...`;
}

function ticketDaysOpenAt(start: string | undefined, now: Date) {
  if (!start) return null;
  const openedAt = new Date(start);
  if (Number.isNaN(openedAt.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - openedAt.getTime()) / 86_400_000));
}

function formatList(values: string[] | undefined, fallback: string) {
  return values && values.length > 0 ? values.join(", ") : fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function yesNo(value?: boolean) {
  return value ? "Sim" : "Não";
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
