import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './image-viewer.css';

type SelectedImage = { src: string; alt: string; trigger: HTMLElement };
const MIN_ZOOM = 50, MAX_ZOOM = 400, ZOOM_STEP = 25;

export function useImageViewer() {
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const openImage = useCallback((image: HTMLImageElement, trigger: HTMLElement = image) => {
    if (!image.complete || !image.naturalWidth) return;
    trigger.focus({ preventScroll: true });
    setSelected({ src: image.currentSrc || image.src, alt: image.alt || 'Imagem da publicação', trigger });
  }, []);
  return { openImage, viewer: selected && <ImageViewer image={selected} onClose={close} /> };
}

function ZoomIcon({ plus = false }: { plus?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="10" cy="10" r="6.5" /><path d="m15 15 5 5M7 10h6" />{plus && <path d="M10 7v6" />}
  </svg>;
}

function ImageViewer({ image, onClose }: { image: SelectedImage; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const titleId = useId(), helpId = useId();
  const [zoom, setZoom] = useState(100);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = dialog.current!;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    node.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      node.close();
      document.documentElement.style.overflow = overflow;
      if (image.trigger.isConnected) image.trigger.focus({ preventScroll: true });
    };
  }, [image]);

  useEffect(() => {
    const node = viewport.current!;
    const measure = () => setAvailable({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, []);

  const fit = natural.width && available.width
    ? Math.min(1, available.width / natural.width, available.height / natural.height) : 0;
  const width = natural.width * fit * zoom / 100;
  const height = natural.height * fit * zoom / 100;
  const ready = Boolean(fit) && !failed;

  // Dimensões reais, em vez de transform: todas as bordas continuam acessíveis por rolagem.
  useLayoutEffect(() => {
    const node = viewport.current;
    if (node) {
      node.scrollLeft = (node.scrollWidth - node.clientWidth) / 2;
      node.scrollTop = (node.scrollHeight - node.clientHeight) / 2;
    }
  }, [width, height, available]);

  return createPortal(<dialog className="image-viewer" ref={dialog} aria-labelledby={titleId} aria-describedby={helpId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <header className="image-viewer-header">
      <h2 id={titleId}>Imagem da publicação</h2>
      <button ref={closeButton} className="image-viewer-close" type="button" onClick={onClose} aria-label="Fechar imagem" title="Fechar imagem">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </header>
    <div className="image-viewer-controls" role="group" aria-label="Controles de zoom">
      <button type="button" disabled={!ready || zoom <= MIN_ZOOM} onClick={() => setZoom(value => Math.max(MIN_ZOOM, value - ZOOM_STEP))}><ZoomIcon />Diminuir</button>
      <output aria-live="polite" aria-label="Nível de zoom">{zoom}%</output>
      <button type="button" disabled={!ready || zoom >= MAX_ZOOM} onClick={() => setZoom(value => Math.min(MAX_ZOOM, value + ZOOM_STEP))}><ZoomIcon plus />Aumentar</button>
    </div>
    <div className={`image-viewer-viewport${zoom > 100 ? ' is-zoomed' : ''}`} ref={viewport} tabIndex={0} role="region" aria-label="Imagem ampliada"
      onPointerDown={event => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || !ready) return;
        const node = event.currentTarget;
        if (node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight) return;
        event.preventDefault();
        node.focus({ preventScroll: true });
        drag.current = { x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
        node.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!drag.current) return;
        event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX;
        event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY;
      }}
      onPointerUp={event => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <div className="image-viewer-canvas" style={{ width: Math.max(available.width, width), height: Math.max(available.height, height) }}>
        {failed ? <p className="image-viewer-message" role="alert">Não foi possível carregar a imagem. Feche e tente novamente.</p> : <>
          {!ready && <p className="image-viewer-message" role="status">Carregando imagem…</p>}
          <img src={image.src} alt={image.alt} draggable={false} style={{ width, height, visibility: ready ? 'visible' : 'hidden' }}
            onLoad={event => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            onError={() => setFailed(true)} />
        </>}
      </div>
    </div>
    <p className="image-viewer-help" id={helpId}>Use Aumentar e Diminuir para ver os detalhes. Arraste ou role a imagem ampliada para explorar.</p>
  </dialog>, document.body);
}
