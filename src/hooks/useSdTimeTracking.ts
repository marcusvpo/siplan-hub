import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as unknown as SupabaseClient;

export interface SdTimeInterval {
  id: string;
  entry_id: string;
  started_at: string;
  ended_at: string | null;
  position: number;
}

export interface SdTimeEntry {
  id: string;
  user_id: string;
  work_date: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  intervals: SdTimeInterval[];
  user_name?: string;
  user_email?: string | null;
  user_team?: string | null;
}

export interface SaveSdTimeEntryInput {
  id?: string;
  workDate: string;
  title: string;
  description?: string;
  intervals: Array<{ start: string; end: string }>;
}

function normalizeEntry(row: Record<string, unknown>): SdTimeEntry {
  const rawIntervals = Array.isArray(row.intervals)
    ? row.intervals
    : Array.isArray(row.sd_time_intervals)
      ? row.sd_time_intervals
      : [];

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    work_date: String(row.work_date),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    intervals: (rawIntervals as Record<string, unknown>[])
      .map((interval) => ({
        id: String(interval.id),
        entry_id: String(interval.entry_id),
        started_at: String(interval.started_at).slice(0, 5),
        ended_at: interval.ended_at ? String(interval.ended_at).slice(0, 5) : null,
        position: Number(interval.position),
      }))
      .sort((first, second) => first.position - second.position),
    user_name: row.user_name ? String(row.user_name) : undefined,
    user_email: row.user_email ? String(row.user_email) : null,
    user_team: row.user_team ? String(row.user_team) : null,
  };
}

export function useMySdTimeEntries(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sd-time", "mine", user?.id, startDate, endDate],
    enabled: Boolean(user?.id && startDate && endDate),
    queryFn: async () => {
      const { data, error } = await db
        .from("sd_time_entries")
        .select("*, sd_time_intervals(*)")
        .eq("user_id", user!.id)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map(normalizeEntry);
    },
  });
}

export function useManagedSdTimeEntries(
  startDate: string,
  endDate: string,
  userId?: string,
) {
  return useQuery({
    queryKey: ["sd-time", "management", startDate, endDate, userId ?? "all"],
    enabled: Boolean(startDate && endDate),
    queryFn: async () => {
      const { data, error } = await db.rpc("get_sd_time_management", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_user_id: userId || null,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map(normalizeEntry);
    },
  });
}

export function useSaveSdTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveSdTimeEntryInput) => {
      const { data, error } = await db.rpc("save_sd_time_entry", {
        p_work_date: input.workDate,
        p_title: input.title,
        p_description: input.description?.trim() || null,
        p_intervals: input.intervals,
        p_entry_id: input.id ?? null,
      });
      if (error) throw error;
      return String(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sd-time"] }),
  });
}

export function useDeleteSdTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await db.rpc("delete_sd_time_entry", {
        p_entry_id: entryId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sd-time"] }),
  });
}
