import { describe, expect, it } from "vitest";
import { formatNotificationMessage } from "./format-notification";

describe("formatNotificationMessage", () => {
  it("converte timestamps ISO UTC para o formato DD/MM/YYYY", () => {
    const raw =
      "A data de início da Fase 1 de FRANCA foi reprogramada de 2026-11-01T15:00:00.000Z para 2026-11-16T15:00:00.000Z. Verifique o prazo no Kanban.";
    const result = formatNotificationMessage(raw);

    expect(result).toBe(
      "A data de início da Fase 1 de FRANCA foi reprogramada de 01/11/2026 para 16/11/2026. Verifique o prazo no Kanban."
    );
  });

  it("converte timestamps ISO com novo prazo limite de entrega do ambiente", () => {
    const raw =
      "A data de início da Fase 1 de FRANCA foi reprogramada de 2026-11-01T15:00:00.000Z para 2026-11-16T15:00:00.000Z. Verifique o novo prazo limite de entrega do ambiente.";
    const result = formatNotificationMessage(raw);

    expect(result).toBe(
      "A data de início da Fase 1 de FRANCA foi reprogramada de 01/11/2026 para 16/11/2026. Verifique o novo prazo limite de entrega do ambiente."
    );
  });

  it("converte datas no formato YYYY-MM-DD", () => {
    const raw = "Reprogramado de 2026-11-01 para 2026-11-16.";
    const result = formatNotificationMessage(raw);

    expect(result).toBe("Reprogramado de 01/11/2026 para 16/11/2026.");
  });

  it("preserva datas que já estão no formato DD/MM/YYYY", () => {
    const raw = "Período de pós-implantação ativo até 16/11/2026.";
    const result = formatNotificationMessage(raw);

    expect(result).toBe("Período de pós-implantação ativo até 16/11/2026.");
  });

  it("lida com valores nulos, vazios ou indefinidos com segurança", () => {
    expect(formatNotificationMessage("")).toBe("");
    expect(formatNotificationMessage(null)).toBe("");
    expect(formatNotificationMessage(undefined)).toBe("");
  });
});
