import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConversionEngineItem } from "@/hooks/useConversionEngines";
import type { ConversionQueueItem } from "@/hooks/useConversionQueue";
import Conversion from "./Conversion";
import ConversionEngines from "./ConversionEngines";

const mocks = vi.hoisted(() => ({
  useConversionQueue: vi.fn(),
  useConversionEngines: vi.fn(),
  updateEngineStatus: vi.fn(),
}));

vi.mock("@/hooks/useConversionQueue", () => ({
  useConversionQueue: () => mocks.useConversionQueue(),
}));

vi.mock("@/hooks/useConversionEngines", () => ({
  useConversionEngines: () => mocks.useConversionEngines(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    team: "conversion",
    user: {
      id: "user-1",
      email: "analista@siplan.com.br",
      user_metadata: { full_name: "Analista Mobile" },
    },
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("@/hooks/useTeamAreas", () => ({
  useTeamAreas: () => ({ members: [] }),
}));

vi.mock("@/hooks/useConversionIssues", () => ({
  useConversionIssues: () => ({ issues: [] }),
}));

vi.mock("@/components/conversion/ConversionPostDrawer", () => ({
  ConversionPostDrawer: () => null,
}));

vi.mock("@/components/conversion/ConversionIssuesTab", () => ({
  ConversionIssuesTab: () => <div data-testid="mock-conversion-issues" />,
}));

vi.mock("./MyQueueDetailedCard", () => ({
  MyQueueDetailedCard: () => <div data-testid="mock-my-queue-card" />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const createQueueItem = (
  id: string,
  clientName: string,
  queueStatus: string,
): ConversionQueueItem => ({
  id,
  projectId: `project-${id}`,
  clientName,
  ticketNumber: `80${id}`,
  systemType: "Orion TN com identificação extensa",
  legacySystem: "Sistema legado com nome muito comprido",
  sentBy: null,
  sentByName: "Equipe de implantação",
  sentAt: new Date("2026-08-20T12:00:00Z"),
  queueStatus,
  priority: 2,
  assignedTo: queueStatus === "pending" ? null : "user-1",
  assignedToName: queueStatus === "pending" ? null : "Analista Mobile",
  assignedAt: null,
  startedAt: null,
  estimatedCompletion: null,
  completedAt: null,
  notes: null,
  engineStatus: null,
  deploymentDate: "2026-09-15",
  createdAt: new Date("2026-08-20T12:00:00Z"),
  updatedAt: new Date("2026-08-20T12:00:00Z"),
});

const queue = [
  createQueueItem(
    "1",
    "Cartório de Registro de Imóveis com nome muito extenso para o celular",
    "pending",
  ),
  createQueueItem("2", "Projeto em andamento", "in_progress"),
];

const engines: ConversionEngineItem[] = [1, 2, 3, 4].map((index) => ({
  id: `engine-${index}`,
  projectId: `project-${index}`,
  clientName:
    index === 1
      ? "Cartório de Registro de Imóveis e Tabelionato com nome muito extenso"
      : `Cliente do motor ${index}`,
  ticketNumber: `900${index}`,
  systemType: "Orion TN",
  legacySystem: "Sistema legado com identificação extensa",
  engineStatus: index === 1 ? "pending_engine" : "engine_in_development",
  engineRequestedAt: new Date("2026-08-25T12:00:00Z"),
  engineRequestedByName: "Analista Mobile",
  engineNotes: "Observação longa sobre o desenvolvimento que precisa quebrar no celular.",
  queueStatus: "in_progress",
  assignedToName: "Responsável pela conversão",
  priority: 2,
}));

describe("Telas de conversão no mobile", () => {
  beforeEach(() => {
    mocks.updateEngineStatus.mockReset();
    mocks.useConversionQueue.mockReturnValue({
      queue,
      myQueue: [],
      generalQueue: queue,
      homologationQueue: [],
      kpis: {
        totalInQueue: 2,
        pending: 1,
        inProgress: 1,
        completed: 0,
        myQueueCount: 0,
      },
      loading: false,
      assignToMe: vi.fn(),
      transferTo: vi.fn(),
      updateQueueStatus: vi.fn(),
      sendToHomologation: vi.fn(),
      approveHomologation: vi.fn(),
      removeFromQueue: vi.fn(),
      refetch: vi.fn(),
    });
    mocks.useConversionEngines.mockReturnValue({
      engines,
      loading: false,
      kpis: {
        pendingEngine: 1,
        inDevelopment: 3,
        ready: 0,
        total: 4,
      },
      requestEngine: vi.fn(),
      updateEngineStatus: mocks.updateEngineStatus,
      refetch: vi.fn(),
    });
  });

  it("empilha as etapas e cartões de atividades sem rolagem lateral no celular", () => {
    render(<Conversion />);

    expect(screen.getByTestId("conversion-activities-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
      "md:h-screen",
    );
    expect(screen.getByTestId("conversion-activities-page")).toHaveAttribute(
      "data-viewport",
      "mobile",
    );
    expect(screen.getByTestId("conversion-activities-kpis")).toHaveClass(
      "grid-cols-2",
      "lg:grid-cols-5",
    );
    expect(screen.getByTestId("conversion-activities-filters")).toHaveClass(
      "flex-col",
      "sm:flex-row",
    );

    const lanes = screen.getAllByTestId("conversion-kanban-lane");
    expect(lanes).toHaveLength(5);
    lanes.forEach((lane) => {
      expect(lane).toHaveClass("grid-cols-1", "md:overflow-x-auto");
    });

    const cards = screen.getAllByTestId("conversion-queue-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveClass("min-w-0", "overflow-hidden");
    expect(
      screen.getByText(
        "Cartório de Registro de Imóveis com nome muito extenso para o celular",
      ),
    ).toHaveClass("break-words", "md:truncate");
  });

  it("pagina motores em blocos de três e mantém os cartões fluidos", () => {
    render(<ConversionEngines />);

    expect(screen.getByTestId("conversion-engines-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
    );
    expect(screen.getByTestId("conversion-engines-kpis")).toHaveClass(
      "grid-cols-2",
      "lg:grid-cols-4",
    );
    expect(screen.getByTestId("conversion-engines-filters")).toHaveClass(
      "flex-col",
      "sm:flex-row",
    );
    expect(screen.getAllByTestId("conversion-engine-card")).toHaveLength(3);
    expect(screen.getByLabelText("Motores por página")).toHaveTextContent("3");
    expect(screen.getByTestId("conversion-engines-pagination")).toHaveTextContent(
      "Mostrando 1–3 de 4",
    );
    expect(screen.getAllByTestId("conversion-engine-name")[0]).toHaveClass(
      "break-words",
    );
    expect(screen.getAllByTestId("conversion-engine-metadata")[0]).toHaveClass(
      "grid-cols-1",
      "sm:grid-cols-2",
    );

    fireEvent.click(screen.getByRole("button", { name: "Próxima página de motores" }));

    expect(screen.getAllByTestId("conversion-engine-card")).toHaveLength(1);
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("abre a atualização do motor em um modal seguro para o viewport", () => {
    render(<ConversionEngines />);

    fireEvent.click(screen.getAllByRole("button", { name: "Atualizar" })[0]);

    const dialog = screen.getByTestId("conversion-engine-dialog");
    expect(dialog).toHaveClass(
      "max-h-[calc(100dvh-1rem)]",
      "w-[calc(100vw-1rem)]",
      "min-w-0",
      "overflow-hidden",
    );
    expect(within(dialog).getByLabelText("Observações")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
    expect(within(dialog).getByRole("button", { name: "Salvar" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
  });
});
