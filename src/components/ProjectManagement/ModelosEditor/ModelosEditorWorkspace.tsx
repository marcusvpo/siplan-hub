import React, { useRef, useState, useMemo, useEffect } from "react";
import {
    FileText,
    UploadCloud,
    Download,
    Trash2,
    Eye,
    Loader2,
    CheckCircle2,
    Calendar,
    FileEdit,
    Search,
    Wand2,
    AlertCircle,
    Clock,
    RotateCw,
    Activity,
    Terminal,
    Ban,
    Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { useModelGenerationJobs, useModelWorkerStatus } from "@/hooks/useModelGenerationJobs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ProjectV2, AttachedFile, ModelosEditorStageV2, ModelType, MODEL_TYPES, ModelGenerationJob } from "@/types/ProjectV2";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModelosEditorWorkspaceProps {
    project: ProjectV2;
    onUpdate: (updates: Partial<ModelosEditorStageV2>) => void;
}

export function ModelosMetrics({ stage }: { stage: ModelosEditorStageV2 | undefined }) {
    if (!stage || !stage.startDate || !stage.endDate || !stage.sentFiles || stage.sentFiles.length === 0) return null;

    const start = new Date(stage.startDate);
    const end = new Date(stage.endDate);
    const today = new Date();

    const totalDays = Math.max(1, differenceInDays(end, start) + 1);
    const totalModels = stage.sentFiles.length;
    const avgNeeded = Math.ceil(totalModels / totalDays);

    let daysElapsed = differenceInDays(today, start) + 1;
    if (daysElapsed < 0) daysElapsed = 0;
    if (daysElapsed > totalDays) daysElapsed = totalDays;

    const expectedDone = Math.min(totalModels, daysElapsed * avgNeeded);
    const actualDone = stage.sentFiles.filter(f => f.isDone).length;
    const isOnTrack = daysElapsed === 0 || actualDone >= expectedDone;

    return (
        <>
            <Label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isOnTrack ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                <Calendar className="h-3.5 w-3.5" />
                Média Necessária
            </Label>
             <div className={cn(
                "h-8 flex items-center justify-center px-3 border transition-all duration-300 rounded font-bold text-xs shadow-sm",
                isOnTrack
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
            )}>
                {avgNeeded} modelo{avgNeeded !== 1 ? 's' : ''} / dia
            </div>
        </>
    );
}

export function ModelosEditorWorkspace({ project, onUpdate }: ModelosEditorWorkspaceProps) {
    const { toast } = useToast();
    const { uploadFile, getDownloadUrl, deleteFile: deleteStorageFile } = useProjectFiles(project.id);
    const {
        jobs, enqueueJob, getLatestJobFor,
        cancelJob, removeAvailableModel, appendAvailableModel, getQueuePosition,
    } = useModelGenerationJobs(project.id);
    const { online: workerOnline, status: workerStatus } = useModelWorkerStatus();
    const { canUploadFiles, canDeleteFiles, canEditProjects } = usePermissions();
    const { user, fullName } = useAuth();

    // Modal "ver andamento": guardamos o id e derivamos o job vivo (atualiza via Realtime)
    const [progressJobId, setProgressJobId] = useState<string | null>(null);
    const progressJob = useMemo(
        () => jobs.find(j => j.id === progressJobId) || null,
        [jobs, progressJobId]
    );

    // Relogio para "tempo decorrido" nos badges (atualiza a cada 30s)
    const [nowTick, setNowTick] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNowTick(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);
    const elapsedMin = (iso?: string): number =>
        iso ? Math.max(0, Math.floor((nowTick - new Date(iso).getTime()) / 60000)) : 0;

    // Confere se a origem ainda existe no Storage antes de enfileirar (evita job fadado ao erro)
    const STORAGE_BUCKET = "project-files";
    const sourceExists = async (path: string): Promise<boolean> => {
        const slash = path.lastIndexOf("/");
        const folder = slash >= 0 ? path.slice(0, slash) : "";
        const name = slash >= 0 ? path.slice(slash + 1) : path;
        try {
            const { data } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { search: name, limit: 100 });
            return !!data?.some((o) => o.name === name);
        } catch {
            return true; // se a checagem falhar, nao bloqueia (o worker reporta se faltar)
        }
    };

    const handleGenerateModel = async (file: AttachedFile) => {
        if (!file.modelType) return;
        if (!(await sourceExists(file.path))) {
            toast({
                title: "Arquivo não encontrado",
                description: `"${file.name}" não está mais no armazenamento. Reenvie o arquivo antes de gerar.`,
                variant: "destructive",
            });
            return;
        }
        enqueueJob.mutate({
            sourceFilePath: file.path,
            sourceFileName: file.name,
            modelType: file.modelType,
            requestedBy: fullName || user?.email || "Sistema",
        });
    };

    // Gera em lote os arquivos de uma categoria que ainda NAO tem modelo.
    // Pula os ja prontos (done) e os em andamento (pending/processing). Re-tenta
    // os que deram erro ou foram cancelados. (Regerar um pronto: clicar no ✨ da linha.)
    const handleGenerateCategory = async (modelType: ModelType, catFiles: AttachedFile[]) => {
        const targets = catFiles.filter((f) => {
            if (!f.modelType) return false;
            const job = getLatestJobFor(f.path);
            return job?.status !== "pending" && job?.status !== "processing" && job?.status !== "done";
        });
        if (targets.length === 0) {
            toast({ title: "Nada a gerar", description: "Todos os modelos desta categoria já estão prontos, na fila ou gerando." });
            return;
        }
        let enq = 0;
        let missing = 0;
        for (const f of targets) {
            if (!(await sourceExists(f.path))) { missing++; continue; }
            enqueueJob.mutate({
                sourceFilePath: f.path,
                sourceFileName: f.name,
                modelType: f.modelType as ModelType,
                requestedBy: fullName || user?.email || "Sistema",
                silent: true,
            });
            enq++;
        }
        toast({
            title: "Geração em lote",
            description: `${enq} modelo(s) enfileirado(s).${missing ? ` ${missing} ignorado(s) (arquivo ausente).` : ""}`,
        });
    };
    const [uploadingType, setUploadingType] = useState<'sent' | 'available' | null>(null);
    const [pendingUpload, setPendingUpload] = useState<{ type: 'sent' | 'available'; modelType: ModelType } | null>(null);

    const sentFileInputRef = useRef<HTMLInputElement>(null);
    const availableFileInputRef = useRef<HTMLInputElement>(null);

    const triggerUpload = (type: 'sent' | 'available', modelType: ModelType) => {
        setPendingUpload({ type, modelType });
        const ref = type === 'sent' ? sentFileInputRef : availableFileInputRef;
        ref.current?.click();
    };

    const [viewingFullscreen, setViewingFullscreen] = useState<'sent' | 'available' | null>(null);

    const [sentSearch, setSentSearch] = useState("");
    const [availableSearch, setAvailableSearch] = useState("");

    const stage = project.stages.modelosEditor || ({} as ModelosEditorStageV2);

    const filteredSentFiles = useMemo(() => {
        if (!stage.sentFiles) return [];
        return stage.sentFiles.filter(f => f.name.toLowerCase().includes(sentSearch.toLowerCase()));
    }, [stage.sentFiles, sentSearch]);

    const filteredAvailableFiles = useMemo(() => {
        if (!stage.availableFiles) return [];
        return stage.availableFiles.filter(f => f.name.toLowerCase().includes(availableSearch.toLowerCase()));
    }, [stage.availableFiles, availableSearch]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'sent' | 'available', currentFiles: AttachedFile[] = []) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadingType(type);
            const modelType = pendingUpload?.modelType;
            try {
                const filesToUpload = Array.from(e.target.files);
                const newAttachedFiles: AttachedFile[] = [];

                for (const file of filesToUpload) {
                    const result = await uploadFile.mutateAsync({
                        file,
                        uploadedBy: "Admin",
                    });

                    newAttachedFiles.push({
                        id: result.id,
                        name: result.file_name,
                        path: result.file_path,
                        size: result.file_size,
                        uploadedAt: result.uploaded_at,
                        ...(modelType ? { modelType } : {}),
                    });
                }

                if (type === 'available') {
                    // Available e co-gerenciado com o worker: append atomico via RPC (nao reescreve o array).
                    for (const af of newAttachedFiles) {
                        await appendAvailableModel(af);
                    }
                } else {
                    onUpdate({ sentFiles: [...currentFiles, ...newAttachedFiles] });
                }

                toast({
                    title: "Sucesso",
                    description: filesToUpload.length > 1 ? `${filesToUpload.length} arquivos enviados com sucesso.` : "Arquivo enviado com sucesso.",
                });
            } catch (error) {
                console.error(error);
                toast({
                    title: "Erro no upload",
                    description: "Não foi possível enviar os arquivos.",
                    variant: "destructive",
                });
            } finally {
                setUploadingType(null);
                setPendingUpload(null);
                if (type === 'sent' && sentFileInputRef.current) sentFileInputRef.current.value = "";
                if (type === 'available' && availableFileInputRef.current) availableFileInputRef.current.value = "";
            }
        }
    };

    const handleFileDownload = async (file: AttachedFile) => {
        try {
            toast({
                title: "Baixando arquivo",
                description: `Iniciando o download de ${file.name}...`,
            });
            const url = await getDownloadUrl(file.path);
            const response = await fetch(url);
            if (!response.ok) throw new Error("Erro de rede ao baixar o arquivo");
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro no download",
                description: "Falha ao baixar diretamente. Tentando abrir em nova aba...",
                variant: "destructive",
            });
            try {
                const url = await getDownloadUrl(file.path);
                window.open(url, "_blank");
            } catch (fallbackError) {
                console.error("Erro no fallback do download:", fallbackError);
            }
        }
    };

    const handleRemoveFile = async (file: AttachedFile, type: 'sent' | 'available', currentFiles: AttachedFile[]) => {
        if (confirm(`Tem certeza que deseja excluir ${file.name}?`)) {
            try {
                await deleteStorageFile.mutateAsync({ ...file, projectId: project.id, fileUrl: file.path } as any);

                if (type === 'available') {
                    await removeAvailableModel(file.id);
                } else {
                    onUpdate({ sentFiles: currentFiles.filter((f) => f.id !== file.id) });
                }

                toast({
                    title: "Sucesso",
                    description: "Arquivo removido.",
                });
            } catch (error) {
                console.error(error);
                toast({
                    title: "Erro",
                    description: "Não foi possível remover o arquivo.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleFileView = async (file: AttachedFile) => {
        try {
            const url = await getDownloadUrl(file.path);
            window.open(url, '_blank');
        } catch (error) {
            console.error("Error generating view URL:", error);
            toast({
                title: "Erro",
                description: "Não foi possível abrir o arquivo.",
                variant: "destructive",
            });
        }
    };

    const handleToggleFileDone = (file: AttachedFile, type: 'sent' | 'available', currentFiles: AttachedFile[]) => {
        const updatedFiles = currentFiles.map(f =>
            f.id === file.id ? { ...f, isDone: !f.isDone } : f
        );
        const fieldToUpdate = type === 'sent' ? 'sentFiles' : 'availableFiles';
        onUpdate({
            [fieldToUpdate]: updatedFiles
        });
    };

    const handleToggleAllFiles = (type: 'sent' | 'available', currentFiles: AttachedFile[], checked: boolean) => {
        const updatedFiles = currentFiles.map(f => ({ ...f, isDone: checked }));
        const fieldToUpdate = type === 'sent' ? 'sentFiles' : 'availableFiles';
        onUpdate({
            [fieldToUpdate]: updatedFiles
        });
    };

    const handleBatchDownload = async (type: 'sent' | 'available', currentFiles: AttachedFile[]) => {
        const selectedFiles = currentFiles.filter(f => f.isDone);
        if (selectedFiles.length === 0) return;

        toast({
            title: "Preparando download",
            description: `Comprimindo ${selectedFiles.length} arquivo(s) em um arquivo .zip...`,
        });

        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();

            // Create a subfolder inside the ZIP with the project's name
            const folderName = project.clientName.trim();
            const projectFolder = zip.folder(folderName);

            for (const file of selectedFiles) {
                try {
                    const url = await getDownloadUrl(file.path);
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Falha ao obter ${file.name}`);
                    const blob = await response.blob();
                    
                    if (projectFolder) {
                        projectFolder.file(file.name, blob);
                    } else {
                        zip.file(file.name, blob);
                    }
                } catch (err) {
                    console.error(`Erro ao adicionar ${file.name} ao zip:`, err);
                }
            }

            const content = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(content);

            const link = document.createElement("a");
            link.href = zipUrl;
            const cleanProjectName = project.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `${cleanProjectName}_modelos_${type === 'sent' ? 'cliente' : 'json'}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(zipUrl);

            toast({
                title: "Download concluído",
                description: `O arquivo .zip com os modelos selecionados foi baixado.`,
            });
        } catch (error) {
            console.error("Erro ao gerar arquivo ZIP:", error);
            toast({
                title: "Erro no download",
                description: "Não foi possível gerar o arquivo .zip de modelos.",
                variant: "destructive",
            });
        }
    };

    const handleBatchDelete = async (type: 'sent' | 'available', currentFiles: AttachedFile[]) => {
        const selectedFiles = currentFiles.filter(f => f.isDone);
        if (selectedFiles.length === 0) return;

        if (confirm(`Tem certeza que deseja excluir os ${selectedFiles.length} arquivos selecionados?`)) {
            try {
                toast({
                    title: "Excluindo arquivos",
                    description: `Excluindo ${selectedFiles.length} arquivo(s)...`,
                });

                for (const file of selectedFiles) {
                    await deleteStorageFile.mutateAsync({ ...file, projectId: project.id, fileUrl: file.path } as any);
                    if (type === 'available') await removeAvailableModel(file.id);
                }

                if (type === 'sent') {
                    onUpdate({ sentFiles: currentFiles.filter(f => !f.isDone) });
                }

                toast({
                    title: "Sucesso",
                    description: `${selectedFiles.length} arquivo(s) excluído(s) com sucesso.`,
                });
            } catch (error) {
                console.error(error);
                toast({
                    title: "Erro",
                    description: "Não foi possível remover alguns arquivos.",
                    variant: "destructive",
                });
            }
        }
    };

    const renderSelectionHeader = (type: 'sent' | 'available', list: AttachedFile[]) => {
        if (!list || list.length === 0) return null;
        const allChecked = list.every(f => f.isDone);
        const someChecked = list.some(f => f.isDone);
        const isSent = type === 'sent';

        return (
            <div className={cn(
                "flex items-center justify-between p-1.5 rounded border text-xs shrink-0 mb-1.5 transition-all duration-300",
                isSent 
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30" 
                    : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
            )}>
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={allChecked}
                        disabled={!canEditProjects}
                        onCheckedChange={(checked) => handleToggleAllFiles(type, list, !!checked)}
                        className={cn(
                            "rounded flex-shrink-0 h-3.5 w-3.5",
                            isSent 
                                ? "data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500" 
                                : "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        )}
                    />
                    <span className={cn(
                        "font-semibold",
                        isSent ? "text-indigo-700 dark:text-indigo-400" : "text-emerald-700 dark:text-emerald-400"
                    )}>
                        Selecionar Todos
                    </span>
                </div>
                {someChecked && (
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-6 px-2 text-[10px] flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800",
                                isSent ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"
                            )}
                            onClick={() => handleBatchDownload(type, list)}
                        >
                            <Download className="h-3 w-3" />
                            Baixar Selecionados
                        </Button>
                        {canDeleteFiles && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-900/20 flex items-center gap-1"
                                onClick={() => handleBatchDelete(type, list)}
                            >
                                <Trash2 className="h-3 w-3" />
                                Excluir Selecionados
                            </Button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Selo de saude do worker na VM (online/offline). Fica no topo da coluna de enviados.
    const renderWorkerStatus = () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider cursor-help",
                    workerOnline
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", workerOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                    {workerOnline ? "Gerador online" : "Gerador offline"}
                </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <p className="max-w-xs">
                    {workerOnline
                        ? `Serviço de geração ativo${workerStatus?.status === "busy" ? " — gerando um modelo agora." : " e pronto para gerar."}`
                        : "O serviço de geração está offline. As solicitações ficam na fila e são processadas assim que ele voltar."}
                </p>
            </TooltipContent>
        </Tooltip>
    );

    const renderJobBadge = (file: AttachedFile) => {
        const job = getLatestJobFor(file.path);
        if (!job) return null;

        const base = "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors";
        const open = (e: React.MouseEvent) => { e.preventDefault(); setProgressJobId(job.id); };

        switch (job.status) {
            case 'pending': {
                const pos = getQueuePosition(job);
                return (
                    <button type="button" onClick={open} title="Ver andamento"
                        className={cn(base, "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40")}>
                        <Clock className="h-2.5 w-2.5" /> Na fila{pos && pos > 1 ? ` · ${pos}º` : ""}
                    </button>
                );
            }
            case 'processing': {
                const mins = elapsedMin(job.startedAt || job.createdAt);
                return (
                    <button type="button" onClick={open} title="Ver o que a IA está fazendo agora"
                        className={cn(base, "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-900/40")}>
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Gerando…{mins >= 1 ? ` ${mins}m` : ""}
                    </button>
                );
            }
            case 'cancelled':
                return (
                    <button type="button" onClick={open} title="Geração cancelada"
                        className={cn(base, "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-700/60")}>
                        <AlertCircle className="h-2.5 w-2.5" /> Cancelado
                    </button>
                );
            case 'done':
                return (
                    <button type="button" onClick={open} title="Ver detalhes da geração"
                        className={cn(base, "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40")}>
                        <CheckCircle2 className="h-2.5 w-2.5" /> Pronto
                    </button>
                );
            case 'error':
                return (
                    <button type="button" onClick={open} title="Ver detalhes do erro"
                        className={cn(base, "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40")}>
                        <AlertCircle className="h-2.5 w-2.5" /> Erro
                    </button>
                );
            default:
                return null;
        }
    };

    const renderGenerateButton = (file: AttachedFile) => {
        if (!file.modelType || !canUploadFiles) return null;
        const job = getLatestJobFor(file.path);
        const isActive = job?.status === 'pending' || job?.status === 'processing';
        const isError = job?.status === 'error';

        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-6.5 w-6.5 text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 group disabled:opacity-40"
                title={isActive ? "Geração em andamento…" : isError ? "Tentar gerar novamente" : "Gerar modelo automático"}
                disabled={isActive || enqueueJob.isPending}
                onClick={(e) => { e.preventDefault(); handleGenerateModel(file); }}
            >
                {isError
                    ? <RotateCw className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" />
                    : <Wand2 className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />}
            </Button>
        );
    };

    const renderFileRow = (file: AttachedFile, type: 'sent' | 'available', list: AttachedFile[]) => (
        <div key={file.id} className={cn(
            "flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-border/50 dark:border-slate-800 text-xs transition-all duration-300 shadow-sm hover:shadow-md",
            type === 'sent' ? "hover:border-indigo-300 dark:hover:border-indigo-700/50" : "hover:border-emerald-300 dark:hover:border-emerald-700/50",
            file.isDone && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
        )}>
            <div className="flex items-center gap-2 overflow-hidden">
                <Checkbox
                    checked={!!file.isDone}
                    disabled={!canEditProjects}
                    onCheckedChange={() => handleToggleFileDone(file, type, list)}
                    className={cn(
                        "rounded flex-shrink-0 h-3.5 w-3.5",
                        type === 'sent'
                            ? "data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                            : "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    )}
                />
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={cn("truncate font-medium transition-colors cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400", file.isDone && "text-muted-foreground line-through")} onClick={(e) => { e.preventDefault(); handleFileView(file); }}>{file.name}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p className="max-w-xs break-all">{file.name}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
                {type === 'sent' && renderJobBadge(file)}
                {type === 'sent' && renderGenerateButton(file)}
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group" title="Visualizar arquivo" onClick={(e) => { e.preventDefault(); handleFileView(file); }}>
                    <Eye className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-120" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group" title="Baixar" onClick={(e) => { e.preventDefault(); handleFileDownload(file); }}>
                    <Download className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />
                </Button>
                {canDeleteFiles && (
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 group" title="Excluir" onClick={(e) => { e.preventDefault(); handleRemoveFile(file, type, list); }}>
                    <Trash2 className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
                </Button>
                )}
            </div>
        </div>
    );

    const renderCategoryBlock = (
        type: 'sent' | 'available',
        modelType: ModelType | null,
        label: string,
        catFiles: AttachedFile[],
        allList: AttachedFile[]
    ) => {
        const isSent = type === 'sent';
        return (
            <div key={label} className={cn(
                "rounded-md border p-2 space-y-1.5",
                isSent
                    ? "border-indigo-100 dark:border-indigo-900/30 bg-white/50 dark:bg-slate-900/40"
                    : "border-emerald-100 dark:border-emerald-900/30 bg-white/50 dark:bg-slate-900/40"
            )}>
                <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                        isSent ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                        {label}
                        <span className="opacity-60 font-semibold">({catFiles.length})</span>
                    </span>
                    {modelType && canUploadFiles && (
                        <div className="flex items-center gap-1">
                            {isSent && catFiles.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[10px] text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                                    title="Gerar automaticamente todos os modelos desta categoria"
                                    onClick={(e) => { e.preventDefault(); handleGenerateCategory(modelType, catFiles); }}
                                    disabled={enqueueJob.isPending}
                                >
                                    <Wand2 className="h-3 w-3 mr-1" />
                                    Gerar todos
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-6 px-1.5 text-[10px]",
                                    isSent
                                        ? "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                )}
                                onClick={(e) => { e.preventDefault(); triggerUpload(type, modelType); }}
                                disabled={!!uploadingType}
                            >
                                {uploadingType === type && pendingUpload?.modelType === modelType
                                    ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    : <UploadCloud className="h-3 w-3 mr-1" />}
                                Anexar
                            </Button>
                        </div>
                    )}
                </div>
                {catFiles.length === 0 ? (
                    <div className={cn(
                        "text-[10px] text-muted-foreground text-center py-1.5 rounded border border-dashed",
                        isSent ? "border-indigo-200/60 dark:border-indigo-800/40" : "border-emerald-200/60 dark:border-emerald-800/40"
                    )}>
                        Nenhum modelo nesta categoria.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {catFiles.map(file => renderFileRow(file, type, allList))}
                    </div>
                )}
            </div>
        );
    };

    const renderCategorizedFiles = (type: 'sent' | 'available', filteredList: AttachedFile[], allList: AttachedFile[]) => {
        const uncategorized = filteredList.filter(
            f => !f.modelType || !MODEL_TYPES.some(m => m.value === f.modelType)
        );
        return (
            <div className="space-y-2">
                {MODEL_TYPES.map(cat =>
                    renderCategoryBlock(
                        type,
                        cat.value,
                        cat.label,
                        filteredList.filter(f => f.modelType === cat.value),
                        allList
                    )
                )}
                {uncategorized.length > 0 &&
                    renderCategoryBlock(type, null, 'Sem categoria', uncategorized, allList)}
            </div>
        );
    };

    const renderProgress = () => {
        if (!stage.sentFiles || stage.sentFiles.length === 0) return null;

        const totalModels = stage.sentFiles.length;
        const actualDone = stage.sentFiles.filter(f => f.isDone).length;

        return (
            <div className="w-full space-y-1.5 bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                    <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Progresso dos Modelos
                    </span>
                    <span>{actualDone} de {totalModels} ({Math.round((actualDone / totalModels) * 100)}%)</span>
                </div>
                <div className="h-1.5 w-full bg-indigo-100 dark:bg-indigo-900/20 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-500", actualDone === totalModels ? "bg-emerald-500" : "bg-indigo-500")}
                        style={{ width: `${(actualDone / totalModels) * 100}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="col-span-full w-full flex-1 flex flex-col min-h-0 space-y-3">
            {renderProgress()}

            {/* Force 2 columns always */}
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 w-full">
                {/* Modelos Enviados */}
                <div className="flex flex-col min-h-0 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 space-y-2">
                    <div className="flex items-center justify-between shrink-0">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <UploadCloud className="h-3.5 w-3.5" />
                            Modelos Enviados (Cliente)
                        </Label>
                        <input
                            type="file"
                            ref={sentFileInputRef}
                            className="hidden"
                            multiple
                            onChange={(e) => handleFileUpload(e, 'sent', stage.sentFiles)}
                        />
                        <div className="flex items-center gap-1.5">
                            {renderWorkerStatus()}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7.5 w-7.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                                title="Ver em tela cheia"
                                onClick={(e) => { e.preventDefault(); setViewingFullscreen('sent'); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                            </Button>
                        </div>
                    </div>
                    {stage.sentFiles && stage.sentFiles.length > 0 && (
                        <div className="relative mb-1.5 shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400" />
                            <Input
                                placeholder="Filtrar modelos do cliente..."
                                value={sentSearch}
                                onChange={(e) => setSentSearch(e.target.value)}
                                className="pl-8 h-8 text-[11px] bg-white/70 dark:bg-slate-900/70 border-indigo-100 dark:border-indigo-900/30 focus-visible:ring-indigo-500"
                            />
                        </div>
                    )}
                    {renderSelectionHeader('sent', filteredSentFiles)}
                    <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent hover:scrollbar-thumb-indigo-300 transition-colors">
                        {renderCategorizedFiles('sent', filteredSentFiles, stage.sentFiles || [])}
                    </div>
                </div>

                {/* Modelos Disponíveis */}
                <div className="flex flex-col min-h-0 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10 space-y-2">
                    <div className="flex items-center justify-between shrink-0">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Modelos Disponíveis (JSON)
                        </Label>
                        <input
                            type="file"
                            ref={availableFileInputRef}
                            className="hidden"
                            accept=".json"
                            multiple
                            onChange={(e) => handleFileUpload(e, 'available', stage.availableFiles)}
                        />
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7.5 w-7.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                title="Ver em tela cheia"
                                onClick={(e) => { e.preventDefault(); setViewingFullscreen('available'); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                            </Button>
                        </div>
                    </div>
                    {stage.availableFiles && stage.availableFiles.length > 0 && (
                        <div className="relative mb-1.5 shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-400" />
                            <Input
                                placeholder="Filtrar modelos JSON..."
                                value={availableSearch}
                                onChange={(e) => setAvailableSearch(e.target.value)}
                                className="pl-8 h-8 text-[11px] bg-white/70 dark:bg-slate-900/70 border-emerald-100 dark:border-emerald-900/30 focus-visible:ring-emerald-500"
                            />
                        </div>
                    )}
                    {renderSelectionHeader('available', filteredAvailableFiles)}
                    <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-transparent hover:scrollbar-thumb-emerald-300 transition-colors">
                        {renderCategorizedFiles('available', filteredAvailableFiles, stage.availableFiles || [])}
                    </div>
                </div>
            </div>

            {/* Fullscreen Viewer Dialog */}
            <Dialog open={!!viewingFullscreen} onOpenChange={(open) => !open && setViewingFullscreen(null)}>
                <DialogContent className="max-w-[90vw] w-full max-h-[90vh] h-full flex flex-col p-6">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                {viewingFullscreen === 'sent' ? (
                                    <><UploadCloud className="h-5 w-5 text-indigo-500" /> Modelos Enviados (Cliente)</>
                                ) : viewingFullscreen === 'available' ? (
                                    <><FileText className="h-5 w-5 text-emerald-500" /> Modelos Disponíveis (JSON)</>
                                ) : null}
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Gerenciamento avançado de arquivos do projeto.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto mt-4 pr-2">
                        {viewingFullscreen === 'sent' && (
                            <div className="space-y-3">
                                <div className="relative mb-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                                    <Input
                                        placeholder="Filtrar modelos do cliente..."
                                        value={sentSearch}
                                        onChange={(e) => setSentSearch(e.target.value)}
                                        className="pl-9 h-9 text-xs bg-white/70 dark:bg-slate-900/70 border-indigo-100 dark:border-indigo-900/30 focus-visible:ring-indigo-500"
                                    />
                                </div>
                                {renderSelectionHeader('sent', filteredSentFiles)}
                                {renderCategorizedFiles('sent', filteredSentFiles, stage.sentFiles || [])}
                            </div>
                        )}

                        {viewingFullscreen === 'available' && (
                            <div className="space-y-3">
                                <div className="relative mb-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                                    <Input
                                        placeholder="Filtrar modelos JSON..."
                                        value={availableSearch}
                                        onChange={(e) => setAvailableSearch(e.target.value)}
                                        className="pl-9 h-9 text-xs bg-white/70 dark:bg-slate-900/70 border-emerald-100 dark:border-emerald-900/30 focus-visible:ring-emerald-500"
                                    />
                                </div>
                                {renderSelectionHeader('available', filteredAvailableFiles)}
                                {renderCategorizedFiles('available', filteredAvailableFiles, stage.availableFiles || [])}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Andamento ao vivo da geração (o que o Claude está fazendo na VM) */}
            <Dialog open={!!progressJob} onOpenChange={(open) => !open && setProgressJobId(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            {progressJob?.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
                            {progressJob?.status === 'pending' && <Clock className="h-4 w-4 text-amber-500" />}
                            {progressJob?.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            {progressJob?.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                            {progressJob?.status === 'cancelled' && <Ban className="h-4 w-4 text-slate-400" />}
                            Andamento da geração
                        </DialogTitle>
                        <DialogDescription className="truncate">
                            {progressJob?.sourceFileName}
                            {progressJob && progressJob.attempts > 1 && (
                                <span className="ml-1 opacity-70">· tentativa {progressJob.attempts}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {progressJob && (
                        <ProgressBody
                            job={progressJob}
                            workerOnline={workerOnline}
                            queuePosition={getQueuePosition(progressJob)}
                            onCancel={() => {
                                if (confirm("Deseja cancelar esta geração?")) cancelJob(progressJob);
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Formata o horario de um passo (HH:mm:ss)
function formatStepTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString('pt-BR');
    } catch {
        return '';
    }
}

/**
 * Corpo do modal de andamento: mostra o passo atual e o feed rolável dos passos,
 * com auto-scroll para o fim conforme novos passos chegam via Realtime.
 */
function ProgressBody({ job, workerOnline, queuePosition, onCancel }: {
    job: ModelGenerationJob;
    workerOnline: boolean;
    queuePosition: number | null;
    onCancel: () => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const log = job.progressLog || [];

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight });
    }, [log.length, job.status]);

    // Relogio proprio para o "tempo decorrido" (so enquanto ativo)
    const [now, setNow] = useState(() => Date.now());
    const active = job.status === 'pending' || job.status === 'processing';
    useEffect(() => {
        if (!active) return;
        const t = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(t);
    }, [active]);

    const sinceIso = job.status === 'processing' ? (job.startedAt || job.createdAt) : job.createdAt;
    const mins = sinceIso ? Math.max(0, Math.floor((now - new Date(sinceIso).getTime()) / 60000)) : 0;
    const elapsedLabel = mins >= 1 ? `há ${mins} min` : "agora há pouco";
    const cancelInFlight = job.status === 'processing' && job.cancelRequested;

    const statusLine =
        job.status === 'pending'
            ? (workerOnline ? "Na fila — aguardando o gerador iniciar…" : "Na fila — o gerador está offline no momento. Vai começar assim que ele voltar.")
            : job.status === 'processing'
                ? (job.progress || "Gerando…")
                : job.status === 'done'
                    ? "Modelo gerado com sucesso e disponível na coluna “Modelos Disponíveis (JSON)”."
                    : job.status === 'cancelled'
                        ? "Geração cancelada."
                        : (job.errorMessage || "Falha na geração do modelo.");

    return (
        <div className="space-y-3">
            <div className={cn(
                "text-xs rounded-md border px-3 py-2 flex items-start gap-2",
                job.status === 'error'
                    ? "border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                    : job.status === 'done'
                        ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300"
                        : job.status === 'cancelled'
                            ? "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                            : "border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300"
            )}>
                {job.status === 'processing' && <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-spin" />}
                <span className="break-words">{statusLine}</span>
            </div>

            {active && (
                <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {job.status === 'pending'
                            ? <>Na fila{queuePosition && queuePosition > 1 ? ` · ${queuePosition}º` : ""} · {elapsedLabel}</>
                            : <>Em andamento {elapsedLabel}</>}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={(e) => { e.preventDefault(); onCancel(); }}
                        disabled={cancelInFlight}
                    >
                        <Ban className="h-3 w-3 mr-1" />
                        {cancelInFlight ? "Cancelando…" : "Cancelar"}
                    </Button>
                </div>
            )}

            {log.length > 0 ? (
                <div
                    ref={scrollRef}
                    className="max-h-72 overflow-y-auto rounded-md border border-border/60 bg-slate-50 dark:bg-slate-900/60 p-2 space-y-1 font-mono text-[10px] leading-relaxed scrollbar-thin"
                >
                    {log.map((s, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="text-muted-foreground shrink-0 tabular-nums">{formatStepTime(s.at)}</span>
                            <span className={cn(
                                "break-words",
                                s.kind === 'tool' && "text-indigo-600 dark:text-indigo-400",
                                s.kind === 'result' && "text-emerald-600 dark:text-emerald-400 font-semibold",
                                s.kind === 'system' && "text-muted-foreground",
                            )}>
                                {s.text}
                            </span>
                        </div>
                    ))}
                    {job.status === 'processing' && (
                        <div className="flex items-center gap-1 text-muted-foreground pt-0.5">
                            <Loader2 className="h-3 w-3 animate-spin" /> …
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-[11px] text-muted-foreground text-center py-6 border border-dashed rounded-md flex flex-col items-center gap-2">
                    {job.status === 'processing'
                        ? <><Activity className="h-4 w-4 animate-pulse" /> Aguardando os primeiros passos da IA…</>
                        : <><Terminal className="h-4 w-4 opacity-60" /> Sem detalhes de andamento para este item.</>}
                </div>
            )}

            {job.status === 'processing' && (
                <p className="text-[10px] text-muted-foreground">
                    A geração leva de 10 a 20 minutos. Você pode fechar esta janela — o andamento continua e o modelo aparece sozinho ao concluir.
                </p>
            )}
        </div>
    );
}
