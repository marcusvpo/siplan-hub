import { describe, it, expect } from "vitest";
import { getPageHelp, pageHelpData } from "@/constants/pageHelpRegistry";
import { menuItems } from "@/constants/menuItems";

describe("pageHelpRegistry", () => {
  it("contém entradas específicas para todas as rotas declaradas no menuItems", () => {
    const routesToTest: string[] = [];

    menuItems.forEach((item) => {
      if (item.path) routesToTest.push(item.path);
      if (item.subItems) {
        item.subItems.forEach((sub) => {
          if (sub.path) routesToTest.push(sub.path);
        });
      }
    });

    routesToTest.forEach((route) => {
      const help = getPageHelp(route);
      expect(help, `Falha para a rota: ${route}`).toBeDefined();
      expect(help.title).not.toContain("Central de Ajuda - "); // Não deve ser o fallback genérico
      expect(help.description).not.toContain("Você está navegando na área de"); // Não deve ser fallback genérico
      expect(help.steps.length).toBeGreaterThan(0);
      expect(help.keyFeatures.length).toBeGreaterThan(0);
    });
  });

  it("retorna o informativo correto para a rota de solicitações CS/CX (/cs-cx/registros)", () => {
    const help = getPageHelp("/cs-cx/registros");
    expect(help.title).toBe("Central de Solicitações CS/CX");
    expect(help.moduleName).toBe("CS/CX");
    expect(help.keyFeatures).toContain(
      "Alternância entre visualização por Lista detalhada e Quadro Kanban",
    );
    expect(help.steps.length).toBe(3);
    expect(help.steps[0].title).toBe("Filtre os Chamados");
  });

  it("resolve corretamente rotas dinâmicas como /commercial/client/123", () => {
    const help = getPageHelp("/commercial/client/123-abc");
    expect(help.title).toBe("Visão 360º do Cliente Cartório");
    expect(help.moduleName).toBe("Comercial");
  });

  it("resolve corretamente rotas dinâmicas de editor como /orion-tn-models/editor/99", () => {
    const help = getPageHelp("/orion-tn-models/editor/99");
    expect(help.title).toBe("Editor Interativo de Modelos OrionTN");
    expect(help.moduleName).toBe("Modelos OrionTN");
  });

  it("possui pelo menos 30 telas mapeadas especificamente", () => {
    expect(pageHelpData.length).toBeGreaterThanOrEqual(30);
  });
});
