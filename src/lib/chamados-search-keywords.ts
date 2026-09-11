import { normalizeSearchText } from "@/utils/normalize-search";

export function normalizeChamadosSearchKeywords(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const keyword = value.trim().replace(/\s+/g, " ");
    const key = normalizeSearchText(keyword);
    if (!keyword || seen.has(key)) continue;

    seen.add(key);
    normalized.push(keyword);
  }

  return normalized;
}

export function resolveChamadosSearchKeywords(
  keywords?: readonly string[] | null,
  legacySearchTerm?: string | null,
): string[] {
  return normalizeChamadosSearchKeywords([
    ...(keywords ?? []),
    ...(legacySearchTerm ? [legacySearchTerm] : []),
  ]);
}

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Cria um unico grupo OR para que qualquer palavra-chave possa corresponder a
 * qualquer um dos campos textuais pesquisaveis do chamado.
 */
export function buildChamadosKeywordOrFilter(keywords: readonly string[]): string {
  return normalizeChamadosSearchKeywords(keywords)
    .flatMap((keyword) => {
      const containsKeyword = quotePostgrestValue(`%${keyword}%`);
      const textFilters = [
        `nome_cliente.ilike.${containsKeyword}`,
        `titulo.ilike.${containsKeyword}`,
        `descricao.ilike.${containsKeyword}`,
      ];

      return /^\d+$/.test(keyword)
        ? [`numero_chamado.eq.${quotePostgrestValue(keyword)}`, ...textFilters]
        : textFilters;
    })
    .join(",");
}

export function formatChamadosSearchKeywords(keywords: readonly string[]): string {
  return normalizeChamadosSearchKeywords(keywords).join(", ");
}
