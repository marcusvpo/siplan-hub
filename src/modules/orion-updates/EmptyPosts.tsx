//Author: Erik Marques
import './empty-posts.css';
import { NotaryIllustration } from './NotaryIllustration';

export function EmptyPosts() {
  return <section className="empty-posts" role="status" aria-live="polite" aria-atomic="true">
    <NotaryIllustration className="empty-posts-illustration" />
    <h2 className="empty-posts-title"><span>Ops,</span> ainda não temos uma publicação para essa página!</h2>
    <p className="empty-posts-description">As atualizações dos sistemas que fazem parte da rotina do seu cartório terão seu espaço por aqui.</p>
    <p className="empty-posts-return">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      <span>Volte em breve ;)</span>
    </p>
  </section>;
}
