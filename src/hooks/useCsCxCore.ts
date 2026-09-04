import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface CsCxProduct {
  id: string;
  name: string;
  product_code: string | null;
}

export interface CsCxOfficeProduct {
  id: string;
  product_id: string;
  implementation_date: string | null;
  product: CsCxProduct | null;
  responsibles: CsCxProductResponsible[];
}

export interface CsCxResponsibleProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface CsCxProductResponsible {
  id: string;
  profile_id: string;
  profile: CsCxResponsibleProfile | null;
}

export interface CsCxOfficeResponsible {
  id: string;
  profile_id: string;
  profile: CsCxResponsibleProfile | null;
}

export interface CsCxRegistryOffice {
  id: string;
  legacy_id: number | null;
  name: string;
  sap_code: string | null;
  active: boolean;
  is_analyzed: boolean;
  contact_details: string | null;
  notes: string | null;
  origin: "legacy" | "hub";
  created_at: string | null;
  created_by: string | null;
  analyst_profile_id: string | null;
  analyst: CsCxResponsibleProfile | null;
  responsibles: CsCxOfficeResponsible[];
  products: CsCxOfficeProduct[];
}

export interface RegistryOfficeInput {
  id?: string;
  name: string;
  sap_code?: string;
  contact_details?: string;
  notes?: string;
  responsible_profile_ids: string[];
  active: boolean;
  products: Array<{
    product_id: string;
    implementation_date: string | null;
    responsible_profile_ids: string[];
  }>;
}

export const CS_CX_REQUEST_STATUSES = [
  "Aguardando",
  "Projeto",
  "Desenvolvimento",
  "Em andamento",
  "Sustentação",
  "FastTrack",
  "Finalizado",
  "Negado",
] as const;

export type CsCxRequestStatus = string;

export interface CsCxRequestStatusConfig {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  active: boolean;
  is_system: boolean;
}

export interface CsCxRequestUpdate {
  id: string;
  observation: string;
  author_profile_id: string | null;
  occurred_at: string;
  origin: "legacy" | "hub";
  author: CsCxResponsibleProfile | null;
}

export interface CsCxRequestStatusHistoryEntry {
  id: string;
  status: string;
  author_profile_id: string | null;
  occurred_at: string;
  origin: "legacy" | "hub";
  author: CsCxResponsibleProfile | null;
}

export interface CsCxRequest {
  id: string;
  legacy_id: number | null;
  ticket_number: string | null;
  description: string | null;
  module: string | null;
  requester: string | null;
  responsible: string | null;
  requested_on: string | null;
  expected_delivery_on: string | null;
  delivered_on: string | null;
  status: string | null;
  notes: string | null;
  registry_office_id: string;
  author_profile_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  origin: "legacy" | "hub";
  registry_office: { id: string; name: string } | null;
  updates: CsCxRequestUpdate[];
  status_history: CsCxRequestStatusHistoryEntry[];
}

export interface CsCxRequestInput {
  id?: string;
  ticket_number?: string;
  description: string;
  module?: string;
  requester?: string;
  responsible?: string;
  requested_on?: string;
  expected_delivery_on?: string;
  delivered_on?: string;
  status: string;
  new_observation?: string;
  registry_office_id: string;
}

interface RawOffice extends Omit<CsCxRegistryOffice, "products" | "analyst" | "responsibles"> {
  profiles: CsCxResponsibleProfile | null;
  cs_cx_registry_office_responsibles?: Array<{
    id: string;
    profile_id: string;
    profiles: CsCxResponsibleProfile | null;
  }>;
  cs_cx_registry_office_products?: Array<{
    id: string;
    product_id: string;
    implementation_date: string | null;
    source_present: boolean;
    cs_cx_products: CsCxProduct | null;
    cs_cx_registry_office_product_responsibles?: Array<{
      id: string;
      profile_id: string;
      profiles: CsCxResponsibleProfile | null;
    }>;
  }>;
}

interface RawRequest extends Omit<
  CsCxRequest,
  "registry_office" | "updates" | "status_history"
> {
  cs_cx_registry_offices: { id: string; name: string } | null;
  cs_cx_request_updates?: Array<Omit<CsCxRequestUpdate, "author"> & {
    profiles: CsCxResponsibleProfile | null;
  }>;
}

interface RawRequestStatusHistoryEntry
  extends Omit<CsCxRequestStatusHistoryEntry, "author"> {
  request_id: string;
  profiles?: CsCxResponsibleProfile | null;
}

function isMissingRequestStatusHistory(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; details?: string };
  const message = `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    (message.includes("cs_cx_request_status_history") &&
      (message.includes("does not exist") ||
        message.includes("could not find the table") ||
        message.includes("schema cache")))
  );
}

async function fetchRequestStatusHistory(requestIds: string[]) {
  if (requestIds.length === 0) return [];

  const historyWithAuthors = await db
    .from("cs_cx_request_status_history")
    .select(`
      id, request_id, status, author_profile_id, occurred_at, origin,
      profiles!cs_cx_request_status_history_author_profile_id_fkey (id, full_name, email)
    `)
    .in("request_id", requestIds)
    .order("occurred_at")
    .order("id");

  if (!historyWithAuthors.error) {
    return (historyWithAuthors.data ?? []) as unknown as RawRequestStatusHistoryEntry[];
  }
  if (isMissingRequestStatusHistory(historyWithAuthors.error)) return [];

  // A tabela pode estar disponivel antes de o cache do PostgREST reconhecer a FK.
  if (historyWithAuthors.error.code === "PGRST200") {
    const historyWithoutAuthors = await db
      .from("cs_cx_request_status_history")
      .select("id, request_id, status, author_profile_id, occurred_at, origin")
      .in("request_id", requestIds)
      .order("occurred_at")
      .order("id");
    if (!historyWithoutAuthors.error) {
      return (historyWithoutAuthors.data ?? []) as RawRequestStatusHistoryEntry[];
    }
    if (isMissingRequestStatusHistory(historyWithoutAuthors.error)) return [];
    throw historyWithoutAuthors.error;
  }

  throw historyWithAuthors.error;
}

export function useCsCxRegistryOffices() {
  const queryClient = useQueryClient();

  const officesQuery = useQuery({
    queryKey: ["cs-cx", "registry-offices"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_registry_offices")
        .select(`
          id, legacy_id, name, sap_code, active, is_analyzed, contact_details, notes,
          origin, created_at, created_by, analyst_profile_id,
          profiles!cs_cx_registry_offices_analyst_profile_id_fkey (id, full_name, email),
          cs_cx_registry_office_responsibles (
            id, profile_id,
            profiles!cs_cx_registry_office_responsibles_profile_id_fkey (
              id, full_name, email
            )
          ),
          cs_cx_registry_office_products (
            id, product_id, implementation_date, source_present,
            cs_cx_products (id, name, product_code),
            cs_cx_registry_office_product_responsibles (
              id, profile_id,
              profiles!cs_cx_registry_office_product_responsibles_profile_id_fkey (
                id, full_name, email
              )
            )
          )
        `)
        .eq("source_present", true)
        .order("name");
      if (error) throw error;

      return ((data ?? []) as unknown as RawOffice[]).map((office) => ({
        ...office,
        analyst: office.profiles,
        responsibles: (office.cs_cx_registry_office_responsibles ?? []).map((responsible) => ({
          id: responsible.id,
          profile_id: responsible.profile_id,
          profile: responsible.profiles,
        })),
        products: (office.cs_cx_registry_office_products ?? []).filter((link) => link.source_present).map((link) => ({
          id: link.id,
          product_id: link.product_id,
          implementation_date: link.implementation_date,
          product: link.cs_cx_products,
          responsibles: (link.cs_cx_registry_office_product_responsibles ?? []).map((responsible) => ({
            id: responsible.id,
            profile_id: responsible.profile_id,
            profile: responsible.profiles,
          })),
        })),
      })) satisfies CsCxRegistryOffice[];
    },
  });

  const productsQuery = useQuery({
    queryKey: ["cs-cx", "products"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_products")
        .select("id, name, product_code")
        .eq("active", true)
        .eq("source_present", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CsCxProduct[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["cs-cx", "profile-options"],
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as CsCxResponsibleProfile[];
    },
  });

  const saveOffice = useMutation({
    mutationFn: async (input: RegistryOfficeInput) => {
      const { data, error } = await db.rpc("cs_cx_save_registry_office_v4", {
        p_id: input.id ?? null,
        p_name: input.name,
        p_sap_code: emptyToNull(input.sap_code),
        p_contact_details: emptyToNull(input.contact_details),
        p_notes: emptyToNull(input.notes),
        p_active: input.active,
        p_responsible_profile_ids: input.responsible_profile_ids,
        p_products: input.products.map(({ product_id, implementation_date }) => ({
          product_id,
          implementation_date,
        })),
        p_responsibles: input.products.flatMap((product) =>
          product.responsible_profile_ids.map((profile_id) => ({
            product_id: product.product_id,
            profile_id,
          })),
        ),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  const deleteOffice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_registry_offices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  const toggleOfficeAnalyzed = useMutation({
    mutationFn: async (input: { id: string; is_analyzed: boolean }) => {
      const { error } = await db
        .from("cs_cx_registry_offices")
        .update({
          is_analyzed: input.is_analyzed,
          analysis_at: input.is_analyzed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  return {
    offices: officesQuery.data ?? [],
    products: productsQuery.data ?? [],
    profiles: profilesQuery.data ?? [],
    isLoading: officesQuery.isLoading || productsQuery.isLoading || profilesQuery.isLoading,
    error: officesQuery.error ?? productsQuery.error ?? profilesQuery.error,
    refetch: officesQuery.refetch,
    saveOffice,
    deleteOffice,
    toggleOfficeAnalyzed,
  };
}

export function useCsCxRequests() {
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["cs-cx", "requests"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_requests")
        .select(`
          id, legacy_id, ticket_number, description, module, requester,
          responsible, requested_on, expected_delivery_on, delivered_on,
          status, notes, registry_office_id, author_profile_id, created_at,
          updated_at, origin,
          cs_cx_registry_offices (id, name),
          cs_cx_request_updates (
            id, observation, author_profile_id, occurred_at, origin,
            profiles!cs_cx_request_updates_author_profile_id_fkey (id, full_name, email)
          )
        `)
        .eq("source_present", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const rawRequests = (data ?? []) as unknown as RawRequest[];
      const history = await fetchRequestStatusHistory(
        rawRequests.map((request) => request.id),
      );
      const historyByRequest = new Map<string, CsCxRequestStatusHistoryEntry[]>();
      for (const entry of history) {
        const requestHistory = historyByRequest.get(entry.request_id) ?? [];
        requestHistory.push({ ...entry, author: entry.profiles ?? null });
        historyByRequest.set(entry.request_id, requestHistory);
      }

      return rawRequests.map((request) => ({
        ...request,
        registry_office: request.cs_cx_registry_offices,
        updates: (request.cs_cx_request_updates ?? [])
          .map((update) => ({ ...update, author: update.profiles }))
          .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
        status_history: historyByRequest.get(request.id) ?? [],
      })) satisfies CsCxRequest[];
    },
  });

  const statusesQuery = useQuery({
    queryKey: ["cs-cx", "request-statuses"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_request_statuses")
        .select("id, name, color, sort_order, active, is_system")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CsCxRequestStatusConfig[];
    },
  });

  const saveRequest = useMutation({
    mutationFn: async (input: CsCxRequestInput) => {
      const { data, error } = await db.rpc("cs_cx_save_request_v2", {
        p_id: input.id ?? null,
        p_ticket_number: emptyToNull(input.ticket_number),
        p_description: input.description,
        p_module: emptyToNull(input.module),
        p_requester: emptyToNull(input.requester),
        p_responsible: emptyToNull(input.responsible),
        p_requested_on: emptyToNull(input.requested_on),
        p_expected_delivery_on: emptyToNull(input.expected_delivery_on),
        p_delivered_on: emptyToNull(input.delivered_on),
        p_status: input.status,
        p_registry_office_id: input.registry_office_id,
        p_new_observation: emptyToNull(input.new_observation),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.rpc("cs_cx_update_request_status", {
        p_id: id,
        p_status: status,
      });
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      const queryKey = ["cs-cx", "requests"];
      await queryClient.cancelQueries({ queryKey });
      const previousRequests = queryClient.getQueryData<CsCxRequest[]>(queryKey);
      queryClient.setQueryData<CsCxRequest[]>(queryKey, (current) => current?.map((request) => (
        request.id === id ? { ...request, status } : request
      )));
      return { previousRequests };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(["cs-cx", "requests"], context.previousRequests);
      }
    },
    onSettled: () => invalidateCore(queryClient),
  });

  const updateRequestObservation = useMutation({
    mutationFn: async ({ id, observation }: { id: string; observation: string }) => {
      const { error } = await db
        .from("cs_cx_request_updates")
        .update({ observation })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  const deleteRequestObservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_request_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  return {
    requests: requestsQuery.data ?? [],
    statuses: statusesQuery.data ?? CS_CX_REQUEST_STATUSES.map((name, index) => ({ id: name, name, color: "slate", sort_order: index, active: true, is_system: true })),
    isLoading: requestsQuery.isLoading || statusesQuery.isLoading,
    error: requestsQuery.error ?? statusesQuery.error,
    refetch: async () => Promise.all([requestsQuery.refetch(), statusesQuery.refetch()]),
    saveRequest,
    updateStatus,
    updateRequestObservation,
    deleteRequestObservation,
    deleteRequest,
  };
}

export function useCsCxRequestStatusAdmin() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["cs-cx", "request-statuses"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_request_statuses")
        .select("id, name, color, sort_order, active, is_system")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CsCxRequestStatusConfig[];
    },
  });
  const saveStatus = useMutation({
    mutationFn: async (input: { id?: string; name: string; color: string; active: boolean; sort_order: number }) => {
      const { data, error } = await db.rpc("cs_cx_save_request_status", {
        p_id: input.id ?? null,
        p_name: input.name,
        p_color: input.color,
        p_active: input.active,
        p_sort_order: input.sort_order,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateCore(queryClient),
  });
  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("cs_cx_delete_request_status", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => invalidateCore(queryClient),
  });
  return { statuses: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch, saveStatus, deleteStatus };
}

function emptyToNull(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function invalidateCore(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["cs-cx"] });
}
