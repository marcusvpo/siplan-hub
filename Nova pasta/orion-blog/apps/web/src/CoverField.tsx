import { useRef, useState } from 'react';
import { adminApi } from './api';
import { PostCover } from './PostCover';

export function CoverField({ imageId, disabled, onChange, onBusy }: {
  imageId: string | null; disabled: boolean; onChange: (id: string | null) => void; onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload(file?: File) {
    if (!file || disabled || pending.current) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Use uma imagem PNG, JPEG ou WebP de até 5 MB.');
      return;
    }
    pending.current = true; setUploading(true); onBusy(true);
    try {
      const image = await adminApi.uploadImage(file);
      onChange(image.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar a capa.');
    } finally {
      pending.current = false; setUploading(false); onBusy(false);
    }
  }

  return <div className="wide cover-field" role="group" aria-labelledby="cover-label">
    <span className="filter-label" id="cover-label">Capa da publicação (opcional)</span>
    <div className="cover-field-row">
      <PostCover imageId={imageId} preview />
      <div className="cover-field-controls">
        <p className="field-help" id="cover-size-help"><strong>Tamanho recomendado: 1600 × 1000 px (proporção 8:5, horizontal).</strong> Essa proporção é utilizada tanto em desktops quanto em celulares. Imagens em outras proporções serão recortadas automaticamente a partir do centro para preencher a capa. Mantenha textos e logotipos afastados das bordas e confira a prévia antes de salvar.</p>
        <p className="field-help" id="cover-help">PNG, JPEG ou WebP estático, até 5 MB e 20 megapixels. Sem imagem, será usado o ícone padrão de publicações.</p>
        <div className="cover-actions">
          <button className="secondary" type="button" aria-describedby="cover-size-help cover-help" disabled={disabled || uploading} onClick={() => input.current?.click()}>{imageId ? 'Alterar capa' : 'Importar capa'}</button>
          {imageId && <button className="danger" type="button" disabled={disabled || uploading} onClick={() => { setError(''); onChange(null); }}>Remover capa</button>}
        </div>
        <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label="Selecionar imagem de capa" aria-describedby="cover-size-help cover-help" disabled={disabled || uploading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
        {uploading && <p className="field-help" role="status">Enviando capa…</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </div>
  </div>;
}
