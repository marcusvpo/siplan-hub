import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/modules/orion-updates/App";
import { ContentTransition } from "@/modules/orion-updates/ContentTransition";
import { ListingTools, versionOrders, type VersionOrder } from "@/modules/orion-updates/ListingTools";
import type { Publication, PublicSettings } from "@/modules/orion-updates/api";

const api = vi.hoisted(() => ({ settings: vi.fn(), detailById: vi.fn() }));

vi.mock("@/modules/orion-updates/api", () => ({ publicApi: api, adminApi: {} }));
vi.mock("@/hooks/use-theme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("@/modules/orion-updates/AdminAccess", () => ({
  ReaderManagementAccess: () => null,
  ViewModeSwitch: () => null,
  useAdminAccess: () => ({ access: null, status: "ready" }),
}));
vi.mock("@/modules/orion-updates/PostEditor", () => ({ PublicationEditor: () => null, VersionEditor: () => null }));
vi.mock("@/modules/orion-updates/PostCover", () => ({ PostCover: () => null }));
vi.mock("@/modules/orion-updates/PostAnalytics", () => ({ PostAnalytics: () => null }));
vi.mock("@/modules/orion-updates/SuggestionsInbox", () => ({ SuggestionsInbox: () => null }));
vi.mock("@/modules/orion-updates/PostActions", async importOriginal => {
  const original = await importOriginal<typeof import("@/modules/orion-updates/PostActions")>();
  return { ...original, PostActions: () => null };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const settings: PublicSettings = {
  public_enabled: false,
  maintenance_title: "Melhorias no Orion Blog",
  maintenance_message: "As publicações voltam em breve.",
};

const publication: Publication = {
  id: 42,
  titulo: "Publicação compartilhada",
  subtitulo: "Orientações da versão",
  slug: "publicacao-compartilhada",
  versao: "06.03.03",
  versao_id: 6,
  resumo: "Resumo da publicação",
  sistema: "oriontn",
  sistema_nome: "OrionTN",
  tipo: "novidade",
  corpo_formato: "text",
  publicado_em: "2026-09-28T12:00:00Z",
  destaque: false,
  critico: false,
  ja_lido: false,
  capa_imagem_id: null,
  produtos: [],
  total_itens: 0,
};

describe("Publicação compartilhada do Orion Blog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/atualizacoes/posts/42");
    document.title = "Siplan Hub";
  });
  afterEach(() => vi.restoreAllMocks());

  it("troca o carregamento pela manutenção quando a consulta termina sem alterar a ordem dos hooks", async () => {
    const response = deferred<PublicSettings>();
    api.settings.mockReturnValue(response.promise);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando publicação…");
    expect(api.detailById).not.toHaveBeenCalled();
    await act(async () => response.resolve(settings));

    expect(screen.getByRole("heading", { name: settings.maintenance_title })).toBeInTheDocument();
    expect(screen.getByText(settings.maintenance_message)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(api.detailById).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(document.title).toBe("Siplan Hub");
  });

  it("carrega o conteúdo somente após confirmar acesso e restaura o título ao sair", async () => {
    const settingsResponse = deferred<PublicSettings>();
    const detailResponse = deferred<Publication>();
    api.settings.mockReturnValue(settingsResponse.promise);
    api.detailById.mockReturnValue(detailResponse.promise);
    const { unmount } = render(<App />);

    expect(api.detailById).not.toHaveBeenCalled();
    await act(async () => settingsResponse.resolve({ ...settings, public_enabled: true }));
    expect(api.detailById).toHaveBeenCalledWith("42");
    await act(async () => detailResponse.resolve(publication));

    expect(screen.getByRole("heading", { name: publication.titulo })).toBeInTheDocument();
    expect(document.title).toBe(`${publication.titulo} — Orion Blog`);
    expect(window.location.pathname).toBe("/atualizacoes/posts/42/publicacao-compartilhada");
    unmount();
    expect(document.title).toBe("Siplan Hub");
  });

  it("apresenta falha de consulta da publicação sem ficar carregando", async () => {
    api.settings.mockResolvedValue({ ...settings, public_enabled: true });
    api.detailById.mockRejectedValue(new Error("Não foi possível carregar a publicação."));
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar a publicação.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("Acessibilidade da atualização de resultados do Orion Blog", () => {
  it("retira foco dos resultados anteriores e os torna inertes apenas enquanto aguarda a próxima consulta", () => {
    const { container, rerender } = render(
      <ContentTransition contentKey="primeiro"><button>Resultado anterior</button></ContentTransition>,
    );
    screen.getByRole("button", { name: "Resultado anterior" }).focus();
    rerender(<ContentTransition pending contentKey="segundo"><button>Próximo resultado</button></ContentTransition>);

    const retained = screen.getByText("Resultado anterior").parentElement;
    expect(retained).toHaveAttribute("inert");
    expect(retained).toHaveAttribute("aria-hidden", "true");
    expect(document.activeElement).toBe(container.firstElementChild);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<ContentTransition contentKey="segundo"><button>Próximo resultado</button></ContentTransition>);
    expect(screen.getByRole("button", { name: "Próximo resultado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo resultado" }).parentElement).not.toHaveAttribute("inert");
    expect(screen.queryByText("Resultado anterior")).not.toBeInTheDocument();
  });

  it("mantém o tipo da ordenação ao receber um setter React e troca a opção selecionada", () => {
    function Listing() {
      const [order, setOrder] = useState<VersionOrder>("criacao_desc");
      return <ListingTools versions order={order} options={versionOrders} search="" busy={false} onOrder={setOrder} onSearch={() => undefined} />;
    }
    render(<Listing />);
    const select = screen.getByRole("combobox", { name: "Ordenar versões" });
    fireEvent.change(select, { target: { value: "versao_asc" } });
    expect(select).toHaveValue("versao_asc");
  });
});
