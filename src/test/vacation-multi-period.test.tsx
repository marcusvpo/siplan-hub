import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VacationManagement from "@/pages/admin/VacationManagement";
import type { Vacation } from "@/hooks/useVacations";

// Mock das férias com múltiplos períodos para o mesmo colaborador
const mockVacations: Vacation[] = [
  {
    id: "vac-1",
    implantador_name: "Julio Araujo",
    implantador_id: "julio-araujo",
    start_date: "2026-07-13",
    end_date: "2026-07-27",
    description: "Férias regulares de inverno (15 dias)",
    created_by: "user-1",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "vac-2",
    implantador_name: "Julio Araujo",
    implantador_id: "julio-araujo",
    start_date: "2026-12-21",
    end_date: "2027-01-04",
    description: "Recesso coletivo de fim de ano (15 dias)",
    created_by: "user-1",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "vac-3",
    implantador_name: "Rodrigo Brites",
    implantador_id: "rodrigo-brites",
    start_date: "2026-11-16",
    end_date: "2026-11-30",
    description: "Férias de novembro",
    created_by: "user-1",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
];

vi.mock("@/hooks/useVacations", () => ({
  useVacations: () => ({
    vacations: mockVacations,
    isLoading: false,
    addVacation: { mutateAsync: vi.fn() },
    updateVacation: { mutateAsync: vi.fn() },
    deleteVacation: { mutateAsync: vi.fn() },
    checkOverlapWithExisting: (
      implantadorIdOrName: string,
      start: string,
      end: string,
      excludeId?: string
    ) => {
      return (
        mockVacations.find(
          (v) =>
            v.id !== excludeId &&
            (v.implantador_id === implantadorIdOrName ||
              v.implantador_name.toLowerCase() === implantadorIdOrName.toLowerCase()) &&
            v.start_date <= end &&
            v.end_date >= start
        ) || null
      );
    },
    getVacationsForImplantador: (idOrName: string) =>
      mockVacations.filter(
        (v) =>
          v.implantador_id === idOrName ||
          v.implantador_name.toLowerCase() === idOrName.toLowerCase()
      ),
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("Gestão de Múltiplos Períodos de Férias por Implantador", () => {
  it("renderiza a tela de férias com KPIs executivos e abas organizadas", () => {
    const { container } = render(<VacationManagement />);

    expect(screen.getByText("Gestão de Escala e Férias")).toBeInTheDocument();
    expect(screen.getByText("Total de Períodos")).toBeInTheDocument();
    expect(screen.getByText("Por Implantador")).toBeInTheDocument();
    expect(screen.getByText("Lista Geral Cronológica")).toBeInTheDocument();

    // Confirma que os números do KPI estão renderizados
    const countElements = screen.getAllByText("3");
    expect(countElements.length).toBeGreaterThanOrEqual(1);

    // Clica na aba Lista Geral Cronológica para montar a tabela
    fireEvent.click(screen.getByText("Lista Geral Cronológica"));

    // Confirma que a classe obrigatória mobile-card-table existe no HTML
    expect(container.querySelector(".mobile-card-table")).toBeInTheDocument();
  });

  it("exibe múltiplos períodos no card do colaborador (Julio Araujo)", () => {
    render(<VacationManagement />);

    // Julio Araujo possui 2 períodos cadastrados somando 30 dias corridos
    expect(screen.getByText("2 períodos cadastrados")).toBeInTheDocument();
    expect(screen.getByText("30 dias corridos")).toBeInTheDocument();

    const period1Badges = screen.getAllByText(/Período #1/);
    expect(period1Badges.length).toBeGreaterThanOrEqual(1);

    const period2Badges = screen.getAllByText(/Período #2/);
    expect(period2Badges.length).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByText(/"Férias regulares de inverno \(15 dias\)"/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/"Recesso coletivo de fim de ano \(15 dias\)"/)
    ).toBeInTheDocument();
  });

  it("fornece botão para cadastrar novo período direto no card de cada implantador", () => {
    render(<VacationManagement />);

    const addButtons = screen.getAllByRole("button", { name: /\+ Período/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });
});
