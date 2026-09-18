import { describe, expect, it } from "vitest";
import {
  buildChamadosSoftwareOrFilter,
  CHAMADOS_PRODUCTS,
  formatChamadosProductLabel,
  getChamadosProductPatterns,
} from "@/lib/chamados-product-filter";

describe("getChamadosProductPatterns", () => {
  it.each([undefined, null, "", "todos", "produto desconhecido"])(
    "mantem a consulta restrita aos produtos suportados para %s",
    (product) => {
      expect(getChamadosProductPatterns(product)).toEqual([
        "orion%",
        "lcw%",
        "sga%",
        "siplan%nfse%",
      ]);
    }
  );

  it.each([
    ["Orion TN", "orion%tn%"],
    ["ORION-PRO", "orion%pro%"],
    ["orion_reg", "orion%reg%"],
    ["LCW", "lcw%"],
    ["SGA", "sga%"],
    ["OrionGED", "orion%ged%"],
    ["Siplan NFSe", "siplan%nfse%"],
  ])("refina %s pelo software do chamado", (product, expected) => {
    expect(getChamadosProductPatterns(product)).toEqual([expected]);
  });

  it("monta o filtro OR usado pelo PostgREST", () => {
    expect(buildChamadosSoftwareOrFilter("todos")).toBe(
      "software.ilike.orion%,software.ilike.lcw%,software.ilike.sga%,software.ilike.siplan%nfse%",
    );
  });

  it("expoe os novos módulos no seletor", () => {
    expect(CHAMADOS_PRODUCTS.map(({ label }) => label)).toEqual([
      "Todos os produtos / módulos",
      "Orion TN",
      "Orion PRO",
      "Orion REG",
      "LCW",
      "SGA",
      "OrionGED",
      "Siplan NFSe",
    ]);
  });
});

describe("formatChamadosProductLabel", () => {
  it.each([
    ["Licenciamento de Software Orion TN", "Orion TN"],
    ["Licenciamento de Software Orion Protesto", "Orion PRO"],
    ["Licenciamento do Software Orion Registro TDPJ", "Orion REG"],
    ["Licenciamento de Software Orion Firmas", "Orion Firmas"],
    ["OrionTN", "Orion TN"],
    ["OrionPRO", "Orion PRO"],
    ["OrionREG (TDPJ)", "Orion REG"],
    ["Licenciamento de Software LCW", "LCW"],
    ["SGA", "SGA"],
    ["Licenciamento do Software OrionGED", "OrionGED"],
    ["Siplan NFSe", "Siplan NFSe"],
  ])("resume %s como %s", (product, expected) => {
    expect(formatChamadosProductLabel(product)).toBe(expected);
  });
});
