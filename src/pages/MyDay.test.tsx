import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FolderKanban } from "lucide-react";
import type { ReactNode } from "react";
import MyDay from "./MyDay";

const useMyDayMock = vi.hoisted(() => vi.fn());
const useMyDayWorkspaceMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useMyDay", () => ({
  useMyDay: useMyDayMock,
}));

vi.mock("@/hooks/useMyDayWorkspace", () => ({
  useMyDayWorkspace: useMyDayWorkspaceMock,
}));

vi.mock("recharts", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    userId: "user-1",
    ResponsiveContainer: Container,
    PieChart: Container,
    Pie: Container,
    Cell: () => null,
    BarChart: Container,
    Bar: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

function buildData(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Bruno Fernandes",
    team: "Implantação",
    isAdmin: false,
    myProjects: [
      {
        id: "project-1",
        clientName: "Cartório Central",
        ticketNumber: "12345",
        systemType: "Orion",
        overallProgress: 55,
        globalStatus: "in_progress",
        healthScore: "warning",
        lastUpdatedAt: new Date("2026-09-15T12:00:00"),
        nextStage: {
          key: "conversion",
          label: "Conversão",
          status: "in_progress",
          endDate: new Date("2026-09-20T12:00:00"),
        },
        isOverdue: false,
        isStale: false,
        tone: "warning",
        attentionLabel: "Em atenção",
      },
    ],
    portfolioProjects: [],
    issues: [
      {
        id: "issue-1",
        projectId: "project-1",
        clientName: "Cartório Central",
        ticketNumber: "12345",
        title: "Validar carga final",
        priority: "high",
        status: "open",
        updatedAt: new Date("2026-09-16T10:00:00"),
      },
    ],
    appointments: [
      {
        id: "appointment-1",
        title: "Reunião de acompanhamento",
        startsAt: new Date(),
        status: "AGENDADO",
        appointmentType: "ACOMPANHAMENTO",
        location: "Teams",
        officeName: "Cartório Central",
        isOverdue: false,
      },
    ],
    digest: null,
    hasCopilotAccess: false,
    availableShortcuts: [
      {
        label: "Projetos",
        description: "Lista de projetos",
        path: "/projects",
        group: "Implantação",
        icon: FolderKanban,
      },
    ],
    defaultQuickLinkPaths: ["/projects"],
    permissions: {
      canViewProjects: true,
      canOpenProjectDetails: true,
      projectOverviewPath: "/projects",
      canViewConversion: true,
      canViewAppointments: true,
      canViewCalendar: true,
      canRegisterHours: false,
    },
    isLoading: false,
    loading: {
      projects: false,
      conversion: false,
      appointments: false,
      copilot: false,
    },
    error: null,
    errors: {
      projects: null,
      conversion: null,
      appointments: null,
      copilot: null,
    },
    refreshers: {
      projects: vi.fn().mockResolvedValue(undefined),
      conversion: vi.fn().mockResolvedValue(undefined),
      appointments: vi.fn().mockResolvedValue(undefined),
      copilot: vi.fn().mockResolvedValue(undefined),
    },
    refresh: vi.fn().mockResolvedValue(undefined),
    isRefreshing: false,
    ...overrides,
  };
}

function buildWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    tasks: [],
    preferences: {
      density: "compact",
      widgetOrder: ["priorities", "projects", "insights", "agenda", "conversion", "shortcuts", "copilot"],
      hiddenWidgets: [],
      widgetLayout: {
        priorities: "full",
        projects: "full",
        insights: "half",
        agenda: "half",
        conversion: "full",
        shortcuts: "full",
        copilot: "full",
      },
      quickLinks: null,
      notificationsEnabled: false,
    },
    permissions: {
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canPersonalize: true,
    },
    createTask: vi.fn().mockResolvedValue(undefined),
    updateTask: vi.fn().mockResolvedValue(undefined),
    setTaskStatus: vi.fn().mockResolvedValue(undefined),
    snoozeTask: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    savePreferences: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    loading: { tasks: false, preferences: false },
    isSavingTask: false,
    isSavingPreferences: false,
    error: null,
    errors: { tasks: null, preferences: null },
    isRefreshing: false,
    refreshTasks: vi.fn().mockResolvedValue(undefined),
    refreshPreferences: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyDay />
    </MemoryRouter>,
  );
}

describe("Central de Trabalho / Meu Dia", () => {
  beforeEach(() => {
    useMyDayMock.mockReset();
    useMyDayWorkspaceMock.mockReset();
    useMyDayWorkspaceMock.mockReturnValue(buildWorkspace());
  });

  it("reúne prioridades, pendências, agenda e atalhos permitidos", () => {
    useMyDayMock.mockReturnValue(buildData());

    renderPage();

    expect(screen.getByRole("heading", { name: /Bruno!/ })).toBeInTheDocument();
    expect(screen.getByText("Fila de prioridades")).toBeInTheDocument();
    expect(screen.getByText("Cartório Central", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getAllByText("Validar carga final").length).toBeGreaterThan(0);
    expect(screen.getByText("Reunião de acompanhamento")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Projetos/ })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByTestId("my-day-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
      "pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
    );
  });

  it("mostra estados vazios sem esconder os acessos rápidos", () => {
    useMyDayMock.mockReturnValue(
      buildData({ myProjects: [], issues: [], appointments: [] }),
    );

    renderPage();

    expect(screen.getByText(/Nenhum projeto encontrado para este filtro/)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma pendência de conversão/)).toBeInTheDocument();
    expect(screen.getByText(/Agenda livre para este filtro/)).toBeInTheDocument();
    expect(screen.getByText("Acessos rápidos")).toBeInTheDocument();
  });

  it("permite ao administrador alternar para a visão do portfólio", () => {
    useMyDayMock.mockReturnValue(
      buildData({
        isAdmin: true,
        portfolioProjects: [
          {
            ...buildData().myProjects[0],
            id: "project-2",
            clientName: "Cartório do Portfólio",
          },
        ],
      }),
    );

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Portfólio" }));

    expect(screen.getByText("Cartório do Portfólio", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText("Prioridades do portfólio")).toBeInTheDocument();
  });

  it("isola carregamento e falha no bloco afetado", () => {
    useMyDayMock.mockReturnValue(buildData({ loading: { projects: true, conversion: false, appointments: false, copilot: false }, myProjects: [] }));
    const { rerender } = renderPage();

    expect(screen.getAllByLabelText("Carregando projetos").length).toBeGreaterThan(0);
    expect(screen.getByText("Acessos rápidos")).toBeInTheDocument();

    useMyDayMock.mockReturnValue(buildData({ errors: { projects: new Error("falha"), conversion: null, appointments: null, copilot: null } }));
    rerender(
      <MemoryRouter>
        <MyDay />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Não foi possível carregar os projetos/).length).toBeGreaterThan(0);
    expect(screen.getByText("Minha agenda")).toBeInTheDocument();
  });

  it("transforma os indicadores em filtros e abre a personalização", () => {
    useMyDayMock.mockReturnValue(buildData());

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Prioridades críticas/ }));

    expect(screen.getByText("Filtros ativos:")).toBeInTheDocument();
    expect(screen.getAllByText("Prioridades críticas").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: /Personalizar/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Personalizar Meu Dia")).toBeInTheDocument();
  });

  it("permite escolher a largura dos blocos e persiste a composição", async () => {
    const savePreferences = vi.fn().mockResolvedValue(undefined);
    useMyDayMock.mockReturnValue(buildData());
    useMyDayWorkspaceMock.mockReturnValue(buildWorkspace({ savePreferences }));

    const { container } = renderPage();
    expect(container.querySelector('[data-widget-id="projects"]')).toHaveAttribute(
      "data-widget-width",
      "full",
    );
    expect(container.querySelector('[data-widget-id="agenda"]')).toHaveAttribute(
      "data-widget-width",
      "half",
    );

    fireEvent.click(screen.getByRole("button", { name: /Personalizar/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Usar Minha agenda em largura inteira" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar personalização" }));

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetLayout: expect.objectContaining({ agenda: "full" }),
        }),
      );
    });
  });

  it("permite lançar uma tarefa pessoal pela agenda", async () => {
    const createTask = vi.fn().mockResolvedValue(undefined);
    useMyDayMock.mockReturnValue(buildData());
    useMyDayWorkspaceMock.mockReturnValue(buildWorkspace({ createTask }));

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Nova tarefa/ }));
    fireEvent.change(screen.getByLabelText("O que precisa ser feito?"), {
      target: { value: "Revisar retorno do cartório" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar tarefa" }));

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Revisar retorno do cartório",
          priority: "medium",
          recurrence: "none",
        }),
      );
    });
  });

  it("expande e filtra a agenda, exibindo recorrência e lembrete", () => {
    const tasks = Array.from({ length: 9 }, (_, index) => ({
      id: `task-${index + 1}`,
      title: `Tarefa ${index + 1}`,
      description: null,
      dueAt: new Date(Date.now() + (index + 1) * 60 * 60_000),
      priority: "medium",
      status: "pending",
      linkedPath: null,
      recurrence: index === 0 ? "weekly" : "none",
      reminderMinutes: index === 0 ? 15 : null,
      snoozedUntil: null,
      recurrenceParentId: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    useMyDayMock.mockReturnValue(buildData());
    useMyDayWorkspaceMock.mockReturnValue(buildWorkspace({ tasks }));

    renderPage();

    expect(screen.getByText("Recorrente")).toBeInTheDocument();
    expect(screen.getByText("Lembrete")).toBeInTheDocument();
    expect(screen.queryByText("Tarefa 9")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver toda agenda/ }));
    expect(screen.getByText("Tarefa 9")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Atrasadas" }));
    expect(screen.getByText(/Agenda livre para este filtro/)).toBeInTheDocument();
  });

  it("aplica um modelo de personalização antes de salvar", async () => {
    const savePreferences = vi.fn().mockResolvedValue(undefined);
    useMyDayMock.mockReturnValue(buildData());
    useMyDayWorkspaceMock.mockReturnValue(buildWorkspace({ savePreferences }));

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Personalizar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Foco na agenda/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar personalização" }));

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetOrder: expect.arrayContaining(["agenda", "priorities"]),
          widgetLayout: expect.objectContaining({ agenda: "full", priorities: "full" }),
        }),
      );
      expect(savePreferences.mock.calls[0][0].widgetOrder[0]).toBe("agenda");
    });
  });
});
