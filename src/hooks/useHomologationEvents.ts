import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HomologationEvent {
  id: string;
  projectId: string;
  timestamp: Date;
  fromStatus: string;
  toStatus: string;
  performedBy: string | null;
  performedByName: string;
  notes: string | null;
  issuesCount: number;
}

interface RawEvent {
  id: string;
  project_id: string;
  timestamp: string;
  from_status: string;
  to_status: string;
  performed_by: string | null;
  performed_by_name: string;
  notes: string | null;
  issues_count: number;
}

function mapEvent(raw: RawEvent): HomologationEvent {
  return {
    id: raw.id,
    projectId: raw.project_id,
    timestamp: new Date(raw.timestamp),
    fromStatus: raw.from_status,
    toStatus: raw.to_status,
    performedBy: raw.performed_by,
    performedByName: raw.performed_by_name,
    notes: raw.notes,
    issuesCount: raw.issues_count || 0,
  };
}

export function useHomologationEvents(projectId: string | null) {
  const [events, setEvents] = useState<HomologationEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("homologation_events")
        .select("*")
        .eq("project_id", projectId)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setEvents((data || []).map(mapEvent));
    } catch (err) {
      console.error("Error fetching homologation events:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const logEvent = useCallback(
    async (params: {
      fromStatus: string;
      toStatus: string;
      notes: string | null;
      issuesCount?: number;
      performedByName: string;
    }) => {
      if (!projectId) return null;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from("homologation_events")
          .insert({
            project_id: projectId,
            from_status: params.fromStatus,
            to_status: params.toStatus,
            performed_by: user?.id || null,
            performed_by_name: params.performedByName,
            notes: params.notes,
            issues_count: params.issuesCount || 0,
          })
          .select()
          .single();

        if (error) throw error;
        const newEvent = mapEvent(data);
        setEvents((prev) => [newEvent, ...prev]);
        return newEvent;
      } catch (err) {
        console.error("Error logging homologation event:", err);
        toast.error("Erro ao registrar evento de homologação");
        return null;
      }
    },
    [projectId],
  );

  return {
    events,
    loading,
    logEvent,
    refetch: fetchEvents,
  };
}
