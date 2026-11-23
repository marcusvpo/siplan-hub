import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  GlobalStatus,
  ImplementationPhase,
  ImplementationStageV2,
  PostStageV2,
  StageStatus,
} from "@/types/ProjectV2";

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Converte uma chave `YYYY-MM-DD` em `Date` ancorada ao meio-dia UTC (`T12:00:00.000Z`),
 * evitando qualquer deslocamento de dia entre UTC e fusos locais (ex: America/Sao_Paulo UTC-3).
 */
export function dateFromDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

/**
 * Extrai a chave de data local (`YYYY-MM-DD`) sem desvio de fuso horário.
 * Strings no formato date-only (`YYYY-MM-DD`) preservam o dia exato informado;
 * objetos Date e timestamps ISO usam os componentes do calendário local.
 */
export function toLocalDateKey(
  value: Date | string | null | undefined
): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const dateOnlyMatch = DATE_ONLY_REGEX.exec(trimmed);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]);
      const day = Number(dateOnlyMatch[3]);
      const probe = new Date(year, month - 1, day);
      if (
        probe.getFullYear() === year &&
        probe.getMonth() === month - 1 &&
        probe.getDate() === day
      ) {
        return trimmed;
      }
      return null;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatLocalDateParts(parsed);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatLocalDateParts(value);
  }

  return null;
}

function formatLocalDateParts(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Valida se a data possui ano civil plausível para agendamento/automação (`minYear..maxYear`).
 * Impede que anos parciais digitados no input (ex.: `0002-12-14`) disparem automações.
 */
export function isValidCalendarYearDateKey(
  value: Date | string | null | undefined,
  minYear = 1900,
  maxYear = 2099
): boolean {
  const key = toLocalDateKey(value);
  if (!key) return false;
  const year = Number(key.slice(0, 4));
  return Number.isInteger(year) && year >= minYear && year <= maxYear;
}

function parseDateKeyToLocalNoon(dateKey: string): Date | null {
  const match = DATE_ONLY_REGEX.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

function isWeekendLocal(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

/**
 * Retorna a chave `YYYY-MM-DD` do próximo dia útil (segunda a sexta-feira)
 * estritamente após a data informada.
 * Exemplo: sexta `2026-11-13` -> segunda `2026-11-16`.
 */
export function getNextBusinessDayKey(
  value: Date | string | null | undefined
): string | null {
  const key = toLocalDateKey(value);
  if (!key) return null;
  const cursor = parseDateKeyToLocalNoon(key);
  if (!cursor) return null;

  cursor.setDate(cursor.getDate() + 1);
  while (isWeekendLocal(cursor)) {
    cursor.setDate(cursor.getDate() + 1);
  }
  return formatLocalDateParts(cursor);
}

/**
 * Soma `businessDaysToAdd` dias úteis (segunda a sexta-feira) a partir da data inicial.
 * Para 2 semanas completas de dias úteis (10 dias úteis contando o dia inicial como 1º dia),
 * utiliza-se `businessDaysToAdd = 9`.
 * Exemplo: segunda `2026-11-16` + 9 dias úteis -> sexta `2026-11-27`.
 */
export function addBusinessDaysKey(
  startValue: Date | string | null | undefined,
  businessDaysToAdd: number
): string | null {
  const key = toLocalDateKey(startValue);
  if (!key) return null;
  const cursor = parseDateKeyToLocalNoon(key);
  if (!cursor) return null;

  while (isWeekendLocal(cursor)) {
    cursor.setDate(cursor.getDate() + 1);
  }

  let remaining = Math.max(0, Math.trunc(businessDaysToAdd));
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekendLocal(cursor)) {
      remaining -= 1;
    }
  }

  return formatLocalDateParts(cursor);
}

export interface PostImplantationSchedule {
  startDateKey: string;
  endDateKey: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Calcula o período padrão de Pós-Implantação (2 semanas contabilizando apenas dias úteis = 10 dias úteis)
 * a partir da data de Término da Fase 1.
 * Exemplo: Término Fase 1 em `13/11/2026` -> Início Pós `16/11/2026` e Término Pós `27/11/2026`.
 */
export function calculatePostImplantationSchedule(
  implementationEndDate: Date | string | null | undefined
): PostImplantationSchedule | null {
  const startDateKey = getNextBusinessDayKey(implementationEndDate);
  if (!startDateKey) return null;
  const endDateKey = addBusinessDaysKey(startDateKey, 9);
  if (!endDateKey) return null;

  return {
    startDateKey,
    endDateKey,
    startDate: dateFromDateKey(startDateKey),
    endDate: dateFromDateKey(endDateKey),
  };
}

export interface ShouldAutoStartPhase1Params {
  isConfirmed?: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status?: StageStatus | string | null;
  globalStatus?: GlobalStatus | string | null;
  now?: Date;
}

/**
 * Verifica se a Fase 1 deve iniciar automaticamente ("in-progress")
 * quando confirmada e dentro da janela vigente antes do dia final (`startDay <= todayDay < endDay`).
 */
export function shouldAutoStartPhase1({
  isConfirmed,
  startDate,
  endDate,
  status,
  globalStatus,
  now = new Date(),
}: ShouldAutoStartPhase1Params): boolean {
  if (
    globalStatus === "blocked" ||
    globalStatus === "done" ||
    globalStatus === "archived"
  ) {
    return false;
  }

  if (isConfirmed !== true) {
    return false;
  }

  const normalizedStatus = status || "todo";
  if (normalizedStatus !== "todo") {
    return false;
  }

  const startDay = toLocalDateKey(startDate);
  const todayDay = toLocalDateKey(now);
  if (
    !startDay ||
    !todayDay ||
    !isValidCalendarYearDateKey(startDay) ||
    !isValidCalendarYearDateKey(todayDay)
  ) {
    return false;
  }

  if (startDay > todayDay) {
    return false;
  }

  if (endDate) {
    const endDay = toLocalDateKey(endDate);
    if (!endDay || !isValidCalendarYearDateKey(endDay)) {
      return false;
    }
    if (endDay <= todayDay) {
      return false;
    }
  }

  return true;
}

export interface ShouldAutoFinishPhase1Params {
  isConfirmed?: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status?: StageStatus | string | null;
  stageStatus?: StageStatus | string | null;
  globalStatus?: GlobalStatus | string | null;
  systemType?: string | null;
  now?: Date;
}

/**
 * Verifica se a Fase 1 e a Etapa 5 ("Implantação & Treinamento") devem ser
 * automaticamente finalizadas ("done") quando a data atual atinge ou ultrapassa
 * o campo "Término" da Fase 1 (ex: sexta-feira = data final da implantação).
 */
export function shouldAutoFinishPhase1({
  isConfirmed,
  startDate,
  endDate,
  status,
  stageStatus,
  globalStatus,
  systemType,
  now = new Date(),
}: ShouldAutoFinishPhase1Params): boolean {
  if (
    globalStatus === "blocked" ||
    globalStatus === "done" ||
    globalStatus === "archived"
  ) {
    return false;
  }

  if ((systemType || "").trim() === "Modelos TN") {
    return false;
  }

  const normPhaseStatus = status || "todo";
  const normStageStatus = stageStatus || "todo";
  if (normPhaseStatus === "done" && normStageStatus === "done") {
    return false;
  }

  if (
    isConfirmed !== true &&
    normPhaseStatus !== "in-progress" &&
    normStageStatus !== "in-progress"
  ) {
    return false;
  }

  const startDay = toLocalDateKey(startDate);
  const endDay = toLocalDateKey(endDate);
  const todayDay = toLocalDateKey(now);
  if (
    !startDay ||
    !endDay ||
    !todayDay ||
    !isValidCalendarYearDateKey(startDay) ||
    !isValidCalendarYearDateKey(endDay) ||
    !isValidCalendarYearDateKey(todayDay)
  ) {
    return false;
  }

  return endDay <= todayDay;
}

/**
 * Verifica se a Fase 2 ("Possível Retorno") deve iniciar automaticamente (`in-progress`)
 * quando confirmada e dentro da janela vigente (`startDate <= hoje < endDate`).
 */
export function shouldAutoStartPhase2(
  params: ShouldAutoStartPhase1Params
): boolean {
  return shouldAutoStartPhase1(params);
}

/**
 * Verifica se a Fase 2 ("Possível Retorno") deve ser finalizada automaticamente (`done`)
 * quando o período agendado e confirmado atinge ou ultrapassa a data de término (`endDate <= hoje`).
 */
export function shouldAutoFinishPhase2(
  params: Omit<ShouldAutoFinishPhase1Params, "stageStatus">
): boolean {
  return shouldAutoFinishPhase1({
    ...params,
    stageStatus: params.status,
  });
}

/**
 * Formata o timestamp de confirmação da Fase 1 em PT-BR (`dd/MM/yyyy 'às' HH:mm`).
 * Retorna string vazia se ausente ou inválido.
 */
export function formatConfirmationTimestamp(
  confirmedAt: Date | string | null | undefined
): string {
  if (!confirmedAt) return "";
  const parsed =
    confirmedAt instanceof Date ? confirmedAt : new Date(confirmedAt);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export interface ApplyPhase1UpdatesParams {
  currentStage?: Partial<ImplementationStageV2> | null;
  phaseUpdates: Partial<ImplementationPhase>;
  globalStatus?: GlobalStatus | string | null;
  systemType?: string | null;
  now?: Date;
}

interface ResolvePhaseUpdatesResult {
  nextPhase: ImplementationPhase;
  autoTransitionedTo?: "in-progress" | "done";
}

function resolvePhaseUpdatesWithAutomation({
  currentPhase,
  phaseUpdates,
  currentParentStageStatus,
  globalStatus,
  systemType,
  now,
}: {
  currentPhase?: Partial<ImplementationPhase> | null;
  phaseUpdates: Partial<ImplementationPhase>;
  currentParentStageStatus?: StageStatus;
  globalStatus?: GlobalStatus | string | null;
  systemType?: string | null;
  now: Date;
}): ResolvePhaseUpdatesResult {
  const basePhase: ImplementationPhase = {
    status: "todo",
    ...(currentPhase || {}),
  };

  const nextPhase: ImplementationPhase = {
    ...basePhase,
    ...phaseUpdates,
  };

  if (phaseUpdates.isConfirmed === true) {
    const wasConfirmed = Boolean(basePhase.isConfirmed);
    if (phaseUpdates.confirmedAt !== undefined) {
      nextPhase.confirmedAt = phaseUpdates.confirmedAt;
    } else if (!wasConfirmed || !basePhase.confirmedAt) {
      nextPhase.confirmedAt = now.toISOString();
    } else {
      nextPhase.confirmedAt = basePhase.confirmedAt;
    }
  } else if (phaseUpdates.isConfirmed === false) {
    nextPhase.confirmedAt = undefined;
  }

  let autoTransitionedTo: "in-progress" | "done" | undefined;

  if (phaseUpdates.status === undefined) {
    const effectiveStageStatus = currentParentStageStatus ?? nextPhase.status;
    if (
      shouldAutoFinishPhase1({
        isConfirmed: nextPhase.isConfirmed,
        startDate: nextPhase.startDate,
        endDate: nextPhase.endDate,
        status: nextPhase.status,
        stageStatus: effectiveStageStatus,
        globalStatus,
        systemType,
        now,
      })
    ) {
      nextPhase.status = "done";
      autoTransitionedTo = "done";
    } else if (
      shouldAutoStartPhase1({
        isConfirmed: nextPhase.isConfirmed,
        startDate: nextPhase.startDate,
        endDate: nextPhase.endDate,
        status: nextPhase.status,
        globalStatus,
        now,
      })
    ) {
      nextPhase.status = "in-progress";
      autoTransitionedTo = "in-progress";
    }
  }

  return { nextPhase, autoTransitionedTo };
}

/**
 * Aplica atualizações parciais na Fase 1 de Implantação garantindo:
 * - Registro/limpeza de `confirmedAt` ao alternar `isConfirmed`
 * - Auto-conclusão para `done` na data de término (`endDate <= hoje`)
 * - Auto-início para `in-progress` quando confirmada e vigente (`startDate <= hoje < endDate`)
 * - Sincronização de `status`, `responsible`, `startDate` e `endDate` com o estágio pai
 */
export function applyPhase1UpdatesWithAutomation({
  currentStage,
  phaseUpdates,
  globalStatus,
  systemType,
  now = new Date(),
}: ApplyPhase1UpdatesParams): ImplementationStageV2 {
  const { nextPhase: nextPhase1, autoTransitionedTo } =
    resolvePhaseUpdatesWithAutomation({
      currentPhase: currentStage?.phase1,
      phaseUpdates,
      currentParentStageStatus: currentStage?.status || "todo",
      globalStatus,
      systemType,
      now,
    });

  let stageStatus: StageStatus = currentStage?.status || "todo";
  if (phaseUpdates.status !== undefined) {
    stageStatus = phaseUpdates.status;
  } else if (autoTransitionedTo) {
    stageStatus = autoTransitionedTo;
  }

  const nextResponsible =
    phaseUpdates.responsible !== undefined
      ? phaseUpdates.responsible
      : nextPhase1.responsible ?? currentStage?.responsible;

  return {
    ...currentStage,
    status: stageStatus,
    responsible: nextResponsible,
    startDate: nextPhase1.startDate,
    endDate: nextPhase1.endDate,
    phase1: nextPhase1,
    phase2: currentStage?.phase2 || { status: "todo" },
  };
}

/**
 * Aplica atualizações parciais na Fase 2 ("Possível Retorno") com paridade de confirmação e automação de datas,
 * preservando integralmente os campos do estágio pai (`status`, `responsible`, `startDate`, `endDate`) e a Fase 1.
 */
export function applyPhase2UpdatesWithAutomation({
  currentStage,
  phaseUpdates,
  globalStatus,
  systemType,
  now = new Date(),
}: ApplyPhase1UpdatesParams): ImplementationStageV2 {
  const { nextPhase: nextPhase2 } = resolvePhaseUpdatesWithAutomation({
    currentPhase: currentStage?.phase2,
    phaseUpdates,
    globalStatus,
    systemType,
    now,
  });

  return {
    ...currentStage,
    status: currentStage?.status || "todo",
    phase1: currentStage?.phase1 || { status: "todo" },
    phase2: nextPhase2,
  };
}

export interface SyncPostStageParams {
  implementationStage?: Partial<ImplementationStageV2> | null;
  oldImplementationStage?: Partial<ImplementationStageV2> | null;
  currentPostStage?: Partial<PostStageV2> | null;
  globalStatus?: GlobalStatus | string | null;
  systemType?: string | null;
  now?: Date;
}

/**
 * Sincroniza automaticamente a etapa "Pós-Implantação" a partir do estado de "Implantação & Treinamento":
 * - Quando Implantação/Fase 1 está "done":
 *   1. Preenche automaticamente `startDate` (próximo dia útil após o Término da Fase 1)
 *      e `endDate` / `supportEndDate` (+9 dias úteis = 2 semanas úteis / 10 dias úteis).
 *   2. Altera `status` para `"in-progress"` automaticamente a partir do próximo dia útil (`hoje >= post.startDate`).
 * - Quando Implantação/Fase 1 é revertida manualmente de `"done"` para outro status enquanto Pós ainda está `"todo"`,
 *   limpa as datas pré-agendadas do Pós.
 */
export function syncPostStageFromImplementation({
  implementationStage,
  oldImplementationStage,
  currentPostStage,
  globalStatus,
  systemType,
  now = new Date(),
}: SyncPostStageParams): PostStageV2 {
  const basePost: PostStageV2 = {
    status: "todo",
    followupNeeded: false,
    ...(currentPostStage || {}),
  };

  if ((systemType || "").trim() === "Modelos TN") {
    return basePost;
  }

  if (
    globalStatus === "blocked" ||
    globalStatus === "done" ||
    globalStatus === "archived"
  ) {
    return basePost;
  }

  const wasDone =
    oldImplementationStage?.status === "done" ||
    oldImplementationStage?.phase1?.status === "done";
  const isDone =
    implementationStage?.status === "done" ||
    implementationStage?.phase1?.status === "done";

  if (wasDone && !isDone) {
    if ((basePost.status || "todo") === "todo") {
      return {
        ...basePost,
        startDate: undefined,
        endDate: undefined,
        supportEndDate: undefined,
      };
    }
    return basePost;
  }

  if (!isDone) {
    return basePost;
  }

  const nextPost: PostStageV2 = { ...basePost };
  const todayKey = toLocalDateKey(now);
  const rawNewEndKey =
    toLocalDateKey(implementationStage?.phase1?.endDate) ||
    toLocalDateKey(implementationStage?.endDate);
  const newEndKey = isValidCalendarYearDateKey(rawNewEndKey)
    ? rawNewEndKey
    : null;
  const rawOldEndKey =
    toLocalDateKey(oldImplementationStage?.phase1?.endDate) ||
    toLocalDateKey(oldImplementationStage?.endDate);
  const oldEndKey = isValidCalendarYearDateKey(rawOldEndKey)
    ? rawOldEndKey
    : null;

  const phase1EndChanged = Boolean(newEndKey && newEndKey !== oldEndKey);
  const refEndKey = newEndKey || (isValidCalendarYearDateKey(todayKey) ? todayKey : null);

  if (refEndKey) {
    const schedule = calculatePostImplantationSchedule(refEndKey);
    if (schedule) {
      if (
        !nextPost.startDate ||
        (phase1EndChanged && nextPost.status !== "done")
      ) {
        nextPost.startDate = schedule.startDate;
      }

      const effectiveStartKey =
        toLocalDateKey(nextPost.startDate) || schedule.startDateKey;

      if (
        !nextPost.endDate ||
        (phase1EndChanged && nextPost.status !== "done")
      ) {
        const computedEndKey = addBusinessDaysKey(effectiveStartKey, 9);
        if (computedEndKey) {
          nextPost.endDate = dateFromDateKey(computedEndKey);
        }
      }

      if (nextPost.endDate) {
        nextPost.supportEndDate =
          nextPost.endDate instanceof Date
            ? nextPost.endDate
            : new Date(nextPost.endDate);
      }

      if (
        (nextPost.status || "todo") === "todo" &&
        todayKey &&
        effectiveStartKey <= todayKey
      ) {
        nextPost.status = "in-progress";
      }
    }
  }

  return nextPost;
}
