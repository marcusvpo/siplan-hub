import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { menuItems } from "@/constants/menuItems";
import { PERMISSION_RESOURCES } from "@/constants/permissions";
import { getPageHelp } from "@/constants/pageHelpRegistry";

const root = process.cwd();
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260917180000_orion_updates_module.sql"),
  "utf8",
);
const appSource = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const moduleSource = readFileSync(
  resolve(root, "src/modules/orion-updates/App.tsx"),
  "utf8",
);
const moduleStyles = readFileSync(
  resolve(root, "src/modules/orion-updates/styles.css"),
  "utf8",
);
const publicationStyles = readFileSync(
  resolve(root, "src/modules/orion-updates/publication-view.css"),
  "utf8",
);

describe("módulo Orion Changelog", () => {
  it("integra visão geral, leitura e gestão ao menu e às rotas protegidas", () => {
    const module = menuItems.find((item) => item.title === "Orion Changelog");

    expect(module?.path).toBe("/atualizacoes");
    expect(module?.permissionKey).toBe("menu_atualizacoes");
    expect(module?.subItems?.map((item) => [item.path, item.permissionKey])).toEqual([
      ["/atualizacoes/inicio", "orion_updates"],
      ["/atualizacoes/gestao", "orion_updates_management"],
    ]);
    expect(appSource).toContain('path="/atualizacoes"');
    expect(appSource).toContain('path="/atualizacoes/gestao"');
    expect(appSource).toContain('path="/atualizacoes/*"');
    expect(appSource).toContain('resource="orion_updates_management"');
    expect(PERMISSION_RESOURCES.some(p => p.resource === "orion_updates")).toBe(true);
  });

  it("cataloga somente ações realmente aplicadas pela gestão", () => {
    const byResource = new Map(
      PERMISSION_RESOURCES.map((permission) => [permission.resource, permission.actions]),
    );

    expect(byResource.get("menu_atualizacoes")).toEqual(["view"]);
    expect(byResource.get("orion_updates")).toEqual(["view"]);
    expect(byResource.get("orion_updates_management")).toEqual([
      "view",
      "create",
      "edit",
      "delete",
    ]);
    expect(moduleSource).toContain("if (!access?.canCreate)");
    expect(moduleSource).toContain("if (!access?.canEdit)");
    expect(moduleSource).toContain("if (!access?.canDelete)");
    expect(moduleSource).toContain("{!isHome && <ReaderManagementAccess />}");
  });

  it("cria o domínio completo com RLS e funções autenticadas", () => {
    for (const table of [
      "products",
      "versions",
      "media",
      "posts",
      "reads",
      "reactions",
      "shares",
      "suggestions",
      "audit",
    ]) {
      expect(migration).toContain(`CREATE TABLE public.orion_update_${table}`);
      expect(migration).toContain(
        `ALTER TABLE public.orion_update_${table} ENABLE ROW LEVEL SECURITY`,
      );
    }

    expect(migration).toContain("public.has_permission(auth.uid(), 'orion_updates', 'view')");
    expect(migration).toContain("'orion_updates_management', 'create'");
    expect(migration).toContain("'orion_updates_management', 'edit'");
    expect(migration).toContain("'orion_updates_management', 'delete'");
    expect(migration).not.toMatch(/\bTO\s+(?:public|anon)\b/i);
    expect(migration).not.toContain("ON ALL SEQUENCES IN SCHEMA public");
  });

  it("mantém mídia, HTML e analytics protegidos pelo desenho do Hub", () => {
    expect(migration).toContain("id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    expect(migration).toContain("name ~ '^[0-9a-f-]{36}\\.webp$'");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.orion_updates_save_post");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.orion_updates_analytics");
    expect(moduleStyles).toContain(".orion-blog-module");
    expect(moduleStyles).toContain("env(safe-area-inset-bottom)");
    expect(moduleStyles).toContain("@media (max-width: 700px)");
  });

  it("herda a paleta semântica do Hub no tema escuro", () => {
    expect(publicationStyles).toContain("--publication-surface: hsl(var(--card))");
    expect(publicationStyles).toContain("--publication-ink: hsl(var(--foreground))");
    expect(publicationStyles).toContain("--publication-accent: hsl(var(--primary))");
    expect(moduleStyles).toContain("background: hsl(var(--background))");
    expect(`${moduleStyles}\n${publicationStyles}`).not.toMatch(
      /#(?:0e1725|121e2f|19283c|2d3e55|223149|435a76|8fc3ff)/i,
    );
  });

  it("oferece ajuda específica para as três entradas do módulo", () => {
    for (const route of [
      "/atualizacoes",
      "/atualizacoes/inicio",
      "/atualizacoes/gestao",
    ]) {
      const help = getPageHelp(route);
      expect(help.moduleName).toBe("Orion Changelog");
      expect(help.steps.length).toBeGreaterThan(0);
      expect(help.keyFeatures.length).toBeGreaterThan(0);
    }
  });

  it("oferece suporte à alternância de link público e modo de manutenção", () => {
    const settingMigration = readFileSync(
      resolve(root, "supabase/migrations/20260918100000_orion_updates_public_link_setting.sql"),
      "utf8",
    );
    expect(settingMigration).toContain("CREATE TABLE IF NOT EXISTS public.orion_update_settings");
    expect(settingMigration).toContain("orion_updates_get_settings");
    expect(settingMigration).toContain("orion_updates_update_settings");
    expect(moduleSource).toContain("PublicMaintenance");
    expect(moduleSource).toContain("togglePublicLink");
  });
});

