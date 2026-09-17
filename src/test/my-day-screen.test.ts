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

  it("integra a agenda de Implantação e publica a melhoria", () => {
    const agenda = readSource("src/components/my-day/MyDayAgenda.tsx");
    const hook = readSource("src/hooks/useMyDay.ts");
    const calendar = readSource("src/pages/Calendar.tsx");
    const migration = readSource(
      "supabase/migrations/20260917110000_my_day_unified_agenda_changelog.sql",
    );

    expect(agenda).toContain("Filtrar agenda por origem");
    expect(agenda).toContain("canViewImplementation");
    expect(hook).toContain("buildMyDayImplementationEvents");
    expect(calendar).toContain("buildProjectCalendarEvents");
    expect(migration).toContain("'release_improvement'");
    expect(migration).toContain("'work_center'");
    expect(migration).toContain("'/meu-dia'");
  });

  it("registra o Meu Quadro com rota, menu, permissões, RLS e ajuda", () => {
    const app = readSource("src/App.tsx");
    const menu = readSource("src/constants/menuItems.ts");
    const sidebar = readSource("src/components/Layout/AppSidebar.tsx");
    const permissions = readSource("src/constants/permissions.ts");
    const help = readSource("src/constants/pageHelpRegistry.ts");
    const types = readSource("src/integrations/supabase/types.ts");
    const migration = readSource(
      "supabase/migrations/20260917130000_my_day_personal_board.sql",
    );

    expect(app).toContain('path="/meu-dia/quadro"');
    expect(app).toContain('<RequirePermission resource="work_board">');
    expect(menu).toContain('permissionKey: "work_board"');
    expect(sidebar).toContain('hasPermission("work_board", "view")');
    expect(help).toContain('route: "/meu-dia/quadro"');
    expect(permissions).toContain('resource: "work_board"');
    expect(types).toContain('TableName extends "my_day_board_cards"');
    expect(migration).toContain("CREATE TABLE public.my_day_boards");
    expect(migration).toContain("CREATE TABLE public.my_day_board_columns");
    expect(migration).toContain("CREATE TABLE public.my_day_board_cards");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain("'release_screen'");
    expect(migration).toContain("'/meu-dia/quadro'");
  });

  it("integra prazos do quadro na agenda e mantém layout mobile sem rolagem horizontal", () => {
    const page = readSource("src/pages/MyDayBoard.tsx");
    const myDay = readSource("src/pages/MyDay.tsx");
    const agenda = readSource("src/components/my-day/MyDayAgenda.tsx");

    expect(page).toContain("overflow-x-hidden");
    expect(page).toContain("safe-area-inset-bottom");
    expect(page).toContain('data-testid="my-day-board-mobile"');
    expect(page).toContain("activeMobileColumnId");
    expect(myDay).toContain("buildMyDayBoardAgendaEvents");
    expect(myDay).toContain('widgetId === "board"');
    expect(agenda).toContain("canViewBoard");
    expect(agenda).toContain('sourceFilter === "board"');
  });

  it("integra a agenda ao quadro com drag responsivo e publica a melhoria", () => {
    const page = readSource("src/pages/MyDayBoard.tsx");
    const board = readSource("src/lib/my-day-board.ts");
    const help = readSource("src/constants/pageHelpRegistry.ts");
    const migration = readSource(
      "supabase/migrations/20260917160000_my_day_board_agenda_inbox_changelog.sql",
    );

    expect(page).toContain("Entrada da agenda");
    expect(page).toContain("MOBILE_TARGET_PREFIX");
    expect(page).toContain("dragHandleProps");
    expect(board).toContain("buildMyDayBoardInboxItems");
    expect(board).toContain("myDaySource");
    expect(help).toContain("alvos de movimentação por toque");
    expect(migration).toContain("'release_improvement'");
    expect(migration).toContain("'work_board'");
    expect(migration).toContain("'/meu-dia/quadro'");
  });
});
