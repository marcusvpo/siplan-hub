import { describe, expect, it } from "vitest";
import {
  decodeAppointmentObservations,
  encodeAppointmentObservations,
  formatAppointmentObservations,
} from "@/lib/cs-cx-appointment-observations";

describe("observações de agendamentos CS/CX", () => {
  it("trata uma observação antiga como a primeira entrada", () => {
    expect(
      decodeAppointmentObservations("Cliente solicitou retorno pela manhã."),
    ).toEqual(["Cliente solicitou retorno pela manhã."]);
  });

  it("salva e recupera várias observações sem entradas vazias", () => {
    const encoded = encodeAppointmentObservations([
      " Primeira observação ",
      "",
      "Segunda observação",
    ]);

    expect(decodeAppointmentObservations(encoded)).toEqual([
      "Primeira observação",
      "Segunda observação",
    ]);
    expect(formatAppointmentObservations(encoded)).toBe(
      "1. Primeira observação\n2. Segunda observação",
    );
  });

  it("preserva um valor estruturado inválido como texto legado", () => {
    const invalid = "siplan-appointment-observations:v1:inválido";
    expect(decodeAppointmentObservations(invalid)).toEqual([invalid]);
  });
});
