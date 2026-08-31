import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface SdAttendanceBiFilters {
  startDate: string;
  endDate: string;
  userIds: string[];
  groups: string[];
  sources: string[];
  natures: string[];
}

export interface SdAttendanceBiMetrics {
  total_minutes: number;
  manual_minutes: number;
  imported_minutes: number;
  ticket_count: number;
  classified_ticket_count: number;
  analyst_count: number;
  entry_count: number;
  average_entry_minutes: number;
  average_ticket_minutes: number;
  overtime_minutes: number;
  rework_minutes: number;
  contract_minutes: number;
}

export interface SdAttendanceBiBreakdown {
  total_minutes: number;
  ticket_count: number;
  entry_count: number;
}

export interface SdAttendanceBiData {
  period: { start_date: string; end_date: string };
  metrics: SdAttendanceBiMetrics;
  daily: Array<{
    work_date: string;
    total_minutes: number;
    manual_minutes: number;
    imported_minutes: number;
    ticket_count: number;
  }>;
  by_group: Array<{
    group_name: string;
    total_minutes: number;
    manual_minutes: number;
    imported_minutes: number;
    analyst_count: number;
    ticket_count: number;
  }>;
  by_analyst: Array<{
    user_id: string;
    user_name: string;
    user_email: string | null;
    attendance_group: string;
    total_minutes: number;
    manual_minutes: number;
    imported_minutes: number;
    ticket_count: number;
    entry_count: number;
    average_entry_minutes: number;
    worked_days: number;
  }>;
  by_nature: Array<SdAttendanceBiBreakdown & { nature: string }>;
  by_activity: Array<SdAttendanceBiBreakdown & { activity: string }>;
  by_product: Array<SdAttendanceBiBreakdown & { product: string }>;
  by_hour: Array<{ hour_of_day: number; total_minutes: number; entry_count: number }>;
  top_tickets: Array<{
    ticket_number: string;
    ticket_title: string;
    client_name: string;
    nature: string;
    product: string;
    total_minutes: number;
    analyst_count: number;
    entry_count: number;
  }>;
  filters: {
    analysts: Array<{
      user_id: string;
      user_name: string;
      user_email: string | null;
      attendance_group: string;
    }>;
    groups: string[];
    natures: string[];
    products: string[];
  };
}

const EMPTY_BI: SdAttendanceBiData = {
  period: { start_date: "", end_date: "" },
  metrics: {
    total_minutes: 0,
    manual_minutes: 0,
    imported_minutes: 0,
    ticket_count: 0,
    classified_ticket_count: 0,
    analyst_count: 0,
    entry_count: 0,
    average_entry_minutes: 0,
    average_ticket_minutes: 0,
    overtime_minutes: 0,
    rework_minutes: 0,
    contract_minutes: 0,
  },
  daily: [],
  by_group: [],
  by_analyst: [],
  by_nature: [],
  by_activity: [],
  by_product: [],
  by_hour: [],
  top_tickets: [],
  filters: { analysts: [], groups: [], natures: [], products: [] },
};

export function useSdAttendanceBi(filters: SdAttendanceBiFilters) {
  return useQuery({
    queryKey: [
      "sd-attendance-bi",
      filters.startDate,
      filters.endDate,
      filters.userIds,
      filters.groups,
      filters.sources,
      filters.natures,
    ],
    enabled: Boolean(filters.startDate && filters.endDate),
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_sd_attendance_bi", {
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_user_ids: filters.userIds.length ? filters.userIds : null,
        p_groups: filters.groups.length ? filters.groups : null,
        p_sources: filters.sources.length ? filters.sources : null,
        p_natures: filters.natures.length ? filters.natures : null,
      });
      if (error) throw error;
      return normalizeBiData(data);
    },
  });
}

function normalizeBiData(value: unknown): SdAttendanceBiData {
  if (!value || typeof value !== "object") return EMPTY_BI;
  const data = value as Partial<SdAttendanceBiData>;
  const metrics = data.metrics ?? EMPTY_BI.metrics;
  return {
    period: data.period ?? EMPTY_BI.period,
    metrics: {
      total_minutes: Number(metrics.total_minutes ?? 0),
      manual_minutes: Number(metrics.manual_minutes ?? 0),
      imported_minutes: Number(metrics.imported_minutes ?? 0),
      ticket_count: Number(metrics.ticket_count ?? 0),
      classified_ticket_count: Number(metrics.classified_ticket_count ?? 0),
      analyst_count: Number(metrics.analyst_count ?? 0),
      entry_count: Number(metrics.entry_count ?? 0),
      average_entry_minutes: Number(metrics.average_entry_minutes ?? 0),
      average_ticket_minutes: Number(metrics.average_ticket_minutes ?? 0),
      overtime_minutes: Number(metrics.overtime_minutes ?? 0),
      rework_minutes: Number(metrics.rework_minutes ?? 0),
      contract_minutes: Number(metrics.contract_minutes ?? 0),
    },
    daily: Array.isArray(data.daily) ? data.daily : [],
    by_group: Array.isArray(data.by_group) ? data.by_group : [],
    by_analyst: Array.isArray(data.by_analyst) ? data.by_analyst : [],
    by_nature: Array.isArray(data.by_nature) ? data.by_nature : [],
    by_activity: Array.isArray(data.by_activity) ? data.by_activity : [],
    by_product: Array.isArray(data.by_product) ? data.by_product : [],
    by_hour: Array.isArray(data.by_hour) ? data.by_hour : [],
    top_tickets: Array.isArray(data.top_tickets) ? data.top_tickets : [],
    filters: {
      analysts: Array.isArray(data.filters?.analysts) ? data.filters.analysts : [],
      groups: Array.isArray(data.filters?.groups) ? data.filters.groups : [],
      natures: Array.isArray(data.filters?.natures) ? data.filters.natures : [],
      products: Array.isArray(data.filters?.products) ? data.filters.products : [],
    },
  };
}
