import { useLayoutEffect, useRef, type ReactNode } from 'react';
import './content-transition.css';

/** Mantém o último resultado apenas enquanto a consulta seguinte está em andamento.
 * Não é um cache: erros substituem o resultado e desmontar a tela descarta tudo.
 */
export function ContentTransition({ pending = false, contentKey, children, label = 'Atualizando resultados…', retain = true }: {
  pending?: boolean; contentKey: string; children: ReactNode; label?: string; retain?: boolean;
}) {
  const previous = useRef<ReactNode>(null);
  const region = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const height = useRef(0);
  const lastKey = useRef<string | null>(null);
  const wasPending = useRef(false);

  useLayoutEffect(() => {
    if (pending) {
      // O foco não pode permanecer em um botão de resultados antigos.
      if (content.current?.contains(document.activeElement)) region.current?.focus({ preventScroll: true });
    } else {
      previous.current = children;
      height.current = content.current?.getBoundingClientRect().height ?? 0;
    }
  });

  useLayoutEffect(() => {
    if (pending) { wasPending.current = true; return; }
    const changed = lastKey.current !== contentKey || wasPending.current;
    lastKey.current = contentKey;
    wasPending.current = false;
    if (!changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = content.current?.animate(
      [{ opacity: .84, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 180, easing: 'ease-out' },
    );
    return () => animation?.cancel();
  }, [pending, contentKey]);

  return <div ref={region} className="content-transition" tabIndex={-1} aria-busy={pending}
    data-pending={pending} style={pending && height.current ? { minHeight: height.current } : undefined}>
    <div ref={content} className="content-transition-body" inert={pending} aria-hidden={pending || undefined}>
      {pending ? (retain && previous.current) || <LoadingPlaceholder /> : children}
    </div>
    {pending && <span className="content-transition-status" role="status"><span aria-hidden="true" />{label}</span>}
  </div>;
}

function LoadingPlaceholder() {
  return <div className="content-placeholder" aria-hidden="true"><div className="content-placeholder-heading" />{[0, 1, 2].map(index =>
    <div className="content-placeholder-card" key={index}><span /><div><i /><i /></div></div>,
  )}</div>;
}
