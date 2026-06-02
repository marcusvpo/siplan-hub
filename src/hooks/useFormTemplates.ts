import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FormTemplate {
  id: string;
  kind: 'adherence' | 'homologation_checklist' | 'commercial_checklist';
  system_type: string;
  version: number;
  schema_json: any;
  ui_json: any;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  notes?: string;
  profiles?: {
    full_name: string;
  } | null;
}

export interface NewTemplateInput {
  kind: 'adherence' | 'homologation_checklist' | 'commercial_checklist';
  system_type: string;
  schema_json: any;
  ui_json: any;
  notes?: string;
}

export function useFormTemplates(kind: 'adherence' | 'homologation_checklist' | 'commercial_checklist', systemType?: string) {
  return useQuery<FormTemplate[], Error>({
    queryKey: ["formTemplates", kind, systemType],
    queryFn: async () => {
      let query = supabase
        .from("form_templates")
        .select("*")
        .eq("kind", kind)
        .order("version", { ascending: false });

      if (systemType) {
        query = query.eq("system_type", systemType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const templates = (data || []) as FormTemplate[];

      // Fetch profiles separately to resolve creator names without requiring direct FK relationships
      const userIds = Array.from(new Set(templates.map(t => t.created_by).filter(Boolean))) as string[];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (!profilesError && profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));
          templates.forEach(t => {
            if (t.created_by && profileMap.has(t.created_by)) {
              t.profiles = {
                full_name: profileMap.get(t.created_by) || ""
              };
            }
          });
        }
      }

      return templates;
    },
  });
}

export function useActiveTemplate(kind: 'adherence' | 'homologation_checklist' | 'commercial_checklist', systemType: string) {
  return useQuery<FormTemplate | undefined, Error>({
    queryKey: ["activeTemplate", kind, systemType],
    queryFn: async () => {
      if (!systemType) return undefined;
      
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("kind", kind)
        .eq("system_type", systemType)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as FormTemplate | undefined;
    },
    enabled: !!systemType,
  });
}

export function usePublishTemplate() {
  const queryClient = useQueryClient();

  return useMutation<FormTemplate, Error, NewTemplateInput>({
    mutationFn: async (input) => {
      // 1. Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // 2. Fetch the latest version for this kind & system_type
      const { data: latest, error: fetchError } = await supabase
        .from("form_templates")
        .select("version")
        .eq("kind", input.kind)
        .eq("system_type", input.system_type)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const nextVersion = latest ? latest.version + 1 : 1;

      // 3. Set all other versions of this kind/system_type as inactive
      const { error: updateError } = await supabase
        .from("form_templates")
        .update({ is_active: false })
        .eq("kind", input.kind)
        .eq("system_type", input.system_type);

      if (updateError) throw updateError;

      // 4. Insert the new active template
      const { data, error: insertError } = await supabase
        .from("form_templates")
        .insert({
          kind: input.kind,
          system_type: input.system_type,
          version: nextVersion,
          schema_json: input.schema_json,
          ui_json: input.ui_json,
          is_active: true,
          created_by: userId,
          notes: input.notes,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data as FormTemplate;
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh lists and active status
      queryClient.invalidateQueries({ queryKey: ["formTemplates", data.kind, data.system_type] });
      queryClient.invalidateQueries({ queryKey: ["formTemplates", data.kind] });
      queryClient.invalidateQueries({ queryKey: ["activeTemplate", data.kind, data.system_type] });
    },
  });
}
