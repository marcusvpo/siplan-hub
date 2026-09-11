import { describe, expect, it } from "vitest";

import {
  buildChamadosKeywordOrFilter,
  formatChamadosSearchKeywords,
  normalizeChamadosSearchKeywords,
  resolveChamadosSearchKeywords,
} from "@/lib/chamados-search-keywords";

describe("palavras-chave da busca de chamados", () => {
  it("remove espaços e termos repetidos sem diferenciar caixa ou acento", () => {
    expect(normalizeChamadosSearchKeywords(["  RTF  ", "rtf", "Conversão", "conversao", "PDF final"]))
      .toEqual(["RTF", "Conversão", "PDF final"]);
  });

  it("mantém compatibilidade com o termo simples", () => {
    expect(resolveChamadosSearchKeywords(null, "  protocolo  ")).toEqual(["protocolo"]);
  });

  it("combina todos os termos como alternativas nos campos pesquisáveis", () => {
    const filter = buildChamadosKeywordOrFilter(["rtf", "756812"]);

    expect(filter).toContain('nome_cliente.ilike."%rtf%"');
    expect(filter).toContain('descricao.ilike."%756812%"');
    expect(filter).toContain('numero_chamado.eq."756812"');
    expect(filter.split(",")).toHaveLength(7);
  });

  it("formata os termos para relatórios e análises", () => {
    expect(formatChamadosSearchKeywords(["rtf", "pdf"])).toBe("rtf, pdf");
  });
});
