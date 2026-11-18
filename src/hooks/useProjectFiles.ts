import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectFile } from "@/types/ProjectV2";
import { recordProjectActivityLog, resolveCurrentActor } from "@/services/projectLogService";

function formatFileSizeForLog(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const useProjectFiles = (projectId: string) => {
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ["projectFiles", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      return data.map((file) => ({
        id: file.id,
        projectId: file.project_id,
        fileName: file.file_name,
        fileSize: file.file_size,
        fileType: file.mime_type,
        fileUrl: file.file_path, // We'll generate signed URLs on demand or use this as path
        uploadedBy: file.uploaded_by,
        uploadedAt: new Date(file.uploaded_at),
        versions: [], // Not supported in DB yet
      })) as ProjectFile[];
    },
    enabled: !!projectId,
  });

  const uploadFile = useMutation({
    mutationFn: async ({ file, uploadedBy }: { file: File; uploadedBy: string }) => {
      const actor = await resolveCurrentActor();
      const effectiveUploadedBy =
        uploadedBy && uploadedBy !== "Admin"
          ? uploadedBy
          : actor.userId || actor.fullName !== "Sistema"
            ? actor.fullName
            : uploadedBy || "Usuário";

      // Sanitize filename to avoid "Invalid key" errors with special characters
      const sanitize = (name: string) => {
        return name
          .normalize('NFKD') // Separate accents
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^\w.\-() ]+/g, '') // Remove invalid chars
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .slice(0, 200); // Limit length
      };

      const sanitizedFileName = sanitize(file.name);
      const filePath = `${projectId}/${crypto.randomUUID()}-${sanitizedFileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert into DB
      const { data, error: dbError } = await supabase
        .from("project_files")
        .insert({
          project_id: projectId,
          file_name: file.name, // Store original name for display
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: effectiveUploadedBy,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projectFiles", projectId] });
      if (data) {
        const sizeLabel = formatFileSizeForLog(data.file_size);
        void recordProjectActivityLog({
          projectId,
          type: "file_upload",
          category: "files",
          actionType: "file_upload",
          tabLabel: "Arquivos",
          fieldLabel: "Arquivo Anexado",
          newValue: `${data.file_name} (${sizeLabel})`,
          changes: [
            {
              field: "project_files",
              label: "Novo Arquivo",
              oldValue: "(nenhum)",
              newValue: `${data.file_name} (${sizeLabel})`,
            },
          ],
          message: `Arquivo enviado: "${data.file_name}"`,
          extraMetadata: {
            fileId: data.id,
            fileName: data.file_name,
            fileSize: data.file_size,
            mimeType: data.mime_type,
          },
          queryClient,
        });
      }
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (file: ProjectFile) => {
      // 1. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([file.fileUrl]); // fileUrl stores the path

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue to delete from DB even if storage fails (orphan cleanup)
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from("project_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;
    },
    onSuccess: (_data, file) => {
      queryClient.invalidateQueries({ queryKey: ["projectFiles", projectId] });
      void recordProjectActivityLog({
        projectId,
        type: "file_delete",
        category: "files",
        actionType: "file_delete",
        tabLabel: "Arquivos",
        fieldLabel: "Arquivo Excluído",
        oldValue: file.fileName,
        newValue: "(excluído)",
        changes: [
          {
            field: "project_files",
            label: "Arquivo",
            oldValue: file.fileName,
            newValue: "(excluído)",
          },
        ],
        message: `Arquivo excluído: "${file.fileName}"`,
        extraMetadata: {
          fileId: file.id,
          fileName: file.fileName,
          fileSize: file.fileSize,
        },
        queryClient,
      });
    },
  });

  const deleteFiles = useMutation({
    mutationFn: async (filesToDelete: ProjectFile[]) => {
      if (filesToDelete.length === 0) return;

      // 1. Delete all from Storage
      const paths = filesToDelete.map((f) => f.fileUrl);
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove(paths);

      if (storageError) {
        console.error("Bulk Storage delete error:", storageError);
      }

      // 2. Delete all from DB
      const ids = filesToDelete.map((f) => f.id);
      const { error: dbError } = await supabase
        .from("project_files")
        .delete()
        .in("id", ids);

      if (dbError) throw dbError;
    },
    onSuccess: (_data, filesToDelete) => {
      queryClient.invalidateQueries({ queryKey: ["projectFiles", projectId] });
      if (filesToDelete.length > 0) {
        const namesList = filesToDelete.map((f) => f.fileName).join(", ");
        void recordProjectActivityLog({
          projectId,
          type: "file_delete",
          category: "files",
          actionType: "file_delete",
          tabLabel: "Arquivos",
          fieldLabel: "Exclusão em Massa",
          oldValue: namesList,
          newValue: "(excluídos)",
          changes: [
            {
              field: "project_files",
              label: `Arquivos Excluídos (${filesToDelete.length})`,
              oldValue: namesList,
              newValue: "(excluídos)",
            },
          ],
          message: `${filesToDelete.length} arquivo(s) excluído(s) em massa`,
          extraMetadata: {
            count: filesToDelete.length,
            fileNames: filesToDelete.map((f) => f.fileName),
          },
          queryClient,
        });
      }
    },
  });

  const getDownloadUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("project-files")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  };

  return {
    files: files || [],
    isLoading,
    uploadFile,
    deleteFile,
    deleteFiles,
    getDownloadUrl,
  };
};
