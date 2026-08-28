import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileSearch,
  Loader2,
  Search,
  UsersRound,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImportSdTeamWeek, useManagedSdTimeEntries } from "@/hooks/useSdTimeTracking";
import { toast } from "sonner";
import {
  entryMinutes,
  formatMinutes,
  getWeekRange,
  SD_DAILY_TARGET_MINUTES,
  totalMinutes,
} from "@/lib/sd-time";
import { richTextToPlainText } from "@/lib/lexical";

const PAGE_SIZE_OPTIONS = [5, 10, 20];
type PeriodView = "day" | "week";

export default function TimeManagementReport() {
  const shouldReduceMotion = useReducedMotion();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedUser, setSelectedUser] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [periodView, setPeriodView] = useState<PeriodView>("week");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const importTeamWeek = useImportSdTeamWeek();
  const week = useMemo(() => getWeekRange(selectedDate), [selectedDate]);
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const query = useManagedSdTimeEntries(week.start, week.end);
  const entries = useMemo(() => query.data ?? [], [query.data]);
  const periodEntries = useMemo(
    () => periodView === "day" ? entries.filter((entry) => entry.work_date === selectedDateKey) : entries,
    [entries, periodView, selectedDateKey],
  );

  const analysts = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; email: string | null; team: string | null }>();
    entries.forEach((entry) => {
      byId.set(entry.user_id, {
        id: entry.user_id,
        name: entry.user_name ?? entry.user_email ?? "Usuário",
        email: entry.user_email ?? null,
        team: entry.user_team ?? null,
      });
    });
    return Array.from(byId.values()).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return periodEntries.filter((entry) => {
      if (selectedUser !== "all" && entry.user_id !== selectedUser) return false;
      if (!term) return true;
      return [
        entry.user_name,
        entry.user_email,
        entry.title,
        entry.description ? richTextToPlainText(entry.description) : null,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [periodEntries, search, selectedUser]);

  useEffect(() => setPage(1), [periodView, search, selectedDateKey, selectedUser, week.start]);

  const total = totalMinutes(filteredEntries);
  const visibleAnalystIds = new Set(filteredEntries.map((entry) => entry.user_id));
  const analystCount = visibleAnalystIds.size;
  const workedUserDays = new Set(filteredEntries.map((entry) => `${entry.user_id}:${entry.work_date}`)).size;
  const target = analystCount * (periodView === "week" ? 5 : 1) * SD_DAILY_TARGET_MINUTES;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const pagedEntries = filteredEntries.slice((activePage - 1) * pageSize, activePage * pageSize);

  const chartData = useMemo(() => {
    if (periodView === "week") {
      return week.days.map((date) => {
        const key = format(date, "yyyy-MM-dd");
        const minutes = totalMinutes(filteredEntries.filter((entry) => entry.work_date === key));
        return {
          day: format(date, "EEE", { locale: ptBR }).replace(".", ""),
          date: format(date, "dd/MM"),
          hours: Number((minutes / 60).toFixed(2)),
        };
      });
    }

    const byAnalyst = new Map<string, { day: string; date: string; minutes: number }>();
    filteredEntries.forEach((entry) => {
      const current = byAnalyst.get(entry.user_id);
      byAnalyst.set(entry.user_id, {
        day: shortAnalystName(entry.user_name ?? entry.user_email ?? "Usuário"),
        date: format(selectedDate, "dd/MM"),
        minutes: (current?.minutes ?? 0) + entryMinutes(entry),
      });
    });
    return Array.from(byAnalyst.values()).map(({ day, date, minutes }) => ({
      day,
      date,
      hours: Number((minutes / 60).toFixed(2)),
    }));
  }, [filteredEntries, periodView, selectedDate, week.days]);

  const periodDetail = periodView === "week"
    ? `${format(parseISO(week.start), "dd/MM")} a ${format(parseISO(week.end), "dd/MM")}`
    : format(selectedDate, "dd/MM/yyyy");
  const navigatePeriod = (amount: number) => {
    setSelectedDate((current) => addDays(current, amount * (periodView === "week" ? 7 : 1)));
  };

  return (
    <div className="mx-auto h-full w-full max-w-7xl space-y-2 overflow-y-auto px-1 pb-4 pt-1 md:px-3">
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-background to-slate-50 px-4 py-3 shadow-sm dark:border-violet-950/70 dark:from-violet-950/25 dark:via-background dark:to-slate-950"
      >
        <BarChart3 className="pointer-events-none absolute -bottom-8 -right-4 h-28 w-28 text-violet-500/10" />
        <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <Badge variant="outline" className="mb-1 gap-1 border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
              <UsersRound className="h-3 w-3" /> SD · Visão do gestor
            </Badge>
            <h1 className="text-xl font-black tracking-tight">Consulta gerencial de horas</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Acompanhe os lançamentos, a cobertura da jornada e a distribuição de horas da equipe.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-violet-300 bg-background/90 px-3 text-xs text-violet-700 shadow-sm hover:bg-violet-50 hover:text-violet-800 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/50"
              disabled={importTeamWeek.isPending}
              onClick={() => setImportDialogOpen(true)}
            >
              {importTeamWeek.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Importar dados gerais
            </Button>
            <div className="flex items-center rounded-lg border border-violet-200/80 bg-background/85 p-1 shadow-sm backdrop-blur-sm dark:border-violet-900">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={periodView === "day"}
                className={`h-8 min-w-24 gap-1.5 px-3 text-xs ${periodView === "day" ? "bg-violet-600 text-white shadow-sm hover:bg-violet-600 hover:text-white" : "text-muted-foreground hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50"}`}
                onClick={() => setPeriodView("day")}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Dia
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={periodView === "week"}
                className={`h-8 min-w-24 gap-1.5 px-3 text-xs ${periodView === "week" ? "bg-violet-600 text-white shadow-sm hover:bg-violet-600 hover:text-white" : "text-muted-foreground hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50"}`}
                onClick={() => setPeriodView("week")}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Semana
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      <Card>
        <CardContent className="flex flex-col gap-1.5 p-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar analista, atividade ou descrição..." className="h-9 pl-9 text-xs" />
          </div>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="h-9 w-full text-xs lg:w-64"><SelectValue placeholder="Todos os analistas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os analistas</SelectItem>
              {analysts.map((analyst) => <SelectItem key={analyst.id} value={analyst.id}>{analyst.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex h-9 items-center gap-1 rounded-lg border px-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`${periodView === "week" ? "Semana" : "Dia"} anterior`} onClick={() => navigatePeriod(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Input type="date" value={format(selectedDate, "yyyy-MM-dd")} className="h-7 w-[140px] border-0 bg-transparent text-xs shadow-none" onChange={(event) => event.target.value && setSelectedDate(parseISO(event.target.value))} />
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Próxim${periodView === "week" ? "a semana" : "o dia"}`} onClick={() => navigatePeriod(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Consolidando horas da equipe...</CardContent></Card>
      ) : query.isError ? (
        <Card className="border-destructive/40"><CardContent className="flex flex-col items-center gap-2 py-14 text-center"><FileSearch className="h-8 w-8 text-destructive" /><p className="font-semibold">Não foi possível consultar os lançamentos</p><p className="text-sm text-muted-foreground">Verifique sua permissão gerencial ou tente novamente.</p><Button size="sm" variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></CardContent></Card>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Horas lançadas" value={formatMinutes(total)} detail={periodDetail} icon={<Clock3 className="h-4 w-4" />} />
            <MetricCard label="Analistas" value={String(analystCount)} detail={`${analystCount} com registros ${periodView === "week" ? "na semana" : "no dia"}`} icon={<UsersRound className="h-4 w-4" />} />
            <MetricCard label={periodView === "week" ? "Média por analista/dia" : "Média por analista"} value={formatMinutes(workedUserDays ? total / workedUserDays : 0)} detail={`${workedUserDays} jornada(s) registrada(s)`} icon={<BarChart3 className="h-4 w-4" />} />
            <MetricCard label="Cobertura da meta" value={`${target ? Math.round((total / target) * 100) : 0}%`} detail={periodView === "week" ? "meta de 8h em 5 dias úteis" : "meta diária de 8h por analista"} icon={<FileSearch className="h-4 w-4" />} />
          </div>

          <Card>
            <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">{periodView === "week" ? "Distribuição semanal" : "Horas por analista"}</CardTitle></CardHeader>
            <CardContent className="h-44 p-2 pt-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} unit="h" />
                  <Tooltip formatter={(value: number) => formatMinutes(value * 60)} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                  <Bar dataKey="hours" name="Horas da equipe" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 p-3 pb-1.5">
              <div><CardTitle className="text-sm">{periodView === "week" ? "Lançamentos da equipe" : "Lançamentos do dia"}</CardTitle><p className="text-[11px] text-muted-foreground">{filteredEntries.length} item(ns) encontrados · {periodDetail}</p></div>
            </CardHeader>
            <CardContent className="space-y-1 p-2 pt-0">
              {pagedEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center"><FileSearch className="h-8 w-8 text-muted-foreground" /><p className="font-semibold">Nenhum lançamento encontrado</p><p className="text-sm text-muted-foreground">Ajuste os filtros ou consulte outra semana.</p></div>
              ) : pagedEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border px-2.5 py-2">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5"><h3 className="text-sm font-bold leading-5">{entry.title}</h3><Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{formatMinutes(entryMinutes(entry))}</Badge></div>
                      <p className="text-[11px] leading-4 text-muted-foreground"><span className="font-semibold text-foreground">{entry.user_name}</span>{entry.user_team ? ` · ${entry.user_team}` : ""} · {format(parseISO(entry.work_date), "EEEE, dd/MM", { locale: ptBR })}</p>
                      {entry.description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{formatEntryDescription(entry.description)}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      {entry.intervals.map((interval) => <span key={interval.id} className="rounded-md border bg-muted/40 px-1.5 py-0 text-[11px] leading-5 tabular-nums">{interval.started_at} — {interval.ended_at ?? "em andamento"}</span>)}
                    </div>
                  </div>
                </div>
              ))}
              {pagedEntries.length > 0 && (
                <ReportPagination
                  currentPage={activePage}
                  pageSize={pageSize}
                  totalItems={filteredEntries.length}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  onPageSizeChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={importDialogOpen} onOpenChange={(open) => !importTeamWeek.isPending && setImportDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar dados gerais do SD?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Serão importados os lançamentos de {format(parseISO(week.start), "dd/MM/yyyy")} a {format(parseISO(week.end), "dd/MM/yyyy")} para todos os analistas do HUB encontrados nos grupos do 0800.
              </span>
              <span className="block rounded-md border bg-muted/40 p-2 text-xs text-foreground">
                SD - TN/RC · SD - GLOBAL · SD - Protesto · SD - RI/TD
              </span>
              <span className="block text-xs">Lançamentos já importados serão ignorados automaticamente.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importTeamWeek.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={importTeamWeek.isPending}
              onClick={async (event) => {
                event.preventDefault();
                try {
                  const result = await importTeamWeek.mutateAsync({ startDate: week.start, endDate: week.end });
                  setImportDialogOpen(false);
                  const linkage = result.unmatched_analyst_count
                    ? ` ${result.unmatched_analyst_count} analista(s) com horas não possuem usuário correspondente no HUB.`
                    : "";
                  toast.success(
                    `${result.imported_count} lançamento(s) importado(s); ${result.skipped_count} já existiam.${linkage}`,
                  );
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
            >
              {importTeamWeek.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar semana
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a importação geral.";
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <Card><CardContent className="flex items-start justify-between gap-2 p-2.5"><div><p className="text-[11px] font-medium text-muted-foreground">{label}</p><p className="text-lg font-black leading-6 tabular-nums">{value}</p><p className="text-[10px] leading-4 text-muted-foreground">{detail}</p></div><span className="rounded-md bg-primary/10 p-1.5 text-primary">{icon}</span></CardContent></Card>;
}

function ReportPagination({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: string) => void;
}) {
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-1.5 border-t pt-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Mostrando <strong className="font-semibold text-foreground">{firstItem}–{lastItem}</strong> de{" "}
        <strong className="font-semibold text-foreground">{totalItems}</strong>
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <span>Por página</span>
        <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
          <SelectTrigger aria-label="Lançamentos da equipe por página" className="h-7 w-[62px] px-2 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="min-w-[82px] text-center">Página {currentPage} de {totalPages}</span>
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Próxima página" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function formatEntryDescription(description: string) {
  return richTextToPlainText(description).replace(/\s*\n\s*/g, " · ");
}

function shortAnalystName(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).join(" ");
}
