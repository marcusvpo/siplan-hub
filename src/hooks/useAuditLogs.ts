import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuditLog } from "@/types/admin";

export function useAuditLogs() {
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          profile:profiles(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Flatten/Map profile if needed, but Supabase returns it as joined object
      return data.map(log => ({
        ...log,
        profile: log.profile // Supabase returns single object for 1:1 relation
      })) as AuditLog[];
    },
  });

  const logAction = useMutation({
    mutationFn: async ({ action, details }: { action: string; details: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("audit_logs")
        .insert({
          user_id: user.id,
          action,
          details
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });

  return { logs, isLoading, logAction };
}
