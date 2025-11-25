import { useState } from "react";
import { Upload, File, Trash2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { toast } from "sonner";
import { formatBytes } from "@/utils/formatBytes";

interface FileManagerProps {
  projectId: string;
}

export const FileManager = ({ projectId }: FileManagerProps) => {
  const { files, isLoading, uploadFile, deleteFile, getDownloadUrl } = useProjectFiles(projectId);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 100MB
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande! Limite de 100MB por arquivo.");
      return;
    }

    setUploading(true);
    try {
      await uploadFile.mutateAsync(file);
      toast.success("Arquivo enviado com sucesso!");
      e.target.value = ""; // Reset input
    } catch (error) {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Deseja realmente remover o arquivo "${fileName}"?`)) return;

    try {
      await deleteFile.mutateAsync(fileId);
      toast.success("Arquivo removido com sucesso!");
    } catch (error) {
      toast.error("Erro ao remover arquivo");
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const url = await getDownloadUrl(filePath);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Erro ao baixar arquivo");
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="file-upload" className="text-base font-semibold">
            Arquivos do Projeto
          </Label>
          <p className="text-sm text-muted-foreground">
            Limite de 100MB por arquivo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={uploading}
            className="relative"
            asChild
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? "Enviando..." : "Enviar Arquivo"}
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum arquivo enviado ainda</p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.file_size)} • {new Date(file.uploaded_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(file.file_path, file.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(file.id, file.file_name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};
