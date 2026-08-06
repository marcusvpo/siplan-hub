export const CHAMADOS_DEFAULT_RANGE_DAYS = 30;

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultChamadosDateRange(now = new Date()): {
  startDate: string;
  endDate: string;
} {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - (CHAMADOS_DEFAULT_RANGE_DAYS - 1));
  return { startDate: toLocalIsoDate(start), endDate: toLocalIsoDate(end) };
}

export function needsHistoricalChamadosSync(
  startDate: string,
  endDate: string,
  defaultRange: { startDate: string; endDate: string }
): boolean {
  if (!startDate || !endDate || startDate > endDate) return false;
  return startDate < defaultRange.startDate || endDate > defaultRange.endDate;
}
