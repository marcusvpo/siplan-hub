import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("fundação mobile e PWA", () => {
  it("usa viewport seguro e áreas seguras no layout principal", () => {
    const html = readSource("index.html");
    const layout = readSource("src/components/Layout/MainLayout.tsx");

    expect(html).toContain("viewport-fit=cover");
    expect(layout).toContain("safe-area-inset-top");
    expect(layout).toContain("safe-area-inset-bottom");
    expect(layout).toContain("overflow-x-hidden");
  });

  it("limita modais e painéis pela viewport dinâmica", () => {
    const dialog = readSource("src/components/ui/dialog.tsx");
    const alertDialog = readSource("src/components/ui/alert-dialog.tsx");
    const sheet = readSource("src/components/ui/sheet.tsx");

    expect(dialog).toContain("100dvh");
    expect(alertDialog).toContain("w-[calc(100vw-1rem)]");
    expect(sheet).toContain("h-[100dvh]");
    expect(sheet).toContain("safe-area-inset-bottom");
  });

  it("carrega dashboard e copiloto apenas quando necessários", () => {
    const app = readSource("src/App.tsx");
    const layout = readSource("src/components/Layout/MainLayout.tsx");

    expect(app).toContain('lazy(() => import("./pages/DashboardV2"))');
    expect(app).not.toContain('import DashboardV2 from "./pages/DashboardV2"');
    expect(layout).toContain('import("@/components/Copilot/FloatingCopilot")');
    expect(layout).toContain("<Suspense fallback={null}>");
  });

  it("mantém alvos de toque e atalhos do aplicativo", () => {
    const buttons = readSource("src/components/ui/button-variants.ts");
    const copilot = readSource("src/components/Copilot/FloatingCopilot.tsx");
    const vite = readSource("vite.config.ts");

    expect(buttons).toContain('icon: "h-11 w-11 sm:h-10 sm:w-10"');
    expect(copilot).toContain("safe-area-inset-bottom");
    expect(vite).toContain("shortcuts:");
    expect(vite).toContain("siplan-route-scripts");
  });

  it("transforma tabelas administrativas em cartões paginados no mobile", () => {
    const adminPages = [
      "AuditLog",
      "CopilotAccess",
      "CopilotUsage",
      "RolesManagement",
      "TeamAreasManagement",
      "TeamConfiguration",
      "TeamManagement",
      "UserManagement",
      "VacationManagement",
    ];
    const pager = readSource("src/components/Admin/AdminListPagination.tsx");
    const paginationHook = readSource("src/hooks/useAdminListPagination.ts");

    for (const page of adminPages) {
      expect(readSource(`src/pages/admin/${page}.tsx`)).toContain(
        "mobile-card-table",
      );
    }
    expect(paginationHook).toContain("isMobile ? 3 : desktopPageSize");
    expect(pager).toContain('aria-label="Paginação da lista"');
  });

  it("oferece navegação compacta e formulários públicos sem rolagem lateral", () => {
    const project = readSource("src/pages/ProjectDetails.tsx");
    const infra = readSource("src/pages/public/PublicInfraCollection.tsx");
    const chat = readSource("src/pages/public/PublicPosChat.tsx");

    expect(project).toContain('id="project-detail-section"');
    expect(project).toContain("md:hidden");
    expect(infra).toContain("space-y-3 md:hidden");
    expect(infra).toContain("md:block md:overflow-x-auto");
    expect(chat).toContain("safe-area-inset-bottom");
  });

  it("evita tabela lateral e altura fixa no detalhamento do dashboard", () => {
    const projectModal = readSource(
      "src/components/Dashboard/ProjectDetailsModal.tsx",
    );
    const publicChecklist = readSource(
      "src/pages/public/PublicChecklist.tsx",
    );

    expect(projectModal).toContain("mobile-card-table");
    expect(projectModal).toContain('data-label="Cliente"');
    expect(projectModal).toContain("100dvh");
    expect(publicChecklist).toContain("min-h-[100dvh]");
  });
});
