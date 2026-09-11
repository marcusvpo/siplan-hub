import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DeploymentsTickets from "./DeploymentsTickets";

const { solicitarSync, useChamadosSearchMock } = vi.hoisted(() => ({
  solicitarSync: vi.fn().mockResolvedValue({ ticketNumbers: [] }),
  useChamadosSearchMock: vi.fn(() => ({
    chamados: [{
      numeroChamado: "84521",
      nomeCliente: "Cliente com nome muito extenso para validar a quebra de linha",
      titulo: "Solicitação extensa que precisa permanecer totalmente legível no cartão mobile",
      natureza: "Dúvida",
      status: "Em atendimento",
      produto: "Siplan",
      software: "Orion TN",
      equipeResponsavel: "SD - TN/RC",
      analistaResponsavel: "Ana Souza",
      dataAbertura: "2026-08-20",
    }],
    totalCount: 1,
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: ["Dúvida"], isLoading: false }),
}));

vi.mock("@/hooks/useChamados0800", () => ({
  useChamadosSearch: useChamadosSearchMock,
  useSolicitarSyncProcessoVenda: () => ({ solicitarSync, syncing: false }),
  isProcessoVendaSyncSupersededError: () => false,
  fetchAllChamados: vi.fn(),
  fetchAllChamadosForReport: vi.fn(),
  useChamadosClientOptions: () => ({
    data: [{ codigoCliente: "1", nomeCliente: "Cliente longo", aliases: ["Cliente longo"] }],
    isLoading: false,
  }),
  useChamadosAssignmentOptions: () => ({
    data: {
      groups: ["SD - TN/RC", "Implantação"],
      analysts: ["Ana Souza", "Bruno Lima"],
    },
    isLoading: false,
  }),
}));

vi.mock("@/components/ProjectManagement/Chamado0800DetailDialog", () => ({
  Chamado0800DetailDialog: ({ chamado }: { chamado: { numeroChamado: string } | null }) => (
    chamado ? <div data-testid="ticket-detail">Detalhe {chamado.numeroChamado}</div> : null
  ),
  fmtDateBr: (value?: string) => value || "—",
  statusBadgeClass: () => "bg-blue-100 text-blue-700",
}));

vi.mock("@/components/DeploymentsTickets/TicketsAiAnalysis", () => ({
  TicketsAiAnalysis: () => <div>Análise IA</div>,
}));

vi.mock("@/components/DeploymentsTickets/TicketsSlaAnalysis", () => ({
  TicketsSlaAnalysis: () => <div>Tempos e SLA</div>,
}));

vi.mock("@/components/DeploymentsTickets/TicketsSlaSectorAnalysis", () => ({
  TicketsSlaSectorAnalysis: () => <div>SLA por setor</div>,
}));

afterEach(() => cleanup());

describe("DeploymentsTickets no mobile", () => {
  it("prioriza busca, recolhe filtros avançados e usa cartões sem tabela horizontal", () => {
    const { container } = render(<DeploymentsTickets />);

    expect(screen.getByTestId("tickets-keyword-search-mobile")).toHaveClass("md:hidden");
    expect(
      within(screen.getByTestId("tickets-keyword-search-mobile")).getByRole("textbox"),
    ).toHaveAttribute("placeholder", "Digite e pressione Enter...");

    const filterButton = screen.getByRole("button", { name: "Mais filtros" });
    expect(filterButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(filterButton);
    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector('input[type="date"]')).toHaveClass("h-10", "md:h-7");
    expect(screen.getByRole("combobox", { name: "Todos os grupos" })).toHaveClass("w-full", "h-10");
    expect(screen.getByRole("combobox", { name: "Todos os analistas" })).toHaveClass("w-full", "h-10");

    const tabs = screen.getByRole("tablist");
    expect(tabs).toHaveClass("grid-cols-2", "w-full", "md:flex");

    const mobileList = screen.getByTestId("tickets-mobile-list");
    const client = within(mobileList).getByText(/Cliente com nome muito extenso/);
    const title = within(mobileList).getByText(/Solicitação extensa/);
    expect(client).toHaveClass("break-words");
    expect(title).toHaveClass("break-words");
    expect(within(mobileList).getByText("SD - TN/RC · Ana Souza")).toHaveClass("break-words");
    expect(container.querySelector("table")?.parentElement?.parentElement).toHaveClass("hidden", "md:block");
    expect(within(mobileList).getByRole("link", { name: /Abrir o chamado #84521 no Ellevo/ })).toHaveAttribute(
      "href",
      "https://sac.siplancontrolm.com.br/indexAtendente.html#/main/paginaurl/Historico.asp/Sol=84521",
    );

    fireEvent.click(within(mobileList).getByRole("button", { name: /Ver detalhes do chamado 84521/ }));
    expect(screen.getByTestId("ticket-detail")).toHaveTextContent("84521");
  });

  it("adiciona e remove palavras-chave usando Enter", () => {
    render(<DeploymentsTickets />);
    const search = screen.getByTestId("tickets-keyword-search-mobile");
    const input = within(search).getByRole("textbox");

    fireEvent.change(input, { target: { value: "  rtf  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(within(search).getByText("rtf")).toBeInTheDocument();
    expect(useChamadosSearchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchTerms: ["rtf"] }),
    );

    fireEvent.change(input, { target: { value: "pdf" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(within(search).getByText("pdf")).toBeInTheDocument();
    expect(useChamadosSearchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchTerms: ["rtf", "pdf"] }),
    );

    fireEvent.click(within(search).getByRole("button", { name: "Remover palavra-chave rtf" }));
    expect(within(search).queryByText("rtf")).not.toBeInTheDocument();
    expect(useChamadosSearchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchTerms: ["pdf"] }),
    );
  });

  it("aplica a mesma estrutura responsiva ao catálogo legado", () => {
    render(<DeploymentsTickets catalog="legacy" />);

    fireEvent.click(screen.getByRole("button", { name: "Mais filtros" }));

    expect(screen.getAllByText("Produto").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Software").length).toBeGreaterThan(0);
    const productFilter = screen.getAllByText("Produto")[0].parentElement?.querySelector("button");
    const softwareFilter = screen.getAllByText("Software")[0].parentElement?.querySelector("button");
    expect(productFilter).toHaveClass("h-10", "md:h-7");
    expect(softwareFilter).toHaveClass("h-10", "md:h-7");
    expect(screen.getByTestId("tickets-mobile-list")).toBeInTheDocument();
  });
});
