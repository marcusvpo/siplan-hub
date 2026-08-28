export interface EllevoHourRow {
  id_lancamento_0800: number;
  numero_chamado: number;
  sequencia_tramite: number | null;
  titulo_chamado: string | null;
  atividade: string | null;
  id_analista_0800: number;
  nome_analista: string;
  login_analista: string;
  horario_inicio: string;
  horario_fim: string;
  minutos: number;
  descricao_tramite: string | null;
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

export function mapEllevoHour(row: EllevoHourRow): SdTimeImportItem {
  const ticketLabel = `#${row.numero_chamado}`;
  const title = compactText(row.titulo_chamado) || "Chamado sem título";
  const activity = compactText(row.atividade);
  const description = compactText(row.descricao_tramite);
  const details = [
    activity ? `Atividade no 0800: ${activity}` : null,
    row.sequencia_tramite ? `Trâmite: ${row.sequencia_tramite}` : null,
    description,
  ].filter(Boolean);

  return {
    external_id: String(row.id_lancamento_0800),
    title: `${ticketLabel} — ${title}`.slice(0, 120),
    description: details.length ? details.join("\n\n") : null,
    start: row.horario_inicio.slice(0, 5),
    end: row.horario_fim.slice(0, 5),
    metadata: {
      ticket_number: row.numero_chamado,
      tramite_sequence: row.sequencia_tramite,
      activity,
      ellevo_user_id: row.id_analista_0800,
      ellevo_login: row.login_analista,
      ellevo_user_name: row.nome_analista,
      minutes: row.minutos,
      overtime: Boolean(row.hora_extra),
      rework: compactText(row.retrabalho),
      time_type: compactText(row.tipo_tempo),
      considers_contract: Boolean(row.considera_contrato),
    },
  };
}
