import type { AnchorHTMLAttributes } from 'react';
import { routePath } from './paths';

// Navegação interna sem recarregar o documento; mantém voltar/avançar do navegador.
export function navigate(path: string) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin || routePath(url.pathname) === null) return;
  if (url.href === window.location.href) return;
  window.history.pushState({}, '', url.pathname + url.search + url.hash);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

export function AppLink({ onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} onClick={event => {
    onClick?.(event);
    // Preserva nova guia, downloads e links externos.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        props.download != null || (props.target && props.target !== '_self') || !props.href) return;
    const url = new URL(props.href, window.location.origin);
    if (url.origin !== window.location.origin || routePath(url.pathname) === null) return;
    event.preventDefault();
    navigate(props.href);
  }} />;
}
