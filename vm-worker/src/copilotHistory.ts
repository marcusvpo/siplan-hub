const DEFAULT_HISTORY_TURNS = 5;
const DEFAULT_MAX_HISTORY_CHARS = 8000;
const DEFAULT_SESSION_GAP_MS = 2 * 60 * 60 * 1000;

export interface CopilotHistoryRow {
  question: string | null;
  result_text: string | null;
  created_at: string | null;
}

export interface CopilotHistoryItem {
  question: string;
  result_text: string;
}

interface SelectHistoryOptions {
  currentCreatedAt?: string | null;
  currentQuestion?: string | null;
  maxTurns?: number;
  maxChars?: number;
  sessionGapMs?: number;
}

/**
 * Seleciona apenas a conversa recente. A consulta deve vir da mais nova para a
 * mais antiga; assim, quando o limite estoura, preservamos as mensagens mais
 * relevantes em vez de priorizar historico velho.
 */
export function selectCopilotHistory(
  rowsNewestFirst: CopilotHistoryRow[],
  options: SelectHistoryOptions = {}
): CopilotHistoryItem[] {
  const maxTurns = options.maxTurns ?? DEFAULT_HISTORY_TURNS;
  const maxChars = options.maxChars ?? DEFAULT_MAX_HISTORY_CHARS;
  const sessionGapMs = options.sessionGapMs ?? DEFAULT_SESSION_GAP_MS;
  const currentMs = Date.parse(options.currentCreatedAt || "");
  let newerMs = Number.isFinite(currentMs) ? currentMs : Date.now();
  const currentQuestion = String(options.currentQuestion || "").replace(/\s+/g, " ").trim().toLowerCase();
  let usedChars = 0;
  const selectedNewestFirst: CopilotHistoryItem[] = [];

  for (const row of rowsNewestFirst) {
    if (selectedNewestFirst.length >= maxTurns) break;

    const rowMs = Date.parse(row.created_at || "");
    if (Number.isFinite(rowMs)) {
      if (newerMs - rowMs > sessionGapMs) break;
      newerMs = rowMs;
    }

    const question = String(row.question || "").trim();
    const resultText = String(row.result_text || "").trim();
    if (!question || !resultText) continue;
    if (currentQuestion && question.replace(/\s+/g, " ").toLowerCase() === currentQuestion) continue;

    const itemChars = question.length + resultText.length;
    if (usedChars + itemChars > maxChars) break;

    selectedNewestFirst.push({ question, result_text: resultText });
    usedChars += itemChars;
  }

  return selectedNewestFirst.reverse();
}
