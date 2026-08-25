import { describe, expect, it } from "vitest";

import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import {
  chronologicalTramites,
  elapsedHours,
  formatSlaDuration,
  getResolutionSlaState,
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
  it("classifica chamados concluídos dentro e fora do prazo", () => {
    expect(getResolutionSlaState(chamado(), 5).label).toBe("Dentro do SLA");
    expect(getResolutionSlaState(chamado({ encerradoEm: "2026-08-07T08:00:00" }), 5).label)
      .toBe("Fora do SLA");
  });

  it("classifica chamados abertos em curso ou estourados", () => {
    const now = new Date("2026-08-04T08:00:00");
    expect(getResolutionSlaState(chamado({ status: "Em andamento", encerradoEm: undefined }), 5, now).label)
      .toBe("SLA em curso");
    expect(getResolutionSlaState(chamado({ status: "Em andamento", encerradoEm: undefined }), 2, now).label)
      .toBe("SLA estourado");
  });

  it("calcula e formata durações", () => {
    const start = parseSlaDate("2026-08-01T08:00:00");
    const end = parseSlaDate("2026-08-02T10:00:00");
    expect(elapsedHours(start, end)).toBe(26);
    expect(formatSlaDuration(26)).toBe("1 d 2 h");
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
});
