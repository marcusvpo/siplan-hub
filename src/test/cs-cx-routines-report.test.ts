import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { CsCxOfficeRoutine, CsCxRoutineModel } from "@/hooks/useCsCxRoutines";
import { buildCsCxRoutinesWorkbook, buildRoutineReportAnalytics } from "@/lib/cs-cx-routines-report";
import { buildXlsxWorkbook } from "@/lib/xlsx-export";

const models: CsCxRoutineModel[] = [{
  id: "model-1", legacy_id: 10, name: "Firmas", description: "Rotina de firmas", active: true,
  origin: "legacy", products: [{ id: "product-1", name: "Orion" }], item_count: 3,
}];

const routines: CsCxOfficeRoutine[] = [{
  id: "routine-1", legacy_id: 20, registry_office_id: "office-1", routine_model_id: "model-1",
  active: true, applied_at: "2026-08-10T12:00:00.000Z", notes: "Acompanhamento mensal", origin: "legacy",
  registry_office: { id: "office-1", name: "Cartório Central" },
  routine_model: { id: "model-1", name: "Firmas", description: "Rotina de firmas" },
  items: [
    config("config-1", true, "Atendimento", "#d20037"),
    config("config-2", false, "Atendimento", "#d20037"),
    config("config-3", null, "Qualidade", "#2563eb"),
  ],
}];

describe("relatórios de rotinas CS/CX", () => {
  it("calcula indicadores, categorias e evolução mensal", () => {
    const analytics = buildRoutineReportAnalytics(routines);
    expect(analytics).toMatchObject({ totalApplications: 1, activeApplications: 1, activeItems: 1, inactiveItems: 1, pendingItems: 1 });
    expect(analytics.byCategory).toEqual([{ name: "Atendimento", total: 1, color: "#d20037" }]);
    expect(analytics.byMonth).toEqual([{ month: "2026-08", total: 1 }]);
    expect(analytics.popularModels).toEqual([{ name: "Firmas", total: 1 }]);
  });

  it("mantém as quatro planilhas do relatório legado", () => {
    const sheets = buildCsCxRoutinesWorkbook(routines, models);
    expect(sheets.map((sheet) => sheet.name)).toEqual(["Resumo Geral", "Modelos de Rotina", "Aplicações por Cartório", "Configurações por Item"]);
    expect(sheets[2].rows[1]).toContain("Cartório Central");
    expect(sheets[3].rows).toHaveLength(4);
  });

  it("gera um XLSX válido com abas e conteúdo escapado", async () => {
    const bytes = await buildXlsxWorkbook([{ name: "Resumo & Métricas", rows: [["Nome", "Valor"], ["A < B", 2]] }]);
    const zip = await JSZip.loadAsync(bytes);
    expect(zip.file("xl/workbook.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
    expect(await zip.file("xl/workbook.xml")?.async("string")).toContain("Resumo &amp; Métricas");
    expect(await zip.file("xl/worksheets/sheet1.xml")?.async("string")).toContain("A &lt; B");
  });

  it("concede somente leitura de relatórios nas tabelas de rotinas", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260812105000_cs_cx_routine_reports.sql"), "utf8");
    expect(migration).toContain("has_permission(auth.uid(), 'cs_cx_reports', 'view')");
    expect(migration.match(/FOR SELECT TO authenticated/g)).toHaveLength(10);
    expect(migration).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/);
  });
});

function config(id: string, active: boolean | null, category: string, color: string) {
  return {
    id,
    active,
    notes: null,
    analysis_notes: null,
    analyzed_at: null,
    model_item: {
      id: `item-${id}`,
      name: `Item ${id}`,
      description: null,
      sort_order: Number(id.slice(-1)),
      required: false,
      category: { id: `category-${category}`, name: category, display_color: color },
      routine_type: { id: "type-1", name: "Operacional" },
    },
  };
}
