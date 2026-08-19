import { describe, expect, it } from "vitest";
import {
  filterSdSolutions,
  normalizeSdSearch,
  sanitizeSdSolutionHtml,
} from "@/lib/sd-solutions";
import type { SdSolucao } from "@/types/sd";

const solution: SdSolucao = {
  id: "solution-1",
  titulo: "Emissão de certidão",
  descricao: "<p>Reinicie o serviço do assinador.</p>",
  sistema_id: "system-1",
  rotina_id: "routine-1",
  palavras_chave: ["certificado digital"],
  criado_em: "2026-08-19T12:00:00Z",
  atualizado_em: "2026-08-19T12:00:00Z",
  criado_por: null,
  atualizado_por: null,
  sistema: { id: "system-1", nome: "SiplanPRO" },
  rotina: { id: "routine-1", nome: "Certidões" },
};

describe("SD solutions", () => {
  it("normaliza acentos e caixa na busca", () => {
    expect(normalizeSdSearch("  Emissão ÁGIL  ")).toBe("emissao agil");
  });

  it("busca em título, HTML, relacionamentos e palavras-chave", () => {
    expect(filterSdSolutions([solution], "emissao")).toEqual([solution]);
    expect(filterSdSolutions([solution], "assinador")).toEqual([solution]);
    expect(filterSdSolutions([solution], "siplanpro")).toEqual([solution]);
    expect(filterSdSolutions([solution], "certificado digital")).toEqual([solution]);
    expect(filterSdSolutions([solution], "inexistente")).toEqual([]);
  });

  it("remove scripts e atributos executáveis do HTML", () => {
    const safe = sanitizeSdSolutionHtml(
      '<p onclick="alert(1)">Texto</p><script>alert(2)</script><img src="x" onerror="alert(3)">',
    );

    expect(safe).toContain("<p>Texto</p>");
    expect(safe).toContain('<img src="x">');
    expect(safe).not.toContain("script");
    expect(safe).not.toContain("onclick");
    expect(safe).not.toContain("onerror");
  });

  it("converte o destaque legado de palavras-chave", () => {
    const safe = sanitizeSdSolutionHtml('<span class="kw-mark">assinador</span>');
    expect(safe).toBe('<span class="sd-keyword">assinador</span>');
  });
});
