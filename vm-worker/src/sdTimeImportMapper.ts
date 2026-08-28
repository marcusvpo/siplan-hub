export interface EllevoHourRow {
  id_lancamento_0800: number;
  numero_chamado: number;
  sequencia_tramite: number | null;
  titulo_chamado: string | null;
  atividade: string | null;
  id_analista_0800: number;
  nome_analista: string;
  login_analista: string;
  id_grupo_analista_0800: number | null;
  grupo_analista: string | null;
  horario_inicio: string;
  horario_fim: string;
  minutos: number;
  descricao_tramite: string | null;
  ultima_sequencia_tramite: number | null;
  data_ultimo_tramite_iso: string | null;
  descricao_ultimo_tramite: string | null;
  hora_extra: boolean;
  retrabalho: string | null;
  tipo_tempo: string | null;
  considera_contrato: boolean;
}

export interface SdTimeImportItem {
  external_id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  metadata: Record<string, string | number | boolean | null>;
}

function compactText(value: string | null | undefined) {
  return value?.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() || null;
}

function decodeEllevoDescription(value: string | null | undefined) {
  if (!value) return null;
  let text = value;
  if (text.startsWith("ÿþ")) {
    text = Buffer.from(text, "latin1").toString("utf16le").slice(1);
  }
  const fromCode = (code: number) => {
    try {
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    } catch {
      return "";
    }
  };
  return compactText(
    text
      .replace(/<[^>]*>/g, " ")
      .replace(/&gt;/gi, ">")
      .replace(/&lt;/gi, "<")
      .replace(/&quot;/gi, '"')
      .replace(/&nbsp;/gi, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => fromCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, decimal: string) => fromCode(Number(decimal)))
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " "),
  );
}

export function mapEllevoHour(row: EllevoHourRow): SdTimeImportItem {
  const ticketLabel = `#${row.numero_chamado}`;
  const title = compactText(row.titulo_chamado) || "Chamado sem título";
  const activity = compactText(row.atividade);
  const description = decodeEllevoDescription(row.descricao_ultimo_tramite)
    || decodeEllevoDescription(row.descricao_tramite);
  const latestTramiteSequence = row.ultima_sequencia_tramite
    ?? row.sequencia_tramite;
  const details = [
    activity ? `Atividade no 0800: ${activity}` : null,
    latestTramiteSequence
      ? `Último trâmite do chamado: ${latestTramiteSequence}`
      : null,
    description,
  ].filter(Boolean);

  return {
    external_id: String(row.id_lancamento_0800),
    title: `${ticketLabel} — ${title}`.slice(0, 120),
    description: details.length ? details.join("\n") : null,
    start: row.horario_inicio.slice(0, 5),
    end: row.horario_fim.slice(0, 5),
    metadata: {
      ticket_number: row.numero_chamado,
      tramite_sequence: row.sequencia_tramite,
      time_entry_tramite_sequence: row.sequencia_tramite,
      latest_tramite_sequence: latestTramiteSequence,
      latest_tramite_at: row.data_ultimo_tramite_iso,
      activity,
      ellevo_user_id: row.id_analista_0800,
      ellevo_login: row.login_analista,
      ellevo_user_name: row.nome_analista,
      ellevo_group_id: row.id_grupo_analista_0800,
      ellevo_group: compactText(row.grupo_analista),
      minutes: row.minutos,
      overtime: Boolean(row.hora_extra),
      rework: compactText(row.retrabalho),
      time_type: compactText(row.tipo_tempo),
      considers_contract: Boolean(row.considera_contrato),
    },
  };
}
