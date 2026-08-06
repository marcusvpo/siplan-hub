import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "@/utils/normalize-search";

describe("normalizeSearchText", () => {
  it("ignora maiusculas e minusculas", () => {
    expect(normalizeSearchText("UBA")).toBe("uba");
    expect(normalizeSearchText("Ubatuba").includes(normalizeSearchText("UBA"))).toBe(true);
  });

  it("ignora acentos e espacos externos", () => {
    expect(normalizeSearchText("  SÃO VICENTE  ")).toBe("sao vicente");
  });
});
