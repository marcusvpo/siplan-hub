//Author: Erik Marques
// Ilustração vetorial compartilhada pela recepção e pelo estado vazio do blog.
export function NotaryIllustration({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 360 210" width="360" height="210" fill="none" aria-hidden="true" focusable="false">
      <circle cx="180" cy="106" r="87" fill="var(--empty-soft, var(--publication-tint))" />
      <ellipse cx="181" cy="189" rx="133" ry="7" fill="var(--empty-ground, var(--publication-soft))" />
      <g stroke="var(--empty-line, var(--publication-line))" strokeWidth="2" strokeLinecap="round">
        <path d="M58 74h12m-6-6v12M285 53h10m-5-5v10M313 118h8" />
        <path d="M88 46h23M95 38h9M263 86h19" />
      </g>
      <circle cx="76" cy="129" r="3" fill="var(--empty-accent, var(--publication-accent))" opacity=".45" />
      <circle cx="265" cy="32" r="3" fill="var(--empty-accent, var(--publication-accent))" opacity=".45" />

      {/* Livro de registros. */}
      <g transform="rotate(-9 81 148)">
        <rect x="56" y="108" width="49" height="74" rx="5" fill="var(--empty-surface, var(--publication-surface))" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="2" />
        <path d="M64 109v64m-7 3h46" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="2" />
        <rect x="72" y="119" width="24" height="19" rx="3" fill="var(--empty-soft, var(--publication-tint))" />
        <path d="M77 126h14m-14 5h9M73 148h21m-21 8h15" stroke="var(--empty-accent, var(--publication-accent))" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Fachada do cartório e entrada central. */}
      <path d="M117 84h127v95H117z" fill="var(--empty-surface, var(--publication-surface))" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="2" />
      <path d="m108 83 72-45 73 45H108Z" fill="var(--empty-soft, var(--publication-tint))" stroke="var(--empty-accent, var(--publication-accent))" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m129 76 51-31 51 31" stroke="var(--empty-accent, var(--publication-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".35" />
      <circle cx="180" cy="64" r="6" fill="var(--empty-surface, var(--publication-surface))" stroke="var(--empty-accent, var(--publication-accent))" strokeWidth="2" />
      <text x="180" y="102" textAnchor="middle" fill="var(--empty-ink, var(--publication-ink))" fontSize="11" fontWeight="700" letterSpacing="1.7">CARTÓRIO</text>
      <path d="M118 110h125" stroke="var(--empty-line, var(--publication-line))" strokeWidth="2" />
      <g fill="var(--empty-soft, var(--publication-tint))" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="1.5">
        <rect x="128" y="119" width="22" height="30" rx="2" />
        <rect x="211" y="119" width="22" height="30" rx="2" />
      </g>
      <path d="M139 120v28m-10-14h20m73-14v28m-10-14h20" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="1.5" />
      <path d="M166 177v-39a14 14 0 0 1 28 0v39" fill="var(--empty-soft, var(--publication-tint))" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="2" />
      <path d="M180 138v38" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="1.5" />
      <circle cx="174" cy="157" r="1.5" fill="var(--empty-accent, var(--publication-accent))" />
      <circle cx="186" cy="157" r="1.5" fill="var(--empty-accent, var(--publication-accent))" />
      <rect x="109" y="178" width="144" height="7" rx="2" fill="var(--empty-surface, var(--publication-surface))" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="2" />

      {/* Documento com selo, remetendo aos atos e registros cartorários. */}
      <g transform="rotate(9 277 148)">
        <path d="M253 109h33l16 16v51a4 4 0 0 1-4 4h-45a4 4 0 0 1-4-4v-63a4 4 0 0 1 4-4Z" fill="var(--empty-surface, var(--publication-surface))" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="2" />
        <path d="M286 110v15h15" fill="var(--empty-soft, var(--publication-tint))" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="2" strokeLinejoin="round" />
        <path d="M260 132h28m-28 8h20m-20 8h12" stroke="var(--empty-art-line, var(--publication-muted))" strokeWidth="2" strokeLinecap="round" />
        <path d="m279 170-3 15 7-3 6 5 1-15" fill="var(--empty-soft, var(--publication-tint))" stroke="var(--empty-accent, var(--publication-accent))" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="285" cy="163" r="12" fill="var(--empty-surface, var(--publication-surface))" stroke="var(--empty-accent, var(--publication-accent))" strokeWidth="2" />
        <circle cx="285" cy="163" r="8" fill="var(--empty-soft, var(--publication-tint))" />
        <path d="m281 163 3 3 5-6" stroke="var(--empty-accent, var(--publication-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
