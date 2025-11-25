import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useProjectFiles = (projectId: string) => {
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase.from("project_files").insert({
        project_id: projectId,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        uploaded_by: "Bruno Fernandes",
        mime_type: file.type,
      });

      if (dbError) throw dbError;

      // Add timeline event
      await supabase.from("timeline_events").insert({
        project_id: projectId,
        type: "auto",
        author: "Sistema",
        message: `Arquivo "${file.name}" enviado por Bruno Fernandes`,
      });

      return fileName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Arquivo enviado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar arquivo: " + error.message);
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (!file) throw new Error("Arquivo não encontrado");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("project_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      // Add timeline event
      await supabase.from("timeline_events").insert({
        project_id: projectId,
        type: "auto",
        author: "Sistema",
        message: `Arquivo "${file.file_name}" removido`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Arquivo removido!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover arquivo: " + error.message);
    },
  });

  const getDownloadUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("project-files")
      .createSignedUrl(filePath, 60);

    return data?.signedUrl;
  };

  return {
    files,
    isLoading,
    uploadFile,
    deleteFile,
    getDownloadUrl,
  };
};
