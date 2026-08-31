import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectV2 } from "@/types/ProjectV2";
import NextDeployments from "./NextDeployments";

const mocks = vi.hoisted(() => ({
  projects: [] as ProjectV2[],
}));

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({ projects: mocks.projects, isLoading: false }),
}));

vi.mock("@/components/ProjectManagement/DeploymentDetailsDialog", () => ({
  DeploymentDetailsDialog: ({ project }: { project: ProjectV2 | null }) =>
    project ? <div>Detalhes de {project.clientName}</div> : null,
}));

const longClientName =
  "Cartório com nome muito extenso para permanecer legível no cronograma mobile";

function createProject(index: number, isConfirmed: boolean): ProjectV2 {
  return {
    id: `deployment-${index}`,
    clientName: index === 1 ? longClientName : `Cliente ${index}`,
    ticketNumber: `70${index}`,
    systemType: index === 1 ? "Sistema com identificação extensa" : "Orion TN",
    specialty: "Especialidade com descrição extensa para o celular",
    soldHours: 24,
    stages: {
      infra: { status: "done" },
      adherence: { status: "done" },
      environment: { status: "done" },
      conversion: { status: "done" },
      implementation: {
        status: "in-progress",
        phase1: {
          status: "in-progress",
          responsible: "Responsável com nome bastante extenso",
          startDate: new Date(`2099-09-0${index + 1}T12:00:00Z`),
          endDate: new Date(`2099-09-0${index + 2}T12:00:00Z`),
          isConfirmed,
        },
      },
      post: { status: "todo" },
    },
  } as unknown as ProjectV2;
}

describe("Próximas implantações no mobile", () => {
  beforeEach(() => {
    mocks.projects = [createProject(1, true), createProject(2, false)];
  });

  it("mantém cabeçalho, indicadores, filtros e semanas dentro da largura", () => {
    render(<NextDeployments />);

    expect(screen.getByTestId("next-deployments-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
    );
    expect(screen.getByTestId("deployments-summary")).toHaveClass(
      "grid",
      "grid-cols-3",
      "w-full",
    );
    expect(screen.getByTestId("deployments-view-toggle")).toHaveClass(
      "grid",
      "grid-cols-2",
      "w-full",
    );
    expect(screen.getByTestId("deployments-filters")).toHaveClass(
      "grid",
      "grid-cols-1",
      "min-[420px]:grid-cols-2",
    );
    expect(screen.getByLabelText("Filtrar por implantador")).toHaveClass(
      "flex-1",
      "sm:w-[180px]",
    );
    expect(screen.getByLabelText("Filtrar por sistema")).toHaveClass(
      "flex-1",
      "sm:w-[160px]",
    );

    const weeks = screen.getAllByTestId("deployment-week");
    expect(weeks[0]).toHaveClass("min-w-0", "overflow-hidden", "p-3", "sm:p-4");
  });

  it("quebra textos longos nos cartões e alterna para a grade sem rolagem lateral", () => {
    render(<NextDeployments />);

    const card = screen.getAllByTestId("deployment-card")[0];
    expect(card).toHaveClass("min-w-0", "overflow-hidden");
    expect(screen.getByText(longClientName)).toHaveClass("break-words");
    expect(
      screen.getAllByText("Responsável com nome bastante extenso")[0],
    ).toHaveClass("break-words", "sm:truncate");

    fireEvent.click(screen.getByRole("button", { name: "Grade" }));

    expect(screen.queryByTestId("deployment-week")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("deployment-card")).toHaveLength(2);
  });
});
