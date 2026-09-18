// O prefixo é público e definido no build; nunca coloque segredos em VITE_*.
export const blogBasePath = import.meta.env.BASE_URL;
const prefix = blogBasePath.replace(/\/$/, '');

/** Recebe um caminho interno, sem o prefixo de implantação. */
export function appPath(path: string) {
  return prefix + '/' + path.replace(/^\/+/, '');
}

/** null significa que a URL pertence ao sistema hospedeiro, não ao blog. */
export function routePath(pathname: string): string | null {
  if (pathname === prefix) return '/';
  return pathname.startsWith(blogBasePath) ? '/' + pathname.slice(blogBasePath.length) : null;
}

export const apiBase = appPath('/api/v1');
