import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyDayBoardPage from "./MyDayBoard";

const useMyDayBoardMock = vi.hoisted(() => vi.fn());
const useMyDayBoardInboxMock = vi.hoisted(() => vi.fn());
const useIsMobileMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useMyDayBoard", () => ({
  useMyDayBoard: useMyDayBoardMock,
}));

vi.mock("@/hooks/useMyDayBoardInbox", () => ({
  useMyDayBoardInbox: useMyDayBoardInboxMock,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: useIsMobileMock,
}));

function buildWorkspace(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-09-17T12:00:00");
  return {
    boards: [{
      id: "board-1",
      name: "Planejamento pessoal",
      description: null,
      color: "#e11d48",
      isDefault: true,
      position: 1024,
      createdAt: now,
      updatedAt: now,
    }],
    columns: [
      { id: "ideas", boardId: "board-1", title: "Ideias", color: "#64748b", position: 1024, createdAt: now, updatedAt: now },
      { id: "doing", boardId: "board-1", title: "Em andamento", color: "#f59e0b", position: 2048, createdAt: now, updatedAt: now },
    ],
    cards: [{
      id: "card-1",
      boardId: "board-1",
      columnId: "ideas",
      title: "Preparar apresentação",
      description: "Reunir os tópicos",
      priority: "high",
      dueAt: now,
      labels: ["reunião"],
      checklist: [{ id: "check-1", text: "Criar roteiro", done: true }],
      linkedPath: null,
      position: 1024,
      archivedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }],
    permissions: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    createBoard: vi.fn().mockResolvedValue("board-2"),
    updateBoard: vi.fn().mockResolvedValue(undefined),
    setDefaultBoard: vi.fn().mockResolvedValue(undefined),
    deleteBoard: vi.fn().mockResolvedValue(undefined),
    createColumn: vi.fn().mockResolvedValue(undefined),
    updateColumn: vi.fn().mockResolvedValue(undefined),
    reorderColumns: vi.fn().mockResolvedValue(undefined),
    deleteColumn: vi.fn().mockResolvedValue(undefined),
    createCard: vi.fn().mockResolvedValue(undefined),
    updateCard: vi.fn().mockResolvedValue(undefined),
    moveCard: vi.fn().mockResolvedValue(undefined),
    archiveCard: vi.fn().mockResolvedValue(undefined),
    restoreCard: vi.fn().mockResolvedValue(undefined),
    deleteCard: vi.fn().mockResolvedValue(undefined),
    calculateCardPosition: vi.fn().mockReturnValue(1536),
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderPage(path = "/meu-dia/quadro") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MyDayBoardPage />
    </MemoryRouter>,
  );
}

describe("Meu Quadro", () => {
  beforeEach(() => {
    useMyDayBoardMock.mockReset();
    useMyDayBoardInboxMock.mockReset();
    useIsMobileMock.mockReset();
    useMyDayBoardMock.mockReturnValue(buildWorkspace());
    useMyDayBoardInboxMock.mockReturnValue({
      items: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    useIsMobileMock.mockReturnValue(false);
  });

  it("renderiza o Kanban responsivo sem depender de rolagem horizontal", () => {
    useIsMobileMock.mockReturnValue(true);
    renderPage();

    expect(screen.getByRole("heading", { name: "Meu Quadro" })).toBeInTheDocument();
    expect(screen.getByTestId("my-day-board-page")).toHaveClass("overflow-x-hidden");
    const mobile = screen.getByTestId("my-day-board-mobile");
    const ideasButton = within(mobile).getByRole("button", { name: /Ideias/ });
    expect(ideasButton).toHaveClass("min-h-11");
    fireEvent.click(ideasButton);
    expect(screen.getAllByText("Preparar apresentação").length).toBeGreaterThan(0);
  });

  it("expõe um manipulador próprio para arrastar cartões", () => {
    renderPage();

    expect(screen.getByLabelText("Arrastar Preparar apresentação")).toBeInTheDocument();
  });

  it("mostra compromissos da agenda e permite convertê-los em cartão", async () => {
    const createCard = vi.fn().mockResolvedValue(undefined);
    useMyDayBoardMock.mockReturnValue(buildWorkspace({ createCard }));
    useMyDayBoardInboxMock.mockReturnValue({
      items: [{
        id: "agenda-cs_cx-appointment-1",
        source: "cs_cx",
        sourceId: "appointment-1",
        sourceLabel: "CS/CX",
        title: "Reunião de acompanhamento",
        context: "Cartório Central",
        description: "Cartório Central",
        dueAt: new Date("2026-09-18T14:00:00"),
        priority: "medium",
        path: "/cs-cx/agendamentos",
        allDay: false,
        isOverdue: false,
      }],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    renderPage();

    expect(screen.getByText("Entrada da agenda")).toBeInTheDocument();
    expect(screen.getByLabelText("Arrastar Reunião de acompanhamento da agenda")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar em Ideias" }));

    await waitFor(() => {
      expect(createCard).toHaveBeenCalledWith(expect.objectContaining({
        boardId: "board-1",
        columnId: "ideas",
        title: "Reunião de acompanhamento",
        linkedPath: expect.stringContaining("myDaySource=cs_cx%3Aappointment-1"),
      }));
    });
  });

  it("cria um cartão na coluna selecionada", async () => {
    const createCard = vi.fn().mockResolvedValue(undefined);
    useMyDayBoardMock.mockReturnValue(buildWorkspace({ createCard }));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar cartão em Ideias" }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Nova ideia" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar cartão" }));

    await waitFor(() => {
      expect(createCard).toHaveBeenCalledWith(expect.objectContaining({
        boardId: "board-1",
        columnId: "ideas",
        title: "Nova ideia",
      }));
    });
  });

  it("abre diretamente um cartão informado na URL", () => {
    renderPage("/meu-dia/quadro?board=board-1&card=card-1");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Preparar apresentação")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Reunir os tópicos")).toBeInTheDocument();
  });

  it("permite restaurar um cartão arquivado", async () => {
    const restoreCard = vi.fn().mockResolvedValue(undefined);
    const archivedAt = new Date("2026-09-17T13:00:00");
    const workspace = buildWorkspace({ restoreCard });
    useMyDayBoardMock.mockReturnValue({
      ...workspace,
      cards: workspace.cards.map((card) => ({ ...card, archivedAt })),
    });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Arquivados/ }));
    fireEvent.click(screen.getByRole("button", { name: /Preparar apresentação/ }));
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() => expect(restoreCard).toHaveBeenCalledWith("card-1"));
  });

  it("oferece a criação do primeiro quadro no estado vazio", () => {
    useMyDayBoardMock.mockReturnValue(buildWorkspace({ boards: [], columns: [], cards: [] }));
    renderPage();

    expect(screen.getByText("Crie seu primeiro quadro")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar Meu Quadro" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Criar Meu Quadro" })).toBeInTheDocument();
  });
});
