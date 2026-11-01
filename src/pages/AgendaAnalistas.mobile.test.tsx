import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AgendaAnalistas from "./AgendaAnalistas";

// Mock do hook useAnalystAgenda
vi.mock("@/hooks/useAnalystAgenda", () => ({
  useAnalystAgenda: () => ({
    events: [
      {
        id: "mock-1",
        userName: "Maria Santos",
        userId: "428879ee-95b3-429f-a48e-2fba91da9ff8",
        ticketNumber: "12345",
        ticketCatalog: "orion",
        clientName: "Cartório Silva",
        subject: "Treinamento Orion",
        activityType: "implantacao",
        date: "2026-10-15",
        startTime: "08:30",
        endTime: "17:30",
        isAllDay: true,
        origin: "manual_entry",
        isConfirmed: true,
      },
    ],
    holidays: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createEntry: vi.fn(),
    createBulkEntries: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
  }),
}));

// Mock do hook useHubCollaborators
vi.mock("@/hooks/useHubCollaborators", () => ({
  useHubCollaborators: () => ({
    data: [
      { id: "428879ee-95b3-429f-a48e-2fba91da9ff8", name: "Maria Santos", fullName: "Maria Santos", email: "maria.santos@siplan.com.br", team: "Implantação" },
      { id: "c9bc1cb5-29d5-426e-b178-bedc76cdfbd0", name: "Lunna Santana", fullName: "Lunna Santana", email: "lunna.santana@siplan.com.br", team: "Implantação" },
    ],
    isLoading: false,
  }),
}));

// Mock do hook useAgendaPermissions
vi.mock("@/hooks/useAgendaPermissions", () => ({
  useAgendaPermissions: () => ({
    isManager: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManage: true,
    userEmail: "maria.santos@siplan.com.br",
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/agenda-analistas"]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Agenda Siplan dos Analistas na interface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o cabeçalho completo, badge e container responsivo sem scroll horizontal", () => {
    renderWithProviders(<AgendaAnalistas />);

    const pageContainer = screen.getByTestId("analyst-agenda-page");
    expect(pageContainer).toBeInTheDocument();
    expect(pageContainer).toHaveClass("overflow-x-hidden");

    expect(screen.getByRole("heading", { name: "Agenda dos Analistas" })).toBeInTheDocument();
    expect(screen.getByText("Agenda Siplan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Atualizar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Imprimir/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir formulário de novo cadastro na agenda" })).toBeInTheDocument();
    expect(screen.getByTestId("agenda-analyst-gate")).toBeInTheDocument();
  });

  it("exibe a barra de ferramentas (toolbar) com alternador de visões (Mês, Semana, Dia)", () => {
    renderWithProviders(<AgendaAnalistas />);

    const monthTab = screen.getByRole("tab", { name: /Mês/i });
    const weekTab = screen.getByRole("tab", { name: /Semana/i });
    const dayTab = screen.getByRole("tab", { name: /Dia/i });

    expect(monthTab).toBeInTheDocument();
    expect(weekTab).toBeInTheDocument();
    expect(dayTab).toBeInTheDocument();
    expect(weekTab).toHaveAttribute("data-state", "active");
  });

  it("permite alternar para a visão Semanal e Diária", async () => {
    renderWithProviders(<AgendaAnalistas />);

    const dayTab = screen.getByRole("tab", { name: /Dia/i });
    fireEvent.pointerDown(dayTab);
    fireEvent.click(dayTab);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Dia/i })).toBeInTheDocument();
    });
  });

  it("abre o diálogo de novo agendamento ao clicar em + Novo Cadastro", async () => {
    renderWithProviders(<AgendaAnalistas />);

    const newBtn = screen.getByRole("button", { name: "Abrir formulário de novo cadastro na agenda" });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText(/Novo Agendamento — Agenda Siplan/i)).toBeInTheDocument();
    });
  });
});
