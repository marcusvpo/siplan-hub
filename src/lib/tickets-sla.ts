import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import { isTicketCompleted, normalizeTicketText } from "@/lib/tickets-ai-analytics";

const HOUR_MS = 60 * 60 * 1000;

export interface ResolutionSlaState {
  hours: number | null;
  label: "Dentro do SLA" | "Fora do SLA" | "SLA em curso" | "SLA estourado" | "Sem datas";
  className: string;
}

export interface TicketAreaTime {
  area: string;
  hours: number;
  intervals: number;
}

export interface TicketAreaTransfer {
  fromArea: string;
  toArea: string;
  transferredAt?: string;
  waitHours: number | null;
  activity?: string;
  responsible?: string;
}

export interface TicketFlowAnalysis {
  areaTimes: TicketAreaTime[];
  transfers: TicketAreaTransfer[];
  bottleneck: TicketAreaTime | null;
  longestTransfer: TicketAreaTransfer | null;
  totalTrackedHours: number;
}

export function parseSlaDate(value?: string, endOfDay = false): Date | null {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? "23:59:59" : "00:00:00"}`
    : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function elapsedHours(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  return Math.max(0, (to.getTime() - from.getTime()) / HOUR_MS);
}

export function formatSlaDuration(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return "Não calculado";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  const roundedHours = Math.round(hours);
  if (roundedHours < 24) return `${hours < 10 ? hours.toFixed(1) : roundedHours} h`;
  const days = Math.floor(roundedHours / 24);
  const remainingHours = roundedHours % 24;
  return remainingHours > 0 ? `${days} d ${remainingHours} h` : `${days} d`;
}

export function getResolutionSlaState(
  chamado: Chamado0800,
  targetDays: number,
  now = new Date(),
): ResolutionSlaState {
  const openedAt = parseSlaDate(chamado.abertoEm || chamado.dataAbertura);
  const closed = isTicketCompleted(chamado);
  const closedAt = parseSlaDate(
    chamado.encerradoEm || chamado.dataEncerramento,
    !chamado.encerradoEm,
  );
  const hours = elapsedHours(openedAt, closed ? closedAt : now);
  const within = hours !== null && hours <= targetDays * 24;

  if (hours === null) {
    return { hours, label: "Sem datas", className: "bg-muted text-muted-foreground" };
  }
  if (closed) {
    return within
      ? { hours, label: "Dentro do SLA", className: "bg-emerald-100 text-emerald-700" }
      : { hours, label: "Fora do SLA", className: "bg-rose-100 text-rose-700" };
  }
  return within
    ? { hours, label: "SLA em curso", className: "bg-blue-100 text-blue-700" }
    : { hours, label: "SLA estourado", className: "bg-amber-100 text-amber-800" };
}

export function chronologicalTramites(tramites: ChamadoTramite[]): ChamadoTramite[] {
  return [...tramites].sort((left, right) => {
    const leftTime = parseSlaDate(left.dataTramite)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = parseSlaDate(right.dataTramite)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime || left.sequenciaTramite - right.sequenciaTramite;
  });
}

function tramiteArea(tramite: ChamadoTramite): string {
  return tramite.equipeResponsavel?.trim() || "Área não informada";
}

/**
 * Estima o tempo percorrido em cada área a partir da equipe registrada nos
 * trâmites. Como a origem não possui eventos separados de envio e aceite, o
 * intervalo de transferência corresponde ao tempo entre o último trâmite da
 * área anterior e o primeiro trâmite da área seguinte.
 */
export function buildTicketFlowAnalysis(
  chamado: Chamado0800,
  tramites: ChamadoTramite[],
  now = new Date(),
): TicketFlowAnalysis {
  const timeline = chronologicalTramites(tramites).filter((tramite) => (
    parseSlaDate(tramite.dataTramite) !== null
  ));
  const openedAt = parseSlaDate(chamado.abertoEm || chamado.dataAbertura);
  const closedAt = parseSlaDate(
    chamado.encerradoEm || chamado.dataEncerramento,
    !chamado.encerradoEm,
  );
  const endpoint = isTicketCompleted(chamado) && closedAt ? closedAt : now;
  const areaTotals = new Map<string, { hours: number; intervals: number }>();
  const transfers: TicketAreaTransfer[] = [];

  const addAreaInterval = (area: string, from: Date | null, to: Date | null) => {
    const hours = elapsedHours(from, to);
    if (hours === null) return;
    const current = areaTotals.get(area) || { hours: 0, intervals: 0 };
    current.hours += hours;
    current.intervals += 1;
    areaTotals.set(area, current);
  };

  if (timeline.length === 0) {
    addAreaInterval("Aguardando primeiro atendimento", openedAt, endpoint);
  } else {
    const firstAt = parseSlaDate(timeline[0].dataTramite);
    addAreaInterval("Aguardando primeiro atendimento", openedAt, firstAt);

    for (let index = 0; index < timeline.length - 1; index += 1) {
      const current = timeline[index];
      const next = timeline[index + 1];
      const currentAt = parseSlaDate(current.dataTramite);
      const nextAt = parseSlaDate(next.dataTramite);
      const currentArea = tramiteArea(current);
      const nextArea = tramiteArea(next);
      const intervalHours = elapsedHours(currentAt, nextAt);
      addAreaInterval(currentArea, currentAt, nextAt);

      if (normalizeTicketText(currentArea) !== normalizeTicketText(nextArea)) {
        transfers.push({
          fromArea: currentArea,
          toArea: nextArea,
          transferredAt: next.dataTramite,
          waitHours: intervalHours,
          activity: next.atividade,
          responsible: next.responsavel,
        });
      }
    }

    const last = timeline[timeline.length - 1];
    addAreaInterval(tramiteArea(last), parseSlaDate(last.dataTramite), endpoint);
  }

  const areaTimes = [...areaTotals.entries()]
    .map(([area, value]) => ({ area, ...value }))
    .sort((left, right) => right.hours - left.hours || left.area.localeCompare(right.area, "pt-BR"));
  const longestTransfer = transfers.reduce<TicketAreaTransfer | null>((longest, transfer) => {
    if (transfer.waitHours === null) return longest;
    return !longest || longest.waitHours === null || transfer.waitHours > longest.waitHours
      ? transfer
      : longest;
  }, null);

  return {
    areaTimes,
    transfers,
    bottleneck: areaTimes[0] || null,
    longestTransfer,
    totalTrackedHours: areaTimes.reduce((total, area) => total + area.hours, 0),
  };
}
