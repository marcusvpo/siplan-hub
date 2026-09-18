export const CHAMADOS_PRODUCTS = [
  { value: "todos", label: "Todos os produtos / módulos" },
  { value: "Orion TN", label: "Orion TN" },
  { value: "Orion PRO", label: "Orion PRO" },
  { value: "Orion REG", label: "Orion REG" },
  { value: "LCW", label: "LCW" },
  { value: "SGA", label: "SGA" },
  { value: "OrionGED", label: "OrionGED" },
  { value: "Siplan NFSe", label: "Siplan NFSe" },
] as const;

const ALL_PRODUCT_PATTERNS = ["orion%", "lcw%", "sga%", "siplan%nfse%"] as const;

const PRODUCT_PATTERNS: Record<string, string> = {
  oriontn: "orion%tn%",
  orionpro: "orion%pro%",
  orionreg: "orion%reg%",
  lcw: "lcw%",
  sga: "sga%",
  orionged: "orion%ged%",
  siplannfse: "siplan%nfse%",
};

/**
 * `software` identifica o produto que recebeu o chamado. A view repete cada
 * chamado para todos os itens licenciados do cliente, portanto `produto` nao
 * pode ser usado para decidir se o chamado pertence ao catálogo desta tela.
 */
export function getChamadosProductPatterns(product?: string | null): readonly string[] {
  const normalized = (product ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const pattern = PRODUCT_PATTERNS[normalized];

  return pattern ? [pattern] : ALL_PRODUCT_PATTERNS;
}

export function buildChamadosSoftwareOrFilter(product?: string | null): string {
  return getChamadosProductPatterns(product)
    .map((pattern) => `software.ilike.${pattern}`)
    .join(",");
}

export function formatChamadosProductLabel(product?: string | null): string {
  if (!product) return "—";

  const cleanedProduct = product
    .replace(/^Licenciamento\s+(?:de|do)\s+Software\s+/i, "")
    .trim();
  const normalized = cleanedProduct
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (normalized.includes("oriontn")) return "Orion TN";
  if (normalized.includes("orionpro")) return "Orion PRO";
  if (normalized.includes("orionreg")) return "Orion REG";
  if (normalized.includes("orionged")) return "OrionGED";
  if (normalized === "lcw") return "LCW";
  if (normalized === "sga") return "SGA";
  if (normalized.includes("siplannfse")) return "Siplan NFSe";

  return cleanedProduct;
}
