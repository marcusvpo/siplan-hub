import { describe, expect, it } from "vitest";

import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import {
  buildTicketFlowAnalysis,
  chronologicalTramites,
  elapsedHours,
  formatSlaDuration,
  getOfficialSlaState,
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
    expect(getOfficialSlaState(pending, now).label).toBe("Aguardando retorno");
    expect(getOfficialSlaState(pending, new Date("2026-08-01T12:00:00")).label)
      .toBe("Retorno fora do SLA");
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
      { area: "Aguardando primeiro atendimento", hours: 2, intervals: 1 },
    ]);
    expect(result.bottleneck?.area).toBe("Sustentação");
    expect(result.totalTrackedHours).toBe(48);
  });
});
