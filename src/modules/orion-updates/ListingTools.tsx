import { useEffect, useId, useState } from 'react';
import './listing-tools.css';

export const versionOrders = [
  { value: 'criacao_desc', label: 'Criação: mais recentes' },
  { value: 'criacao_asc', label: 'Criação: mais antigas' },
  { value: 'versao_desc', label: 'Versão: maior para menor' },
  { value: 'versao_asc', label: 'Versão: menor para maior' },
] as const;
export const publicationOrders = [
  { value: 'recentes', label: 'Mais recentes primeiro' },
  { value: 'antigas', label: 'Mais antigas primeiro' },
] as const;
export type VersionOrder = typeof versionOrders[number]['value'];
export type PublicationOrder = typeof publicationOrders[number]['value'];

function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
}

export function ListingTools<T extends string>({ versions = false, order, options, search, busy, onOrder, onSearch }: {
  versions?: boolean; order: T; options: readonly { value: T; label: string }[];
  search: string; busy: boolean; onOrder: (value: T) => void; onSearch: (value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  const subject = versions ? 'versões' : 'publicações';
  return <form className="listing-tools" role="search" aria-label={`Ordenação e busca de ${subject}`} onSubmit={event => {
    event.preventDefault();
    onSearch(draft.trim());
  }}>
    <label className="listing-order">
      <span className="listing-sr-only">{versions ? 'Ordenar por' : 'Ordenar por data de publicação'}</span>
      <svg className="listing-order-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 19V5m-4 4 4-4 4 4M16 5v14m-4-4 4 4 4-4" /></svg>
      <select aria-label={`Ordenar ${subject}`} value={order} onChange={event => onOrder(event.target.value as T)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <div className="listing-search">
      <label className="listing-sr-only" htmlFor={id}>{versions ? 'Buscar versão' : 'Buscar publicação'}</label>
      <div className="listing-search-field">
        <input id={id} type="search" inputMode={versions ? 'decimal' : 'search'}
          pattern={versions ? '[0-9.]*' : undefined} maxLength={versions ? 30 : 200}
          placeholder={versions ? 'Buscar versão: 06.03.03' : 'Buscar publicação…'}
          title={versions ? 'Buscar versão: somente números e pontos.' : 'Buscar por título, subtítulo ou trecho do conteúdo.'}
          aria-describedby={`${id}-help`} enterKeyHint="search" autoComplete="off" value={draft}
          onChange={event => setDraft(versions ? event.target.value.replace(/[^0-9.]/g, '') : event.target.value)} />
        {(draft || search) && <button type="button" className="listing-clear" aria-label="Limpar busca" title="Limpar busca" onClick={() => { setDraft(''); onSearch(''); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>}
        <button type="submit" disabled={busy} aria-label={`Buscar ${subject}`} title={`Buscar ${subject}`}><SearchIcon /></button>
      </div>
    </div>
    <span className="listing-sr-only" id={`${id}-help`}>{versions ? 'Use somente números e pontos.' : 'Busque por título, subtítulo ou trecho do conteúdo da publicação.'} Pressione Enter ou use a lupa para buscar.</span>
  </form>;
}

export function SearchEmpty({ versions = false, onClear }: { versions?: boolean; onClear: () => void }) {
  return <section className="listing-empty" role="status">
    <span className="listing-empty-icon"><SearchIcon /></span>
    <h2>{versions ? 'Nenhuma versão encontrada nesta busca.' : 'Nenhuma publicação encontrada nesta busca.'}</h2>
    <p>Tente outro termo ou limpe a busca para consultar os resultados dos filtros selecionados.</p>
    <button className="back-versions" type="button" onClick={onClear}>Limpar busca</button>
  </section>;
}

export function ListingPagination({ page, total, limit, busy, onPage }: { page: number; total: number; limit: number; busy: boolean; onPage: (page: number) => void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return <nav className="listing-pagination" aria-label="Páginas de publicações">
    <button type="button" className="back-versions" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
    <span role="status">Página {page} de {pages}</span>
    <button type="button" className="back-versions" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Próxima</button>
  </nav>;
}
