import { describe, expect, it } from "vitest";
import { decodeRoutineObservations, encodeRoutineObservations, formatRoutineObservations } from "@/lib/cs-cx-routine-observations";

describe("observações de rotinas CS/CX", () => {
  it("mantém textos legados como uma observação", () => {
    expect(decodeRoutineObservations("Cliente prefere o processo manual.")).toEqual([
      "Cliente prefere o processo manual.",
    ]);
  });

  it("salva e recupera várias observações sem entradas vazias", () => {
    const encoded = encodeRoutineObservations([" Primeira observação ", "", "Segunda observação"]);
    expect(decodeRoutineObservations(encoded)).toEqual(["Primeira observação", "Segunda observação"]);
    expect(formatRoutineObservations(encoded)).toBe("1. Primeira observação\n2. Segunda observação");
  });

  it("não quebra quando recebe um valor estruturado inválido", () => {
    expect(decodeRoutineObservations("siplan-observations:v1:inválido")).toEqual([
      "siplan-observations:v1:inválido",
    ]);
  });
});
