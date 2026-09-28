import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import {
  buildChamadosSpreadsheetWorkbook,
} from "@/lib/chamados-export-spreadsheet";
import type { ChamadosReportFilters } from "@/lib/chamados-report-pdf";
import { buildXlsxWorkbook } from "@/lib/xlsx-export";

const generatedAt = new Date("2026-09-25T12:00:00-03:00");
const longDescription = `Descrição detalhada do problema de faturamento com quebras de linha:\nLinha 1: Cliente não consegue emitir nota.\nLinha 2: Erro 500 no web service.\nTexto longo para teste: ${"A".repeat(500)}`;
const tramiteDescricao1 = "Primeira análise efetuada pela equipe de suporte.";
const tramiteDescricao2 = "Encaminhado para o financeiro para autorização de faturamento.";

const mockChamados: Chamado0800[] = [
  {
    numeroChamado: "2026001",
    codigoCliente: "105",
    nomeCliente: "1º Cartório de Registro de Imóveis",
    solicitante: "Fernanda Ribeiro",
    titulo: "Bloqueio no faturamento de selos digitais",
    descricao: longDescription,
    natureza: "Problema",
    status: "Aguardando Terceiros",
    criticidade: "Alta",
    tema: "faturamento",
    produto: "Orion",
    software: "Orion RI",
    equipeResponsavel: "Suporte N2",
    analistaResponsavel: "Carlos Eduardo",
    dataAbertura: "2026-09-10",
    abertoEm: "2026-09-10T09:30:00-03:00",
    slaPrimeiraRespostaPrevistaEm: "2026-09-10T11:30:00-03:00",
    slaPrimeiraRespostaRealEm: "2026-09-10T10:15:00-03:00",
    slaVencimentoEm: "2026-09-15T18:00:00-03:00",
    slaTempoPrimeiraRespostaMinutos: 45,
    slaTempoVencimentoMinutos: 2880,
    slaTempoRestanteMinutos: 0,
    slaVencimentoPausado: true,
    slaVencimentoManual: false,
    syncedAt: "2026-09-25T10:00:00-03:00",
  },
  {
    numeroChamado: "2026002",
    codigoCliente: "106",
    nomeCliente: "Tabelionato de Notas e Protesto",
    solicitante: "Roberto Silva",
    titulo: "Dúvida sobre integração bancária",
    descricao: "Cliente com dúvida de configuração do convênio.",
    natureza: "Dúvida",
    status: "Concluído",
    criticidade: "Normal",
    produto: "Orion",
    software: "Orion TN",
    equipeResponsavel: "Atendimento",
    analistaResponsavel: "Mariana Souza",
    dataAbertura: "2026-09-01",
    dataEncerramento: "2026-09-02",
    abertoEm: "2026-09-01T08:00:00-03:00",
    encerradoEm: "2026-09-02T14:00:00-03:00",
  },
];

const mockTramites = new Map<string, ChamadoTramite[]>([
  [
    "2026001",
    [
      {
        sequenciaTramite: 1,
        numeroTramite: 1,
        dataTramite: "2026-09-10T10:15:00-03:00",
        responsavel: "Carlos Eduardo",
        equipeResponsavel: "Suporte N2",
        atividade: "Primeira Análise",
        descricao: tramiteDescricao1,
      },
      {
        sequenciaTramite: 2,
        numeroTramite: 2,
        dataTramite: "2026-09-11T14:20:00-03:00",
        responsavel: "Carlos Eduardo",
        equipeResponsavel: "Suporte N2",
        atividade: "Encaminhamento Interno",
        descricao: tramiteDescricao2,
      },
    ],
  ],
  [
    "2026002",
    [
      {
        sequenciaTramite: 1,
        numeroTramite: 1,
        dataTramite: "2026-09-02T14:00:00-03:00",
        responsavel: "Mariana Souza",
        equipeResponsavel: "Atendimento",
        atividade: "Encerramento",
        descricao: "Dúvida sanada com o cliente por telefone.",
      },
    ],
  ],
]);

const mockFilters: ChamadosReportFilters = {
  catalog: "orion",
  startDate: "2026-09-01",
  endDate: "2026-09-25",
  clients: ["1º Cartório de Registro de Imóveis"],
  statuses: ["Aguardando Terceiros", "Concluído"],
  searchTerm: "faturamento",
};

describe("chamados-export-spreadsheet", () => {
  it("deve compilar o workbook com as 3 abas essenciais", () => {
    const sheets = buildChamadosSpreadsheetWorkbook(
      mockChamados,
      mockTramites,
      mockFilters,
      { generatedAt },
    );

    expect(sheets.map((s) => s.name)).toEqual([
      "Chamados Detalhados",
      "Histórico de Trâmites",
      "Resumo e Filtros",
    ]);
  });

  it("deve incluir todos os campos detalhados e a descrição na aba Chamados Detalhados", () => {
    const sheets = buildChamadosSpreadsheetWorkbook(
      mockChamados,
      mockTramites,
      mockFilters,
      { generatedAt },
    );

    const chamadosSheet = sheets.find((s) => s.name === "Chamados Detalhados")!;
    expect(chamadosSheet).toBeDefined();

    const headers = chamadosSheet.rows[0];
    expect(headers).toContain("Chamado");
    expect(headers).toContain("Cliente / Serventia");
    expect(headers).toContain("Código do Cliente");
    expect(headers).toContain("Título do Chamado");
    expect(headers).toContain("Status");
    expect(headers).toContain("Natureza");
    expect(headers).toContain("Tema (IA)");
    expect(headers).toContain("Equipe Responsável");
    expect(headers).toContain("Analista Responsável");
    expect(headers).toContain("Solicitante");
    expect(headers).toContain("Situação Geral do SLA");
    expect(headers).toContain("Qtd. de Trâmites");
    expect(headers).toContain("Último Trâmite - Descrição");
    expect(headers).toContain("Descrição de Abertura");

    // Linha 1 (chamado 2026001)
    const row1 = chamadosSheet.rows[1];
    expect(row1).toContain("2026001");
    expect(row1).toContain("1º Cartório de Registro de Imóveis");
    expect(row1).toContain("105");
    expect(row1).toContain("Bloqueio no faturamento de selos digitais");
    expect(row1).toContain("Aguardando Terceiros");
    expect(row1).toContain("faturamento");
    expect(row1).toContain(2); // Qtd de trâmites
    expect(row1).toContain(longDescription);
  });

  it("deve incluir todos os trâmites dos chamados na aba Histórico de Trâmites", () => {
    const sheets = buildChamadosSpreadsheetWorkbook(
      mockChamados,
      mockTramites,
      mockFilters,
      { generatedAt },
    );

    const tramitesSheet = sheets.find((s) => s.name === "Histórico de Trâmites")!;
    expect(tramitesSheet).toBeDefined();

    // 1 cabeçalho + 3 trâmites no total (2 do chamado 1 + 1 do chamado 2)
    expect(tramitesSheet.rows.length).toBe(4);

    const headers = tramitesSheet.rows[0];
    expect(headers).toContain("Chamado");
    expect(headers).toContain("Cliente / Serventia");
    expect(headers).toContain("Nº do Trâmite");
    expect(headers).toContain("Data/Hora do Trâmite");
    expect(headers).toContain("Responsável");
    expect(headers).toContain("Equipe Responsável");
    expect(headers).toContain("Atividade");
    expect(headers).toContain("Descrição do Trâmite");

    const tramiteRows = tramitesSheet.rows.slice(1);
    expect(tramiteRows.some((r) => r.includes(tramiteDescricao1))).toBe(true);
    expect(tramiteRows.some((r) => r.includes(tramiteDescricao2))).toBe(true);
    expect(tramiteRows.some((r) => r.includes("Dúvida sanada com o cliente por telefone."))).toBe(true);
  });

  it("deve gerar um arquivo binário .xlsx válido via JSZip sem erros", async () => {
    const sheets = buildChamadosSpreadsheetWorkbook(
      mockChamados,
      mockTramites,
      mockFilters,
      { generatedAt },
    );

    const bytes = await buildXlsxWorkbook(sheets);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(bytes);
    expect(zip.file("[Content_Types].xml")).not.toBeNull();
    expect(zip.file("xl/workbook.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/sheet2.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/sheet3.xml")).not.toBeNull();

    const sheet1Xml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(sheet1Xml).toContain("2026001");
    expect(sheet1Xml).toContain("Bloqueio no faturamento");

    const sheet2Xml = await zip.file("xl/worksheets/sheet2.xml")!.async("string");
    expect(sheet2Xml).toContain("Primeira an");
  });
});
