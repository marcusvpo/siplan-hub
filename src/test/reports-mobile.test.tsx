import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  DetailedInvolvement,
  Phase1ProjectDetail,
} from "@/hooks/useImplementerReport";
import Reports from "@/pages/Reports";
import { ImplementerAllCartoriosTable } from "@/components/Reports/Implementers/ImplementerAllCartoriosTable";
import { ImplementerPhase1ConsolidatedTable } from "@/components/Reports/Implementers/ImplementerPhase1ConsolidatedTable";
import { ImplementerPhase1Fichas } from "@/components/Reports/Implementers/ImplementerPhase1Fichas";

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({ projects: [], isLoading: false }),
}));

vi.mock("@/components/Reports/GlobalMetrics", () => ({
  GlobalMetrics: () => <div>Métricas globais</div>,
}));
vi.mock("@/components/Reports/TimePerStageChart", () => ({
  TimePerStageChart: () => <div>Tempo por etapa</div>,
}));
vi.mock("@/components/Reports/StatusDistribution", () => ({
  StatusDistribution: () => <div>Status</div>,
}));
vi.mock("@/components/Reports/HealthDistribution", () => ({
  HealthDistribution: () => <div>Saúde</div>,
}));
vi.mock("@/components/Reports/AdherenceGapCard", () => ({
  AdherenceGapCard: () => <div>Gaps</div>,
}));
vi.mock("@/components/Reports/ReportsFilters", () => ({
  ReportsFilters: () => <div>Filtros</div>,
}));
vi.mock("@/components/Reports/Individual/IndividualProjectReport", () => ({
  IndividualProjectReport: () => <div>Relatório individual mobile</div>,
}));
vi.mock("@/components/Reports/Implementers/ImplementerReportTab", () => ({
  ImplementerReportTab: () => <div>Relatório da equipe mobile</div>,
}));

const longClientName =
  "Cartório com nome muito extenso que precisa permanecer legível no celular";

const createPhase1Detail = (index: number) => ({
  project: {
    id: `project-${index}`,
    clientName: `Cliente ${index}`,
    ticketNumber: `70${String(index).padStart(4, "0")}`,
    overallProgress: index,
    stages: {
      adherence: { status: "todo" },
      conversion: { status: "todo" },
      implementation: { status: "in-progress" },
      post: { status: "todo" },
    },
  },
  systemType: "Orion TN",
  implantationType: "Presencial",
  leaderName: "Implantador",
  periodText: "01/08/2026 até 15/08/2026",
  presentialDaysText: "5 dias",
  statusF1Text: "Em andamento",
  globalStatusText: "Em andamento",
  observationsBullets: [],
}) as unknown as Phase1ProjectDetail;

const createInvolvement = (index: number) => ({
  project: {
    id: `involvement-${index}`,
    clientName: `Cartório ${index}`,
    ticketNumber: `71${String(index).padStart(4, "0")}`,
    systemType: "Orion PRO",
  },
  involvedStagesText: "Aderência, conversão e implantação",
  isPhase1Lead: index === 1,
}) as unknown as DetailedInvolvement;

describe("relatórios no mobile", () => {
  it("mantém a rota dentro da largura e oferece as três visões sem rolagem lateral", () => {
    render(<Reports />);

    expect(screen.getByTestId("reports-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
    );

    const tabsList = screen.getByText("Geral").closest('[role="tablist"]');
    expect(tabsList).toHaveClass(
      "grid",
      "grid-cols-3",
      "w-full",
      "overflow-x-hidden",
      "sm:w-auto",
    );

    fireEvent.mouseDown(screen.getByText("Individual").closest("button")!, {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByText("Relatório individual mobile")).toBeVisible();

    fireEvent.mouseDown(screen.getByText("Equipe").closest("button")!, {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByText("Relatório da equipe mobile")).toBeVisible();
  });

  it("substitui a tabela consolidada por cartões legíveis no celular", () => {
    const detail = {
      project: {
        id: "project-1",
        clientName: longClientName,
        ticketNumber: "701234",
      },
      systemType: "Orion TN",
      periodText: "01/08/2026 até 15/08/2026",
      statusF1Text: "Em andamento",
      globalStatusText: "Em andamento",
    } as unknown as Phase1ProjectDetail;

    render(<ImplementerPhase1ConsolidatedTable details={[detail]} />);

    const mobileList = screen.getByTestId("phase1-mobile-list");
    expect(within(mobileList).getByText(longClientName)).toHaveClass("break-words");
    expect(within(mobileList).getByText(/Período Fase 1/i)).toBeInTheDocument();
  });

  it("mostra a atuação nos cartórios em cartões sem tabela horizontal", () => {
    const involvement = {
      project: {
        id: "project-2",
        clientName: longClientName,
        ticketNumber: "709876",
        systemType: "Orion PRO",
      },
      involvedStagesText:
        "Aderência, conversão, implantação e pós-implantação",
      isPhase1Lead: true,
    } as unknown as DetailedInvolvement;

    render(
      <ImplementerAllCartoriosTable
        involvements={[involvement]}
        implementerName="Implantador"
      />,
    );

    const mobileList = screen.getByTestId("cartorios-mobile-list");
    expect(within(mobileList).getByText(longClientName)).toHaveClass("break-words");
    expect(within(mobileList).getByText(/Aderência, conversão/)).toHaveClass(
      "break-words",
    );
    expect(within(mobileList).getByText("Lead F1")).toBeInTheDocument();
  });

  it("pagina a tabela consolidada e reinicia ao receber um novo filtro", () => {
    const details = Array.from({ length: 4 }, (_, index) =>
      createPhase1Detail(index + 1),
    );
    const { rerender } = render(
      <ImplementerPhase1ConsolidatedTable details={details} />,
    );
    const mobileList = screen.getByTestId("phase1-mobile-list");

    expect(within(mobileList).getByText("Cliente 1")).toBeInTheDocument();
    expect(within(mobileList).queryByText("Cliente 4")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Próxima página de implantações consolidadas",
      }),
    );

    expect(within(mobileList).queryByText("Cliente 1")).not.toBeInTheDocument();
    expect(within(mobileList).getByText("Cliente 4")).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Página 2 de 2"),
    ).toBeInTheDocument();

    rerender(<ImplementerPhase1ConsolidatedTable details={[details[0]]} />);
    expect(within(mobileList).getByText("Cliente 1")).toBeInTheDocument();
  });

  it("pagina separadamente a visão geral dos cartórios", () => {
    const involvements = Array.from({ length: 4 }, (_, index) =>
      createInvolvement(index + 1),
    );
    render(
      <ImplementerAllCartoriosTable
        involvements={involvements}
        implementerName="Implantador"
      />,
    );
    const mobileList = screen.getByTestId("cartorios-mobile-list");

    expect(within(mobileList).getByText("Cartório 1")).toBeInTheDocument();
    expect(within(mobileList).queryByText("Cartório 4")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Próxima página de cartórios com atuação",
      }),
    );

    expect(within(mobileList).queryByText("Cartório 1")).not.toBeInTheDocument();
    expect(within(mobileList).getByText("Cartório 4")).toBeInTheDocument();
  });

  it("limita as fichas detalhadas a três projetos por página", () => {
    const details = Array.from({ length: 4 }, (_, index) =>
      createPhase1Detail(index + 1),
    );
    render(<ImplementerPhase1Fichas details={details} />);

    expect(screen.getByText(/1\. Cliente 1/)).toBeInTheDocument();
    expect(screen.queryByText(/4\. Cliente 4/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Próxima página de fichas detalhadas" }),
    );

    expect(screen.queryByText(/1\. Cliente 1/)).not.toBeInTheDocument();
    expect(screen.getByText(/4\. Cliente 4/)).toBeInTheDocument();
  });
});
