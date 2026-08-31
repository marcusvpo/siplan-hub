import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommercialCustomers from "./CommercialCustomers";

const { useCommercialMock } = vi.hoisted(() => ({
  useCommercialMock: vi.fn(),
}));

vi.mock("@/hooks/useCommercial", () => ({
  useCommercial: () => useCommercialMock(),
}));

const longClientName =
  "Cartório de Registro Civil e Tabelionato com um nome extremamente longo para o celular";

function renderPage() {
  return render(
    <MemoryRouter>
      <CommercialCustomers />
    </MemoryRouter>,
  );
}

describe("Painel de Clientes no mobile", () => {
  beforeEach(() => {
    useCommercialMock.mockReturnValue({
      clients: [
        { id: "client-long", name: longClientName, tags: ["Key Account"] },
        { id: "client-healthy", name: "Cartório Central", tags: [] },
      ],
      projectsWithClients: [
        {
          id: "project-critical",
          client_id: "client-long",
          client_name: longClientName,
          global_status: "in-progress",
          post_status: "pending",
          infra_status: "blocked",
          updated_at: new Date(Date.now() - 20 * 86_400_000).toISOString(),
        },
        {
          id: "project-healthy",
          client_id: "client-healthy",
          client_name: "Cartório Central",
          global_status: "in-progress",
          post_status: "pending",
          updated_at: new Date().toISOString(),
        },
      ],
      isLoadingClients: false,
      allCommercialNotes: [],
    });
  });

  it("usa filtros fluidos e cartões legíveis sem ampliar a página", () => {
    renderPage();

    expect(screen.getByTestId("commercial-customers-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
    );
    expect(screen.getByTestId("commercial-customer-filters")).toHaveClass(
      "min-w-0",
    );
    expect(screen.getByLabelText("Filtrar por status geral")).toHaveClass(
      "w-full",
      "min-w-0",
    );
    expect(screen.getByLabelText("Filtrar por projetos")).toHaveClass(
      "w-full",
      "min-w-0",
    );
    expect(screen.getByLabelText("Filtrar por última interação")).toHaveClass(
      "w-full",
      "min-w-0",
    );

    const mobileList = screen.getByTestId("commercial-customer-mobile-list");
    expect(mobileList).toHaveClass("lg:hidden", "min-w-0");

    const longName = within(mobileList).getByText(longClientName);
    expect(longName).toHaveClass("min-w-0", "break-words");
    expect(within(mobileList).getByText("Crítico")).toBeInTheDocument();
    expect(within(mobileList).getByText("1 bloqueio aberto")).toBeInTheDocument();
    expect(
      within(mobileList).getByRole("link", { name: `Ver detalhes de ${longClientName}` }),
    ).toHaveAttribute("href", "/commercial/client/client-long");
  });

  it("mostra um estado vazio mobile e permite limpar a busca", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Buscar cliente por nome"), {
      target: { value: "cliente inexistente" },
    });

    expect(screen.getByTestId("commercial-customer-empty-state")).toBeInTheDocument();
    expect(screen.getByText("Nenhum cliente encontrado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(screen.queryByTestId("commercial-customer-empty-state")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("commercial-customer-card")).toHaveLength(2);
  });
});
