import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;
const MEDIA_BUCKET = "orion-updates";
const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const MEDIA_ID_PATTERN = new RegExp(`(?:/orion-update-media/|/${MEDIA_BUCKET}/)(${UUID_PATTERN})\\.webp(?:\\?.*)?$`, "i");

type JsonRecord = Record<string, unknown>;

function apiError(error: { code?: string; message?: string } | null, fallback: string): Error {
  if (!error) return new Error(fallback);

  const messages: Record<string, string> = {
    "23505": "Já existe um registro com estes dados.",
    "42501": "Seu perfil não possui permissão para concluir esta ação.",
    PGRST116: "O registro solicitado não foi encontrado.",
  };

  return new Error(messages[error.code ?? ""] ?? error.message ?? fallback);
}

async function rpc<T>(name: string, args: JsonRecord = {}): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw apiError(error, "Não foi possível consultar a Central de Atualizações.");
  return data as T;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  return data.user.id;
}

function optional(params: URLSearchParams, key: string): string | null {
  return params.get(key)?.trim() || null;
}

function positiveNumber(params: URLSearchParams, key: string, fallback: number): number {
  const parsed = Number(params.get(key));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function prepareImage(file: File): Promise<Blob> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error("Use uma imagem PNG, JPEG ou WebP de até 5 MB.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 20_000_000) {
      throw new Error("A imagem excede o limite de 20 megapixels.");
    }

    const scale = Math.min(1, 2400 / bitmap.width, 2400 / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível processar a imagem neste dispositivo.");
    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível converter a imagem.")),
        "image/webp",
        0.85,
      );
    });
  } finally {
    bitmap.close();
  }
}

export function getOrionUpdateMediaId(source: string): string | null {
  return MEDIA_ID_PATTERN.exec(source)?.[1]?.toLowerCase() ?? null;
}

export function getOrionUpdateMediaUrl(id: string): string {
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(`${id}.webp`).data.publicUrl;
}

export const orionUpdatesData = {
  publicVersions(params: URLSearchParams) {
    return rpc("orion_updates_public_versions", {
      p_product: optional(params, "produto"),
      p_type: optional(params, "tipo"),
      p_order: optional(params, "ordem") ?? "criacao_desc",
      p_search: optional(params, "busca"),
    });
  },

  publicPosts(params: URLSearchParams) {
    return rpc("orion_updates_public_posts", {
      p_product: optional(params, "produto"),
      p_type: optional(params, "tipo"),
      p_version_id: optional(params, "versao_id") ? positiveNumber(params, "versao_id", 0) : null,
      p_order: optional(params, "ordem") ?? "destaques",
      p_search: optional(params, "busca"),
      p_page: positiveNumber(params, "page", 1),
      p_limit: Math.min(50, positiveNumber(params, "limit", 20)),
    });
  },

  publicPostBySlug(slug: string) {
    return rpc("orion_updates_post_detail", { p_slug: slug, p_id: null, p_management: false });
  },

  publicPostById(id: string) {
    return rpc("orion_updates_post_detail", { p_slug: null, p_id: Number(id), p_management: false });
  },

  async recordRead(postId: number) {
    const userId = await currentUserId();
    const { error } = await db.from("orion_update_reads").upsert(
      { post_id: postId, user_id: userId },
      { onConflict: "post_id,user_id", ignoreDuplicates: true },
    );
    if (error) throw apiError(error, "Não foi possível registrar a leitura.");
    return { ok: true as const };
  },

  async reaction(postId: number) {
    const userId = await currentUserId();
    const { data, error } = await db
      .from("orion_update_reactions")
      .select("type, reason")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw apiError(error, "Não foi possível carregar sua reação.");
    return { tipo: data?.type ?? null, motivo: data?.reason ?? null };
  },

  async saveReaction(postId: number, input: { tipo: "like" | "dislike" | null; motivo?: string }) {
    const userId = await currentUserId();
    if (input.tipo === null) {
      const { error } = await db
        .from("orion_update_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      if (error) throw apiError(error, "Não foi possível remover sua reação.");
      return { tipo: null, motivo: null };
    }

    const reason = input.tipo === "dislike" ? input.motivo?.trim() || null : null;
    const { data, error } = await db
      .from("orion_update_reactions")
      .upsert(
        { post_id: postId, user_id: userId, type: input.tipo, reason },
        { onConflict: "post_id,user_id" },
      )
      .select("type, reason")
      .single();
    if (error) throw apiError(error, "Não foi possível salvar sua reação.");
    return { tipo: data.type, motivo: data.reason };
  },

  async recordShare(postId: number, eventId: string, channel: "copiar" | "nativo") {
    const userId = await currentUserId();
    const { error } = await db.from("orion_update_shares").insert({
      id: eventId,
      post_id: postId,
      user_id: userId,
      channel,
    });
    if (error && error.code !== "23505") throw apiError(error, "Não foi possível registrar o compartilhamento.");
    return { ok: true as const };
  },

  async submitSuggestion(input: { envio_id: string; nome: string; cartorio: string; sugestao: string }) {
    const userId = await currentUserId();
    const payload = {
      id: input.envio_id,
      user_id: userId,
      name: input.nome.trim(),
      registry_office: input.cartorio.trim(),
      suggestion: input.sugestao.trim(),
    };
    const { error } = await db.from("orion_update_suggestions").insert(payload);
    if (error?.code === "23505") {
      const existing = await db
        .from("orion_update_suggestions")
        .select("id")
        .eq("id", input.envio_id)
        .eq("user_id", userId)
        .eq("name", payload.name)
        .eq("registry_office", payload.registry_office)
        .eq("suggestion", payload.suggestion)
        .maybeSingle();
      if (!existing.data) throw new Error("Não foi possível confirmar este envio. Feche o formulário e tente novamente.");
    } else if (error) {
      throw apiError(error, "Não foi possível enviar sua sugestão.");
    }
    return { ok: true as const };
  },

  managementVersions() {
    return rpc("orion_updates_management_versions");
  },

  createVersion(input: { codigo: string; sistema: string }) {
    return rpc("orion_updates_create_version", {
      p_code: input.codigo.trim(),
      p_system: input.sistema,
    });
  },

  managementPosts() {
    return rpc("orion_updates_management_posts");
  },

  managementPost(id: number) {
    return rpc("orion_updates_post_detail", { p_slug: null, p_id: id, p_management: true });
  },

  savePost(input: JsonRecord, id: number | null) {
    return rpc("orion_updates_save_post", { p_post: input, p_id: id });
  },

  publishPost(id: number) {
    return rpc("orion_updates_publish_post", { p_id: id });
  },

  removePost(id: number) {
    return rpc("orion_updates_delete_post", { p_id: id });
  },

  metrics(params: URLSearchParams) {
    return rpc("orion_updates_analytics", {
      p_product: optional(params, "produto"),
      p_type: optional(params, "tipo"),
      p_search: optional(params, "busca"),
      p_status: optional(params, "status") ?? "todos",
      p_focus: optional(params, "foco") ?? "todos",
      p_order: optional(params, "ordem") ?? "feedback",
      p_page: positiveNumber(params, "page", 1),
      p_limit: Math.min(20, positiveNumber(params, "limit", 20)),
      p_include_posts: params.get("incluir_publicacoes") !== "false",
    });
  },

  suggestions(params: URLSearchParams) {
    return rpc("orion_updates_suggestions", {
      p_search: optional(params, "busca"),
      p_order: optional(params, "ordem") ?? "recentes",
      p_page: positiveNumber(params, "page", 1),
      p_limit: Math.min(20, positiveNumber(params, "limit", 5)),
    });
  },

  reasons(postId: number, page: number) {
    return rpc("orion_updates_dislike_reasons", { p_post_id: postId, p_page: page });
  },

  async uploadImage(file: File) {
    const blob = await prepareImage(file);
    const id = crypto.randomUUID();
    const storagePath = `${id}.webp`;
    const upload = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, blob, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });
    if (upload.error) throw apiError(upload.error, "Não foi possível enviar a imagem.");

    const media = await db.from("orion_update_media").insert({ id, storage_path: storagePath });
    if (media.error) {
      await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
      throw apiError(media.error, "Não foi possível registrar a imagem.");
    }

    const publicUrl = getOrionUpdateMediaUrl(id);
    return { id, url: publicUrl, previewUrl: publicUrl };
  },

  async getSettings() {
    try {
      const data = await rpc<{ public_enabled: boolean; maintenance_title: string; maintenance_message: string; updated_at: string }[]>("orion_updates_get_settings");
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    } catch {
      // Fallback caso a migração ainda não tenha sido executada no banco
    }
    return {
      public_enabled: true,
      maintenance_title: "Estamos em manutenção",
      maintenance_message: "O Orion Blog está passando por melhorias no momento. Voltaremos em breve.",
    };
  },

  async updateSettings(input: { public_enabled: boolean; maintenance_title?: string; maintenance_message?: string }) {
    const data = await rpc<{ public_enabled: boolean; maintenance_title: string; maintenance_message: string; updated_at: string }[]>("orion_updates_update_settings", {
      p_public_enabled: input.public_enabled,
      p_maintenance_title: input.maintenance_title?.trim() || null,
      p_maintenance_message: input.maintenance_message?.trim() || null,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return {
      public_enabled: input.public_enabled,
      maintenance_title: input.maintenance_title || "Estamos em manutenção",
      maintenance_message: input.maintenance_message || "O Orion Blog está passando por melhorias no momento. Voltaremos em breve.",
    };
  },
};

