/*Author: Erik Marques*/
import { z } from 'zod';

export const publicationSearchSchema = z.string().trim().max(200)
  .regex(/^[^\u0000-\u001f\u007f]*$/, 'Informe um texto de busca válido.')
  .transform(value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' '))
  .default('');

// Só expressões fixas entram no SQL. O termo do leitor é sempre um parâmetro.
// Busca texto visível, não tags, atributos ou endereços de imagens do HTML.
const bodyText = `CASE WHEN a.corpo_formato='html' THEN
  regexp_replace(regexp_replace(a.corpo, '</?(p|h[1-6]|li|ul|ol|blockquote|pre|br|hr)([[:space:]][^>]*)?/?>', ' ', 'gi'), '<[^>]*>', '', 'g')
  ELSE a.corpo END`;
const decodedBody = [
  ['&nbsp;', ' '], ['&quot;', '"'], ['&#39;', "'"], ['&#x27;', "'"], ['&lt;', '<'], ['&gt;', '>'], ['&amp;', '&'],
].reduce((sql, [entity, replacement]) => `replace(${sql}, '${entity}', '${replacement.replaceAll("'", "''")}')`, bodyText);
export const publicationSearchText = `translate(lower(regexp_replace(
  concat_ws(' ',a.titulo,a.resumo,${decodedBody}), '[[:space:]]+', ' ', 'g')),
  'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;
