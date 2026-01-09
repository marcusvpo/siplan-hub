import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTimelineEvents = (projectId: string | null) => {
  return useQuery({
    queryKey: ["timelineEvents", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("project_id", projectId)
        .order("timestamp", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
};
