import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types based on actual database schema
export interface ConversionQueueItem {
  id: string;
  projectId: string;
  clientName?: string;
  ticketNumber?: string;
  systemType?: string;
  legacySystem?: string;
  sentBy: string | null;
  sentByName: string;
  sentAt: Date;
  queueStatus: string;
  priority: number;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: Date | null;
  startedAt: Date | null;
  estimatedCompletion: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversionKPIs {
  totalInQueue: number;
  pending: number;
  inProgress: number;
  completed: number;
  myQueueCount: number;
}

interface UseConversionQueueOptions {
  userId?: string;
}

export function useConversionQueue(options: UseConversionQueueOptions = {}) {
  const { userId } = options;
  const [queue, setQueue] = useState<ConversionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversion_queue")
        .select(`
          *,
          projects!inner (
            client_name,
            ticket_number,
            system_type,
            legacy_system
          )
        `)
        .order("priority", { ascending: true })
        .order("sent_at", { ascending: true });

      if (error) throw error;

      const items: ConversionQueueItem[] = (data || []).map((item) => ({
        id: item.id,
        projectId: item.project_id,
        clientName: item.projects?.client_name,
        ticketNumber: item.projects?.ticket_number,
        systemType: item.projects?.system_type,
        legacySystem: item.projects?.legacy_system,
        sentBy: item.sent_by,
        sentByName: item.sent_by_name,
        sentAt: new Date(item.sent_at),
        queueStatus: item.queue_status,
        priority: item.priority,
        assignedTo: item.assigned_to,
        assignedToName: item.assigned_to_name,
        assignedAt: item.assigned_at ? new Date(item.assigned_at) : null,
        startedAt: item.started_at ? new Date(item.started_at) : null,
        estimatedCompletion: item.estimated_completion
          ? new Date(item.estimated_completion)
          : null,
        completedAt: item.completed_at ? new Date(item.completed_at) : null,
        notes: item.notes,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      setQueue(items);
      setError(null);
    } catch (err) {
      console.error("Error fetching conversion queue:", err);
      setError("Erro ao carregar fila de conversão");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Computed queues
  const myQueue = useMemo(
    () => queue.filter((item) => item.assignedTo === userId),
    [queue, userId]
  );

  const unassignedQueue = useMemo(
    () =>
      queue.filter(
        (item) => !item.assignedTo && item.queueStatus === "pending"
      ),
    [queue]
  );

  // Items in homologation - using queue_status field
  const homologationQueue = useMemo(
    () =>
      queue.filter(
        (item) =>
          item.queueStatus === "homologation" ||
          item.queueStatus === "awaiting_homologation"
      ),
    [queue]
  );

  // KPIs
  const kpis: ConversionKPIs = useMemo(() => {
    const pending = queue.filter((i) => i.queueStatus === "pending").length;
    const inProgress = queue.filter(
      (i) => i.queueStatus === "in_progress"
    ).length;
    const completed = queue.filter((i) => i.queueStatus === "done").length;

    return {
      totalInQueue: queue.length,
      pending,
      inProgress,
      completed,
      myQueueCount: myQueue.length,
    };
  }, [queue, myQueue]);

  // Send to conversion
  const sendToConversion = useCallback(
    async (
      projectId: string,
      sentByName: string,
      sentBy?: string,
      priority: number = 3
    ) => {
      try {
        const { error } = await supabase.from("conversion_queue").insert({
          project_id: projectId,
          sent_by: sentBy || null,
          sent_by_name: sentByName,
          priority,
          queue_status: "pending",
        });

        if (error) throw error;
        await fetchQueue();
        return true;
      } catch (err) {
        console.error("Error sending to conversion:", err);
        return false;
      }
    },
    [fetchQueue]
  );

  // Assign to me
  const assignToMe = useCallback(
    async (queueId: string, userId: string, userName: string) => {
      try {
        const { error } = await supabase
          .from("conversion_queue")
          .update({
            assigned_to: userId,
            assigned_to_name: userName,
            assigned_at: new Date().toISOString(),
            queue_status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .eq("id", queueId);

        if (error) throw error;
        await fetchQueue();
        return true;
      } catch (err) {
        console.error("Error assigning:", err);
        return false;
      }
    },
    [fetchQueue]
  );

  // Transfer to another user
  const transferTo = useCallback(
    async (queueId: string, newUserId: string, newUserName: string) => {
      try {
        const { error } = await supabase
          .from("conversion_queue")
          .update({
            assigned_to: newUserId,
            assigned_to_name: newUserName,
            assigned_at: new Date().toISOString(),
          })
          .eq("id", queueId);

        if (error) throw error;
        await fetchQueue();
        return true;
      } catch (err) {
        console.error("Error transferring:", err);
        return false;
      }
    },
    [fetchQueue]
  );

  // Update status
  const updateQueueStatus = useCallback(
    async (queueId: string, status: string) => {
      try {
        const updates: Record<string, unknown> = {
          queue_status: status,
        };

        if (status === "done") {
          updates.completed_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from("conversion_queue")
          .update(updates)
          .eq("id", queueId);

        if (error) throw error;
        await fetchQueue();
        return true;
      } catch (err) {
        console.error("Error updating status:", err);
        return false;
      }
    },
    [fetchQueue]
  );

  // Update priority
  const updatePriority = useCallback(
    async (queueId: string, priority: number) => {
      try {
        const { error } = await supabase
          .from("conversion_queue")
          .update({ priority })
          .eq("id", queueId);

        if (error) throw error;
        await fetchQueue();
        return true;
      } catch (err) {
        console.error("Error updating priority:", err);
        return false;
      }
    },
    [fetchQueue]
  );

  // Update notes
  const updateNotes = useCallback(
    async (queueId: string, notes: string) => {
      try {
        const { error } = await supabase
          .from("conversion_queue")
          .update({ notes })
          .eq("id", queueId);

        if (error) throw error;
        await fetchQueue();
        return true;
      } catch (err) {
        console.error("Error updating notes:", err);
        return false;
      }
    },
    [fetchQueue]
  );

  // Send to homologation
  const sendToHomologation = useCallback(
    async (queueId: string) => {
      return updateQueueStatus(queueId, "awaiting_homologation");
    },
    [updateQueueStatus]
  );

  // Approve homologation
  const approveHomologation = useCallback(
    async (queueId: string) => {
      return updateQueueStatus(queueId, "done");
    },
    [updateQueueStatus]
  );

  // Helper to get item by project ID
  const getItemByProjectId = useCallback(
    (projectId: string) => {
      return queue.find((item) => item.projectId === projectId);
    },
    [queue]
  );

  return {
    queue,
    myQueue,
    unassignedQueue,
    homologationQueue,
    kpis,
    loading,
    error,
    sendToConversion,
    assignToMe,
    transferTo,
    updateQueueStatus,
    updatePriority,
    updateNotes,
    sendToHomologation,
    approveHomologation,
    getItemByProjectId,
    refetch: fetchQueue,
  };
}
