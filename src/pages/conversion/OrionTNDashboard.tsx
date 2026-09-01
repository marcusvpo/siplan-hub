import { useMemo, useState } from "react";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Loader2,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Pause,
    TrendingUp,
    FolderOpen,
    Send,
    Download,
    ExternalLink,
    BarChart3,
    Search,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectV2, StageStatus } from "@/types/ProjectV2";
import { ProjectModal } from "@/components/ProjectManagement/ProjectModal";
import { normalizeText } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const STATUS_CONFIG: Record<StageStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode; badgeClass: string }> = {
    "todo": {
        label: "Não Iniciado",
        color: "text-slate-500",
        bgColor: "bg-slate-500",
        icon: <Pause className="h-3 w-3" />,
        badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    "in-progress": {
        label: "Em Andamento",
        color: "text-amber-500",
        bgColor: "bg-amber-500",
        icon: <Clock className="h-3 w-3" />,
        badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    "done": {
        label: "Concluído",
        color: "text-emerald-500",
        bgColor: "bg-emerald-500",
        icon: <CheckCircle2 className="h-3 w-3" />,
        badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    "blocked": {
        label: "Bloqueado",
        color: "text-rose-500",
        bgColor: "bg-rose-500",
        icon: <AlertTriangle className="h-3 w-3" />,
        badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
    "waiting_adjustment": {
        label: "Aguard. Ajuste",
        color: "text-purple-500",
        bgColor: "bg-purple-500",
        icon: <AlertTriangle className="h-3 w-3" />,
        badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
};

export default function OrionTNDashboard() {
    const { projects, isLoading, updateProject } = useProjectsV2();
    const isMobile = useIsMobile();
    const [selectedProjectForModal, setSelectedProjectForModal] = useState<ProjectV2 | null>(null);
    const [activeProjectSearch, setActiveProjectSearch] = useState("");
    const [activeProjectsPage, setActiveProjectsPage] = useState(1);
    const activeProjectsPageSize = isMobile ? 3 : 5;

    // Only OrionTN projects
    const orionProjects = useMemo(
        () => projects.filter((p) => p.systemType === "Orion TN" || p.systemType === "OrionTN" || p.systemType === "Modelos TN"),
        [projects]
    );

    // Projects that have a modelosEditor stage
    const withEditor = useMemo(
        () => orionProjects.filter((p) => !!p.stages.modelosEditor),
        [orionProjects]
    );

    const stats = useMemo(() => {
        const byStatus: Record<string, number> = { todo: 0, "in-progress": 0, done: 0, blocked: 0, waiting_adjustment: 0 };
        let totalSentFiles = 0;
        let totalAvailableFiles = 0;

        for (const p of withEditor) {
            const s = p.stages.modelosEditor!;
            byStatus[s.status] = (byStatus[s.status] || 0) + 1;
            totalSentFiles += (s.sentFiles || []).length;
            totalAvailableFiles += (s.availableFiles || []).length;
        }

        // Progress distribution
        const progressRanges = { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 };
        let totalProgress = 0;
        for (const p of withEditor) {
            const prog = p.overallProgress || 0;
            totalProgress += prog;
            if (prog <= 25) progressRanges["0-25"]++;
            else if (prog <= 50) progressRanges["26-50"]++;
            else if (prog <= 75) progressRanges["51-75"]++;
            else progressRanges["76-100"]++;
        }
        const avgProgress = withEditor.length > 0 ? Math.round(totalProgress / withEditor.length) : 0;

        // Projects in progress or not started (status is 'todo' or 'in-progress') sorted by lastUpdatedAt
        const recentProjects = withEditor
            .filter((p) => {
                const status = p.stages.modelosEditor?.status;
                return status === "todo" || status === "in-progress";
            })
            .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

        return { byStatus, totalSentFiles, totalAvailableFiles, progressRanges, avgProgress, recentProjects };
    }, [withEditor]);

    const filteredRecentProjects = useMemo(() => {
        const query = normalizeText(activeProjectSearch.trim());
        if (!query) return stats.recentProjects;
        return stats.recentProjects.filter((project) =>
            normalizeText(project.clientName).includes(query)
        );
    }, [activeProjectSearch, stats.recentProjects]);

    const activeProjectsTotalPages = Math.ceil(filteredRecentProjects.length / activeProjectsPageSize);
    const safeActiveProjectsPage = Math.min(activeProjectsPage, Math.max(activeProjectsTotalPages, 1));
    const paginatedRecentProjects = filteredRecentProjects.slice(
        (safeActiveProjectsPage - 1) * activeProjectsPageSize,
        safeActiveProjectsPage * activeProjectsPageSize
    );

    const handleActiveProjectSearch = (value: string) => {
        setActiveProjectSearch(value);
        setActiveProjectsPage(1);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const total = withEditor.length;
    const maxStatus = Math.max(...Object.values(stats.byStatus), 1);

    return (
        <div data-testid="orion-models-dashboard" className="min-w-0 space-y-4 overflow-x-hidden px-3 py-4 sm:space-y-5 sm:p-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard — Modelos Editor</h1>
                    <p className="text-muted-foreground text-xs mt-0.5">
                        Visão geral do estágio de Modelos Editor nos projetos OrionTN.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {orionProjects.length} projetos OrionTN no total
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                <KPICard
                    title="Total c/ Editor"
                    value={total}
                    subtitle="projetos com estágio"
                    icon={<FileText className="h-3.5 w-3.5 text-blue-500" />}
                    accent="blue"
                />
                <KPICard
                    title="Em Andamento"
                    value={stats.byStatus["in-progress"]}
                    subtitle="em execução"
                    icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
                    accent="amber"
                />
                <KPICard
                    title="Concluídos"
                    value={stats.byStatus["done"]}
                    subtitle="finalizados"
                    icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    accent="emerald"
                />
                <KPICard
                    title="Não Iniciados"
                    value={stats.byStatus["todo"]}
                    subtitle="aguardando início"
                    icon={<Pause className="h-3.5 w-3.5 text-slate-500" />}
                    accent="slate"
                />
                <KPICard
                    title="Bloqueados"
                    value={stats.byStatus["blocked"] + stats.byStatus["waiting_adjustment"]}
                    subtitle="requerem atenção"
                    icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                    accent="rose"
                />
            </div>

            {/* Row: Status Distribution + Files + Responsibles */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Status Distribution */}
                <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Distribuição de Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                        {total === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhum projeto encontrado.</p>
                        ) : (
                            (["in-progress", "done", "todo", "blocked", "waiting_adjustment"] as StageStatus[]).map((status) => {
                                const count = stats.byStatus[status] || 0;
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                const cfg = STATUS_CONFIG[status];
                                return (
                                    <div key={status} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cfg.color}>{cfg.icon}</span>
                                                <span className="font-medium text-[11px]">{cfg.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold">{count}</span>
                                                <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-700 ${cfg.bgColor}`}
                                                style={{ width: `${(count / maxStatus) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* File Metrics */}
                <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-primary" />
                            Arquivos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                                        <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold">Arquivos Enviados</p>
                                        <p className="text-[10px] text-muted-foreground">Modelos para o cliente</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {stats.totalSentFiles}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                                        <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold">Arquivos Disponíveis</p>
                                        <p className="text-[10px] text-muted-foreground">Prontos para envio</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {stats.totalAvailableFiles}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground">Taxa de Conclusão</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold">
                                        {total > 0 ? Math.round((stats.byStatus["done"] / total) * 100) : 0}%
                                    </span>
                                    <p className="text-[10px] text-muted-foreground">dos projetos</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Progress Distribution */}
                <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Progresso dos Projetos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-4">
                        {/* Average progress ring */}
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 border">
                            <div className="relative w-14 h-14 shrink-0">
                                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted" />
                                    <circle
                                        cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="5"
                                        className="text-primary transition-all duration-700"
                                        strokeDasharray={`${2 * Math.PI * 22}`}
                                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - stats.avgProgress / 100)}`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                    {stats.avgProgress}%
                                </span>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold">Progresso Médio</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">média geral dos projetos</p>
                            </div>
                        </div>

                        {/* Progress range bars */}
                        {([
                            { label: "0 – 25%", key: "0-25", color: "bg-rose-400" },
                            { label: "26 – 50%", key: "26-50", color: "bg-amber-400" },
                            { label: "51 – 75%", key: "51-75", color: "bg-blue-400" },
                            { label: "76 – 100%", key: "76-100", color: "bg-emerald-500" },
                        ] as const).map(({ label, key, color }) => {
                            const count = stats.progressRanges[key];
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium">{label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold">{count}</span>
                                            <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full transition-all duration-700 ${color}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Projects Table */}
            <Card className="bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-col items-stretch gap-3 p-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                        <FileText className="h-4 w-4 text-primary" />
                        Projetos em Andamento — Modelos Editor
                    </CardTitle>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            aria-label="Filtrar cartórios em andamento"
                            placeholder="Filtrar por nome do cartório..."
                            value={activeProjectSearch}
                            onChange={(event) => handleActiveProjectSearch(event.target.value)}
                            className="h-9 pl-8 text-xs"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-2 sm:p-4 sm:pt-2">
                    {filteredRecentProjects.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">
                            {activeProjectSearch
                                ? "Nenhum cartório corresponde ao filtro informado."
                                : "Nenhum projeto em andamento no Modelos Editor encontrado."}
                        </p>
                    ) : (
                        <>
                        <div data-testid="orion-dashboard-mobile-projects" className="space-y-2 sm:hidden">
                            {paginatedRecentProjects.map((project) => {
                                const editorStage = project.stages.modelosEditor!;
                                const statusCfg = STATUS_CONFIG[editorStage.status] || STATUS_CONFIG["todo"];
                                const sentCount = (editorStage.sentFiles || []).length;
                                const availCount = (editorStage.availableFiles || []).length;

                                return (
                                    <article key={project.id} className="min-w-0 rounded-lg border bg-background/70 p-3 shadow-sm">
                                        <div className="flex min-w-0 items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="break-words text-xs font-bold leading-snug">{project.clientName}</p>
                                                <p className="mt-0.5 text-[9px] text-muted-foreground">#{project.ticketNumber}</p>
                                            </div>
                                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${statusCfg.badgeClass}`}>
                                                {statusCfg.icon}
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2 text-[10px]">
                                            <div className="min-w-0">
                                                <span className="block text-muted-foreground">Responsável</span>
                                                <span className="block truncate font-medium">{editorStage.responsible || "Não atribuído"}</span>
                                            </div>
                                            <div>
                                                <span className="block text-muted-foreground">Arquivos</span>
                                                <span className="flex items-center gap-2 font-medium">
                                                    <span className="flex items-center gap-1 text-blue-600"><Send className="h-2.5 w-2.5" />{sentCount}</span>
                                                    <span className="flex items-center gap-1 text-emerald-600"><Download className="h-2.5 w-2.5" />{availCount}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="mt-2 h-8 w-full gap-1 text-[10px]" onClick={() => setSelectedProjectForModal(project)}>
                                            <ExternalLink className="h-3 w-3" />
                                            Abrir projeto
                                        </Button>
                                    </article>
                                );
                            })}
                        </div>
                        <div className="relative hidden w-full overflow-auto sm:block">
                            <table className="w-full caption-bottom text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="h-9 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Cliente
                                        </th>
                                        <th className="h-9 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Status Editor
                                        </th>
                                        <th className="h-9 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                                            Responsável
                                        </th>
                                        <th className="h-9 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                                            Arquivos
                                        </th>
                                        <th className="h-9 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                                            Atualizado em
                                        </th>
                                        <th className="h-9 px-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {paginatedRecentProjects.map((project) => {
                                        const editorStage = project.stages.modelosEditor!;
                                        const statusCfg = STATUS_CONFIG[editorStage.status] || STATUS_CONFIG["todo"];
                                        const sentCount = (editorStage.sentFiles || []).length;
                                        const availCount = (editorStage.availableFiles || []).length;
                                        const updatedAt = project.lastUpdatedAt
                                            ? new Date(project.lastUpdatedAt).toLocaleDateString("pt-BR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "2-digit",
                                            })
                                            : "—";

                                        return (
                                            <tr
                                                key={project.id}
                                                className="border-b transition-colors hover:bg-muted/30 h-10"
                                            >
                                                <td className="px-3 py-2 align-middle">
                                                    <div className="font-bold text-xs">{project.clientName}</div>
                                                    <div className="text-[9px] text-muted-foreground">
                                                        #{project.ticketNumber}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${statusCfg.badgeClass}`}
                                                    >
                                                        {statusCfg.icon}
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-xs hidden sm:table-cell">
                                                    <span className="text-[11px]">
                                                        {editorStage.responsible || (
                                                            <span className="text-muted-foreground italic">Não atribuído</span>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 align-middle hidden md:table-cell">
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                            <Send className="h-2.5 w-2.5" />
                                                            {sentCount}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                            <Download className="h-2.5 w-2.5" />
                                                            {availCount}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-[10px] text-muted-foreground hidden lg:table-cell">
                                                    {updatedAt}
                                                </td>
                                                <td className="px-3 py-2 align-middle text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 gap-1 text-[10px]"
                                                        onClick={() => setSelectedProjectForModal(project)}
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        <span className="hidden sm:inline">Abrir</span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {activeProjectsTotalPages > 1 && (
                            <div data-testid="orion-dashboard-project-pagination" className="mt-3 flex flex-col items-center justify-between gap-3 border-t pt-3 sm:flex-row">
                                <p className="text-[10px] text-muted-foreground">
                                    Mostrando {(safeActiveProjectsPage - 1) * activeProjectsPageSize + 1} a {Math.min(safeActiveProjectsPage * activeProjectsPageSize, filteredRecentProjects.length)} de {filteredRecentProjects.length}
                                </p>
                                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label="Página anterior dos projetos"
                                        disabled={safeActiveProjectsPage === 1}
                                        onClick={() => setActiveProjectsPage(Math.max(1, safeActiveProjectsPage - 1))}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs font-medium">Página {safeActiveProjectsPage} de {activeProjectsTotalPages}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label="Próxima página dos projetos"
                                        disabled={safeActiveProjectsPage === activeProjectsTotalPages}
                                        onClick={() => setActiveProjectsPage(Math.min(activeProjectsTotalPages, safeActiveProjectsPage + 1))}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Project Modal */}
            <ProjectModal
                project={selectedProjectForModal as ProjectV2}
                open={!!selectedProjectForModal}
                onOpenChange={(open) => !open && setSelectedProjectForModal(null)}
                onUpdate={(updatedProject) => {
                    updateProject.mutate({
                        projectId: updatedProject.id,
                        updates: { ...updatedProject },
                    });
                }}
            />
        </div>
    );
}

function KPICard({
    title,
    value,
    subtitle,
    icon,
    accent,
}: {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ReactNode;
    accent: string;
}) {
    const hoverBorderClass: Record<string, string> = {
        blue: "hover:border-blue-500/50 group-hover:text-blue-500",
        amber: "hover:border-amber-500/50 group-hover:text-amber-500",
        emerald: "hover:border-emerald-500/50 group-hover:text-emerald-500",
        slate: "hover:border-slate-500/50 group-hover:text-slate-500",
        rose: "hover:border-rose-500/50 group-hover:text-rose-500",
    };

    return (
        <Card
            className={`min-w-0 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group ${hoverBorderClass[accent] || ""}`}
        >
            <CardHeader className="flex flex-row items-start justify-between gap-1 space-y-0 p-2.5 pb-1 sm:p-3 sm:pb-1">
                <CardTitle
                    className={`text-[10px] sm:text-xs font-semibold text-muted-foreground transition-colors ${hoverBorderClass[accent]}`}
                >
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent className="p-2.5 pt-1 sm:p-3 sm:pt-1">
                <div className="text-xl font-bold">{value}</div>
                <p className="text-[9px] text-muted-foreground">{subtitle}</p>
            </CardContent>
        </Card>
    );
}
