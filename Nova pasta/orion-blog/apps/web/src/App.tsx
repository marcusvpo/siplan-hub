//Author: Erik Marques
import { FormEvent, useEffect, useState } from "react";
import { adminApi, Item, Product, Publication, Version, System, publicApi } from "./api";

import { PublicationEditor, VersionEditor, type EditorDraft } from "./PostEditor";
import { PublicationContent } from "./PublicationContent";

import { VersionIcon, systemIcons } from "./VersionIcon";
import { PostCover } from "./PostCover";
import { PostActions, postPath } from "./PostActions";
import { PostAnalytics } from "./PostAnalytics";
import { SuggestionsInbox } from "./SuggestionsInbox";
import { ManagementIcon } from "./ManagementIcon";
import { ReaderManagementAccess, ViewModeSwitch, useAdminAccess } from "./AdminAccess";
import { EmptyPosts } from "./EmptyPosts";
import { FilterTabs } from "./FilterTabs";
import { HomeLatest } from "./Home";
import { BlogSignature } from "./BlogSignature";
import { ListingTools, ListingPagination, SearchEmpty, versionOrders, publicationOrders, type VersionOrder, type PublicationOrder } from "./ListingTools";
import { BackToVersions, PublicationIcon, PublicationMeta, VersionOverview } from "./PublicationUi";
import { AppLink } from "./navigation";
import { appPath, routePath } from "./paths";
import { ContentTransition } from "./ContentTransition";
import "./engagement.css";

const HOME_PATH = appPath("/inicio");

const products: Product[] = [
  { nome: "Todos os sistemas", slug: "" },
  { nome: "OrionTN", slug: "oriontn" },
  { nome: "OrionPRO", slug: "orionpro" },
  { nome: "OrionREG", slug: "orionreg" },
];
const typeOptions = [
  { value: "", label: "Todos" },
  { value: "novidade", label: "Novidades" },
  { value: "melhoria", label: "Melhorias" },
  { value: "correcao", label: "Correções" },
  { value: "aviso", label: "Avisos" },
];
const typeRouteMap: Record<string, string> = { novidade: "novidades", melhoria: "melhorias", correcao: "correcoes", aviso: "avisos" };
const routeTypeMap: Record<string, string> = Object.fromEntries(Object.entries(typeRouteMap).map(([key, value]) => [value, key]));

type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem("orion-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // A preferência do sistema continua disponível quando o armazenamento não puder ser acessado.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem("orion-theme", theme); } catch { /* armazenamento opcional */ }
  }, [theme]);
  const dark = theme === "dark";
  return <button className="theme-toggle" type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"} title={dark ? "Ativar tema claro" : "Ativar tema escuro"} aria-pressed={dark}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dark ? <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>}
    </svg>
  </button>;
}

function readFilterRoute(pathname: string) {
  const parts = (routePath(pathname) ?? "/").split("/").filter(Boolean);
  const product = parts.find((part) => ["oriontn", "orionpro", "orionreg"].includes(part)) ?? "";
  const typePart = parts.find((part) => routeTypeMap[part]);
  return { product, type: typePart ? routeTypeMap[typePart] : "" };
}

function filterRoute(product: string, type: string) {
  const parts = [product, typeRouteMap[type] ?? ""].filter(Boolean);
  return parts.length > 0 ? appPath(`/${parts.join("/")}`) : HOME_PATH;
}

function filteredPostRoute(post: Publication) {
  return `${filterRoute(post.sistema, post.tipo)}?publicacao=${post.id}`;
}

function filterParams(product: string, type: string) {
  const params = new URLSearchParams();
  if (product) params.set("produto", product);
  if (type) params.set("tipo", type);
  return params;
}

type FilterIconName = "todos" | "tn" | "pro" | "reg" | "novidade" | "melhoria" | "correcao" | "aviso" | "descontinuado";

function FilterIcon({ name }: { name: FilterIconName }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "todos") return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
  const systemIcon = name === "tn" ? systemIcons.oriontn : name === "pro" ? systemIcons.orionpro : name === "reg" ? systemIcons.orionreg : null;
  if (systemIcon) return <img className="system-filter-icon" src={systemIcon} alt="" width={24} height={24} aria-hidden="true" />;
  if (name === "novidade") return <svg {...common}><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></svg>;
  if (name === "melhoria") return <svg {...common}><path d="M4 17 9 12l3 3 8-8" /><path d="M15 7h5v5" /></svg>;
  if (name === "correcao") return <svg {...common}><path d="m5 12 4 4L19 6" /><path d="M12 3a9 9 0 1 0 9 9" /></svg>;
  if (name === "aviso") return <svg {...common}><path d="M12 4 21 20H3L12 4Z" /><path d="M12 9v5M12 17h.01" /></svg>;
  return <svg {...common}><path d="M5 5h14M7 5v14h10V5M4 9h16M9 5v4M15 5v4" /></svg>;
}

function productIcon(slug: string): FilterIconName {
  return slug === "oriontn" ? "tn" : slug === "orionpro" ? "pro" : slug === "orionreg" ? "reg" : "todos";
}

function dateLabel(value?: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
}

export function App() {
  const [pathname, setPathname] = useState(routePath(window.location.pathname));
  useEffect(() => {
    const sync = () => {
      // A raiz continua válida, mas a home tem uma única URL canônica.
      if (routePath(window.location.pathname) === "/") {
        window.history.replaceState(window.history.state, "", `${HOME_PATH}${window.location.search}${window.location.hash}`);
      }
      setPathname(routePath(window.location.pathname));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  if (pathname === "/gestao") return <AdminApp />;
  if (pathname && /^\/posts(?:\/|$)/.test(pathname)) return <SharedPostPage key={pathname.split("/")[2]} id={pathname.split("/")[2] ?? ""} />;
  return <PublicApp />;
}

function SharedPostPage({ id }: { id: string }) {
  const [post, setPost] = useState<Publication | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    publicApi.detailById(id).then(value => { if (!cancelled) setPost(value); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id]);
  useEffect(() => {
    if (!post) return;
    const previous = document.title;
    document.title = `${post.titulo} — Central de Atualizações Orion`;
    // O identificador mantém o link válido mesmo após a edição da palavra-chave.
    window.history.replaceState(null, "", postPath(post));
    return () => { document.title = previous; };
  }, [post]);
  return <div className="page">
    <header className="topbar"><div className="container topbar-row reader-topbar-row"><div className="brand-title"><img src={appPath("/assets/Siplan_logo.png")} alt="Logo Siplan"/><div><h1>Central de Atualizações Orion</h1><p>Acompanhe as novidades dos sistemas</p></div></div><BlogSignature /><div className="header-tools"><ThemeToggle/></div></div></header>
    <ReaderManagementAccess />
    <main className="container shared-post">
      <BackToVersions href={post ? filterRoute(post.sistema, post.tipo) : HOME_PATH} />
      {error && <p className="error" role="alert">{error}</p>}
      <ContentTransition pending={!post && !error} contentKey={id} label="Carregando publicação…">
        {post && <PublicationArticle post={post} />}
      </ContentTransition>
    </main>
  </div>;
}

function PublicationArticle({ post }: { post: Publication }) {
  return <article className="entry post-entry reading-card is-open">
        <aside><PostCover imageId={post.capa_imagem_id} /></aside>
        <div className="entry-content publication-summary">
          <PublicationMeta item={post} />
          <h2 className="publication-title">{post.titulo}</h2>
          <p className="publication-subtitle">{post.subtitulo ?? post.resumo}</p>
          <span className="publication-system">{post.sistema_nome}</span>
        </div>
        <div className="publication-expanded"><PublicationDetails detail={post} /></div>
      </article>;
}

function PublicApp() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [data, setData] = useState<Publication[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loadedFilters, setLoadedFilters] = useState<string | null>(null);
  const [loadedPosts, setLoadedPosts] = useState<string | null>(null);
  const [loadedPostVersion, setLoadedPostVersion] = useState<number | null>(null);
  const initialRoute = readFilterRoute(window.location.pathname);
  const [product, setProduct] = useState(initialRoute.product);
  const [type, setType] = useState(initialRoute.type);
  const [targetId, setTargetId] = useState(() => new URLSearchParams(window.location.search).get("publicacao"));
  const [targetPost, setTargetPost] = useState<Publication | null>(null);
  const [loadedTargetId, setLoadedTargetId] = useState<string | null>(null);
  const isHome = !product && !type && targetId === null;
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [versionOrder, setVersionOrder] = useState<VersionOrder>('criacao_desc');
  const [versionSearch, setVersionSearch] = useState('');
  const [postOrder, setPostOrder] = useState<PublicationOrder>('recentes');
  const [postSearch, setPostSearch] = useState('');
  const [postPage, setPostPage] = useState(1);
  const [versionRequest, setVersionRequest] = useState(0);
  const [postRequest, setPostRequest] = useState(0);
  const postLimit = 20;
  const filterKey = JSON.stringify([product, type, versionOrder, versionSearch, versionRequest]);
  const postsKey = selectedVersion ? JSON.stringify([product, type, selectedVersion.id, postOrder, postSearch, postPage, postRequest]) : null;
  const loadingVersions = loadedFilters !== filterKey;
  const loadingPosts = loadedPosts !== postsKey;
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const syncRoute = () => {
      const route = readFilterRoute(window.location.pathname);
      setProduct(route.product);
      setType(route.type);
      setTargetId(new URLSearchParams(window.location.search).get("publicacao"));
      setSelectedVersion(null);
      setOpen(null);
      setError("");
      resetListingTools();
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  function resetListingTools() {
    setVersionOrder('criacao_desc'); setVersionSearch('');
    setPostOrder('recentes'); setPostSearch(''); setPostPage(1);
  }

  function searchVersions(value: string) {
    setVersionSearch(value); setVersionRequest(revision => revision + 1);
  }

  function searchPosts(value: string) {
    setPostSearch(value); setPostPage(1); setOpen(null); setPostRequest(revision => revision + 1);
  }

  function selectFilter(nextProduct: string, nextType: string) {
    if (error) setVersionRequest(revision => revision + 1);
    window.history.pushState({}, "", filterRoute(nextProduct, nextType));
    setProduct(nextProduct);
    setType(nextType);
    setTargetId(null);
    setSelectedVersion(null);
    setOpen(null);
    setError("");
    resetListingTools();
  }

  useEffect(() => {
    if (isHome || targetId !== null) return;
    let cancelled = false;
    setError("");
    setLoadedFilters(null);
    const params = filterParams(product, type);
    params.set('ordem', versionOrder);
    if (versionSearch) params.set('busca', versionSearch);
    publicApi.versions(params).then((result) => {
      if (cancelled) return;
      setVersions(result.data);
    }).catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadedFilters(filterKey); });
    return () => { cancelled = true; };
  }, [product, type, filterKey, isHome, targetId, versionOrder, versionSearch]);

  useEffect(() => {
    if (targetId === null) return;
    let cancelled = false;
    setError("");
    setTargetPost(null);
    setLoadedTargetId(null);
    // O ID mantém o atalho válido após edições de título, palavra-chave ou sistema.
    const load = /^[1-9]\d*$/.test(targetId) && Number.isSafeInteger(Number(targetId))
      ? publicApi.detailById(targetId)
      : Promise.reject(new Error("Publicação não encontrada ou indisponível."));
    load.then(post => {
      if (cancelled) return;
      setTargetPost(post);
      setProduct(post.sistema);
      setType(post.tipo);
      window.history.replaceState(window.history.state, "", filteredPostRoute(post));
    }).catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadedTargetId(targetId); });
    return () => { cancelled = true; };
  }, [targetId]);

  useEffect(() => {
    if (!selectedVersion) return undefined;
    let cancelled = false;
    setError("");
    setLoadedPosts(null);
    const params = filterParams(product, type);
    params.set("versao_id", String(selectedVersion.id));
    params.set('ordem', postOrder);
    params.set('page', String(postPage));
    params.set('limit', String(postLimit));
    if (postSearch) params.set('busca', postSearch);
    publicApi.list(params).then((result) => {
      if (cancelled) return;
      setData(result.data);
      setTotalPosts(result.meta.total);
      setLoadedPostVersion(selectedVersion.id);
    }).catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadedPosts(postsKey); });
    return () => { cancelled = true; };
  }, [selectedVersion, product, type, postsKey, postOrder, postSearch, postPage]);

  function toggle(item: Publication) {
    setOpen(open === item.id ? null : item.id);
  }

  return <div className="page">
    <header className="topbar"><div className="container topbar-row reader-topbar-row"><div className="brand-title"><img src={appPath("/assets/Siplan_logo.png")} alt="Logo Siplan" /><div><h1>Central de Atualizações Orion</h1><p>Acompanhe as novidades dos sistemas</p></div></div><BlogSignature /><div className="header-tools"><ThemeToggle /></div></div></header>
    <ReaderManagementAccess />
    <main className="container">
      <div className="filters">
        <div className="system-filter"><span className="filter-label">Sistema</span><FilterTabs className="system-tabs" label="Filtrar por sistema" scrollLabel="Rolar filtros de sistema">{products.map((item) => <button key={item.slug} className={`system-tab ${product === item.slug ? "active" : ""}`} onClick={() => selectFilter(item.slug, type)} aria-pressed={product === item.slug}><FilterIcon name={productIcon(item.slug)} /><span>{item.nome}</span></button>)}</FilterTabs></div>
        <div className="type-filter"><span className="filter-label">Tipo</span><FilterTabs className="type-tabs" label="Filtrar por tipo" scrollLabel="Rolar filtros de tipo">{typeOptions.map((option) => <button key={option.value} className={`type-tab ${type === option.value ? "active" : ""}`} onClick={() => selectFilter(product, option.value)} aria-pressed={type === option.value}><FilterIcon name={(option.value || "todos") as FilterIconName} /><span>{option.label}</span></button>)}</FilterTabs></div>
        {(!isHome) && <div className="filter-home-action">
          <button className="back-versions clear-filters" type="button" onClick={() => selectFilter("", "")}><span className="back-versions-icon"><PublicationIcon name="back" /></span><span>Limpar filtros e voltar ao início</span></button>
        </div>}
      </div>
      {error && <p className="error">{error}</p>}
      <ContentTransition contentKey={isHome ? 'home' : targetId !== null ? `target:${targetId}` : selectedVersion ? `version:${selectedVersion.id}` : 'versions'}>
      {isHome ? <HomeLatest postHref={filteredPostRoute} /> : targetId !== null ? <section className="version-posts">
        <BackToVersions onClick={() => selectFilter(product, type)} />
        <ContentTransition pending={loadedTargetId !== targetId && !error} contentKey={targetId} label="Carregando publicação…">
        {loadedTargetId === targetId && !error && targetPost && <PublicationArticle post={targetPost} />}
        </ContentTransition>
      </section> : !selectedVersion ? <>
        <ListingTools versions order={versionOrder} options={versionOrders} search={versionSearch} busy={loadingVersions}
          onOrder={setVersionOrder} onSearch={searchVersions} />
        <ContentTransition pending={loadingVersions && !error} contentKey={filterKey} label="Carregando publicações…">
          {!error && (versionSearch && versions.length === 0 ? <SearchEmpty versions onClear={() => searchVersions('')} /> :
            <VersionList versions={versions} type={type} onSelect={(version) => { setLoadedPosts(null); setSelectedVersion(version); setOpen(null); setPostOrder('recentes'); setPostSearch(''); setPostPage(1); }} />)}
        </ContentTransition>
      </> : <section className="version-posts">
        <BackToVersions onClick={() => { setSelectedVersion(null); setData([]); setError(""); }} />
        {loadedPostVersion === selectedVersion.id && !error && data.length > 0 && <VersionOverview version={selectedVersion} total={totalPosts} type={type} />}
        <ListingTools key={selectedVersion.id} order={postOrder} options={publicationOrders} search={postSearch} busy={loadingPosts}
          onOrder={value => { setPostOrder(value); setPostPage(1); setOpen(null); }}
          onSearch={searchPosts} />
        <ContentTransition pending={loadingPosts && !error} contentKey={postsKey ?? ''} label="Carregando publicações…">
        {!error && <ListingPagination page={postPage} total={totalPosts} limit={postLimit} busy={loadingPosts} onPage={page => { setPostPage(page); setOpen(null); }} />}
        <section className="feed">
          {!error && (data.length === 0 ? postSearch ? <SearchEmpty onClear={() => searchPosts('')} /> : <EmptyPosts /> : data.map((item) => <PublicationCard key={item.id} item={item} open={open === item.id} onToggle={() => toggle(item)} />))}
        </section>
        </ContentTransition>
      </section>}
      </ContentTransition>
    </main>
  </div>;
}

const versionContentLabels: Record<string, string> = {
  novidade: "as novidades vinculadas",
  melhoria: "as melhorias vinculadas",
  correcao: "as correções vinculadas",
  aviso: "os avisos vinculados",
};

function VersionList({ versions, type, onSelect }: { versions: Version[]; type: string; onSelect: (version: Version) => void }) {
  if (!versions.some(version => version.total_posts > 0)) return <EmptyPosts />;
  return <section className="versions-view"><div className="section-heading"><div><h2>Versões disponíveis</h2><p>Selecione uma versão para consultar {versionContentLabels[type] ?? "as publicações vinculadas"}.</p></div><span className="section-count">{versions.length} {versions.length === 1 ? "versão" : "versões"}</span></div><div className="version-cards">{versions.map((version) => <button className="version-card" type="button" key={version.id} onClick={() => onSelect(version)}><VersionIcon system={version.sistema} /><span className="version-card-content"><small>{version.sistema_nome} · Versão</small><strong>{version.codigo}</strong><span>{version.total_posts} {version.total_posts === 1 ? "publicação" : "publicações"}{version.ultima_publicacao ? ` · ${dateLabel(version.ultima_publicacao)}` : ""}</span></span><span className="version-card-arrow" aria-hidden="true"><PublicationIcon name="arrow" /></span></button>)}</div></section>;
}

function PublicationCard({ item, open, onToggle }: { item: Publication; open: boolean; onToggle: () => void }) {
  const [detail, setDetail] = useState<Publication | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || detail) return;
    let cancelled = false;
    setError("");
    publicApi.detail(item.slug).then(value => { if (!cancelled) setDetail(value); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [open, detail, item.slug]);
  const detailsId = `publication-${item.id}-content`;
  return <article className={`entry post-entry reading-card ${item.critico ? "critical" : ""} ${open ? "is-open" : ""}`}>
    <aside><PostCover imageId={item.capa_imagem_id} /></aside>
    <div className="entry-content publication-summary">
      <PublicationMeta item={item} />
      <h3 className="publication-title">{item.titulo}</h3>
      <p className="publication-subtitle">{item.subtitulo ?? item.resumo}</p>
      <button className="publication-read-button" type="button" onClick={onToggle} aria-expanded={open} aria-controls={detailsId} aria-label={`${open ? "Recolher detalhes" : "Ler publicação"}: ${item.titulo}`}>
        <span>{open ? "Recolher detalhes" : "Ler publicação"}</span><PublicationIcon name="arrow" />
      </button>
      {item.critico && <p className="critical-note">Esta publicação exige uma ação da serventia. Leia antes do próximo fechamento.</p>}
    </div>
    <div className="publication-expanded" id={detailsId} hidden={!open}>
      {open && error && <p className="error" role="alert">{error}</p>}
      {open && <ContentTransition pending={!detail && !error} contentKey={String(item.id)} label="Carregando publicação…">
        {detail && <PublicationDetails detail={detail} />}
      </ContentTransition>}
    </div>
  </article>;
}

function AdminApp() {
  const { access, status, refresh } = useAdminAccess();
  const [error, setError] = useState("");
  if (status === "loading") return <main className="management-access-state"><p role="status">Verificando acesso à Gestão…</p></main>;
  if (status === "error" || !access) return <main className="management-access-state"><h1>Não foi possível verificar seu acesso</h1><p>A Gestão permanece protegida. Tente novamente em instantes.</p><div><button className="secondary" onClick={() => void refresh()}>Tentar novamente</button><AppLink href={HOME_PATH}>Voltar ao blog</AppLink></div></main>;
  if (!access.canManage || !access.admin) {
    if (access.mode === "host") return <main className="management-access-state"><h1>Acesso restrito</h1><p>Somente administradores autorizados pelo sistema principal podem acessar a Gestão. Verifique sua sessão e suas permissões nesse sistema.</p><div><button className="secondary" onClick={() => void refresh()}>Verificar acesso novamente</button><AppLink href={HOME_PATH}>Voltar ao blog</AppLink></div></main>;
    return <Login onSuccess={async () => { setError(""); await refresh(); }} error={error} setError={setError} />;
  }
  return <ManagementApp key={access.admin.id} admin={access.admin} accountError={error} onLogout={async () => { try { await adminApi.logout(); setError(""); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível sair. Tente novamente."); } }} />;
}

function Login({ onSuccess, error, setError }: { onSuccess: () => Promise<void>; error: string; setError: (value: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await adminApi.login(String(form.get("email")), String(form.get("password"))); await onSuccess(); } catch (e) { setError(e instanceof Error ? e.message : "Credenciais inválidas."); } }
  return <main className="management-login">
    <div className="management-login-top"><AppLink href={HOME_PATH} className="management-back">← Voltar ao blog</AppLink><ThemeToggle /></div>
    <section className="management-login-card" aria-labelledby="management-login-title">
      <img className="management-login-logo" src={appPath("/assets/Siplan_logo.png")} alt="Logo Siplan" />
      <span className="publication-kicker">Central de Atualizações Orion</span>
      <h1 id="management-login-title">Acesso à Gestão</h1>
      <p>Seu espaço para publicar, acompanhar e ouvir os leitores.</p>
      <form onSubmit={submit}><label>E-mail<input name="email" type="email" required autoComplete="username" /></label><label>Senha<input name="password" type="password" required autoComplete="current-password" /></label><button className="primary">Entrar</button>{error && <p className="error" role="alert">{error}</p>}</form>
      <small>Acesso exclusivo para administradores.</small>
    </section>
  </main>;
}

const typeLabels: Record<string, string> = { novidade: "Novidades", melhoria: "Melhorias", correcao: "Correções", aviso: "Avisos", descontinuado: "Descontinuado" };

function ManagementApp({ admin, onLogout, accountError }: { admin: { id: number; email: string }; onLogout: () => Promise<void>; accountError?: string }) {
  const { access } = useAdminAccess();
  const [list, setList] = useState<Publication[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [product, setProduct] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [editing, setEditing] = useState<Publication | "new" | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [view, setView] = useState<"publicacoes" | "acompanhamento" | "sugestoes">("publicacoes");
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [postResult, versionResult] = await Promise.all([adminApi.list(), adminApi.versions()]);
      setList(postResult.data);
      setVersions(versionResult.data);
      setRevision(value=>value+1); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar a Gestão."); }
    finally { setLoaded(true); }
  }
  useEffect(() => { void refresh(); }, []);

  const visible = list.filter((item) => {
    if (product && !item.produtos.some((current) => current.slug === product)) return false;
    if (type && !item.tipos?.includes(type)) return false;
    return true;
  });

  async function saveVersion(codigo: string, sistema: System) {
    await adminApi.createVersion({ codigo, sistema }); setCreatingVersion(false); setError(""); await refresh();
  }

  async function edit(id: number) {
    try { setCreatingVersion(false); setError(""); setEditing(await adminApi.detail(id)); setView("publicacoes"); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível abrir a publicação."); }
  }

  async function save(draft: EditorDraft) {
    try {
      if (editing === "new") await adminApi.create(draft);
      else if (editing) await adminApi.update(editing.id, draft);
      setEditing(null); setError(""); await refresh();
    } catch (e) { throw e; }
  }

  async function removePost(id: number) {
    if (!window.confirm("Excluir esta publicação? Esta ação removerá a publicação e todo o seu conteúdo definitivamente.")) return;
    try { await adminApi.removePost(id); setOpen(null); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir a publicação."); }
  }

  async function publish(id: number) {
    try { await adminApi.publish(id); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível publicar a publicação."); }
  }

  return <div className="page management-page">
    <header className="topbar"><div className="container topbar-row">
      <div className="brand-title"><img src={appPath("/assets/Siplan_logo.png")} alt="Logo Siplan" /><div><h1>Central de Atualizações Orion</h1><p><span className="management-mode">Modo Gestão</span><span className="management-email">{admin.email}</span></p></div></div>
      <div className="management-header-actions"><ViewModeSwitch management disabled={Boolean(editing) || creatingVersion} /><ThemeToggle />{access?.mode === "local" && <button className="secondary" onClick={onLogout}><ManagementIcon name="logout" />Sair</button>}</div>
    </div></header>
    <main className="container management-main">
      {accountError && <p className="error" role="alert">{accountError}</p>}
      <nav className="management-tabs" aria-label="Visões da Gestão">
        {([{ id: "publicacoes", label: "Publicações" }, { id: "acompanhamento", label: "Acompanhamento" }, { id: "sugestoes", label: "Sugestões" }] as const).map(tab =>
          <button key={tab.id} type="button" className="secondary" aria-pressed={view === tab.id} disabled={Boolean(editing) || creatingVersion} onClick={() => setView(tab.id)}><ManagementIcon name={tab.id} /><span>{tab.label}</span></button>)}
      </nav>
      <ContentTransition contentKey={`${view}:${editing ? 'editor' : creatingVersion ? 'version-editor' : 'list'}`}>
      {view !== "sugestoes" && <div className="filters">
        <div className="system-filter"><span className="filter-label">Sistema</span><FilterTabs className="system-tabs" label="Filtrar por sistema" scrollLabel="Rolar filtros de sistema">{products.map((item) => <button key={item.slug} className={`system-tab ${product === item.slug ? "active" : ""}`} onClick={() => setProduct(item.slug)} aria-pressed={product === item.slug}><FilterIcon name={productIcon(item.slug)} /><span>{item.nome}</span></button>)}</FilterTabs></div>
        <div className="type-filter"><span className="filter-label">Tipo</span><FilterTabs className="type-tabs" label="Filtrar por tipo" scrollLabel="Rolar filtros de tipo">{typeOptions.map((option) => <button key={option.value} className={`type-tab ${type === option.value ? "active" : ""}`} onClick={() => setType(option.value)} aria-pressed={type === option.value}><FilterIcon name={(option.value || "todos") as FilterIconName} /><span>{option.label}</span></button>)}</FilterTabs></div>
      </div>}
      {view === "publicacoes" && <div className="management-toolbar">
        <div className="management-summary"><span><ManagementIcon name="publicacoes" />{visible.length} {visible.length === 1 ? "publicação" : "publicações"}</span><span><ManagementIcon name="version" />{versions.length} {versions.length === 1 ? "versão cadastrada" : "versões cadastradas"}</span></div>
        <div className="management-toolbar-actions"><button className="secondary" onClick={() => { setView("publicacoes"); setCreatingVersion(true); setEditing(null); setError(""); }}><ManagementIcon name="version" />Nova versão</button><button className="primary" disabled={versions.length === 0} onClick={() => { if (versions.length) { setView("publicacoes"); setCreatingVersion(false); setEditing("new"); setError(""); } }}><ManagementIcon name="plus" />Nova publicação</button></div>
      </div>}
      {creatingVersion && <VersionEditor defaultSystem={product} onCancel={() => setCreatingVersion(false)} onSave={saveVersion} />}
      {loaded && !error && versions.length === 0 && !creatingVersion && view === "publicacoes" && <div className="version-required"><ManagementIcon name="version" /><strong>Crie uma versão antes de cadastrar uma publicação.</strong><span>As publicações sempre precisam estar vinculadas a uma versão.</span><button className="secondary" onClick={() => setCreatingVersion(true)}>Criar primeira versão</button></div>}
      {error && view !== "sugestoes" && <p className="error" role="alert">{error}</p>}
      {editing && <PublicationEditor key={editing === "new" ? "new" : editing.id} defaultSystem={product} initial={editing === "new" ? undefined : editing} versions={versions} onCancel={() => setEditing(null)} onSave={save} />}
      {view === "acompanhamento" && <PostAnalytics key={revision} product={product} type={type} onEdit={id => void edit(id)} />}
      {view === "sugestoes" && <SuggestionsInbox />}
      {view === "publicacoes" && !editing && <ContentTransition pending={!loaded && !error} contentKey={`${product}:${type}:${revision}`} label="Carregando publicações…" retain={false}><section className="feed">{visible.length === 0 && versions.length > 0 && <p className="empty">Nenhuma publicação encontrada.</p>}{visible.map((item) => <ManagementCard key={`${revision}-${item.id}`} item={item} open={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)} onEdit={() => void edit(item.id)} onDelete={() => void removePost(item.id)} onPublish={() => void publish(item.id)} />)}</section></ContentTransition>}
      </ContentTransition>
    </main>
  </div>;
}

function ManagementCard({ item, open, onToggle, onEdit, onDelete, onPublish }: { item: Publication; open: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void; onPublish: () => void }) {
  const [detail, setDetail] = useState<Publication | null>(null);
  useEffect(() => { if (open && !detail) adminApi.detail(item.id).then(setDetail).catch(() => undefined); }, [open, detail, item.id]);
  const status = item.status ?? "rascunho";
  return <article className={`entry post-entry management-entry ${item.critico ? "critical" : ""} ${status === "arquivado" ? "archived" : ""}`}><aside><PostCover imageId={item.capa_imagem_id} preview /><div className="management-entry-meta"><strong>{item.versao}</strong><time>{dateLabel(item.publicado_em ?? undefined)}</time><div className="stamps">{item.produtos.map((product) => <span key={product.slug}>{product.slug.replace("orion", "").toUpperCase()}</span>)}</div><span className={`status-badge status-${status}`}>{status}</span></div></aside><div className="entry-content"><button className="entry-toggle" onClick={onToggle} aria-expanded={open}><h2>{item.titulo}</h2><p>{item.subtitulo ?? item.resumo}</p><small>{open ? "Recolher detalhes" : "Ler publicação"}</small></button>{item.critico && <p className="critical-note">Esta publicação exige uma ação da serventia. Leia antes do próximo fechamento.</p>}{open && detail && <PublicationDetails detail={detail} preview />}<div className="entry-actions"><button className="secondary" onClick={onEdit}><ManagementIcon name="edit" />Editar</button>{(status === "rascunho" || status === "agendado") && <button className="primary" onClick={onPublish}>Publicar agora</button>}<button className="danger" onClick={onDelete}><ManagementIcon name="delete" />Excluir</button></div></div></article>;
}

function PublicationDetails({ detail, preview = false }: { detail: Publication; preview?: boolean }) {
  return <div className="details">{detail.corpo && (detail.corpo_formato === "html" ? <PublicationContent html={detail.corpo} preview={preview} /> : <p className="body">{detail.corpo}</p>)}<ul>{detail.itens?.map((change: Item) => <li key={change.id}><span className={`type type-${change.tipo}`}>{typeLabels[change.tipo] ?? change.tipo}</span><div><h3>{change.titulo}{change.modulo && <em> em {change.modulo}</em>}</h3><p>{change.descricao}</p>{change.passos.length > 0 && <ol>{change.passos.map((step) => <li key={step.ordem}>{step.texto}</li>)}</ol>}</div></li>)}</ul>{!preview && <PostActions post={detail} />}</div>;
}
