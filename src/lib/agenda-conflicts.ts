import { format, addDays, isAfter, startOfDay } from "date-fns";
import type { Vacation } from "@/hooks/useVacations";
import {
  getWeekdayHolidaysInRange,
  type WeekdayHoliday,
} from "@/lib/calendar-holidays";
import { normalizeText } from "@/lib/project-calendar-events";

export interface ScheduleConflictCheckInput {
  userId?: string;
  userName: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (para modo lote / bulk)
  vacations: Vacation[];
  includeWeekendsAndHolidays?: boolean;
}

export interface ScheduleConflictResult {
  hasConflict: boolean;
  hasVacationConflict: boolean;
  vacationConflicts: Vacation[];
  hasHolidayConflict: boolean;
  holidayConflicts: WeekdayHoliday[];
  hasWeekendConflict: boolean;
  weekendDates: string[];
  effectiveDates: string[]; // Datas válidas que serão agendadas
  warningMessage?: string;
}

/**
 * Validação preventiva de conflitos na agenda de analistas.
 * Identifica sobreposição com períodos de férias, feriados forenses/nacionais e finais de semana.
 */
export function validateScheduleConflicts({
  userId,
  userName,
  startDate,
  endDate,
  vacations,
  includeWeekendsAndHolidays = false,
}: ScheduleConflictCheckInput): ScheduleConflictResult {
  const normUser = normalizeText(userName);
  const startStr = startDate.trim().slice(0, 10);
  const endStr = (endDate || startDate).trim().slice(0, 10);

  // 1. Gera todos os dias do intervalo com proteção contra fuso horário (T12:00:00)
  const allDays: string[] = [];
  let cur = startOfDay(new Date(`${startStr}T12:00:00`));
  const end = startOfDay(new Date(`${endStr}T12:00:00`));

  while (!isAfter(cur, end)) {
    allDays.push(format(cur, "yyyy-MM-dd"));
    cur = addDays(cur, 1);
  }

  // 2. Conflito com Férias (overlap: v.start_date <= endStr && v.end_date >= startStr)
  const vacationConflicts = vacations.filter((v) => {
    const vStart = v.start_date.slice(0, 10);
    const vEnd = v.end_date.slice(0, 10);

    const matchesId = userId && v.implantador_id === userId;
    const matchesName = normalizeText(v.implantador_name) === normUser;
    if (!matchesId && !matchesName) return false;

    return vStart <= endStr && vEnd >= startStr;
  });

  // 3. Conflito com Feriados úteis
  const holidayConflicts = getWeekdayHolidaysInRange(startStr, endStr);

  // 4. Detecção de Fins de Semana
  const weekendDates: string[] = [];
  allDays.forEach((dayStr) => {
    const d = new Date(`${dayStr}T12:00:00`);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDates.push(dayStr);
    }
  });

  // 5. Determina quais dias serão agendados efetivamente
  const holidayDateSet = new Set(holidayConflicts.map((h) => h.date));
  const weekendDateSet = new Set(weekendDates);

  const effectiveDates = allDays.filter((d) => {
    if (includeWeekendsAndHolidays) return true;
    if (weekendDateSet.has(d)) return false;
    if (holidayDateSet.has(d)) return false;
    return true;
  });

  const hasVacationConflict = vacationConflicts.length > 0;
  const hasHolidayConflict = holidayConflicts.length > 0;
  const hasWeekendConflict = weekendDates.length > 0;
  const hasConflict = hasVacationConflict || hasHolidayConflict;

  const warnings: string[] = [];
  if (hasVacationConflict) {
    const v = vacationConflicts[0];
    warnings.push(
      `O analista ${userName} está em férias de ${v.start_date} a ${v.end_date}${
        v.description ? ` (${v.description})` : ""
      }.`
    );
  }
  if (hasHolidayConflict) {
    const names = holidayConflicts.map((h) => `${h.name} (${h.shortDate})`).join(", ");
    warnings.push(`O período coincide com feriado(s): ${names}.`);
  }
  if (hasWeekendConflict && !includeWeekendsAndHolidays) {
    warnings.push(`${weekendDates.length} dia(s) de fim de semana serão ignorados no agendamento em lote.`);
  }

  return {
    hasConflict,
    hasVacationConflict,
    vacationConflicts,
    hasHolidayConflict,
    holidayConflicts,
    hasWeekendConflict,
    weekendDates,
    effectiveDates,
    warningMessage: warnings.join(" "),
  };
}
