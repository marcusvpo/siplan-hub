//Author: Erik Marques
import { useState } from 'react';
import { useImageViewer } from './ImageViewer';
import { getOrionUpdateMediaUrl } from '@/hooks/useOrionUpdatesData';

export function PostCover({ imageId }: { imageId?: string | null; preview?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const { openImage, viewer } = useImageViewer();
  const validId = imageId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId);
  const source = validId ? getOrionUpdateMediaUrl(imageId) : null;

  return <><div className="post-cover">
    {source && source !== failedSource ?
      <button className="post-cover-open" type="button" aria-label="Ampliar capa da publicação" aria-haspopup="dialog" title="Clique para ampliar a capa" onClick={event => {
        const image = event.currentTarget.querySelector('img');
        if (image) openImage(image, event.currentTarget);
      }}><img key={source} src={source} alt="Capa da publicação" width={320} height={200} loading="lazy" decoding="async" onError={() => setFailedSource(source)} /></button> :
      <svg className="post-cover-placeholder" viewBox="0 0 160 100" role="img" aria-label="Capa padrão da publicação" fill="none">
        <rect x="48" y="18" width="64" height="66" rx="7" fill="currentColor" opacity=".08" />
        <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M90 17H57a7 7 0 0 0-7 7v52a7 7 0 0 0 7 7h46a7 7 0 0 0 7-7V37L90 17Z" />
          <path d="M90 17v20h20M63 50h34M63 61h34M63 72h20" />
        </g>
      </svg>}
  </div>{viewer}</>;
}
