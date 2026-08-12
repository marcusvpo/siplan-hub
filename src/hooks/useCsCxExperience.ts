import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  NpsAnswers,
  NpsQuestionnaireSnapshot,
} from "@/types/cs-cx-nps-survey";

const db = supabase as unknown as SupabaseClient;

export const CS_CX_VISIT_STATUSES = [
  "aberto",
  "emandamento",
  "concluido",
  "reaberto",
] as const;

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

export interface CsCxVisitAttachment {
  id: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  description: string | null;
  storage_path: string | null;
  uploaded_at: string;
  origin: "legacy" | "hub";
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
  attachments: CsCxVisitAttachment[];
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

export interface CsCxChecklistInput {
  id?: string;
  visit_id: string;
  name: string;
  description?: string;
  notes?: string;
  sort_order: number;
}

export interface CsCxVisitPendingInput {
  id?: string;
  visit_id: string;
  title: string;
  description: string;
  priority: string;
  category?: string;
  notes?: string;
  due_date?: string;
  status: string;
}

export interface CsCxNpsImportRow {
  responded_at: string;
  respondent_name: string;
  respondent_office: string;
  score: number;
  score_reason?: string;
  improvement_suggestion?: string;
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
  invitation_id: string | null;
  questionnaire_id: string | null;
  questionnaire_snapshot: NpsQuestionnaireSnapshot | null;
  answers: NpsAnswers;
  registry_office: { id: string; name: string } | null;
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

interface RawVisit extends Omit<
  CsCxVisit,
  "registry_office" | "visitor" | "checklist" | "pending_items" | "attachments"
> {
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
      const [visitsResult, checklistResult, pendingResult, attachmentResult] =
        await Promise.all([
          db
            .from("cs_cx_visits")
            .select(
              `
          id, legacy_id, registry_office_id, visitor_profile_id, visit_date,
          start_time, end_time, status, objective, general_notes, origin,
          cs_cx_registry_offices (id, name),
          profiles!cs_cx_visits_visitor_profile_id_fkey (id, full_name)
        `,
            )
            .eq("source_present", true)
            .order("visit_date", { ascending: false }),
          db
            .from("cs_cx_visit_checklist_items")
            .select(
              "id, visit_id, name, description, checked, notes, sort_order",
            )
            .eq("source_present", true),
          db
            .from("cs_cx_visit_pending_items")
            .select(
              "id, visit_id, title, description, priority, category, notes, due_date, status, request_id",
            )
            .eq("source_present", true),
          db
            .from("cs_cx_visit_attachments")
            .select(
              "id, visit_id, original_name, mime_type, size_bytes, description, storage_path, uploaded_at, origin",
            )
            .eq("source_present", true),
        ]);
      if (visitsResult.error) throw visitsResult.error;
      if (checklistResult.error) throw checklistResult.error;
      if (pendingResult.error) throw pendingResult.error;
      if (attachmentResult.error) throw attachmentResult.error;

      const checklist = (checklistResult.data ?? []) as Array<
        CsCxVisitChecklistItem & { visit_id: string }
      >;
      const pending = (pendingResult.data ?? []) as Array<
        CsCxVisitPendingItem & { visit_id: string }
      >;
      const attachments = (attachmentResult.data ?? []) as Array<
        CsCxVisitAttachment & { visit_id: string }
      >;
      return ((visitsResult.data ?? []) as unknown as RawVisit[]).map(
        (visit) => ({
          ...visit,
          registry_office: visit.cs_cx_registry_offices,
          visitor: visit.profiles,
          checklist: checklist
            .filter((item) => item.visit_id === visit.id)
            .sort((a, b) => a.sort_order - b.sort_order),
          pending_items: pending.filter((item) => item.visit_id === visit.id),
          attachments: attachments.filter((item) => item.visit_id === visit.id),
        }),
      ) satisfies CsCxVisit[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["cs-cx", "profile-options"],
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
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
        const { data, error } = await db
          .from("cs_cx_visits")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const user = await currentUser();
      const { data, error } = await db
        .from("cs_cx_visits")
        .insert({
          ...payload,
          visitor_profile_id: payload.visitor_profile_id ?? user.id,
          origin: "hub",
          source_present: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const setVisitStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db
        .from("cs_cx_visits")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await db
        .from("cs_cx_visit_checklist_items")
        .update({ checked })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const saveChecklistItem = useMutation({
    mutationFn: async (input: CsCxChecklistInput) => {
      const payload = {
        visit_id: input.visit_id,
        name: input.name.trim(),
        description: emptyToNull(input.description),
        notes: emptyToNull(input.notes),
        sort_order: input.sort_order,
      };
      if (input.id) {
        const { error } = await db
          .from("cs_cx_visit_checklist_items")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await db
        .from("cs_cx_visit_checklist_items")
        .insert({ ...payload, origin: "hub", source_present: true });
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const deleteChecklistItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_visit_checklist_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const savePendingItem = useMutation({
    mutationFn: async (input: CsCxVisitPendingInput) => {
      const payload = {
        visit_id: input.visit_id,
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority,
        category: emptyToNull(input.category),
        notes: emptyToNull(input.notes),
        due_date: emptyToNull(input.due_date),
        status: input.status,
      };
      if (input.id) {
        const { error } = await db
          .from("cs_cx_visit_pending_items")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await db
        .from("cs_cx_visit_pending_items")
        .insert({ ...payload, origin: "hub", source_present: true });
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const deletePendingItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_visit_pending_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const generateRequest = useMutation({
    mutationFn: async (pendingItemId: string) => {
      const { data, error } = await db.rpc("cs_cx_generate_visit_request", {
        p_pending_item_id: pendingItemId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({
      visitId,
      file,
      description,
    }: {
      visitId: string;
      file: File;
      description?: string;
    }) => {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("O arquivo deve ter no máximo 20 MB.");
      const user = await currentUser();
      const safeName = sanitizeFileName(file.name);
      const storagePath = `visits/${visitId}/${crypto.randomUUID()}-${safeName}`;
      const { error: storageError } = await supabase.storage
        .from("cs-cx-attachments")
        .upload(storagePath, file, { contentType: file.type || undefined });
      if (storageError) throw storageError;

      const { error: dbError } = await db
        .from("cs_cx_visit_attachments")
        .insert({
          visit_id: visitId,
          stored_name: storagePath.slice(storagePath.lastIndexOf("/") + 1),
          original_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          description: emptyToNull(description),
          storage_path: storagePath,
          uploaded_by: user.id,
          origin: "hub",
          source_present: true,
        });
      if (dbError) {
        await supabase.storage.from("cs-cx-attachments").remove([storagePath]);
        throw dbError;
      }
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: CsCxVisitAttachment) => {
      if (attachment.storage_path) {
        const { error } = await supabase.storage
          .from("cs-cx-attachments")
          .remove([attachment.storage_path]);
        if (error) throw error;
      }
      const { error } = await db
        .from("cs_cx_visit_attachments")
        .delete()
        .eq("id", attachment.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExperience(queryClient),
  });

  async function downloadAttachment(attachment: CsCxVisitAttachment) {
    if (!attachment.storage_path)
      throw new Error(
        "O arquivo legado ainda não foi copiado para o Supabase Storage.",
      );
    const { data, error } = await supabase.storage
      .from("cs-cx-attachments")
      .createSignedUrl(attachment.storage_path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

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
    saveChecklistItem,
    deleteChecklistItem,
    savePendingItem,
    deletePendingItem,
    generateRequest,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,
    deleteVisit,
  };
}

export function useCsCxNps() {
  const queryClient = useQueryClient();
  const responsesQuery = useQuery({
    queryKey: ["cs-cx", "nps-responses"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_nps_responses")
        .select(
          `
        id, legacy_id, registry_office_id, responded_at, respondent_name,
        respondent_office, score, score_reason, improvement_suggestion,
        classification, origin, invitation_id, questionnaire_id,
        questionnaire_snapshot, answers, cs_cx_registry_offices (id, name)
      `,
        )
        .eq("source_present", true)
        .order("responded_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as RawNps[]).map((response) => ({
        ...response,
        registry_office: response.cs_cx_registry_offices,
      })) satisfies CsCxNpsResponse[];
    },
    refetchInterval: 15_000,
  });

  const historyQuery = useQuery({
    queryKey: ["cs-cx", "nps-history"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_nps_history")
        .select(
          `
        id, registry_office_id, period_start, period_end, total_responses,
        total_promoters, total_neutrals, total_detractors, nps_score,
        cs_cx_registry_offices (id, name)
      `,
        )
        .eq("source_present", true)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as RawNpsHistory[]).map((history) => ({
        ...history,
        registry_office: history.cs_cx_registry_offices,
      })) satisfies CsCxNpsHistory[];
    },
  });

  const deleteResponse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_nps_responses")
        .delete()
        .eq("id", id);
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
    deleteResponse,
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

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.()-]+/g, "_")
    .slice(0, 180);
}

function invalidateExperience(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["cs-cx"] });
}
