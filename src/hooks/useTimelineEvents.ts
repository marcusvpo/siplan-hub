import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectLogMetadata } from "@/services/projectLogService";

export interface TimelineEventRecord {
  id: string;
  project_id: string;
  type: string;
  author: string;
  message: string;
  timestamp: string;
  metadata: ProjectLogMetadata | null;
}

export const useTimelineEvents = (projectId: string | null) => {
  return useQuery<TimelineEventRecord[]>({
    queryKey: ["timelineEvents", projectId],
    queryFn: async (): Promise<TimelineEventRecord[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("project_id", projectId)
        .order("timestamp", { ascending: false });

      if (error) throw error;

      const rows = ((data || []) as TimelineEventRecord[]).slice();
      rows.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      return rows;
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });
};
