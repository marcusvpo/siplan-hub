import { useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bug,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileQuestion,
  FilterX,
  Gauge,
  Headphones,
  Layers3,
  Loader2,
  RefreshCw,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CsCxMultiSelect } from "@/components/cs-cx/CsCxMultiSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSdAttendanceBi } from "@/hooks/useSdAttendanceBi";
import { formatMinutes } from "@/lib/sd-time";

const SD_GROUPS = ["SD - TN/RC", "SD - GLOBAL", "SD - Protesto", "SD - RI/TD"];
const SOURCE_OPTIONS = [
  { value: "ellevo_0800", label: "Importado do 0800" },
  { value: "manual", label: "Lançado no HUB" },
];
const PIE_COLORS = ["#7c3aed", "#2563eb", "#e11d48", "#0d9488", "#d97706", "#64748b"];
const TICKETS_PER_PAGE = 5;
type AttendanceBiTab = "overview" | "team" | "tickets";

export default function SdAttendanceBi() {
  const shouldReduceMotion = useReducedMotion();
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(() => format(subDays(today, 29), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(today, "yyyy-MM-dd"));
  const [userIds, setUserIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [natures, setNatures] = useState<string[]>([]);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AttendanceBiTab>("overview");

  const query = useSdAttendanceBi({ startDate, endDate, userIds, groups, sources, natures });
  const data = query.data;
  const metrics = data?.metrics;
  const classificationCoverage = metrics?.ticket_count
    ? Math.round((metrics.classified_ticket_count / metrics.ticket_count) * 100)
    : 0;
  const importedShare = metrics?.total_minutes
    ? Math.round((metrics.imported_minutes / metrics.total_minutes) * 100)
    : 0;
  const hasActiveFilters = Boolean(userIds.length || groups.length || sources.length || natures.length);

  const groupOptions = useMemo(
    () => Array.from(new Set([...SD_GROUPS, ...(data?.filters.groups ?? [])])).map((group) => ({ value: group, label: group })),
    [data?.filters.groups],
  );
  const analystOptions = useMemo(
    () => (data?.filters.analysts ?? []).map((analyst) => ({
      value: analyst.user_id,
      label: `${analyst.user_name}${analyst.attendance_group ? ` · ${analyst.attendance_group}` : ""}`,
    })),
    [data?.filters.analysts],
  );
  const natureOptions = useMemo(
    () => (data?.filters.natures ?? []).map((nature) => ({ value: nature, label: nature })),
    [data?.filters.natures],
  );
  const dailyData = useMemo(
    () => (data?.daily ?? []).map((item) => ({
      ...item,
      label: format(parseISO(item.work_date), "dd/MM"),
      hubHours: minutesToHours(item.manual_minutes),
      importedHours: minutesToHours(item.imported_minutes),
      totalHours: minutesToHours(item.total_minutes),
    })),
    [data?.daily],
  );
  const analystChart = useMemo(
    () => (data?.by_analyst ?? []).slice(0, 12).map((item) => ({
      ...item,
      shortName: shortName(item.user_name),
      hubHours: minutesToHours(item.manual_minutes),
      importedHours: minutesToHours(item.imported_minutes),
    })),
    [data?.by_analyst],
  );
  const groupChart = useMemo(
    () => (data?.by_group ?? []).map((item) => ({
      ...item,
      shortName: item.group_name.replace("SD - ", ""),
      hubHours: minutesToHours(item.manual_minutes),
      importedHours: minutesToHours(item.imported_minutes),
    })),
    [data?.by_group],
  );
  const natureChart = useMemo(
    () => (data?.by_nature ?? []).slice(0, 10).map((item) => ({
      ...item,
      shortName: truncate(item.nature, 28),
      hours: minutesToHours(item.total_minutes),
    })),
    [data?.by_nature],
  );
  const productChart = useMemo(
    () => (data?.by_product ?? []).slice(0, 8).map((item) => ({
      ...item,
      name: item.product,
      value: item.total_minutes,
    })),
    [data?.by_product],
  );
  const hourlyData = useMemo(() => {
    const byHour = new Map((data?.by_hour ?? []).map((item) => [item.hour_of_day, item]));
    return Array.from({ length: 14 }, (_, index) => index + 6).map((hour) => ({
      hour: `${String(hour).padStart(2, "0")}h`,
      entries: byHour.get(hour)?.entry_count ?? 0,
      hours: minutesToHours(byHour.get(hour)?.total_minutes ?? 0),
    }));
  }, [data?.by_hour]);
  const topTickets = data?.top_tickets ?? [];
  const ticketsPageCount = Math.max(1, Math.ceil(topTickets.length / TICKETS_PER_PAGE));
  const activeTicketsPage = Math.min(ticketsPage, ticketsPageCount);
  const paginatedTickets = topTickets.slice(
    (activeTicketsPage - 1) * TICKETS_PER_PAGE,
    activeTicketsPage * TICKETS_PER_PAGE,
  );

  useEffect(() => {
    setTicketsPage(1);
  }, [data?.top_tickets]);

  const setPreset = (days: number) => {
    setEndDate(format(today, "yyyy-MM-dd"));
    setStartDate(format(subDays(today, days - 1), "yyyy-MM-dd"));
  };
  const clearDimensions = () => {
    setUserIds([]);
    setGroups([]);
    setSources([]);
    setNatures([]);
  };
  const handleTabChange = (value: string) => {
    if (value === "overview" || value === "team" || value === "tickets") setActiveTab(value);
  };

  return (
    <div className="mx-auto h-full w-full max-w-7xl space-y-2 overflow-y-auto px-1 pb-5 pt-1 md:px-3">
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-background to-slate-50 px-4 py-3 shadow-sm dark:border-violet-950/70 dark:from-violet-950/25 dark:via-background dark:to-slate-950"
      >
        <BarChart3 className="pointer-events-none absolute -bottom-8 -right-4 h-28 w-28 text-violet-500/10" />
        <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <Badge variant="outline" className="mb-1 gap-1 border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
              <Gauge className="h-3 w-3" /> SD · Inteligência operacional
            </Badge>
            <h1 className="text-xl font-black tracking-tight">BI de Atendimento</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Performance por equipe e analista, perfil dos chamados e distribuição das horas atendidas.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 bg-background/90 text-xs" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} /> Atualizar BI
          </Button>
        </div>
      </motion.section>

      <Card>
        <CardContent className="space-y-1.5 p-2">
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-[132px_132px_minmax(180px,1fr)_minmax(200px,1.2fr)]">
            <FilterField label="Início"><Input aria-label="Data inicial do BI" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="h-8 px-2 text-[11px]" /></FilterField>
            <FilterField label="Fim"><Input aria-label="Data final do BI" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="h-8 px-2 text-[11px]" /></FilterField>
            <FilterField label="Grupos de atendimento">
              <CsCxMultiSelect ariaLabel="Filtrar grupos de atendimento" options={groupOptions} values={groups} onChange={setGroups} placeholder="Todos os grupos" searchPlaceholder="Buscar grupo..." />
            </FilterField>
            <FilterField label="Analistas">
              <CsCxMultiSelect ariaLabel="Filtrar analistas" options={analystOptions} values={userIds} onChange={setUserIds} placeholder="Todos os analistas" searchPlaceholder="Buscar analista..." />
            </FilterField>
          </div>
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_210px_auto_auto] xl:items-end">
            <FilterField label="Natureza do chamado">
              <CsCxMultiSelect ariaLabel="Filtrar naturezas dos chamados" options={natureOptions} values={natures} onChange={setNatures} placeholder="Todas as naturezas" searchPlaceholder="Buscar natureza..." />
            </FilterField>
            <FilterField label="Origem das horas">
              <CsCxMultiSelect ariaLabel="Filtrar origem das horas" options={SOURCE_OPTIONS} values={sources} onChange={setSources} placeholder="Todas as origens" />
            </FilterField>
            <div className="flex h-8 items-center rounded-md border bg-muted/30 p-0.5">
              {[7, 30, 90].map((days) => <Button key={days} type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setPreset(days)}>{days} dias</Button>)}
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-[11px]" disabled={!hasActiveFilters} onClick={clearDimensions}><FilterX className="h-3.5 w-3.5" /> Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Consolidando indicadores de atendimento...</CardContent></Card>
      ) : query.isError ? (
        <Card className="border-destructive/40"><CardContent className="flex flex-col items-center gap-2 py-16 text-center"><FileQuestion className="h-8 w-8 text-destructive" /><p className="font-semibold">Não foi possível carregar o BI</p><p className="text-sm text-muted-foreground">Confirme sua permissão ou tente atualizar novamente.</p><Button size="sm" variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></CardContent></Card>
      ) : !metrics?.entry_count ? (
        <Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center"><BarChart3 className="h-8 w-8 text-muted-foreground" /><p className="font-semibold">Nenhum atendimento encontrado</p><p className="text-sm text-muted-foreground">Altere o período ou remova parte dos filtros selecionados.</p></CardContent></Card>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Horas atendidas" value={formatMinutes(metrics.total_minutes)} detail={`${metrics.entry_count} lançamentos`} icon={<Clock3 />} />
            <MetricCard label="Chamados atendidos" value={String(metrics.ticket_count)} detail={`${metrics.classified_ticket_count} classificados`} icon={<TicketCheck />} />
            <MetricCard label="Analistas ativos" value={String(metrics.analyst_count)} detail={`${data?.by_group.length ?? 0} grupos no resultado`} icon={<UsersRound />} />
            <MetricCard label="Tempo médio/chamado" value={formatMinutes(metrics.average_ticket_minutes)} detail="soma das interações por chamado" icon={<Headphones />} />
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-2">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid h-9 w-full grid-cols-3 p-0.5 sm:w-[520px]">
                <TabsTrigger value="overview" aria-label="Visão geral" className="h-8 gap-1.5 px-1 text-[11px] sm:px-2.5"><BarChart3 className="h-3.5 w-3.5" /><span className="sm:hidden">Geral</span><span className="hidden sm:inline">Visão geral</span></TabsTrigger>
                <TabsTrigger value="team" aria-label="Equipes e analistas" className="h-8 gap-1.5 px-1 text-[11px] sm:px-2.5"><UsersRound className="h-3.5 w-3.5" /><span className="sm:hidden">Equipe</span><span className="hidden sm:inline">Equipes e analistas</span></TabsTrigger>
                <TabsTrigger value="tickets" aria-label="Chamados" className="h-8 gap-1.5 px-1 text-[11px] sm:px-2.5"><TicketCheck className="h-3.5 w-3.5" /> Chamados</TabsTrigger>
              </TabsList>
              {query.isFetching && !query.isLoading && <span role="status" aria-live="polite" className="flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Atualizando dados</span>}
            </div>

            <TabsContent value="overview" className="mt-0 space-y-2">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 p-2.5 pb-0.5">
                  <div><CardTitle className="text-sm">Evolução do atendimento</CardTitle><p className="text-[10px] text-muted-foreground">Horas por dia, separadas entre HUB e 0800</p></div>
                  <SourceLegend />
                </CardHeader>
                <CardContent className="h-48 p-1.5 pt-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={dailyData} margin={{ top: 4, right: 6, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} unit="h" />
                      <Tooltip formatter={(value: number) => formatMinutes(value * 60)} labelFormatter={(label) => `Dia ${label}`} />
                      <Bar dataKey="hubHours" name="Lançado no HUB" stackId="source" fill="#2563eb" maxBarSize={42} radius={[0, 0, 3, 3]} />
                      <Bar dataKey="importedHours" name="Importado do 0800" stackId="source" fill="#e11d48" maxBarSize={42} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-2 lg:grid-cols-[1.1fr_0.9fr]">
                <ChartCard title="Faixa horária dos atendimentos" subtitle="Volume de lançamentos por hora inicial" compact>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={hourlyData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hour" fontSize={9} tickLine={false} axisLine={false} interval={1} />
                      <YAxis fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number, name: string) => name === "Horas" ? formatMinutes(value * 60) : value} />
                      <Line type="monotone" dataKey="entries" name="Lançamentos" stroke="#7c3aed" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <Card>
                  <CardHeader className="p-3 pb-2"><CardTitle className="text-sm">Composição das horas</CardTitle><p className="text-[11px] text-muted-foreground">Indicadores complementares do 0800</p></CardHeader>
                  <CardContent className="space-y-3 p-3 pt-1">
                    <CompositionRow label="Importado do 0800" minutes={metrics.imported_minutes} total={metrics.total_minutes} color="bg-rose-500" />
                    <CompositionRow label="Lançado no HUB" minutes={metrics.manual_minutes} total={metrics.total_minutes} color="bg-blue-600" />
                    <CompositionRow label="Considerado em contrato" minutes={metrics.contract_minutes} total={metrics.total_minutes} color="bg-emerald-500" />
                    <CompositionRow label="Hora extra" minutes={metrics.overtime_minutes} total={metrics.total_minutes} color="bg-amber-500" />
                    <CompositionRow label="Retrabalho" minutes={metrics.rework_minutes} total={metrics.total_minutes} color="bg-violet-500" />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-0 space-y-2">
              <ContextMetric label="Média por lançamento" value={formatMinutes(metrics.average_entry_minutes)} detail={`${importedShare}% das horas vieram do 0800`} icon={<Activity />} />

              <div className="grid gap-2 xl:grid-cols-2">
                <ChartCard title="Horas por equipe" subtitle="Comparativo dos grupos; clique para filtrar" legend>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={groupChart} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} unit="h" />
                      <YAxis type="category" dataKey="shortName" width={72} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => formatMinutes(value * 60)} labelFormatter={(_, payload) => payload?.[0]?.payload?.group_name ?? ""} />
                      <Bar dataKey="hubHours" name="Lançado no HUB" stackId="source" fill="#2563eb" radius={[3, 0, 0, 3]} onClick={(bar) => setGroups([bar.payload.group_name])} className="cursor-pointer" />
                      <Bar dataKey="importedHours" name="Importado do 0800" stackId="source" fill="#e11d48" radius={[0, 3, 3, 0]} onClick={(bar) => setGroups([bar.payload.group_name])} className="cursor-pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Horas por analista" subtitle="Top 12; clique em uma barra para filtrar" legend>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={analystChart} layout="vertical" margin={{ top: 4, right: 12, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} unit="h" />
                      <YAxis type="category" dataKey="shortName" width={92} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => formatMinutes(value * 60)} labelFormatter={(_, payload) => payload?.[0]?.payload?.user_name ?? ""} />
                      <Bar dataKey="hubHours" name="Lançado no HUB" stackId="source" fill="#2563eb" radius={[3, 0, 0, 3]} onClick={(bar) => setUserIds([bar.payload.user_id])} className="cursor-pointer" />
                      <Bar dataKey="importedHours" name="Importado do 0800" stackId="source" fill="#e11d48" radius={[0, 3, 3, 0]} onClick={(bar) => setUserIds([bar.payload.user_id])} className="cursor-pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <div className="grid gap-2 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="flex h-[30rem] min-h-0 flex-col">
                  <CardHeader className="shrink-0 p-2.5 pb-0.5"><CardTitle className="text-xs">Performance dos analistas</CardTitle><p className="text-[10px] text-muted-foreground">Horas, volume e produtividade dentro do período filtrado</p></CardHeader>
                  <CardContent className="min-h-0 flex-1 overflow-auto p-1.5 pt-0">
                    <Table className="text-[11px] [&_td]:px-2 [&_td]:py-1.5 [&_th]:h-8 [&_th]:px-2 [&_th]:text-[10px]">
                      <TableHeader className="sticky top-0 z-10 bg-background"><TableRow><TableHead>Analista</TableHead><TableHead>Grupo</TableHead><TableHead className="text-right">Horas</TableHead><TableHead className="text-right">Chamados</TableHead><TableHead className="text-right">Média/lanç.</TableHead><TableHead className="text-right">Dias</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(data?.by_analyst ?? []).map((analyst) => (
                          <TableRow key={analyst.user_id} className="cursor-pointer" onClick={() => setUserIds([analyst.user_id])}>
                            <TableCell className="font-medium">{analyst.user_name}</TableCell><TableCell className="text-xs text-muted-foreground">{analyst.attendance_group}</TableCell><TableCell className="text-right font-semibold tabular-nums">{formatMinutes(analyst.total_minutes)}</TableCell><TableCell className="text-right tabular-nums">{analyst.ticket_count}</TableCell><TableCell className="text-right tabular-nums">{formatMinutes(analyst.average_entry_minutes)}</TableCell><TableCell className="text-right tabular-nums">{analyst.worked_days}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="flex h-[30rem] min-h-0 flex-col">
                  <CardHeader className="shrink-0 p-3 pb-1"><CardTitle className="text-sm">Atividades executadas</CardTitle><p className="text-[11px] text-muted-foreground">Distribuição do esforço por tipo de atividade</p></CardHeader>
                  <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 pt-1">
                    {(data?.by_activity ?? []).slice(0, 12).map((activity) => (
                      <div key={activity.activity} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium" title={activity.activity}>{activity.activity}</span><span className="shrink-0 tabular-nums text-muted-foreground">{formatMinutes(activity.total_minutes)} · {activity.entry_count}</span></div>
                        <Progress value={metrics.total_minutes ? (activity.total_minutes / metrics.total_minutes) * 100 : 0} className="h-1.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tickets" className="mt-0 space-y-2">
              <ContextMetric label="Cobertura de categoria" value={`${classificationCoverage}%`} detail="dos chamados possuem natureza identificada" icon={<Bug />} />

              <div className="grid gap-2 xl:grid-cols-[1.25fr_0.75fr]">
                <ChartCard title="Tipos de chamados mais atendidos" subtitle="Naturezas ordenadas pelo esforço; clique para filtrar">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={natureChart} layout="vertical" margin={{ top: 4, right: 12, left: 72, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} unit="h" />
                      <YAxis type="category" dataKey="shortName" width={150} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => formatMinutes(value * 60)} labelFormatter={(_, payload) => payload?.[0]?.payload?.nature ?? ""} />
                      <Bar dataKey="hours" name="Horas" fill="#7c3aed" radius={[0, 4, 4, 0]} onClick={(bar) => setNatures([bar.payload.nature])} className="cursor-pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Distribuição por produto" subtitle="Participação no total de horas">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie data={productChart} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius={50} outerRadius={82} paddingAngle={2}>
                        {productChart.map((item, index) => <Cell key={item.product} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatMinutes(value)} />
                      <Legend verticalAlign="bottom" iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <Card>
                <CardHeader className="p-2.5 pb-0.5"><CardTitle className="text-xs">Chamados com maior esforço</CardTitle><p className="text-[10px] text-muted-foreground">Top 15 pelo total de horas lançadas no período · 5 por página</p></CardHeader>
                <CardContent className="overflow-x-auto p-1.5 pt-0">
                  <Table className="text-[11px] [&_td]:px-2 [&_td]:py-1.5 [&_th]:h-8 [&_th]:px-2 [&_th]:text-[10px]">
                    <TableHeader><TableRow><TableHead>Chamado</TableHead><TableHead>Cliente / título</TableHead><TableHead>Natureza</TableHead><TableHead>Produto</TableHead><TableHead className="text-right">Horas</TableHead><TableHead className="text-right">Interações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {paginatedTickets.map((ticket) => (
                        <TableRow key={ticket.ticket_number}>
                          <TableCell className="font-bold">#{ticket.ticket_number}</TableCell>
                          <TableCell className="max-w-[360px]"><p className="truncate text-xs font-medium" title={ticket.ticket_title}>{ticket.ticket_title}</p><p className="truncate text-[10px] text-muted-foreground">{ticket.client_name}</p></TableCell>
                          <TableCell className="text-xs">{ticket.nature}</TableCell><TableCell className="text-xs">{ticket.product}</TableCell><TableCell className="text-right font-semibold tabular-nums">{formatMinutes(ticket.total_minutes)}</TableCell><TableCell className="text-right tabular-nums">{ticket.entry_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-end gap-2 border-t px-2 py-1.5 text-[10px] text-muted-foreground">
                    <span>Página {activeTicketsPage} de {ticketsPageCount}</span>
                    <Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Página anterior dos chamados" disabled={activeTicketsPage === 1} onClick={() => setTicketsPage(activeTicketsPage - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Próxima página dos chamados" disabled={activeTicketsPage === ticketsPageCount} onClick={() => setTicketsPage(activeTicketsPage + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-0.5 [&_[role=combobox]]:h-8 [&_[role=combobox]]:px-2 [&_[role=combobox]]:text-[11px]"><span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactElement }) {
  return <Card><CardContent className="flex items-start justify-between gap-2 p-2.5"><div className="min-w-0"><p className="truncate text-[10px] font-medium text-muted-foreground">{label}</p><p className="text-lg font-black leading-6 tabular-nums">{value}</p><p className="truncate text-[10px] leading-4 text-muted-foreground">{detail}</p></div><span className="rounded-md bg-violet-500/10 p-1.5 text-violet-600 [&>svg]:h-4 [&>svg]:w-4 dark:text-violet-300">{icon}</span></CardContent></Card>;
}

function ContextMetric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactElement }) {
  return <Card className="border-violet-200/70 bg-violet-50/40 dark:border-violet-950/70 dark:bg-violet-950/15"><CardContent className="flex items-center gap-2.5 p-2.5"><span className="rounded-md bg-violet-500/10 p-1.5 text-violet-600 [&>svg]:h-4 [&>svg]:w-4 dark:text-violet-300">{icon}</span><div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2"><p className="text-[11px] font-medium text-muted-foreground">{label}</p><p className="text-sm font-black tabular-nums">{value}</p><p className="text-[10px] text-muted-foreground">{detail}</p></div></CardContent></Card>;
}

function ChartCard({ title, subtitle, children, compact = false, legend = false }: { title: string; subtitle: string; children: React.ReactNode; compact?: boolean; legend?: boolean }) {
  return <Card><CardHeader className="flex-row items-start justify-between space-y-0 p-3 pb-1"><div><CardTitle className="text-sm">{title}</CardTitle><p className="text-[11px] text-muted-foreground">{subtitle}</p></div>{legend && <SourceLegend />}</CardHeader><CardContent className={`${compact ? "h-56" : "h-72"} p-2 pt-0`}>{children}</CardContent></Card>;
}

function SourceLegend() {
  return <div className="flex shrink-0 flex-wrap items-center gap-2 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-blue-600" /> HUB</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-600" /> 0800</span></div>;
}

function CompositionRow({ label, minutes, total, color }: { label: string; minutes: number; total: number; color: string }) {
  const percentage = total ? Math.round((minutes / total) * 100) : 0;
  return <div className="space-y-1"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium">{label}</span><span className="tabular-nums text-muted-foreground">{formatMinutes(minutes)} · {percentage}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div></div>;
}

function minutesToHours(minutes: number) {
  return Number((minutes / 60).toFixed(2));
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length <= 2 ? parts.join(" ") : `${parts[0]} ${parts[parts.length - 1]}`;
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
