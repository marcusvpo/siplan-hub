import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { publicApi, type SuggestionInput } from './api';
import './suggestion-box.css';

function GiftIcon() {
  return <svg className="suggestion-gift" viewBox="0 0 160 128" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="suggestion-gift-body" d="M43 66h74v43a5 5 0 0 1-5 5H48a5 5 0 0 1-5-5Z" />
    <path className="suggestion-gift-ribbon" d="M73 67h14v47H73z" />
    <g className="suggestion-gift-lid">
      <path className="suggestion-gift-body" d="M39 52h82a3 3 0 0 1 3 3v12H36V55a3 3 0 0 1 3-3Z" />
      <path className="suggestion-gift-ribbon" d="M72 52h16v15H72z" />
      <path className="suggestion-gift-body" d="M80 52C63 53 51 43 57 36c8-10 21 5 23 16Zm0 0c17 1 29-9 23-16-8-10-21 5-23 16Z" />
    </g>
  </svg>;
}

export function SuggestionBox() {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const title = useId(), invitation = useId(), dialogId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  // O foco devolvido pelo dialog não deve reabrir a tampa ou o convite.
  const suppressPreview = useRef(false);
  const close = useCallback(() => {
    suppressPreview.current = true;
    setExpanded(false);
    setOpen(false);
  }, []);
  function revealPreview() {
    if (!open && !suppressPreview.current) setExpanded(true);
  }
  function openDialog() {
    suppressPreview.current = true;
    setExpanded(false);
    setOpen(true);
  }
  return <aside className="suggestion-box" aria-labelledby={title} data-expanded={expanded}>
    <h3 id={title}>Caixa de sugestões</h3>
    <div className="suggestion-box-interaction" onMouseEnter={revealPreview}
      onMouseMove={event => {
        // Só uma nova interação do leitor libera a prévia após fechar o pop-up.
        if (!open && (event.movementX !== 0 || event.movementY !== 0)) {
          suppressPreview.current = false;
          setExpanded(true);
        }
      }}
      onMouseLeave={event => {
        if (open) return;
        suppressPreview.current = false;
        if (!event.currentTarget.contains(document.activeElement)) setExpanded(false);
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget) && !open) {
          suppressPreview.current = false;
          setExpanded(false);
        }
      }}>
      <button className="suggestion-gift-button" type="button" ref={trigger} aria-label="Abrir caixa de sugestões" aria-haspopup="dialog" aria-expanded={open} aria-controls={dialogId}
        onFocus={revealPreview} onClick={openDialog}>
        <GiftIcon />
      </button>
      <button id={invitation} className="suggestion-invitation" type="button" aria-haspopup="dialog" aria-controls={dialogId} disabled={!expanded} onClick={openDialog}>
        Deixe aqui sua sugestão <span aria-hidden="true">↗</span>
      </button>
    </div>
    {open && <SuggestionDialog id={dialogId} onClose={close} returnFocus={trigger} />}
  </aside>;
}

function SuggestionDialog({ id, onClose, returnFocus }: { id: string; onClose: () => void; returnFocus: { current: HTMLButtonElement | null } }) {
  const dialog = useRef<HTMLDialogElement>(null), name = useRef<HTMLInputElement>(null), confirmation = useRef<HTMLDivElement>(null);
  const locked = useRef(false), active = useRef(true), pending = useRef<SuggestionInput | null>(null);
  const title = useId(), help = useId(), privacy = useId();
  const [fields, setFields] = useState({ nome: '', cartorio: '', sugestao: '' });
  const [busy, setBusy] = useState(false), [success, setSuccess] = useState(false), [error, setError] = useState('');

  useEffect(() => {
    active.current = true;
    const node = dialog.current, overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    node?.showModal();
    name.current?.focus();
    return () => {
      active.current = false;
      node?.close();
      document.documentElement.style.overflow = overflow;
      returnFocus.current?.focus({ preventScroll: true });
    };
  }, [returnFocus]);

  useEffect(() => {
    if (!success) return;
    confirmation.current?.focus();
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [success, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || success) return;
    const data = { nome: fields.nome.trim(), cartorio: fields.cartorio.trim(), sugestao: fields.sugestao.trim() };
    if (!data.nome || !data.cartorio || !data.sugestao) { setError('Preencha Nome, Cartório e Sugestão.'); return; }
    if (!pending.current || Object.entries(data).some(([key, value]) => pending.current?.[key as keyof typeof data] !== value)) {
      pending.current = { ...data, envio_id: crypto.randomUUID() };
    }
    locked.current = true;
    setBusy(true); setError('');
    try {
      await publicApi.suggest(pending.current);
      if (active.current) setSuccess(true);
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : 'Não foi possível enviar. Tente novamente.');
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }

  return createPortal(<dialog id={id} ref={dialog} className="suggestion-dialog" aria-labelledby={title} aria-describedby={success ? undefined : help}
    onCancel={event => { event.preventDefault(); if (!locked.current) onClose(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled),textarea:not(:disabled),button:not(:disabled)')];
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
    {success ? <div className="suggestion-success" ref={confirmation} tabIndex={-1} role="status">
      <span className="suggestion-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 12 4 4 8-8" /></svg></span>
      <h2 id={title}>Obrigado pela sugestão :)</h2>
      <p>Sua ideia foi recebida com carinho.</p>
      <small>Esta janela será fechada automaticamente.</small>
    </div> : <form onSubmit={event => void submit(event)} aria-busy={busy}>
      <span className="publication-kicker">Sua ideia tem espaço aqui</span>
      <h2 id={title}>Caixa de sugestões</h2>
      <p id={help}>Conte o que pode tornar a rotina do seu cartório ainda melhor. Todos os campos são obrigatórios.</p>
      <label>Nome<input ref={name} name="nome" required maxLength={100} autoComplete="name" value={fields.nome} disabled={busy} onChange={event => setFields({ ...fields, nome: event.target.value })} /></label>
      <label>Cartório<input name="cartorio" required maxLength={180} autoComplete="organization" value={fields.cartorio} disabled={busy} onChange={event => setFields({ ...fields, cartorio: event.target.value })} /></label>
      <label>Sugestão<textarea name="sugestao" required maxLength={4000} rows={4} aria-describedby={privacy} value={fields.sugestao} disabled={busy} onChange={event => setFields({ ...fields, sugestao: event.target.value })} /></label>
      <small id={privacy}>Não inclua dados de clientes, senhas ou informações sigilosas.</small>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="suggestion-dialog-actions">
        <button className="secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar'}</button>
      </div>
    </form>}
  </dialog>, document.body);
}
