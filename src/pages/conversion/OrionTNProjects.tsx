import { useProjects } from "@/hooks/useProjects";
import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Loader2,
    FileText,
    TrendingUp,
    CheckCircle2,
    AlertTriangle,
    ExternalLink,
    Search,
    LayoutPanelTop,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ProjectModal } from "@/components/ProjectManagement/ProjectModal";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { ProjectV2 } from "@/types/ProjectV2";

type MetricType = "total" | "in-progress" | "done" | "blocked" | null;

export default function OrionTNProjects() {
    const { projects, isLoading } = useProjects();
    const { updateProject } = useProjectsV2();
    const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProjectForModal, setSelectedProjectForModal] = useState<ProjectV2 | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const orionTNProjects = projects.filter(
        (p) => p.systemType === "Orion TN" || p.systemType === "OrionTN"
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Filter and Paginate
    const filteredProjects = orionTNProjects.filter(p =>
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredProjects.length / pageSize);
    const paginatedProjects = filteredProjects.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Reset page on search or size change
    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        setCurrentPage(1);
    };

    const handlePageSizeChange = (val: string) => {
        setPageSize(Number(val));
        setCurrentPage(1);
    };

    // Calculate metrics
    const total = orionTNProjects.length;
    const inProgressList = orionTNProjects.filter((p) => p.globalStatus === "in-progress");
    const doneList = orionTNProjects.filter((p) => p.globalStatus === "done");
    const blockedList = orionTNProjects.filter((p) => p.globalStatus === "blocked");

    const metricsData = {
        total: orionTNProjects,
        "in-progress": inProgressList,
        done: doneList,
        blocked: blockedList,
    };

    const metricTitles = {
        total: "Todos os Projetos OrionTN",
        "in-progress": "Projetos em Andamento",
        done: "Projetos Finalizados",
        blocked: "Projetos Bloqueados",
    };

    return (
        <div className="p-4 space-y-5 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Projetos OrionTN</h1>
                    <p className="text-muted-foreground text-xs mt-0.5">
                        Gestão de modelos no ecossistema OrionTN.
                    </p>
                </div>
                <div className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded border">
                    Visão Geral
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                    className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/50 group"
                    onClick={() => setSelectedMetric("total")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                        <CardTitle className="text-[10px] sm:text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">Total OrionTN</CardTitle>
                        <FileText className="h-3 w-3 text-blue-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                        <div className="text-xl font-bold">{total}</div>
                        <p className="text-[9px] text-muted-foreground">Projetos</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-amber-500/50 group"
                    onClick={() => setSelectedMetric("in-progress")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                        <CardTitle className="text-[10px] sm:text-xs font-semibold text-muted-foreground group-hover:text-amber-500 transition-colors">Andamento</CardTitle>
                        <TrendingUp className="h-3 w-3 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                        <div className="text-xl font-bold">{inProgressList.length}</div>
                        <p className="text-[9px] text-muted-foreground">Em execução</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-emerald-500/50 group"
                    onClick={() => setSelectedMetric("done")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                        <CardTitle className="text-[10px] sm:text-xs font-semibold text-muted-foreground group-hover:text-emerald-500 transition-colors">Finalizados</CardTitle>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                        <div className="text-xl font-bold">{doneList.length}</div>
                        <p className="text-[9px] text-muted-foreground">Homologados</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-rose-500/50 group"
                    onClick={() => setSelectedMetric("blocked")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                        <CardTitle className="text-[10px] sm:text-xs font-semibold text-muted-foreground group-hover:text-rose-500 transition-colors">Bloqueios</CardTitle>
                        <AlertTriangle className="h-3 w-3 text-rose-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                        <div className="text-xl font-bold">{blockedList.length}</div>
                        <p className="text-[9px] text-muted-foreground">Críticos</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 p-4 pb-2">
                    <CardTitle className="text-base font-bold">Listagem de Projetos</CardTitle>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Mostrar:</span>
                            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                                <SelectTrigger className="w-[70px] h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por cartório ou ticket..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                    {filteredProjects.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground">Nenhum projeto OrionTN encontrado.</p>
                        </div>
                    ) : (
                        <>
                            <ProjectTable
                                projects={paginatedProjects}
                                onOpenProject={(project) => setSelectedProjectForModal(project as ProjectV2)}
                            />

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                                    <div className="text-xs text-muted-foreground">
                                        Mostrando <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> a{" "}
                                        <span className="font-medium">{Math.min(currentPage * pageSize, filteredProjects.length)}</span> de{" "}
                                        <span className="font-medium">{filteredProjects.length}</span> projetos
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {[...Array(totalPages)].map((_, i) => {
                                                const page = i + 1;
                                                // Only show first, last, and pages around current
                                                if (
                                                    page === 1 ||
                                                    page === totalPages ||
                                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <Button
                                                            key={page}
                                                            variant={currentPage === page ? "default" : "outline"}
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => setCurrentPage(page)}
                                                        >
                                                            {page}
                                                        </Button>
                                                    );
                                                }
                                                // Show ellipsis
                                                if (
                                                    (page === 2 && currentPage > 3) ||
                                                    (page === totalPages - 1 && currentPage < totalPages - 2)
                                                ) {
                                                    return <span key={page} className="text-muted-foreground text-xs px-1">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
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

            {/* Detail Dialog */}
            <Dialog open={!!selectedMetric} onOpenChange={(open) => !open && setSelectedMetric(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedMetric && metricTitles[selectedMetric]}
                        </DialogTitle>
                        <DialogDescription>
                            Listagem detalhada dos projetos nesta categoria.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto py-4">
                        {selectedMetric && (
                            <ProjectTable
                                projects={metricsData[selectedMetric]}
                                hideActionsOnMobile={false}
                                onOpenProject={(project) => {
                                    setSelectedMetric(null);
                                    setSelectedProjectForModal(project as ProjectV2);
                                }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ProjectModal
                project={selectedProjectForModal as ProjectV2}
                open={!!selectedProjectForModal}
                onOpenChange={(open) => !open && setSelectedProjectForModal(null)}
                onUpdate={(updatedProject) => {
                    updateProject.mutate({
                        projectId: updatedProject.id,
                        updates: {
                            ...updatedProject,
                        },
                    });
                }}
            />
        </div>
    );
}

const statusMap: Record<string, string> = {
    'done': 'Concluído',
    'blocked': 'Bloqueado',
    'in-progress': 'Em Andamento',
    'todo': 'A Fazer',
    'archived': 'Arquivado'
};

function ProjectTable({
    projects,
    hideActionsOnMobile = true,
    onOpenProject
}: {
    projects: any[],
    hideActionsOnMobile?: boolean,
    onOpenProject: (project: any) => void
}) {
    return (
        <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
                <thead>
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-9 px-4 text-left align-middle font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Cliente</th>
                        <th className="h-9 px-4 text-left align-middle font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="h-9 px-4 text-left align-middle font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Progresso</th>
                        <th className="h-9 px-4 text-right align-middle font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0 text-xs shadow-sm">
                    {projects.map((project) => (
                        <tr key={project.id} className="border-b transition-colors hover:bg-muted/30 h-10">
                            <td className="px-4 py-2 align-middle">
                                <div className="font-bold text-foreground text-xs">{project.clientName}</div>
                                <div className="text-[9px] text-muted-foreground">#{project.ticketNumber}</div>
                            </td>
                            <td className="px-4 py-2 align-middle text-xs">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${project.globalStatus === 'done' ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    project.globalStatus === 'blocked' ? 'bg-rose-100/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                        'bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                    {statusMap[project.globalStatus] || project.globalStatus}
                                </span>
                            </td>
                            <td className="px-4 py-2 align-middle">
                                <div className="flex items-center gap-2">
                                    <div className="w-full bg-muted rounded-full h-1 max-w-[60px]">
                                        <div
                                            className="bg-primary h-1 rounded-full transition-all duration-500"
                                            style={{ width: `${project.overallProgress || 0}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] font-bold text-muted-foreground">{project.overallProgress || 0}%</span>
                                </div>
                            </td>
                            <td className="px-4 py-2 align-middle text-right">
                                <div className="flex justify-end gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 h-7 px-2 text-[10px] font-medium"
                                        onClick={() => onOpenProject(project)}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        <span className={hideActionsOnMobile ? "hidden sm:inline" : ""}>Abrir</span>
                                    </Button>
                                    <Link to={`/orion-tn-models/${project.id}`}>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Abrir Editor">
                                            <LayoutPanelTop className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
