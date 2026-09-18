// O módulo compartilha a origem, o roteador e a autenticação do Siplan Hub.
export const blogBasePath = '/atualizacoes/';
const prefix = blogBasePath.replace(/\/$/, '');

/** Recebe um caminho interno, sem o prefixo de implantação. */
export function appPath(path: string) {
  if (path.startsWith('/assets/')) return path;
  return prefix + '/' + path.replace(/^\/+/, '');
}

/** null significa que a URL pertence ao sistema hospedeiro, não ao blog. */
export function routePath(pathname: string): string | null {
  if (pathname === prefix) return '/';
  return pathname.startsWith(blogBasePath) ? '/' + pathname.slice(blogBasePath.length) : null;
}
