import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import { isTicketCompleted } from "@/lib/tickets-ai-analytics";

const HOUR_MS = 60 * 60 * 1000;

export interface ResolutionSlaState {
  hours: number | null;
  label: "Dentro do SLA" | "Fora do SLA" | "SLA em curso" | "SLA estourado" | "Sem datas";
  className: string;
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
