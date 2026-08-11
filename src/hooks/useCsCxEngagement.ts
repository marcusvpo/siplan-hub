import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface CsCxContact {
  id: string;
  legacy_id: number | null;
  contact_date: string;
  notes: string | null;
  pending_items: string | null;
  product_id: string;
  contact_person: string;
  contact_details: string | null;
  registry_office_id: string;
  ticket_number: string | null;
  author_profile_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  origin: "legacy" | "hub";
  product: { id: string; name: string } | null;
  registry_office: { id: string; name: string } | null;
}

export interface CsCxContactInput {
  id?: string;
  contact_date: string;
  notes?: string;
  pending_items?: string;
  product_id: string;
  contact_person: string;
  contact_details?: string;
  registry_office_id: string;
  ticket_number?: string;
}

export const CS_CX_APPOINTMENT_TYPES = ["REUNIAO", "CALL", "VISITA", "OUTRO"] as const;
export const CS_CX_APPOINTMENT_STATUSES = ["AGENDADO", "REALIZADO", "CANCELADO", "REMARCADO", "CONCLUIDO"] as const;

export interface CsCxAppointment {
  id: string;
  legacy_id: number | null;
  title: string;
  starts_at: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  registry_office_id: string | null;
  contact_id: string | null;
  responsible_profile_id: string | null;
  created_by: string | null;
  description: string | null;
  location: string | null;
  notes: string | null;
  result: string | null;
  realized_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  origin: "legacy" | "hub";
  registry_office: { id: string; name: string } | null;
  contact: { id: string; contact_person: string } | null;
  responsible: { id: string; full_name: string | null; email: string | null } | null;
}

export interface CsCxAppointmentInput {
  id?: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  registry_office_id?: string;
  contact_id?: string;
  responsible_profile_id: string;
  description?: string;
  location?: string;
  notes?: string;
  result?: string;
}

export interface CsCxProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface RawContact extends Omit<CsCxContact, "product" | "registry_office"> {
  cs_cx_products: { id: string; name: string } | null;
  cs_cx_registry_offices: { id: string; name: string } | null;
}

interface RawAppointment extends Omit<CsCxAppointment, "registry_office" | "contact" | "responsible"> {
  cs_cx_registry_offices: { id: string; name: string } | null;
  cs_cx_contacts: { id: string; contact_person: string } | null;
  profiles: { id: string; full_name: string | null; email: string | null } | null;
}

export function useCsCxContacts() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["cs-cx", "contacts"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_contacts")
        .select(`
          id, legacy_id, contact_date, notes, pending_items, product_id,
          contact_person, contact_details, registry_office_id, ticket_number,
          author_profile_id, created_at, updated_at, origin,
          cs_cx_products (id, name),
          cs_cx_registry_offices (id, name)
        `)
        .eq("source_present", true)
        .order("contact_date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as RawContact[]).map((contact) => ({
        ...contact,
        product: contact.cs_cx_products,
        registry_office: contact.cs_cx_registry_offices,
      })) satisfies CsCxContact[];
    },
  });

  const saveContact = useMutation({
    mutationFn: async (input: CsCxContactInput) => {
      const payload = {
        contact_date: input.contact_date,
        notes: emptyToNull(input.notes),
        pending_items: emptyToNull(input.pending_items),
        product_id: input.product_id,
        contact_person: input.contact_person.trim(),
        contact_details: emptyToNull(input.contact_details),
        registry_office_id: input.registry_office_id,
        ticket_number: emptyToNull(input.ticket_number),
      };
      if (input.id) {
        const { data, error } = await db.from("cs_cx_contacts").update(payload).eq("id", input.id).select().single();
        if (error) throw error;
        return data;
      }
      const user = await currentUser();
      const { data, error } = await db.from("cs_cx_contacts").insert({
        ...payload,
        author_profile_id: user.id,
        origin: "hub",
        source_present: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateEngagement(queryClient),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateEngagement(queryClient),
  });

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    saveContact,
    deleteContact,
  };
}

export function useCsCxAppointments() {
  const queryClient = useQueryClient();
  const appointmentsQuery = useQuery({
    queryKey: ["cs-cx", "appointments"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_appointments")
        .select(`
          id, legacy_id, title, starts_at, duration_minutes, appointment_type,
          status, registry_office_id, contact_id, responsible_profile_id,
          created_by, description, location, notes, result, realized_at,
          canceled_at, created_at, updated_at, origin,
          cs_cx_registry_offices (id, name),
          cs_cx_contacts (id, contact_person),
          profiles!cs_cx_appointments_responsible_profile_id_fkey (id, full_name, email)
        `)
        .eq("source_present", true)
        .order("starts_at");
      if (error) throw error;
      return ((data ?? []) as unknown as RawAppointment[]).map((appointment) => ({
        ...appointment,
        registry_office: appointment.cs_cx_registry_offices,
        contact: appointment.cs_cx_contacts,
        responsible: appointment.profiles,
      })) satisfies CsCxAppointment[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["cs-cx", "profile-options"],
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return (data ?? []) as CsCxProfileOption[];
    },
  });

  const saveAppointment = useMutation({
    mutationFn: async (input: CsCxAppointmentInput) => {
      const payload = {
        title: input.title.trim(),
        starts_at: new Date(input.starts_at).toISOString(),
        duration_minutes: input.duration_minutes,
        appointment_type: input.appointment_type,
        status: input.status,
        registry_office_id: emptyToNull(input.registry_office_id),
        contact_id: emptyToNull(input.contact_id),
        responsible_profile_id: input.responsible_profile_id,
        description: emptyToNull(input.description),
        location: emptyToNull(input.location),
        notes: emptyToNull(input.notes),
        result: emptyToNull(input.result),
      };
      if (input.id) {
        const { data, error } = await db.from("cs_cx_appointments").update(payload).eq("id", input.id).select().single();
        if (error) throw error;
        return data;
      }
      const user = await currentUser();
      const { data, error } = await db.from("cs_cx_appointments").insert({
        ...payload,
        created_by: user.id,
        origin: "hub",
        source_present: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateEngagement(queryClient),
  });

  const setAppointmentStatus = useMutation({
    mutationFn: async ({ id, status, result, startsAt }: { id: string; status: string; result?: string; startsAt?: string }) => {
      const now = new Date().toISOString();
      const payload: Record<string, string | null> = {
        status,
        result: emptyToNull(result),
      };
      if (status === "REALIZADO" || status === "CONCLUIDO") payload.realized_at = now;
      if (status === "CANCELADO") payload.canceled_at = now;
      if (status === "REMARCADO" && startsAt) payload.starts_at = new Date(startsAt).toISOString();
      const { error } = await db.from("cs_cx_appointments").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateEngagement(queryClient),
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateEngagement(queryClient),
  });

  return {
    appointments: appointmentsQuery.data ?? [],
    profiles: profilesQuery.data ?? [],
    isLoading: appointmentsQuery.isLoading || profilesQuery.isLoading,
    error: appointmentsQuery.error ?? profilesQuery.error,
    refetch: appointmentsQuery.refetch,
    saveAppointment,
    setAppointmentStatus,
    deleteAppointment,
  };
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Usuário não autenticado.");
  return data.user;
}

function emptyToNull(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function invalidateEngagement(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["cs-cx"] });
}
