import { useEffect, useMemo, useRef } from 'react';
import { safePostHtml } from './content';
import { useImageViewer } from './ImageViewer';

export function PublicationContent({ html, preview = false }: { html: string; preview?: boolean }) {
  const content = useRef<HTMLDivElement>(null);
  const safeHtml = useMemo(() => safePostHtml(html, preview), [html, preview]);
  const { openImage, viewer } = useImageViewer();

  useEffect(() => {
    // Somente imagens já sanitizadas; o editor continua com seu comportamento normal.
    content.current?.querySelectorAll('img').forEach(image => {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-haspopup', 'dialog');
      image.setAttribute('aria-label', `Ampliar imagem: ${image.alt || 'Imagem da publicação'}`);
      image.title = 'Clique para ampliar a imagem';
    });
  }, [safeHtml]);

  return <>
    <div className="rich-content publication-content" ref={content} dangerouslySetInnerHTML={{ __html: safeHtml }}
      onClick={event => {
        if (!(event.target instanceof HTMLImageElement)) return;
        event.preventDefault();
        event.stopPropagation();
        openImage(event.target);
      }}
      onKeyDown={event => {
        if (!(event.target instanceof HTMLImageElement) || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        openImage(event.target);
      }} />
    {viewer}
  </>;
}
