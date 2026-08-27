import { describe, expect, it } from "vitest";
import {
  hasRichTextContent,
  plainTextToLexicalJson,
  richTextToPlainText,
} from "@/lib/lexical";

describe("conteúdo rich text do Lexical", () => {
  it("mantém compatibilidade com texto simples legado", () => {
    expect(richTextToPlainText("Contato realizado sem ressalvas.")).toBe(
      "Contato realizado sem ressalvas.",
    );
  });

  it("extrai parágrafos e listas do estado serializado", () => {
    const serialized = plainTextToLexicalJson(
      "Resumo do contato\n- Enviar proposta\n- Confirmar prazo",
    );

    expect(richTextToPlainText(serialized)).toBe(
      "Resumo do contato\n• Enviar proposta\n• Confirmar prazo",
    );
  });

  it("não considera um editor vazio como pendência preenchida", () => {
    expect(hasRichTextContent(plainTextToLexicalJson(""))).toBe(false);
    expect(hasRichTextContent(plainTextToLexicalJson("Próximo passo"))).toBe(
      true,
    );
  });
});
