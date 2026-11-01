import { normalizeSystemType } from "@/utils/projectSpecialty";

/**
 * Relação oficial de Especialidades dos Implantadores do Siplan HUB.
 *
 * Mapeamento:
 * - Rodrigo Mizuno: Orion PRO
 * - Rodrigo Brites: Orion PRO e Orion TN (o único em ambos)
 * - Ricardo Vieira: Orion TN
 * - Julio Araújo: Orion REG
 * - Fernando Cruz: WebRI
 * - Erik Marques: Orion TN
 */
export interface ImplantadorSpecialtyConfig {
  name: string;
  normalizedName: string;
  specialties: string[];
}

export const IMPLANTADOR_SPECIALTIES: ImplantadorSpecialtyConfig[] = [
  {
    name: "Rodrigo Mizuno",
    normalizedName: "rodrigo mizuno",
    specialties: ["Orion PRO"],
  },
  {
    name: "Rodrigo Brites",
    normalizedName: "rodrigo brites",
    specialties: ["Orion PRO", "Orion TN"],
  },
  {
    name: "Ricardo Vieira",
    normalizedName: "ricardo vieira",
    specialties: ["Orion TN"],
  },
  {
    name: "Julio Araújo",
    normalizedName: "julio araujo",
    specialties: ["Orion REG"],
  },
  {
    name: "Fernando Cruz",
    normalizedName: "fernando cruz",
    specialties: ["WebRI"],
  },
  {
    name: "Erik Marques",
    normalizedName: "erik marques",
    specialties: ["Orion TN"],
  },
];

/**
 * Nomes oficiais dos implantadores para atalhos rápidos e filtros prioritários
 */
export const OFFICIAL_IMPLANTADORES_NAMES = IMPLANTADOR_SPECIALTIES.map((i) => i.name);

/**
 * Estilização visual (cores e badges) para cada sistema/especialidade
 */
export const SYSTEM_BADGE_STYLES: Record<string, { label: string; badgeClass: string; dotColor: string }> = {
  "Orion PRO": {
    label: "Orion PRO",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dotColor: "bg-blue-500",
  },
  "Orion TN": {
    label: "Orion TN",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
  "Orion REG": {
    label: "Orion REG",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dotColor: "bg-purple-500",
  },
  "WebRI": {
    label: "WebRI",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dotColor: "bg-amber-500",
  },
};

export function normalizeSpecialtyText(text?: string | null): string {
  return normalizeTextInternal(text);
}

function normalizeTextInternal(text?: string | null): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Retorna a lista de especialidades de um colaborador pelo seu nome
 */
export function getImplantadorSpecialties(collaboratorName?: string | null): string[] {
  if (!collaboratorName) return [];
  const norm = normalizeTextInternal(collaboratorName);
  const found = IMPLANTADOR_SPECIALTIES.find((item) =>
    item.normalizedName === norm || norm.includes(item.normalizedName)
  );
  return found ? found.specialties : [];
}

/**
 * Verifica se um analista é um dos 6 implantadores oficiais
 */
export function isImplantador(collaboratorName?: string | null): boolean {
  if (!collaboratorName) return false;
  const norm = normalizeTextInternal(collaboratorName);
  return IMPLANTADOR_SPECIALTIES.some(
    (item) => item.normalizedName === norm || norm.includes(item.normalizedName)
  );
}

/**
 * Verifica se o implantador atende o sistema especificado
 */
export function isSpecialistForSystem(collaboratorName: string, systemName?: string | null): boolean {
  if (!systemName) return true;
  const specs = getImplantadorSpecialties(collaboratorName);
  if (specs.length === 0) return true; // se não for implantador (ex: infra ou outro), não restringe

  const normalizedSys = normalizeSystemType(systemName);
  return specs.some((s) => normalizeTextInternal(s) === normalizeTextInternal(normalizedSys));
}

/**
 * Recomendação Inteligente de Implantadores para Chamados 0800:
 * - Se for sistema principal (Orion TN, Orion PRO, Orion REG, WebRI), recomenda os especialistas do sistema.
 * - Se for "Orion Editor", é exclusivo do sistema "Orion TN" (recomenda Ricardo Vieira, Rodrigo Brites e Erik Marques).
 * - Se for outros Produtos Secundários (Livro Caixa Web, NFSe, GED, etc.), todos os 6 implantadores têm capacidade para atender.
 */
export function getRecommendedSpecialistsForTicket(ticket: {
  produto?: string | null;
  modulo?: string | null;
  software?: string | null;
  systemType?: string | null;
  title?: string | null;
}): {
  recommendedNames: string[];
  reason: string;
  isExclusiveOrionEditor?: boolean;
} {
  const combinedText = [
    ticket.produto,
    ticket.modulo,
    ticket.software,
    ticket.systemType,
    ticket.title,
  ]
    .filter(Boolean)
    .join(" ");

  const norm = normalizeTextInternal(combinedText);

  // Caso 1: Exclusividade do Orion Editor -> Apenas especialistas Orion TN
  if (norm.includes("editor") || norm.includes("orion editor") || norm.includes("modelos editor")) {
    const tnSpecialists = IMPLANTADOR_SPECIALTIES.filter((i) =>
      i.specialties.includes("Orion TN")
    ).map((i) => i.name);

    return {
      recommendedNames: tnSpecialists,
      reason: "Orion Editor é exclusivo do Orion TN (Ricardo Vieira, Rodrigo Brites e Erik Marques)",
      isExclusiveOrionEditor: true,
    };
  }

  // Caso 2: Sistema Principal Orion PRO
  if (norm.includes("protesto") || (norm.includes("orion") && norm.includes("pro"))) {
    const proSpecialists = IMPLANTADOR_SPECIALTIES.filter((i) =>
      i.specialties.includes("Orion PRO")
    ).map((i) => i.name);

    return {
      recommendedNames: proSpecialists,
      reason: "Especialistas no sistema Orion PRO (Protesto)",
    };
  }

  // Caso 3: Sistema Principal Orion TN
  if (norm.includes("notas") || (norm.includes("orion") && norm.includes("tn"))) {
    const tnSpecialists = IMPLANTADOR_SPECIALTIES.filter((i) =>
      i.specialties.includes("Orion TN")
    ).map((i) => i.name);

    return {
      recommendedNames: tnSpecialists,
      reason: "Especialistas no sistema Orion TN (Notas)",
    };
  }

  // Caso 4: Sistema Principal Orion REG
  if (norm.includes("tdpj") || norm.includes("orion reg") || (norm.includes("registro") && norm.includes("titulos"))) {
    const regSpecialists = IMPLANTADOR_SPECIALTIES.filter((i) =>
      i.specialties.includes("Orion REG")
    ).map((i) => i.name);

    return {
      recommendedNames: regSpecialists,
      reason: "Especialista no sistema Orion REG (TDPJ)",
    };
  }

  // Caso 5: Sistema Principal WebRI
  if (norm.includes("webri") || norm.includes("web ri") || (norm.includes("registro") && norm.includes("imoveis"))) {
    const webriSpecialists = IMPLANTADOR_SPECIALTIES.filter((i) =>
      i.specialties.includes("WebRI")
    ).map((i) => i.name);

    return {
      recommendedNames: webriSpecialists,
      reason: "Especialista no sistema WebRI (Registro de Imóveis)",
    };
  }

  // Caso 6: Produtos Secundários gerais -> Todos os implantadores podem atender
  return {
    recommendedNames: OFFICIAL_IMPLANTADORES_NAMES,
    reason: "Produto secundário / chamado geral apto para qualquer implantador",
  };
}

/**
 * Validação amigável para etapas de Projetos (`/projects`)
 * Alerta se o implantador selecionado for especialista em outro sistema.
 */
export function validateProjectStageResponsible(
  systemName?: string | null,
  responsibleName?: string | null,
  stageTitle = "esta etapa"
): { isValid: boolean; warning?: string } {
  if (!systemName || !responsibleName) return { isValid: true };

  const isAnImplantador = isImplantador(responsibleName);
  if (!isAnImplantador) return { isValid: true };

  const isSpec = isSpecialistForSystem(responsibleName, systemName);
  if (!isSpec) {
    const specs = getImplantadorSpecialties(responsibleName).join(", ");
    return {
      isValid: false,
      warning: `${responsibleName} é especialista em ${specs}. O projeto atual é do sistema ${systemName}. Verifique se deseja manter a designação para ${stageTitle}.`,
    };
  }

  return { isValid: true };
}
