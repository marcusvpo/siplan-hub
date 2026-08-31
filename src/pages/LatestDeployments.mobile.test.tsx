import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectV2 } from "@/types/ProjectV2";
import LatestDeployments from "./LatestDeployments";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  projects: [] as ProjectV2[],
}));

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({ projects: mocks.projects, isLoading: false }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return { ...original, useNavigate: () => mocks.navigate };
});

const longClientName =
  "Cartório com nome muito extenso para permanecer legível no histórico mobile";
const longResponsibleName =
  "Analista responsável com nome bastante extenso para o celular";

function createProject(index: number): ProjectV2 {
  return {
    id: `latest-deployment-${index}`,
    clientName: index === 1 ? longClientName : `Cliente ${index}`,
    ticketNumber: `80${index}`,
    systemType:
      index === 1 ? "Sistema com identificação muito extensa" : "Orion TN",
    soldHours: 40,
    projectLeader: "Liderança com nome extenso",
    implantationType: "migration_competitor",
    stages: {
      infra: { status: "done" },
      adherence: { status: "done" },
      environment: { status: "done" },
      conversion: { status: "done" },
      implementation: {
        status: "done",
        responsible: longResponsibleName,
        phase1: {
          status: "done",
          endDate: new Date(`2026-08-${20 - index}T12:00:00Z`),
          switchType: "Virada com descrição bastante extensa",
        },
      },
      post: {
        status: index === 1 ? "in-progress" : "done",
        responsible: "Analista pós-implantação com nome extenso",
        clientSatisfaction: "satisfied",
      },
    },
  } as unknown as ProjectV2;
}

describe("Últimas implantações no mobile", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.projects = [createProject(1), createProject(2)];
  });

  it("mantém indicadores e filtros fluidos em telas estreitas", () => {
    render(<LatestDeployments />);

    expect(screen.getByTestId("latest-deployments-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
    );
    expect(screen.getByTestId("latest-deployments-kpis")).toHaveClass(
      "grid-cols-2",
      "lg:grid-cols-4",
    );
    expect(screen.getByTestId("latest-deployments-filters")).toHaveClass(
      "grid",
      "grid-cols-1",
      "min-[420px]:grid-cols-2",
    );
    expect(screen.getByLabelText("Buscar implantações")).toHaveClass(
      "min-w-0",
      "h-10",
    );
    expect(screen.getByLabelText("Filtrar por sistema")).toHaveClass(
      "flex-1",
      "sm:w-[160px]",
    );
    expect(screen.getByLabelText("Filtrar por período")).toHaveClass(
      "flex-1",
      "sm:w-[160px]",
    );
    expect(screen.getByLabelText("Filtrar por ano")).toHaveClass(
      "flex-1",
      "sm:w-[110px]",
    );
    expect(screen.getByLabelText("Filtrar por mês")).toHaveClass(
      "flex-1",
      "sm:w-[130px]",
    );
  });

  it("quebra textos longos na timeline e mantém a navegação do cartão", () => {
    render(<LatestDeployments />);

    expect(screen.getByTestId("latest-deployments-timeline")).toHaveClass(
      "min-w-0",
    );

    const card = screen.getAllByTestId("latest-deployment-card")[0];
    expect(card).toHaveClass("min-w-0", "overflow-hidden");
    expect(screen.getByText(longClientName)).toHaveClass(
      "break-words",
      "md:truncate",
    );
    expect(screen.getAllByText(longResponsibleName)[0]).toHaveClass(
      "break-words",
      "md:truncate",
    );

    fireEvent.click(card);
    expect(mocks.navigate).toHaveBeenCalledWith("/projects?id=latest-deployment-1");
  });
});
