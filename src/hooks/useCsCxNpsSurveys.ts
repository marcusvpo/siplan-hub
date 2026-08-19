import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  CsCxNpsInvitation,
  CsCxNpsQuestionnaire,
  NpsQuestionnaireSnapshot,
} from "@/types/cs-cx-nps-survey";
import {
  normalizeNpsTheme,
  NPS_THEME_ASSET_BUCKET,
  validateNpsBackgroundFile,
} from "@/lib/cs-cx-nps-survey";

const db = supabase as unknown as SupabaseClient;

interface RawInvitation extends Omit<
  CsCxNpsInvitation,
  "registry_office" | "contact" | "questionnaire"
> {
  cs_cx_registry_offices: { id: string; name: string } | null;
  cs_cx_contacts: { id: string; contact_person: string } | null;
  cs_cx_nps_questionnaires: { id: string; title: string } | null;
}

export interface SaveQuestionnaireInput extends NpsQuestionnaireSnapshot {
  id?: string;
  is_active: boolean;
  is_default: boolean;
}

export interface CreateNpsInvitationInput {
  questionnaire_id: string;
  registry_office_id: string;
  contact_id?: string;
  recipient_name: string;
  recipient_email?: string;
  expires_at: string;
}

export function effectiveInvitationStatus(
  invitation: Pick<CsCxNpsInvitation, "status" | "expires_at">,
) {
  return invitation.status === "PENDENTE" &&
    new Date(invitation.expires_at).getTime() <= Date.now()
    ? ("EXPIRADO" as const)
    : invitation.status;
}

export function useCsCxNpsSurveys() {
  const queryClient = useQueryClient();
  const questionnairesQuery = useQuery({
    queryKey: ["cs-cx", "nps-questionnaires"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_nps_questionnaires")
        .select(
          "id, title, description, questions, theme, is_active, is_default, created_at, updated_at",
        )
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CsCxNpsQuestionnaire[];
    },
  });

  const invitationsQuery = useQuery({
    queryKey: ["cs-cx", "nps-invitations"],
    queryFn: async () => {
      const { data, error } = await db
        .from("cs_cx_nps_invitations")
        .select(
          `
        id, public_token, questionnaire_id, registry_office_id, contact_id,
        recipient_name, recipient_email, questionnaire_snapshot, status,
        expires_at, responded_at, response_id, created_at,
        cs_cx_registry_offices (id, name),
        cs_cx_contacts (id, contact_person),
        cs_cx_nps_questionnaires (id, title)
      `,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as RawInvitation[]).map((invitation) => ({
        ...invitation,
        status: effectiveInvitationStatus(invitation),
        registry_office: invitation.cs_cx_registry_offices,
        contact: invitation.cs_cx_contacts,
        questionnaire: invitation.cs_cx_nps_questionnaires,
      })) satisfies CsCxNpsInvitation[];
    },
    refetchInterval: 15_000,
  });

  const saveQuestionnaire = useMutation({
    mutationFn: async (input: SaveQuestionnaireInput) => {
      const payload = {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        questions: input.questions,
        theme: normalizeNpsTheme(input.theme),
        is_active: input.is_active,
        is_default: input.is_default,
      };
      if (input.id) {
        const { data, error } = await db
          .from("cs_cx_nps_questionnaires")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data as CsCxNpsQuestionnaire;
      }
      const user = await currentUser();
      const { data, error } = await db
        .from("cs_cx_nps_questionnaires")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as CsCxNpsQuestionnaire;
    },
    onSuccess: () => invalidateNpsSurveys(queryClient),
  });

  const setQuestionnaireActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await db
        .from("cs_cx_nps_questionnaires")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateNpsSurveys(queryClient),
  });

  const uploadQuestionnaireBackground = useMutation({
    mutationFn: async (file: File) => {
      const validation = validateNpsBackgroundFile(file);
      if (validation) throw new Error(validation);
      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
      const path = `themes/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from(NPS_THEME_ASSET_BUCKET)
        .upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
      if (error) throw error;
      return path;
    },
  });

  const setDefaultQuestionnaire = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_nps_questionnaires")
        .update({ is_default: true, is_active: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateNpsSurveys(queryClient),
  });

  const createInvitation = useMutation({
    mutationFn: async (input: CreateNpsInvitationInput) => {
      const { data, error } = await db.rpc("cs_cx_create_nps_invitation", {
        p_questionnaire_id: input.questionnaire_id,
        p_registry_office_id: input.registry_office_id,
        p_contact_id: input.contact_id || null,
        p_recipient_name: input.recipient_name,
        p_recipient_email: input.recipient_email || null,
        p_expires_at: input.expires_at,
      });
      if (error) throw error;
      return data as CsCxNpsInvitation;
    },
    onSuccess: () => invalidateNpsSurveys(queryClient),
  });

  const cancelInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("cs_cx_nps_invitations")
        .update({ status: "CANCELADO", cancelled_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "PENDENTE");
      if (error) throw error;
    },
    onSuccess: () => invalidateNpsSurveys(queryClient),
  });

  return {
    questionnaires: questionnairesQuery.data ?? [],
    invitations: invitationsQuery.data ?? [],
    isLoading: questionnairesQuery.isLoading || invitationsQuery.isLoading,
    error: questionnairesQuery.error ?? invitationsQuery.error,
    refetch: async () =>
      Promise.all([questionnairesQuery.refetch(), invitationsQuery.refetch()]),
    saveQuestionnaire,
    uploadQuestionnaireBackground,
    setQuestionnaireActive,
    setDefaultQuestionnaire,
    createInvitation,
    cancelInvitation,
  };
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Usuário não autenticado.");
  return data.user;
}

function invalidateNpsSurveys(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    queryKey: ["cs-cx", "nps-questionnaires"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["cs-cx", "nps-invitations"],
  });
  void queryClient.invalidateQueries({ queryKey: ["cs-cx", "nps-responses"] });
}
