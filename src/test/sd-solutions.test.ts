import { describe, expect, it } from "vitest";
import {
  filterSdSolutions,
  groupSdSolutionsByFamily,
  normalizeSdSearch,
  SD_UNASSIGNED_FAMILY_ID,
  sanitizeSdSolutionHtml,
  sdSolutionExcerpt,
  sortSdSolutions,
  splitSdHighlightedText,
} from "@/lib/sd-solutions";
import type { SdFamilia, SdSistema, SdSolucao } from "@/types/sd";

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
  status: "publicado",
  responsavel_id: null,
  revisado_em: "2026-08-19T12:00:00Z",
  proxima_revisao_em: "2027-02-15",
  versao: 1,
  visualizacoes: 3,
  votos_uteis: 2,
  votos_nao_uteis: 0,
  sistema: { id: "system-1", nome: "SiplanPRO" },
  rotina: { id: "routine-1", nome: "Certidões" },
};

const families: SdFamilia[] = [
  { id: "family-2", nome: "Tributos", descricao: null, criado_em: "2026-08-19T12:00:00Z" },
  { id: "family-1", nome: "Atendimento", descricao: "Produtos de atendimento", criado_em: "2026-08-19T12:00:00Z" },
];

const systems: SdSistema[] = [
  { id: "system-2", nome: "Zulu", familia_id: null, criado_em: "2026-08-19T12:00:00Z" },
  { id: "system-1", nome: "SiplanPRO", familia_id: "family-1", criado_em: "2026-08-19T12:00:00Z" },
];

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

  it("agrupa soluções por família em ordem alfabética e preserva sistemas sem família", () => {
    const groups = groupSdSolutionsByFamily(families, systems, [solution]);

    expect(groups.map((group) => group.nome)).toEqual([
      "Atendimento",
      "Tributos",
      "Sem família",
    ]);
    expect(groups[0].solutions).toEqual([solution]);
    expect(groups[0].systems.map((system) => system.nome)).toEqual(["SiplanPRO"]);
    expect(groups[2].id).toBe(SD_UNASSIGNED_FAMILY_ID);
    expect(groups[2].systems.map((system) => system.nome)).toEqual(["Zulu"]);
  });

  it("oculta famílias sem soluções quando há uma busca ativa", () => {
    const groups = groupSdSolutionsByFamily(families, systems, [solution], true);

    expect(groups.map((group) => group.nome)).toEqual(["Atendimento"]);
  });

  it("ordena por relevância, acesso e utilidade", () => {
    const popular: SdSolucao = {
      ...solution,
      id: "solution-2",
      titulo: "Procedimento genérico",
      visualizacoes: 40,
      votos_uteis: 10,
    };

    expect(sortSdSolutions([popular, solution], "relevancia", "emissao")[0]).toBe(solution);
    expect(sortSdSolutions([solution, popular], "acessadas", "")[0]).toBe(popular);
    expect(sortSdSolutions([solution, popular], "uteis", "")[0]).toBe(popular);
  });

  it("destaca a busca sem perder acentos e recorta a descrição ao redor do termo", () => {
    const parts = splitSdHighlightedText("Emissão de certidão", "emissao");
    expect(parts.find((part) => part.match)?.text).toBe("Emissão");
    expect(sdSolutionExcerpt(`<p>${"início ".repeat(40)}assinador digital</p>`, "assinador"))
      .toContain("assinador");
  });
});
