import { ProjectV2, ProjectFile } from "@/types/ProjectV2";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, MoreHorizontal, UploadCloud, FolderPlus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

export function FilesTab({ project }: TabProps) {
  const { files, uploadFile, deleteFile, getDownloadUrl, isLoading } = useProjectFiles(project.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        await uploadFile.mutateAsync({ 
          file, 
          uploadedBy: "Admin" // TODO: Get actual user from auth context
        });
        toast({
          title: "Arquivo enviado",
          description: `${file.name} foi enviado com sucesso.`,
        });
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro ao enviar",
          description: "Não foi possível enviar o arquivo.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Arquivos do Projeto</h3>
          <p className="text-sm text-muted-foreground">Gerencie documentos, contratos e evidências.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* <Button variant="outline">
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova Pasta
          </Button> */}
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4 mr-2" />
            )}
            {isUploading ? "Enviando..." : "Upload Arquivo"}
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
              <p className="text-sm text-muted-foreground mb-4">Clique no botão de upload para adicionar arquivos.</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Selecionar Arquivos</Button>
            </CardContent>
          </Card>
        )}

        {files.map((file) => (
          <Card key={file.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
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
                  <span>{format(new Date(file.uploadedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" title="Visualizar" onClick={() => handleDownload(file)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Baixar" onClick={() => handleDownload(file)}>
                  <Download className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* <DropdownMenuItem>Ver Histórico de Versões</DropdownMenuItem>
                    <DropdownMenuItem>Renomear</DropdownMenuItem> */}
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(file)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
