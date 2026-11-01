import { describe, it, expect } from "vitest";
import { validateScheduleConflicts } from "./agenda-conflicts";
import type { Vacation } from "@/hooks/useVacations";

describe("agenda-conflicts (validateScheduleConflicts)", () => {
  const mockVacations: Vacation[] = [
    {
      id: "vac-1",
      implantador_name: "Julio Araujo",
      implantador_id: "user-julio",
      start_date: "2026-11-03",
      end_date: "2026-11-10",
      description: "Férias Regulamentares",
      created_by: null,
      created_at: "2026-10-31",
      updated_at: "2026-10-31",
    },
  ];

  it("detecta conflito de férias quando a data coincide com o período de férias do analista", () => {
    const res = validateScheduleConflicts({
      userId: "user-julio",
      userName: "Julio Araujo",
      startDate: "2026-11-04",
      vacations: mockVacations,
    });

    expect(res.hasConflict).toBe(true);
    expect(res.hasVacationConflict).toBe(true);
    expect(res.vacationConflicts).toHaveLength(1);
    expect(res.warningMessage).toContain("Férias Regulamentares");
  });

  it("não detecta conflito de férias para outro analista no mesmo dia", () => {
    const res = validateScheduleConflicts({
      userId: "user-rodrigo",
      userName: "Rodrigo Brites",
      startDate: "2026-11-04",
      vacations: mockVacations,
    });

    expect(res.hasVacationConflict).toBe(false);
  });

  it("detecta feriado e fins de semana no agendamento em lote", () => {
    // 02/11/2026 é Finados (Segunda-feira)
    // 07/11/2026 é Sábado, 08/11/2026 é Domingo
    const res = validateScheduleConflicts({
      userName: "Rodrigo Brites",
      startDate: "2026-11-02",
      endDate: "2026-11-08",
      vacations: [],
      includeWeekendsAndHolidays: false,
    });

    expect(res.hasHolidayConflict).toBe(true);
    expect(res.hasWeekendConflict).toBe(true);
    expect(res.holidayConflicts[0].name).toBe("Finados");
    expect(res.weekendDates).toHaveLength(2);
    // Dias efetivos não devem incluir feriado nem fins de semana por padrão
    expect(res.effectiveDates).not.toContain("2026-11-02");
    expect(res.effectiveDates).not.toContain("2026-11-07");
    expect(res.effectiveDates).not.toContain("2026-11-08");
  });

  it("inclui feriados e fins de semana se includeWeekendsAndHolidays for true", () => {
    const res = validateScheduleConflicts({
      userName: "Rodrigo Brites",
      startDate: "2026-11-02",
      endDate: "2026-11-08",
      vacations: [],
      includeWeekendsAndHolidays: true,
    });

    expect(res.effectiveDates).toContain("2026-11-02");
    expect(res.effectiveDates).toContain("2026-11-07");
    expect(res.effectiveDates).toContain("2026-11-08");
    expect(res.effectiveDates).toHaveLength(7);
  });
});
