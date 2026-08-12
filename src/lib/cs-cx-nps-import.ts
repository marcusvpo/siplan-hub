import type { CsCxNpsImportRow } from "@/hooks/useCsCxExperience";

const HEADERS = {
  date: ["hora de inicio", "data", "timestamp"],
  name: ["por favor informe seu nome", "nome"],
  score: ["qual e a probabilidade", "nota", "pontuacao"],
  reason: ["qual foi o principal motivo", "motivo"],
  suggestion: ["o que poderiamos fazer para melhorar", "sugestao", "melhoria"],
};

export interface NpsCsvResult { rows: CsCxNpsImportRow[]; errors: string[] }

export function parseNpsCsv(content: string, fallbackOffice: string): NpsCsvResult {
  const delimiter = detectDelimiter(content);
  return parseNpsRows(parseDelimited(content, delimiter), fallbackOffice);
}

export function parseNpsRows(records: string[][], fallbackOffice: string): NpsCsvResult {
  if (records.length < 2) throw new Error("O arquivo não possui respostas.");

  const headers = records[0].map(normalizeHeader);
  const columns = {
    date: findColumn(headers, HEADERS.date),
    name: findColumn(headers, HEADERS.name),
    score: findColumn(headers, HEADERS.score),
    reason: findColumn(headers, HEADERS.reason),
    suggestion: findColumn(headers, HEADERS.suggestion),
  };
  if (columns.date < 0 || columns.name < 0 || columns.score < 0) {
    throw new Error("Colunas obrigatórias não encontradas: Data, Nome e Nota/Pontuação.");
  }

  const rows: CsCxNpsImportRow[] = [];
  const errors: string[] = [];
  records.slice(1).forEach((record, index) => {
    if (record.every((value) => !value.trim())) return;
    try {
      const rawName = record[columns.name]?.trim();
      const rawScore = record[columns.score]?.trim();
      const score = rawScore ? Number(rawScore.replace(",", ".")) : Number.NaN;
      if (!rawName) throw new Error("nome em branco");
      if (!Number.isInteger(score) || score < 0 || score > 10) throw new Error("nota fora do intervalo 0–10");
      const [respondentName, ...officeParts] = rawName.split(" - ");
      rows.push({
        responded_at: parseDate(record[columns.date]).toISOString(),
        respondent_name: respondentName.trim(),
        respondent_office: officeParts.join(" - ").trim() || fallbackOffice,
        score,
        score_reason: valueAt(record, columns.reason),
        improvement_suggestion: valueAt(record, columns.suggestion),
      });
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : "inválida"}`);
    }
  });
  return { rows, errors };
}

function parseDelimited(content: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === '"') {
      if (quoted && content[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(value); value = "";
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
    } else value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.length)) rows.push(row);
  return rows;
}

function detectDelimiter(content: string) {
  const header = content.split(/\r?\n/, 1)[0] ?? "";
  return (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0) ? ";" : ",";
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function findColumn(headers: string[], prefixes: string[]) {
  return headers.findIndex((header) => prefixes.some((prefix) => header.startsWith(prefix)));
}

function valueAt(row: string[], index: number) {
  return index < 0 ? undefined : row[index]?.trim() || undefined;
}

function parseDate(raw: string) {
  const value = raw?.trim();
  const isoDate = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)) return date;
    throw new Error("data inválida");
  }
  const brazilian = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brazilian) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = brazilian;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (
      date.getFullYear() === Number(year)
      && date.getMonth() === Number(month) - 1
      && date.getDate() === Number(day)
      && date.getHours() === Number(hour)
      && date.getMinutes() === Number(minute)
      && date.getSeconds() === Number(second)
    ) return date;
    throw new Error("data inválida");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("data inválida");
  return date;
}
