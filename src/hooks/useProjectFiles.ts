import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectFile } from "@/types/ProjectV2";

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
          uploaded_by: uploadedBy,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectFiles", projectId] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectFiles", projectId] });
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
    getDownloadUrl,
  };
};
