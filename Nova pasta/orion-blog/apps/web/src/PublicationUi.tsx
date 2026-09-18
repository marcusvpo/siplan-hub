//Author: Erik Marques
import type { Publication, Version } from './api';
import { postTypes } from './content';
import { VersionIcon } from './VersionIcon';
import { AppLink } from './navigation';

export function PublicationIcon({ name }: { name: 'back' | 'arrow' | 'calendar' | 'document' | 'check' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'back' && <path d="m10 6-6 6 6 6M4 12h16" />}
    {name === 'arrow' && <path d="m14 6 6 6-6 6M4 12h16" />}
    {name === 'calendar' && <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4M16 3v4M4 11h16M8 15h2M14 15h2" /></>}
    {name === 'document' && <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6ZM14 3v6h6M8 13h8M8 17h5" /></>}
    {name === 'check' && <path d="m5 12 4 4L19 6" />}
  </svg>;
}

type BackProps = { href: string; onClick?: never } | { onClick: () => void; href?: never };

export function BackToVersions(props: BackProps) {
  const content = <><span className="back-versions-icon"><PublicationIcon name="back" /></span><span>Todas as versões</span></>;
  return props.href !== undefined
    ? <AppLink className="back-versions" href={props.href}>{content}</AppLink>
    : <button className="back-versions" type="button" onClick={props.onClick}>{content}</button>;
}

export function VersionOverview({ version, total, type }: { version: Version; total: number; type: string }) {
  const category = postTypes.find(option => option.value === type)?.label;
  return <header className="version-heading publication-overview">
    <div className="publication-overview-identity">
      <VersionIcon system={version.sistema} />
      <div><span className="publication-kicker">Publicações da versão</span><h2>{version.sistema_nome} · {version.codigo}</h2><p>Confira as atualizações para a rotina do seu cartório.</p></div>
    </div>
    <span className="publication-count"><PublicationIcon name="document" /><span><strong>{total} {total === 1 ? 'publicação' : 'publicações'}</strong><small>{category ?? 'Todos os tipos'}</small></span></span>
  </header>;
}

export function PublicationMeta({ item }: { item: Publication }) {
  return <div className="publication-meta">
    <span className="publication-category">{postTypes.find(option => option.value === item.tipo)?.label ?? 'Publicação'}</span>
    {item.publicado_em && <time dateTime={item.publicado_em}><PublicationIcon name="calendar" />{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(item.publicado_em))}</time>}
  </div>;
}
