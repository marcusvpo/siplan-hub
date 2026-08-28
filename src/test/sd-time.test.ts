import { describe, expect, it } from "vitest";
import {
  entryMinutes,
  entryStartMinutes,
  formatMinutes,
  getWeekRange,
  intervalsOverlap,
  timeToMinutes,
  totalsByDate,
} from "@/lib/sd-time";

describe("cálculos do gerenciamento de horas do SD", () => {
  it("soma apenas intervalos finalizados", () => {
    const entry = {
      work_date: "2026-08-28",
      intervals: [
        { started_at: "08:15", ended_at: "09:05" },
        { started_at: "09:15", ended_at: "10:45" },
        { started_at: "11:00", ended_at: null },
      ],
    };

    expect(entryMinutes(entry)).toBe(140);
    expect(formatMinutes(entryMinutes(entry))).toBe("2h 20min");
  });

  it("agrupa os totais por data", () => {
    expect(
      totalsByDate([
        { work_date: "2026-08-28", intervals: [{ started_at: "08:00", ended_at: "09:00" }] },
        { work_date: "2026-08-28", intervals: [{ started_at: "10:00", ended_at: "10:30" }] },
      ]),
    ).toEqual({ "2026-08-28": 90 });
  });

  it("usa a primeira hora cronológica para ordenar lançamentos", () => {
    expect(
      entryStartMinutes({
        work_date: "2026-08-28",
        intervals: [
          { started_at: "17:00", ended_at: "17:30" },
          { started_at: "15:35", ended_at: "16:00" },
        ],
      }),
    ).toBe(15 * 60 + 35);
  });

  it("calcula a semana de segunda a domingo", () => {
    expect(getWeekRange(new Date(2026, 7, 28))).toMatchObject({
      start: "2026-08-24",
      end: "2026-08-30",
    });
  });

  it("valida horários e identifica sobreposição", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
    expect(timeToMinutes("25:00")).toBeNull();
    expect(
      intervalsOverlap([
        { start: "08:00", end: "09:30" },
        { start: "09:00", end: "10:00" },
      ]),
    ).toBe(true);
    expect(
      intervalsOverlap([
        { start: "08:00", end: "09:00" },
        { start: "09:00", end: "10:00" },
      ]),
    ).toBe(false);
  });
});
