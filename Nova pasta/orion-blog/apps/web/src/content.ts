import DOMPurify from 'dompurify';
import type { Publication } from './api';
import { appPath, routePath } from './paths';

export const systems = [{slug:'oriontn',nome:'OrionTN'},{slug:'orionpro',nome:'OrionPRO'},{slug:'orionreg',nome:'OrionREG'}] as const;
export const postTypes = [{value:'novidade',label:'Novidades'},{value:'melhoria',label:'Melhorias'},{value:'correcao',label:'Correções'},{value:'aviso',label:'Avisos'}] as const;
export const normalizeSlug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const escapeText = (value: string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export function safePostHtml(html: string, preview = false, forStorage = false) {
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','strong','b','em','i','s','u','h2','h3','ul','ol','li','blockquote','pre','code','hr','a','img'],
    ALLOWED_ATTR: ['href','title','rel','src','alt'],
    RETURN_DOM_FRAGMENT: true,
  });
  fragment.querySelectorAll('img').forEach(img => {
    const source = img.getAttribute('src') ?? '';
    const canonical = source.startsWith('/api/v1/') ? source : routePath(source) ?? '';
    const match = /^\/api\/v1\/(?:admin\/)?imagens\/([a-f0-9-]{36})$/i.exec(canonical);
    if (!match) img.remove();
    else {
      const path = '/api/v1/' + (preview && !forStorage ? 'admin/' : '') + 'imagens/' + match[1];
      img.setAttribute('src', forStorage ? path : appPath(path));
    }
  });
  fragment.querySelectorAll('a').forEach(link => link.setAttribute('rel','noopener noreferrer'));
  const wrapper = document.createElement('div');
  wrapper.append(fragment);
  return wrapper.innerHTML;
}

// O banco guarda URLs canônicas: mover o blog não exige reescrever publicações.
export const postHtmlForStorage = (html: string) => safePostHtml(html, false, true);

export function initialContent(post?: Publication) {
  if (!post?.corpo) return '<p></p>';
  return post.corpo_formato === 'html' ? safePostHtml(post.corpo,true) : '<p>' + escapeText(post.corpo).replace(/\n/g,'<br>') + '</p>';
}

export function localDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
