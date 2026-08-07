import type { Chamado0800, ChamadoReportRow } from "@/hooks/useChamados0800";
import { formatOrionProductLabel } from "@/lib/chamados-product-filter";

export interface TicketsAnalyticsItem {
  name: string;
  total: number;
}

export interface TicketsMonthlyFlow {
  month: string;
  opened: number;
  closed: number;
}

export interface TicketsAiAnalytics {
  total: number;
  completed: number;
  open: number;
  bugLike: number;
  bugCompleted: number;
  bugOpen: number;
  bugResolutionRate: number;
  clients: number;
  completionRate: number;
  averageResolutionDays: number | null;
  averageOpenDays: number | null;
  openOver30Days: number;
  openOver60Days: number;
  byStatus: TicketsAnalyticsItem[];
  byNature: TicketsAnalyticsItem[];
  byClient: TicketsAnalyticsItem[];
  byProduct: TicketsAnalyticsItem[];
  aging: TicketsAnalyticsItem[];
  monthlyFlow: TicketsMonthlyFlow[];
  oldestOpen: ChamadoReportRow[];
}

export const normalizeTicketText = (value?: string): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const isTicketCompleted = (row: Chamado0800): boolean =>
  normalizeTicketText(row.status).includes("concluido");

export const isTicketBugLike = (row: Chamado0800): boolean =>
  /(bug|erro|falha|reclamacao|incidente)/.test(normalizeTicketText(row.natureza));

export const ticketDaysBetween = (start?: string, end?: string): number | null => {
  if (!start || !end) return null;
  const difference = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(difference)
    ? Math.max(0, Math.round(difference / 86_400_000))
    : null;
};

export const ticketDaysOpen = (start?: string): number => {
  if (!start) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(start).getTime()) / 86_400_000));
};

function countBy(rows: Chamado0800[], selector: (row: Chamado0800) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = selector(row).trim() || "Não informado";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((left, right) =>
      right.total - left.total || left.name.localeCompare(right.name, "pt-BR")
    );
}

export function buildTicketsAiAnalytics(rows: ChamadoReportRow[]): TicketsAiAnalytics {
  const completed = rows.filter(isTicketCompleted);
  const open = rows.filter((row) => !isTicketCompleted(row));
  const bugLike = rows.filter(isTicketBugLike);
  const bugCompleted = bugLike.filter(isTicketCompleted);
  const openDays = open.map((row) => ticketDaysOpen(row.dataAbertura));
  const resolutionDays = completed
    .map((row) => ticketDaysBetween(row.dataAbertura, row.dataEncerramento))
    .filter((value): value is number => value !== null);

  const monthly = new Map<string, { opened: number; closed: number }>();
  for (const row of rows) {
    const openedMonth = row.dataAbertura?.slice(0, 7);
    if (openedMonth) {
      const item = monthly.get(openedMonth) ?? { opened: 0, closed: 0 };
      item.opened += 1;
      monthly.set(openedMonth, item);
    }
    const closedMonth = row.dataEncerramento?.slice(0, 7);
    if (closedMonth) {
      const item = monthly.get(closedMonth) ?? { opened: 0, closed: 0 };
      item.closed += 1;
      monthly.set(closedMonth, item);
    }
  }

  const agingBuckets = [
    { name: "0 a 7 dias", total: 0 },
    { name: "8 a 15 dias", total: 0 },
    { name: "16 a 30 dias", total: 0 },
    { name: "31 a 60 dias", total: 0 },
    { name: "Mais de 60 dias", total: 0 },
  ];
  for (const days of openDays) {
    const index = days <= 7 ? 0 : days <= 15 ? 1 : days <= 30 ? 2 : days <= 60 ? 3 : 4;
    agingBuckets[index].total += 1;
  }

  return {
    total: rows.length,
    completed: completed.length,
    open: open.length,
    bugLike: bugLike.length,
    bugCompleted: bugCompleted.length,
    bugOpen: bugLike.length - bugCompleted.length,
    bugResolutionRate: bugLike.length
      ? Math.round((bugCompleted.length / bugLike.length) * 100)
      : 0,
    clients: new Set(rows.map((row) => row.nomeCliente).filter(Boolean)).size,
    completionRate: rows.length ? Math.round((completed.length / rows.length) * 100) : 0,
    averageResolutionDays: resolutionDays.length
      ? Math.round(resolutionDays.reduce((sum, value) => sum + value, 0) / resolutionDays.length)
      : null,
    averageOpenDays: openDays.length
      ? Math.round(openDays.reduce((sum, value) => sum + value, 0) / openDays.length)
      : null,
    openOver30Days: openDays.filter((days) => days > 30).length,
    openOver60Days: openDays.filter((days) => days > 60).length,
    byStatus: countBy(rows, (row) => row.status || "Não informado"),
    byNature: countBy(rows, (row) => row.natureza || "Não informado"),
    byClient: countBy(rows, (row) => row.nomeCliente || "Não informado"),
    byProduct: countBy(rows, (row) =>
      formatOrionProductLabel(row.software || row.produto)
    ),
    aging: agingBuckets,
    monthlyFlow: [...monthly.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, values]) => ({
        month: month.split("-").reverse().join("/"),
        ...values,
      })),
    oldestOpen: [...open]
      .sort((left, right) => ticketDaysOpen(right.dataAbertura) - ticketDaysOpen(left.dataAbertura))
      .slice(0, 8),
  };
}
