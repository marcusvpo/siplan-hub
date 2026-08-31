import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/pages/sd/SdAttendanceBi.tsx"), "utf8");
const hook = readFileSync(resolve(process.cwd(), "src/hooks/useSdAttendanceBi.ts"), "utf8");
const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const menu = readFileSync(resolve(process.cwd(), "src/constants/menuItems.ts"), "utf8");
const permissionCatalog = readFileSync(resolve(process.cwd(), "src/constants/permissions.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260828235955_sd_attendance_bi.sql"), "utf8");

describe("BI de atendimento do SD", () => {
  it("expõe uma tela própria no menu e protege a rota com permissão específica", () => {
    expect(app).toContain('path="/sd/bi-atendimento"');
    expect(app).toContain('<RequirePermission resource="sd_attendance_bi">');
    expect(menu).toContain('title: "BI de Atendimento"');
    expect(menu).toContain('permissionKey: "sd_attendance_bi"');
    expect(permissionCatalog).toContain('resource: "sd_attendance_bi"');
  });

  it("permite combinar período, grupos, analistas, origem e natureza", () => {
    expect(page).toContain("Grupos de atendimento");
    expect(page).toContain("Todos os analistas");
    expect(page).toContain("Natureza do chamado");
    expect(page).toContain("Origem das horas");
    expect(page).toContain("setPreset(days)");
    expect(hook).toContain("p_user_ids: filters.userIds.length");
    expect(hook).toContain("p_groups: filters.groups.length");
    expect(hook).toContain("p_sources: filters.sources.length");
    expect(hook).toContain("p_natures: filters.natures.length");
  });

  it("mantém os campos de filtro compactos", () => {
    expect(page).toContain('className="h-8 px-2 text-[11px]"');
    expect(page).toContain("[&_[role=combobox]]:h-8");
    expect(page).toContain('className="space-y-1.5 p-2"');
    expect(page).toContain('className="flex h-8 items-center rounded-md');
  });

  it("mantém compacto o gráfico de evolução do atendimento", () => {
    expect(page).toContain('className="h-48 p-1.5 pt-0"');
    expect(page).toContain('space-y-0 p-2.5 pb-0.5');
    expect(page).toContain('margin={{ top: 4, right: 6, left: -24, bottom: 0 }}');
  });

  it("limita a performance dos analistas à altura das atividades e permite rolagem", () => {
    expect(page.match(/flex h-\[30rem\] min-h-0 flex-col/g)).toHaveLength(2);
    expect(page).toContain("min-h-0 flex-1 overflow-auto p-1.5 pt-0");
    expect(page).toContain("sticky top-0 z-10 bg-background");
    expect(page).toContain("min-h-0 flex-1 space-y-2 overflow-y-auto");
  });

  it("compacta as tabelas de analistas e chamados com maior esforço", () => {
    expect(page.match(/\[&_td\]:px-2 \[&_td\]:py-1.5/g)).toHaveLength(2);
    expect(page.match(/\[&_th\]:h-8 \[&_th\]:px-2/g)).toHaveLength(2);
    expect(page).toContain('className="p-2.5 pb-0.5"><CardTitle className="text-xs">Chamados com maior esforço');
    expect(page).toContain("min-h-0 flex-1 overflow-auto p-1.5 pt-0");
  });

  it("pagina os chamados com maior esforço em grupos de cinco", () => {
    expect(page).toContain("const TICKETS_PER_PAGE = 5");
    expect(page).toContain("paginatedTickets.map");
    expect(page).toContain("Página {activeTicketsPage} de {ticketsPageCount}");
    expect(page).toContain('aria-label="Página anterior dos chamados"');
    expect(page).toContain('aria-label="Próxima página dos chamados"');
    expect(page).toContain("setTicketsPage(1)");
  });

  it("apresenta os principais indicadores e análises operacionais", () => {
    expect(page).toContain("Tempo médio/chamado");
    expect(page).toContain("Cobertura de categoria");
    expect(page).toContain("Tipos de chamados mais atendidos");
    expect(page).toContain("Horas por equipe");
    expect(page).toContain("Performance dos analistas");
    expect(page).toContain("Atividades executadas");
    expect(page).toContain("Chamados com maior esforço");
    expect(page).toContain("Faixa horária dos atendimentos");
  });

  it("agrega os dados no banco e combina os dois espelhos de chamados", () => {
    expect(migration).toContain("public.get_sd_attendance_bi");
    expect(migration).toContain("public.chamados_0800");
    expect(migration).toContain("public.chamados_processo_venda");
    expect(migration).toContain("'by_analyst'");
    expect(migration).toContain("'by_nature'");
    expect(migration).toContain("'top_tickets'");
    expect(migration).toContain("'classified_ticket_count'");
  });
});
