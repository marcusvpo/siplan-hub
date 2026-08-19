export interface PublicNpsSubmission {
  token: string;
  respondentName: string;
  answers: Record<string, string | string[] | number>;
  honeypot: string;
}

export function parsePublicNpsToken(value: unknown) {
  const token = typeof value === "string" ? value.trim() : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    throw new Error("Link de NPS inválido.");
  }
  return token;
}

export function parsePublicNpsSubmission(
  payload: unknown,
): PublicNpsSubmission {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Resposta inválida.");
  }
  const input = payload as Record<string, unknown>;
  const token = parsePublicNpsToken(input.token);
  const respondentName =
    typeof input.respondent_name === "string"
      ? input.respondent_name.trim()
      : "";
  const honeypot =
    typeof input.website === "string" ? input.website.trim() : "";
  if (!respondentName || respondentName.length > 300)
    throw new Error("Informe o nome do respondente.");
  if (
    !input.answers ||
    typeof input.answers !== "object" ||
    Array.isArray(input.answers)
  ) {
    throw new Error("Respostas inválidas.");
  }
  const entries = Object.entries(input.answers as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 50)
    throw new Error("Quantidade de respostas inválida.");
  const answers: PublicNpsSubmission["answers"] = {};
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(key))
      throw new Error("Identificador de pergunta inválido.");
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 10
    )
      answers[key] = value;
    else if (typeof value === "string" && value.length <= 10_000)
      answers[key] = value;
    else if (
      Array.isArray(value) &&
      value.length <= 50 &&
      value.every((item) => typeof item === "string" && item.length <= 500)
    ) {
      answers[key] = value;
    } else throw new Error("Formato de resposta inválido.");
  }
  return { token, respondentName, answers, honeypot };
}
