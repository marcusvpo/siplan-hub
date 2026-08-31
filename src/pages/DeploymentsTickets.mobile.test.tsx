import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DeploymentsTickets from "./DeploymentsTickets";

const { solicitarSync } = vi.hoisted(() => ({
  solicitarSync: vi.fn().mockResolvedValue({ ticketNumbers: [] }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: ["Dúvida"], isLoading: false }),
}));

vi.mock("@/hooks/useChamados0800", () => ({
  useChamadosSearch: () => ({
    chamados: [{
      numeroChamado: "84521",
      nomeCliente: "Cliente com nome muito extenso para validar a quebra de linha",
      titulo: "Solicitação extensa que precisa permanecer totalmente legível no cartão mobile",
      natureza: "Dúvida",
      status: "Em atendimento",
      produto: "Siplan",
      software: "Orion TN",
      dataAbertura: "2026-08-20",
    }],
    totalCount: 1,
    isLoading: false,
    error: null,
  }),
  useSolicitarSyncProcessoVenda: () => ({ solicitarSync, syncing: false }),
  isProcessoVendaSyncSupersededError: () => false,
  fetchAllChamados: vi.fn(),
  fetchAllChamadosForReport: vi.fn(),
  useChamadosClientOptions: () => ({
    data: [{ codigoCliente: "1", nomeCliente: "Cliente longo", aliases: ["Cliente longo"] }],
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

    expect(screen.getByPlaceholderText("Buscar chamado, título ou termo...").parentElement).toHaveClass("md:hidden");

    const filterButton = screen.getByRole("button", { name: "Mais filtros" });
    expect(filterButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(filterButton);
    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector('input[type="date"]')).toHaveClass("h-10", "md:h-7");

    const tabs = screen.getByRole("tablist");
    expect(tabs).toHaveClass("grid-cols-2", "w-full", "md:flex");

    const mobileList = screen.getByTestId("tickets-mobile-list");
    const client = within(mobileList).getByText(/Cliente com nome muito extenso/);
    const title = within(mobileList).getByText(/Solicitação extensa/);
    expect(client).toHaveClass("break-words");
    expect(title).toHaveClass("break-words");
    expect(container.querySelector("table")?.parentElement?.parentElement).toHaveClass("hidden", "md:block");

    fireEvent.click(within(mobileList).getByRole("button", { name: /Abrir chamado 84521/ }));
    expect(screen.getByTestId("ticket-detail")).toHaveTextContent("84521");
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
