import { ProjectV2, ProjectFile } from "@/types/ProjectV2";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, MoreHorizontal, UploadCloud, FolderPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TabProps {
  project: ProjectV2;
  onUpdate: (project: ProjectV2) => void;
}

export function FilesTab({ project, onUpdate }: TabProps) {
  const { data } = useAutoSave(project, async (newData) => {
    onUpdate(newData);
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Arquivos do Projeto</h3>
          <p className="text-sm text-muted-foreground">Gerencie documentos, contratos e evidências.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova Pasta
          </Button>
          <Button>
            <UploadCloud className="h-4 w-4 mr-2" />
            Upload Arquivo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(!data.files || data.files.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium">Nenhum arquivo enviado</h4>
              <p className="text-sm text-muted-foreground mb-4">Arraste arquivos aqui ou clique para fazer upload.</p>
              <Button variant="outline">Selecionar Arquivos</Button>
            </CardContent>
          </Card>
        )}

        {(data.files || []).map((file) => (
          <Card key={file.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{file.fileName}</h4>
                  <Badge variant="secondary" className="text-[10px] h-5">v{file.versions.length}</Badge>
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
                <Button variant="ghost" size="icon" title="Visualizar">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Baixar">
                  <Download className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Ver Histórico de Versões</DropdownMenuItem>
                    <DropdownMenuItem>Renomear</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Excluir</DropdownMenuItem>
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
