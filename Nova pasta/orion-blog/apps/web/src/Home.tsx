//Author: Erik Marques
import { useEffect, useState } from 'react';
import { publicApi, type Publication } from './api';
import { PublicationIcon } from './PublicationUi';
import { systemIcons } from './VersionIcon';
import { SuggestionBox } from './SuggestionBox';
import { AppLink } from './navigation';
import { ContentTransition } from './ContentTransition';
import './home.css';

export function HomeLatest({ postHref }: {
  postHref: (post: Publication) => string;
}) {
  const [news, setNews] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    publicApi.list(new URLSearchParams({ tipo: 'novidade', limit: '3', ordem: 'recentes' }))
      .then(result => {
        if (cancelled) return;
        setNews(result.data.slice(0, 3));
      })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar as novidades agora. Que tal tentar novamente?'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  return <section className="home-latest" aria-labelledby="home-latest-title" aria-busy={loading}>
    <header className="home-latest-heading">
      <div><span className="publication-kicker">Explore as atualizações</span><h2 id="home-latest-title">Últimas novidades</h2><p>Descubra o que mudou e o que pode facilitar a rotina do seu cartório.</p></div>
    </header>
    <div className="home-latest-content">
      <div className="home-news-results">
    <ContentTransition pending={loading} contentKey={String(attempt)} label="Preparando as últimas novidades para você…">
    {error ? <div className="home-news-status"><p role="alert">{error}</p><button className="publication-read-button" type="button" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>
        : news.length === 0 ? <div className="home-news-status" role="status"><PublicationIcon name="document" /><h3>As próximas novidades têm lugar aqui.</h3><p>Assim que uma novidade for publicada, você poderá encontrá-la neste espaço. Volte em breve ;)</p></div>
          : <div className="home-news-grid">{news.map((post, index) => <AppLink className={`home-news-card${index === 0 ? ' home-news-card--latest' : ''}`} key={post.id} href={postHref(post)} aria-label={`Ler novidade: ${post.titulo} — ${post.sistema_nome}`}>
            <div className="home-news-meta"><span className="home-news-badge"><PublicationIcon name="document" />{index === 0 ? 'Mais recente' : 'Novidade'}</span>{post.publicado_em && <time dateTime={post.publicado_em}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(post.publicado_em))}</time>}</div>
            <span className="home-news-system"><img src={systemIcons[post.sistema]} alt="" width="24" height="24" />{post.sistema_nome}</span>
            <h3>{post.titulo}</h3>
            {(post.subtitulo || post.resumo) && <p>{post.subtitulo || post.resumo}</p>}
            <span className="home-news-read">Ler novidade <PublicationIcon name="arrow" /></span>
          </AppLink>)}</div>}
    </ContentTransition>
      </div>
      <footer className="home-suggestions-footer"><SuggestionBox /></footer>
    </div>
  </section>;
}
