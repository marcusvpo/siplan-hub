import { describe, expect, it } from "vitest";
import { humanizeCopilotText } from "@/lib/copilot-language";

describe("humanizeCopilotText", () => {
  it("traduz etapas, status, responsavel e periodo", () => {
    expect(
      humanizeCopilotText(
        "- Cartorio Exemplo :: pos=todo | implantacao=done(Joana Silva)[01/07-05/07] | ambiente=in-progress(Luciane Lima)[03/07]"
      )
    ).toBe(
      "- Cartorio Exemplo — Pós-implantação: Não iniciado; Implantação e treinamento: Concluído (responsável: Joana Silva; período: 01/07 a 05/07); Preparação do ambiente: Em andamento (responsável: Luciane Lima; data: 03/07)"
    );
  });

  it("preserva respostas que ja estao em linguagem natural", () => {
    const text = "- A implantação do Cartório Exemplo está atrasada e precisa de acompanhamento.";
    expect(humanizeCopilotText(text)).toBe(text);
  });
});
