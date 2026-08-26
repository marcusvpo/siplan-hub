export const ALL_COPILOT_STAGES = [
  "infra",
  "adherence",
  "conversion",
  "environment",
  "modelos_editor",
  "implementation",
  "post",
] as const;

export type CopilotStagePrefix = (typeof ALL_COPILOT_STAGES)[number];

export interface CopilotQuestionContext {
  stages: CopilotStagePrefix[];
  includeConversionIssues: boolean;
  includeChamadosPos: boolean;
}

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Seleciona somente os blocos de dados relacionados com a pergunta atual. */
export function detectCopilotQuestionContext(question: string): CopilotQuestionContext {
  const normalized = normalize(question);
  const withoutPost = normalized.replace(/pos[- ]?implantacao/g, "");
  const stages: CopilotStagePrefix[] = [];
  const add = (stage: CopilotStagePrefix): void => {
    if (!stages.includes(stage)) stages.push(stage);
  };

  if (/\binfra(?:estrutura)?\b/.test(normalized)) add("infra");
  if (/aderencia|aderente/.test(normalized)) add("adherence");
  if (/convers|homologacao/.test(normalized)) add("conversion");
  if (/\bambiente\b/.test(normalized)) add("environment");
  if (/modelos? editor|\bminutas?\b/.test(normalized)) add("modelos_editor");
  if (/implant|treinamento/.test(withoutPost)) add("implementation");
  if (/pos[- ]?implantacao|\bpos\b/.test(normalized)) add("post");

  const includeChamadosPos = /chamado|0800|suporte|\bbugs?\b|duvida|saude do pos/.test(normalized);
  if (includeChamadosPos) add("post");

  const selectedStages = stages.length ? stages : [...ALL_COPILOT_STAGES];
  return {
    stages: selectedStages,
    includeConversionIssues:
      selectedStages.includes("conversion") && /convers|pendenc|bloque|desvio/.test(normalized),
    includeChamadosPos,
  };
}
