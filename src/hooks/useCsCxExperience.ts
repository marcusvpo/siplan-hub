import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export const CS_CX_VISIT_STATUSES = ["aberto", "emandamento", "concluido", "reaberto"] as const;

export interface CsCxVisitChecklistItem {
  id: string;
  name: string;
  description: string | null;
  checked: boolean;
  notes: string | null;
  sort_order: number;
}

export interface CsCxVisitPendingItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string | null;
  notes: string | null;
  due_date: string | null;
  status: string;
  request_id: string | null;
}

export interface CsCxVisit {
  id: string;
  legacy_id: number | null;
  registry_office_id: string;
  visitor_profile_id: string | null;
  visit_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  objective: string;
  general_notes: string | null;
  origin: "legacy" | "hub";
  registry_office: { id: string; name: string } | null;
  visitor: { id: string; full_name: string | null } | null;
  checklist: CsCxVisitChecklistItem[];
  pending_items: CsCxVisitPendingItem[];
}

export interface CsCxVisitInput {
  id?: string;
  registry_office_id: string;
  visitor_profile_id?: string;
  visit_date: string;
  start_time?: string;
  end_time?: string;
  status: string;
  objective: string;
  general_notes?: string;
}

export interface CsCxNpsResponse {
  id: string;
  legacy_id: number | null;
  registry_office_id: string;
  responded_at: string;
  respondent_name: string;
  respondent_office: string;
  score: number;
  score_reason: string | null;
  improvement_suggestion: string | null;
  classification: "PROMOTOR" | "NEUTRO" | "DETRATOR";
  origin: "legacy" | "hub";
  registry_office: { id: string; name: string } | null;
}

export interface CsCxNpsInput {
  id?: string;
  registry_office_id: string;
  responded_at: string;
  respondent_name: string;
  respondent_office: string;
  score: number;
  score_reason?: string;
  improvement_suggestion?: string;
}

export interface CsCxNpsHistory {
  id: string;
  registry_office_id: string;
  period_start: string;
  period_end: string;
  total_responses: number;
  total_promoters: number;
  total_neutrals: number;
  total_detractors: number;
  nps_score: number;
  registry_office: { id: string; name: string } | null;
}

interface RawVisit extends Omit<CsCxVisit, "registry_office" | "visitor" | "checklist" | "pending_items"> {
  cs_cx_registry_offices: { id: string; name: string } | null;
  profiles: { id: string; full_name: string | null } | null;
}

interface RawNps extends Omit<CsCxNpsResponse, "registry_office"> {
  cs_cx_registry_offices: { id: string; name: string } | null;
}

interface RawNpsHistory extends Omit<CsCxNpsHistory, "registry_office"> {
  cs_cx_registry_offices: { id: string; name: string } | null;
}

export function useCsCxVisits() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["cs-cx", "visits"],
    queryFn: async () => {
      const [visitsResult, checklistResult, pendingResult] = await Promise.all([
        db.from("cs_cx_visits").select(`
          id, legacy_id, registry_office_id, visitor_profile_id, visit_date,
          start_time, end_time, status, objective, general_notes, origin,
          cs_cx_registry_offices (id, name),
          profiles!cs_cx_visits_visitor_profile_id_fkey (id, full_name)
        `).eq("source_present", true).order("visit_date", { ascending: false }),
        db.from("cs_cx_visit_checklist_items")
          .select("id, visit_id, name, description, checked, notes, sort_order")
          .eq("source_present", true),
        db.from("cs_cx_visit_pending_items")
          .select("id, visit_id, title, description, priority, category, notes, due_date, status, request_id")
          .eq("source_present", true),
      ]);
      if (visitsResult.error) throw visitsResult.error;
      if (checklistResult.error) throw checklistResult.error;
      if (pendingResult.error) throw pendingResult.error;

      const checklist = (checklistResult.data ?? []) as Array<CsCxVisitChecklistItem & { visit_id: string }>;
      const pending = (pendingResult.data ?? []) as Array<CsCxVisitPendingItem & { visit_id: string }>;
      return ((visitsResult.data ?? []) as unknown as RawVisit[]).map((visit) => ({
        ...visit,
        registry_office: visit.cs_cx_registry_offices,
        visitor: visit.profiles,
        checklist: checklist.filter((item) => item.visit_id === visit.id).sort((a, b) => a.sort_order - b.sort_order),
        pending_items: pending.filter((item) => item.visit_id === visit.id),
      })) satisfies CsCxVisit[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["cs-cx", "profile-options"],
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string | null }>;
    },
  });

  const saveVisit = useMutation({
    mutationFn: async (input: CsCxVisitInput) => {
      const payload = {
        registry_office_id: input.registry_office_id,
        visitor_profile_id: emptyToNull(input.visitor_profile_id),
        visit_date: input.visit_date,
        start_time: emptyToNull(input.start_time),
        end_time: emptyToNull(input.end_time),
        status: input.status,
        objective: input.objective.trim(),
        general_notes: emptyToNull(input.general_notes),
      };
      if (input.id) {
        const { data, error } = await db.from("cs_cx_visits").update(payload).eq("id", input.id).select().single();
        if (error) throw error;
        return data;
      }
      const user = await currentUser();
      const { data, error } = await db.from("cs_cx_visits").insert({
        ...payload,
        visitor_profile_id: payload.visitor_profile_id ?? user.id,
        origin: "hub",
        source_present: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const setVisitStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("cs_cx_visits").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await db.from("cs_cx_visit_checklist_items").update({ checked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const deleteVisit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_visits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  return {
    visits: query.data ?? [],
    profiles: profilesQuery.data ?? [],
    isLoading: query.isLoading || profilesQuery.isLoading,
    error: query.error ?? profilesQuery.error,
    refetch: query.refetch,
    saveVisit,
    setVisitStatus,
    toggleChecklist,
    deleteVisit,
  };
}

export function useCsCxNps() {
  const queryClient = useQueryClient();
  const responsesQuery = useQuery({
    queryKey: ["cs-cx", "nps-responses"],
    queryFn: async () => {
      const { data, error } = await db.from("cs_cx_nps_responses").select(`
        id, legacy_id, registry_office_id, responded_at, respondent_name,
        respondent_office, score, score_reason, improvement_suggestion,
        classification, origin, cs_cx_registry_offices (id, name)
      `).eq("source_present", true).order("responded_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as RawNps[]).map((response) => ({
        ...response,
        registry_office: response.cs_cx_registry_offices,
      })) satisfies CsCxNpsResponse[];
    },
  });

  const historyQuery = useQuery({
    queryKey: ["cs-cx", "nps-history"],
    queryFn: async () => {
      const { data, error } = await db.from("cs_cx_nps_history").select(`
        id, registry_office_id, period_start, period_end, total_responses,
        total_promoters, total_neutrals, total_detractors, nps_score,
        cs_cx_registry_offices (id, name)
      `).eq("source_present", true).order("period_end", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as RawNpsHistory[]).map((history) => ({
        ...history,
        registry_office: history.cs_cx_registry_offices,
      })) satisfies CsCxNpsHistory[];
    },
  });

  const saveResponse = useMutation({
    mutationFn: async (input: CsCxNpsInput) => {
      const payload = {
        registry_office_id: input.registry_office_id,
        responded_at: new Date(input.responded_at).toISOString(),
        respondent_name: input.respondent_name.trim(),
        respondent_office: input.respondent_office.trim(),
        score: input.score,
        score_reason: emptyToNull(input.score_reason),
        improvement_suggestion: emptyToNull(input.improvement_suggestion),
        classification: classifyNps(input.score),
      };
      if (input.id) {
        const { data, error } = await db.from("cs_cx_nps_responses").update(payload).eq("id", input.id).select().single();
        if (error) throw error;
        return data;
      }
      const user = await currentUser();
      const { data, error } = await db.from("cs_cx_nps_responses").insert({
        ...payload,
        author_profile_id: user.id,
        origin: "hub",
        source_present: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const deleteResponse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("cs_cx_nps_responses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  return {
    responses: responsesQuery.data ?? [],
    history: historyQuery.data ?? [],
    isLoading: responsesQuery.isLoading || historyQuery.isLoading,
    error: responsesQuery.error ?? historyQuery.error,
    refetch: responsesQuery.refetch,
    saveResponse,
    deleteResponse,
  };
}

export function classifyNps(score: number): "PROMOTOR" | "NEUTRO" | "DETRATOR" {
  if (score >= 9) return "PROMOTOR";
  if (score >= 7) return "NEUTRO";
  return "DETRATOR";
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

function invalidateExperience(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["cs-cx"] });
}
