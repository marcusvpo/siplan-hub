import { describe, expect, it, vi } from "vitest";
import { buildTicketsAiAnalytics } from "@/lib/tickets-ai-analytics";
import type { ChamadoReportRow } from "@/hooks/useChamados0800";

describe("buildTicketsAiAnalytics", () => {
  it("separa bugs resolvidos, envelhecimento e fluxo mensal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T12:00:00Z"));

    const rows: ChamadoReportRow[] = [
      {
        numeroChamado: "1",
        nomeCliente: "Cliente A",
        natureza: "Bug",
        status: "Concluído",
        dataAbertura: "2026-06-01",
        dataEncerramento: "2026-06-11",
      },
      {
        numeroChamado: "2",
        nomeCliente: "Cliente A",
        natureza: "Erro operacional",
        status: "Em andamento",
        dataAbertura: "2026-06-01",
      },
      {
        numeroChamado: "3",
        nomeCliente: "Cliente B",
        natureza: "Configuração do sistema",
        status: "Concluído",
        dataAbertura: "2026-07-05",
        dataEncerramento: "2026-08-02",
      },
    ];

    const result = buildTicketsAiAnalytics(rows);

    expect(result.total).toBe(3);
    expect(result.completed).toBe(2);
    expect(result.bugLike).toBe(2);
    expect(result.bugCompleted).toBe(1);
    expect(result.bugOpen).toBe(1);
    expect(result.bugResolutionRate).toBe(50);
    expect(result.openOver60Days).toBe(1);
    expect(result.monthlyFlow).toEqual([
      { month: "06/2026", opened: 2, closed: 1 },
      { month: "07/2026", opened: 1, closed: 0 },
      { month: "08/2026", opened: 0, closed: 1 },
    ]);

    vi.useRealTimers();
  });
});
