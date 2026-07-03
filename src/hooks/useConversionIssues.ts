import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConversionIssue {
  id: string;
  projectId: string;
  clientName?: string;
  ticketNumber?: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  ticketNumber0800: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  reportedBy: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolutionNotes: string | null;
}

export function useConversionIssues(projectId?: string) {
  const queryClient = useQueryClient();

  // 1. Query: Listar pendências
  const { data: issues = [], isLoading, error } = useQuery({
    queryKey: projectId ? ["conversionIssues", projectId] : ["conversionIssues"],
    queryFn: async () => {
      let query = supabase
        .from("conversion_issues")
        .select(`
          *,
          projects (
            client_name,
            ticket_number
          )
        `);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      // Order by priority (critical, high, medium, low) and creation date
      const { data, error: fetchError } = await query.order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Map DB row to Frontend Interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((item: any) => ({
        id: item.id,
        projectId: item.project_id,
        clientName: item.projects?.client_name,
        ticketNumber: item.projects?.ticket_number,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        ticketNumber0800: item.ticket_number_0800,
        assignedTo: item.assigned_to,
        assignedToName: null, // Resolved below or left null
        reportedBy: item.reported_by,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        resolvedAt: item.resolved_at ? new Date(item.resolved_at) : null,
        resolvedBy: item.resolved_by,
        resolvedByName: null,
        resolutionNotes: item.resolution_notes,
      })) as ConversionIssue[];
    },
  });

  // Helper to invalidate all related queries
  const invalidateQueries = (targetProjectId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["conversionIssues"] });
    if (targetProjectId) {
      queryClient.invalidateQueries({ queryKey: ["conversionIssues", targetProjectId] });
    }
    // Also invalidate project details to refresh timeline
    if (targetProjectId || projectId) {
      queryClient.invalidateQueries({ queryKey: ["projectDetails", targetProjectId || projectId] });
    }
  };

  // 2. Mutation: Criar pendência
  const createIssue = useMutation({
    mutationFn: async (issue: Omit<ConversionIssue, "id" | "createdAt" | "updatedAt" | "resolvedAt" | "resolvedBy" | "resolvedByName" | "resolvedByEmail" | "assignedToName">) => {
      const { data, error: insertError } = await supabase
        .from("conversion_issues")
        .insert({
          project_id: issue.projectId,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          priority: issue.priority,
          ticket_number_0800: issue.ticketNumber0800,
          assigned_to: issue.assignedTo,
          reported_by: issue.reportedBy,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: (data) => {
      invalidateQueries(data.project_id);
      toast.success("Pendência de conversão cadastrada com sucesso!");
    },
    onError: (err) => {
      console.error("Error creating conversion issue:", err);
      toast.error("Erro ao cadastrar pendência de conversão.");
    },
  });

  // 3. Mutation: Atualizar pendência (delegar, mudar status, etc)
  const updateIssue = useMutation({
    mutationFn: async ({ id, updates, targetProjectId }: { id: string; updates: Partial<any>; targetProjectId: string }) => {
      const { data, error: updateError } = await supabase
        .from("conversion_issues")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;
      return { data, targetProjectId };
    },
    onSuccess: ({ data, targetProjectId }) => {
      invalidateQueries(targetProjectId);
      toast.success("Pendência atualizada com sucesso!");
    },
    onError: (err) => {
      console.error("Error updating conversion issue:", err);
      toast.error("Erro ao atualizar pendência.");
    },
  });

  // 4. Mutation: Resolver pendência
  const resolveIssue = useMutation({
    mutationFn: async ({
      id,
      notes,
      resolvedByUserId,
      targetProjectId,
    }: {
      id: string;
      notes: string;
      resolvedByUserId: string;
      targetProjectId: string;
    }) => {
      const { data, error: resolveError } = await supabase
        .from("conversion_issues")
        .update({
          status: "resolved",
          resolution_notes: notes,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedByUserId,
        })
        .eq("id", id)
        .select()
        .single();

      if (resolveError) throw resolveError;
      return { data, targetProjectId };
    },
    onSuccess: ({ data, targetProjectId }) => {
      invalidateQueries(targetProjectId);
      toast.success("Pendência marcada como resolvida!");
    },
    onError: (err) => {
      console.error("Error resolving conversion issue:", err);
      toast.error("Erro ao resolver pendência.");
    },
  });

  return {
    issues,
    isLoading,
    error,
    createIssue,
    updateIssue,
    resolveIssue,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["conversionIssues", projectId || ""] }),
  };
}
