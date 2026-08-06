import { describe, expect, it } from "vitest";
import { getOrionSoftwarePattern } from "@/lib/chamados-product-filter";

describe("getOrionSoftwarePattern", () => {
  it.each([undefined, null, "", "todos", "produto desconhecido"])(
    "mantem a consulta restrita a Orion para %s",
    (product) => {
      expect(getOrionSoftwarePattern(product)).toBe("%orion%");
    }
  );

  it.each([
    ["Orion TN", "%orion%tn%"],
    ["ORION-PRO", "%orion%pro%"],
    ["orion_reg", "%orion%reg%"],
  ])("refina %s pelo software real", (product, expected) => {
    expect(getOrionSoftwarePattern(product)).toBe(expected);
  });
});
