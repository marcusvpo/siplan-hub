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

  it("converte HTML legado com parágrafos, negrito e listas ordenadas para Lexical", () => {
    const rawHtml =
      "<p><strong>Análise de Aderência Técnica</strong></p>" +
      "<p>Serventia: <strong>Franca</strong>.</p>" +
      "<ol><li><strong>Item 1:</strong> Ajustar sequências.</li><li><strong>Item 2:</strong> Treinar equipe.</li></ol>";

    const serialized = plainTextToLexicalJson(rawHtml);
    expect(serialized).toContain('"type":"root"');
    expect(serialized).toContain('"listType":"number"');
    expect(serialized).not.toContain("<p>");
    expect(serialized).not.toContain("<strong>");
    expect(serialized).not.toContain("<ol>");
    expect(serialized).not.toContain("<li>");

    const plain = richTextToPlainText(serialized);
    expect(plain).toContain("Análise de Aderência Técnica");
    expect(plain).toContain("Serventia: Franca");
    expect(plain).toContain("1. Item 1: Ajustar sequências.");
    expect(plain).toContain("2. Item 2: Treinar equipe.");
  });

  it("limpa tags HTML ao extrair texto simples de HTML não serializado", () => {
    const rawHtml = "<p>Parágrafo com <strong>negrito</strong> e <em>itálico</em>.</p>";
    const plain = richTextToPlainText(rawHtml);
    expect(plain).toBe("Parágrafo com negrito e itálico.");
  });

  it("mantém e formata o parecer técnico resumido de Franca com 10 pontos de atenção", () => {
    const text = [
      "O sistema Orion REG mostrou-se plenamente aderente à operação da serventia, sem nenhum bloqueio de produto (0 gaps impeditivos). Foram mapeados 10 pontos de atenção prioritários para parametrização e treinamento:",
      "",
      "1. Protocolos independentes: configurar contadores próprios para TD, PJ e Certidões.",
      "2. Depósitos prévios: capacitar o financeiro no relatório nativo de devolução de saldos pendentes (> 60 dias).",
      "3. Tabela de Custas TJ-SP: parametrizar detalhadamente as regras de cálculo e variáveis de orçamento prévio.",
      "4. Notas Devolutivas: ajustar o fluxo de reentrada e sequências de controle apontadas.",
      "5. Máscara de Averbações: adotar o padrão operacional [Protocolo]/[Registro] (ex.: 71855/5022).",
      "6. Encadeamento de PJ: capacitar operadores no encadeamento de atos constitutivos e representação societária.",
      "7. Certidões: unificar o controle sequencial entre RTD e RCPJ.",
      "8. Imagens: mapear caminho UNC no servidor para busca e acervo histórico consolidado.",
      "9. Livro Caixa: alinhar conciliação diária e fechamento consolidado (Provimento 45 CNJ).",
      "10. Integração com Site: disponibilizar API de consulta pública de andamento de protocolos.",
    ].join("\n");

    const serialized = plainTextToLexicalJson(text);
    expect(serialized).toContain('"type":"root"');
    const plain = richTextToPlainText(serialized);
    expect(plain).toContain("O sistema Orion REG mostrou-se plenamente aderente");
    expect(plain).toContain("10. Integração com Site: disponibilizar API de consulta pública de andamento de protocolos.");
    expect(plain).not.toContain("Próximos Passos");
    expect(plain).not.toContain("Serventia:");
  });
});
