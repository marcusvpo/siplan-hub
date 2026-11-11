import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface SdClosuresFilters {
  startDate: string;
  endDate: string;
  products: string[];
  analysts: string[];
  clients: string[];
  groups: string[];
}

export type SdClosureSlaStatus = "within" | "outside" | "without_deadline";

export interface SdClosuresMetrics {
  total_closed: number;
  within_sla: number;
  outside_sla: number;
  without_deadline: number;
  reopened: number;
  analyst_count: number;
  client_count: number;
}

export interface SdClosureAnalystSummary {
  analyst_name: string;
  group_name: string;
  total_closed: number;
  within_sla: number;
  outside_sla: number;
  without_deadline: number;
  reopened: number;
  within_percent: number;
  outside_percent: number;
}

export interface SdClosureProductSummary {
  product: string;
  total_closed: number;
  within_sla: number;
  outside_sla: number;
  without_deadline: number;
}

export interface SdClosureDetail {
  ticket_number: string;
  client_name: string;
  ticket_title: string;
  product: string;
  analyst_name: string;
  group_name: string;
  nature: string;
  status: string;
  opened_at: string | null;
  closed_at: string;
  due_at: string | null;
  sla_status: SdClosureSlaStatus;
  duration_minutes: number | null;
  reopened: boolean;
}

export interface SdClosuresData {
  period: { start_date: string; end_date: string };
  metrics: SdClosuresMetrics;
  by_analyst: SdClosureAnalystSummary[];
  by_product: SdClosureProductSummary[];
  details: SdClosureDetail[];
  filters: {
    products: string[];
    analysts: string[];
    clients: string[];
    groups: string[];
  };
}

const EMPTY_METRICS: SdClosuresMetrics = {
  total_closed: 0,
  within_sla: 0,
  outside_sla: 0,
  without_deadline: 0,
  reopened: 0,
  analyst_count: 0,
  client_count: 0,
};

const EMPTY_DATA: SdClosuresData = {
  period: { start_date: "", end_date: "" },
  metrics: EMPTY_METRICS,
  by_analyst: [],
  by_product: [],
  details: [],
  filters: { products: [], analysts: [], clients: [], groups: [] },
};

export function useSdClosuresReport(filters: SdClosuresFilters) {
  return useQuery({
    queryKey: [
      "sd-closures",
      filters.startDate,
      filters.endDate,
      filters.products,
      filters.analysts,
      filters.clients,
      filters.groups,
    ],
    enabled: Boolean(filters.startDate && filters.endDate),
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_sd_closures_report", {
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_products: filters.products.length ? filters.products : null,
        p_analysts: filters.analysts.length ? filters.analysts : null,
        p_clients: filters.clients.length ? filters.clients : null,
        p_groups: filters.groups.length ? filters.groups : null,
      });
      if (error) throw error;
      return normalizeClosuresData(data);
    },
  });
}

export function useSyncSdClosures() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const latestRequest = useRef(0);

  const syncClosures = useCallback(async (startDate: string, endDate: string) => {
    const requestVersion = ++latestRequest.current;
    setIsSyncing(true);

    try {
      const { data: requestId, error } = await db.rpc("request_sd_closures_sync", {
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
      if (typeof requestId !== "string") {
        throw new Error("O Supabase não retornou o identificador da atualização.");
      }

      for (let attempt = 0; attempt < 180; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        if (requestVersion !== latestRequest.current) return;

        const { data: request, error: pollError } = await db
          .from("chamados_sync_requests")
          .select("status, detail")
          .eq("id", requestId)
          .maybeSingle();
        if (pollError) throw pollError;

        if (request?.status === "done") {
          await queryClient.invalidateQueries({ queryKey: ["sd-closures"] });
          return;
        }
        if (request?.status === "error") {
          throw new Error(request.detail || "O worker reportou erro ao consultar o Ellevo.");
        }
      }

      throw new Error("A atualização do período excedeu 6 minutos.");
    } finally {
      if (requestVersion === latestRequest.current) setIsSyncing(false);
    }
  }, [queryClient]);

  return { syncClosures, isSyncing };
}

function normalizeClosuresData(value: unknown): SdClosuresData {
  if (!value || typeof value !== "object") return EMPTY_DATA;
  const data = value as Partial<SdClosuresData>;
  const metrics = data.metrics ?? EMPTY_METRICS;

  return {
    period: data.period ?? EMPTY_DATA.period,
    metrics: {
      total_closed: Number(metrics.total_closed ?? 0),
      within_sla: Number(metrics.within_sla ?? 0),
      outside_sla: Number(metrics.outside_sla ?? 0),
      without_deadline: Number(metrics.without_deadline ?? 0),
      reopened: Number(metrics.reopened ?? 0),
      analyst_count: Number(metrics.analyst_count ?? 0),
      client_count: Number(metrics.client_count ?? 0),
    },
    by_analyst: Array.isArray(data.by_analyst)
      ? data.by_analyst.map((item) => ({
          ...item,
          total_closed: Number(item.total_closed ?? 0),
          within_sla: Number(item.within_sla ?? 0),
          outside_sla: Number(item.outside_sla ?? 0),
          without_deadline: Number(item.without_deadline ?? 0),
          reopened: Number(item.reopened ?? 0),
          within_percent: Number(item.within_percent ?? 0),
          outside_percent: Number(item.outside_percent ?? 0),
        }))
      : [],
    by_product: Array.isArray(data.by_product)
      ? data.by_product.map((item) => ({
          ...item,
          total_closed: Number(item.total_closed ?? 0),
          within_sla: Number(item.within_sla ?? 0),
          outside_sla: Number(item.outside_sla ?? 0),
          without_deadline: Number(item.without_deadline ?? 0),
        }))
      : [],
    details: Array.isArray(data.details)
      ? data.details.map((item) => ({
          ...item,
          duration_minutes: item.duration_minutes == null
            ? null
            : Number(item.duration_minutes),
          reopened: item.reopened === true,
        }))
      : [],
    filters: {
      products: Array.isArray(data.filters?.products) ? data.filters.products : [],
      analysts: Array.isArray(data.filters?.analysts) ? data.filters.analysts : [],
      clients: Array.isArray(data.filters?.clients) ? data.filters.clients : [],
      groups: Array.isArray(data.filters?.groups) ? data.filters.groups : [],
    },
  };
}
