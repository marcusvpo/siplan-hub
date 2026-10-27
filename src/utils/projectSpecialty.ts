export const MAIN_SYSTEMS = [
  "Orion TN",
  "Orion PRO",
  "Orion REG",
  "WEBRI",
  "WEB RC",
  "Modelos TN",
] as const;

export type MainSystem = (typeof MAIN_SYSTEMS)[number];

export const SPECIALTY_OPTIONS = [
  "Notas",
  "Protesto",
  "TDPJ",
  "Registro de Imóveis",
  "Registro Civil",
] as const;

export type SpecialtyOption = (typeof SPECIALTY_OPTIONS)[number];

export const SYSTEM_SPECIALTY_MAP: Record<string, SpecialtyOption> = {
  "Orion TN": "Notas",
  "Orion PRO": "Protesto",
  "Orion REG": "TDPJ",
  "Orion Reg TDPJ": "TDPJ",
  "Orion REG (TDPJ)": "TDPJ",
  "OrionREG (TDPJ)": "TDPJ",
  "WEBRI": "Registro de Imóveis",
  "WebRI": "Registro de Imóveis",
  "WEB RI": "Registro de Imóveis",
  "WEB RC": "Registro Civil",
  "WebRC": "Registro Civil",
  "WEBRC": "Registro Civil",
};

/**
 * Normaliza qualquer variação de nomenclatura de sistema para o padrão canônico do Siplan HUB.
 * Ex: "Orion REG (TDPJ)", "Orion Reg TDPJ", "OrionREG (TDPJ)" -> "Orion REG"
 * Ex: "OrionTN" -> "Orion TN"
 * Ex: "OrionPRO" -> "Orion PRO"
 * Ex: "ModelosTN" -> "Modelos TN"
 * Ex: "WEB RI", "WebRI" -> "WebRI"
 * Ex: "WEB RC", "WebRC", "WEBRC" -> "WEB RC"
 */
export function normalizeSystemType(systemType?: string | null): string {
  if (!systemType) return "";
  const trimmed = systemType.trim();
  const lower = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // Orion REG: atende variações como "Orion REG (TDPJ)", "Orion Reg TDPJ", "OrionREG (TDPJ)", etc.
  // Protege contra falso-positivo com Orion GED
  if (lower.includes("orion") && (lower.includes("reg") || lower.includes("registro")) && !lower.includes("ged")) {
    return "Orion REG";
  }

  // Orion TN
  if (lower.includes("orion") && (lower.includes("tn") || lower.includes("notas"))) {
    return "Orion TN";
  }

  // Orion PRO
  if (lower.includes("orion") && (lower.includes("pro") || lower.includes("protesto"))) {
    return "Orion PRO";
  }

  // Modelos TN
  if (lower.includes("modelos") && lower.includes("tn")) {
    return "Modelos TN";
  }

  // WebRI / WEBRI / WEB RI
  if (lower.replace(/\s+/g, "") === "webri") {
    return "WebRI";
  }

  // WebRC / WEBRC / WEB RC
  if (lower.replace(/\s+/g, "") === "webrc") {
    return "WEB RC";
  }

  return trimmed;
}

/**
 * Retorna a especialidade sugerida/automática com base no sistema principal.
 */
export function getSpecialtyForSystem(systemType?: string | null): SpecialtyOption | undefined {
  if (!systemType) return undefined;
  const normalized = normalizeSystemType(systemType);
  return SYSTEM_SPECIALTY_MAP[normalized] || SYSTEM_SPECIALTY_MAP[systemType.trim()];
}

/**
 * Normaliza qualquer valor de especialidade (incluindo legados minúsculos) para o formato padrão.
 */
export function normalizeSpecialty(specialty?: string | null): string {
  if (!specialty) return "";
  const trimmed = specialty.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "notas") return "Notas";
  if (lower === "protesto") return "Protesto";
  if (lower === "tdpj") return "TDPJ";
  if (
    lower === "registro_imoveis" ||
    lower === "registro de imóveis" ||
    lower === "registro de imoveis" ||
    lower === "ri"
  ) {
    return "Registro de Imóveis";
  }
  if (
    lower === "registro_civil" ||
    lower === "registro civil" ||
    lower === "rc"
  ) {
    return "Registro Civil";
  }

  return trimmed;
}
