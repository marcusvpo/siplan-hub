import { readFile, writeFile } from 'node:fs/promises';
const base = process.env.VITE_BLOG_BASE_PATH ?? '/blog/';
// Também impede inserir diretivas no template através de argumentos do build.
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error('BLOG_BASE_PATH precisa começar e terminar com / e conter somente segmentos alfanuméricos, _ ou -.');
const template = await readFile(new URL('./nginx.conf.template', import.meta.url), 'utf8');
await writeFile(new URL('./nginx.generated.conf', import.meta.url), template
  .replaceAll('__BLOG_BASE_PATH__', base)
  .replace('__MOUNT_REDIRECT__', base === '/' ? '' : `location = ${base.slice(0, -1)} { return 308 ${base}$is_args$args; }`));
