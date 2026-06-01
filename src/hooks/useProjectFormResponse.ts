import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectFormResponse {
  id: string;
  project_id: string;
  template_id: string;
  stage: 'adherence' | 'conversion';
  data: any;
  status: 'draft' | 'submitted' | 'approved';
  filled_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertResponseInput {
  project_id: string;
  template_id: string;
  stage: 'adherence' | 'conversion';
  data: any;
  status?: 'draft' | 'submitted' | 'approved';
}

export function useProjectFormResponse(projectId: string, stage: 'adherence' | 'conversion') {
  return useQuery<ProjectFormResponse | null, Error>({
    queryKey: ["projectFormResponse", projectId, stage],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("project_form_responses")
        .select("*")
        .eq("project_id", projectId)
        .eq("stage", stage)
        .maybeSingle();

      if (error) throw error;
      return data as ProjectFormResponse | null;
    },
    enabled: !!projectId,
  });
}

export function useUpsertFormResponse() {
  const queryClient = useQueryClient();

  return useMutation<ProjectFormResponse, Error, UpsertResponseInput>({
    mutationFn: async (input) => {
      // 1. Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // 2. Check if a response already exists
      const { data: existing, error: checkError } = await supabase
        .from("project_form_responses")
        .select("id, status")
        .eq("project_id", input.project_id)
        .eq("stage", input.stage)
        .maybeSingle();

      if (checkError) throw checkError;

      const now = new Date().toISOString();
      const status = input.status || (existing?.status as ProjectFormResponse['status']) || 'draft';

      let responseData: any;

      if (existing) {
        // Prepare updates
        const updates: any = {
          template_id: input.template_id,
          data: input.data,
          status,
          updated_at: now,
        };

        // If transitioning to submitted
        if (status === 'submitted' && existing.status !== 'submitted') {
          updates.submitted_at = now;
          updates.filled_by = userId;
        }

        // If transitioning to approved
        if (status === 'approved' && existing.status !== 'approved') {
          updates.approved_at = now;
          updates.approved_by = userId;
        }

        const { data, error: updateError } = await supabase
          .from("project_form_responses")
          .update(updates)
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        responseData = data;
      } else {
        // Prepare insert
        const inserts: any = {
          project_id: input.project_id,
          template_id: input.template_id,
          stage: input.stage,
          data: input.data,
          status,
          created_at: now,
          updated_at: now,
        };

        if (status === 'submitted') {
          inserts.submitted_at = now;
          inserts.filled_by = userId;
        } else if (status === 'approved') {
          inserts.approved_at = now;
          inserts.approved_by = userId;
        } else {
          inserts.filled_by = userId;
        }

        const { data, error: insertError } = await supabase
          .from("project_form_responses")
          .insert(inserts)
          .select()
          .single();

        if (insertError) throw insertError;
        responseData = data;
      }

      return responseData as ProjectFormResponse;
    },
    onSuccess: (data) => {
      // Invalidate project details to force reload and trigger the stage status update on project details
      queryClient.invalidateQueries({ queryKey: ["projectFormResponse", data.project_id, data.stage] });
      queryClient.invalidateQueries({ queryKey: ["projectDetails", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectsV3"] });
      queryClient.invalidateQueries({ queryKey: ["projectsV3_with_dates"] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    },
  });
}
