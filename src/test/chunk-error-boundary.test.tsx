import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  ChunkErrorBoundary,
  isChunkLoadError,
} from "@/components/common/ChunkErrorBoundary";

// Componente auxiliar que lança erro sob demanda
const ProblemChild = ({ errorToThrow }: { errorToThrow: Error | null }) => {
  if (errorToThrow) {
    throw errorToThrow;
  }
  return <div>Conteúdo renderizado com sucesso</div>;
};

describe("ChunkErrorBoundary & isChunkLoadError", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock de window.location
    delete (window as any).location;
    (window as any).location = {
      reload: vi.fn(),
      href: "http://localhost/",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).location = originalLocation;
  });

  it("identifica corretamente mensagens de erro de chunks e imports dinâmicos", () => {
    expect(
      isChunkLoadError(
        new TypeError("Failed to fetch dynamically imported module: https://domain/assets/foo.js")
      )
    ).toBe(true);

    expect(
      isChunkLoadError(
        new Error("Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html")
      )
    ).toBe(true);

    expect(
      isChunkLoadError(new Error("error loading dynamically imported module"))
    ).toBe(true);

    expect(
      isChunkLoadError(new Error("Importing a module script failed"))
    ).toBe(true);

    expect(
      isChunkLoadError(new Error("Loading chunk 123 failed"))
    ).toBe(true);

    expect(
      isChunkLoadError(new Error("Loading CSS chunk 456 failed"))
    ).toBe(true);

    expect(isChunkLoadError(new Error("Qualquer outro erro comum"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it("renderiza children normalmente quando nenhum erro é disparado", () => {
    render(
      <ChunkErrorBoundary>
        <ProblemChild errorToThrow={null} />
      </ChunkErrorBoundary>
    );

    expect(
      screen.getByText("Conteúdo renderizado com sucesso")
    ).toBeInTheDocument();
  });

  it("captura erro de chunk e tenta auto-reload", () => {
    const chunkError = new TypeError(
      "Failed to fetch dynamically imported module: /assets/test.js"
    );

    render(
      <ChunkErrorBoundary>
        <ProblemChild errorToThrow={chunkError} />
      </ChunkErrorBoundary>
    );

    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Nova versão do Siplan HUB disponível")
    ).toBeInTheDocument();
  });

  it("permite recarregar manualmente através do botão da interface", () => {
    // Simula que já recarregou recentemente para não disparar reload no componentDidCatch
    sessionStorage.setItem("siplan_chunk_error_reload", String(Date.now()));

    const chunkError = new TypeError(
      "Failed to fetch dynamically imported module: /assets/test.js"
    );

    render(
      <ChunkErrorBoundary>
        <ProblemChild errorToThrow={chunkError} />
      </ChunkErrorBoundary>
    );

    const reloadBtn = screen.getByRole("button", { name: /atualizar agora/i });
    expect(reloadBtn).toBeInTheDocument();

    fireEvent.click(reloadBtn);
    expect(window.location.reload).toHaveBeenCalled();
  });

  it("permite navegar para a página inicial através do botão", () => {
    sessionStorage.setItem("siplan_chunk_error_reload", String(Date.now()));

    const chunkError = new TypeError(
      "Failed to fetch dynamically imported module: /assets/test.js"
    );

    render(
      <ChunkErrorBoundary>
        <ProblemChild errorToThrow={chunkError} />
      </ChunkErrorBoundary>
    );

    const homeBtn = screen.getByRole("button", { name: /ir para o início/i });
    expect(homeBtn).toBeInTheDocument();

    fireEvent.click(homeBtn);
    expect((window as any).location.href).toBe("/");
  });
});
