import {
  formatOrionProductLabel,
  getOrionProductPattern,
} from "@/lib/chamados-product-filter";

export type ChamadosCatalog = "orion" | "legacy";

export const LEGACY_PRODUCT_FAMILIES = ["Control-M", "Global", "Siplan"] as const;

export const CHAMADOS_LEGACY_PRODUCT_GROUPS = [
  {
    family: "Control-M",
    products: [
      "Ambiente",
      "Control-M Atendimento",
      "Control-M DIÁRIO",
      "Control-M Estoque",
      "Control-M Financeiro",
      "Control-M GED",
      "Control-M Prot",
      "Control-M REG",
      "Control-M SDTP",
      "Control-M TabNot",
      "Control-M TABNOT - MÓDULO EDITOR",
      "Control-M TABNOT - MÓDULO FIRMAS",
      "Control-M TDPJ",
      "Conversor SPCM",
      "e-Reg",
      "Integrador do WebSite",
      "Siplan NFSe",
      "SPCM – Selos",
    ],
  },
  {
    family: "Global",
    products: [
      "Global - Firmas",
      "Global - Geral",
      "Global - Notas",
      "Global - Protesto de Títulos",
      "Global - Registro Civil",
      "Global - Registro de Imóveis",
      "Global - Siplan NFSe",
      "Global - TD / PJ",
    ],
  },
  {
    family: "Siplan",
    products: [
      "AMBIENTE",
      "Balcão Web Protesto",
      "CIS",
      "Contraditório IA WebRI",
      "e-Reg",
      "HDE",
      "Image",
      "ImagePRO",
      "IMG",
      "Inteligência Artificial",
      "LCX - Livro Caixa",
      "MANUTENÇÃO E HOSPEDAGEM DE WEBSITE",
      "SDI",
      "Siplan IA",
      "Siplan NFSe",
      "SIPLANADMIN",
      "SIPLANPRO",
      "SIPLANRC",
      "SIPLANROTINAS",
      "SIPLANTN",
      "SPCM App",
      "WebProtesto",
      "WEBRI",
      "WEBTD",
    ],
  },
] as const;

export const CHAMADOS_CATALOG_CONFIG = {
  orion: {
    title: "Consulta de Chamados (Ellevo/0800)",
    description: "Pesquise e consulte o histórico de chamados sincronizados do Ellevo de forma global e consolidada.",
    allProductsLabel: "Todos os produtos Orion",
    permission: "chamados_query",
    route: "/deployments/tickets",
    syncRpc: "request_processo_venda_sync",
  },
  legacy: {
    title: "Consulta de Chamados (Ellevo/0800) — Legado",
    description: "Consulte chamados das famílias Control-M, Global e Siplan com o mesmo espelho otimizado do Ellevo.",
    allProductsLabel: "Todos os produtos legados",
    permission: "chamados_legacy_query",
    route: "/deployments/tickets-legacy",
    syncRpc: "request_processo_venda_legado_sync",
  },
} as const;

export function formatChamadosProductLabel(
  product: string | null | undefined,
  catalog: ChamadosCatalog = "orion",
): string {
  if (catalog === "orion") return formatOrionProductLabel(product);
  return product?.trim() || "—";
}

export function getChamadosProductLabel(
  product: string | null | undefined,
  catalog: ChamadosCatalog,
): string {
  if (!product || product === "todos") {
    return CHAMADOS_CATALOG_CONFIG[catalog].allProductsLabel;
  }
  return formatChamadosProductLabel(product, catalog);
}

export function isLegacyFamily(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLocaleLowerCase("pt-BR");
  return LEGACY_PRODUCT_FAMILIES.some(
    (family) => family.toLocaleLowerCase("pt-BR") === normalized,
  );
}

export function getCatalogSoftwarePattern(
  product: string | null | undefined,
  catalog: ChamadosCatalog,
): string | null {
  if (catalog === "orion") return getOrionProductPattern(product);
  return product && product !== "todos" ? product : null;
}
