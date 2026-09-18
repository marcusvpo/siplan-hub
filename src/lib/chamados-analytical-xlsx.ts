import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import {
  formatChamadosProductLabel,
  getChamadosProductLabel,
  type ChamadosCatalog,
} from "@/lib/chamados-catalog";
import type { ChamadosReportFilters } from "@/lib/chamados-report-pdf";
import {
  buildTicketsAiAnalytics,
  isTicketCompleted,
  ticketDaysBetween,
  ticketDaysOpen,
  type TicketsAiAnalytics,
} from "@/lib/tickets-ai-analytics";
import type { TicketsAiReportAnalysis } from "@/lib/tickets-ai-report-pdf";
import {
  buildTicketFlowAnalysis,
  buildTicketSectorAnalysis,
  chronologicalTramites,
  formatSlaDuration,
  getOfficialSlaState,
  getSlaCheckpointDisplay,
  type TicketAreaStageOutcome,
  type TicketFlowAnalysis,
} from "@/lib/tickets-sla";
import {
  downloadXlsxWorkbook,
  type XlsxCellValue,
  type XlsxChart,
  type XlsxSheet,
} from "@/lib/xlsx-export";

export interface ChamadosAnalyticalWorkbookOptions {
  generatedAt?: Date;
  aiAnalysis?: TicketsAiReportAnalysis | null;
}

interface AnalyticalEntry {
  chamado: Chamado0800;
  tramites: ChamadoTramite[];
  flow: TicketFlowAnalysis;
}

const EXCEL_MAX_ROWS = 1_048_576;
const EXCEL_TEXT_PART_LENGTH = 30_000;

const AREA_STAGE_OUTCOME_LABELS: Record<TicketAreaStageOutcome, string> = {
  handedOffBeforeDeadline: "Repasse antes do vencimento",
  handedOffAfterDeadline: "Repasse após o vencimento",
  resolvedWithin: "Resolvido no prazo",
  resolvedOutside: "Resolvido fora do SLA",
  activeWithin: "Etapa atual dentro do prazo",
  activeOutside: "SLA vencido na etapa atual",
  activePaused: "Etapa atual pausada",
  unavailable: "Sem comparação disponível",
};

const SLA_CLASSIFICATION_LABELS = {
  within: "Dentro do SLA",
  outside: "Fora do SLA",
  inProgress: "Em andamento",
  unavailable: "Sem SLA",
} as const;

export function buildChamadosAnalyticalWorkbook(
  chamados: Chamado0800[],
  tramitesPorChamado: ReadonlyMap<string, ChamadoTramite[]>,
  filters: ChamadosReportFilters,
  options: ChamadosAnalyticalWorkbookOptions = {},
): XlsxSheet[] {
  const generatedAt = options.generatedAt ?? new Date();
  const catalog = filters.catalog ?? "orion";
  const analytics = buildTicketsAiAnalytics(chamados, catalog);
  const entries: AnalyticalEntry[] = chamados.map((chamado) => {
    const tramites = chronologicalTramites(
      tramitesPorChamado.get(chamado.numeroChamado) ?? [],
    );
    return {
      chamado,
      tramites,
      flow: buildTicketFlowAnalysis(chamado, tramites, generatedAt),
    };
  });
  const sectorAnalysis = buildTicketSectorAnalysis(entries, generatedAt);
  const totalTramites = entries.reduce((total, entry) => total + entry.tramites.length, 0);
  const detailSheets = [
    buildTicketsSheet(entries, catalog, generatedAt),
    buildTramitesSheet(entries, catalog),
    buildSlaSheet(entries, catalog, generatedAt),
    buildAreaJourneySheet(entries),
  ].flatMap(splitTabularSheetAtExcelLimit);

  return [
    buildSummarySheet(entries, analytics, filters, generatedAt, totalTramites, options.aiAnalysis),
    ...detailSheets,
    buildSectorSheet(sectorAnalysis),
    buildAnalysisSheet(analytics),
  ];
}

export async function generateChamadosAnalyticalXlsx(
  chamados: Chamado0800[],
  tramitesPorChamado: ReadonlyMap<string, ChamadoTramite[]>,
  filters: ChamadosReportFilters,
  options: ChamadosAnalyticalWorkbookOptions = {},
) {
  if (!chamados.length) {
    throw new Error("Não há chamados no filtro atual para exportar.");
  }
  const generatedAt = options.generatedAt ?? new Date();
  const catalog = filters.catalog ?? "orion";
  const filename = [
    "relatorio-analitico-chamados",
    catalog,
    filters.startDate || "inicio",
    filters.endDate || "fim",
    localIsoDate(generatedAt),
  ].join("-");

  await downloadXlsxWorkbook(
    `${filename}.xlsx`,
    buildChamadosAnalyticalWorkbook(chamados, tramitesPorChamado, filters, {
      ...options,
      generatedAt,
    }),
  );
}

function buildSummarySheet(
  entries: AnalyticalEntry[],
  analytics: TicketsAiAnalytics,
  filters: ChamadosReportFilters,
  generatedAt: Date,
  totalTramites: number,
  aiAnalysis?: TicketsAiReportAnalysis | null,
): XlsxSheet {
  const slaStates = entries.map(({ chamado }) => getOfficialSlaState(chamado, generatedAt));
  const firstResponseWithin = slaStates.filter((sla) => sla.firstResponse.status === "met").length;
  const firstResponseOutside = slaStates.filter((sla) => sla.firstResponse.status === "breached").length;
  const resolutionWithin = slaStates.filter((sla) => sla.resolution.status === "met").length;
  const resolutionOutside = slaStates.filter((sla) => sla.resolution.status === "breached").length;
  const inProgress = slaStates.filter((sla) => (
    sla.firstResponse.status === "pending" ||
    sla.resolution.status === "pending" ||
    sla.resolution.status === "paused"
  )).length;
  const unavailable = slaStates.filter((sla) => sla.classification === "unavailable").length;
  const catalog = filters.catalog ?? "orion";
  const productLabel = catalog === "legacy"
    ? formatList(filters.products, "Todas as famílias legadas")
    : getChamadosProductLabel(filters.product, catalog);

  const rows: XlsxCellValue[][] = [
    ["Campo", "Valor"],
    ["Relatório", "Relatório analítico de chamados"],
    ["Gerado em", formatDateTime(generatedAt)],
    ["Catálogo", catalog === "legacy" ? "Chamados legados" : "Chamados atuais"],
    ["Período de abertura", `${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`],
    ["Clientes", formatList(filters.clients, "Todos os clientes")],
    ["Produto / família", productLabel],
    ["Software / módulo", formatList(filters.softwares, "Todos os módulos do produto")],
    ["Grupos responsáveis", formatList(filters.groups, "Todos os grupos")],
    ["Analistas responsáveis", formatList(filters.analysts, "Todos os analistas")],
    ["Natureza", filters.nature && filters.nature !== "todas" ? filters.nature : "Todas as naturezas"],
    ["Status", formatList(filters.statuses, "Todos os status oficiais")],
    ["Palavras-chave", filters.searchTerm?.trim() || "Nenhuma"],
    ["Chamados encontrados", analytics.total],
    ["Trâmites incluídos", totalTramites],
    ["Clientes distintos", analytics.clients],
    ["Chamados concluídos", analytics.completed],
    ["Chamados em aberto", analytics.open],
    ["Taxa de conclusão", `${analytics.completionRate}%`],
    ["1ª resposta no prazo", firstResponseWithin],
    ["1ª resposta fora do SLA", firstResponseOutside],
    ["Resolução no prazo", resolutionWithin],
    ["Resolução fora do SLA", resolutionOutside],
    ["SLA em andamento ou pausado", inProgress],
    ["Sem SLA na origem", unavailable],
    ["Leitura dos indicadores de SLA", "Primeira resposta e resolução são checkpoints independentes; os totais dessas linhas não formam uma única partição dos chamados."],
    ["Cobertura dos trâmites", "Histórico completo disponível no espelho sincronizado do Ellevo, inclusive eventos sem descrição"],
  ];

  if (aiAnalysis?.text) {
    rows.push(["Parecer da IA — gerado em", formatDateTime(aiAnalysis.createdAt)]);
    splitExcelText(aiAnalysis.text).forEach((part, index) => {
      rows.push([
        index === 0 ? "Parecer da IA" : `Parecer da IA — continuação ${index + 1}`,
        part,
      ]);
    });
  }

  return {
    name: "Resumo e filtros",
    rows,
    autoFilter: false,
  };
}

function buildTicketsSheet(
  entries: AnalyticalEntry[],
  catalog: ChamadosCatalog,
  generatedAt: Date,
): XlsxSheet {
  const descriptions = entries.map(({ chamado }) => splitExcelText(chamado.descricao));
  const descriptionPartCount = Math.max(1, ...descriptions.map((parts) => parts.length));
  const headers = [
    "Chamado",
    "Código do cliente",
    "Cliente",
    "Título",
    ...textPartHeaders("Descrição de abertura", descriptionPartCount),
    "Natureza",
    "Status",
    "Criticidade",
    "Produto",
    "Software / módulo",
    "Equipe responsável",
    "Analista responsável",
    "Data de abertura",
    "Abertura (data/hora)",
    "Data de encerramento",
    "Encerramento (data/hora)",
    "Dias até encerramento / em aberto",
    "Quantidade de trâmites",
    "1ª resposta prevista",
    "1ª resposta realizada",
    "Tempo previsto para 1ª resposta (min)",
    "Vencimento do SLA",
    "Tempo previsto para resolução (min)",
    "Tempo restante na origem (min)",
    "Vencimento pausado",
    "Vencimento manual",
    "Retorno previsto",
    "Retorno realizado",
    "Sincronizado em",
  ];

  return {
    name: "Chamados",
    rows: [
      headers,
      ...entries.map(({ chamado, tramites }, index) => {
        const days = isTicketCompleted(chamado)
          ? ticketDaysBetween(chamado.dataAbertura, chamado.dataEncerramento)
          : ticketDaysOpenAt(chamado.dataAbertura, generatedAt);
        return [
          chamado.numeroChamado,
          chamado.codigoCliente,
          chamado.nomeCliente,
          chamado.titulo,
          ...padTextParts(descriptions[index], descriptionPartCount),
          chamado.natureza,
          chamado.status,
          chamado.criticidade,
          chamado.produto,
          formatChamadosProductLabel(chamado.software || chamado.produto, catalog),
          chamado.equipeResponsavel,
          chamado.analistaResponsavel,
          formatDate(chamado.dataAbertura),
          formatDateTime(chamado.abertoEm),
          formatDate(chamado.dataEncerramento),
          formatDateTime(chamado.encerradoEm),
          days,
          tramites.length,
          formatDateTime(chamado.slaPrimeiraRespostaPrevistaEm),
          formatDateTime(chamado.slaPrimeiraRespostaRealEm),
          chamado.slaTempoPrimeiraRespostaMinutos,
          formatDateTime(chamado.slaVencimentoEm),
          chamado.slaTempoVencimentoMinutos,
          chamado.slaTempoRestanteMinutos,
          yesNo(chamado.slaVencimentoPausado),
          yesNo(chamado.slaVencimentoManual),
          formatDateTime(chamado.slaRetornoPrevistoEm),
          formatDateTime(chamado.slaRetornoRealEm),
          formatDateTime(chamado.syncedAt),
        ];
      }),
    ],
  };
}

function buildTramitesSheet(
  entries: AnalyticalEntry[],
  catalog: ChamadosCatalog,
): XlsxSheet {
  const tramites = entries.flatMap(({ chamado, tramites: ticketTramites }) => (
    ticketTramites.map((tramite) => ({
      chamado,
      tramite,
      descriptionParts: splitExcelText(tramite.descricao),
    }))
  ));
  const descriptionPartCount = Math.max(
    1,
    ...tramites.map(({ descriptionParts }) => descriptionParts.length),
  );

  return {
    name: "Trâmites",
    rows: [
      [
        "Chamado",
        "Cliente",
        "Título",
        "Natureza",
        "Status",
        "Software / módulo",
        "Sequência",
        "Número do trâmite",
        "Data do trâmite",
        "Responsável",
        "Equipe responsável",
        "Atividade",
        ...textPartHeaders("Descrição do trâmite", descriptionPartCount),
      ],
      ...tramites.map(({ chamado, tramite, descriptionParts }) => [
        chamado.numeroChamado,
        chamado.nomeCliente,
        chamado.titulo,
        chamado.natureza,
        chamado.status,
        formatChamadosProductLabel(chamado.software || chamado.produto, catalog),
        tramite.sequenciaTramite,
        tramite.numeroTramite,
        formatDateTime(tramite.dataTramite),
        tramite.responsavel,
        tramite.equipeResponsavel,
        tramite.atividade,
        ...padTextParts(descriptionParts, descriptionPartCount),
      ]),
    ],
  };
}

function buildSlaSheet(
  entries: AnalyticalEntry[],
  catalog: ChamadosCatalog,
  generatedAt: Date,
): XlsxSheet {
  return {
    name: "SLA",
    rows: [
      [
        "Chamado",
        "Cliente",
        "Título",
        "Natureza",
        "Status",
        "Software / módulo",
        "Equipe responsável",
        "Analista responsável",
        "Situação geral do SLA",
        "Classificação",
        "Fase atual",
        "Prazo ativo",
        "Tempo total (h)",
        "Tempo total formatado",
        "1ª resposta — prazo",
        "1ª resposta — realizada",
        "1ª resposta — situação",
        "1ª resposta — tempo previsto (min)",
        "Resolução — prazo",
        "Resolução — realizada",
        "Resolução — situação",
        "Resolução — tempo previsto (min)",
        "Tempo restante na origem (min)",
        "Vencimento pausado",
        "Vencimento manual",
        "Retorno previsto",
        "Retorno realizado",
        "Gargalo principal",
        "Tempo no gargalo (h)",
        "Tempo rastreado nas áreas (h)",
        "Quantidade de transferências",
        "Maior transferência — origem",
        "Maior transferência — destino",
        "Maior transferência — espera (h)",
        "Quantidade de trâmites",
      ],
      ...entries.map(({ chamado, tramites, flow }) => {
        const sla = getOfficialSlaState(chamado, generatedAt);
        const firstResponse = getSlaCheckpointDisplay(sla.firstResponse, "firstResponse");
        const resolution = getSlaCheckpointDisplay(sla.resolution, "resolution");
        return [
          chamado.numeroChamado,
          chamado.nomeCliente,
          chamado.titulo,
          chamado.natureza,
          chamado.status,
          formatChamadosProductLabel(chamado.software || chamado.produto, catalog),
          chamado.equipeResponsavel,
          chamado.analistaResponsavel,
          sla.label,
          SLA_CLASSIFICATION_LABELS[sla.classification],
          sla.phaseLabel,
          formatDateTime(sla.activeDeadline),
          roundHours(sla.hours),
          formatSlaDuration(sla.hours),
          formatDateTime(sla.firstResponse.deadline),
          formatDateTime(sla.firstResponse.completedAt),
          firstResponse.label,
          chamado.slaTempoPrimeiraRespostaMinutos,
          formatDateTime(sla.resolution.deadline),
          formatDateTime(sla.resolution.completedAt),
          resolution.label,
          chamado.slaTempoVencimentoMinutos,
          chamado.slaTempoRestanteMinutos,
          yesNo(chamado.slaVencimentoPausado),
          yesNo(chamado.slaVencimentoManual),
          formatDateTime(chamado.slaRetornoPrevistoEm),
          formatDateTime(chamado.slaRetornoRealEm),
          flow.bottleneck?.area,
          roundHours(flow.bottleneck?.hours),
          roundHours(flow.totalTrackedHours),
          flow.transfers.length,
          flow.longestTransfer?.fromArea,
          flow.longestTransfer?.toArea,
          roundHours(flow.longestTransfer?.waitHours),
          tramites.length,
        ];
      }),
    ],
  };
}

function buildAreaJourneySheet(
  entries: AnalyticalEntry[],
): XlsxSheet {
  return {
    name: "Jornada por área",
    rows: [
      [
        "Chamado",
        "Cliente",
        "Título",
        "Natureza",
        "Status",
        "Área",
        "Passagem pela área",
        "Início",
        "Fim",
        "Tipo de encerramento da etapa",
        "Duração (h)",
        "Duração formatada",
        "Resultado da etapa",
        "1ª resposta na etapa",
      ],
      ...entries.flatMap(({ chamado, flow }) => {
        const visits = new Map<string, number>();
        return flow.areaStages.map((stage) => {
          const visit = (visits.get(stage.area) ?? 0) + 1;
          visits.set(stage.area, visit);
          return [
            chamado.numeroChamado,
            chamado.nomeCliente,
            chamado.titulo,
            chamado.natureza,
            chamado.status,
            stage.area,
            visit,
            formatDateTime(stage.startedAt),
            stage.endKind === "current" ? "Em andamento" : formatDateTime(stage.endedAt),
            stage.endKind === "transfer"
              ? "Transferência"
              : stage.endKind === "completion"
                ? "Conclusão"
                : "Etapa atual",
            roundHours(stage.hours),
            formatSlaDuration(stage.hours),
            AREA_STAGE_OUTCOME_LABELS[stage.outcome],
            stage.firstResponseStatus === "met"
              ? "No prazo"
              : stage.firstResponseStatus === "breached"
                ? "Fora do SLA"
                : "Não ocorreu nesta etapa",
          ];
        });
      }),
    ],
  };
}

function splitTabularSheetAtExcelLimit(sheet: XlsxSheet): XlsxSheet[] {
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
      charts: index === 0 ? sheet.charts : undefined,
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

function buildSectorSheet(
  analysis: ReturnType<typeof buildTicketSectorAnalysis>,
): XlsxSheet {
  const chartSectors = analysis.sectors.slice(0, 12);
  const charts: XlsxChart[] = chartSectors.length > 0 ? [{
    type: "column",
    title: "Conformidade final de SLA por setor",
    categories: chartSectors.map((sector) => sector.sector),
    series: [
      { name: "Dentro do SLA", values: chartSectors.map((sector) => sector.compliantTickets), color: "10B981" },
      { name: "Fora do SLA", values: chartSectors.map((sector) => sector.failedTickets), color: "D20037" },
    ],
    from: { column: 0, row: analysis.sectors.length + 3 },
    to: { column: 10, row: analysis.sectors.length + 22 },
  }] : [];

  return {
    name: "SLA por setor",
    rows: [
      [
        "Setor",
        "Áreas de origem",
        "Chamados",
        "Dentro do SLA",
        "Fora do SLA",
        "Em andamento",
        "Pausados",
        "Sem SLA",
        "Taxa de conformidade (%)",
        "Eventos no prazo",
        "Eventos fora do prazo",
        "1ª resposta fora do SLA",
        "Repasses atrasados",
        "Resoluções atrasadas",
        "Ativos vencidos",
        "Horas rastreadas",
      ],
      ...analysis.sectors.map((sector) => [
        sector.sector,
        sector.sourceAreas.join(", "),
        sector.tickets,
        sector.compliantTickets,
        sector.failedTickets,
        sector.inProgressTickets,
        sector.pausedTickets,
        sector.unavailableTickets,
        sector.complianceRate,
        sector.withinEvents,
        sector.outsideEvents,
        sector.firstResponseOutside,
        sector.lateHandoffs,
        sector.lateResolutions,
        sector.activeOutside,
        roundHours(sector.hours),
      ]),
    ],
    charts,
  };
}

interface AnalysisBlock {
  title: string;
  headers: string[];
  rows: XlsxCellValue[][];
}

function buildAnalysisSheet(analytics: TicketsAiAnalytics): XlsxSheet {
  const metricRows: XlsxCellValue[][] = [
    ["Total de chamados", analytics.total],
    ["Clientes distintos", analytics.clients],
    ["Concluídos", analytics.completed],
    ["Em aberto", analytics.open],
    ["Taxa de conclusão (%)", analytics.completionRate],
    ["Bugs, erros, falhas, reclamações ou incidentes", analytics.bugLike],
    ["Bugs concluídos", analytics.bugCompleted],
    ["Bugs em aberto", analytics.bugOpen],
    ["Taxa de resolução de bugs (%)", analytics.bugResolutionRate],
    ["Média de dias para resolução", analytics.averageResolutionDays],
    ["Média de dias dos chamados abertos", analytics.averageOpenDays],
    ["Abertos há mais de 30 dias", analytics.openOver30Days],
    ["Abertos há mais de 60 dias", analytics.openOver60Days],
  ];
  const blocks: AnalysisBlock[] = [
    distributionBlock("Distribuição por status", "Status", analytics.byStatus, analytics.total),
    distributionBlock("Principais naturezas", "Natureza", analytics.byNature, analytics.total),
    distributionBlock("Clientes com maior volume", "Cliente", analytics.byClient, analytics.total),
    distributionBlock("Chamados por produto", "Produto", analytics.byProduct, analytics.total),
    distributionBlock("Envelhecimento dos abertos", "Faixa", analytics.aging, analytics.open),
    {
      title: "Fluxo mensal",
      headers: ["Mês", "Abertos", "Concluídos"],
      rows: analytics.monthlyFlow.map((item) => [item.month, item.opened, item.closed]),
    },
    {
      title: "Chamados em aberto há mais tempo",
      headers: ["Chamado", "Cliente", "Natureza", "Título", "Abertura", "Dias em aberto"],
      rows: analytics.oldestOpen.map((ticket) => [
        ticket.numeroChamado,
        ticket.nomeCliente,
        ticket.natureza,
        ticket.titulo,
        formatDate(ticket.dataAbertura),
        ticketDaysOpen(ticket.dataAbertura),
      ]),
    },
  ];
  const dataStartRow = 61;
  const topRows: XlsxCellValue[][] = [
    ["Indicadores gerais", "Valor"],
    ...metricRows,
  ];
  const rows = [
    ...topRows,
    ...Array.from(
      { length: Math.max(1, dataStartRow - topRows.length) },
      (): XlsxCellValue[] => [],
    ),
    ...combineAnalysisBlocks(blocks),
  ];
  const chartStartRow = 0;
  const topNature = analytics.byNature.slice(0, 8);
  const topClients = analytics.byClient.slice(0, 8);
  const topProducts = analytics.byProduct.slice(0, 8);
  const monthly = analytics.monthlyFlow.slice(-12);
  const charts: XlsxChart[] = [
    {
      type: "pie",
      title: "Distribuição por status",
      categories: analytics.byStatus.map((item) => item.name),
      series: [{ name: "Chamados", values: analytics.byStatus.map((item) => item.total) }],
      from: { column: 3, row: chartStartRow },
      to: { column: 11, row: chartStartRow + 18 },
    },
    {
      type: "bar",
      title: "Principais naturezas",
      categories: topNature.map((item) => item.name),
      series: [{ name: "Chamados", values: topNature.map((item) => item.total), color: "D20037" }],
      from: { column: 12, row: chartStartRow },
      to: { column: 21, row: chartStartRow + 18 },
      showLegend: false,
    },
    {
      type: "bar",
      title: "Clientes com maior volume",
      categories: topClients.map((item) => item.name),
      series: [{ name: "Chamados", values: topClients.map((item) => item.total), color: "6366F1" }],
      from: { column: 3, row: chartStartRow + 20 },
      to: { column: 11, row: chartStartRow + 38 },
      showLegend: false,
    },
    {
      type: "column",
      title: "Fluxo mensal de chamados",
      categories: monthly.map((item) => item.month),
      series: [
        { name: "Abertos", values: monthly.map((item) => item.opened), color: "D20037" },
        { name: "Concluídos", values: monthly.map((item) => item.closed), color: "10B981" },
      ],
      from: { column: 12, row: chartStartRow + 20 },
      to: { column: 21, row: chartStartRow + 38 },
    },
    {
      type: "bar",
      title: "Chamados por produto",
      categories: topProducts.map((item) => item.name),
      series: [{ name: "Chamados", values: topProducts.map((item) => item.total), color: "0EA5E9" }],
      from: { column: 3, row: chartStartRow + 40 },
      to: { column: 11, row: chartStartRow + 58 },
      showLegend: false,
    },
    {
      type: "column",
      title: "Envelhecimento dos chamados em aberto",
      categories: analytics.aging.map((item) => item.name),
      series: [{ name: "Chamados", values: analytics.aging.map((item) => item.total), color: "F59E0B" }],
      from: { column: 12, row: chartStartRow + 40 },
      to: { column: 21, row: chartStartRow + 58 },
      showLegend: false,
    },
  ].filter((chart) => chart.categories.length > 0);

  return {
    name: "Análise IA",
    rows,
    frozenRows: 0,
    headerRows: [0, dataStartRow, dataStartRow + 1],
    autoFilter: false,
    charts,
  };
}

function distributionBlock(
  title: string,
  label: string,
  items: Array<{ name: string; total: number }>,
  referenceTotal: number,
): AnalysisBlock {
  return {
    title,
    headers: [label, "Total", "Percentual (%)"],
    rows: items.map((item) => [
      item.name,
      item.total,
      referenceTotal > 0 ? round((item.total / referenceTotal) * 100) : 0,
    ]),
  };
}

function combineAnalysisBlocks(blocks: AnalysisBlock[]): XlsxCellValue[][] {
  const titleRow: XlsxCellValue[] = [];
  const headerRow: XlsxCellValue[] = [];
  blocks.forEach((block, index) => {
    titleRow.push(block.title, ...Array.from({ length: block.headers.length - 1 }, () => ""));
    headerRow.push(...block.headers);
    if (index < blocks.length - 1) {
      titleRow.push("");
      headerRow.push("");
    }
  });

  const maxRows = Math.max(...blocks.map((block) => block.rows.length), 0);
  const dataRows = Array.from({ length: maxRows }, (_, rowIndex) => {
    const row: XlsxCellValue[] = [];
    blocks.forEach((block, index) => {
      const values = block.rows[rowIndex] ?? [];
      row.push(...Array.from({ length: block.headers.length }, (_, columnIndex) => values[columnIndex]));
      if (index < blocks.length - 1) row.push("");
    });
    return row;
  });

  return [titleRow, headerRow, ...dataRows];
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

function roundHours(value?: number | null) {
  return value === null || value === undefined || !Number.isFinite(value) ? null : round(value);
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
