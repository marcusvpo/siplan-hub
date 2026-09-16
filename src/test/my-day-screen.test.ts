import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("integração da Central de Trabalho", () => {
  it("registra rota protegida, menu, ajuda e breadcrumb", () => {
    const app = readSource("src/App.tsx");
    const menu = readSource("src/constants/menuItems.ts");
    const help = readSource("src/constants/pageHelpRegistry.ts");
    const breadcrumbs = readSource("src/components/Layout/Breadcrumbs.tsx");
    const sidebar = readSource("src/components/Layout/AppSidebar.tsx");

    expect(app).toContain('path="/meu-dia"');
    expect(app).toContain('<RequirePermission resource="work_center">');
    expect(menu).toContain('permissionKey: "work_center"');
    expect(help).toContain('route: "/meu-dia"');
    expect(breadcrumbs).toContain('"meu-dia": "Meu Dia"');
    expect(sidebar).toContain('hasPermission("work_center", "view")');
  });

  it("nasce responsiva e compatível com o PWA", () => {
    const page = readSource("src/pages/MyDay.tsx");

    expect(page).toContain("overflow-x-hidden");
    expect(page).toContain("safe-area-inset-bottom");
    expect(page).toContain("grid-cols-2");
    expect(page).toContain("xl:grid-cols-2");
    expect(page).toContain("data-widget-width");
    expect(page).toContain("min-w-0");
    expect(page).not.toContain("<table");
  });

  it("publica a permissão e a novidade da tela na mesma migration", () => {
    const migration = readSource(
      "supabase/migrations/20260916100000_my_day_work_center.sql",
    );

    expect(migration).toContain("'work_center'");
    expect(migration).toContain("public.app_role_permissions");
    expect(migration).toContain("'release_screen'");
    expect(migration).toContain("'/meu-dia'");
    expect(migration).toContain("CREATE TABLE public.my_day_tasks");
    expect(migration).toContain("CREATE TABLE public.my_day_preferences");
    expect(migration).toContain("ALTER TABLE public.my_day_tasks ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain("public.has_permission(auth.uid(), 'work_center', 'edit')");
  });

  it("persiste a largura responsiva dos widgets e publica a melhoria", () => {
    const migration = readSource(
      "supabase/migrations/20260916110000_my_day_responsive_widget_layout.sql",
    );
    const workspace = readSource("src/hooks/useMyDayWorkspace.ts");

    expect(migration).toContain("ADD COLUMN IF NOT EXISTS widget_layout JSONB");
    expect(migration).toContain("'release_improvement'");
    expect(migration).toContain("'/meu-dia'");
    expect(workspace).toContain("widget_layout: normalized.widgetLayout");
  });

  it("publica recorrência, lembretes e a fila de prioridades com segurança", () => {
    const migration = readSource(
      "supabase/migrations/20260916120000_my_day_operational_improvements.sql",
    );
    const agenda = readSource("src/components/my-day/MyDayAgenda.tsx");
    const personalization = readSource("src/components/my-day/PersonalizeMyDayDialog.tsx");

    expect(migration).toContain("recurrence TEXT NOT NULL");
    expect(migration).toContain("reminder_minutes INTEGER");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("complete_my_day_task");
    expect(migration).toContain("'release_improvement'");
    expect(agenda).toContain("Ativar lembretes");
    expect(agenda).toContain("Ver toda agenda");
    expect(personalization).toContain("DndContext");
    expect(personalization).toContain("Prévia das linhas");
  });
});
