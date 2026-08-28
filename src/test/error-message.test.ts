import { describe, expect, it } from "vitest";
import { getErrorMessage } from "@/lib/error-message";

describe("mensagens de erro do Supabase", () => {
  it("exibe objetos PostgREST em vez de esconder o erro real", () => {
    expect(getErrorMessage({ message: "Tabela ausente", details: "schema cache" }, "Falhou"))
      .toBe("Tabela ausente — schema cache");
  });

  it("usa a mensagem padrão para valores desconhecidos", () => {
    expect(getErrorMessage(null, "Falhou")).toBe("Falhou");
  });
});
