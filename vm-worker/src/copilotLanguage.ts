const STAGE_LABELS: Record<string, string> = {
  status_geral: "Situação geral",
  infra: "Infraestrutura",
  adherence: "Aderência",
  aderencia: "Aderência",
  conversion: "Conversão de dados",
  conversao: "Conversão de dados",
  environment: "Preparação do ambiente",
  ambiente: "Preparação do ambiente",
  modelos: "Modelos do sistema",
  modelos_editor: "Modelos do sistema",
  implementation: "Implantação e treinamento",
  implantacao: "Implantação e treinamento",
  post: "Pós-implantação",
  pos: "Pós-implantação",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "Não iniciado",
  pending: "Pendente",
  open: "Aberto",
  in_progress: "Em andamento",
  done: "Concluído",
  completed: "Concluído",
  blocked: "Bloqueado",
  paused: "Pausado",
  waiting_adjustment: "Aguardando ajustes",
  archived: "Arquivado",
  cancelled: "Cancelado",
};

function normalizedKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-/g, "_");
}

function readableStatus(value: string): string {
  const key = normalizedKey(value);
  return STATUS_LABELS[key] || value.replace(/[_-]+/g, " ");
}

function readablePeriod(value: string): string {
  const dates = value.split("-").map((part) => part.trim()).filter(Boolean);
  if (dates.length === 2) return `período: ${dates[0]} a ${dates[1]}`;
  return `data: ${value.trim()}`;
}

const TECHNICAL_STAGE_RE =
  /\b(status_geral|infra|adherence|ader[eê]ncia|conversion|convers[aã]o|environment|ambiente|modelos(?:_editor)?|implementation|implanta[cç][aã]o|post|p[oó]s)\s*=\s*([a-z][a-z_-]*)(?:\(([^)\r\n]*)\))?(?:\[([^\]\r\n]*)\])?/giu;

/**
 * Traduz a notação compacta usada no prompt para linguagem de negócio caso o
 * modelo a reproduza. Também permite humanizar resumos antigos já salvos.
 */
export function humanizeCopilotText(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      let changed = false;
      let readable = line.replace(
        TECHNICAL_STAGE_RE,
        (_match, rawStage: string, rawStatus: string, responsible?: string, period?: string) => {
          changed = true;
          const stage = STAGE_LABELS[normalizedKey(rawStage)] || rawStage;
          const details: string[] = [];
          if (responsible?.trim()) details.push(`responsável: ${responsible.trim()}`);
          if (period?.trim()) details.push(readablePeriod(period));
          return `${stage}: ${readableStatus(rawStatus)}${details.length ? ` (${details.join("; ")})` : ""}`;
        }
      );

      if (changed) {
        readable = readable.replace(/\s*\|\s*/g, "; ").replace(/\s*::\s*/g, " — ");
      }
      return readable;
    })
    .join("\n");
}
