import { orionUpdatesData } from "@/hooks/useOrionUpdatesData";

export type Product = { nome: string; slug: string };
export type BlogAdmin = { id: string; email: string };
export type BlogAccess = {
  mode: "host";
  canManage: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  admin: BlogAdmin | null;
  csrfToken: null;
};
export type System = "oriontn" | "orionpro" | "orionreg";
export type PostType = "novidade" | "melhoria" | "correcao" | "aviso";
export type Version = {
  id: number;
  codigo: string;
  sistema: System;
  sistema_nome: string;
  criado_em?: string;
  ultima_publicacao?: string | null;
  total_posts: number;
  nao_lidos?: number;
};
export type Step = { texto: string; ordem: number };
export type Item = { id: number; tipo: string; titulo: string; descricao: string; modulo: string; passos: Step[] };
export type Publication = {
  id: number;
  titulo: string;
  subtitulo: string;
  slug: string;
  versao: string;
  versao_id: number;
  resumo: string;
  sistema: System;
  sistema_nome: string;
  tipo: PostType;
  corpo_formato: "text" | "html";
  publicado_em: string | null;
  destaque: boolean;
  critico: boolean;
  ja_lido: boolean;
  capa_imagem_id: string | null;
  produtos: Product[];
  total_itens: number;
  tipos?: string[];
  status?: string;
  corpo?: string;
  itens?: Item[];
};
export type Reaction = { tipo: "like" | "dislike" | null; motivo: string | null };
export type PostMetrics = {
  id: number;
  titulo: string;
  slug: string;
  versao: string;
  sistema: System;
  sistema_nome: string;
  tipo: PostType;
  status: string;
  disponivel: boolean;
  criado_em: string;
  publicado_em: string | null;
  visualizacoes: number;
  likes: number;
  dislikes: number;
  compartilhamentos: number;
  aprovacao: number | null;
};
export type PageResult<T> = { data: T[]; meta: { page: number; limit: number; total: number } };
export type AnalyticsResult = PageResult<PostMetrics> & {
  atualizado_em: string;
  resumo: {
    publicacoes: number;
    disponiveis: number;
    visualizacoes: number;
    visitantes_unicos: number;
    likes: number;
    dislikes: number;
    compartilhamentos: number;
    aprovacao: number | null;
    com_feedback: number;
    sem_visualizacoes: number;
    sem_avaliacoes: number;
  };
};
export type DislikeReason = { motivo: string; atualizado_em: string };
export type SuggestionInput = { envio_id: string; nome: string; cartorio: string; sugestao: string };
export type ReaderSuggestion = { id: string; nome: string; cartorio: string; sugestao: string; criado_em: string };
export type PublicSettings = {
  public_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  updated_at?: string;
};

function required<T>(value: T | null, message: string): T {
  if (value === null) throw new Error(message);
  return value;
}

export const publicApi = {
  settings: () => orionUpdatesData.getSettings() as Promise<PublicSettings>,
  suggest: (data: SuggestionInput) => orionUpdatesData.submitSuggestion(data),
  versions: (params: URLSearchParams) =>
    orionUpdatesData.publicVersions(params) as Promise<{ data: Version[]; meta: { nao_lidas: number } }>,
  list: (params: URLSearchParams) =>
    orionUpdatesData.publicPosts(params) as Promise<{ data: Publication[]; meta: { nao_lidas: number; total: number; page: number; limit: number } }>,
  detail: async (slug: string) => required(
    await orionUpdatesData.publicPostBySlug(slug) as Publication | null,
    "Publicação não encontrada ou indisponível.",
  ),
  detailById: async (id: string) => required(
    await orionUpdatesData.publicPostById(id) as Publication | null,
    "Publicação não encontrada ou indisponível.",
  ),
  read: (id: number) => orionUpdatesData.recordRead(id),
  reaction: (id: number) => orionUpdatesData.reaction(id) as Promise<Reaction>,
  react: (id: number, data: { tipo: Reaction["tipo"]; motivo?: string }) =>
    orionUpdatesData.saveReaction(id, data) as Promise<Reaction>,
  share: (id: number, evento_id: string, canal: "copiar" | "nativo") =>
    orionUpdatesData.recordShare(id, evento_id, canal),
};

export const adminApi = {
  settings: () => orionUpdatesData.getSettings() as Promise<PublicSettings>,
  updateSettings: (data: { public_enabled: boolean; maintenance_title?: string; maintenance_message?: string }) =>
    orionUpdatesData.updateSettings(data) as Promise<PublicSettings>,
  versions: () => orionUpdatesData.managementVersions() as Promise<{ data: Version[] }>,
  createVersion: (data: unknown) =>
    orionUpdatesData.createVersion(data as { codigo: string; sistema: string }) as Promise<{ id: number; codigo: string }>,
  uploadImage: (file: File) => orionUpdatesData.uploadImage(file),
  list: () => orionUpdatesData.managementPosts() as Promise<{ data: Publication[] }>,
  metrics: (params: URLSearchParams) => orionUpdatesData.metrics(params) as Promise<AnalyticsResult>,
  suggestions: (params: URLSearchParams) => orionUpdatesData.suggestions(params) as Promise<PageResult<ReaderSuggestion>>,
  reasons: (id: number, page: number) => orionUpdatesData.reasons(id, page) as Promise<PageResult<DislikeReason>>,
  detail: async (id: number) => required(
    await orionUpdatesData.managementPost(id) as Publication | null,
    "Publicação não encontrada.",
  ),
  create: (data: unknown) => orionUpdatesData.savePost(data as Record<string, unknown>, null) as Promise<{ id: number; slug: string }>,
  update: async (id: number, data: unknown) => {
    await orionUpdatesData.savePost(data as Record<string, unknown>, id);
    return { ok: true as const };
  },
  publish: async (id: number) => {
    await orionUpdatesData.publishPost(id);
    return { ok: true as const };
  },
  removePost: async (id: number) => {
    await orionUpdatesData.removePost(id);
    return { ok: true as const };
  },
};

