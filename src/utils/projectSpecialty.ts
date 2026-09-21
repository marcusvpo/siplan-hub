export const MAIN_SYSTEMS = [
  "Orion TN",
  "Orion PRO",
  "Orion REG",
  "WEBRI",
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
  "WEBRI": "Registro de Imóveis",
  "WebRI": "Registro de Imóveis",
  "WEB RI": "Registro de Imóveis",
};

/**
 * Retorna a especialidade sugerida/automática com base no sistema principal.
 */
export function getSpecialtyForSystem(systemType?: string | null): SpecialtyOption | undefined {
  if (!systemType) return undefined;
  return SYSTEM_SPECIALTY_MAP[systemType.trim()];
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
