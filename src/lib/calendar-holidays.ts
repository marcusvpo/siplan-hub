import { addDays, endOfDay, format, isAfter, isBefore, startOfDay } from "date-fns";

export interface WeekdayHoliday {
  /** Data no formato ISO YYYY-MM-DD */
  date: string;
  /** Nome oficial do feriado */
  name: string;
  /** Dia da semana por extenso (ex: "Segunda-feira", "Sexta-feira") */
  weekdayLabel: string;
  /** Dia da semana abreviado (ex: "Seg", "Ter", "Qua", "Qui", "Sex") */
  weekdayShort: string;
  /** Data curta formatada DD/MM */
  shortDate: string;
  /** Ano do feriado (2026 ou 2027) */
  year: number;
}

/**
 * Lista completa dos feriados nacionais e forenses de 2026 e 2027
 * que caem estritamente em dias de semana (Segunda a Sexta-feira).
 * Feriados que caem no Sábado ou Domingo foram excluídos conforme regra de negócio.
 */
export const WEEKDAY_HOLIDAYS_2026_2027: WeekdayHoliday[] = [
  // ==================== 2026 ====================
  {
    date: "2026-01-01",
    name: "Confraternização Universal (Ano Novo)",
    weekdayLabel: "Quinta-feira",
    weekdayShort: "Qui",
    shortDate: "01/01",
    year: 2026,
  },
  {
    date: "2026-02-16",
    name: "Carnaval (Segunda-feira)",
    weekdayLabel: "Segunda-feira",
    weekdayShort: "Seg",
    shortDate: "16/02",
    year: 2026,
  },
  {
    date: "2026-02-17",
    name: "Carnaval (Terça-feira)",
    weekdayLabel: "Terça-feira",
    weekdayShort: "Ter",
    shortDate: "17/02",
    year: 2026,
  },
  {
    date: "2026-04-03",
    name: "Paixão de Cristo (Sexta-feira Santa)",
    weekdayLabel: "Sexta-feira",
    weekdayShort: "Sex",
    shortDate: "03/04",
    year: 2026,
  },
  {
    date: "2026-04-21",
    name: "Tiradentes",
    weekdayLabel: "Terça-feira",
    weekdayShort: "Ter",
    shortDate: "21/04",
    year: 2026,
  },
  {
    date: "2026-05-01",
    name: "Dia do Trabalho",
    weekdayLabel: "Sexta-feira",
    weekdayShort: "Sex",
    shortDate: "01/05",
    year: 2026,
  },
  {
    date: "2026-06-04",
    name: "Corpus Christi",
    weekdayLabel: "Quinta-feira",
    weekdayShort: "Qui",
    shortDate: "04/06",
    year: 2026,
  },
  {
    date: "2026-09-07",
    name: "Independência do Brasil",
    weekdayLabel: "Segunda-feira",
    weekdayShort: "Seg",
    shortDate: "07/09",
    year: 2026,
  },
  {
    date: "2026-10-12",
    name: "Nossa Senhora Aparecida",
    weekdayLabel: "Segunda-feira",
    weekdayShort: "Seg",
    shortDate: "12/10",
    year: 2026,
  },
  {
    date: "2026-11-02",
    name: "Finados",
    weekdayLabel: "Segunda-feira",
    weekdayShort: "Seg",
    shortDate: "02/11",
    year: 2026,
  },
  {
    date: "2026-11-20",
    name: "Dia da Consciência Negra",
    weekdayLabel: "Sexta-feira",
    weekdayShort: "Sex",
    shortDate: "20/11",
    year: 2026,
  },
  {
    date: "2026-12-25",
    name: "Natal",
    weekdayLabel: "Sexta-feira",
    weekdayShort: "Sex",
    shortDate: "25/12",
    year: 2026,
  },

  // ==================== 2027 ====================
  {
    date: "2027-01-01",
    name: "Confraternização Universal (Ano Novo)",
    weekdayLabel: "Sexta-feira",
    weekdayShort: "Sex",
    shortDate: "01/01",
    year: 2027,
  },
  {
    date: "2027-02-08",
    name: "Carnaval (Segunda-feira)",
    weekdayLabel: "Segunda-feira",
    weekdayShort: "Seg",
    shortDate: "08/02",
    year: 2027,
  },
  {
    date: "2027-02-09",
    name: "Carnaval (Terça-feira)",
    weekdayLabel: "Terça-feira",
    weekdayShort: "Ter",
    shortDate: "09/02",
    year: 2027,
  },
  {
    date: "2027-03-26",
    name: "Paixão de Cristo (Sexta-feira Santa)",
    weekdayLabel: "Sexta-feira",
    weekdayShort: "Sex",
    shortDate: "26/03",
    year: 2027,
  },
  {
    date: "2027-04-21",
    name: "Tiradentes",
    weekdayLabel: "Quarta-feira",
    weekdayShort: "Qua",
    shortDate: "21/04",
    year: 2027,
  },
  {
    date: "2027-05-27",
    name: "Corpus Christi",
    weekdayLabel: "Quinta-feira",
    weekdayShort: "Qui",
    shortDate: "27/05",
    year: 2027,
  },
  {
    date: "2027-09-07",
    name: "Independência do Brasil",
    weekdayLabel: "Terça-feira",
    weekdayShort: "Ter",
    shortDate: "07/09",
    year: 2027,
  },
  {
    date: "2027-10-12",
    name: "Nossa Senhora Aparecida",
    weekdayLabel: "Terça-feira",
    weekdayShort: "Ter",
    shortDate: "12/10",
    year: 2027,
  },
  {
    date: "2027-11-02",
    name: "Finados",
    weekdayLabel: "Terça-feira",
    weekdayShort: "Ter",
    shortDate: "02/11",
    year: 2027,
  },
  {
    date: "2027-11-15",
    name: "Proclamação da República",
    weekdayLabel: "Segunda-feira",
    weekdayShort: "Seg",
    shortDate: "15/11",
    year: 2027,
  },
];

const HOLIDAY_BY_ISO_MAP = new Map<string, WeekdayHoliday>(
  WEEKDAY_HOLIDAYS_2026_2027.map((item) => [item.date, item])
);

/**
 * Retorna o feriado em dia útil correspondente à data informada (ou null).
 */
export function getWeekdayHoliday(date: Date | string | null | undefined): WeekdayHoliday | null {
  if (!date) return null;
  const iso =
    typeof date === "string"
      ? date.slice(0, 10)
      : format(date, "yyyy-MM-dd");
  return HOLIDAY_BY_ISO_MAP.get(iso) ?? null;
}

/**
 * Retorna todos os feriados em dia de semana dentro do intervalo [startDate, endDate] (inclusive).
 */
export function getWeekdayHolidaysInRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): WeekdayHoliday[] {
  if (!startDate && !endDate) return [];

  const toDate = (val: Date | string): Date => {
    if (val instanceof Date) return startOfDay(val);
    const trimmed = val.trim().slice(0, 10);
    return startOfDay(new Date(`${trimmed}T12:00:00`));
  };

  const rawStart = startDate ? toDate(startDate) : toDate(endDate!);
  const rawEnd = endDate ? toDate(endDate) : toDate(startDate!);

  if (Number.isNaN(rawStart.getTime()) || Number.isNaN(rawEnd.getTime())) {
    return [];
  }

  const start = isBefore(rawEnd, rawStart) ? rawEnd : rawStart;
  const end = endOfDay(isAfter(rawStart, rawEnd) ? rawStart : rawEnd);

  return WEEKDAY_HOLIDAYS_2026_2027.filter((holiday) => {
    const hDate = new Date(`${holiday.date}T12:00:00`);
    return !isBefore(hDate, start) && !isAfter(hDate, end);
  });
}

/**
 * Retorna todos os feriados em dias úteis (Segunda a Sexta) pertencentes à semana iniciada em `monday`.
 */
export function getWeekdayHolidaysForWeek(monday: Date): WeekdayHoliday[] {
  const friday = addDays(startOfDay(monday), 4);
  return getWeekdayHolidaysInRange(monday, friday);
}

/**
 * Formata um resumo curto dos feriados de uma semana para exibição em badges ou alertas.
 * Ex: "Seg 02/11 (Finados)" ou "Seg 16/02 + Ter 17/02 (Carnaval)"
 */
export function formatWeekHolidayBadge(holidays: WeekdayHoliday[]): string {
  if (holidays.length === 0) return "";
  if (holidays.length === 1) {
    const h = holidays[0];
    return `${h.weekdayShort} ${h.shortDate}`;
  }
  return holidays.map((h) => `${h.weekdayShort} ${h.shortDate}`).join(" + ");
}

/**
 * Formata a descrição completa dos feriados para tooltips e alertas de confirmação.
 */
export function formatHolidayAlertDescription(holidays: WeekdayHoliday[]): string {
  return holidays
    .map((h) => `${h.shortDate}/${h.year} (${h.weekdayLabel}) — ${h.name}`)
    .join("; ");
}
