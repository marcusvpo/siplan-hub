import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const solutions = readSource("src/pages/sd/Solutions.tsx");
const solutionSearch = readSource("src/components/sd/SolutionsSearch.tsx");
const solutionDetails = readSource("src/components/sd/SolutionDetails.tsx");
const timeManagement = readSource("src/pages/sd/TimeManagement.tsx");
const timeEntryDialog = readSource("src/components/sd/time/TimeEntryDialog.tsx");
const timeReport = readSource("src/pages/sd/TimeManagementReport.tsx");
const attendanceBi = readSource("src/pages/sd/SdAttendanceBi.tsx");

describe("responsividade das telas do SD", () => {
  it("mantém a navegação e a busca de soluções dentro da largura do celular", () => {
    expect(solutions).toContain('data-testid="sd-solutions-page"');
    expect(solutions).toContain("overflow-x-hidden");
    expect(solutions).toContain("flex-wrap gap-1");
    expect(solutions).toContain("basis-[calc(50%-0.25rem)]");
    expect(solutions).not.toContain("justify-start overflow-x-auto");
    expect(solutionSearch).toContain("w-full sm:ml-auto sm:w-auto");
  });

  it("limita os detalhes, anexos e prévias de soluções ao viewport", () => {
    expect(solutionDetails).toContain("w-[calc(100vw-0.5rem)]");
    expect(solutionDetails).toContain("basis-[calc(100%-3rem)]");
    expect(solutionDetails).toContain("max-h-[calc(100dvh-1rem)]");
    expect(solutionDetails).toContain("w-[calc(100vw-1rem)]");
  });

  it("empilha ações e formulários de horas sem rolagem lateral", () => {
    expect(timeManagement).toContain('data-testid="sd-hours-page"');
    expect(timeManagement).toContain("overflow-x-hidden");
    expect(timeManagement).toContain("grid-cols-1 gap-1");
    expect(timeEntryDialog).toContain("w-[calc(100vw-1rem)]");
    expect(timeEntryDialog).toContain("grid-cols-1 items-end");
  });

  it("compacta o gráfico diário da consulta gerencial no celular", () => {
    expect(timeReport).toContain('data-testid="sd-hours-report-page"');
    expect(timeReport).toContain("useIsMobile");
    expect(timeReport).toContain("chartData.slice(0, 5)");
    expect(timeReport).toContain("isMobile ? undefined : chartMinWidth");
    expect(timeReport).toContain("overflow-hidden");
  });

  it("troca as tabelas densas do BI por cartões no celular", () => {
    expect(attendanceBi).toContain('data-testid="sd-attendance-bi-page"');
    expect(attendanceBi).toContain('data-testid="sd-analyst-mobile-list"');
    expect(attendanceBi).toContain('data-testid="sd-ticket-mobile-list"');
    expect(attendanceBi.match(/isMobile \? <div data-testid=/g)).toHaveLength(2);
    expect(attendanceBi.match(/className="text-\[11px\] \[&_td\]/g)).toHaveLength(2);
    expect(attendanceBi).toContain("width={isMobile ? 86 : 150}");
  });

  it("recolhe os filtros do BI por padrão no celular", () => {
    expect(attendanceBi).toContain("window.innerWidth >= 768");
    expect(attendanceBi).toContain("<Collapsible open={filtersOpen}");
    expect(attendanceBi).toContain("Abrir filtros do BI");
    expect(attendanceBi).toContain("activeFilterCount");
  });
});
