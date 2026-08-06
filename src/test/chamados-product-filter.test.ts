import { describe, expect, it } from "vitest";
import {
  formatOrionProductLabel,
  getOrionProductPattern,
} from "@/lib/chamados-product-filter";

describe("getOrionProductPattern", () => {
  it.each([undefined, null, "", "todos", "produto desconhecido"])(
    "mantem a consulta restrita a Orion para %s",
    (product) => {
      expect(getOrionProductPattern(product)).toBe("%orion%");
    }
  );

  it.each([
    ["Orion TN", "%orion%tn%"],
    ["ORION-PRO", "%orion%pro%"],
    ["orion_reg", "%orion%reg%"],
  ])("refina %s pelo produto licenciado", (product, expected) => {
    expect(getOrionProductPattern(product)).toBe(expected);
  });
});

describe("formatOrionProductLabel", () => {
  it.each([
    ["Licenciamento de Software Orion TN", "Orion TN"],
    ["Licenciamento de Software Orion Protesto", "Orion PRO"],
    ["Licenciamento do Software Orion Registro TDPJ", "Orion REG"],
    ["Licenciamento de Software Orion Firmas", "Orion Firmas"],
  ])("resume %s como %s", (product, expected) => {
    expect(formatOrionProductLabel(product)).toBe(expected);
  });
});
