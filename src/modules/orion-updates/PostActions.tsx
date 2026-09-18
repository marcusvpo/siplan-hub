//Author: Erik Marques
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { publicApi, type Publication, type Reaction } from './api';
import { appPath } from './paths';

export function postPath(post: Pick<Publication, 'id' | 'slug'>) {
  return appPath(`/posts/${post.id}/${encodeURIComponent(post.slug)}`);
}

function ActionIcon({ name }: { name: 'like' | 'dislike' | 'share' }) {
  const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  if (name === 'share') return <svg {...props}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>;
  return <svg {...props}><g transform={name === 'dislike' ? 'rotate(180 12 12)' : undefined}><path d="M7 10v11H3V10h4Zm0 0 5-8c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7"/></g></svg>;
}

export function PostActions({ post }: { post: Publication }) {
  const [reaction, setReaction] = useState<Reaction>({ tipo: null, motivo: null });
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showReason, setShowReason] = useState(false);
  const [manualLink, setManualLink] = useState(false);
  const [pendingShare, setPendingShare] = useState<{ id: string; canal: 'copiar' | 'nativo' } | null>(null);
  const locked = useRef(false);
  const link = new URL(postPath(post), window.location.origin).href;

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    // Preserva as visualizações da Gestão sem expor status de leitura ao leitor.
    void publicApi.read(post.id).catch(() => undefined);
    publicApi.reaction(post.id).then(value => {
      if (!cancelled) { setReaction(value); setLoading(false); }
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [post.id, reload]);

  async function vote(tipo: Reaction['tipo'], motivo?: string) {
    if (locked.current || loading) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await publicApi.react(post.id, tipo === 'dislike' ? { tipo, motivo } : { tipo });
      setReaction(result); setShowReason(false);
      setMessage(tipo ? 'Obrigado pelo seu feedback!' : 'Reação removida.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar sua reação.'); }
    finally { locked.current = false; setBusy(false); }
  }

  async function recordShare(event: { id: string; canal: 'copiar' | 'nativo' }) {
    try { await publicApi.share(post.id, event.id, event.canal); setPendingShare(null); }
    catch { setPendingShare(event); setError('O link está disponível, mas não foi possível registrar o compartilhamento.'); }
  }

  async function share() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: post.titulo, url: link });
          setMessage('Compartilhamento concluído.');
          await recordShare({ id: crypto.randomUUID(), canal: 'nativo' });
          return;
        } catch (e) { if (e instanceof Error && e.name === 'AbortError') return; }
      }
      if (!navigator.clipboard?.writeText) { setManualLink(true); return; }
      try { await navigator.clipboard.writeText(link); }
      catch { setManualLink(true); return; }
      setMessage('Link copiado! Envie para outros leitores.');
      await recordShare({ id: crypto.randomUUID(), canal: 'copiar' });
    } finally { locked.current = false; setBusy(false); }
  }

  return <footer className="post-feedback">
    <p>Este conteúdo foi útil para você?</p>
    <div className="feedback-actions" role="group" aria-label="Reações e compartilhamento">
      <button type="button" className="secondary" aria-label="Gostei" aria-pressed={reaction.tipo === 'like'} disabled={loading || busy} onClick={() => void vote(reaction.tipo === 'like' ? null : 'like')}><ActionIcon name="like"/>Gostei</button>
      <button type="button" className="secondary" aria-label="Não Gostei" aria-pressed={reaction.tipo === 'dislike'} disabled={loading || busy} onClick={() => { setError(''); setMessage(''); setShowReason(true); }}><ActionIcon name="dislike"/>Não Gostei</button>
      <button type="button" className="secondary" aria-label="Compartilhar publicação" title="Compartilhar publicação" disabled={busy || Boolean(pendingShare)} onClick={() => void share()}><ActionIcon name="share"/><span>Compartilhar</span></button>
    </div>
    {message && <p className="field-help" role="status">{message}</p>}
    {error && !showReason && <p className="error" role="alert">{error}</p>}
    {loading && error && <button className="secondary" type="button" onClick={() => setReload(value => value + 1)}>Tentar carregar reação novamente</button>}
    {pendingShare && <button className="secondary" type="button" disabled={busy} onClick={async () => { if (locked.current) return; locked.current = true; setBusy(true); setError(''); try { await recordShare(pendingShare); } finally { locked.current = false; setBusy(false); } }}>Tentar registrar compartilhamento</button>}
    {manualLink && <label className="share-link">Copie o link da publicação (Ctrl+C ou menu Copiar)
      <input readOnly value={link} onFocus={event => event.target.select()} onCopy={event => {
        if (locked.current || pendingShare || event.currentTarget.selectionStart !== 0 || event.currentTarget.selectionEnd !== link.length) return;
        locked.current = true; setBusy(true); setMessage('Link copiado!');
        void recordShare({ id: crypto.randomUUID(), canal: 'copiar' }).finally(() => { locked.current = false; setBusy(false); });
      }}/>
    </label>}
    <div className="publication-support">
      <p><strong>Surgiram dúvidas?</strong></p>
      <a href="https://sac.siplancontrolm.com.br/" target="_blank" rel="noopener noreferrer" title="Abre em uma nova guia">Clique aqui para registrar um chamado e nossa equipe de suporte entrará em contato.</a>
    </div>
    {showReason && <DislikeDialog initial={reaction.motivo ?? ''} canRemove={reaction.tipo === 'dislike'} busy={busy} error={error} onClose={() => setShowReason(false)} onSave={motivo => vote('dislike', motivo)} onRemove={() => vote(null)} />}
  </footer>;
}

function DislikeDialog({ initial, canRemove, busy, error, onClose, onSave, onRemove }: {
  initial: string; canRemove: boolean; busy: boolean; error: string; onClose: () => void;
  onSave: (reason: string) => Promise<void>; onRemove: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null), input = useRef<HTMLTextAreaElement>(null);
  const title = useId();
  const [reason, setReason] = useState(initial);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal(); input.current?.focus();
    return () => node?.close();
  }, []);
  function submit(event: FormEvent) { event.preventDefault(); if (reason.trim() && !busy) void onSave(reason.trim()); }
  return <dialog className="feedback-dialog" ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={submit}>
      <h2 id={title}>O que podemos melhorar?</h2>
      <p>Conte por que esta publicação não foi útil. O motivo será visível apenas para a equipe de gestão. Não inclua dados pessoais ou sigilosos.</p>
      <label>Motivo do dislike<textarea ref={input} required maxLength={1000} rows={5} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      <small>{reason.length}/1000 caracteres</small>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="feedback-dialog-actions">
        <button className="secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        {canRemove && <button className="danger" type="button" disabled={busy} onClick={() => void onRemove()}>Remover dislike</button>}
        <button className="primary" type="submit" disabled={busy || !reason.trim()}>{busy ? 'Salvando…' : 'Enviar feedback'}</button>
      </div>
    </form>
  </dialog>;
}
