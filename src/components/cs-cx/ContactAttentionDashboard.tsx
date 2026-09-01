import { useMemo, useState } from "react";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import {
  CalendarClock,
  ChartNoAxesCombined,
  CheckCircle2,
  ClockAlert,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CsCxRegistryOffice } from "@/hooks/useCsCxCore";
import type { CsCxContact } from "@/hooks/useCsCxEngagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type AttentionStatus = "never" | "critical" | "attention" | "monitor" | "current";
type AttentionFilter = "needs-attention" | "overdue-60" | "all" | AttentionStatus;

interface AttentionRow {
  office: CsCxRegistryOffice;
  lastContact: CsCxContact | null;
  daysWithoutContact: number | null;
  status: AttentionStatus;
}

interface ContactAttentionDashboardProps {
  contacts: CsCxContact[];
  offices: CsCxRegistryOffice[];
  canCreate: boolean;
  onFilterOffice: (officeId: string) => void;
  onRegisterContact: (officeId: string) => void;
}

const STATUS_META: Record<
  AttentionStatus,
  { label: string; shortLabel: string; className: string; barClassName: string }
> = {
  never: {
    label: "Sem contato registrado",
    shortLabel: "Sem contato",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
    barClassName: "bg-rose-500",
  },
  critical: {
    label: "90 dias ou mais",
    shortLabel: "90+ dias",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
    barClassName: "bg-orange-500",
  },
  attention: {
    label: "60 a 89 dias",
    shortLabel: "60–89 dias",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    barClassName: "bg-amber-500",
  },
  monitor: {
    label: "30 a 59 dias",
    shortLabel: "30–59 dias",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300",
    barClassName: "bg-yellow-400",
  },
  current: {
    label: "Menos de 30 dias",
    shortLabel: "Em dia",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    barClassName: "bg-emerald-500",
  },
};

export function ContactAttentionDashboard({
  contacts,
  offices,
  canCreate,
  onFilterOffice,
  onRegisterContact,
}: ContactAttentionDashboardProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AttentionFilter>("needs-attention");
  const rows = useMemo(
    () => buildContactAttentionRows(offices, contacts),
    [contacts, offices],
  );
  const counts = useMemo(
    () =>
      rows.reduce(
        (result, row) => {
          result[row.status] += 1;
          return result;
        },
        { never: 0, critical: 0, attention: 0, monitor: 0, current: 0 },
      ),
    [rows],
  );
  const needsAttention = counts.never + counts.critical + counts.attention + counts.monitor;
  const overdue60 = counts.critical + counts.attention;
  const visibleRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.office.name.toLocaleLowerCase("pt-BR").includes(term) ||
        officeResponsible(row.office).toLocaleLowerCase("pt-BR").includes(term);
      return matchesSearch && matchesAttentionFilter(row, filter);
    });
  }, [filter, rows, search]);

  const selectFilter = (nextFilter: AttentionFilter) => {
    setFilter(nextFilter);
    setSearch("");
  };

  const filterOffice = (officeId: string) => {
    onFilterOffice(officeId);
    setOpen(false);
  };

  const registerContact = (officeId: string) => {
    onRegisterContact(officeId);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2"
        aria-label={`Painel de atenção, ${needsAttention} ${needsAttention === 1 ? "cartório precisa" : "cartórios precisam"} de contato`}
        onClick={() => setOpen(true)}
      >
        <ChartNoAxesCombined className="h-4 w-4 text-rose-500" />
        Atenção
        {needsAttention > 0 && (
          <Badge className="h-5 min-w-5 justify-center rounded-full bg-rose-500 px-1.5 text-[10px] text-white hover:bg-rose-500">
            {needsAttention}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-3 overflow-hidden p-4 sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChartNoAxesCombined className="h-5 w-5 text-rose-500" />
              Cartórios que precisam de atenção
            </DialogTitle>
            <DialogDescription>
              Priorização dos cartórios ativos pelo tempo desde o último contato registrado.
              A atenção começa após 30 dias.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Precisam de atenção"
                value={needsAttention}
                helper="30 dias ou sem registro"
                icon={TriangleAlert}
                tone="rose"
                active={filter === "needs-attention"}
                onClick={() => selectFilter("needs-attention")}
              />
              <SummaryCard
                label="Nunca contatados"
                value={counts.never}
                helper="Sem histórico"
                icon={ClockAlert}
                tone="orange"
                active={filter === "never"}
                onClick={() => selectFilter("never")}
              />
              <SummaryCard
                label="60 dias ou mais"
                value={overdue60}
                helper="Contato prioritário"
                icon={CalendarClock}
                tone="amber"
                active={filter === "overdue-60"}
                onClick={() => selectFilter("overdue-60")}
              />
              <SummaryCard
                label="Em dia"
                value={counts.current}
                helper="Contato há menos de 30 dias"
                icon={CheckCircle2}
                tone="emerald"
                active={filter === "current"}
                onClick={() => selectFilter("current")}
              />
            </div>

            <Card>
              <CardContent className="p-2">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold">
                    Distribuição da carteira
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({rows.length} ativos)
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => selectFilter("all")}
                  >
                    Ver todos
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {(Object.keys(STATUS_META) as AttentionStatus[]).map((status) => {
                    const count = counts[status];
                    const percentage = rows.length ? Math.round((count / rows.length) * 100) : 0;
                    return (
                      <button
                        key={status}
                        type="button"
                        aria-label={`Filtrar por ${STATUS_META[status].label}: ${count}`}
                        className="space-y-1 rounded-md p-0.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        onClick={() => setFilter(filterForStatus(status))}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span className="font-medium">{STATUS_META[status].shortLabel}</span>
                          <span className="whitespace-nowrap font-bold">
                            {count} · {percentage}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", STATUS_META[status].barClassName)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar cartório ou responsável..."
                  aria-label="Buscar no painel de atenção"
                  className="h-9 pl-9"
                />
              </div>
              <Select value={filter} onValueChange={(value) => setFilter(value as AttentionFilter)}>
                <SelectTrigger className="h-9 sm:w-56" aria-label="Filtrar situação de contato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="needs-attention">Precisam de atenção</SelectItem>
                  <SelectItem value="never">Sem contato registrado</SelectItem>
                  <SelectItem value="overdue-60">60 dias ou mais</SelectItem>
                  <SelectItem value="critical">90 dias ou mais</SelectItem>
                  <SelectItem value="attention">60 a 89 dias</SelectItem>
                  <SelectItem value="monitor">30 a 59 dias</SelectItem>
                  <SelectItem value="current">Em dia</SelectItem>
                  <SelectItem value="all">Todos os cartórios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isMobile && <div data-testid="cs-cx-attention-mobile-list" className="max-h-[50dvh] space-y-2 overflow-y-auto md:hidden">
              {!visibleRows.length ? <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">Nenhum cartório encontrado neste recorte.</p> : visibleRows.map((row) => (
                <article key={row.office.id} className="min-w-0 rounded-lg border bg-card p-3"><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-bold">{row.office.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{officeResponsible(row.office)}</p></div><Badge variant="outline" className={cn("shrink-0 whitespace-nowrap text-[10px]", STATUS_META[row.status].className)}>{STATUS_META[row.status].shortLabel}</Badge></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><span className="block text-[10px] uppercase text-muted-foreground">Último contato</span>{row.lastContact ? formatDate(row.lastContact.contact_date) : "Nunca registrado"}</div><div><span className="block text-[10px] uppercase text-muted-foreground">Sem contato</span>{formatElapsedDays(row.daysWithoutContact)}</div></div><div className="mt-3 grid grid-cols-1 gap-1.5 border-t pt-2 min-[420px]:grid-cols-2"><Button type="button" variant="outline" size="sm" className="h-8" onClick={() => filterOffice(row.office.id)}>Ver histórico</Button>{canCreate && <Button type="button" size="sm" className="h-8" onClick={() => registerContact(row.office.id)}>Registrar contato</Button>}</div></article>
              ))}
            </div>}
            {!isMobile && <div className="hidden max-h-[46vh] overflow-auto rounded-lg border md:block">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>Cartório</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Último contato</TableHead>
                    <TableHead>Tempo sem contato</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!visibleRows.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhum cartório encontrado neste recorte.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((row) => (
                      <TableRow key={row.office.id}>
                        <TableCell className="font-semibold">{row.office.name}</TableCell>
                        <TableCell className="max-w-48 truncate text-xs" title={officeResponsible(row.office)}>
                          {officeResponsible(row.office)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {row.lastContact ? formatDate(row.lastContact.contact_date) : "Nunca registrado"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs font-medium">
                          {formatElapsedDays(row.daysWithoutContact)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("whitespace-nowrap text-[10px]", STATUS_META[row.status].className)}>
                            {STATUS_META[row.status].shortLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => filterOffice(row.office.id)}
                            >
                              Ver histórico
                            </Button>
                            {canCreate && (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => registerContact(row.office.id)}
                              >
                                Registrar contato
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildContactAttentionRows(
  offices: CsCxRegistryOffice[],
  contacts: CsCxContact[],
  now = new Date(),
): AttentionRow[] {
  const latestContactByOffice = new Map<string, CsCxContact>();
  contacts.forEach((contact) => {
    if (!isIsoDate(contact.contact_date)) return;
    const latest = latestContactByOffice.get(contact.registry_office_id);
    if (!latest || contact.contact_date > latest.contact_date) {
      latestContactByOffice.set(contact.registry_office_id, contact);
    }
  });

  const today = startOfDay(now);
  return offices
    .filter((office) => office.active)
    .map((office) => {
      const lastContact = latestContactByOffice.get(office.id) ?? null;
      const daysWithoutContact = lastContact
        ? Math.max(0, differenceInCalendarDays(today, parseIsoDate(lastContact.contact_date)))
        : null;
      return {
        office,
        lastContact,
        daysWithoutContact,
        status: contactStatus(daysWithoutContact),
      };
    })
    .sort((left, right) => {
      const leftPriority = left.daysWithoutContact ?? Number.POSITIVE_INFINITY;
      const rightPriority = right.daysWithoutContact ?? Number.POSITIVE_INFINITY;
      return rightPriority - leftPriority || left.office.name.localeCompare(right.office.name, "pt-BR");
    });
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof TriangleAlert;
  tone: "rose" | "orange" | "amber" | "emerald";
  active: boolean;
  onClick: () => void;
}) {
  const tones = {
    rose: "text-rose-600 dark:text-rose-400",
    orange: "text-orange-600 dark:text-orange-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  }[tone];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-lg text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
        active && "ring-2 ring-rose-500 ring-offset-2",
      )}
    >
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardContent className="flex items-center justify-between gap-2 px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="flex min-w-0 items-baseline gap-1.5">
              <p className={cn("text-xl font-black leading-6", tones)}>{value}</p>
              <p className="truncate text-[9px] text-muted-foreground" title={helper}>
                {helper}
              </p>
            </div>
          </div>
          <Icon className={cn("h-4 w-4 shrink-0", tones)} />
        </CardContent>
      </Card>
    </button>
  );
}

function contactStatus(days: number | null): AttentionStatus {
  if (days === null) return "never";
  if (days >= 90) return "critical";
  if (days >= 60) return "attention";
  if (days >= 30) return "monitor";
  return "current";
}

function matchesAttentionFilter(row: AttentionRow, filter: AttentionFilter) {
  if (filter === "all") return true;
  if (filter === "needs-attention") return row.status !== "current";
  if (filter === "never") return row.status === "never";
  if (filter === "overdue-60") return row.status === "critical" || row.status === "attention";
  return row.status === filter;
}

function filterForStatus(status: AttentionStatus): AttentionFilter {
  return status;
}

function officeResponsible(office: CsCxRegistryOffice) {
  const analystName = office.analyst?.full_name || office.analyst?.email;
  if (analystName) return analystName;
  const names = (office.responsibles ?? [])
    .map((responsible) => responsible.profile?.full_name || responsible.profile?.email)
    .filter((name): name is string => Boolean(name));
  return names.length ? Array.from(new Set(names)).join(", ") : "Não definido";
}

function formatElapsedDays(days: number | null) {
  if (days === null) return "Sem registro";
  if (days === 0) return "Hoje";
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseIsoDate(value).getTime());
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
