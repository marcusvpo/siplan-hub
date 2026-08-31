import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectV2 } from "@/types/ProjectV2";

const mocks = vi.hoisted(() => ({
  projects: [] as ProjectV2[],
  mutate: vi.fn(),
  toast: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({
    projects: mocks.projects,
    isLoading: false,
    updateProject: { mutate: mocks.mutate },
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: mocks.hasPermission }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/components/ProjectManagement/ProjectModal", () => ({
  ProjectModal: () => null,
}));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
  Droppable: ({ children }: { children: (provided: unknown, snapshot: unknown) => React.ReactNode }) =>
    children(
      { droppableProps: {}, innerRef: vi.fn(), placeholder: null },
      { isDraggingOver: false },
    ),
  Draggable: ({ children }: { children: (provided: unknown, snapshot: unknown) => React.ReactNode }) =>
    children(
      { draggableProps: {}, dragHandleProps: {}, innerRef: vi.fn() },
      { isDragging: false },
    ),
}));

import ProjectsKanban from "@/pages/ProjectsKanban";

function createProject(
  id: string,
  clientName: string,
  globalStatus: "todo" | "in-progress" | "done" | "blocked",
): ProjectV2 {
  return {
    id,
    clientName,
    ticketNumber: id,
    systemType: "Orion TN",
    globalStatus,
    overallProgress: 35,
    projectLeader: "Bruno",
  } as ProjectV2;
}

describe("Kanban no mobile", () => {
  beforeEach(() => {
    mocks.projects = [
      createProject("101", "Projeto em andamento", "in-progress"),
      createProject("102", "Projeto bloqueado", "blocked"),
    ];
    mocks.mutate.mockReset();
    mocks.toast.mockReset();
    mocks.hasPermission.mockReturnValue(true);
  });

  it("mostra uma única etapa por vez sem depender de rolagem lateral", () => {
    render(<ProjectsKanban />);

    const mobileKanban = screen.getByTestId("mobile-kanban");
    expect(within(mobileKanban).getByText("Projeto em andamento")).toBeInTheDocument();
    expect(within(mobileKanban).queryByText("Projeto bloqueado")).not.toBeInTheDocument();

    fireEvent.click(within(mobileKanban).getByRole("button", { name: /Bloqueado/ }));

    expect(within(mobileKanban).getByText("Projeto bloqueado")).toBeInTheDocument();
    expect(within(mobileKanban).queryByText("Projeto em andamento")).not.toBeInTheDocument();
  });

  it("permite mover o projeto para outra etapa pelo seletor do card", () => {
    render(<ProjectsKanban />);

    fireEvent.change(screen.getByLabelText("Status de Projeto em andamento"), {
      target: { value: "done" },
    });

    expect(mocks.mutate).toHaveBeenCalledWith({
      projectId: "101",
      updates: expect.objectContaining({ globalStatus: "done" }),
    });
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Status Atualizado",
        description: expect.stringContaining("Concluído"),
      }),
    );
  });

  it("usa um estado vazio compacto quando a etapa não possui projetos", () => {
    render(<ProjectsKanban />);

    const mobileKanban = screen.getByTestId("mobile-kanban");
    fireEvent.click(within(mobileKanban).getByRole("button", { name: /Não Iniciado/ }));

    expect(within(mobileKanban).getByText("Nenhum projeto nesta etapa")).toBeInTheDocument();
    expect(within(mobileKanban).getByText("Escolha outra etapa acima para continuar.")).toBeInTheDocument();
  });
});
