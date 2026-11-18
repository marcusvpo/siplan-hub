import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProjectLogCategory =
  | "view"
  | "general"
  | "edit"
  | "stages"
  | "secondary_products"
  | "chamado_0800"
  | "files"
  | "roadmap"
  | "pos_analysis"
  | "skills"
  | "automation"
  | "comment";

export type ProjectLogActionType =
  | "project_view"
  | "field_change"
  | "status_change"
  | "button_action"
  | "file_upload"
  | "file_delete"
  | "secondary_product"
  | "roadmap_change"
  | "skills_action"
  | "ai_action"
  | "sync_action"
  | "project_created"
  | "comment";

export type TimelineEventType =
  | "auto"
  | "comment"
  | "field_change"
  | "status_change"
  | "file_upload"
  | "file_delete"
  | "bulk_edit"
  | "project_created"
  | "project_deleted"
  | "project_view"
  | "stage_change"
  | "secondary_product"
  | "roadmap_change"
  | "skills_action"
  | "button_action"
  | "ai_action"
  | "sync_action";

export interface ProjectLogChangeItem {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export interface ProjectLogMetadata {
  category?: ProjectLogCategory;
  actionType?: ProjectLogActionType;
  tabLabel?: string;
  stageId?: string;
  stageLabel?: string;
  fieldLabel?: string;
  buttonLabel?: string;
  oldValue?: string;
  newValue?: string;
  changes?: ProjectLogChangeItem[];
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  source?: "modal" | "page" | string;
  openedAt?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResolvedLogActor {
  userId: string | null;
  fullName: string;
  email: string | null;
  role: string | null;
}

export interface RecordProjectActivityLogParams {
  projectId: string;
  type?: TimelineEventType;
  message: string;
  category: ProjectLogCategory;
  actionType: ProjectLogActionType;
  tabLabel?: string;
  stageId?: string;
  stageLabel?: string;
  fieldLabel?: string;
  buttonLabel?: string;
  oldValue?: string;
  newValue?: string;
  changes?: ProjectLogChangeItem[];
  authorOverride?: string;
  extraMetadata?: Record<string, unknown>;
  queryClient?: QueryClient;
  skipInvalidation?: boolean;
}

export interface RecordProjectButtonLogParams {
  projectId: string;
  category: ProjectLogCategory;
  tabLabel: string;
  buttonLabel: string;
  message?: string;
  stageId?: string;
  stageLabel?: string;
  actionType?: Extract<ProjectLogActionType, "button_action" | "ai_action" | "sync_action" | "skills_action" | "roadmap_change" | "secondary_product">;
  extraMetadata?: Record<string, unknown>;
  queryClient?: QueryClient;
}

const VALID_DB_TIMELINE_TYPES = new Set<TimelineEventType>([
  "auto",
  "comment",
  "field_change",
  "status_change",
  "file_upload",
  "file_delete",
  "bulk_edit",
  "project_created",
  "project_deleted",
  "project_view",
  "stage_change",
  "secondary_product",
  "roadmap_change",
  "skills_action",
  "button_action",
  "ai_action",
  "sync_action",
]);

const ACTOR_CACHE_TTL_MS = 30_000;
const VIEW_DEDUP_WINDOW_MS = 5_000;

let cachedActor: { actor: ResolvedLogActor; expiresAt: number } | null = null;
const recentViewLogs = new Map<string, number>();
const inFlightViewKeys = new Map<string, number>();

export function clearActorCache(): void {
  cachedActor = null;
}

export function clearProjectViewDeduplicationCache(): void {
  recentViewLogs.clear();
  inFlightViewKeys.clear();
}

function sanitizeMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function resolveDbEventType(
  requestedType: TimelineEventType | undefined,
  actionType: ProjectLogActionType,
): TimelineEventType {
  if (requestedType && VALID_DB_TIMELINE_TYPES.has(requestedType)) {
    return requestedType;
  }
  if (VALID_DB_TIMELINE_TYPES.has(actionType as TimelineEventType)) {
    return actionType as TimelineEventType;
  }
  return "auto";
}

/**
 * Resolve o usuário autenticado atual consultando auth + tabela `profiles`
 * para obter o nome completo real (ex: `Marcus Ortiz`), e-mail e função.
 */
export async function resolveCurrentActor(): Promise<ResolvedLogActor> {
  const now = Date.now();

  try {
    const authApi = (supabase as unknown as { auth?: { getUser?: () => Promise<{ data?: { user?: any } }> } })?.auth;
    if (!authApi?.getUser) {
      return { userId: null, fullName: "Sistema", email: null, role: null };
    }

    const { data } = await authApi.getUser();
    const user = data?.user;

    if (!user?.id) {
      cachedActor = null;
      return { userId: null, fullName: "Sistema", email: null, role: null };
    }

    if (
      cachedActor &&
      cachedActor.actor.userId === user.id &&
      cachedActor.expiresAt > now
    ) {
      return cachedActor.actor;
    }

    let profileFullName: string | null = null;
    let profileEmail: string | null = null;
    let profileRole: string | null = null;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        profileFullName =
          typeof profileData.full_name === "string" && profileData.full_name.trim()
            ? profileData.full_name.trim()
            : null;
        profileEmail =
          typeof profileData.email === "string" && profileData.email.trim()
            ? profileData.email.trim()
            : null;
        profileRole =
          typeof profileData.role === "string" && profileData.role.trim()
            ? profileData.role.trim()
            : null;
      }
    } catch {
      // Fallback para metadados da sessão se a consulta a profiles falhar
    }

    const metaFullName =
      typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
          ? user.user_metadata.name.trim()
          : null;

    const email = profileEmail || (typeof user.email === "string" ? user.email.trim() : null);
    const fullName = profileFullName || metaFullName || email || "Usuário";

    const actor: ResolvedLogActor = {
      userId: user.id,
      fullName,
      email,
      role: profileRole,
    };

    cachedActor = {
      actor,
      expiresAt: now + ACTOR_CACHE_TTL_MS,
    };

    return actor;
  } catch {
    return { userId: null, fullName: "Sistema", email: null, role: null };
  }
}

export async function invalidateProjectTimelineQueries(
  queryClient: QueryClient | undefined,
  projectId: string,
): Promise<void> {
  if (!queryClient || !projectId) return;
  try {
    await queryClient.invalidateQueries({ queryKey: ["timelineEvents", projectId] });
  } catch {
    // Nunca interrompe fluxo principal em caso de falha na invalidação
  }
}

/**
 * Grava um evento estruturado de atividade na tabela `timeline_events`.
 * É resiliente a falhas para não bloquear a operação principal do usuário.
 */
export async function recordProjectActivityLog(
  params: RecordProjectActivityLogParams,
): Promise<boolean> {
  if (!params.projectId || !params.message) {
    return false;
  }

  try {
    const actor = await resolveCurrentActor();
    const author = params.authorOverride?.trim() || actor.fullName;
    const dbType = resolveDbEventType(params.type, params.actionType);

    const metadata = sanitizeMetadata({
      ...(params.extraMetadata || {}),
      category: params.category,
      actionType: params.actionType,
      tabLabel: params.tabLabel,
      stageId: params.stageId,
      stageLabel: params.stageLabel,
      fieldLabel: params.fieldLabel,
      buttonLabel: params.buttonLabel,
      oldValue: params.oldValue,
      newValue: params.newValue,
      changes: params.changes && params.changes.length > 0 ? params.changes : undefined,
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role,
    });

    const { error } = await supabase.from("timeline_events").insert({
      project_id: params.projectId,
      type: dbType,
      author,
      message: params.message,
      metadata,
    });

    if (error) {
      console.error("[projectLogService] Falha ao registrar log:", error);
      return false;
    }

    if (params.queryClient && !params.skipInvalidation) {
      await invalidateProjectTimelineQueries(params.queryClient, params.projectId);
    }

    return true;
  } catch (err) {
    console.error("[projectLogService] Erro inesperado ao registrar log:", err);
    return false;
  }
}

/**
 * Registra visualização do projeto no modal ou na página de detalhes.
 * Possui deduplicação de janela curta (5s) por projeto + usuário + origem
 * para evitar registros duplicados por React StrictMode ou re-renders.
 */
export async function recordProjectViewLog(
  projectId: string,
  source: "modal" | "page",
  queryClient?: QueryClient,
): Promise<boolean> {
  if (!projectId) return false;

  const now = Date.now();
  const inFlightKey = `${projectId}:${source}`;
  const inFlightUntil = inFlightViewKeys.get(inFlightKey);
  if (inFlightUntil && inFlightUntil > now) {
    return false;
  }

  inFlightViewKeys.set(inFlightKey, now + VIEW_DEDUP_WINDOW_MS);

  try {
    const actor = await resolveCurrentActor();
    const dedupKey = `${projectId}:${actor.userId || actor.fullName}:${source}`;
    const lastLoggedAt = recentViewLogs.get(dedupKey);

    if (lastLoggedAt && Date.now() - lastLoggedAt < VIEW_DEDUP_WINDOW_MS) {
      return false;
    }

    recentViewLogs.set(dedupKey, Date.now());

    const openedAt = new Date().toISOString();
    const message =
      source === "modal"
        ? "Projeto visualizado no modal"
        : "Projeto visualizado na página de detalhes";

    const ok = await recordProjectActivityLog({
      projectId,
      type: "project_view",
      category: "view",
      actionType: "project_view",
      tabLabel: "Visualização do Projeto",
      message,
      extraMetadata: {
        source,
        openedAt,
      },
      queryClient,
    });

    if (!ok) {
      recentViewLogs.delete(dedupKey);
    }
    return ok;
  } finally {
    // Libera a trava de in-flight após conclusão; a janela de deduplicação permanece em `recentViewLogs`
    inFlightViewKeys.delete(inFlightKey);
  }
}

/**
 * Helper direto para registrar cliques e ações de botões em cabeçalhos e abas do projeto.
 */
export async function recordProjectButtonLog(
  params: RecordProjectButtonLogParams,
): Promise<boolean> {
  const actionType = params.actionType || "button_action";
  const dbType: TimelineEventType =
    actionType === "ai_action"
      ? "ai_action"
      : actionType === "sync_action"
        ? "sync_action"
        : actionType === "skills_action"
          ? "skills_action"
          : actionType === "roadmap_change"
            ? "roadmap_change"
            : actionType === "secondary_product"
              ? "secondary_product"
              : "button_action";

  return recordProjectActivityLog({
    projectId: params.projectId,
    type: dbType,
    category: params.category,
    actionType,
    tabLabel: params.tabLabel,
    stageId: params.stageId,
    stageLabel: params.stageLabel,
    buttonLabel: params.buttonLabel,
    message: params.message || `Ação "${params.buttonLabel}" executada em ${params.tabLabel}`,
    extraMetadata: params.extraMetadata,
    queryClient: params.queryClient,
  });
}
