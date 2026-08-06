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
 * A consulta de processo de venda guarda o item licenciado em `produto` e o
 * software real do chamado em `software`. O filtro da tela deve considerar
 * somente o software real para não misturar Caixa/SIPLAN com chamados Orion.
 */
export function getOrionSoftwarePattern(product?: string | null): string {
  const normalized = (product ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const productCode = ORION_PRODUCT_CODES[normalized];

  return productCode ? `%orion%${productCode}%` : "%orion%";
}
