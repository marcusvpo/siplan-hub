import { describe, expect, it } from "vitest";

import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import {
  buildTicketFlowAnalysis,
  buildTicketSectorAnalysis,
  chronologicalTramites,
  elapsedHours,
  formatSlaDuration,
  getOfficialSlaState,
  getSlaCheckpointDisplay,
  getTicketSectorLabel,
  parseSlaDate,
} from "@/lib/tickets-sla";

const chamado = (overrides: Partial<Chamado0800> = {}): Chamado0800 => ({
  numeroChamado: "123",
  status: "Concluído",
  abertoEm: "2026-08-01T08:00:00",
  encerradoEm: "2026-08-05T08:00:00",
  ...overrides,
});

describe("tickets SLA", () => {
  it("usa a primeira resposta oficial antes do atendimento", () => {
    const now = new Date("2026-08-01T10:00:00");
    const pending = chamado({
      status: "Não iniciado",
      encerradoEm: undefined,
      slaPrimeiraRespostaPrevistaEm: "2026-08-01T11:00:00",
      slaVencimentoEm: "2026-08-02T18:00:00",
    });
    expect(getOfficialSlaState(pending, now).label).toBe("Aguardando primeira resposta");
    expect(getOfficialSlaState(pending, new Date("2026-08-01T12:00:00")).label)
      .toBe("Primeira resposta fora do SLA");
  });

  it("troca para o vencimento oficial depois da primeira resposta", () => {
    const base = chamado({
      status: "Em andamento",
      encerradoEm: undefined,
      slaPrimeiraRespostaPrevistaEm: "2026-08-01T10:00:00",
      slaPrimeiraRespostaRealEm: "2026-08-01T09:00:00",
      slaVencimentoEm: "2026-08-03T18:00:00",
    });
    expect(getOfficialSlaState(base, new Date("2026-08-02T08:00:00")).label)
      .toBe("SLA em curso");
    expect(getOfficialSlaState(base, new Date("2026-08-04T08:00:00")).label)
      .toBe("SLA vencido");
  });

  it("classifica conclusão e respeita somente a pausa oficial", () => {
    const official = {
      slaPrimeiraRespostaPrevistaEm: "2026-08-01T10:00:00",
      slaPrimeiraRespostaRealEm: "2026-08-01T09:00:00",
      slaVencimentoEm: "2026-08-05T18:00:00",
    };
    expect(getOfficialSlaState(chamado(official)).label).toBe("Dentro do SLA");
    expect(getOfficialSlaState(chamado({ ...official, encerradoEm: "2026-08-06T08:00:00" })).label)
      .toBe("Fora do SLA");
    expect(getOfficialSlaState(chamado({
      ...official,
      status: "Em andamento",
      encerradoEm: undefined,
      slaVencimentoPausado: true,
    }), new Date("2026-08-10T08:00:00")).label).toBe("SLA pausado");
  });

  it("separa o SLA da primeira resposta do SLA de resolução", () => {
    const state = getOfficialSlaState(chamado({
      slaPrimeiraRespostaPrevistaEm: "2026-08-01T10:00:00",
      slaPrimeiraRespostaRealEm: "2026-08-01T11:00:00",
      slaVencimentoEm: "2026-08-05T18:00:00",
    }));

    expect(state.firstResponse.status).toBe("breached");
    expect(state.resolution.status).toBe("met");
    expect(getSlaCheckpointDisplay(state.firstResponse, "firstResponse").label)
      .toBe("Fora do SLA");
    expect(getSlaCheckpointDisplay(state.resolution, "resolution").label)
      .toBe("No prazo");
  });

  it("calcula e formata durações", () => {
    const start = parseSlaDate("2026-08-01T08:00:00");
    const end = parseSlaDate("2026-08-02T10:00:00");
    expect(elapsedHours(start, end)).toBe(26);
    expect(formatSlaDuration(26)).toBe("1 d 2 h");
    expect(formatSlaDuration(71.99)).toBe("3 d");
  });

  it("ordena os trâmites por data e sequência", () => {
    const tramites: ChamadoTramite[] = [
      { sequenciaTramite: 3, dataTramite: "2026-08-02T10:00:00" },
      { sequenciaTramite: 2, dataTramite: "2026-08-01T09:00:00" },
      { sequenciaTramite: 1, dataTramite: "2026-08-01T09:00:00" },
    ];
    expect(chronologicalTramites(tramites).map((item) => item.sequenciaTramite))
      .toEqual([1, 2, 3]);
  });

  it("calcula permanência por área e transferências entre equipes", () => {
    const tramites: ChamadoTramite[] = [
      { sequenciaTramite: 1, dataTramite: "2026-08-01T10:00:00", equipeResponsavel: "SD" },
      { sequenciaTramite: 2, dataTramite: "2026-08-01T14:00:00", equipeResponsavel: "Sustentação" },
      { sequenciaTramite: 3, dataTramite: "2026-08-02T14:00:00", equipeResponsavel: "Sustentação" },
      { sequenciaTramite: 4, dataTramite: "2026-08-02T18:00:00", equipeResponsavel: "SD" },
    ];
    const result = buildTicketFlowAnalysis(chamado({
      encerradoEm: "2026-08-03T08:00:00",
    }), tramites);

    expect(result.transfers.map((transfer) => `${transfer.fromArea} -> ${transfer.toArea}`))
      .toEqual(["SD -> Sustentação", "Sustentação -> SD"]);
    expect(result.areaTimes).toEqual([
      { area: "Sustentação", hours: 28, intervals: 2 },
      { area: "SD", hours: 18, intervals: 2 },
      { area: "Aguardando primeira resposta", hours: 2, intervals: 1 },
    ]);
    expect(result.bottleneck?.area).toBe("Sustentação");
    expect(result.totalTrackedHours).toBe(48);
  });

  it("identifica o setor que repassou no prazo e o setor em que a resolução estourou", () => {
    const tramites: ChamadoTramite[] = [
      { sequenciaTramite: 1, dataTramite: "2026-08-01T08:30:00", equipeResponsavel: "SD" },
      { sequenciaTramite: 2, dataTramite: "2026-08-02T10:00:00", equipeResponsavel: "Sustentação" },
      { sequenciaTramite: 3, dataTramite: "2026-08-02T14:00:00", equipeResponsavel: "Sustentação" },
    ];
    const result = buildTicketFlowAnalysis(chamado({
      abertoEm: "2026-08-01T08:00:00",
      encerradoEm: "2026-08-03T08:00:00",
      slaPrimeiraRespostaPrevistaEm: "2026-08-01T10:00:00",
      slaPrimeiraRespostaRealEm: "2026-08-01T09:00:00",
      slaVencimentoEm: "2026-08-02T12:00:00",
      equipeResponsavel: "Sustentação",
    }), tramites);

    expect(result.areaStages).toHaveLength(2);
    expect(result.areaStages[0]).toMatchObject({
      area: "SD",
      endKind: "transfer",
      outcome: "handedOffBeforeDeadline",
      firstResponseStatus: "met",
    });
    expect(result.areaStages[1]).toMatchObject({
      area: "Sustentação",
      endKind: "completion",
      outcome: "resolvedOutside",
      firstResponseStatus: null,
    });
  });

  it("agrupa equipes e aponta em qual setor cada chamado descumpriu o prazo", () => {
    const firstTicket = chamado({
      numeroChamado: "100",
      abertoEm: "2026-08-01T08:00:00",
      encerradoEm: "2026-08-03T08:00:00",
      slaPrimeiraRespostaPrevistaEm: "2026-08-01T10:00:00",
      slaPrimeiraRespostaRealEm: "2026-08-01T09:00:00",
      slaVencimentoEm: "2026-08-02T12:00:00",
    });
    const secondTicket = chamado({
      numeroChamado: "200",
      abertoEm: "2026-08-01T08:00:00",
      encerradoEm: "2026-08-01T18:00:00",
      slaPrimeiraRespostaPrevistaEm: "2026-08-01T09:00:00",
      slaPrimeiraRespostaRealEm: "2026-08-01T10:00:00",
      slaVencimentoEm: "2026-08-02T12:00:00",
    });
    const result = buildTicketSectorAnalysis([
      {
        chamado: firstTicket,
        tramites: [
          { sequenciaTramite: 1, dataTramite: "2026-08-01T08:30:00", equipeResponsavel: "SD - TN/RC" },
          { sequenciaTramite: 2, dataTramite: "2026-08-02T10:00:00", equipeResponsavel: "Sustentação Orion" },
        ],
      },
      {
        chamado: secondTicket,
        tramites: [
          { sequenciaTramite: 1, dataTramite: "2026-08-01T08:30:00", equipeResponsavel: "Service Desk" },
          { sequenciaTramite: 2, dataTramite: "2026-08-01T12:00:00", equipeResponsavel: "Infra - Operações" },
        ],
      },
    ]);

    expect(getTicketSectorLabel("SD - TN/RC")).toBe("SD");
    expect(getTicketSectorLabel("Sustentação Orion")).toBe("Sustentação");
    expect(result.totalTickets).toBe(2);
    expect(result.sectors.find((sector) => sector.sector === "Sustentação")).toMatchObject({
      tickets: 1,
      failedTickets: 1,
      lateResolutions: 1,
      complianceRate: 0,
    });
    expect(result.sectors.find((sector) => sector.sector === "SD")).toMatchObject({
      tickets: 2,
      compliantTickets: 1,
      failedTickets: 1,
      firstResponseOutside: 1,
      complianceRate: 50,
    });
    expect(result.entries.find((entry) => (
      entry.chamado.numeroChamado === "100" && entry.sector === "SD"
    ))?.verdict).toBe("within");
  });
});
