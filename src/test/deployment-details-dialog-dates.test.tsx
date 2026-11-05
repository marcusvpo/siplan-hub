import { fireEvent, render, screen, act, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ProjectV2 } from "@/types/ProjectV2";
import { DeploymentDetailsDialog } from "@/components/ProjectManagement/DeploymentDetailsDialog";

const mockMutateAsync = vi.fn();

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({
    updateProject: { mutateAsync: mockMutateAsync },
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ canEditProjects: true }),
}));

vi.mock("@/hooks/useTeamMembers", () => ({
  useTeamMembers: () => ({ members: [] }),
}));

vi.mock("@/hooks/useVacations", () => ({
  useVacations: () => ({
    vacations: [],
    isLoading: false,
    checkVacationConflict: () => ({ hasConflict: false }),
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return { ...original, useNavigate: () => vi.fn() };
});

const mockProject: ProjectV2 = {
  id: "test-dialog-project",
  clientName: "Cartório de Teste - Digitação de Datas",
  ticketNumber: "12345",
  systemType: "Orion TN",
  stages: {
    implementation: {
      status: "in-progress",
      responsible: "Bruno Fernandes",
      phase1: {
        status: "in-progress",
        responsible: "Bruno Fernandes",
        startDate: new Date("2026-11-16T12:00:00"),
        endDate: new Date("2026-11-20T12:00:00"),
        isConfirmed: false,
      },
    },
  },
} as unknown as ProjectV2;

describe("DeploymentDetailsDialog - Entrada de Datas e Alerta de Feriados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("não dispara alerta de feriado ao digitar dígitos parciais no ano (ex: ano 0002)", () => {
    render(
      <DeploymentDetailsDialog
        project={mockProject}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    // Localiza os inputs de data
    const dateInputs = screen.getAllByDisplayValue(/2026-11/);
    const startInput = dateInputs[0];

    // Simula a digitação do primeiro dígito do ano pelo usuário ("2" resultando em "0002-11-16")
    fireEvent.change(startInput, { target: { value: "0002-11-16" } });

    // Avança o tempo do debounce
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // O modal de confirmação de feriado NÃO pode aparecer
    expect(screen.queryByTestId("deployment-holiday-confirm-dialog")).not.toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("abre o alerta de feriado apenas quando uma data completa com feriado é confirmada", () => {
    render(
      <DeploymentDetailsDialog
        project={mockProject}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const dateInputs = screen.getAllByDisplayValue(/2026-11/);
    const startInput = dateInputs[0];

    // Altera para uma semana que tem feriado em dia útil: 02/11/2026 (Finados - Segunda-feira)
    fireEvent.change(startInput, { target: { value: "2026-11-02" } });

    // Simula o término da edição (blur no campo)
    act(() => {
      fireEvent.blur(startInput);
    });

    // O modal de alerta de feriado DEVE aparecer
    const dialog = screen.getByTestId("deployment-holiday-confirm-dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Semana com Feriado em Dia Útil/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Finados/i)).toBeInTheDocument();
  });

  it("restaura a data original ao clicar em Cancelar Alteração no alerta de feriado", () => {
    render(
      <DeploymentDetailsDialog
        project={mockProject}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const dateInputs = screen.getAllByDisplayValue(/2026-11/);
    const startInput = dateInputs[0] as HTMLInputElement;

    // Altera para semana com feriado
    fireEvent.change(startInput, { target: { value: "2026-11-02" } });
    act(() => {
      fireEvent.blur(startInput);
    });

    expect(screen.getByTestId("deployment-holiday-confirm-dialog")).toBeInTheDocument();

    // Clica em Cancelar Alteração
    const cancelBtn = screen.getByText("Cancelar Alteração");
    fireEvent.click(cancelBtn);

    // O modal fecha e o input restaura para a data original de 16/11/2026
    expect(screen.queryByTestId("deployment-holiday-confirm-dialog")).not.toBeInTheDocument();
    expect(startInput.value).toBe("2026-11-16");
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
