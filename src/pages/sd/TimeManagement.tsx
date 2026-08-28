import { useMemo, useState } from "react";
import { addDays, format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeEntryDialog } from "@/components/sd/time/TimeEntryDialog";
import {
  type SdTimeEntry,
  useDeleteSdTimeEntry,
  useMySdTimeEntries,
  useSaveSdTimeEntry,
} from "@/hooks/useSdTimeTracking";
import { usePermissions } from "@/hooks/usePermissions";
import {
  entryMinutes,
  formatMinutes,
  getWeekRange,
  SD_DAILY_TARGET_MINUTES,
  totalMinutes,
  totalsByDate,
} from "@/lib/sd-time";
import { richTextToPlainText } from "@/lib/lexical";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export default function TimeManagement() {
  const shouldReduceMotion = useReducedMotion();
  const { hasPermission } = usePermissions();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [tab, setTab] = useState("day");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SdTimeEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<SdTimeEntry | null>(null);

  const workDate = format(selectedDate, "yyyy-MM-dd");
  const week = useMemo(() => getWeekRange(selectedDate), [selectedDate]);
  const entriesQuery = useMySdTimeEntries(week.start, week.end);
  const saveEntry = useSaveSdTimeEntry();
  const deleteEntry = useDeleteSdTimeEntry();
  const entries = entriesQuery.data ?? [];
  const dayEntries = entries.filter((entry) => entry.work_date === workDate);
  const dayTotal = totalMinutes(dayEntries);
  const weekTotal = totalMinutes(entries);
  const dailyTotals = totalsByDate(entries);
  const workedDays = Object.values(dailyTotals).filter((minutes) => minutes > 0).length;
  const businessTarget = 5 * SD_DAILY_TARGET_MINUTES;
  const canCreate = hasPermission("sd_time_entries", "create");
  const canEdit = hasPermission("sd_time_entries", "edit");
  const canDelete = hasPermission("sd_time_entries", "delete");

  const weekChart = week.days.map((date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return {
      day: format(date, "EEE", { locale: ptBR }).replace(".", ""),
      date: format(date, "dd/MM"),
      hours: Number(((dailyTotals[dateKey] ?? 0) / 60).toFixed(2)),
      minutes: dailyTotals[dateKey] ?? 0,
    };
  });

  const navigateDate = (amount: number) => {
    setSelectedDate((current) => addDays(current, tab === "week" ? amount * 7 : amount));
  };

  const openNewEntry = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto h-full w-full max-w-7xl space-y-3 overflow-y-auto px-1 pb-5 pt-1 md:px-3">
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-50 via-background to-slate-50 px-4 py-4 shadow-sm dark:border-blue-950/70 dark:from-blue-950/25 dark:via-background dark:to-slate-950 md:px-5"
      >
        <Clock3 className="pointer-events-none absolute -bottom-9 -right-5 h-36 w-36 text-blue-500/10" />
        <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <Badge variant="outline" className="mb-2 gap-1 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              <Clock3 className="h-3 w-3" /> SD · Registro pessoal
            </Badge>
            <h1 className="text-2xl font-black tracking-tight">Gerenciamento de horas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Registre sua rotina diária e acompanhe o cumprimento da jornada semanal.
            </p>
          </div>
          {canCreate && (
            <Button className="relative gap-2 self-start" onClick={openNewEntry}>
              <Plus className="h-4 w-4" /> Adicionar item
            </Button>
          )}
        </div>
      </motion.section>

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <TabsList className="grid h-10 w-full grid-cols-2 sm:w-72">
            <TabsTrigger value="day" className="gap-2"><CalendarDays className="h-4 w-4" /> Dia</TabsTrigger>
            <TabsTrigger value="week" className="gap-2"><BarChart3 className="h-4 w-4" /> Semana</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
            <Button variant="ghost" size="icon" aria-label="Período anterior" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              aria-label="Data do lançamento"
              value={workDate}
              className="h-8 w-[145px] border-0 bg-transparent shadow-none"
              onChange={(event) => event.target.value && setSelectedDate(parseISO(event.target.value))}
            />
            <Button variant="ghost" size="icon" aria-label="Próximo período" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="day" className="mt-0 space-y-3">
          <Card className="overflow-hidden border-blue-200/70 dark:border-blue-950">
            <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                      {isToday(selectedDate) ? "Hoje" : format(selectedDate, "EEEE", { locale: ptBR })}
                    </p>
                    <h2 className="text-lg font-bold capitalize">
                      {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black tabular-nums">{formatMinutes(dayTotal)}</p>
                    <p className="text-xs text-muted-foreground">meta diária de 8h</p>
                  </div>
                </div>
                <Progress value={Math.min(100, (dayTotal / SD_DAILY_TARGET_MINUTES) * 100)} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {Math.round((dayTotal / SD_DAILY_TARGET_MINUTES) * 100)}% da meta
                  {dayTotal < SD_DAILY_TARGET_MINUTES
                    ? ` · faltam ${formatMinutes(SD_DAILY_TARGET_MINUTES - dayTotal)}`
                    : " · meta concluída"}
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                <Target className="h-7 w-7" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Itens de trabalho</h2>
              <p className="text-xs text-muted-foreground">{dayEntries.length} lançamento(s) neste dia</p>
            </div>
            {canCreate && <Button size="sm" variant="outline" className="gap-2" onClick={openNewEntry}><Plus className="h-4 w-4" /> Adicionar</Button>}
          </div>

          {entriesQuery.isLoading ? (
            <Card><CardContent className="flex items-center justify-center gap-2 py-14 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando lançamentos...</CardContent></Card>
          ) : dayEntries.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-2 py-12 text-center"><Clock3 className="h-8 w-8 text-muted-foreground" /><p className="font-semibold">Nenhuma hora lançada neste dia</p><p className="max-w-md text-sm text-muted-foreground">Adicione o primeiro item para começar a acompanhar sua jornada.</p>{canCreate && <Button size="sm" className="mt-2 gap-2" onClick={openNewEntry}><Plus className="h-4 w-4" /> Adicionar item</Button>}</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {dayEntries.map((entry, index) => (
                <motion.div key={entry.id} initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">{entry.title}</h3>
                            <Badge variant="secondary" className="tabular-nums">{formatMinutes(entryMinutes(entry))}</Badge>
                          </div>
                          {entry.description && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{richTextToPlainText(entry.description)}</p>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {entry.intervals.map((interval) => (
                              <span key={interval.id} className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs tabular-nums">
                                <Clock3 className="h-3 w-3" /> {interval.started_at} — {interval.ended_at ?? "em andamento"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {canEdit && <Button variant="ghost" size="icon" aria-label={`Editar ${entry.title}`} onClick={() => { setEditingEntry(entry); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>}
                          {canDelete && <Button variant="ghost" size="icon" aria-label={`Excluir ${entry.title}`} onClick={() => setDeletingEntry(entry)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-0 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Total da semana" value={formatMinutes(weekTotal)} detail={`${format(parseISO(week.start), "dd/MM")} a ${format(parseISO(week.end), "dd/MM")}`} />
            <MetricCard label="Média por dia lançado" value={formatMinutes(workedDays ? weekTotal / workedDays : 0)} detail={`${workedDays} dia(s) com lançamento`} />
            <MetricCard label="Progresso da meta" value={`${Math.round((weekTotal / businessTarget) * 100)}%`} detail={`${formatMinutes(Math.max(0, businessTarget - weekTotal))} restantes`} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Horas por dia</CardTitle></CardHeader>
              <CardContent className="h-64 p-3 pt-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={weekChart} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} unit="h" />
                    <Tooltip formatter={(value: number) => formatMinutes(value * 60)} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                    <Bar dataKey="hours" name="Horas lançadas" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Detalhamento</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-0">
                {week.days.map((date) => {
                  const key = format(date, "yyyy-MM-dd");
                  const minutes = dailyTotals[key] ?? 0;
                  return (
                    <button key={key} type="button" onClick={() => { setSelectedDate(date); setTab("day"); }} className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50">
                      <span><span className="block text-sm font-semibold capitalize">{format(date, "EEEE", { locale: ptBR })}</span><span className="text-xs text-muted-foreground">{format(date, "dd/MM")}</span></span>
                      <span className="text-sm font-bold tabular-nums">{minutes ? formatMinutes(minutes) : "—"}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <TimeEntryDialog
        open={dialogOpen}
        entry={editingEntry}
        workDate={workDate}
        isSaving={saveEntry.isPending}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingEntry(null); }}
        onSave={async (input) => {
          try {
            await saveEntry.mutateAsync(input);
            toast.success(input.id ? "Lançamento atualizado." : "Horas lançadas com sucesso.");
            setDialogOpen(false);
            setEditingEntry(null);
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
      />

      <AlertDialog open={Boolean(deletingEntry)} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir lançamento?</AlertDialogTitle><AlertDialogDescription>O item “{deletingEntry?.title}” e todos os seus intervalos serão removidos. Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteEntry.isPending} onClick={async () => { if (!deletingEntry) return; try { await deleteEntry.mutateAsync(deletingEntry.id); toast.success("Lançamento excluído."); setDeletingEntry(null); } catch (error) { toast.error(errorMessage(error)); } }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}
