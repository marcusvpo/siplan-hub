import type { Chamado0800, ChamadoTramite } from "@/hooks/useChamados0800";
import { isTicketCompleted, normalizeTicketText } from "@/lib/tickets-ai-analytics";

const HOUR_MS = 60 * 60 * 1000;

export type TicketSlaClassification = "within" | "outside" | "inProgress" | "unavailable";
export type SlaCheckpointStatus = "met" | "breached" | "pending" | "paused" | "unavailable";

export interface SlaCheckpointState {
  deadline: Date | null;
  completedAt: Date | null;
  status: SlaCheckpointStatus;
}

export interface SlaCheckpointDisplay {
  label: "No prazo" | "Fora do SLA" | "Aguardando" | "Em curso" | "Pausado" | "Sem SLA";
  className: string;
  classification: TicketSlaClassification;
}

export interface ResolutionSlaState {
  hours: number | null;
  label: "Dentro do SLA" | "Fora do SLA" | "Retorno fora do SLA" | "Aguardando retorno" | "SLA em curso" | "SLA vencido" | "SLA pausado" | "Sem SLA na origem" | "Sem datas";
  className: string;
  classification: TicketSlaClassification;
  phase: "firstResponse" | "resolution" | "paused" | "completed" | "unavailable";
  phaseLabel: string;
  activeDeadline: Date | null;
  firstResponse: SlaCheckpointState;
  resolution: SlaCheckpointState;
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

export type TicketAreaStageOutcome =
  | "handedOffBeforeDeadline"
  | "handedOffAfterDeadline"
  | "resolvedWithin"
  | "resolvedOutside"
  | "activeWithin"
  | "activeOutside"
  | "activePaused"
  | "unavailable";

export interface TicketAreaStage {
  area: string;
  startedAt: Date | null;
  endedAt: Date | null;
  hours: number | null;
  endKind: "transfer" | "completion" | "current";
  outcome: TicketAreaStageOutcome;
  firstResponseStatus: "met" | "breached" | null;
}

export interface TicketFlowAnalysis {
  areaTimes: TicketAreaTime[];
  areaStages: TicketAreaStage[];
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

export function getSlaCheckpointDisplay(
  checkpoint: SlaCheckpointState,
  kind: "firstResponse" | "resolution",
): SlaCheckpointDisplay {
  if (checkpoint.status === "met") {
    return {
      label: "No prazo",
      className: "bg-emerald-100 text-emerald-700",
      classification: "within",
    };
  }
  if (checkpoint.status === "breached") {
    return {
      label: "Fora do SLA",
      className: "bg-rose-100 text-rose-700",
      classification: "outside",
    };
  }
  if (checkpoint.status === "paused") {
    return {
      label: "Pausado",
      className: "bg-violet-100 text-violet-700",
      classification: "inProgress",
    };
  }
  if (checkpoint.status === "pending") {
    return {
      label: kind === "firstResponse" ? "Aguardando" : "Em curso",
      className: "bg-blue-100 text-blue-700",
      classification: "inProgress",
    };
  }
  return {
    label: "Sem SLA",
    className: "bg-muted text-muted-foreground",
    classification: "unavailable",
  };
}

function getCheckpointState(
  deadlineValue?: string,
  completedValue?: string,
  now = new Date(),
  paused = false,
): SlaCheckpointState {
  const deadline = parseSlaDate(deadlineValue);
  const completedAt = parseSlaDate(completedValue);
  if (!deadline) return { deadline, completedAt, status: "unavailable" };
  if (completedAt) {
    return {
      deadline,
      completedAt,
      status: completedAt.getTime() <= deadline.getTime() ? "met" : "breached",
    };
  }
  if (paused) return { deadline, completedAt, status: "paused" };
  return {
    deadline,
    completedAt,
    status: now.getTime() <= deadline.getTime() ? "pending" : "breached",
  };
}

/**
 * Classifica o SLA exclusivamente pelos relógios oficiais do Ellevo.
 *
 * 1. Antes da primeira resposta, vale DataPrevistaPriResp.
 * 2. Depois da primeira resposta, vale SolVencimento.
 * 3. Transferir de equipe não pausa por inferência; somente o indicador
 *    VencimentoPausado congela o relógio na origem.
 */
export function getOfficialSlaState(
  chamado: Chamado0800,
  now = new Date(),
): ResolutionSlaState {
  const openedAt = parseSlaDate(chamado.abertoEm || chamado.dataAbertura);
  const closed = isTicketCompleted(chamado);
  const closedAt = parseSlaDate(
    chamado.encerradoEm || chamado.dataEncerramento,
    !chamado.encerradoEm,
  );
  const hours = elapsedHours(openedAt, closed ? closedAt : now);
  const firstResponse = getCheckpointState(
    chamado.slaPrimeiraRespostaPrevistaEm,
    chamado.slaPrimeiraRespostaRealEm,
    now,
  );
  const resolution = getCheckpointState(
    chamado.slaVencimentoEm,
    closed ? chamado.encerradoEm || chamado.dataEncerramento : undefined,
    now,
    !closed && chamado.slaVencimentoPausado === true,
  );

  if (hours === null) {
    return {
      hours,
      label: "Sem datas",
      className: "bg-muted text-muted-foreground",
      classification: "unavailable",
      phase: "unavailable",
      phaseLabel: "Datas indisponíveis",
      activeDeadline: null,
      firstResponse,
      resolution,
    };
  }

  const waitingFirstResponse = !firstResponse.completedAt && !closed;
  if (waitingFirstResponse) {
    if (firstResponse.status === "breached") {
      return {
        hours,
        label: "Retorno fora do SLA",
        className: "bg-rose-100 text-rose-700",
        classification: "outside",
        phase: "firstResponse",
        phaseLabel: "Aguardando primeiro retorno",
        activeDeadline: firstResponse.deadline,
        firstResponse,
        resolution,
      };
    }
    if (firstResponse.status === "pending") {
      return {
        hours,
        label: "Aguardando retorno",
        className: "bg-blue-100 text-blue-700",
        classification: "inProgress",
        phase: "firstResponse",
        phaseLabel: "Aguardando primeiro retorno",
        activeDeadline: firstResponse.deadline,
        firstResponse,
        resolution,
      };
    }
  }

  if (firstResponse.status === "breached") {
    return {
      hours,
      label: "Retorno fora do SLA",
      className: "bg-rose-100 text-rose-700",
      classification: "outside",
      phase: closed ? "completed" : "resolution",
      phaseLabel: closed ? "Concluído" : "Em atendimento",
      activeDeadline: resolution.deadline,
      firstResponse,
      resolution,
    };
  }

  if (resolution.status === "paused") {
    return {
      hours,
      label: "SLA pausado",
      className: "bg-violet-100 text-violet-700",
      classification: "inProgress",
      phase: "paused",
      phaseLabel: "Vencimento pausado no Ellevo",
      activeDeadline: resolution.deadline,
      firstResponse,
      resolution,
    };
  }

  if (resolution.status === "breached") {
    return {
      hours,
      label: closed ? "Fora do SLA" : "SLA vencido",
      className: "bg-rose-100 text-rose-700",
      classification: "outside",
      phase: closed ? "completed" : "resolution",
      phaseLabel: closed ? "Concluído" : "Em atendimento",
      activeDeadline: resolution.deadline,
      firstResponse,
      resolution,
    };
  }

  if (closed && resolution.status === "met") {
    return {
      hours,
      label: "Dentro do SLA",
      className: "bg-emerald-100 text-emerald-700",
      classification: "within",
      phase: "completed",
      phaseLabel: "Concluído",
      activeDeadline: resolution.deadline,
      firstResponse,
      resolution,
    };
  }

  if (!closed && resolution.status === "pending") {
    return {
      hours,
      label: "SLA em curso",
      className: "bg-blue-100 text-blue-700",
      classification: "inProgress",
      phase: "resolution",
      phaseLabel: "Em atendimento",
      activeDeadline: resolution.deadline,
      firstResponse,
      resolution,
    };
  }

  return {
    hours,
    label: "Sem SLA na origem",
    className: "bg-muted text-muted-foreground",
    classification: "unavailable",
    phase: "unavailable",
    phaseLabel: "SLA não configurado no Ellevo",
    activeDeadline: null,
    firstResponse,
    resolution,
  };
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
  const closed = isTicketCompleted(chamado);
  const closedAt = parseSlaDate(
    chamado.encerradoEm || chamado.dataEncerramento,
    !chamado.encerradoEm,
  );
  const endpoint = closed && closedAt ? closedAt : now;
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
  const sla = getOfficialSlaState(chamado, now);
  const rawStages: Array<Omit<TicketAreaStage, "outcome" | "firstResponseStatus">> = [];

  if (timeline.length === 0) {
    rawStages.push({
      area: chamado.equipeResponsavel?.trim() || "Área não informada",
      startedAt: openedAt,
      endedAt: endpoint,
      hours: elapsedHours(openedAt, endpoint),
      endKind: closed ? "completion" : "current",
    });
  } else {
    let currentArea = tramiteArea(timeline[0]);
    let stageStartedAt = openedAt || parseSlaDate(timeline[0].dataTramite);

    for (let index = 1; index < timeline.length; index += 1) {
      const next = timeline[index];
      const nextArea = tramiteArea(next);
      if (normalizeTicketText(currentArea) === normalizeTicketText(nextArea)) continue;
      const transferredAt = parseSlaDate(next.dataTramite);
      rawStages.push({
        area: currentArea,
        startedAt: stageStartedAt,
        endedAt: transferredAt,
        hours: elapsedHours(stageStartedAt, transferredAt),
        endKind: "transfer",
      });
      currentArea = nextArea;
      stageStartedAt = transferredAt;
    }

    rawStages.push({
      area: currentArea,
      startedAt: stageStartedAt,
      endedAt: endpoint,
      hours: elapsedHours(stageStartedAt, endpoint),
      endKind: closed ? "completion" : "current",
    });
  }

  const areaStages = rawStages.map((stage, index): TicketAreaStage => {
    let outcome: TicketAreaStageOutcome = "unavailable";
    if (stage.endKind === "transfer" && stage.endedAt && sla.resolution.deadline) {
      outcome = stage.endedAt.getTime() <= sla.resolution.deadline.getTime()
        ? "handedOffBeforeDeadline"
        : "handedOffAfterDeadline";
    } else if (stage.endKind === "completion") {
      if (sla.resolution.status === "met") outcome = "resolvedWithin";
      if (sla.resolution.status === "breached") outcome = "resolvedOutside";
    } else if (stage.endKind === "current") {
      if (sla.resolution.status === "pending") outcome = "activeWithin";
      if (sla.resolution.status === "breached") outcome = "activeOutside";
      if (sla.resolution.status === "paused") outcome = "activePaused";
    }

    const firstResponseAt = sla.firstResponse.completedAt;
    const isLastStage = index === rawStages.length - 1;
    const containsFirstResponse = Boolean(
      firstResponseAt &&
      stage.startedAt &&
      stage.endedAt &&
      firstResponseAt.getTime() >= stage.startedAt.getTime() &&
      (firstResponseAt.getTime() < stage.endedAt.getTime() || (
        isLastStage && firstResponseAt.getTime() <= stage.endedAt.getTime()
      )),
    );

    return {
      ...stage,
      outcome,
      firstResponseStatus: containsFirstResponse && (
        sla.firstResponse.status === "met" || sla.firstResponse.status === "breached"
      ) ? sla.firstResponse.status : null,
    };
  });

  return {
    areaTimes,
    areaStages,
    transfers,
    bottleneck: areaTimes[0] || null,
    longestTransfer,
    totalTrackedHours: areaTimes.reduce((total, area) => total + area.hours, 0),
  };
}
