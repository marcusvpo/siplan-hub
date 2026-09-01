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
  Database,
  Download,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeEntryDialog } from "@/components/sd/time/TimeEntryDialog";
import {
  type SdTimeEntry,
  useDeleteSdTimeEntry,
  useImportSdTimeEntries,
  useMySdTimeEntries,
  useSaveSdTimeEntry,
} from "@/hooks/useSdTimeTracking";
import { usePermissions } from "@/hooks/usePermissions";
import {
  entryMinutes,
  entryStartMinutes,
  formatMinutes,
  getWeekRange,
  SD_DAILY_TARGET_MINUTES,
  totalMinutes,
  totalsByDate,
} from "@/lib/sd-time";
import { richTextToPlainText } from "@/lib/lexical";

const DAY_PAGE_SIZE_OPTIONS = [5, 10, 20];

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [dayPage, setDayPage] = useState(1);
  const [dayPageSize, setDayPageSize] = useState(DAY_PAGE_SIZE_OPTIONS[0]);

  const workDate = format(selectedDate, "yyyy-MM-dd");
  const week = useMemo(() => getWeekRange(selectedDate), [selectedDate]);
  const entriesQuery = useMySdTimeEntries(week.start, week.end);
  const saveEntry = useSaveSdTimeEntry();
  const deleteEntry = useDeleteSdTimeEntry();
  const importEntries = useImportSdTimeEntries();
  const entries = entriesQuery.data ?? [];
  const dayEntries = useMemo(
    () =>
      (entriesQuery.data ?? [])
        .filter((entry) => entry.work_date === workDate)
        .sort((first, second) => entryStartMinutes(second) - entryStartMinutes(first)),
    [entriesQuery.data, workDate],
  );
  const dayTotalPages = Math.max(1, Math.ceil(dayEntries.length / dayPageSize));
  const activeDayPage = Math.min(dayPage, dayTotalPages);
  const paginatedDayEntries = useMemo(
    () => dayEntries.slice((activeDayPage - 1) * dayPageSize, activeDayPage * dayPageSize),
    [activeDayPage, dayEntries, dayPageSize],
  );
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
    setDayPage(1);
    setSelectedDate((current) => addDays(current, tab === "week" ? amount * 7 : amount));
  };

  const openNewEntry = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  return (
    <div data-testid="sd-hours-page" className="mx-auto h-full w-full min-w-0 max-w-7xl space-y-2 overflow-x-hidden overflow-y-auto px-1 pb-4 pt-1 md:px-3">
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-50 via-background to-slate-50 px-4 py-3 shadow-sm dark:border-blue-950/70 dark:from-blue-950/25 dark:via-background dark:to-slate-950"
      >
        <Clock3 className="pointer-events-none absolute -bottom-8 -right-4 h-28 w-28 text-blue-500/10" />
        <div className="relative flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <Badge variant="outline" className="mb-1 gap-1 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              <Clock3 className="h-3 w-3" /> SD · Registro pessoal
            </Badge>
            <h1 className="text-xl font-black tracking-tight">Gerenciamento de horas</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Registre sua rotina diária e acompanhe o cumprimento da jornada semanal.
            </p>
          </div>
          {canCreate && (
            <div className="relative grid w-full grid-cols-1 gap-2 self-start min-[390px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button
                variant="outline"
                className="h-9 w-full gap-2 bg-background/80 sm:w-auto"
                disabled={importEntries.isPending}
                onClick={() => setImportDialogOpen(true)}
              >
                {importEntries.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Importar do 0800
              </Button>
              <Button className="h-9 w-full gap-2 sm:w-auto" onClick={openNewEntry}>
                <Plus className="h-4 w-4" /> Adicionar item
              </Button>
            </div>
          )}
        </div>
      </motion.section>

      <Tabs value={tab} onValueChange={setTab} className="space-y-2">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <TabsList className="grid h-9 w-full grid-cols-2 sm:w-72">
            <TabsTrigger value="day" className="gap-2"><CalendarDays className="h-4 w-4" /> Dia</TabsTrigger>
            <TabsTrigger value="week" className="gap-2"><BarChart3 className="h-4 w-4" /> Semana</TabsTrigger>
          </TabsList>
          <div className="flex h-9 w-full items-center justify-between gap-1 rounded-lg border bg-card px-1 shadow-sm sm:w-auto sm:justify-start">
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Período anterior" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              aria-label="Data do lançamento"
              value={workDate}
              className="h-7 w-[140px] border-0 bg-transparent text-xs shadow-none"
              onChange={(event) => {
                if (!event.target.value) return;
                setDayPage(1);
                setSelectedDate(parseISO(event.target.value));
              }}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Próximo período" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="day" className="mt-0 space-y-2">
          <Card className="overflow-hidden border-blue-200/70 dark:border-blue-950">
            <CardContent className="grid gap-2 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                      {isToday(selectedDate) ? "Hoje" : format(selectedDate, "EEEE", { locale: ptBR })}
                    </p>
                    <h2 className="text-base font-bold capitalize">
                      {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black tabular-nums">{formatMinutes(dayTotal)}</p>
                    <p className="text-xs text-muted-foreground">meta diária de 8h</p>
                  </div>
                </div>
                <Progress value={Math.min(100, (dayTotal / SD_DAILY_TARGET_MINUTES) * 100)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {Math.round((dayTotal / SD_DAILY_TARGET_MINUTES) * 100)}% da meta
                  {dayTotal < SD_DAILY_TARGET_MINUTES
                    ? ` · faltam ${formatMinutes(SD_DAILY_TARGET_MINUTES - dayTotal)}`
                    : " · meta concluída"}
                </p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300 md:flex">
                <Target className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
            <div className="min-w-0">
              <h2 className="font-bold">Itens de trabalho</h2>
              <p className="text-xs text-muted-foreground">{dayEntries.length} lançamento(s) · maior horário primeiro</p>
            </div>
            {canCreate && <Button size="sm" variant="outline" className="h-8 w-full gap-2 min-[390px]:w-auto" onClick={openNewEntry}><Plus className="h-4 w-4" /> Adicionar</Button>}
          </div>

          {entriesQuery.isLoading ? (
            <Card><CardContent className="flex items-center justify-center gap-2 py-14 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando lançamentos...</CardContent></Card>
          ) : dayEntries.length === 0 ? (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-2 py-12 text-center"><Clock3 className="h-8 w-8 text-muted-foreground" /><p className="font-semibold">Nenhuma hora lançada neste dia</p><p className="max-w-md text-sm text-muted-foreground">Adicione o primeiro item para começar a acompanhar sua jornada.</p>{canCreate && <Button size="sm" className="mt-2 gap-2" onClick={openNewEntry}><Plus className="h-4 w-4" /> Adicionar item</Button>}</CardContent></Card>
          ) : (
            <div className="space-y-1">
              {paginatedDayEntries.map((entry, index) => (
                <motion.div key={entry.id} initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="px-3 py-2">
                      <div className="flex min-w-0 items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-bold leading-5">{entry.title}</h3>
                            {entry.source === "ellevo_0800" && (
                              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                                <Database className="h-3 w-3" /> Importado do 0800
                              </Badge>
                            )}
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">{formatMinutes(entryMinutes(entry))}</Badge>
                          </div>
                          {entry.description && <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-[11px] leading-4 text-muted-foreground">{formatEntryDescription(entry)}</p>}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {entry.intervals.map((interval) => (
                              <span key={interval.id} className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0 text-[11px] leading-5 tabular-nums">
                                <Clock3 className="h-3 w-3" /> {interval.started_at} — {interval.ended_at ?? "em andamento"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Editar ${entry.title}`} onClick={() => { setEditingEntry(entry); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>}
                          {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Excluir ${entry.title}`} onClick={() => setDeletingEntry(entry)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              <DayEntriesPagination
                currentPage={activeDayPage}
                pageSize={dayPageSize}
                totalItems={dayEntries.length}
                totalPages={dayTotalPages}
                onPageChange={setDayPage}
                onPageSizeChange={(value) => {
                  setDayPageSize(Number(value));
                  setDayPage(1);
                }}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-0 space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricCard label="Total da semana" value={formatMinutes(weekTotal)} detail={`${format(parseISO(week.start), "dd/MM")} a ${format(parseISO(week.end), "dd/MM")}`} />
            <MetricCard label="Média por dia lançado" value={formatMinutes(workedDays ? weekTotal / workedDays : 0)} detail={`${workedDays} dia(s) com lançamento`} />
            <MetricCard label="Progresso da meta" value={`${Math.round((weekTotal / businessTarget) * 100)}%`} detail={`${formatMinutes(Math.max(0, businessTarget - weekTotal))} restantes`} />
          </div>

          <div className="grid gap-2 lg:grid-cols-[1.35fr_1fr]">
            <Card>
              <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Horas por dia</CardTitle></CardHeader>
              <CardContent className="h-48 p-2 pt-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={weekChart} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit="h" />
                    <Tooltip formatter={(value: number) => formatMinutes(value * 60)} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                    <Bar dataKey="hours" name="Horas lançadas" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Detalhamento</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-1 p-2 pt-0 sm:grid-cols-2">
                {week.days.map((date) => {
                  const key = format(date, "yyyy-MM-dd");
                  const minutes = dailyTotals[key] ?? 0;
                  return (
                    <button key={key} type="button" onClick={() => { setDayPage(1); setSelectedDate(date); setTab("day"); }} className="flex min-h-11 w-full items-center justify-between rounded-md border px-2 py-1.5 text-left transition-colors hover:bg-muted/50">
                      <span><span className="block text-xs font-semibold capitalize leading-4">{format(date, "EEEE", { locale: ptBR })}</span><span className="text-[10px] text-muted-foreground">{format(date, "dd/MM")}</span></span>
                      <span className="text-xs font-bold tabular-nums">{minutes ? formatMinutes(minutes) : "—"}</span>
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

      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Importar lançamentos do 0800?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão buscadas as horas de {format(selectedDate, "dd/MM/yyyy")} vinculadas ao seu usuário do HUB. Itens já importados serão ignorados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={importEntries.isPending}
              onClick={async (event) => {
                event.preventDefault();
                try {
                  const result = await importEntries.mutateAsync(workDate);
                  setImportDialogOpen(false);
                  if (result.available_count === 0) {
                    toast.info("Nenhum lançamento do 0800 foi encontrado para este dia.");
                  } else if (result.imported_count === 0) {
                    toast.info("Todos os lançamentos desse dia já estavam importados.");
                  } else {
                    toast.success(
                      `${result.imported_count} lançamento(s) importado(s) do 0800.` +
                        (result.skipped_count ? ` ${result.skipped_count} já existente(s).` : ""),
                    );
                  }
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
            >
              {importEntries.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletingEntry)} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto sm:w-full">
          <AlertDialogHeader><AlertDialogTitle>Excluir lançamento?</AlertDialogTitle><AlertDialogDescription>O item “{deletingEntry?.title}” e todos os seus intervalos serão removidos. Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteEntry.isPending} onClick={async () => { if (!deletingEntry) return; try { await deleteEntry.mutateAsync(deletingEntry.id); toast.success("Lançamento excluído."); setDeletingEntry(null); } catch (error) { toast.error(errorMessage(error)); } }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card><CardContent className="p-2.5"><p className="text-[11px] font-medium text-muted-foreground">{label}</p><p className="text-lg font-black leading-6 tabular-nums">{value}</p><p className="text-[10px] leading-4 text-muted-foreground">{detail}</p></CardContent></Card>;
}

function DayEntriesPagination({
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
          <SelectTrigger aria-label="Lançamentos por página" className="h-7 w-[62px] px-2 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_PAGE_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
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

function formatEntryDescription(entry: SdTimeEntry) {
  const description = richTextToPlainText(entry.description);
  return entry.source === "ellevo_0800"
    ? description.replace(/\s*\n\s*/g, " · ")
    : description;
}
