import type {
  NpsAnswers,
  NpsQuestion,
  NpsQuestionnaireSnapshot,
  NpsQuestionnaireTheme,
} from "@/types/cs-cx-nps-survey";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const NPS_ASSET_PATH_PATTERN = /^themes\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i;
const NPS_BACKGROUND_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const NPS_THEME_ASSET_BUCKET = "cs-cx-nps-assets";
export const NPS_THEME_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const DEFAULT_NPS_THEME: NpsQuestionnaireTheme = {
  primary_color: "#E11D48",
  background_color: "#F8FAFC",
  background_image_path: null,
  background_overlay: 72,
};

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
  const themeError = validateNpsTheme(snapshot.theme);
  if (themeError) return themeError;
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

export function normalizeNpsTheme(
  value: unknown,
): NpsQuestionnaireTheme {
  const theme =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<NpsQuestionnaireTheme>)
      : {};
  const overlay = Number(theme.background_overlay);
  return {
    primary_color: isHexColor(theme.primary_color)
      ? theme.primary_color!.toUpperCase()
      : DEFAULT_NPS_THEME.primary_color,
    background_color: isHexColor(theme.background_color)
      ? theme.background_color!.toUpperCase()
      : DEFAULT_NPS_THEME.background_color,
    background_image_path:
      typeof theme.background_image_path === "string" &&
      NPS_ASSET_PATH_PATTERN.test(theme.background_image_path)
        ? theme.background_image_path
        : null,
    background_overlay:
      Number.isInteger(overlay) && overlay >= 0 && overlay <= 90
        ? overlay
        : DEFAULT_NPS_THEME.background_overlay,
  };
}

export function validateNpsTheme(theme?: NpsQuestionnaireTheme) {
  if (!theme) return null;
  if (!isHexColor(theme.primary_color) || !isHexColor(theme.background_color))
    return "Informe cores válidas no formato hexadecimal.";
  if (
    !Number.isInteger(theme.background_overlay) ||
    theme.background_overlay < 0 ||
    theme.background_overlay > 90
  )
    return "A cobertura da imagem deve ficar entre 0% e 90%.";
  if (
    theme.background_image_path &&
    !NPS_ASSET_PATH_PATTERN.test(theme.background_image_path)
  )
    return "A imagem de fundo informada é inválida.";
  return null;
}

export function validateNpsBackgroundFile(file: Pick<File, "size" | "type">) {
  if (!NPS_BACKGROUND_TYPES.has(file.type))
    return "Use uma imagem JPG, PNG ou WEBP.";
  if (file.size > NPS_THEME_MAX_FILE_SIZE)
    return "A imagem deve ter no máximo 5 MB.";
  return null;
}

export function publicNpsAssetUrl(
  path: string | null | undefined,
  baseUrl = import.meta.env.VITE_SUPABASE_URL,
) {
  if (!path || !NPS_ASSET_PATH_PATTERN.test(path)) return null;
  const apiUrl = String(baseUrl ?? "").replace(/\/$/, "");
  if (!apiUrl) return null;
  return `${apiUrl}/storage/v1/object/public/${NPS_THEME_ASSET_BUCKET}/${path}`;
}

export function npsThemeTint(hex: string, opacity: number) {
  const normalized = isHexColor(hex) ? hex.slice(1) : "E11D48";
  const channels = [0, 2, 4].map((index) =>
    Number.parseInt(normalized.slice(index, index + 2), 16),
  );
  return `rgba(${channels.join(", ")}, ${opacity})`;
}

export function darkenNpsThemeColor(hex: string, amount = 0.14) {
  const normalized = isHexColor(hex) ? hex.slice(1) : "E11D48";
  const channels = [0, 2, 4].map((index) =>
    Math.max(
      0,
      Math.round(
        Number.parseInt(normalized.slice(index, index + 2), 16) * (1 - amount),
      ),
    ),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function npsThemeForegroundColor(hex: string) {
  const normalized = isHexColor(hex) ? hex.slice(1) : "E11D48";
  const [red, green, blue] = [0, 2, 4].map((index) =>
    Number.parseInt(normalized.slice(index, index + 2), 16),
  );
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 160 ? "#0F172A" : "#FFFFFF";
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export function answerLabel(question: NpsQuestion, answers: NpsAnswers) {
  const value = answers[question.id];
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}
