import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSearch,
  Loader2,
  Search,
  UsersRound,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
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
import { useManagedSdTimeEntries } from "@/hooks/useSdTimeTracking";
import {
  entryMinutes,
  formatMinutes,
  getWeekRange,
  SD_DAILY_TARGET_MINUTES,
  totalMinutes,
} from "@/lib/sd-time";

const PAGE_SIZE = 10;

export default function TimeManagementReport() {
  const shouldReduceMotion = useReducedMotion();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedUser, setSelectedUser] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const week = useMemo(() => getWeekRange(selectedDate), [selectedDate]);
  const query = useManagedSdTimeEntries(week.start, week.end);
  const entries = useMemo(() => query.data ?? [], [query.data]);

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
    return entries.filter((entry) => {
      if (selectedUser !== "all" && entry.user_id !== selectedUser) return false;
      if (!term) return true;
      return [entry.user_name, entry.user_email, entry.title, entry.description]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [entries, search, selectedUser]);

  useEffect(() => setPage(1), [search, selectedUser, week.start]);

  const total = totalMinutes(filteredEntries);
  const visibleAnalystIds = new Set(filteredEntries.map((entry) => entry.user_id));
  const analystCount = visibleAnalystIds.size;
  const workedUserDays = new Set(filteredEntries.map((entry) => `${entry.user_id}:${entry.work_date}`)).size;
  const target = analystCount * 5 * SD_DAILY_TARGET_MINUTES;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pagedEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chartData = week.days.map((date) => {
    const key = format(date, "yyyy-MM-dd");
    const minutes = totalMinutes(filteredEntries.filter((entry) => entry.work_date === key));
    return {
      day: format(date, "EEE", { locale: ptBR }).replace(".", ""),
      date: format(date, "dd/MM"),
      hours: Number((minutes / 60).toFixed(2)),
    };
  });

  return (
    <div className="mx-auto h-full w-full max-w-7xl space-y-3 overflow-y-auto px-1 pb-5 pt-1 md:px-3">
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-background to-slate-50 px-4 py-4 shadow-sm dark:border-violet-950/70 dark:from-violet-950/25 dark:via-background dark:to-slate-950 md:px-5"
      >
        <BarChart3 className="pointer-events-none absolute -bottom-9 -right-5 h-36 w-36 text-violet-500/10" />
        <div className="relative">
          <Badge variant="outline" className="mb-2 gap-1 border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
            <UsersRound className="h-3 w-3" /> SD · Visão do gestor
          </Badge>
          <h1 className="text-2xl font-black tracking-tight">Consulta gerencial de horas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe os lançamentos, a cobertura da jornada e a distribuição de horas da equipe.
          </p>
        </div>
      </motion.section>

      <Card>
        <CardContent className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar analista, atividade ou descrição..." className="pl-9" />
          </div>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-full lg:w-64"><SelectValue placeholder="Todos os analistas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os analistas</SelectItem>
              {analysts.map((analyst) => <SelectItem key={analyst.id} value={analyst.id}>{analyst.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setSelectedDate((current) => addDays(current, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <Input type="date" value={format(selectedDate, "yyyy-MM-dd")} className="h-8 w-[145px] border-0 bg-transparent shadow-none" onChange={(event) => event.target.value && setSelectedDate(parseISO(event.target.value))} />
            <Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => setSelectedDate((current) => addDays(current, 7))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Consolidando horas da equipe...</CardContent></Card>
      ) : query.isError ? (
        <Card className="border-destructive/40"><CardContent className="flex flex-col items-center gap-2 py-14 text-center"><FileSearch className="h-8 w-8 text-destructive" /><p className="font-semibold">Não foi possível consultar os lançamentos</p><p className="text-sm text-muted-foreground">Verifique sua permissão gerencial ou tente novamente.</p><Button size="sm" variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Horas lançadas" value={formatMinutes(total)} detail={`${format(parseISO(week.start), "dd/MM")} a ${format(parseISO(week.end), "dd/MM")}`} icon={<Clock3 className="h-4 w-4" />} />
            <MetricCard label="Analistas" value={String(analystCount)} detail={`${analysts.length} com registros na semana`} icon={<UsersRound className="h-4 w-4" />} />
            <MetricCard label="Média por analista/dia" value={formatMinutes(workedUserDays ? total / workedUserDays : 0)} detail={`${workedUserDays} jornadas registradas`} icon={<BarChart3 className="h-4 w-4" />} />
            <MetricCard label="Cobertura da meta" value={`${target ? Math.round((total / target) * 100) : 0}%`} detail="meta de 8h em 5 dias úteis" icon={<FileSearch className="h-4 w-4" />} />
          </div>

          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Distribuição semanal</CardTitle></CardHeader>
            <CardContent className="h-60 p-3 pt-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} unit="h" />
                  <Tooltip formatter={(value: number) => formatMinutes(value * 60)} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                  <Bar dataKey="hours" name="Horas da equipe" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
              <div><CardTitle className="text-base">Lançamentos da equipe</CardTitle><p className="mt-0.5 text-xs text-muted-foreground">{filteredEntries.length} item(ns) encontrados</p></div>
              <Badge variant="secondary">Página {page} de {totalPages}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-1">
              {pagedEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center"><FileSearch className="h-8 w-8 text-muted-foreground" /><p className="font-semibold">Nenhum lançamento encontrado</p><p className="text-sm text-muted-foreground">Ajuste os filtros ou consulte outra semana.</p></div>
              ) : pagedEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border p-3">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{entry.title}</h3><Badge variant="secondary">{formatMinutes(entryMinutes(entry))}</Badge></div>
                      <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{entry.user_name}</span>{entry.user_team ? ` · ${entry.user_team}` : ""} · {format(parseISO(entry.work_date), "EEEE, dd/MM", { locale: ptBR })}</p>
                      {entry.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{entry.description}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {entry.intervals.map((interval) => <span key={interval.id} className="rounded-md border bg-muted/40 px-2 py-1 text-xs tabular-nums">{interval.started_at} — {interval.ended_at ?? "em andamento"}</span>)}
                    </div>
                  </div>
                </div>
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
                  <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <Card><CardContent className="flex items-start justify-between gap-2 p-4"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span></CardContent></Card>;
}
