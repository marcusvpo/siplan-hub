import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EngineStatus = "pending_engine" | "engine_in_development" | "engine_ready";

export interface ConversionEngineItem {
  id: string;
  projectId: string;
  clientName: string;
  ticketNumber: string;
  systemType: string;
  legacySystem: string;
  engineStatus: EngineStatus;
  engineRequestedAt: Date | null;
  engineRequestedByName: string | null;
  engineNotes: string | null;
  queueStatus: string;
  assignedToName: string | null;
  priority: number;
}

interface EngineKPIs {
  pendingEngine: number;
  inDevelopment: number;
  ready: number;
  total: number;
}

export function useConversionEngines() {
  const [engines, setEngines] = useState<ConversionEngineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<EngineKPIs>({
    pendingEngine: 0,
    inDevelopment: 0,
    ready: 0,
    total: 0,
  });

  const fetchEngines = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("conversion_queue")
        .select(`
          id,
          project_id,
          queue_status,
          assigned_to_name,
          priority,
          engine_status,
          engine_requested_at,
          engine_requested_by_name,
          engine_notes,
          projects:project_id (
            client_name,
            ticket_number,
            system_type,
            legacy_system
          )
        `)
        .not("engine_status", "is", null)
        .order("engine_requested_at", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: ConversionEngineItem[] = (data || []).map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        clientName: row.projects?.client_name || "—",
        ticketNumber: row.projects?.ticket_number || "—",
        systemType: row.projects?.system_type || "—",
        legacySystem: row.projects?.legacy_system || "—",
        engineStatus: row.engine_status,
        engineRequestedAt: row.engine_requested_at
          ? new Date(row.engine_requested_at)
          : null,
        engineRequestedByName: row.engine_requested_by_name,
        engineNotes: row.engine_notes,
        queueStatus: row.queue_status,
        assignedToName: row.assigned_to_name,
        priority: row.priority,
      }));

      setEngines(mapped);
      setKpis({
        pendingEngine: mapped.filter((e) => e.engineStatus === "pending_engine").length,
        inDevelopment: mapped.filter((e) => e.engineStatus === "engine_in_development").length,
        ready: mapped.filter((e) => e.engineStatus === "engine_ready").length,
        total: mapped.length,
      });
    } catch (err) {
      console.error("Error fetching engines:", err);
      toast.error("Erro ao carregar motores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEngines();
  }, [fetchEngines]);

  const requestEngine = useCallback(
    async (queueId: string, notes: string, userName: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("conversion_queue")
          .update({
            engine_status: "pending_engine",
            engine_requested_at: new Date().toISOString(),
            engine_requested_by: user?.id,
            engine_requested_by_name: userName,
            engine_notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", queueId);

        if (error) throw error;
        toast.success("Enviado para criação do conversor");
        await fetchEngines();
      } catch (err) {
        console.error("Error requesting engine:", err);
        toast.error("Erro ao solicitar motor");
      }
    },
    [fetchEngines],
  );

  const updateEngineStatus = useCallback(
    async (queueId: string, newStatus: EngineStatus, notes?: string) => {
      try {
        const updateData: Record<string, unknown> = {
          engine_status: newStatus,
          updated_at: new Date().toISOString(),
        };
        if (notes !== undefined) {
          updateData.engine_notes = notes;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("conversion_queue")
          .update(updateData)
          .eq("id", queueId);

        if (error) throw error;
        toast.success("Status do motor atualizado");
        await fetchEngines();
      } catch (err) {
        console.error("Error updating engine status:", err);
        toast.error("Erro ao atualizar status");
      }
    },
    [fetchEngines],
  );

  return {
    engines,
    loading,
    kpis,
    requestEngine,
    updateEngineStatus,
    refetch: fetchEngines,
  };
}
