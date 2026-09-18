//Author: Erik Marques
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

// Mantém o gesto nativo sobre os filtros e oferece uma barra realmente tocável.
export function FilterTabs({ className, label, scrollLabel, children }: {
  className: string;
  label: string;
  scrollLabel: string;
  children: ReactNode;
}) {
  const row = useRef<HTMLDivElement>(null);
  const id = useId();
  const [scroll, setScroll] = useState({ max: 0, position: 0, thumb: 44 });

  useLayoutEffect(() => {
    const element = row.current;
    if (!element) return;
    const sync = () => {
      const max = Math.max(0, element.scrollWidth - element.clientWidth);
      const position = Math.round(Math.max(0, Math.min(max, element.scrollLeft)));
      const thumb = Math.max(44, Math.round(element.clientWidth ** 2 / Math.max(1, element.scrollWidth)));
      setScroll(current => current.max === max && current.position === position && current.thumb === thumb
        ? current : { max, position, thumb });
    };
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    // A largura dos botões também pode mudar após carregar fontes ou rótulos.
    for (const button of element.children) observer.observe(button);
    element.addEventListener('scroll', sync, { passive: true });
    sync();
    return () => { observer.disconnect(); element.removeEventListener('scroll', sync); };
  }, [children]);

  const overflow = scroll.max > 1;
  return <div className="filter-scroll" data-overflow={overflow}>
    <div ref={row} id={id} className={`${className} filter-scroll-content`} role="group" aria-label={label}>{children}</div>
    {overflow && <input
      className="filter-scroll-control"
      type="range"
      min={0}
      max={scroll.max}
      step={1}
      value={scroll.position}
      style={{ '--filter-thumb-width': `${scroll.thumb}px` } as CSSProperties}
      aria-label={scrollLabel}
      aria-controls={id}
      aria-valuetext={`${Math.round(scroll.position / scroll.max * 100)}% da barra de filtros`}
      title="Arraste para ver mais filtros"
      onChange={event => {
        const position = Number(event.currentTarget.value);
        if (row.current) row.current.scrollLeft = position;
        setScroll(current => ({ ...current, position }));
      }}
    />}
  </div>;
}
