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
}

export interface CsCxRegistryOffice {
  id: string;
  legacy_id: number | null;
  name: string;
  sap_code: string | null;
  active: boolean;
  contact_details: string | null;
  notes: string | null;
  origin: "legacy" | "hub";
  created_at: string | null;
  products: CsCxOfficeProduct[];
}

export interface RegistryOfficeInput {
  id?: string;
  name: string;
  sap_code?: string;
  contact_details?: string;
  notes?: string;
  active: boolean;
  products: Array<{ product_id: string; implementation_date: string | null }>;
}

export const CS_CX_REQUEST_STATUSES = [
  "Aguardando",
  "Projeto",
  "Desenvolvimento",
  "Em andamento",
  "Finalizado",
  "Negado",
] as const;

export type CsCxRequestStatus = (typeof CS_CX_REQUEST_STATUSES)[number];

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
  notes?: string;
  registry_office_id: string;
}

interface RawOffice extends Omit<CsCxRegistryOffice, "products"> {
  cs_cx_registry_office_products?: Array<{
    id: string;
    product_id: string;
    implementation_date: string | null;
    cs_cx_products: CsCxProduct | null;
  }>;
}

interface RawRequest extends Omit<CsCxRequest, "registry_office"> {
  cs_cx_registry_offices: { id: string; name: string } | null;
}

export function useCsCxRegistryOffices() {
  const queryClient = useQueryClient();

  const officesQuery = useQuery({
    queryKey: ["cs-cx", "registry-offices"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_registry_offices")
        .select(`
          id, legacy_id, name, sap_code, active, contact_details, notes,
          origin, created_at,
          cs_cx_registry_office_products (
            id, product_id, implementation_date,
            cs_cx_products (id, name, product_code)
          )
        `)
        .eq("source_present", true)
        .order("name");
      if (error) throw error;

      return ((data ?? []) as unknown as RawOffice[]).map((office) => ({
        ...office,
        products: (office.cs_cx_registry_office_products ?? []).map((link) => ({
          id: link.id,
          product_id: link.product_id,
          implementation_date: link.implementation_date,
          product: link.cs_cx_products,
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

  const saveOffice = useMutation({
    mutationFn: async (input: RegistryOfficeInput) => {
      const { data, error } = await db.rpc("cs_cx_save_registry_office", {
        p_id: input.id ?? null,
        p_name: input.name,
        p_sap_code: emptyToNull(input.sap_code),
        p_contact_details: emptyToNull(input.contact_details),
        p_notes: emptyToNull(input.notes),
        p_active: input.active,
        p_products: input.products,
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

  return {
    offices: officesQuery.data ?? [],
    products: productsQuery.data ?? [],
    isLoading: officesQuery.isLoading || productsQuery.isLoading,
    error: officesQuery.error ?? productsQuery.error,
    refetch: officesQuery.refetch,
    saveOffice,
    deleteOffice,
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
          cs_cx_registry_offices (id, name)
        `)
        .eq("source_present", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      return ((data ?? []) as unknown as RawRequest[]).map((request) => ({
        ...request,
        registry_office: request.cs_cx_registry_offices,
      })) satisfies CsCxRequest[];
    },
  });

  const saveRequest = useMutation({
    mutationFn: async (input: CsCxRequestInput) => {
      const payload = {
        ticket_number: emptyToNull(input.ticket_number),
        description: emptyToNull(input.description),
        module: emptyToNull(input.module),
        requester: emptyToNull(input.requester),
        responsible: emptyToNull(input.responsible),
        requested_on: emptyToNull(input.requested_on),
        expected_delivery_on: emptyToNull(input.expected_delivery_on),
        delivered_on: emptyToNull(input.delivered_on),
        status: input.status,
        notes: emptyToNull(input.notes),
        registry_office_id: input.registry_office_id,
        updated_at: new Date().toISOString(),
      };

      if (input.id) {
        const { data, error } = await db
          .from("cs_cx_requests")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const { data, error } = await db
        .from("cs_cx_requests")
        .insert({
          ...payload,
          author_profile_id: authData.user?.id ?? null,
          origin: "hub",
          source_present: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db
        .from("cs_cx_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
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

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCore(queryClient),
  });

  return {
    requests: requestsQuery.data ?? [],
    isLoading: requestsQuery.isLoading,
    error: requestsQuery.error,
    refetch: requestsQuery.refetch,
    saveRequest,
    updateStatus,
    deleteRequest,
  };
}

function emptyToNull(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function invalidateCore(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["cs-cx"] });
}
