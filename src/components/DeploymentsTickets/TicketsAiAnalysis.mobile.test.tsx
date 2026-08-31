import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TicketsAiAnalysis } from "./TicketsAiAnalysis";

const longAnalysis = `Risco crítico: ${"referencia-sem-espacos-".repeat(16)}`;

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [{
      numeroChamado: "750831",
      nomeCliente: "Cartório com nome extenso que precisa quebrar no celular",
      titulo: "Criação de novos campos na conversão de cartão de assinatura com uma descrição extensa",
      status: "Em atendimento",
      dataAbertura: "2026-01-10",
      natureza: "Dúvida",
      software: "Orion TN",
    }],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useModelGenerationJobs", () => ({
  useModelWorkerStatus: () => ({ online: true }),
}));

vi.mock("@/hooks/useTicketsAiAnalysis", () => ({
  useTicketsAiAnalysis: () => ({
    generate: vi.fn(),
    active: undefined,
    latest: { resultText: longAnalysis, createdAt: "2026-08-31T12:00:00Z" },
    latestError: undefined,
  }),
}));

vi.mock("@/components/ProjectManagement/Chamado0800DetailDialog", () => ({
  Chamado0800DetailDialog: ({ chamado }: { chamado: { numeroChamado: string } | null }) => (
    chamado ? <div data-testid="ticket-ai-detail">Detalhe {chamado.numeroChamado}</div> : null
  ),
}));

vi.mock("recharts", () => {
  const ChartPart = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Bar: ChartPart,
    BarChart: ChartPart,
    CartesianGrid: ChartPart,
    Cell: ChartPart,
    LabelList: ChartPart,
    Pie: ChartPart,
    PieChart: ChartPart,
    ResponsiveContainer: ChartPart,
    Tooltip: ChartPart,
    XAxis: ChartPart,
    YAxis: ChartPart,
  };
});

describe("TicketsAiAnalysis no mobile", () => {
  it("quebra chamados e pareceres longos sem ampliar a largura da página", () => {
    const { container } = render(
      <TicketsAiAnalysis
        active
        filterKey="mobile-filter"
        syncing={false}
        filters={{
          catalog: "orion",
          startDate: "2026-08-01",
          endDate: "2026-08-31",
          clientCodes: null,
          clientNames: null,
          product: "todos",
          products: null,
          softwares: null,
          nature: "todas",
          searchTerm: null,
          statuses: null,
          ticketNumbers: null,
        }}
        filterDescription={{
          startDate: "2026-08-01",
          endDate: "2026-08-31",
          clients: [],
          product: "todos",
          products: [],
          softwares: [],
          nature: "todas",
          statuses: [],
          searchTerm: "",
        }}
      />,
    );

    expect(container.firstElementChild).toHaveClass("min-w-0", "max-w-full", "overflow-x-hidden");

    const oldestHeading = screen.getByRole("heading", { name: "Chamados em aberto há mais tempo" });
    const oldestCard = oldestHeading.parentElement?.parentElement;
    expect(oldestCard).toHaveClass("min-w-0", "overflow-hidden");

    const ticketTitle = within(oldestCard as HTMLElement).getByText(/Criação de novos campos/);
    expect(ticketTitle).toHaveClass("break-words", "sm:truncate");

    const detailButtons = within(oldestCard as HTMLElement).getAllByRole("button", { name: /Ver detalhes e trâmites/ });
    expect(detailButtons[0]).toHaveClass("h-9", "w-9");
    fireEvent.click(detailButtons[0]);
    expect(screen.getByTestId("ticket-ai-detail")).toHaveTextContent("750831");

    const analysisText = screen.getByText(/Risco crítico:/);
    expect(analysisText.parentElement).toHaveClass("min-w-0", "max-w-full", "break-words", "[overflow-wrap:anywhere]");
    expect(screen.getByRole("button", { name: "Atualizar análise" })).toHaveClass("w-full", "min-w-0", "whitespace-normal");
  });
});
