import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import {
  buildChamadosAnalyticalWorkbook,
} from "@/lib/chamados-analytical-xlsx";
import type { ChamadosReportFilters } from "@/lib/chamados-report-pdf";
import { buildXlsxWorkbook } from "@/lib/xlsx-export";

const generatedAt = new Date("2026-09-18T12:00:00-03:00");
const openingDescription = `Falha <grave> na emissão\u0001\uFFFE com caracteres especiais & validação. ${"A".repeat(31_000)}`;
const tramiteDescription = `Solicitação recebida e analisada. ${"B".repeat(31_000)}`;

const chamados: Chamado0800[] = [
  {
    numeroChamado: "1001",
    codigoCliente: "42",
    nomeCliente: "Cartório Central",
    razaoSocialCliente: "Central Serviços Notariais Ltda.",
    solicitante: "Maria",
    titulo: "Falha ao emitir certidão",
    descricao: openingDescription,
    natureza: "Erro",
    status: "Concluído",
    criticidade: "Alta",
    produto: "Orion",
    software: "Orion TN",
    equipeResponsavel: "SD - TN/RC",
    analistaResponsavel: "Ana Souza",
    dataAbertura: "2026-08-01",
    dataEncerramento: "2026-08-03",
    abertoEm: "2026-08-01T08:00:00-03:00",
    encerradoEm: "2026-08-03T15:00:00-03:00",
    slaPrimeiraRespostaPrevistaEm: "2026-08-01T10:00:00-03:00",
    slaPrimeiraRespostaRealEm: "2026-08-01T09:00:00-03:00",
    slaVencimentoEm: "2026-08-04T18:00:00-03:00",
    slaTempoPrimeiraRespostaMinutos: 120,
    slaTempoVencimentoMinutos: 4920,
    slaTempoRestanteMinutos: 1620,
    slaVencimentoPausado: false,
    slaVencimentoManual: false,
    syncedAt: "2026-09-18T11:00:00-03:00",
  },
  {
    numeroChamado: "1002",
    nomeCliente: "Cartório do Vale",
    solicitante: "João",
    titulo: "Dúvida sobre selo",
    descricao: "Orientação solicitada pelo cliente.",
    natureza: "Dúvida",
    status: "Em atendimento",
    produto: "Orion",
    software: "SGA",
    equipeResponsavel: "Produtos",
    analistaResponsavel: "Bruno Lima",
    dataAbertura: "2026-09-01",
    abertoEm: "2026-09-01T09:00:00-03:00",
    slaPrimeiraRespostaPrevistaEm: "2026-09-01T11:00:00-03:00",
    slaVencimentoEm: "2026-09-05T18:00:00-03:00",
    slaVencimentoPausado: false,
    slaVencimentoManual: true,
    syncedAt: "2026-09-18T11:00:00-03:00",
  },
];

const tramites = new Map<string, ChamadoTramite[]>([
  ["1001", [
    {
      sequenciaTramite: 2,
      numeroTramite: 12,
      dataTramite: "2026-08-02T11:00:00-03:00",
      responsavel: "Carlos",
      equipeResponsavel: "Produtos",
      atividade: "Análise técnica",
      descricao: "Correção aplicada.",
    },
    {
      sequenciaTramite: 1,
      numeroTramite: 11,
      dataTramite: "2026-08-01T09:00:00-03:00",
      responsavel: "Ana",
      equipeResponsavel: "SD - TN/RC",
      atividade: "Primeira resposta",
      descricao: tramiteDescription,
    },
  ]],
  ["1002", [{
    sequenciaTramite: 1,
    numeroTramite: 21,
    dataTramite: "2026-09-01T10:00:00-03:00",
    responsavel: "Bruno",
    equipeResponsavel: "Produtos",
    atividade: "Orientação",
  }]],
]);

const filters: ChamadosReportFilters = {
  catalog: "orion",
  startDate: "2026-08-01",
  endDate: "2026-09-18",
  clients: ["Cartório Central", "Cartório do Vale"],
  product: "todos",
  products: [],
  softwares: [],
  groups: [],
  analysts: [],
  nature: "todas",
  statuses: [],
  searchTerm: "certidão; selo",
};

afterEach(() => vi.useRealTimers());

describe("relatório analítico de chamados em XLSX", () => {
  it("monta as abas completas, preserva todos os trâmites e calcula SLA", () => {
    vi.useFakeTimers();
    vi.setSystemTime(generatedAt);
    const sheets = buildChamadosAnalyticalWorkbook(chamados, tramites, filters, {
      generatedAt,
      aiAnalysis: {
        text: "Parecer executivo do recorte analisado.",
        createdAt: "2026-09-18T10:00:00-03:00",
      },
    });

    expect(sheets.map((sheet) => sheet.name)).toEqual([
      "Resumo e filtros",
      "Chamados",
      "Trâmites",
      "SLA",
      "Jornada por área",
      "SLA por setor",
      "Análise IA",
    ]);

    const chamadosSheet = sheets[1];
    expect(chamadosSheet.rows[0]).toEqual(expect.arrayContaining([
      "Título",
      "Natureza",
      "Descrição de abertura",
      "Quantidade de trâmites",
    ]));
    expect(chamadosSheet.rows[1]).toEqual(expect.arrayContaining([
      "Falha ao emitir certidão",
      "Erro",
      2,
    ]));
    const openingDescriptionColumns = chamadosSheet.rows[0]
      .map((header, index) => String(header).startsWith("Descrição de abertura") ? index : -1)
      .filter((index) => index >= 0);
    expect(openingDescriptionColumns).toHaveLength(2);
    expect(openingDescriptionColumns.map((index) => chamadosSheet.rows[1][index]).join(""))
      .toBe(openingDescription);

    const tramitesSheet = sheets[2];
    expect(tramitesSheet.rows).toHaveLength(4);
    expect(tramitesSheet.rows.slice(1).map((row) => row[6])).toEqual([1, 2, 1]);
    expect(tramitesSheet.rows[1]).toEqual(expect.arrayContaining([
      "Falha ao emitir certidão",
      "Erro",
    ]));
    const tramiteDescriptionColumns = tramitesSheet.rows[0]
      .map((header, index) => String(header).startsWith("Descrição do trâmite") ? index : -1)
      .filter((index) => index >= 0);
    expect(tramiteDescriptionColumns).toHaveLength(2);
    expect(tramiteDescriptionColumns.map((index) => tramitesSheet.rows[1][index]).join(""))
      .toBe(tramiteDescription);
    expect(tramiteDescriptionColumns.map((index) => tramitesSheet.rows[3][index]).join(""))
      .toBe("");

    const slaSheet = sheets[3];
    expect(slaSheet.rows[0]).toEqual(expect.arrayContaining([
      "Situação geral do SLA",
      "1ª resposta — situação",
      "Resolução — situação",
      "Gargalo principal",
    ]));
    expect(slaSheet.rows[1]).toEqual(expect.arrayContaining([
      "Dentro do SLA",
      "No prazo",
    ]));

    const analysisSheet = sheets[6];
    expect(analysisSheet.charts?.map((chart) => chart.title)).toEqual([
      "Distribuição por status",
      "Principais naturezas",
      "Clientes com maior volume",
      "Fluxo mensal de chamados",
      "Chamados por produto",
      "Envelhecimento dos chamados em aberto",
    ]);
    expect(analysisSheet.rows.flat()).toEqual(expect.arrayContaining([
      "Indicadores gerais",
      "Distribuição por status",
      "Fluxo mensal",
      "Chamados em aberto há mais tempo",
    ]));
  });

  it("gera um pacote OOXML válido com desenhos, gráficos e textos seguros", async () => {
    const sheets = buildChamadosAnalyticalWorkbook(chamados, tramites, filters, {
      generatedAt,
    });
    const bytes = await buildXlsxWorkbook(sheets);
    const zip = await JSZip.loadAsync(bytes);
    const files = Object.keys(zip.files);
    const chartFiles = files.filter((file) => /^xl\/charts\/chart\d+\.xml$/.test(file));

    expect(zip.file("xl/workbook.xml")).not.toBeNull();
    expect(zip.file("xl/drawings/drawing1.xml")).not.toBeNull();
    expect(zip.file("xl/drawings/drawing2.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/_rels/sheet7.xml.rels")).not.toBeNull();
    expect(chartFiles).toHaveLength(7);

    const chartContents = await Promise.all(
      chartFiles.map((file) => zip.file(file)?.async("string")),
    );
    expect(chartContents.join("\n")).toContain("Distribuição por status");
    expect(chartContents.join("\n")).toContain("Fluxo mensal de chamados");

    const chamadosXml = await zip.file("xl/worksheets/sheet2.xml")?.async("string");
    expect(chamadosXml).toContain("Falha &lt;grave&gt; na emissão");
    expect(chamadosXml).not.toContain("\u0001");
    expect(chamadosXml).not.toContain("\uFFFE");
    expect(chamadosXml).not.toContain("[Conteúdo truncado no limite da célula do Excel]");
  });
});
