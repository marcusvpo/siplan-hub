import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface CommercialChecklistRecord {
  id: string;
  project_id: string;
  created_by?: string;
  created_by_name?: string;
  status: "pending" | "submitted";
  responses: any;
  template_id?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  projects?: {
    id: string;
    clientName: string;
    ticketNumber: string;
    systemType: string;
    globalStatus: string;
  };
}

export function useCommercialChecklists() {
  const { user, fullName } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["commercial-checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_checklists" as any)
        .select("*, projects:project_id(id, client_name, ticket_number, system_type, global_status)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map snake_case keys from projects relation to camelCase
      const mappedData = (data || []).map((item: any) => {
        const proj = item.projects;
        return {
          ...item,
          projects: proj ? {
            id: proj.id,
            clientName: proj.client_name,
            ticketNumber: proj.ticket_number,
            systemType: proj.system_type,
            globalStatus: proj.global_status,
          } : undefined
        };
      });

      return mappedData as CommercialChecklistRecord[];
    },
  });

  const createChecklist = useMutation({
    mutationFn: async (projectId: string) => {
      // 1. Fetch project to get its system_type
      const { data: proj, error: projError } = await supabase
        .from("projects")
        .select("system_type")
        .eq("id", projectId)
        .single();
      if (projError) throw projError;

      const systemType = proj?.system_type || "Orion TN";

      // 2. Fetch active template for 'commercial_checklist' and systemType
      const { data: activeTemplate, error: tplError } = await supabase
        .from("form_templates")
        .select("id")
        .eq("kind", "commercial_checklist")
        .eq("system_type", systemType)
        .eq("is_active", true)
        .maybeSingle();

      const templateId = activeTemplate?.id || null;

      // 3. Insert commercial checklist with template_id
      const { data, error } = await supabase
        .from("commercial_checklists" as any)
        .insert({
          project_id: projectId,
          created_by: user?.id,
          created_by_name: fullName || "Comercial",
          status: "pending",
          responses: {},
          template_id: templateId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commercial-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["project-commercial-checklist"] });
      toast({ title: "Sucesso", description: "Link do checklist gerado com sucesso." });
    },
    onError: (err: any) => {
      console.error(err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao criar checklist. Talvez já exista um para este projeto.",
        variant: "destructive",
      });
    },
  });

  const submitChecklist = useMutation({
    mutationFn: async ({ id, responses }: { id: string; responses: any }) => {
      const { data, error } = await supabase
        .from("commercial_checklists" as any)
        .update({
          responses,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commercial-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["commercial-checklist", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["project-commercial-checklist"] });
      toast({ title: "Sucesso", description: "Respostas enviadas com sucesso!" });
    },
    onError: (err: any) => {
      console.error(err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao enviar respostas.",
        variant: "destructive",
      });
    },
  });

  const deleteChecklist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("commercial_checklists" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commercial-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["project-commercial-checklist"] });
      toast({ title: "Sucesso", description: "Checklist excluído com sucesso." });
    },
    onError: (err: any) => {
      console.error(err);
      toast({ title: "Erro", description: "Erro ao excluir checklist.", variant: "destructive" });
    },
  });

  return { checklists, isLoading, createChecklist, submitChecklist, deleteChecklist };
}

export function useSingleCommercialChecklist(id: string | null) {
  return useQuery({
    queryKey: ["commercial-checklist", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("commercial_checklists" as any)
        .select("*, projects:project_id(id, client_name, ticket_number, system_type, global_status)")
        .eq("id", id)
        .single();

      if (error) throw error;

      const proj = data.projects;
      return {
        ...data,
        projects: proj ? {
          id: proj.id,
          clientName: proj.client_name,
          ticketNumber: proj.ticket_number,
          systemType: proj.system_type,
          globalStatus: proj.global_status,
        } : undefined
      } as CommercialChecklistRecord;
    },
    enabled: !!id,
  });
}
