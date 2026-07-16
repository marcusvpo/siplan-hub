import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { DeploymentFormData } from "@/utils/deployment-template";

export interface DeploymentFormRecord extends DeploymentFormData {
  id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export function useDeploymentForms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["deployment-forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deployment_forms" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DeploymentFormRecord[];
    },
  });

  const createForm = useMutation({
    mutationFn: async (formData: Omit<DeploymentFormData, 'filled_at'>) => {
      const { data, error } = await supabase
        .from("deployment_forms" as any)
        .insert({
          ...formData,
          created_by: user?.id,
          filled_at: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DeploymentFormRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-forms"] });
      toast({ title: "Sucesso", description: "Formulário salvo com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao salvar formulário.", variant: "destructive" });
    },
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("deployment_forms" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-forms"] });
      toast({ title: "Excluído", description: "Formulário excluído com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao excluir formulário.", variant: "destructive" });
    },
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: Partial<DeploymentFormData> }) => {
      const { data, error } = await supabase
        .from("deployment_forms" as any)
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DeploymentFormRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-forms"] });
      toast({ title: "Sucesso", description: "Formulário de implantação atualizado com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message || "Erro ao atualizar formulário.", variant: "destructive" });
    },
  });

  return { forms, isLoading, createForm, deleteForm, updateForm };
}
