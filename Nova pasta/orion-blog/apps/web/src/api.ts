import { apiBase as api } from './paths';

export type Product = { nome: string; slug: string };
export type BlogAdmin = { id: number; email: string };
export type BlogAccess = { mode: 'local' | 'host'; canManage: boolean; admin: BlogAdmin | null; csrfToken: string | null };
export type System = "oriontn" | "orionpro" | "orionreg";
export type PostType = "novidade" | "melhoria" | "correcao" | "aviso";
export type Version = { id: number; codigo: string; sistema: System; sistema_nome: string; criado_em?: string; ultima_publicacao?: string | null; total_posts: number; nao_lidos?: number };
export type Step = { texto: string; ordem: number };
export type Item = { id: number; tipo: string; titulo: string; descricao: string; modulo: string; passos: Step[] };
export type Publication = {
  id: number; titulo: string; subtitulo: string; slug: string; versao: string; versao_id: number; resumo: string;
  sistema: System; sistema_nome: string; tipo: PostType; corpo_formato: "text" | "html";
  publicado_em: string | null; destaque: boolean; critico: boolean; ja_lido: boolean;
  capa_imagem_id: string | null;
  produtos: Product[]; total_itens: number; tipos?: string[]; status?: string; corpo?: string; itens?: Item[];
};
export type Reaction = { tipo: 'like' | 'dislike' | null; motivo: string | null };
export type PostMetrics = { id: number; titulo: string; slug: string; versao: string; sistema: System; sistema_nome: string; tipo: PostType; status: string; disponivel: boolean; criado_em: string; publicado_em: string | null; visualizacoes: number; likes: number; dislikes: number; compartilhamentos: number; aprovacao: number | null };
export type PageResult<T> = { data: T[]; meta: { page: number; limit: number; total: number } };
export type AnalyticsResult = PageResult<PostMetrics> & { atualizado_em: string; resumo: {
  publicacoes: number; disponiveis: number; visualizacoes: number; visitantes_unicos: number;
  likes: number; dislikes: number; compartilhamentos: number; aprovacao: number | null;
  com_feedback: number; sem_visualizacoes: number; sem_avaliacoes: number;
} };
export type DislikeReason = { motivo: string; atualizado_em: string };
export type SuggestionInput = { envio_id: string; nome: string; cartorio: string; sugestao: string };
export type ReaderSuggestion = { id: string; nome: string; cartorio: string; sugestao: string; criado_em: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${api}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  const body = await response.json().catch(() => ({})) as {
    error?: string;
    message?: string;
    details?: { fieldErrors?: Record<string, string[]> };
  };
  if (!response.ok) {
    if (path.startsWith('/admin/') && !['/admin/login', '/admin/access', '/admin/session'].includes(path) && (response.status === 401 || (response.status === 403 && body.error !== 'csrf_failed'))) {
      window.dispatchEvent(new Event('orion:access-invalidated'));
    }
    const fieldError = Object.values(body.details?.fieldErrors ?? {}).flat()[0];
    const fieldLabels: Record<string, string> = { titulo: "Título", subtitulo: "Subtítulo", slug: "Palavra-chave", versao_id: "Versão", sistema: "Sistema", tipo: "Tipo", corpo: "Conteúdo", capa_imagem_id: "Capa", publicado_em: "Data de publicação", codigo: "Versão", nome: "Nome", cartorio: "Cartório", sugestao: "Sugestão" };
    const fieldName = Object.keys(body.details?.fieldErrors ?? {})[0];
    const message = body.message
      ?? (fieldError ? `${fieldLabels[fieldName ?? ""] ?? fieldName}: ${fieldError}` : undefined)
      ?? ({
        slug_already_exists: "Já existe uma publicação com essa palavra-chave.",
        version_already_exists: "Esta versão já foi cadastrada.",
        invalid_version: "A versão selecionada não existe mais.",
        invalid_products: "Selecione apenas sistemas ativos.",
        invalid_schedule: "Uma publicação agendada precisa ter uma data futura.",
        csrf_failed: "A sessão expirou. Atualize a página e tente novamente.",
      } as Record<string, string>)[body.error ?? ""]
      ?? "Não foi possível concluir a operação.";
    throw new Error(message);
  }
  return body as T;
}

export const publicApi = {
  suggest: (data: SuggestionInput) => request<{ ok: true }>('/sugestoes', { method: 'POST', headers: { 'x-blog-action': '1' }, body: JSON.stringify(data) }),
  versions: (params: URLSearchParams) => request<{ data: Version[]; meta: { nao_lidas: number } }>(`/versoes?${params}`),
  list: (params: URLSearchParams) => request<{ data: Publication[]; meta: { nao_lidas: number; total: number; page: number; limit: number } }>(`/publicacoes?${params}`),
  detail: (slug: string) => request<Publication>(`/publicacoes/${encodeURIComponent(slug)}`),
  detailById: (id: string) => request<Publication>(`/publicacoes/id/${encodeURIComponent(id)}`),
  read: (id: number) => request<{ ok: true }>(`/publicacoes/${id}/leituras`, { method: "POST", headers: { 'x-blog-action': '1' } }),
  reaction: (id: number) => request<Reaction>(`/publicacoes/${id}/reacao`),
  react: (id: number, data: { tipo: Reaction['tipo']; motivo?: string }) => request<Reaction>(`/publicacoes/${id}/reacao`, { method: 'PUT', headers: { 'x-blog-action': '1' }, body: JSON.stringify(data) }),
  share: (id: number, evento_id: string, canal: 'copiar' | 'nativo') => request<{ ok: true }>(`/publicacoes/${id}/compartilhamentos`, { method: 'POST', headers: { 'x-blog-action': '1' }, body: JSON.stringify({ evento_id, canal }) }),
};

let csrfToken = "";
export const adminApi = {
  access: async () => {
    const result = await request<BlogAccess>('/admin/access');
    if (!['local', 'host'].includes(result.mode) || typeof result.canManage !== 'boolean' || (result.canManage && (!result.admin || typeof result.admin.email !== 'string' || !result.csrfToken))) throw new Error('Não foi possível validar o acesso à Gestão.');
    return result;
  },
  useAccess: (access: BlogAccess | null) => { csrfToken = access?.canManage ? access.csrfToken ?? '' : ''; },
  login: (email: string, password: string) => request<{ admin: { email: string } }>("/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  session: async () => {
    const result = await request<{ admin: { id: number; email: string }; csrfToken: string }>("/admin/session");
    csrfToken = result.csrfToken;
    return result.admin;
  },
  logout: () => request<{ ok: true }>("/admin/logout", { method: "POST", headers: { "x-csrf-token": csrfToken } }),
  versions: () => request<{ data: Version[] }>("/admin/versoes"),
  createVersion: (data: unknown) => request<{ id: number; codigo: string }>("/admin/versoes", { method: "POST", headers: { "x-csrf-token": csrfToken }, body: JSON.stringify(data) }),
  uploadImage: (file: File) => request<{ id: string; url: string; previewUrl: string }>("/admin/imagens", { method: "POST", headers: { "x-csrf-token": csrfToken, "Content-Type": file.type }, body: file }),
  list: () => request<{ data: Publication[] }>("/admin/publicacoes"),
  metrics: (params: URLSearchParams) => request<AnalyticsResult>(`/admin/acompanhamento?${params}`),
  suggestions: (params: URLSearchParams) => request<PageResult<ReaderSuggestion>>(`/admin/sugestoes?${params}`),
  reasons: (id: number, page: number) => request<PageResult<DislikeReason>>(`/admin/publicacoes/${id}/motivos?page=${page}`),
  detail: (id: number) => request<Publication>(`/admin/publicacoes/${id}`),
  create: (data: unknown) => request<{ id: number; slug: string }>("/admin/publicacoes", { method: "POST", headers: { "x-csrf-token": csrfToken }, body: JSON.stringify(data) }),
  update: (id: number, data: unknown) => request<{ ok: true }>(`/admin/publicacoes/${id}`, { method: "PUT", headers: { "x-csrf-token": csrfToken }, body: JSON.stringify(data) }),
  publish: (id: number) => request<{ ok: true }>(`/admin/publicacoes/${id}/publicar`, { method: "POST", headers: { "x-csrf-token": csrfToken } }),
  removePost: (id: number) => request<{ ok: true }>(`/admin/publicacoes/${id}`, { method: "DELETE", headers: { "x-csrf-token": csrfToken } }),
};
