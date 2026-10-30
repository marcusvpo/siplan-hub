import type { SecondaryTicketHubStatus, SecondaryTicketRow } from "@/integrations/supabase/types";
import type { ProjectV2 } from "@/types/ProjectV2";

export interface SecondaryStatusMeta {
  value: SecondaryTicketHubStatus;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
}

export const SECONDARY_HUB_STATUS_OPTIONS: SecondaryStatusMeta[] = [
  {
    value: "pending",
    label: "Pendente (Não Iniciado)",
    shortLabel: "Pendente",
    description: "Aguardando atuação do implantador em campo ou definição de repasse.",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25",
  },
  {
    value: "in_progress",
    label: "Em Andamento",
    shortLabel: "Em Andamento",
    description: "Instalação, configuração ou treinamento em execução.",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
  },
  {
    value: "deployed_field",
    label: "Implantado em Campo",
    shortLabel: "Implantado (Campo)",
    description: "Instalado, configurado e treinado pelo implantador durante o projeto principal.",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    value: "handed_to_sd",
    label: "Repassado ao SD (Remoto)",
    shortLabel: "Fila SD Remoto",
    description: "Direcionado ao Service Desk para instalação e treinamento remoto.",
    badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  },
  {
    value: "completed_sd",
    label: "Concluído pelo SD",
    shortLabel: "Concluído (SD)",
    description: "Instalação e treinamento remoto finalizados pela equipe do SD.",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    value: "blocked_client",
    label: "Bloqueado pelo Cliente",
    shortLabel: "Bloqueado",
    description: "Aguardando equipamento, totem, TV, certificado ou disponibilidade do cartório.",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  },
  {
    value: "cancelled",
    label: "Desconsiderado / Cancelado",
    shortLabel: "Cancelado",
    description: "Chamado cancelado ou desconsiderado deste acompanhamento.",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
  },
];

export const SECONDARY_HUB_STATUS_MAP: Record<SecondaryTicketHubStatus, SecondaryStatusMeta> =
  Object.fromEntries(
    SECONDARY_HUB_STATUS_OPTIONS.map((opt) => [opt.value, opt])
  ) as Record<SecondaryTicketHubStatus, SecondaryStatusMeta>;

export function normalizeSecondaryMatchText(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Espelho determinístico da blindagem morfológica do banco (classify_0800_implantation_ticket):
 * - Tolera typos em "Implantação e Treinamento" (ex: "Implanmtação", "Implatação", omissão de "e")
 * - Permite "Configuração e Treinamento" apenas para Produtos Secundários (jamais para Sistemas Principais)
 * - Bloqueia pós-implantação, rotinas, IA, período de teste, parcela express e atualizações
 */
export function isImplantationTicketTitleEligible(
  titulo?: string | null,
  category: "primary" | "secondary" = "secondary"
): boolean {
  const norm = normalizeSecondaryMatchText(titulo);
  if (!norm) return false;
  if (
    /\bpos\s+impla/.test(norm) ||
    /\b(rotina|rotinas|parcela\s+express|assinatura\s+digital|periodo\s+de\s+teste|atualizacao)\b/.test(norm) ||
    /\b(siplan\s*ia|inteligencia\s*artificial|processamento\s*ia|ocrizacao|modulo\s*(?:de\s*)?ia|rotina\s*(?:de\s*)?ia|(?:da|de)\s+ia|ia\s+azure|bi\s*report|paineis\s+de\s+indicadores|nfse|nfs\s*e|web\s*rc|siplan\s*rc)\b/.test(
      norm
    )
  ) {
    return false;
  }

  if (/\bimpla[a-z]{2,10}\s+(?:e\s+|de\s+|configuracao\s+e\s+)?treinamento\b/.test(norm)) {
    return true;
  }

  if (
    category === "secondary" &&
    /\bconfigura[a-z]{2,10}\s+(?:e\s+|de\s+)?treinamento\b/.test(norm)
  ) {
    return true;
  }

  return false;
}

export function isSecondaryClosedIn0800(
  ticket: Pick<SecondaryTicketRow, "ellevo_status" | "ellevo_closed_at">
): boolean {
  if (ticket.ellevo_closed_at) return true;
  const normStatus = normalizeSecondaryMatchText(ticket.ellevo_status);
  return /\b(encerrad\w*|concluid\w*|fechad\w*|cancelad\w*|finalizad\w*)\b/.test(normStatus);
}

export function isSecondaryWithCsOrBillingIn0800(
  ticket: Pick<SecondaryTicketRow, "tramited_to_cs" | "ellevo_analyst" | "ellevo_team">
): boolean {
  if (ticket.tramited_to_cs) return true;
  const normAnalyst = normalizeSecondaryMatchText(ticket.ellevo_analyst);
  const normTeam = normalizeSecondaryMatchText(ticket.ellevo_team);
  return (
    /\b(maria santos|soraya)\b/.test(normAnalyst) ||
    /\b(cs|cx|faturamento|administrativo)\b/.test(normTeam)
  );
}

export function isSecondaryResolvedIn0800(
  ticket: Pick<
    SecondaryTicketRow,
    "tramited_to_cs" | "ellevo_status" | "ellevo_analyst" | "ellevo_team" | "ellevo_closed_at"
  >
): boolean {
  return isSecondaryClosedIn0800(ticket) || isSecondaryWithCsOrBillingIn0800(ticket);
}

export function isSecondaryExecutionDoneInHub(status: SecondaryTicketHubStatus): boolean {
  return status === "deployed_field" || status === "completed_sd";
}

/**
 * Verdadeiro quando o produto já foi instalado/concluído na prática (Campo ou SD),
 * mas o chamado no 0800 ainda consta em aberto/não tramitado para Maria Santos (CS) ou Administrativo.
 */
export function hasSecondary0800Divergence(
  ticket: Pick<
    SecondaryTicketRow,
    "hub_status" | "tramited_to_cs" | "ellevo_status" | "ellevo_analyst" | "ellevo_team" | "ellevo_closed_at"
  >
): boolean {
  return isSecondaryExecutionDoneInHub(ticket.hub_status) && !isSecondaryResolvedIn0800(ticket);
}

/**
 * Verdadeiro enquanto o item ainda exige atenção operacional (execução pendente ou falta trâmite no 0800).
 */
export function isSecondaryTicketPendingAttention(
  ticket: Pick<
    SecondaryTicketRow,
    "hub_status" | "tramited_to_cs" | "ellevo_status" | "ellevo_analyst" | "ellevo_team" | "ellevo_closed_at"
  >
): boolean {
  if (ticket.hub_status === "cancelled") return false;
  if (isSecondaryExecutionDoneInHub(ticket.hub_status) && isSecondaryResolvedIn0800(ticket)) {
    return false;
  }
  return true;
}

export function formatOpNumberDisplay(opNumber?: number | null): string | null {
  if (!opNumber || opNumber <= 0) return null;
  const year = opNumber % 10000;
  const prefix = Math.floor(opNumber / 10000);
  if (prefix > 0 && year >= 2020 && year <= 2035) {
    return `${prefix}/${year}`;
  }
  return String(opNumber);
}

export function buildSuggested0800Tramite(
  ticket: Pick<SecondaryTicketRow, "product_name" | "hub_status" | "responsible" | "observations">,
  primarySystemLabel?: string | null,
  primaryTicketNumber?: string | null
): string {
  const originRef = primarySystemLabel
    ? `${primarySystemLabel}${primaryTicketNumber ? ` (Chamado principal #${primaryTicketNumber})` : ""}`
    : primaryTicketNumber
      ? `Chamado principal #${primaryTicketNumber}`
      : "sistema principal";

  const respPart = ticket.responsible?.trim()
    ? ` Responsável técnico: ${ticket.responsible.trim()}.`
    : "";
  const obsPart = ticket.observations?.trim()
    ? `\nObservações registradas: ${ticket.observations.trim()}`
    : "";

  switch (ticket.hub_status) {
    case "deployed_field":
      return (
        `Informamos que a instalação, configuração e treinamento do produto ${ticket.product_name} ` +
        `foram realizados e concluídos durante a implantação presencial do ${originRef}.${respPart}` +
        `${obsPart}\n` +
        `Encaminhando o chamado para acompanhamento de Pós-Implantação / CS (Maria Santos).`
      );
    case "handed_to_sd":
      return (
        `Em alinhamento com a implantação do ${originRef}, este produto complementar (${ticket.product_name}) ` +
        `está sendo direcionado para instalação, configuração e treinamento remoto pela equipe do Service Desk (SD).${respPart}` +
        `${obsPart}`
      );
    case "completed_sd":
      return (
        `Informamos que a instalação, configuração e treinamento remoto do produto ${ticket.product_name} ` +
        `foram finalizados pela equipe do Service Desk (SD), vinculado ao projeto ${originRef}.${respPart}` +
        `${obsPart}\n` +
        `Encaminhando o chamado para acompanhamento de CS / liberação administrativa.`
      );
    case "blocked_client":
      return (
        `A implantação do produto ${ticket.product_name} encontra-se aguardando providências/liberação ` +
        `por parte da serventia (equipamento, infraestrutura ou agenda).${respPart}${obsPart}`
      );
    default:
      return (
        `Atualização de acompanhamento do produto ${ticket.product_name} vinculado ao projeto ${originRef}.${respPart}${obsPart}`
      );
  }
}

export const OFFICIAL_SECONDARY_PRODUCTS = [
  { code: "lcw", name: "Livro Caixa Web", onlySystemType: null, requiresOrionAdmin: true },
  { code: "sga", name: "SGA", onlySystemType: null, requiresOrionAdmin: true },
  { code: "library", name: "Library", onlySystemType: null, requiresOrionAdmin: false },
  { code: "cartorio_on_hand", name: "Cartório On Hand", onlySystemType: null, requiresOrionAdmin: true },
  { code: "e_recepcao", name: "e-Recepção", onlySystemType: null, requiresOrionAdmin: false },
  { code: "ciaf", name: "CIAF", onlySystemType: null, requiresOrionAdmin: false },
  { code: "image", name: "Image", onlySystemType: null, requiresOrionAdmin: false },
  { code: "image_pro", name: "Image PRO", onlySystemType: null, requiresOrionAdmin: false },
  { code: "e_qualificacao", name: "e-Qualificação", onlySystemType: null, requiresOrionAdmin: false },
  { code: "orion_caixa", name: "Orion Caixa", onlySystemType: null, requiresOrionAdmin: false },
  { code: "orion_cartflow", name: "Orion CartFLOW", onlySystemType: null, requiresOrionAdmin: false },
  { code: "orion_connect", name: "Orion Connect", onlySystemType: null, requiresOrionAdmin: false },
  { code: "orion_editor", name: "Orion Editor", onlySystemType: "Orion TN", requiresOrionAdmin: false },
  { code: "orion_ged", name: "Orion GED", onlySystemType: null, requiresOrionAdmin: false },
] as const;

export interface ProjectOrionAdminStatus {
  required: boolean;
  dependentProducts: string[];
  isConfigured: boolean;
  configText: string;
  configuredBy?: string;
  configuredAt?: string;
}

/**
 * Determina se o projeto possui dependência do Orion Admin (apenas LCW, SGA e Cartório On Hand)
 * e o estado atual da configuração das chaves na etapa 4 (Preparação de Ambiente).
 */
export function getProjectOrionAdminStatus(
  project?: Pick<ProjectV2, "products" | "relatedTickets" | "secondaryProductsNames" | "stages"> | null,
  secondaryTickets?: Array<Pick<SecondaryTicketRow, "product_name" | "product_code">> | null
): ProjectOrionAdminStatus {
  const dependentProductsSet = new Set<string>();

  const checkText = (text?: string | null) => {
    if (!text) return;
    const norm = normalizeSecondaryMatchText(text);
    if (!norm) return;
    if (/\b(lcw|livro\s*caixa|caixa\s*web)\b/.test(norm)) {
      dependentProductsSet.add("Livro Caixa Web (LCW)");
    }
    if (/\b(sga|gestao\s*de\s*atendimento|sistema\s*de\s*gestao\s*de\s*atendimento)\b/.test(norm)) {
      dependentProductsSet.add("SGA");
    }
    if (/\b(on\s*hand|cartorio\s*on\s*hand)\b/.test(norm)) {
      dependentProductsSet.add("Cartório On Hand");
    }
  };

  project?.products?.forEach(checkText);
  project?.secondaryProductsNames?.forEach(checkText);
  project?.relatedTickets?.forEach((t) => {
    checkText(t.name);
  });
  secondaryTickets?.forEach((st) => {
    if (st.product_code === "lcw" || st.product_code === "sga" || st.product_code === "cartorio_on_hand") {
      checkText(st.product_name || st.product_code);
    } else {
      checkText(st.product_name);
    }
  });

  const dependentProducts = Array.from(dependentProductsSet);
  const configText = project?.stages?.environment?.orionAdminConfig || "";
  const explicitConfigured = project?.stages?.environment?.orionAdminConfigured;
  const configuredBy = project?.stages?.environment?.orionAdminConfiguredBy;
  const configuredAt = project?.stages?.environment?.orionAdminConfiguredAt;

  // Está configurado se o switch estiver marcado true ou se o texto possuir propriedades preenchidas
  const hasTextConfig = configText.trim().length > 10;
  const isConfigured = explicitConfigured !== undefined ? explicitConfigured : hasTextConfig;

  // Requerido se há produtos dependentes OU se já foi configurado manualmente
  const required = dependentProducts.length > 0 || isConfigured;

  return {
    required,
    dependentProducts,
    isConfigured,
    configText,
    configuredBy,
    configuredAt,
  };
}

/**
 * Mapeia se um chamado secundário corresponde a uma tag, nome de produto, sigla ou número de chamado clicado.
 */
export function matchSecondaryTicket(
  ticket: Pick<SecondaryTicketRow, "ticket_number" | "product_name"> & {
    product_code?: string | null;
  },
  query?: string | null
): boolean {
  if (!query) return false;
  const qClean = query.trim().toLowerCase();
  const qNorm = normalizeSecondaryMatchText(query);
  const qDigits = query.replace(/\D/g, "");

  if (qDigits.length >= 4 && ticket.ticket_number.replace(/\D/g, "") === qDigits) {
    return true;
  }

  if (ticket.product_code && ticket.product_code.toLowerCase() === qClean) {
    return true;
  }

  const prodNorm = normalizeSecondaryMatchText(ticket.product_name);
  if (!prodNorm) return false;

  if (prodNorm === qNorm || prodNorm.includes(qNorm) || qNorm.includes(prodNorm)) {
    return true;
  }

  const aliasGroups: string[][] = [
    ["lcw", "livro caixa", "livro caixa web", "caixa web"],
    ["sga", "sistema de gestao de atendimento", "gestao de atendimento", "atendimento"],
    ["editor", "orion editor"],
    ["on hand", "on hand", "cartorio on hand"],
    ["library", "orion library"],
    ["ged", "orion ged"],
    ["cartflow", "cart flow", "orion cartflow"],
    ["connect", "orion connect"],
    ["image", "siplan image", "image pro"],
    ["erecepcao", "e recepcao", "e-recepcao"],
    ["equalificacao", "e qualificacao", "e-qualificacao"],
    ["caixa", "orion caixa"],
    ["ciaf"],
  ];

  for (const group of aliasGroups) {
    const queryInGroup = group.some((g) => {
      const gNorm = normalizeSecondaryMatchText(g);
      return qNorm === gNorm || qNorm.includes(gNorm) || gNorm.includes(qNorm);
    });
    const prodInGroup = group.some((g) => {
      const gNorm = normalizeSecondaryMatchText(g);
      return prodNorm === gNorm || prodNorm.includes(gNorm) || gNorm.includes(prodNorm);
    });
    if (queryInGroup && prodInGroup) {
      return true;
    }
  }

  return false;
}
