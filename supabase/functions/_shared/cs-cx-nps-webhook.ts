export interface NpsWebhookInput {
  respondedAt: string;
  respondentName: string;
  officeName: string;
  score: number;
  scoreReason: string | null;
  improvementSuggestion: string | null;
}

export function isValidWebhookToken(expected: string, received: string | null) {
  if (!expected || !received) return false;
  let difference = expected.length ^ received.length;
  const length = Math.max(expected.length, received.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (expected.charCodeAt(index) || 0) ^ (received.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function parseNpsWebhookPayload(payload: unknown): NpsWebhookInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Nenhum objeto JSON recebido.");
  const data = payload as Record<string, unknown>;
  const rawDate = stringValue(data.data);
  const rawIdentity = stringValue(data.nome_cartorio) || stringValue(data.respondente);
  const rawScore = data.pontuacao;
  if (!rawDate || !rawIdentity || rawScore === null || rawScore === undefined || rawScore === "") {
    throw new Error("Campos obrigatórios ausentes: data, nome_cartorio/respondente, pontuacao.");
  }

  const score = Number(rawScore);
  if (!Number.isFinite(score) || Math.trunc(score) < 0 || Math.trunc(score) > 10) {
    throw new Error("Pontuação inválida. Informe um número entre 0 e 10.");
  }
  const parts = rawIdentity.split(" - ");
  const respondentName = (parts.shift() ?? "").trim();
  const officeName = parts.join(" - ").trim() || respondentName;
  if (!respondentName || !officeName) throw new Error("Respondente ou cartório inválido.");

  return {
    respondedAt: parseWebhookDate(rawDate).toISOString(),
    respondentName: respondentName.slice(0, 300),
    officeName: officeName.slice(0, 300),
    score: Math.trunc(score),
    scoreReason: nullableString(data.motivo, 10_000),
    improvementSuggestion: nullableString(data.sugestao, 10_000),
  };
}

function parseWebhookDate(value: string) {
  const brazilian = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brazilian) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = brazilian;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)) return date;
    throw new Error(`Formato de data inválido: ${value}`);
  }
  const american = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})(?::(\d{2}))? (AM|PM)$/i);
  if (american) {
    const [, month, day, year, rawHour, minute, second = "0", period] = american;
    let hour = Number(rawHour) % 12;
    if (period.toUpperCase() === "PM") hour += 12;
    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second));
    if (date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)) return date;
    throw new Error(`Formato de data inválido: ${value}`);
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) throw new Error(`Formato de data inválido: ${value}`);
  return new Date(timestamp);
}

function stringValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function nullableString(value: unknown, limit: number) { const normalized = stringValue(value); return normalized ? normalized.slice(0, limit) : null; }
