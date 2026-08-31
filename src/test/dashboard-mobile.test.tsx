import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectV2 } from "@/types/ProjectV2";

const mocks = vi.hoisted(() => ({
  projects: [] as ProjectV2[],
  setSelectedProject: vi.fn(),
}));

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({ projects: mocks.projects, isLoading: false }),
}));

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: () => ({ setSelectedProject: mocks.setSelectedProject }),
}));

import { CriticalAlerts } from "@/components/Dashboard/CriticalAlerts";
import { DashboardTable } from "@/components/Dashboard/DashboardTable";

const longProjectName =
  "Franca - Tabelionato de Notas e Protesto de Letras e Títulos";

function createProject(index: number): ProjectV2 {
  return {
    id: `project-${index}`,
    clientName: index === 1 ? longProjectName : `Projeto ${index}`,
    systemType: "Orion TN",
    ticketNumber: `71${index}`,
    healthScore: "critical",
    globalStatus: "in-progress",
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: "Bruno Fernandes",
    stages: {
      infra: { status: "done" },
      adherence: { status: "in-progress" },
      environment: { status: "todo" },
      conversion: { status: "todo" },
      implementation: { status: "todo" },
      post: { status: "todo" },
    },
  } as ProjectV2;
}

describe("Dashboard no mobile", () => {
  beforeEach(() => {
    mocks.projects = Array.from({ length: 7 }, (_, index) =>
      createProject(index + 1),
    );
    mocks.setSelectedProject.mockReset();
  });

  it("quebra nomes longos e mantém a paginação dentro da largura", () => {
    render(<DashboardTable />);

    expect(screen.getByRole("heading", { name: longProjectName })).toHaveClass(
      "whitespace-normal",
      "break-words",
    );
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Página anterior")).toHaveClass("w-9");
    expect(screen.getByLabelText("Próxima página")).toHaveClass("w-9");
  });

  it("mostra alertas críticos compactos sem texto rolando lateralmente", () => {
    const onProjectClick = vi.fn();
    const project = createProject(1);

    render(
      <CriticalAlerts projects={[project]} onProjectClick={onProjectClick} />,
    );

    const projectButton = screen.getByRole("button", { name: new RegExp(longProjectName) });
    expect(screen.getByText(longProjectName)).toHaveClass("break-words");
    expect(projectButton).toHaveClass("w-full", "min-w-0", "text-left");

    fireEvent.click(projectButton);
    expect(onProjectClick).toHaveBeenCalledWith(project);
  });
});
