/*Author: Erik Marques*/
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

export const systemSchema = z.enum(['oriontn', 'orionpro', 'orionreg']);
export const typeSchema = z.enum(['novidade', 'melhoria', 'correcao', 'aviso']);
export const idSchema = z.coerce.number().int().positive().safe();
export const slugSchema = z.string().trim().max(220).transform(value => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
  .pipe(z.string().min(1, 'Informe uma palavra-chave com letras ou números.').max(220));
export const versionSchema = z.object({
  codigo: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Use letras, números, pontos, hífens ou sublinhados.'),
  sistema: systemSchema,
});
export const postSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe o título.').max(200),
  subtitulo: z.string().trim().max(400).default(''),
  slug: slugSchema,
  corpo: z.string().max(200_000, 'O conteúdo excede o limite de tamanho.'),
  capa_imagem_id: z.string().uuid('Selecione uma imagem de capa válida.').transform(value => value.toLowerCase()).nullable().optional(),
  versao_id: idSchema,
  sistema: systemSchema,
  tipo: typeSchema,
  status: z.enum(['rascunho', 'agendado', 'publicado']),
  publicado_em: z.string().datetime({ offset: true }).nullable().optional(),
});
export type PostInput = z.infer<typeof postSchema>;

export const imagePathPattern = /^\/api\/v1\/(?:admin\/)?imagens\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export function cleanContent(html: string) {
  const imageIds = new Set<string>();
  const clean = sanitizeHtml(html, {
    allowedTags: ['p','br','strong','b','em','i','s','u','h2','h3','ul','ol','li','blockquote','pre','code','hr','a','img'],
    allowedAttributes: { a: ['href','title','rel'], img: ['src','alt','title'] },
    allowedSchemes: ['http','https','mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }),
      img: (tagName, attribs): sanitizeHtml.Tag => {
        const match = imagePathPattern.exec(attribs.src ?? '');
        if (!match) return { tagName: 'span', attribs: {} };
        imageIds.add(match[1].toLowerCase());
        return { tagName, attribs: { src: '/api/v1/imagens/' + match[1].toLowerCase(), alt: (attribs.alt ?? '').slice(0,300) } };
      },
    },
  });
  const text = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ').trim();
  return { html: clean, imageIds: [...imageIds], hasContent: text.length > 0 || imageIds.size > 0 };
}

// O mesmo predicado rege feed, detalhe, contador, leitura e imagens.
// Agendados ficam públicos no instante programado, inclusive após reinícios.
export const visiblePost = "a.status IN ('publicado', 'agendado') AND a.publicado_em IS NOT NULL AND a.publicado_em <= NOW()";
