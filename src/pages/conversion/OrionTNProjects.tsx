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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Projetos OrionTN</h1>
                <p className="text-muted-foreground mt-1">
                    Monitoramento e gestão de modelos para projetos no ecossistema OrionTN. Clique nos cards para ver detalhes.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/50 group"
                    onClick={() => setSelectedMetric("total")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">Total OrionTN</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Projetos identificados</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-amber-500/50 group"
                    onClick={() => setSelectedMetric("in-progress")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-amber-500 transition-colors">Em Andamento</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inProgressList.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Execução ativa</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-emerald-500/50 group"
                    onClick={() => setSelectedMetric("done")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-emerald-500 transition-colors">Finalizados</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{doneList.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Modelos homologados</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-rose-500/50 group"
                    onClick={() => setSelectedMetric("blocked")}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-rose-500 transition-colors">Bloqueios</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{blockedList.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Aguardando ação</p>
                    </CardContent>
                </Card>
            </div>

            {/* Project List */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
                    <CardTitle>Listagem de Projetos</CardTitle>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por cartório ou ticket..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {orionTNProjects.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground">Nenhum projeto OrionTN encontrado.</p>
                        </div>
                    ) : (
                        <ProjectTable
                            projects={orionTNProjects.filter(p =>
                                p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                p.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase())
                            )}
                            onOpenProject={(project) => setSelectedProjectForModal(project as ProjectV2)}
                        />
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
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cliente</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Progresso</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Ações</th>
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {projects.map((project) => (
                        <tr key={project.id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle">
                                <div className="font-semibold text-foreground/90 text-xs sm:text-sm">{project.clientName}</div>
                                <div className="text-[10px] text-muted-foreground">#{project.ticketNumber}</div>
                            </td>
                            <td className="p-4 align-middle">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${project.globalStatus === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    project.globalStatus === 'blocked' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                    {statusMap[project.globalStatus] || project.globalStatus}
                                </span>
                            </td>
                            <td className="p-4 align-middle">
                                <div className="flex items-center gap-2">
                                    <div className="w-full bg-muted rounded-full h-1.5 max-w-[80px]">
                                        <div
                                            className="bg-primary h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${project.overallProgress || 0}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-medium text-muted-foreground">{project.overallProgress || 0}%</span>
                                </div>
                            </td>
                            <td className="p-4 align-middle text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 h-8 px-2"
                                        onClick={() => onOpenProject(project)}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        <span className={hideActionsOnMobile ? "hidden sm:inline" : ""}>Abrir Projeto</span>
                                    </Button>
                                    <Link to={`/orion-tn-models/${project.id}`}>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Abrir Editor">
                                            <LayoutPanelTop className="h-4 w-4" />
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
