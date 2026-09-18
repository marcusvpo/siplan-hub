import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminApi, type PageResult, type ReaderSuggestion } from './api';
import './suggestions-inbox.css';
import { ManagementIcon } from './ManagementIcon';
import { ContentTransition } from './ContentTransition';

function InboxIcon({ search = false }: { search?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{search ? <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></> : <path d="M21 15a3 3 0 0 1-3 3H9l-6 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3ZM7 8h10M7 12h6"/>}</svg>;
}

export function SuggestionsInbox() {
  const [draft, setDraft] = useState(''), [search, setSearch] = useState('');
  const [order, setOrder] = useState('recentes'), [pageSize, setPageSize] = useState('5');
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{ key: string; data: PageResult<ReaderSuggestion> } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const query = new URLSearchParams({ busca: search, ordem: order, page: String(page), limit: pageSize }).toString();
  const key = `${revision}:${query}`;
  const result = snapshot?.key === key ? snapshot.data : null;
  const error = failure?.key === key ? failure.message : '';
  const busy = !result && !error;
  useEffect(() => {
    let cancelled = false;
    setFailure(null);
    adminApi.suggestions(new URLSearchParams(query)).then(data => {
      if (!cancelled) { setFailure(null); setSnapshot({ key, data }); }
    }).catch(e => { if (!cancelled) setFailure({ key, message: e.message }); });
    return () => { cancelled = true; };
  }, [key, query]);

  function submit(event: FormEvent) { event.preventDefault(); setSearch(draft.trim()); setPage(1); setRevision(value => value + 1); }
  function clearSearch() { setDraft(''); setSearch(''); setPage(1); setRevision(value => value + 1); }
  function changePage(value: number) { setPage(value); heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start' }); }
  const pages = result ? Math.max(1, Math.ceil(result.meta.total / result.meta.limit)) : 1;

  return <section className="suggestions-inbox" aria-labelledby="suggestions-inbox-title">
    <header className="suggestions-inbox-heading"><div><span className="publication-kicker">Escuta do leitor</span><h2 ref={heading} id="suggestions-inbox-title" tabIndex={-1}>Sugestões dos leitores</h2><p>Ideias enviadas pela caixa de sugestões da página inicial.</p></div><button type="button" className="secondary" disabled={busy} onClick={() => setRevision(value => value + 1)}><ManagementIcon name="refresh" />Atualizar sugestões</button></header>
    <p className="suggestions-inbox-note">Consulta exclusiva da Gestão. As sugestões são gerais e não estão vinculadas a um sistema ou tipo de publicação.</p>
    <form className="suggestions-inbox-filters" role="search" aria-label="Buscar sugestões dos leitores" onSubmit={submit}>
      <div className="suggestions-inbox-search"><label htmlFor="suggestions-inbox-search">Buscar sugestão</label><div><input id="suggestions-inbox-search" type="search" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Nome, cartório ou trecho da sugestão"/><button type="submit" aria-label="Buscar nas sugestões"><InboxIcon search/></button></div></div>
      <div><label htmlFor="suggestions-inbox-order">Ordenar por</label><select id="suggestions-inbox-order" value={order} onChange={event => { setOrder(event.target.value); setPage(1); }}><option value="recentes">Mais recentes</option><option value="antigas">Mais antigas</option></select></div>
      <div><label htmlFor="suggestions-inbox-size">Por página</label><select id="suggestions-inbox-size" value={pageSize} onChange={event => { setPageSize(event.target.value); setPage(1); }}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></div>
      {search && <button type="button" className="suggestions-inbox-clear" onClick={clearSearch}>Limpar busca</button>}
    </form>
    <ContentTransition pending={busy} contentKey={key} label="Carregando sugestões…" retain={false}>
    {error && <div className="suggestions-inbox-state" role="alert"><InboxIcon/><h3>Não foi possível carregar as sugestões</h3><p>{error}</p><button type="button" className="secondary" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div>}
    {result && <>
      <div className="suggestions-inbox-count" aria-live="polite"><strong>{result.meta.total.toLocaleString('pt-BR')} {result.meta.total === 1 ? 'sugestão' : 'sugestões'} {search ? 'na busca' : result.meta.total === 1 ? 'recebida' : 'recebidas'}</strong>{result.meta.total > 0 && <span>Exibindo {(result.meta.page - 1) * result.meta.limit + 1}–{Math.min(result.meta.page * result.meta.limit, result.meta.total)}</span>}</div>
      {result.data.length === 0 ? <div className="suggestions-inbox-state"><InboxIcon/><h3>{search ? 'Nenhuma sugestão encontrada.' : 'Ainda não há sugestões.'}</h3><p>{search ? 'Experimente outro nome, cartório ou trecho da mensagem.' : 'Quando um leitor enviar uma ideia pela página inicial, ela aparecerá aqui.'}</p>{search && <button type="button" className="secondary" onClick={clearSearch}>Limpar busca</button>}</div> : <div className="suggestions-inbox-list" key={key}>
        {result.data.map(item => <details className="suggestion-inbox-item" key={item.id}>
          <summary><span className="suggestion-inbox-meta"><span className="suggestion-inbox-avatar"><InboxIcon/></span><span className="suggestion-inbox-author"><strong>{item.nome}</strong><span>{item.cartorio}</span></span><time dateTime={item.criado_em}>{new Date(item.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></span><span className="suggestion-inbox-preview">{item.sugestao}</span><span className="suggestion-inbox-action"><span className="suggestion-inbox-open">Ler sugestão</span><span className="suggestion-inbox-close">Recolher sugestão</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></summary>
          <p className="suggestion-inbox-message">{item.sugestao}</p>
        </details>)}
      </div>}
      {pages > 1 && <nav className="suggestions-inbox-pagination" aria-label="Paginação das sugestões"><button type="button" className="secondary" disabled={result.meta.page <= 1} onClick={() => changePage(result.meta.page - 1)}>Anterior</button><span>Página {result.meta.page} de {pages}</span><button type="button" className="secondary" disabled={result.meta.page >= pages} onClick={() => changePage(result.meta.page + 1)}>Próxima</button></nav>}
    </>}
    </ContentTransition>
  </section>;
}
