import React, { useCallback, useEffect, useRef, useState } from "react";
import { Session, User, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, UserRole, Permission } from "./AuthContextValue";

const authDb = supabase as unknown as SupabaseClient;
const SESSION_TIMEOUT_MS = 8000;
const ACCESS_TIMEOUT_MS = 15000;

interface AuthState {
  session: Session | null;
  user: User | null;
  fullName: string | null;
  role: UserRole;
  team: string | null;
  permissions: Permission[];
  loading: boolean;
  permissionsLoaded: boolean;
  authError: string | null;
  accessRevision: number;
}

function emptyAuthState(session: Session | null, accessRevision: number): AuthState {
  return {
    session,
    user: session?.user ?? null,
    fullName: null,
    role: null,
    team: null,
    permissions: [],
    loading: false,
    permissionsLoaded: !session?.user,
    authError: null,
    accessRevision,
  };
}

async function withTimeout<T>(request: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Auth request timeout")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => ({
    ...emptyAuthState(null, 0),
    loading: true,
    permissionsLoaded: false,
  }));
  const mounted = useRef(false);
  const requestId = useRef(0);
  const accessRevision = useRef(0);
  const authState = useRef(auth);
  const currentSession = useRef<Session | null>(null);
  const accessController = useRef<AbortController | null>(null);
  const signingOut = useRef(false);

  const publishAuth = useCallback((nextState: AuthState) => {
    authState.current = nextState;
    setAuth(nextState);
  }, []);

  const advanceAccessRevision = useCallback(() => ++accessRevision.current, []);

  const startRequest = useCallback(() => {
    accessController.current?.abort();
    return ++requestId.current;
  }, []);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const previous = authState.current;
    const preserveAccess = Boolean(nextSession?.user &&
      previous.user?.id === nextSession.user.id && !previous.loading &&
      previous.permissionsLoaded && !previous.authError &&
      previous.accessRevision === accessRevision.current && !signingOut.current);
    const activeRequest = startRequest();
    currentSession.current = nextSession;
    if (preserveAccess) {
      // Renovar a mesma sessão mantém formulários e drafts montados durante a revalidação.
      publishAuth({ ...previous, session: nextSession, user: nextSession?.user ?? null });
    } else {
      publishAuth(emptyAuthState(nextSession, advanceAccessRevision()));
    }
    if (!nextSession?.user) return;

    const controller = new AbortController();
    accessController.current = controller;
    const isCurrentRequest = () => mounted.current && requestId.current === activeRequest;
    let errorMessage = "Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.";

    try {
      const profileResult = await withTimeout(
        supabase
          .from("profiles")
          .select("role, team, full_name")
          .eq("id", nextSession.user.id)
          .abortSignal(controller.signal)
          .single(),
        ACCESS_TIMEOUT_MS,
      );
      if (!isCurrentRequest()) return;
      if (profileResult.error) throw profileResult.error;
      if (!profileResult.data?.role) throw new Error("Perfil sem função de acesso");

      const profile = profileResult.data;
      errorMessage = "Não foi possível carregar suas permissões. Verifique sua conexão e tente novamente.";
      const [globalResult, csCxResult] = await withTimeout(
        Promise.all([
          supabase
            .from("app_roles")
            .select("name, app_role_permissions (app_permissions (resource, action))")
            .eq("name", profile.role)
            .abortSignal(controller.signal)
            .single(),
          authDb.rpc("cs_cx_get_my_permissions").abortSignal(controller.signal),
        ]),
        ACCESS_TIMEOUT_MS,
      );
      if (!isCurrentRequest()) return;
      if (globalResult.error) throw globalResult.error;
      if (csCxResult.error) throw csCxResult.error;
      if (!globalResult.data) throw new Error("Perfil de permissões não encontrado");

      const globalPermissions = (globalResult.data.app_role_permissions ?? [])
        .map((entry: { app_permissions: unknown }) => entry.app_permissions as Permission | null)
        .filter((permission): permission is Permission => Boolean(permission));
      const csCxPermissions = (csCxResult.data ?? []) as Permission[];
      const uniquePermissions = new Map<string, Permission>();
      for (const permission of [...globalPermissions, ...csCxPermissions]) {
        uniquePermissions.set(`${permission.resource}:${permission.action}`, permission);
      }

      // Publica perfil e permissões juntos, somente para a sessão ainda vigente.
      publishAuth({
        ...emptyAuthState(nextSession, advanceAccessRevision()),
        role: profile.role,
        team: profile.team || null,
        fullName: profile.full_name || null,
        permissions: [...uniquePermissions.values()],
        permissionsLoaded: true,
      });
    } catch (error) {
      controller.abort();
      if (!isCurrentRequest()) return;
      console.error("Erro ao carregar o acesso do usuário:", error);
      publishAuth({
        ...emptyAuthState(nextSession, advanceAccessRevision()),
        permissionsLoaded: true,
        authError: errorMessage,
      });
    } finally {
      if (accessController.current === controller) accessController.current = null;
    }
  }, [advanceAccessRevision, publishAuth, startRequest]);

  const retryAuth = useCallback(async () => {
    if (signingOut.current) return;
    const activeRequest = startRequest();
    const nextState = emptyAuthState(currentSession.current, advanceAccessRevision());
    publishAuth({ ...nextState, loading: true, permissionsLoaded: false });

    try {
      const { data, error } = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS);
      // Eventos de autenticação têm precedência sobre uma leitura de sessão atrasada.
      if (!mounted.current || requestId.current !== activeRequest) return;
      if (error) throw error;
      await applySession(data.session);
    } catch (error) {
      if (!mounted.current || requestId.current !== activeRequest) return;
      console.error("Erro ao carregar a sessão:", error);
      publishAuth({
        ...nextState,
        permissionsLoaded: true,
        authError: "Não foi possível verificar sua sessão. Verifique sua conexão e tente novamente.",
      });
    }
  }, [advanceAccessRevision, applySession, publishAuth, startRequest]);

  useEffect(() => {
    mounted.current = true;
    void retryAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted.current || signingOut.current) return;
      // Não aguarde consultas dentro do callback: o Supabase ainda detém o lock de Auth.
      void applySession(nextSession);
    });

    return () => {
      mounted.current = false;
      startRequest();
      advanceAccessRevision();
      subscription.unsubscribe();
    };
  }, [advanceAccessRevision, applySession, retryAuth, startRequest]);

  const signOut = async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    const activeRequest = startRequest();
    const logoutState = emptyAuthState(null, advanceAccessRevision());
    currentSession.current = null;
    // Revoga o acesso local imediatamente, inclusive para respostas ainda em trânsito.
    publishAuth({ ...logoutState, loading: true, permissionsLoaded: false });
    const storedCredentials = new Map<string, string | null>();
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) storedCredentials.set(key, localStorage.getItem(key));
      });
    } catch (error) {
      console.error("Erro ao consultar credenciais locais:", error);
    }
    try {
      // Aguarda o SDK concluir: liberar antes deixaria o logout apagar um login posterior.
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Erro ao sair:", error);
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      try {
        storedCredentials.forEach((credential, key) => {
          if (localStorage.getItem(key) === credential) localStorage.removeItem(key);
        });
      } catch (error) {
        console.error("Erro ao remover credenciais locais:", error);
      }
      signingOut.current = false;
      if (mounted.current && requestId.current === activeRequest) publishAuth(logoutState);
    }
  };

  const accessReady = !auth.loading && auth.permissionsLoaded && !auth.authError &&
    Boolean(auth.user) && auth.accessRevision === accessRevision.current;
  const hasPermission = (resource: string, action: string) => {
    if (!accessReady || auth.accessRevision !== accessRevision.current) return false;
    if (auth.role === "admin") return true;
    return auth.permissions.some((permission) => permission.resource === resource && permission.action === action);
  };

  const { accessRevision: _, ...state } = auth;
  const value = {
    ...state,
    retryAuth,
    signOut,
    isAdmin: accessReady && auth.role === "admin",
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
