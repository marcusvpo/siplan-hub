import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ConversionEngineInsert,
  ConversionEngineUpdate,
} from "@/integrations/supabase/types";
import { toast } from "sonner";

export type EngineStatus = "in_development" | "maintenance" | "finished";
export type EngineSpecialty = "tn_rc" | "protest" | "ri_td";
export type EngineRecordType = "conversion_engine" | "other_tool";

export interface ConversionEngineItem {
  id: string;
  queueId: string | null;
  projectId: string | null;
  clientName: string | null;
  ticketNumber: string | null;
  recordType: EngineRecordType;
  sourceSystem: string | null;
  targetSystem: string | null;
  toolName: string | null;
  specialty: EngineSpecialty | null;
  devopsUrl: string | null;
  engineStatus: EngineStatus;
  engineRequestedAt: Date | null;
  engineRequestedByName: string | null;
  engineNotes: string | null;
  queueStatus: string | null;
  assignedToName: string | null;
  priority: number | null;
}

interface ConversionEngineInputBase {
  specialty: EngineSpecialty;
  status: EngineStatus;
  devopsUrl?: string;
  notes?: string;
}

export type CreateConversionEngineInput = ConversionEngineInputBase &
  (
    | {
        recordType: "conversion_engine";
        sourceSystem: string;
        targetSystem: string;
        toolName?: never;
      }
    | {
        recordType: "other_tool";
        toolName: string;
        sourceSystem?: never;
        targetSystem?: never;
      }
  );

export type UpdateConversionEngineInput = CreateConversionEngineInput;

interface EngineKPIs {
  inDevelopment: number;
  maintenance: number;
  finished: number;
  total: number;
}

export function useConversionEngines() {
  const [engines, setEngines] = useState<ConversionEngineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [kpis, setKpis] = useState<EngineKPIs>({
    inDevelopment: 0,
    maintenance: 0,
    finished: 0,
    total: 0,
  });

  const fetchEngines = useCallback(async () => {
    setLoading(true);
    try {
      // O schema gerado do projeto ainda é parcial; o cast fica restrito ao hook.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("conversion_engines")
        .select(`
          id,
          queue_id,
          project_id,
          source_system,
          target_system,
          record_type,
          tool_name,
          specialty,
          devops_url,
          notes,
          status,
          created_at,
          created_by_name,
          projects:project_id (
            client_name,
            ticket_number
          ),
          conversion_queue:queue_id (
            queue_status,
            assigned_to_name,
            priority
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: ConversionEngineItem[] = (data || []).map((row: any) => ({
        id: row.id,
        queueId: row.queue_id,
        projectId: row.project_id,
        clientName: row.projects?.client_name || null,
        ticketNumber: row.projects?.ticket_number || null,
        recordType: row.record_type || "conversion_engine",
        sourceSystem: row.source_system,
        targetSystem: row.target_system,
        toolName: row.tool_name,
        specialty: row.specialty,
        devopsUrl: row.devops_url,
        engineStatus: row.status,
        engineRequestedAt: row.created_at ? new Date(row.created_at) : null,
        engineRequestedByName: row.created_by_name,
        engineNotes: row.notes,
        queueStatus: row.conversion_queue?.queue_status || null,
        assignedToName: row.conversion_queue?.assigned_to_name || null,
        priority: row.conversion_queue?.priority ?? null,
      }));

      setEngines(mapped);
      setKpis({
        inDevelopment: mapped.filter((engine) => engine.engineStatus === "in_development").length,
        maintenance: mapped.filter((engine) => engine.engineStatus === "maintenance").length,
        finished: mapped.filter((engine) => engine.engineStatus === "finished").length,
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

  const createEngine = useCallback(
    async (input: CreateConversionEngineInput, userName: string): Promise<boolean> => {
      const isOtherTool = input.recordType === "other_tool";
      const sourceSystem = isOtherTool ? null : input.sourceSystem.trim();
      const targetSystem = isOtherTool ? null : input.targetSystem.trim();
      const toolName = isOtherTool ? input.toolName.trim() : null;
      if (
        !input.specialty ||
        (isOtherTool ? !toolName : !sourceSystem || !targetSystem)
      ) return false;

      setCreating(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const payload: ConversionEngineInsert = {
          source_system: sourceSystem,
          target_system: targetSystem,
          record_type: input.recordType,
          tool_name: toolName,
          specialty: input.specialty,
          devops_url: input.devopsUrl?.trim() || null,
          notes: input.notes?.trim() || null,
          status: input.status,
          created_by: user?.id || null,
          created_by_name: userName,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("conversion_engines").insert(payload);

        if (error) throw error;
        toast.success(
          isOtherTool
            ? "Ferramenta cadastrada com sucesso"
            : "Motor cadastrado com sucesso",
        );
        await fetchEngines();
        return true;
      } catch (err) {
        console.error("Error creating engine:", err);
        toast.error(
          isOtherTool ? "Erro ao cadastrar ferramenta" : "Erro ao cadastrar motor",
        );
        return false;
      } finally {
        setCreating(false);
      }
    },
    [fetchEngines],
  );

  const requestEngine = useCallback(
    async (queueId: string, notes: string, userName: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const requestedAt = new Date().toISOString();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: queueItem, error: queueError } = await (supabase as any)
          .from("conversion_queue")
          .select(`
            project_id,
            projects:project_id (system_type, legacy_system)
          `)
          .eq("id", queueId)
          .single();

        if (queueError) throw queueError;

        // Mantém os campos legados porque os cards da fila ainda os consomem.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateQueueError } = await (supabase as any)
          .from("conversion_queue")
          .update({
            engine_status: "pending_engine",
            engine_requested_at: requestedAt,
            engine_requested_by: user?.id,
            engine_requested_by_name: userName,
            engine_notes: notes || null,
            updated_at: requestedAt,
          })
          .eq("id", queueId);

        if (updateQueueError) throw updateQueueError;

        const enginePayload: ConversionEngineInsert = {
          queue_id: queueId,
          project_id: queueItem.project_id,
          source_system: queueItem.projects?.legacy_system || "Não informado",
          target_system: queueItem.projects?.system_type || "Não informado",
          record_type: "conversion_engine",
          tool_name: null,
          notes: notes || null,
          status: "in_development",
          created_by: user?.id || null,
          created_by_name: userName,
          created_at: requestedAt,
          updated_at: requestedAt,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: engineError } = await (supabase as any)
          .from("conversion_engines")
          .upsert(enginePayload, { onConflict: "queue_id" });

        if (engineError) throw engineError;
        toast.success("Enviado para criação do conversor");
        await fetchEngines();
      } catch (err) {
        console.error("Error requesting engine:", err);
        toast.error("Erro ao solicitar motor");
      }
    },
    [fetchEngines],
  );

  const updateEngine = useCallback(
    async (engineId: string, input: UpdateConversionEngineInput): Promise<boolean> => {
      const isOtherTool = input.recordType === "other_tool";
      const sourceSystem = isOtherTool ? null : input.sourceSystem.trim();
      const targetSystem = isOtherTool ? null : input.targetSystem.trim();
      const toolName = isOtherTool ? input.toolName.trim() : null;
      if (
        !input.specialty ||
        (isOtherTool ? !toolName : !sourceSystem || !targetSystem)
      ) return false;

      setUpdating(true);
      try {
        const engine = engines.find((item) => item.id === engineId);
        const updatedAt = new Date().toISOString();
        const updateData: ConversionEngineUpdate = {
          source_system: sourceSystem,
          target_system: targetSystem,
          record_type: input.recordType,
          tool_name: toolName,
          specialty: input.specialty,
          devops_url: input.devopsUrl?.trim() || null,
          notes: input.notes?.trim() || null,
          status: input.status,
          updated_at: updatedAt,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("conversion_engines")
          .update(updateData)
          .eq("id", engineId);

        if (error) throw error;

        if (engine?.queueId) {
          const legacyQueueStatus =
            input.status === "finished" ? "engine_ready" : "engine_in_development";
          const queueUpdate: Record<string, unknown> = {
            engine_status: legacyQueueStatus,
            engine_notes: updateData.notes,
            updated_at: updatedAt,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: queueError } = await (supabase as any)
            .from("conversion_queue")
            .update(queueUpdate)
            .eq("id", engine.queueId);

          if (queueError) throw queueError;
        }

        toast.success(
          isOtherTool
            ? "Ferramenta atualizada com sucesso"
            : "Motor atualizado com sucesso",
        );
        await fetchEngines();
        return true;
      } catch (err) {
        console.error("Error updating engine:", err);
        toast.error(
          isOtherTool ? "Erro ao atualizar ferramenta" : "Erro ao atualizar motor",
        );
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [engines, fetchEngines],
  );

  const deleteEngine = useCallback(
    async (engineId: string): Promise<boolean> => {
      setDeleting(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("conversion_engines")
          .delete()
          .eq("id", engineId);

        if (error) throw error;
        toast.success("Cadastro excluído com sucesso");
        await fetchEngines();
        return true;
      } catch (err) {
        console.error("Error deleting engine:", err);
        toast.error("Erro ao excluir motor");
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [fetchEngines],
  );

  return {
    engines,
    loading,
    creating,
    updating,
    deleting,
    kpis,
    createEngine,
    requestEngine,
    updateEngine,
    deleteEngine,
    refetch: fetchEngines,
  };
}
