import type {
  NpsAnswers,
  NpsQuestion,
  NpsQuestionnaireSnapshot,
} from "@/types/cs-cx-nps-survey";

export const DEFAULT_NPS_QUESTIONS: NpsQuestion[] = [
  {
    id: "score",
    type: "nps",
    semantic_key: "score",
    title: "Em uma escala de 0 a 10, o quanto você recomendaria a Siplan?",
    required: true,
  },
  {
    id: "score_reason",
    type: "textarea",
    semantic_key: "score_reason",
    title: "Qual é o principal motivo da sua nota?",
    required: true,
  },
  {
    id: "improvement_suggestion",
    type: "textarea",
    semantic_key: "improvement_suggestion",
    title: "O que poderíamos fazer para melhorar sua experiência?",
    required: false,
  },
];

export function newNpsQuestion(
  type: Exclude<NpsQuestion["type"], "nps">,
): NpsQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    title: "Nova pergunta",
    required: false,
    ...(["single_choice", "multiple_choice"].includes(type)
      ? { options: ["Opção 1", "Opção 2"] }
      : {}),
  };
}

export function validateNpsQuestionnaire(snapshot: NpsQuestionnaireSnapshot) {
  if (!snapshot.title.trim()) return "Informe o título do questionário.";
  if (
    !snapshot.questions.some(
      (question) =>
        question.type === "nps" && question.semantic_key === "score",
    )
  ) {
    return "O questionário precisa manter a pergunta principal de NPS.";
  }
  const ids = new Set<string>();
  for (const question of snapshot.questions) {
    if (!question.id || ids.has(question.id))
      return "Existem perguntas com identificadores duplicados.";
    ids.add(question.id);
    if (!question.title.trim())
      return "Todas as perguntas precisam de um título.";
    if (["single_choice", "multiple_choice"].includes(question.type)) {
      const options = (question.options ?? [])
        .map((option) => option.trim())
        .filter(Boolean);
      if (options.length < 2)
        return `A pergunta “${question.title}” precisa de ao menos duas opções.`;
    }
  }
  return null;
}

export function answerLabel(question: NpsQuestion, answers: NpsAnswers) {
  const value = answers[question.id];
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}
