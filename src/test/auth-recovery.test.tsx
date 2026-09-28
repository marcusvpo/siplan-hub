import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RequirePermission } from "@/components/auth/RequirePermission";
import AdminLayout from "@/layouts/AdminLayout";
import Login from "@/pages/Login";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  onAuthStateChange: vi.fn(),
  profile: vi.fn(),
  globalPermissions: vi.fn(),
  csCxPermissions: vi.fn(),
  unsubscribe: vi.fn(),
  logActivity: vi.fn(),
  mountContent: vi.fn(),
  unmountContent: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      signInWithPassword: mocks.signInWithPassword,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: (table: string) => {
      let filterValue: string;
      const query = {
        select: () => query,
        eq: (_key: string, value: string) => { filterValue = value; return query; },
        abortSignal: () => query,
        single: () => table === "profiles"
          ? mocks.profile(filterValue)
          : mocks.globalPermissions(filterValue),
      };
      return query;
    },
    rpc: () => ({ abortSignal: () => mocks.csCxPermissions() }),
  },
}));

vi.mock("@/hooks/use-theme", () => ({ useTheme: () => ({ theme: "light" }) }));
vi.mock("@/services/activityLogger", () => ({ activityLogger: { log: mocks.logActivity } }));

function sessionFor(id: string): Session {
  return {
    access_token: `token-${id}`,
    refresh_token: `refresh-${id}`,
    token_type: "bearer",
    expires_in: 3600,
    user: {
      id,
      email: `${id}@example.com`,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-09-28T12:00:00Z",
    },
  };
}

const initialSession = sessionFor("user-1");
const profileResult = (role = "user") => ({
  data: { role, team: "Implantação", full_name: "Usuário de teste" }, error: null,
});
const globalResult = (allowProjects = true) => ({
  data: {
    name: "user",
    app_role_permissions: allowProjects
      ? [{ app_permissions: { resource: "projects", action: "view" } }]
      : [],
  },
  error: null,
});
const failure = { data: null, error: { message: "Serviço temporariamente indisponível", status: 503 } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => { resolve = fulfill; });
  return { promise, resolve };
}

let latestAuth: ReturnType<typeof useAuth>;

function AuthStateProbe() {
  const auth = useAuth();
  latestAuth = auth;
  return (
    <>
      <output data-testid="auth-state">{JSON.stringify({
        userId: auth.user?.id ?? null,
        sessionToken: auth.session?.access_token ?? null,
        role: auth.role,
        loading: auth.loading,
        permissionsLoaded: auth.permissionsLoaded,
        authError: auth.authError,
        permissions: auth.permissions,
        isAdmin: auth.isAdmin,
        allowed: auth.hasPermission("projects", "view"),
      })}</output>
      <button onClick={() => void auth.signOut()}>Sair do teste</button>
    </>
  );
}

function authState() {
  return JSON.parse(screen.getByTestId("auth-state").textContent ?? "{}");
}

function ProtectedContent() {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    mocks.mountContent();
    return () => { mocks.unmountContent(); };
  }, []);
  return (
    <>
      <div>Conteúdo protegido</div>
      <textarea aria-label="Rascunho" value={draft} onChange={(event) => setDraft(event.target.value)} />
    </>
  );
}

function renderApp(guard: "protected" | "permission" | "admin" = "protected") {
  return render(
    <AuthProvider>
      <AuthStateProbe />
      <MemoryRouter initialEntries={[guard === "admin" ? "/admin" : "/projects"]}>
        <Routes>
          <Route path="/login" element={<div>Login</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/projects" element={guard === "permission" ? (
            <RequirePermission resource="projects"><ProtectedContent /></RequirePermission>
          ) : (
            <ProtectedRoute>
              <RequirePermission resource="projects"><ProtectedContent /></RequirePermission>
            </ProtectedRoute>
          )} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>Conteúdo administrativo</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

let authListener: (event: AuthChangeEvent, session: Session | null) => void;

describe("recuperação segura do carregamento de autenticação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: initialSession }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.profile.mockReset().mockResolvedValue(profileResult());
    mocks.globalPermissions.mockReset().mockResolvedValue(globalResult());
    mocks.csCxPermissions.mockReset().mockResolvedValue({ data: [], error: null });
    mocks.onAuthStateChange.mockImplementation((listener: typeof authListener) => {
      authListener = listener;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each(["protected", "permission", "admin"] as const)(
    "encerra a falha de perfil e oferece nova tentativa na guarda %s",
    async (guard) => {
      mocks.profile.mockResolvedValueOnce(failure);
      if (guard === "admin") mocks.profile.mockResolvedValue(profileResult("admin"));
      renderApp(guard);

      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar seu perfil");
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
      expect(screen.queryByText(/Conteúdo (protegido|administrativo)/)).not.toBeInTheDocument();
      expect(authState()).toMatchObject({
        loading: false, permissionsLoaded: true, role: null, isAdmin: false, allowed: false, permissions: [],
      });
      expect(mocks.logActivity).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
      expect(await screen.findByText(guard === "admin" ? "Conteúdo administrativo" : "Conteúdo protegido"))
        .toBeInTheDocument();
      expect(authState().authError).toBeNull();
    },
  );

  it.each(["globalPermissions", "csCxPermissions"] as const)(
    "bloqueia permissões parciais quando %s falha e recupera ao tentar novamente",
    async (source) => {
      mocks[source].mockResolvedValueOnce(failure);
      mocks.csCxPermissions.mockResolvedValue({ data: [{ resource: "users", action: "edit" }], error: null });
      renderApp();

      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar suas permissões");
      expect(authState()).toMatchObject({ role: null, permissions: [], allowed: false, permissionsLoaded: true });
      fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
      expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
      expect(authState().permissions).toEqual([
        { resource: "projects", action: "view" }, { resource: "users", action: "edit" },
      ]);
    },
  );

  it("trata perfil ausente como erro recuperável", async () => {
    mocks.profile.mockResolvedValueOnce({ data: null, error: null });
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar seu perfil");
    expect(authState().allowed).toBe(false);
  });

  it.each(["profile", "globalPermissions", "csCxPermissions"] as const)(
    "finaliza o timeout de %s e permite recuperação sem aceitar a resposta atrasada",
    async (source) => {
      vi.useFakeTimers();
      const pending = deferred<ReturnType<typeof profileResult> | ReturnType<typeof globalResult> | { data: []; error: null }>();
      mocks[source].mockReturnValueOnce(pending.promise);
      renderApp();
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Carregando...")).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(15000));
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(authState()).toMatchObject({ loading: false, permissionsLoaded: true, allowed: false });

      fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
      await act(async () => { pending.resolve(profileResult("admin")); });
      expect(authState()).toMatchObject({ role: "user", isAdmin: false, allowed: true });
    },
  );

  it("finaliza o timeout de sessão sem apagar credenciais válidas", async () => {
    vi.useFakeTimers();
    const pending = deferred<{ data: { session: Session | null }; error: null }>();
    mocks.getSession.mockReturnValueOnce(pending.promise);
    localStorage.setItem("sb-auth-recovery-test", "credencial-preservada");
    renderApp();
    await act(() => vi.advanceTimersByTimeAsync(8000));

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível verificar sua sessão");
    expect(authState()).toMatchObject({ loading: false, permissionsLoaded: true, allowed: false });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem("sb-auth-recovery-test")).toBe("credencial-preservada");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    localStorage.removeItem("sb-auth-recovery-test");
  });

  it("recupera depois de erro ao consultar a sessão", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: failure.error });
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível verificar sua sessão");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it.each(["SIGNED_IN", "TOKEN_REFRESHED"] as const)(
    "mantém conteúdo e draft montados na revalidação bem-sucedida de %s do mesmo usuário",
    async (event) => {
      renderApp();
      expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
      const draft = screen.getByRole("textbox", { name: "Rascunho" });
      fireEvent.change(draft, { target: { value: "Alteração ainda não salva" } });
      const previousPermission = latestAuth.hasPermission;
      const pendingProfile = deferred<ReturnType<typeof profileResult>>();
      const pendingPermissions = deferred<ReturnType<typeof globalResult>>();
      mocks.profile.mockReturnValueOnce(pendingProfile.promise);
      mocks.globalPermissions.mockReturnValueOnce(pendingPermissions.promise);
      const refreshedSession = { ...initialSession, access_token: `token-renovado-${event}` };

      act(() => authListener(event, refreshedSession));
      expect(authState()).toMatchObject({ permissionsLoaded: true, allowed: true, sessionToken: refreshedSession.access_token });
      expect(previousPermission("projects", "view")).toBe(true);
      expect(screen.getByRole("textbox", { name: "Rascunho" })).toBe(draft);
      expect(draft).toHaveValue("Alteração ainda não salva");
      expect(mocks.profile).toHaveBeenCalledTimes(2);
      await act(async () => { pendingProfile.resolve(profileResult()); });
      expect(mocks.globalPermissions).toHaveBeenCalledTimes(2);
      expect(draft).toHaveValue("Alteração ainda não salva");
      await act(async () => { pendingPermissions.resolve(globalResult()); });

      expect(authState()).toMatchObject({ role: "user", permissionsLoaded: true, allowed: true, authError: null });
      expect(screen.getByRole("textbox", { name: "Rascunho" })).toBe(draft);
      expect(draft).toHaveValue("Alteração ainda não salva");
      expect(mocks.mountContent).toHaveBeenCalledTimes(1);
      expect(mocks.unmountContent).not.toHaveBeenCalled();
    },
  );

  it.each(["profile", "globalPermissions", "csCxPermissions"] as const)(
    "revoga o acesso publicado se %s falhar durante a revalidação do mesmo usuário",
    async (source) => {
      mocks.profile.mockResolvedValue(profileResult("admin"));
      renderApp();
      expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
      const previousPermission = latestAuth.hasPermission;
      const pending = deferred<typeof failure>();
      mocks[source].mockReturnValueOnce(pending.promise);
      act(() => authListener("TOKEN_REFRESHED", { ...initialSession, access_token: "token-renovado" }));
      expect(authState()).toMatchObject({ isAdmin: true, allowed: true, permissionsLoaded: true });
      expect(screen.getByRole("textbox", { name: "Rascunho" })).toBeInTheDocument();
      await waitFor(() => expect(mocks[source]).toHaveBeenCalledTimes(2));
      await act(async () => { pending.resolve(failure); });

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(authState()).toMatchObject({ isAdmin: false, allowed: false, role: null, permissions: [] });
      expect(previousPermission("projects", "view")).toBe(false);
      expect(screen.queryByRole("textbox", { name: "Rascunho" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
      expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
      expect(authState()).toMatchObject({ isAdmin: true, allowed: true, authError: null });
    },
  );

  it("revoga acesso ao trocar usuário durante revalidação e ignora o perfil anterior atrasado", async () => {
    mocks.profile.mockResolvedValueOnce(profileResult("admin"));
    renderApp();
    expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
    const previousPermission = latestAuth.hasPermission;
    const pending = deferred<ReturnType<typeof profileResult>>();
    mocks.profile.mockReturnValueOnce(pending.promise);
    act(() => authListener("TOKEN_REFRESHED", initialSession));
    expect(authState().isAdmin).toBe(true);

    mocks.globalPermissions.mockResolvedValue(globalResult(false));
    act(() => authListener("SIGNED_IN", sessionFor("user-2")));
    expect(previousPermission("projects", "view")).toBe(false);
    expect(authState()).toMatchObject({ userId: "user-2", role: null, permissions: [], allowed: false });
    expect(await screen.findByText("Acesso negado")).toBeInTheDocument();
    await act(async () => { pending.resolve(profileResult("admin")); });
    expect(authState()).toMatchObject({ userId: "user-2", role: "user", isAdmin: false, allowed: false });
  });

  it("revoga imediatamente o acesso admin durante a troca para outro usuário", async () => {
    mocks.profile.mockResolvedValueOnce(profileResult("admin"));
    const pending = deferred<ReturnType<typeof profileResult>>();
    mocks.profile.mockReturnValueOnce(pending.promise);
    mocks.globalPermissions.mockResolvedValue(globalResult(false));
    renderApp();
    expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
    expect(authState().isAdmin).toBe(true);

    act(() => authListener("SIGNED_IN", sessionFor("user-2")));
    expect(authState()).toMatchObject({ userId: "user-2", role: null, permissions: [], allowed: false, isAdmin: false });
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    await act(async () => { pending.resolve(profileResult()); });
    expect(await screen.findByText("Acesso negado")).toBeInTheDocument();
  });

  it.each(["profile", "globalPermissions"] as const)(
    "ignora a resposta de %s do usuário anterior após troca de sessão",
    async (source) => {
      const pending = deferred<ReturnType<typeof profileResult> | ReturnType<typeof globalResult>>();
      mocks[source].mockReturnValueOnce(pending.promise);
      mocks.globalPermissions.mockResolvedValue(globalResult(false));
      renderApp();
      await waitFor(() => expect(mocks[source]).toHaveBeenCalledTimes(1));
      act(() => authListener("SIGNED_IN", sessionFor("user-2")));
      expect(await screen.findByText("Acesso negado")).toBeInTheDocument();
      await act(async () => { pending.resolve(source === "profile" ? profileResult("admin") : globalResult(true)); });
      expect(authState()).toMatchObject({ userId: "user-2", role: "user", allowed: false, isAdmin: false, permissions: [] });
      expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    },
  );

  it("dá precedência ao evento de Auth sobre uma leitura inicial de sessão atrasada", async () => {
    const pending = deferred<{ data: { session: Session | null }; error: null }>();
    mocks.getSession.mockReturnValueOnce(pending.promise);
    renderApp();
    act(() => authListener("SIGNED_IN", sessionFor("user-2")));
    expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
    await act(async () => { pending.resolve({ data: { session: initialSession }, error: null }); });
    expect(authState().userId).toBe("user-2");
    expect(mocks.profile).toHaveBeenCalledTimes(1);
  });

  it("não restaura acesso ao concluir consulta pendente depois do logout", async () => {
    const pending = deferred<ReturnType<typeof profileResult>>();
    mocks.profile.mockReturnValueOnce(pending.promise);
    renderApp();
    await waitFor(() => expect(mocks.profile).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Sair do teste" }));
    expect(await screen.findByText("Login")).toBeInTheDocument();
    await act(async () => { pending.resolve(profileResult("admin")); });
    expect(authState()).toMatchObject({ userId: null, role: null, allowed: false, isAdmin: false, permissions: [] });
  });

  it("mantém acesso revogado e a rota pendente até o logout real terminar", async () => {
    vi.useFakeTimers();
    const pending = deferred<{ error: null }>();
    mocks.signOut.mockReturnValueOnce(pending.promise);
    localStorage.setItem("sb-auth-recovery-test", "credencial-antiga");
    renderApp();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    const previousPermission = latestAuth.hasPermission;
    fireEvent.click(screen.getByRole("button", { name: "Sair do teste" }));
    expect(authState()).toMatchObject({ loading: true, userId: null, role: null, allowed: false, permissions: [] });
    expect(previousPermission("projects", "view")).toBe(false);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
    act(() => authListener("SIGNED_OUT", null));
    act(() => authListener("SIGNED_IN", sessionFor("user-2")));
    await act(() => vi.advanceTimersByTimeAsync(9000));
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(authState()).toMatchObject({ loading: true, userId: null, allowed: false });
    expect(screen.queryByText("Login")).not.toBeInTheDocument();

    await act(async () => { pending.resolve({ error: null }); });
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(authState()).toMatchObject({ loading: false, userId: null, permissionsLoaded: true, allowed: false });
    expect(localStorage.getItem("sb-auth-recovery-test")).toBeNull();
  });

  it("bloqueia botão e handler de login durante logout lento, inclusive em URL pública", async () => {
    const pending = deferred<{ error: null }>();
    mocks.signOut.mockReturnValueOnce(pending.promise);
    render(
      <AuthProvider>
        <AuthStateProbe />
        <MemoryRouter><Login /></MemoryRouter>
      </AuthProvider>,
    );
    await waitFor(() => expect(authState().allowed).toBe(true));
    const submit = screen.getByRole("button", { name: "Entrar" });
    const form = submit.closest("form")!;
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user-2@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-de-teste" } });
    fireEvent.click(screen.getByRole("button", { name: "Sair do teste" }));
    expect(screen.getByRole("button", { name: "Aguarde..." })).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    fireEvent.submit(form);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();

    await act(async () => { pending.resolve({ error: null }); });
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("conclui o estado local e remove credenciais antigas mesmo se logout retorna erro", async () => {
    localStorage.setItem("sb-auth-recovery-test", "credencial-antiga");
    mocks.signOut.mockResolvedValueOnce({ error: failure.error });
    renderApp();
    expect(await screen.findByText("Conteúdo protegido")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sair do teste" }));
    expect(await screen.findByText("Login")).toBeInTheDocument();
    expect(authState()).toMatchObject({ loading: false, userId: null, allowed: false });
    expect(localStorage.getItem("sb-auth-recovery-test")).toBeNull();
  });

  it("mantém o acesso equivalente de admin e deduplica permissões após carregar", async () => {
    mocks.profile.mockResolvedValue(profileResult("admin"));
    mocks.globalPermissions.mockResolvedValue(globalResult(false));
    mocks.csCxPermissions.mockResolvedValue({ data: [
      { resource: "users", action: "edit" }, { resource: "users", action: "edit" },
    ], error: null });
    renderApp("admin");
    expect(await screen.findByText("Conteúdo administrativo")).toBeInTheDocument();
    expect(authState()).toMatchObject({ role: "admin", isAdmin: true, allowed: true });
    expect(authState().permissions).toEqual([{ resource: "users", action: "edit" }]);
  });
});
