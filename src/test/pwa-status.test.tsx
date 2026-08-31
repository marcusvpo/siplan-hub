import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PwaInstallButton,
  PwaInstallDialog,
} from "@/components/pwa/PwaInstallControls";
import { PwaProvider } from "@/components/pwa/PwaStatus";

const updateServiceWorker = vi.fn();

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

function mockMobileViewport(mobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(max-width: 767px)" ? mobile : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderInstallControls(autoOpen = false) {
  return render(
    <PwaProvider>
      <PwaInstallButton />
      <PwaInstallDialog autoOpen={autoOpen} />
    </PwaProvider>,
  );
}

describe("PWA do Siplan HUB", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    updateServiceWorker.mockReset();
    mockMobileViewport(true);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("instala pelo ícone quando o navegador disponibiliza o prompt", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt", {
      cancelable: true,
    });

    Object.assign(installEvent, {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    renderInstallControls();

    act(() => {
      window.dispatchEvent(installEvent);
    });

    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicativo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Instalar agora" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mantém o ícone ao escolher ver depois", () => {
    renderInstallControls();

    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicativo" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver depois" }));

    expect(sessionStorage.getItem("siplan-pwa-install-later")).toBe("true");
    expect(screen.getByRole("button", { name: "Instalar aplicativo" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("oferece automaticamente no mobile e respeita não mostrar novamente", () => {
    vi.useFakeTimers();
    renderInstallControls(true);

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Não mostrar novamente" }));

    expect(localStorage.getItem("siplan-pwa-install-never")).toBe("true");
    expect(screen.getByRole("button", { name: "Instalar aplicativo" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("avisa quando a conexão é perdida", () => {
    render(<PwaProvider><div /></PwaProvider>);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText("Você está sem conexão")).toBeInTheDocument();
    expect(screen.getByText(/dados e operações do sistema precisam de internet/i)).toBeInTheDocument();
  });

  it("não interfere nas experiências públicas enviadas a clientes", () => {
    window.history.replaceState({}, "", "/public/checklist/123");
    render(<PwaProvider><div /></PwaProvider>);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.queryByText("Você está sem conexão")).not.toBeInTheDocument();
  });
});
