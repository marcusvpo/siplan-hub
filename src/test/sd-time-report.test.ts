import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reportPage = readFileSync(
  resolve(process.cwd(), "src/pages/sd/TimeManagementReport.tsx"),
  "utf8",
);

describe("consulta gerencial de horas do SD", () => {
  it("pagina os lançamentos da equipe com cinco itens por padrão", () => {
    expect(reportPage).toContain("PAGE_SIZE_OPTIONS = [5, 10, 20]");
    expect(reportPage).toContain("pagedEntries");
    expect(reportPage).toContain("Lançamentos da equipe por página");
    expect(reportPage).toContain("Mostrando");
  });

  it("permite alternar a consulta entre dia e semana", () => {
    expect(reportPage).toContain('type PeriodView = "day" | "week"');
    expect(reportPage).toContain('aria-pressed={periodView === "day"}');
    expect(reportPage).toContain('aria-pressed={periodView === "week"}');
    expect(reportPage).toContain('setPeriodView("day")');
    expect(reportPage).toContain('setPeriodView("week")');
    expect(reportPage).toContain('periodView === "day"');
    expect(reportPage).toContain("Horas por analista");
    expect(reportPage).toContain("meta diária de 8h por analista");
  });

  it("importa a semana de todos os analistas dos grupos do SD", () => {
    expect(reportPage).toContain("Importar dados gerais");
    expect(reportPage).toContain("useImportSdTeamWeek");
    expect(reportPage).toContain("SD - TN/RC · SD - GLOBAL · SD - Protesto · SD - RI/TD");
    expect(reportPage).toContain("startDate: week.start, endDate: week.end");
    expect(reportPage).toContain("Lançamentos já importados serão ignorados automaticamente");
  });
});
