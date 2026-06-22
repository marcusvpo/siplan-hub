import React, { useRef, useState } from "react";
import {
    FileText,
    UploadCloud,
    Download,
    Trash2,
    Eye,
    Loader2,
    CheckCircle2,
    Calendar,
    FileEdit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ProjectV2, AttachedFile, ModelosEditorStageV2 } from "@/types/ProjectV2";
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
    const { canUploadFiles, canDeleteFiles, canEditProjects } = usePermissions();
    const [uploadingType, setUploadingType] = useState<'sent' | 'available' | null>(null);

    const sentFileInputRef = useRef<HTMLInputElement>(null);
    const availableFileInputRef = useRef<HTMLInputElement>(null);

    const [viewingFullscreen, setViewingFullscreen] = useState<'sent' | 'available' | null>(null);

    const stage = project.stages.modelosEditor || ({} as ModelosEditorStageV2);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'sent' | 'available', currentFiles: AttachedFile[] = []) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadingType(type);
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
                    });
                }

                const fieldToUpdate = type === 'sent' ? 'sentFiles' : 'availableFiles';
                onUpdate({
                    [fieldToUpdate]: [...currentFiles, ...newAttachedFiles]
                });

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
                if (type === 'sent' && sentFileInputRef.current) sentFileInputRef.current.value = "";
                if (type === 'available' && availableFileInputRef.current) availableFileInputRef.current.value = "";
            }
        }
    };

    const handleFileDownload = async (file: AttachedFile) => {
        try {
            const url = await getDownloadUrl(file.path);
            window.open(url, "_blank");
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro no download",
                description: "Falha ao gerar o link do arquivo.",
                variant: "destructive",
            });
        }
    };

    const handleRemoveFile = async (file: AttachedFile, type: 'sent' | 'available', currentFiles: AttachedFile[]) => {
        if (confirm(`Tem certeza que deseja excluir ${file.name}?`)) {
            try {
                await deleteStorageFile.mutateAsync({ ...file, projectId: project.id, fileUrl: file.path } as any);

                const fieldToUpdate = type === 'sent' ? 'sentFiles' : 'availableFiles';
                onUpdate({
                    [fieldToUpdate]: currentFiles.filter((f) => f.id !== file.id)
                });

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
            title: "Baixando arquivos",
            description: `Iniciando o download de ${selectedFiles.length} arquivo(s)...`,
        });

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            try {
                const url = await getDownloadUrl(file.path);
                const link = document.createElement("a");
                link.href = url;
                link.target = "_blank";
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`Erro ao baixar ${file.name}:`, error);
            }
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
                }

                const fieldToUpdate = type === 'sent' ? 'sentFiles' : 'availableFiles';
                const remainingFiles = currentFiles.filter(f => !f.isDone);
                onUpdate({
                    [fieldToUpdate]: remainingFiles
                });

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
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7.5 w-7.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                                title="Ver em tela cheia"
                                onClick={(e) => { e.preventDefault(); setViewingFullscreen('sent'); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                            </Button>
                            {canUploadFiles && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7.5 text-[11px] border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                                onClick={(e) => { e.preventDefault(); sentFileInputRef.current?.click(); }}
                                disabled={!!uploadingType}
                            >
                                {uploadingType === 'sent' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <UploadCloud className="h-3 w-3 mr-1" />}
                                Anexar
                            </Button>
                            )}
                        </div>
                    </div>
                    {(!stage.sentFiles || stage.sentFiles.length === 0) && (
                        <div className="text-xs text-muted-foreground dark:text-slate-400 text-center py-4 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-800/50 flex-1 flex items-center justify-center">
                            Nenhum modelo do cliente anexado.
                        </div>
                    )}
                    {stage.sentFiles && stage.sentFiles.length > 0 && (
                        <>
                            {renderSelectionHeader('sent', stage.sentFiles)}
                            <div className="flex-1 overflow-y-auto pr-1.5 space-y-1 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent hover:scrollbar-thumb-indigo-300 transition-colors">
                                {stage.sentFiles.map(file => renderFileRow(file, 'sent', stage.sentFiles!))}
                            </div>
                        </>
                    )}
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
                            {canUploadFiles && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7.5 text-[11px] border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                onClick={(e) => { e.preventDefault(); availableFileInputRef.current?.click(); }}
                                disabled={!!uploadingType}
                            >
                                {uploadingType === 'available' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <UploadCloud className="h-3 w-3 mr-1" />}
                                Anexar JSON
                            </Button>
                            )}
                        </div>
                    </div>
                    {(!stage.availableFiles || stage.availableFiles.length === 0) && (
                        <div className="text-xs text-muted-foreground dark:text-slate-400 text-center py-4 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-dashed border-emerald-200 dark:border-emerald-800/50 flex-1 flex items-center justify-center">
                            Nenhum JSON de modelo anexado.
                        </div>
                    )}
                    {stage.availableFiles && stage.availableFiles.length > 0 && (
                        <>
                            {renderSelectionHeader('available', stage.availableFiles)}
                            <div className="flex-1 overflow-y-auto pr-1.5 space-y-1 scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-transparent hover:scrollbar-thumb-emerald-300 transition-colors">
                                {stage.availableFiles.map(file => renderFileRow(file, 'available', stage.availableFiles!))}
                            </div>
                        </>
                    )}
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
                            (!stage.sentFiles || stage.sentFiles.length === 0) ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <UploadCloud className="h-12 w-12 mb-4 opacity-20" />
                                    Nenhum modelo do cliente anexado.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {renderSelectionHeader('sent', stage.sentFiles!)}
                                    {stage.sentFiles.map(file => renderFileRow(file, 'sent', stage.sentFiles!))}
                                </div>
                            )
                        )}

                        {viewingFullscreen === 'available' && (
                            (!stage.availableFiles || stage.availableFiles.length === 0) ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                                    Nenhum JSON de modelo anexado.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {renderSelectionHeader('available', stage.availableFiles!)}
                                    {stage.availableFiles.map(file => renderFileRow(file, 'available', stage.availableFiles!))}
                                </div>
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
