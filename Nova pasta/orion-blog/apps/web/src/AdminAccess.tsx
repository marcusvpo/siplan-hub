import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { adminApi, type BlogAccess } from './api';
import { ManagementIcon } from './ManagementIcon';
import { navigate } from './navigation';
import { appPath, blogBasePath, routePath } from './paths';
import './admin-access.css';

type AccessState = { status: 'loading' | 'ready' | 'error'; access: BlogAccess | null };
const AccessContext = createContext<(AccessState & { refresh: () => Promise<BlogAccess | null> }) | null>(null);

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>({ status: 'loading', access: null });
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try {
      const access = await adminApi.access();
      if (current === revision.current) { adminApi.useAccess(access); setState({ status: 'ready', access }); }
      return current === revision.current ? access : null;
    } catch {
      if (current === revision.current) { adminApi.useAccess(null); setState({ status: 'error', access: null }); }
      return null;
    }
  }, []);
  useEffect(() => {
    void refresh();
    const recheck = () => { void refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') recheck(); };
    const invalidate = () => { adminApi.useAccess(null); setState({ status: 'loading', access: null }); recheck(); };
    window.addEventListener('focus', recheck);
    window.addEventListener('popstate', recheck);
    window.addEventListener('orion:access-changed', recheck);
    window.addEventListener('orion:access-invalidated', invalidate);
    document.addEventListener('visibilitychange', visible);
    return () => {
      revision.current++;
      window.removeEventListener('focus', recheck);
      window.removeEventListener('popstate', recheck);
      window.removeEventListener('orion:access-changed', recheck);
      window.removeEventListener('orion:access-invalidated', invalidate);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  return <AccessContext.Provider value={{ ...state, refresh }}>{children}</AccessContext.Provider>;
}

export function useAdminAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error('AdminAccessProvider ausente.');
  return value;
}

const RETURN_KEY = `orion-reader-return:${blogBasePath}`;
function readerPath() {
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    if (saved) {
      const url = new URL(saved, window.location.origin);
      if (url.origin === window.location.origin && /^\/(inicio|oriontn|orionpro|orionreg|novidades|melhorias|correcoes|avisos|posts)(\/|$)/.test(routePath(url.pathname) ?? '')) return url.pathname + url.search + url.hash;
    }
  } catch { /* Retorno à home caso o armazenamento esteja indisponível. */ }
  return appPath('/inicio');
}

export function ViewModeSwitch({ management = false, disabled = false }: { management?: boolean; disabled?: boolean }) {
  const { access } = useAdminAccess();
  if (!access?.canManage || !access.admin) return null;
  return <button type="button" className="view-mode-switch" disabled={disabled} onClick={() => {
    if (!management) {
      try { sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search + window.location.hash); } catch { /* Opcional. Nunca armazena autorização. */ }
    }
    navigate(management ? readerPath() : appPath('/gestao'));
  }}><ManagementIcon name={management ? 'publicacoes' : 'acompanhamento'} /><span>{management ? 'Visualização do leitor' : 'Acessar Gestão'}</span></button>;
}

export function ReaderManagementAccess() {
  const { access } = useAdminAccess();
  if (!access?.canManage || !access.admin) return null;
  return <div className="container reader-management-access"><ViewModeSwitch /></div>;
}
