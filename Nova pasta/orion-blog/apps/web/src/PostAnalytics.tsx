//Author: Erik Marques
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, type AnalyticsResult, type DislikeReason, type PageResult, type PostMetrics } from './api';
import { postTypes, systems } from './content';
import { ContentTransition } from './ContentTransition';
import './analytics.css';

type Focus = 'todos' | 'feedback' | 'sem_visualizacoes' | 'sem_avaliacoes';
const counts = new Intl.NumberFormat('pt-BR');
const percent = (value: number | null) => value === null ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
const statuses: Record<string, string> = { publicado: 'Publicado', rascunho: 'Rascunho', agendado: 'Agendado', arquivado: 'Arquivado' };
type IconName = 'eye' | 'reactions' | 'share' | 'document' | 'message' | 'search' | 'refresh' | 'edit' | 'close' | 'chevron';
function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'eye' && <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>}
    {name === 'document' && <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8M8 17h5"/>}
    {name === 'reactions' && <path d="M7 10v11H3V10h4Zm0 0 5-8c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7"/>}
    {name === 'share' && <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>}
    {name === 'message' && <path d="M21 15a3 3 0 0 1-3 3H9l-6 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3ZM7 8h10M7 12h6"/>}
    {name === 'search' && <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>}
    {name === 'refresh' && <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/></>}
    {name === 'edit' && <path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z"/>}
    {name === 'close' && <path d="m6 6 12 12M6 18 18 6"/>}
    {name === 'chevron' && <path d="m6 9 6 6 6-6"/>}
  </svg>;
}

export function PostAnalytics({ product, type, onEdit }: { product: string; type: string; onEdit: (id: number) => void }) {
  const [snapshot, setSnapshot] = useState<{ key: string; scope: string; result: AnalyticsResult } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [expanded, setExpanded] = useState(false), [pageSize, setPageSize] = useState('5');
  const resultsToggle = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [order, setOrder] = useState('feedback'), [status, setStatus] = useState('todos');
  const [focus, setFocus] = useState<Focus>('todos');
  const [search, setSearch] = useState(''), [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<PostMetrics | null>(null);
  const hasFilters = Boolean(product || type || search || status !== 'todos' || focus !== 'todos');
  const summaryScope = JSON.stringify([product, type, search, status]);
  // Mantém a estrutura montada, mas preserva a limpeza dos recortes ao trocar sistema/tipo.
  useEffect(() => {
    setPage(1); setSelected(null); setExpanded(false); setPageSize('5');
    setOrder('feedback'); setStatus('todos'); setFocus('todos'); setSearch(''); setDraft('');
  }, [product, type]);
  const params = new URLSearchParams({ page: String(page), limit: pageSize, ordem: order, status, foco: focus, busca: search, incluir_publicacoes: String(expanded && hasFilters) });
  if (product) params.set('produto', product);
  if (type) params.set('tipo', type);
  const query = params.toString(), requestKey = `${revision}:${query}`;
  // Resultados anteriores nunca reaparecem sob novos filtros ou após minimizar.
  const result = snapshot?.key === requestKey ? snapshot.result : null;
  const error = failure?.key === requestKey ? failure.message : '';
  const summaryResult = !error && snapshot?.scope === summaryScope ? snapshot.result : null;
  useEffect(() => {
    let cancelled = false;
    setSelected(null); setFailure(null);
    adminApi.metrics(new URLSearchParams(query)).then(value => { if (!cancelled) { setFailure(null); setSnapshot({ key: requestKey, scope: summaryScope, result: value }); } })
      .catch(e => { if (!cancelled) setFailure({ key: requestKey, message: e.message }); });
    return () => { cancelled = true; };
  }, [query, requestKey, summaryScope]);
  const busy = !result && !error;
  function applySearch(event: FormEvent) {
    event.preventDefault(); setSearch(draft.trim()); setPage(1); setFocus('todos'); setExpanded(true); setRevision(value => value + 1);
  }
  function selectFocus(value: Focus) { setFocus(value); setPage(1); if (value !== 'todos') setExpanded(true); }
  function clearLocalFilters() { setSearch(''); setDraft(''); setStatus('todos'); setFocus('todos'); setPage(1); setExpanded(false); setRevision(value => value + 1); }
  function changePage(value: number) {
    setPage(value);
    resultsToggle.current?.focus({ preventScroll: true });
    resultsToggle.current?.scrollIntoView({ block: 'start' });
  }
  const scope = `${systems.find(system => system.slug === product)?.nome ?? 'Todos os sistemas'} · ${postTypes.find(option => option.value === type)?.label ?? 'Todos os tipos'}`;
  const summary = summaryResult?.resumo;
  const resultsCaption = !hasFilters ? 'Escolha os filtros para consultar as publicações.'
    : error ? 'Não foi possível carregar os resultados.'
    : result ? `${counts.format(result.meta.total)} ${result.meta.total === 1 ? 'publicação encontrada' : 'publicações encontradas'}${focus !== 'todos' ? ' neste recorte de atenção' : ' nos filtros selecionados'}`
    : 'Atualizando resultados…';

  return <section className="analytics-panel manager-dashboard" aria-labelledby="analytics-heading">
    <header className="manager-heading">
      <div><span className="publication-kicker">Visão gerencial</span><h2 id="analytics-heading">Acompanhamento das publicações</h2><p>Entenda os resultados e encontre oportunidades de melhorar o conteúdo.</p></div>
      <button className="secondary manager-refresh" type="button" disabled={busy} onClick={() => setRevision(value => value + 1)}><Icon name="refresh"/>Atualizar painel</button>
    </header>
    <div className="manager-scope"><span>{scope}</span><span>Dados acumulados{summaryResult && <> · Atualizado às <time dateTime={summaryResult.atualizado_em}>{new Date(summaryResult.atualizado_em).toLocaleTimeString('pt-BR')}</time></>}</span></div>
    <form className="manager-controls" role="search" aria-label="Filtros do acompanhamento" onSubmit={applySearch}>
      <div className="manager-search"><label htmlFor="manager-title-search">Buscar publicação</label><div><input id="manager-title-search" type="search" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Digite o título da publicação"/><button type="submit" aria-label="Buscar no acompanhamento"><Icon name="search"/></button></div></div>
      <div className="manager-control"><label htmlFor="manager-status-filter">Status</label><select id="manager-status-filter" value={status} onChange={event => { setStatus(event.target.value); setPage(1); setFocus('todos'); if (event.target.value !== 'todos') setExpanded(true); }}><option value="todos">Todos os status</option>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
      <div className="manager-control"><label htmlFor="manager-order">Ordenar por</label><select id="manager-order" value={order} onChange={event => { setOrder(event.target.value); setPage(1); }}><option value="feedback">Mais “Não gostei”</option><option value="visualizacoes">Mais visualizações</option><option value="compartilhamentos">Mais compartilhamentos</option><option value="aprovacao">Menor aprovação</option><option value="recentes">Criação mais recente</option></select></div>
      {(search || status !== 'todos' || focus !== 'todos') && <button className="manager-clear" type="button" onClick={clearLocalFilters}>Limpar busca e recortes</button>}
    </form>
    {error && <div className="manager-state" role="alert"><Icon name="message"/><h3>Não foi possível carregar o painel</h3><p>{error}</p><button type="button" className="secondary" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div>}
    <ContentTransition pending={busy && !summary} contentKey={summaryScope} label="Carregando indicadores…" retain={false}>
    {summary && <>
      <div className="manager-kpis" aria-label="Resumo de todas as publicações do recorte">
        <Metric icon="document" title="Publicações" value={counts.format(summary.publicacoes)}><span>{counts.format(summary.disponiveis)} disponíveis para leitura</span></Metric>
        <Metric icon="eye" title="Visualizações" value={counts.format(summary.visualizacoes)}><span>{counts.format(summary.visitantes_unicos)} navegadores/dispositivos no conjunto</span></Metric>
        <Metric icon="reactions" title="Aprovação" value={percent(summary.aprovacao)}><span>{counts.format(summary.likes)} Gostei · {counts.format(summary.dislikes)} Não gostei</span><Approval value={summary.aprovacao} votes={summary.likes + summary.dislikes} compact /></Metric>
        <Metric icon="share" title="Compartilhamentos" value={counts.format(summary.compartilhamentos)}><span>Ações de copiar link ou compartilhar</span></Metric>
      </div>
      <section className="manager-priorities" aria-labelledby="manager-priority-heading">
        <div className="manager-section-heading"><div><h3 id="manager-priority-heading">Onde concentrar a atenção</h3><p>Selecione um recorte para analisar as publicações abaixo.</p></div>{focus !== 'todos' && <button type="button" className="manager-all" onClick={() => selectFocus('todos')}>Limpar recorte de atenção</button>}</div>
        <div className="manager-priority-grid">
          <Priority value="feedback" active={focus} onSelect={selectFocus} total={summary.com_feedback} icon="message" title="Com feedback negativo" text="Leia os motivos e avalie o que pode ser esclarecido." />
          <Priority value="sem_visualizacoes" active={focus} onSelect={selectFocus} total={summary.sem_visualizacoes} icon="eye" title="Sem visualizações" text="Confira a divulgação das publicações disponíveis." />
          <Priority value="sem_avaliacoes" active={focus} onSelect={selectFocus} total={summary.sem_avaliacoes} icon="reactions" title="Lidas, sem avaliações" text="Conteúdos que ainda não receberam uma reação." />
        </div>
        <p className="manager-note">Os indicadores acima consideram todo o recorte de sistema, tipo, busca e status. Estes atalhos filtram apenas a lista.</p>
      </section>
    </>}
    </ContentTransition>
      <section className="manager-list" aria-labelledby="manager-list-title">
        <h3 id="manager-list-title" className="manager-results-heading"><button ref={resultsToggle} type="button" className="manager-results-toggle" aria-expanded={expanded} aria-controls="manager-results-body" aria-label={`${expanded ? 'Minimizar' : 'Maximizar'} resultados por publicação`} onClick={() => { setExpanded(value => !value); setSelected(null); }}><span><span className="manager-results-title">Resultados por publicação</span><small>{resultsCaption}</small></span><span className="manager-results-action">{expanded ? 'Minimizar' : 'Maximizar'}<Icon name="chevron"/></span></button></h3>
        <div id="manager-results-body" hidden={!expanded}>
        {expanded && <>
        {!hasFilters ? <div className="manager-state manager-results-prompt"><Icon name="search"/><h4>O que você deseja analisar?</h4><p>Selecione um sistema, tipo, status, busque pelo título ou escolha um recorte de atenção acima. A lista será exibida somente para os filtros aplicados.</p><button type="button" className="secondary" onClick={() => document.getElementById('manager-title-search')?.focus()}>Buscar uma publicação</button></div> : <>
        <div className="manager-results-tools"><span aria-live="polite">{result && result.meta.total > 0 ? `Exibindo ${(result.meta.page - 1) * result.meta.limit + 1}–${Math.min(result.meta.page * result.meta.limit, result.meta.total)} de ${counts.format(result.meta.total)}` : 'Resultados conforme os filtros aplicados'}</span><div><label htmlFor="manager-page-size">Por página</label><select id="manager-page-size" value={pageSize} onChange={event => { setPageSize(event.target.value); setPage(1); }}><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></div></div>
        <ContentTransition pending={busy} contentKey={requestKey} label="Carregando publicações filtradas…" retain={false}>
        {error && <p className="manager-note">Os resultados não foram carregados. Use “Tentar novamente” acima.</p>}
        {result && (result.data.length === 0 ? <div className="manager-state"><Icon name="document"/><h4>Nenhuma publicação encontrada para estes filtros.</h4><p>{focus === 'feedback' ? 'Não há reações negativas neste recorte.' : 'Experimente outro sistema, tipo, status ou termo de busca.'}</p>{(focus !== 'todos' || search || status !== 'todos') && <button type="button" className="secondary" onClick={clearLocalFilters}>Ampliar análise</button>}</div> : <>
          <div className="manager-table-wrap"><table className="manager-table"><caption className="manager-sr-only">Métricas acumuladas por publicação. A aprovação considera apenas as avaliações recebidas.</caption>
            <thead><tr><th scope="col">Publicação</th><th scope="col">Visualizações</th><th scope="col">Gostei</th><th scope="col">Não gostei</th><th scope="col">Compartilhamentos</th><th scope="col">Aprovação</th><th scope="col">Ações</th></tr></thead>
            <tbody>{result.data.map(post => <tr key={post.id} className={post.dislikes > 0 ? 'manager-has-feedback' : ''}>
              <th scope="row"><strong>{post.titulo}</strong><small>{post.sistema_nome} · {post.versao} · {postTypes.find(option => option.value === post.tipo)?.label}</small><span className={`manager-status manager-status-${post.status}`}>{statuses[post.status] ?? post.status}</span><PostDate post={post}/>{post.status === 'publicado' && !post.disponivel && <small>Indisponível para leitura pública</small>}</th>
              <td data-label="Visualizações"><span className="manager-number">{counts.format(post.visualizacoes)}</span></td>
              <td data-label="Gostei"><span className="manager-number">{counts.format(post.likes)}</span></td>
              <td data-label="Não gostei"><span className={`manager-number${post.dislikes ? ' manager-negative' : ''}`}>{counts.format(post.dislikes)}</span></td>
              <td data-label="Compartilhamentos"><span className="manager-number">{counts.format(post.compartilhamentos)}</span></td>
              <td data-label="Aprovação"><Approval value={post.aprovacao} votes={post.likes + post.dislikes}/></td>
              <td className="manager-row-actions"><button className="manager-reasons-button" type="button" disabled={post.dislikes === 0} onClick={() => setSelected(post)} aria-label={`Ver motivos de Não gostei: ${post.titulo}`}><Icon name="message"/>Ver motivos</button><button className="manager-edit-button" type="button" onClick={() => onEdit(post.id)} aria-label={`Revisar publicação: ${post.titulo}`}><Icon name="edit"/>Revisar</button></td>
            </tr>)}</tbody>
          </table></div>
          <Pagination meta={result.meta} onPage={changePage}/>
        </>)}
        </ContentTransition>
        </>}
        </>}
        </div>
      </section>
      <details className="manager-method"><summary>Como interpretar os indicadores</summary><div><p><strong>Visualizações:</strong> cada navegador/dispositivo conta uma vez por publicação. O total soma essas leituras; o mesmo navegador pode aparecer em mais de uma publicação. O número de navegadores/dispositivos no conjunto é deduplicado entre elas, não identifica pessoas.</p><p><strong>Aprovação:</strong> Gostei ÷ (Gostei + Não gostei). Sem reações, mostramos “Sem avaliações”, não 0%. Considere a quantidade de avaliações antes de tirar conclusões. Cada navegador mantém uma reação por publicação.</p><p><strong>Compartilhamentos:</strong> ações concluídas de copiar o link ou usar o compartilhamento do dispositivo, não envios ou recebimentos confirmados em outros aplicativos.</p><p>Os números são acumulados, sem comparação temporal. Rascunhos, agendamentos futuros, arquivados e sistemas inativos não entram nos recortes “Sem visualizações” e “Lidas, sem avaliações”. Os motivos correspondem aos votos negativos atuais, sem controle de revisão concluída.</p></div></details>
    {selected && <DislikeReasons key={`${selected.id}-${revision}`} post={selected} onClose={() => setSelected(null)} onEdit={() => onEdit(selected.id)} />}
  </section>;
}

function Metric({ icon, title, value, children }: { icon: IconName; title: string; value: string; children: ReactNode }) {
  return <article className="manager-kpi"><div><span>{title}</span><Icon name={icon}/></div><strong>{value}</strong><div className="manager-kpi-detail">{children}</div></article>;
}
function PostDate({ post }: { post: PostMetrics }) {
  const scheduled = post.status === 'agendado' && Boolean(post.publicado_em);
  const published = post.status !== 'rascunho' && Boolean(post.publicado_em);
  const date = (published ? post.publicado_em : post.criado_em)!;
  const label = scheduled ? 'Agendada para' : published ? 'Publicada em' : 'Criada em';
  return <small>{label} <time dateTime={date}>{new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', ...(scheduled ? { timeStyle: 'short' as const } : {}) })}</time></small>;
}
function Approval({ value, votes, compact = false }: { value: number | null; votes: number; compact?: boolean }) {
  return <div className={`manager-approval${compact ? ' manager-approval-compact' : ''}`}>
    {!compact && <strong>{value === null ? 'Sem avaliações' : percent(value)}</strong>}
    {value !== null && <meter min={0} max={100} value={value} aria-label={`Aprovação: ${percent(value)}, ${counts.format(votes)} avaliações`}>{percent(value)}</meter>}
    <small>{votes === 0 ? 'Ainda sem avaliações' : `${counts.format(votes)} ${votes === 1 ? 'avaliação' : 'avaliações'}`}</small>
  </div>;
}
function Priority({ value, active, onSelect, total, icon, title, text }: { value: Focus; active: Focus; onSelect: (value: Focus) => void; total: number; icon: IconName; title: string; text: string }) {
  return <button className="manager-priority" type="button" aria-pressed={active === value} onClick={() => onSelect(active === value ? 'todos' : value)}><span className="manager-priority-icon"><Icon name={icon}/></span><span><strong>{title}</strong><small>{text}</small></span><b>{counts.format(total)}</b></button>;
}

function DislikeReasons({ post, onClose, onEdit }: { post: PostMetrics; onClose: () => void; onEdit: () => void }) {
  const [result, setResult] = useState<PageResult<DislikeReason> | null>(null);
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null), closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current, trigger = document.activeElement as HTMLElement | null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden'; node?.showModal(); closeButton.current?.focus();
    return () => { node?.close(); document.documentElement.style.overflow = overflow; if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setResult(null); setError('');
    adminApi.reasons(post.id, page).then(value => { if (!cancelled) setResult(value); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [post.id, page, revision]);
  return createPortal(<dialog ref={dialog} className="analytics-feedback-dialog" aria-labelledby="analytics-feedback-title" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
  }}><section className="dislike-reasons">
    <div className="manager-feedback-header"><span className="publication-kicker">Escuta do leitor</span><button ref={closeButton} className="secondary" type="button" onClick={onClose} aria-label="Fechar motivos"><Icon name="close"/></button></div>
    <h2 id="analytics-feedback-title">Motivos de “Não gostei”</h2><h3>{post.titulo}</h3><p className="manager-feedback-context">{post.sistema_nome} · {post.versao}</p>
    <div className="manager-feedback-tip"><Icon name="message"/><p>Procure dúvidas recorrentes e pontos que precisam de exemplos ou instruções mais claras antes de revisar a publicação.</p></div>
    <p className="manager-note">Feedbacks privados dos votos negativos atuais. Ao trocar ou remover a reação, o motivo deixa de aparecer.</p>
    {error && <><p className="error" role="alert">{error}</p><button type="button" className="secondary" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></>}
    {!result && !error && <p role="status">Carregando motivos…</p>}
    {result && <><p className="manager-feedback-total">{counts.format(result.meta.total)} {result.meta.total === 1 ? 'motivo recebido' : 'motivos recebidos'}</p>{result.data.length === 0 ? <p>Nenhum motivo disponível.</p> : <ul>{result.data.map((reason, index) => <li key={`${reason.atualizado_em}-${index}`}><time dateTime={reason.atualizado_em}>{new Date(reason.atualizado_em).toLocaleString('pt-BR')}</time><p>{reason.motivo}</p></li>)}</ul>}<Pagination meta={result.meta} onPage={setPage}/></>}
    <button className="primary manager-review" type="button" onClick={() => { onClose(); onEdit(); }}><Icon name="edit"/>Revisar publicação</button>
  </section></dialog>, document.body);
}

function Pagination({ meta, onPage }: { meta: PageResult<unknown>['meta']; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  if (pages <= 1) return null;
  return <nav className="analytics-pagination" aria-label="Paginação dos resultados"><button className="secondary" type="button" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Anterior</button><span>Página {meta.page} de {pages}</span><button className="secondary" type="button" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)}>Próxima</button></nav>;
}
