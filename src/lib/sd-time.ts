import { addDays, format, startOfWeek } from "date-fns";

export const SD_DAILY_TARGET_MINUTES = 8 * 60;

export interface SdTimeIntervalLike {
  started_at: string;
  ended_at: string | null;
}

export interface SdTimeEntryLike {
  work_date: string;
  intervals: SdTimeIntervalLike[];
}

export function timeToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function intervalMinutes(interval: SdTimeIntervalLike) {
  const start = timeToMinutes(interval.started_at);
  const end = timeToMinutes(interval.ended_at);
  if (start === null || end === null || end <= start) return 0;
  return end - start;
}

export function entryMinutes(entry: Pick<SdTimeEntryLike, "intervals">) {
  return entry.intervals.reduce((total, interval) => total + intervalMinutes(interval), 0);
}

export function entryStartMinutes(entry: Pick<SdTimeEntryLike, "intervals">) {
  const starts = entry.intervals
    .map((interval) => timeToMinutes(interval.started_at))
    .filter((minutes): minutes is number => minutes !== null);
  return starts.length ? Math.min(...starts) : -1;
}

export function totalMinutes(entries: Array<Pick<SdTimeEntryLike, "intervals">>) {
  return entries.reduce((total, entry) => total + entryMinutes(entry), 0);
}

export function formatMinutes(value: number) {
  const safeValue = Math.max(0, Math.round(value));
  const hours = Math.floor(safeValue / 60);
  const minutes = safeValue % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

export function getWeekDays(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getWeekRange(date: Date) {
  const days = getWeekDays(date);
  return {
    start: format(days[0], "yyyy-MM-dd"),
    end: format(days[6], "yyyy-MM-dd"),
    days,
  };
}

export function totalsByDate(entries: SdTimeEntryLike[]) {
  return entries.reduce<Record<string, number>>((totals, entry) => {
    totals[entry.work_date] = (totals[entry.work_date] ?? 0) + entryMinutes(entry);
    return totals;
  }, {});
}

export function intervalsOverlap(intervals: Array<{ start: string; end: string }>) {
  const completed = intervals
    .map((interval) => ({
      start: timeToMinutes(interval.start),
      end: timeToMinutes(interval.end),
    }))
    .filter(
      (interval): interval is { start: number; end: number } =>
        interval.start !== null && interval.end !== null,
    )
    .sort((first, second) => first.start - second.start);

  return completed.some((interval, index) => {
    const previous = completed[index - 1];
    return previous ? interval.start < previous.end : false;
  });
}
