import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reportPage = readFileSync(
  resolve(process.cwd(), "src/pages/sd/TimeManagementReport.tsx"),
  "utf8",
);
const timeHook = readFileSync(
  resolve(process.cwd(), "src/hooks/useSdTimeTracking.ts"),
  "utf8",
);
const groupFilterMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260828235945_sd_time_group_filters.sql"),
  "utf8",
);

describe("consulta gerencial de horas do SD", () => {
  it("pagina os lançamentos da equipe com cinco itens por padrão", () => {
    expect(reportPage).toContain("PAGE_SIZE_OPTIONS = [5, 10, 20]");
    expect(reportPage).toContain("pagedEntries");
    expect(reportPage).toContain("Lançamentos da equipe por página");
    expect(reportPage).toContain("Mostrando");
    expect(timeHook).toContain('db.rpc("get_sd_time_management_page"');
    expect(timeHook).toContain("p_offset: (page - 1) * pageSize");
    expect(timeHook).toContain('db.rpc("get_sd_time_management_report"');
  });

  it("mantém cada nome alinhado com sua barra na visão diária", () => {
    expect(reportPage).toContain("AnalystAxisTick");
    expect(reportPage).toContain("interval={0}");
    expect(reportPage).toContain("chartData.length * 88");
    expect(reportPage).toContain("parts[parts.length - 1]");
  });

  it("separa no gráfico as horas do HUB e as importadas do 0800", () => {
    expect(reportPage).toContain('dataKey="hubHours"');
    expect(reportPage).toContain('dataKey="importedHours"');
    expect(reportPage).toContain('name="Lançado no HUB"');
    expect(reportPage).toContain('name="Importado do 0800"');
    expect(reportPage).toContain('stackId="source"');
    expect(timeHook).toContain("manual_minutes");
    expect(timeHook).toContain("imported_minutes");
  });

  it("filtra a lista ao selecionar um analista no gráfico diário", () => {
    expect(reportPage).toContain("filterByChartAnalyst");
    expect(reportPage).toContain("setSelectedUser(userId)");
    expect(reportPage).toContain("filterByChartPoint(bar?.payload)");
    expect(reportPage).toContain("onSelect={(index) => filterByChartAnalyst");
    expect(reportPage).toContain("Filtrar lançamentos de");
  });

  it("transforma o clique em uma barra semanal em filtro para o dia", () => {
    expect(reportPage).toContain("dateKey: key");
    expect(reportPage).toContain("filterByChartDate");
    expect(reportPage).toContain("setSelectedDate(parseISO(dateKey))");
    expect(reportPage).toContain('setPeriodView("day")');
    expect(reportPage).toContain("filterByChartPoint(bar?.payload)");
    expect(reportPage).toContain("WeekdayAxisTick");
  });

  it("filtra indicadores, gráficos e lançamentos por um ou mais grupos de atendimento", () => {
    expect(reportPage).toContain("Todos os grupos");
    expect(reportPage).toContain("Grupos de atendimento");
    expect(reportPage).toContain("selectedGroups.includes(group)");
    expect(reportPage).toContain("SD - TN/RC");
    expect(reportPage).toContain("SD - GLOBAL");
    expect(reportPage).toContain("SD - Protesto");
    expect(reportPage).toContain("SD - RI/TD");
    expect(timeHook).toContain("p_groups: groups.length ? groups : null");
    expect(groupFilterMigration).toContain("entry.attendance_group = ANY(p_groups)");
    expect(groupFilterMigration).toContain("'available_groups'");
    expect(groupFilterMigration).toContain("analyst_group.attendance_group");
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
