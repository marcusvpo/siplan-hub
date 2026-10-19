import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarLegend } from "@/components/calendar/CalendarLegend";
import { DeploymentDetailsDialog } from "@/components/ProjectManagement/DeploymentDetailsDialog";
import { useCalendarStore } from "@/stores/calendarStore";
import type { CalendarEvent } from "@/types/calendar";
import type { ProjectV2 } from "@/types/ProjectV2";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({
    updateProject: vi.fn(),
  }),
}));

vi.mock("@/hooks/useVacations", () => ({
  useVacations: () => ({
    vacations: [],
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    canEditProjects: true,
  }),
}));

vi.mock("@/hooks/useTeamMembers", () => ({
  useTeamMembers: () => ({
    members: [],
    isLoading: false,
  }),
}));

const confirmedEvent: CalendarEvent = {
  id: "evt-confirmed",
  resourceId: "julio-araujo",
  title: "Cartório Confirmado REG",
  clientName: "Cartório Confirmado REG",
  systemCategory: "reg",
  systemType: "Orion REG",
  start: new Date("2026-10-19T12:00:00"),
  end: new Date("2026-10-23T12:00:00"),
  type: "implementation",
  status: "confirmed",
  isConfirmed: true,
  ticketNumber: "123456",
};

const plannedEvent: CalendarEvent = {
  id: "evt-planned",
  resourceId: "julio-araujo",
  title: "Cartório Previsto TN",
  clientName: "Cartório Previsto TN",
  systemCategory: "tn",
  systemType: "Orion TN",
  start: new Date("2026-10-26T12:00:00"),
  end: new Date("2026-10-30T12:00:00"),
  type: "implementation",
  status: "planned",
  isConfirmed: false,
  ticketNumber: "654321",
};

const mockConfirmedProject: ProjectV2 = {
  id: "proj-1",
  clientName: "1º Ofício Teste Confirmado",
  ticketNumber: "123456",
  systemType: "Orion REG",
  status: "in_progress",
  globalStatus: "in_progress",
  stages: {
    implementation: {
      status: "in-progress",
      phase1: {
        status: "in-progress",
        responsible: "Julio Araujo",
        startDate: "2026-10-19T12:00:00",
        endDate: "2026-10-23T12:00:00",
        isConfirmed: true,
      },
    },
  },
} as any;

const mockPlannedProject: ProjectV2 = {
  id: "proj-2",
  clientName: "2º Ofício Teste Previsão",
  ticketNumber: "654321",
  systemType: "Orion TN",
  status: "in_progress",
  globalStatus: "in_progress",
  stages: {
    implementation: {
      status: "todo",
      phase1: {
        status: "todo",
        responsible: "Ricardo Vieira",
        startDate: "2026-10-26T12:00:00",
        endDate: "2026-10-30T12:00:00",
        isConfirmed: false,
      },
    },
  },
} as any;

describe("Distinção Visual entre Implantação Confirmada e Previsão em /calendar", () => {
  it("renderiza a Legenda com os marcadores de Borda Sólida (Confirmada) e Borda Tracejada (Previsão)", () => {
    render(<CalendarLegend />);

    expect(screen.getByText(/Borda Sólida: Confirmada/i)).toBeInTheDocument();
    expect(screen.getByText(/Borda Tracejada: Previsão/i)).toBeInTheDocument();
    expect(screen.getByText(/tag no popup\/modal/i)).toBeInTheDocument();
  });

  it("renderiza o card de implantação confirmada com cor 100% sólida, borda sólida e SEM tags de texto internas na barra", () => {
    useCalendarStore.setState({
      currentDate: new Date("2026-10-19T12:00:00"),
      selectedYear: 2026,
      selectedQuarter: 4,
      viewMode: "quarter",
      displayTab: "timeline",
      isInteractiveMode: false,
      searchQuery: "",
      systemFilter: "all",
      statusFilter: "all",
      onlyActiveMembers: false,
      hiddenResourceIds: [],
      realEvents: [confirmedEvent],
      interactiveEvents: [],
    });

    const { container } = render(
      <CalendarGrid
        onEventClick={vi.fn()}
        onUnscheduledProjectClick={vi.fn()}
        unscheduledProjects={[]}
        projects={[]}
      />
    );

    const bar = container.querySelector('[data-testid="calendar-gantt-bar"]');
    expect(bar).toBeInTheDocument();

    // A tag textual NÃO deve aparecer dentro da barra para liberar todo o espaço ao nome do cartório
    expect(bar?.textContent).not.toContain("CONFIRMADA");
    expect(bar?.textContent).not.toContain("PREVISTA");

    // O nome do cartório tem espaço livre e visibilidade máxima
    expect(screen.getByText("Cartório Confirmado REG")).toBeInTheDocument();

    // Estilo: borda sólida, sem borda tracejada e sem classes de atenuação/opacidade reduzida
    expect(bar?.className).not.toContain("border-dashed");
    expect(bar?.className).not.toContain("opacity-80");

    // Atributos de acessibilidade e status
    expect(bar?.getAttribute("data-status")).toBe("confirmed");
    expect(bar?.getAttribute("title")).toContain("Implantação Confirmada");
    expect(bar?.getAttribute("aria-label")).toContain("Implantação Confirmada com o Cliente");
  });

  it("renderiza o card de previsão com cor 100% viva e sólida, borda tracejada de alta visibilidade e SEM tags de texto internas na barra", () => {
    useCalendarStore.setState({
      currentDate: new Date("2026-10-26T12:00:00"),
      selectedYear: 2026,
      selectedQuarter: 4,
      viewMode: "quarter",
      displayTab: "timeline",
      isInteractiveMode: false,
      searchQuery: "",
      systemFilter: "all",
      statusFilter: "all",
      onlyActiveMembers: false,
      hiddenResourceIds: [],
      realEvents: [plannedEvent],
      interactiveEvents: [],
    });

    const { container } = render(
      <CalendarGrid
        onEventClick={vi.fn()}
        onUnscheduledProjectClick={vi.fn()}
        unscheduledProjects={[]}
        projects={[]}
      />
    );

    const bar = container.querySelector('[data-testid="calendar-gantt-bar"]');
    expect(bar).toBeInTheDocument();

    // A tag textual NÃO deve aparecer dentro da barra para não roubar espaço
    expect(bar?.textContent).not.toContain("PREVISTA");
    expect(bar?.textContent).not.toContain("CONFIRMADA");

    // O nome do cartório tem espaço total e legibilidade
    expect(screen.getByText("Cartório Previsto TN")).toBeInTheDocument();

    // Estilo: borda tracejada branca de alto contraste, mas mantendo 100% de cor sólida (sem opacity-80 e sem /75)
    expect(bar?.className).toContain("border-dashed");
    expect(bar?.className).not.toContain("opacity-80");

    // Atributos de acessibilidade e status
    expect(bar?.getAttribute("data-status")).toBe("planned");
    expect(bar?.getAttribute("title")).toContain("Data Prevista");
    expect(bar?.getAttribute("aria-label")).toContain("Data Prevista na Agenda");
  });

  it("exibe a tag de confirmação no modal (DeploymentDetailsDialog) quando aberto com projeto confirmado", () => {
    render(
      <BrowserRouter>
        <DeploymentDetailsDialog
          project={mockConfirmedProject}
          open={true}
          onOpenChange={vi.fn()}
        />
      </BrowserRouter>
    );

    const statusTag = screen.getByTestId("deployment-status-tag");
    expect(statusTag).toBeInTheDocument();
    expect(statusTag.textContent).toContain("Confirmada");
  });

  it("exibe a tag de previsão no modal (DeploymentDetailsDialog) quando aberto com projeto não confirmado", () => {
    render(
      <BrowserRouter>
        <DeploymentDetailsDialog
          project={mockPlannedProject}
          open={true}
          onOpenChange={vi.fn()}
        />
      </BrowserRouter>
    );

    const statusTag = screen.getByTestId("deployment-status-tag");
    expect(statusTag).toBeInTheDocument();
    expect(statusTag.textContent).toContain("Prevista");
  });
});
