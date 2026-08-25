import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CHAMADOS_CATALOG_CONFIG,
  CHAMADOS_LEGACY_PRODUCT_GROUPS,
  LEGACY_PRODUCT_FAMILIES,
  formatChamadosProductLabel,
  isLegacyFamily,
} from "@/lib/chamados-catalog";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("catálogo da Consulta de Chamados Legado", () => {
  it("mantém as três famílias e os sistemas informados", () => {
    expect(LEGACY_PRODUCT_FAMILIES).toEqual(["Control-M", "Global", "Siplan"]);
    expect(CHAMADOS_LEGACY_PRODUCT_GROUPS.map((group) => group.family)).toEqual(
      LEGACY_PRODUCT_FAMILIES,
    );

    const systems = CHAMADOS_LEGACY_PRODUCT_GROUPS.flatMap((group) => group.products);
    expect(systems).toEqual(expect.arrayContaining([
      "Control-M Estoque",
      "Global - Firmas",
      "SIPLANPRO",
      "SIPLANRC",
      "SIPLANTN",
    ]));
    expect(isLegacyFamily(" control-m ")).toBe(true);
    expect(formatChamadosProductLabel("  SIPLANTN  ", "legacy")).toBe("SIPLANTN");
  });

  it("usa rota, permissão e fila próprias para o legado", () => {
    expect(CHAMADOS_CATALOG_CONFIG.legacy.route).toBe("/deployments/tickets-legacy");
    expect(CHAMADOS_CATALOG_CONFIG.legacy.permission).toBe("chamados_legacy_query");
    expect(CHAMADOS_CATALOG_CONFIG.legacy.syncRpc).toBe(
      "request_processo_venda_legado_sync",
    );
  });

  it("mantém o SQL Server somente como origem de leitura no worker", () => {
    const worker = readSource("vm-worker/src/chamadosSync.ts");
    const hook = readSource("src/hooks/useChamados0800.ts");
    const page = readSource("src/pages/DeploymentsTickets.tsx");
    const sourceView = readSource(
      "vm-worker/sql/vw_2026_HUB_CONSULTA_CHAMADOS_LEGADO.sql",
    );

    expect(worker).toContain("dbo.vw_2026_ChamadosTodosStatus AS c");
    expect(worker).toContain("IN ('Siplan', 'Control-M', 'Global')");
    expect(worker).toContain('"processo_venda_legado"');
    expect(worker).toContain("filters.products");
    expect(worker).toContain("filters.softwares");
    expect(hook).toContain("products?: string[] | null");
    expect(hook).toContain("softwares?: string[] | null");
    expect(page).toContain(">Produto</label>");
    expect(page).toContain(">Software</label>");
    expect(sourceView).toContain("CREATE OR ALTER VIEW dbo.vw_2026_HUB_CONSULTA_CHAMADOS_LEGADO");
    expect(sourceView).toContain("IN ('Siplan', 'Control-M', 'Global')");
  });
});
