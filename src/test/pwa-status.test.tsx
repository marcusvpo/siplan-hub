import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PwaStatus } from "@/components/pwa/PwaStatus";

const updateServiceWorker = vi.fn();

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

describe("PwaStatus", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    updateServiceWorker.mockReset();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("oferece a instalação quando o navegador disponibiliza o prompt", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt", {
      cancelable: true,
    });

    Object.assign(installEvent, {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    render(<PwaStatus />);

    act(() => {
      window.dispatchEvent(installEvent);
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Instalar aplicativo" }),
    );

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    expect(
      screen.queryByRole("dialog", { name: "Instalar Siplan HUB" }),
    ).not.toBeInTheDocument();
  });

  it("avisa quando a conexão é perdida", () => {
    render(<PwaStatus />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText("Você está sem conexão")).toBeInTheDocument();
    expect(screen.getByText(/dados e operações do sistema precisam de internet/i)).toBeInTheDocument();
  });

  it("não interfere nas experiências públicas enviadas a clientes", () => {
    window.history.replaceState({}, "", "/public/checklist/123");
    render(<PwaStatus />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.queryByText("Você está sem conexão")).not.toBeInTheDocument();
  });
});
