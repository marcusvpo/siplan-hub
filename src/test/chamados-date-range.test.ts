import { describe, expect, it } from "vitest";
import {
  getDefaultChamadosDateRange,
  needsHistoricalChamadosSync,
} from "@/lib/chamados-date-range";

describe("chamados date range", () => {
  const defaultRange = getDefaultChamadosDateRange(new Date(2026, 7, 6, 12));

  it("gera uma janela inclusiva de 30 dias", () => {
    expect(defaultRange).toEqual({
      startDate: "2026-07-08",
      endDate: "2026-08-06",
    });
  });

  it("solicita sync apenas quando o periodo expande a janela padrao", () => {
    expect(needsHistoricalChamadosSync("2026-07-08", "2026-08-06", defaultRange)).toBe(false);
    expect(needsHistoricalChamadosSync("2026-07-15", "2026-08-01", defaultRange)).toBe(false);
    expect(needsHistoricalChamadosSync("2025-01-01", "2025-12-31", defaultRange)).toBe(true);
  });

  it("ignora periodos incompletos ou invertidos", () => {
    expect(needsHistoricalChamadosSync("", "2026-08-06", defaultRange)).toBe(false);
    expect(needsHistoricalChamadosSync("2026-08-06", "2026-07-08", defaultRange)).toBe(false);
  });
});
