import { describe, expect, it } from "vitest";
import {
  CHAMADO_STATUS_OPTIONS,
  isChamadoStatus,
  normalizeChamadoStatus,
} from "@/lib/chamados-status";

describe("status de chamado", () => {
  it.each([
    ["NÃO INICIADO", "Não iniciado"],
    ["em andamento", "Em andamento"],
    ["AGUARDANDO", "Aguardando"],
    ["concluido", "Concluído"],
  ])("normaliza %s como %s", (raw, expected) => {
    expect(normalizeChamadoStatus(raw)).toBe(expected);
  });

  it.each(["FATURANDO", "FATURADO", "PENDENTE FATURAMENTO", ""])(
    "rejeita status de faturamento ou vazio: %s",
    (raw) => {
      expect(normalizeChamadoStatus(raw)).toBeNull();
    }
  );

  it("reconhece somente os valores canônicos usados na consulta", () => {
    expect(CHAMADO_STATUS_OPTIONS.every(isChamadoStatus)).toBe(true);
    expect(isChamadoStatus("NÃO INICIADO")).toBe(false);
  });
});
