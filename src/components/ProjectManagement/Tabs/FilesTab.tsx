import { ProjectV2, ProjectFile } from "@/types/ProjectV2";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  UploadCloud,
  FolderPlus,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

export function FilesTab({ project }: TabProps) {
  const { files, uploadFile, deleteFile, deleteFiles, getDownloadUrl, isLoading } =
    useProjectFiles(project.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const totalFiles = filesArray.length;

      setIsUploading(true);
      setUploadProgress({ current: 0, total: totalFiles });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setUploadProgress({ current: i + 1, total: totalFiles });

        try {
          await uploadFile.mutateAsync({
            file,
            uploadedBy: "Admin", // TODO: Get actual user from auth context
          });
          successCount++;
        } catch (error) {
          console.error(`Erro ao enviar ${file.name}:`, error);
          errorCount++;
        }
      }

      // Mostrar toast com resultado final
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: "Arquivos enviados",
          description:
            successCount === 1
              ? `1 arquivo foi enviado com sucesso.`
              : `${successCount} arquivos foram enviados com sucesso.`,
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "Upload parcial",
          description: `${successCount} arquivo(s) enviado(s), ${errorCount} falha(s).`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao enviar",
          description: "Não foi possível enviar os arquivos.",
          variant: "destructive",
        });
      }

      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = async (file: ProjectFile) => {
    try {
      const url = await getDownloadUrl(file.fileUrl);
      window.open(url, "_blank");
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível gerar o link de download.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (file: ProjectFile) => {
    if (confirm(`Tem certeza que deseja excluir ${file.fileName}?`)) {
      try {
        await deleteFile.mutateAsync(file);
        toast({
          title: "Arquivo excluído",
          description: "O arquivo foi removido com sucesso.",
        });
        setSelectedFileIds(prev => prev.filter(id => id !== file.id));
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o arquivo.",
          variant: "destructive",
        });
      }
    }
  };

  const handleBulkDelete = async () => {
    const filesToDelete = files.filter(f => selectedFileIds.includes(f.id));
    if (filesToDelete.length === 0) return;

    if (confirm(`Tem certeza que deseja excluir ${filesToDelete.length} arquivos selecionados?`)) {
      try {
        await deleteFiles.mutateAsync(filesToDelete);
        toast({
          title: "Arquivos excluídos",
          description: "Os arquivos selecionados foram removidos com sucesso.",
        });
        setSelectedFileIds([]);
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir os arquivos selecionados.",
          variant: "destructive",
        });
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map(f => f.id));
    }
  };

  const toggleSelectFile = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Arquivos do Projeto</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie documentos, contratos e evidências.
          </p>
        </div>
        <div className="flex gap-2">
          {files.length > 0 && (
            <Button
              variant="outline"
              onClick={toggleSelectAll}
              className="text-xs font-medium h-9"
            >
              {selectedFileIds.length === files.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            multiple
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4 mr-2" />
            )}
            {isUploading
              ? uploadProgress.total > 1
                ? `Enviando ${uploadProgress.current}/${uploadProgress.total}...`
                : "Enviando..."
              : "Upload Arquivos"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && files.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium">Nenhum arquivo enviado</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Clique no botão de upload para adicionar arquivos.
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Selecionar Arquivos
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Você pode selecionar múltiplos arquivos de uma vez.
              </p>
            </CardContent>
          </Card>
        )}

        {files.map((file) => (
          <Card key={file.id} className={`hover:shadow-sm transition-shadow ${selectedFileIds.includes(file.id) ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedFileIds.includes(file.id)}
                  onCheckedChange={() => toggleSelectFile(file.id)}
                />
                <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{file.fileName}</h4>
                  {/* <Badge variant="secondary" className="text-[10px] h-5">v{file.versions.length}</Badge> */}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatSize(file.fileSize)}</span>
                  <span>•</span>
                  <span>Enviado por {file.uploadedBy}</span>
                  <span>•</span>
                  <span>
                    {format(new Date(file.uploadedAt), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Visualizar"
                  onClick={() => handleDownload(file)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Baixar"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="Excluir"
                  onClick={() => handleDelete(file)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra de Ações em Massa */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full">
              {selectedFileIds.length}
            </span>
            <span className="text-sm font-medium">Marcados</span>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="rounded-full px-4 h-9 shadow-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Selecionados
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFileIds([])}
              className="rounded-full px-4 h-9 text-slate-500"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
