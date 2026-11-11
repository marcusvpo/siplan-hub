import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const app = read("src/App.tsx");
const menu = read("src/constants/menuItems.ts");
const sidebar = read("src/components/Layout/AppSidebar.tsx");
const permissions = read("src/constants/permissions.ts");
const help = read("src/constants/pageHelpRegistry.ts");
const page = read("src/pages/sd/SdClosures.tsx");
const hook = read("src/hooks/useSdClosures.ts");
const pdf = read("src/modules/pdf/templates/SdClosuresReportTemplate.tsx");
const worker = read("vm-worker/src/chamadosSync.ts");
const migration = read("supabase/migrations/20261111120000_sd_closures.sql");

describe("integração da tela de Encerramentos do SD", () => {
  it("registra rota, menu, central, permissão e ajuda contextual", () => {
    expect(app).toContain('path="/sd/encerramentos"');
    expect(app).toContain('<RequirePermission resource="sd_closures">');
    expect(menu).toContain('title: "Encerramentos"');
    expect(menu).toContain('permissionKey: "sd_closures"');
    expect(sidebar).toContain('["sd_closures", "/sd/encerramentos"]');
    expect(sidebar).toContain('can("sd_closures")');
    expect(permissions).toContain('resource: "sd_closures"');
    expect(help).toContain('route: "/sd/encerramentos"');
  });

  it("oferece os filtros e as duas visões solicitadas", () => {
    expect(page).toContain("Todos os produtos");
    expect(page).toContain("Todos os analistas");
    expect(page).toContain("Todos os clientes");
    expect(page).toContain("Todos os grupos");
    expect(page).toContain('value="consolidated"');
    expect(page).toContain('value="analytical"');
    expect(page).toContain("Encerramentos por analista");
    expect(page).toContain("Chamados encerrados");
  });

  it("protege as RPCs e preserva acesso equivalente", () => {
    expect(migration).toContain("public.request_sd_closures_sync");
    expect(migration).toContain("public.get_sd_closures_report");
    expect(migration).toContain("has_permission(auth.uid(), 'sd_closures', 'view')");
    expect(migration).toContain("current_permission.resource in ('sd_attendance_bi', 'chamados_query')");
    expect(migration).toContain("permission_resource");
    expect(migration).toContain("'release_screen'");
    expect(migration).not.toMatch(/\bto\s+public\b/i);
  });

  it("sincroniza pela data real de fechamento no worker", () => {
    expect(worker).toContain('"sd_closures"');
    expect(worker).toContain('periodField: "closed"');
    expect(worker).toContain("c.SolDataFechamentoComHoras >= @startDate");
    expect(worker).toContain('const periodColumn = catalog.periodField === "closed"');
    expect(hook).toContain('db.rpc("request_sd_closures_sync"');
    expect(hook).toContain('db.rpc("get_sd_closures_report"');
  });

  it("gera o PDF apenas pela arquitetura oficial", () => {
    expect(pdf).toContain('from "./BaseReportTemplate"');
    expect(pdf).toContain('from "../components/PdfTable"');
    expect(page).toContain("downloadPdfDocument");
    expect(pdf).not.toContain("jsPDF");
    expect(pdf).not.toContain("window.print");
    expect(pdf).not.toContain("html2canvas");
  });
});
