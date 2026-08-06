export const CHAMADOS_ORION_PRODUCTS = [
  { value: "todos", label: "Todos os produtos Orion" },
  { value: "Orion TN", label: "Orion TN" },
  { value: "Orion PRO", label: "Orion PRO" },
  { value: "Orion REG", label: "Orion REG" },
] as const;

const ORION_PRODUCT_CODES: Record<string, string> = {
  oriontn: "tn",
  orionpro: "pro",
  orionreg: "reg",
};

/**
 * A consulta de processo de venda guarda o produto licenciado em `produto` e
 * o modulo que recebeu o chamado em `software`. As opcoes Orion TN/PRO/REG se
 * referem ao produto licenciado, nao ao modulo atendido.
 */
export function getOrionProductPattern(product?: string | null): string {
  const normalized = (product ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const productCode = ORION_PRODUCT_CODES[normalized];

  return productCode ? `%orion%${productCode}%` : "%orion%";
}

export function formatOrionProductLabel(product?: string | null): string {
  if (!product) return "—";

  const normalized = product
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (normalized.includes("oriontn")) return "Orion TN";
  if (normalized.includes("orionprotesto")) return "Orion PRO";
  if (normalized.includes("orionreg")) return "Orion REG";

  return product
    .replace(/^Licenciamento\s+(?:de|do)\s+Software\s+/i, "")
    .trim();
}
