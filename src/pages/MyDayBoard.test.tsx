import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyDayBoardPage from "./MyDayBoard";

const useMyDayBoardMock = vi.hoisted(() => vi.fn());
const useMyDayBoardInboxMock = vi.hoisted(() => vi.fn());
const useIsMobileMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const dragDropState = vi.hoisted(() => ({
  handler: null as null | ((result: unknown) => void),
}));

vi.mock("@hello-pangea/dnd", async () => {
  const React = await import("react");
  return {
    DragDropContext: ({ children, onDragEnd }: {
      children: React.ReactNode;
      onDragEnd: (result: unknown) => void;
    }) => {
      dragDropState.handler = onDragEnd;
      return React.createElement(React.Fragment, null, children);
    },
    Draggable: ({ children, draggableId }: {
      draggableId: string;
      children: (provided: {
        innerRef: () => void;
        draggableProps: Record<string, unknown>;
        dragHandleProps: Record<string, unknown>;
      }, snapshot: { isDragging: boolean }) => React.ReactNode;
    }) => children({
      innerRef: () => undefined,
      draggableProps: {},
      dragHandleProps: { "data-drag-id": draggableId },
    }, { isDragging: false }),
    Droppable: ({ children }: {
      children: (provided: {
        innerRef: () => void;
        droppableProps: Record<string, unknown>;
        placeholder: null;
      }, snapshot: { isDraggingOver: boolean }) => React.ReactNode;
    }) => children({
      innerRef: () => undefined,
      droppableProps: {},
      placeholder: null,
    }, { isDraggingOver: false }),
  };
});

vi.mock("@/hooks/useMyDayBoard", () => ({
  useMyDayBoard: useMyDayBoardMock,
}));

vi.mock("@/hooks/useMyDayBoardInbox", () => ({
  useMyDayBoardInbox: useMyDayBoardInboxMock,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: useIsMobileMock,
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock },
}));

function buildWorkspace(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-09-17T12:00:00");
  return {
    userId: "user-1",
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
      { id: "ideas", boardId: "board-1", title: "Ideias", color: "#64748b", isCompletion: false, position: 1024, createdAt: now, updatedAt: now },
      { id: "doing", boardId: "board-1", title: "Em andamento", color: "#f59e0b", isCompletion: false, position: 2048, createdAt: now, updatedAt: now },
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
    syncLinkedCards: vi.fn().mockResolvedValue(undefined),
    archiveCard: vi.fn().mockResolvedValue(undefined),
    restoreCard: vi.fn().mockResolvedValue(undefined),
    deleteCard: vi.fn().mockResolvedValue(undefined),
    calculateCardPosition: vi.fn().mockReturnValue(1536),
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    isSyncingLinkedCards: false,
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
    window.localStorage.clear();
    useMyDayBoardMock.mockReset();
    useMyDayBoardInboxMock.mockReset();
    useIsMobileMock.mockReset();
    useMyDayBoardMock.mockReturnValue(buildWorkspace());
    useMyDayBoardInboxMock.mockReturnValue({
      items: [],
      sourceItems: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    useIsMobileMock.mockReturnValue(false);
    dragDropState.handler = null;
    toastSuccessMock.mockReset();
  });

  it("mantém o fluxo mobile em uma coluna sem rolagem horizontal na página", () => {
    useIsMobileMock.mockReturnValue(true);
    renderPage();

    expect(screen.getByRole("heading", { name: "Meu Quadro" })).toBeInTheDocument();
    expect(screen.getByTestId("my-day-board-page")).toHaveClass("overflow-x-hidden");
    const mobile = screen.getByTestId("my-day-board-mobile");
    const ideasButton = within(mobile).getByRole("button", { name: /Ideias/ });
    expect(ideasButton).toHaveClass("min-h-11");
    fireEvent.click(ideasButton);
    expect(screen.getAllByText("Preparar apresentação").length).toBeGreaterThan(0);
    expect(screen.queryByRole("group", { name: "Controles de visualização do quadro" })).not.toBeInTheDocument();
  });

  it("mantém todas as colunas do desktop em uma faixa horizontal estilo Trello", () => {
    renderPage();

    expect(screen.getByTestId("my-day-board-hero")).toHaveClass("p-2.5", "sm:p-3");
    expect(screen.getByRole("heading", { name: "Meu Quadro" })).toHaveClass("text-lg", "sm:text-xl");
    const board = screen.getByTestId("my-day-board-desktop");
    expect(board).toHaveClass("flex", "overflow-x-auto");
    expect(board).toHaveClass("[scrollbar-width:none]", "[&::-webkit-scrollbar]:hidden");
    expect(board).toHaveClass("bg-[size:24px_24px]", "rounded-xl");
    expect(board).not.toHaveClass("grid");
    expect(within(board).getByText("Entrada da agenda").closest("section")).toHaveClass("shrink-0");
    expect(within(board).getByText("Ideias").closest("section")).toHaveClass("shrink-0");
    expect(screen.getByTestId("my-day-board-page")).toHaveClass("overflow-x-hidden");
  });

  it("ajusta e restaura o zoom pelo controle fixo do quadro", () => {
    renderPage();

    const layer = screen.getByTestId("my-day-board-zoom-layer");
    const controls = screen.getByRole("group", { name: "Controles de visualização do quadro" });
    const zoomIn = within(controls).getByRole("button", { name: "Aumentar zoom do quadro" });
    const zoomOut = within(controls).getByRole("button", { name: "Diminuir zoom do quadro" });

    expect(layer.style.zoom).toBe("1");
    fireEvent.click(zoomIn);
    expect(layer.style.zoom).toBe("1.1");
    expect(within(controls).getByText("110%")).toBeInTheDocument();

    fireEvent.click(within(controls).getByRole("button", { name: /Restaurar zoom para 100%/ }));
    expect(layer.style.zoom).toBe("1");
    expect(within(controls).getByText("100%")).toBeInTheDocument();

    fireEvent.click(zoomOut);
    expect(layer.style.zoom).toBe("0.9");
  });

  it("ajusta automaticamente o quadro à largura disponível", () => {
    renderPage();

    const board = screen.getByTestId("my-day-board-desktop");
    Object.defineProperty(board, "clientWidth", { configurable: true, value: 600 });
    fireEvent.click(screen.getByRole("button", { name: "Ajustar quadro à tela" }));

    expect(screen.getByTestId("my-day-board-zoom-layer").style.zoom).toBe("0.6");
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("busca cartões e alterna a densidade sem perder o restante do quadro", () => {
    renderPage();

    expect(screen.getByText("Reunir os tópicos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confortável" }));
    expect(screen.queryByText("Reunir os tópicos")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compacto" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar cartões no quadro" }), { target: { value: "não existe" } });
    expect(screen.queryByText("Preparar apresentação")).not.toBeInTheDocument();
    expect(screen.getByText("0 de 1 cartões visíveis")).toBeInTheDocument();
    expect(screen.getByText("Arraste pausado enquanto houver filtros.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.getByText("Preparar apresentação")).toBeInTheDocument();
  });

  it("cria cartão rapidamente sem abrir o modal", async () => {
    const createCard = vi.fn().mockResolvedValue(undefined);
    useMyDayBoardMock.mockReturnValue(buildWorkspace({ createCard }));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar cartão rápido em Ideias" }));
    const titleInput = screen.getByRole("textbox", { name: "Título do novo cartão em Ideias" });
    fireEvent.change(titleInput, { target: { value: "Revisar documentação" } });
    fireEvent.click(within(titleInput.closest("form")!).getByRole("button", { name: "Adicionar" }));

    await waitFor(() => expect(createCard).toHaveBeenCalledWith({
      boardId: "board-1",
      columnId: "ideas",
      title: "Revisar documentação",
      priority: "medium",
      labels: [],
      checklist: [],
    }));
  });

  it("recolhe colunas e persiste a visualização por usuário e quadro", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Recolher coluna Ideias" }));
    expect(screen.getByRole("button", { name: "Expandir coluna Ideias" })).toBeInTheDocument();

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("siplan:my-day-board:view:user-1:board-1") ?? "{}") as { collapsedColumnIds?: string[] };
      expect(saved.collapsedColumnIds).toContain("ideas");
    });
  });

  it("restaura zoom, posição, densidade, minimapa e colunas recolhidas", async () => {
    window.localStorage.setItem("siplan:my-day-board:view:user-1:board-1", JSON.stringify({
      zoom: 80,
      scrollLeft: 128,
      density: "compact",
      collapsedColumnIds: ["ideas"],
      minimapOpen: true,
    }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("my-day-board-zoom-layer").style.zoom).toBe("0.8");
      expect(screen.getByRole("button", { name: "Expandir coluna Ideias" })).toBeInTheDocument();
      expect(screen.getByTestId("my-day-board-minimap")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Compacto" })).toBeInTheDocument();
      expect(screen.getByTestId("my-day-board-desktop").scrollLeft).toBe(128);
    });
  });

  it("abre o minimapa e navega até uma coluna", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar minimapa do quadro" }));
    const minimap = screen.getByTestId("my-day-board-minimap");
    const ideasColumn = screen.getByRole("button", { name: "Recolher coluna Ideias" }).closest("section")!;
    const scrollIntoView = vi.fn();
    Object.defineProperty(ideasColumn, "scrollIntoView", { configurable: true, value: scrollIntoView });
    fireEvent.click(within(minimap).getByTitle("Ideias"));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest", inline: "center" });
    expect(screen.getByRole("button", { name: "Ocultar minimapa do quadro" })).toHaveAttribute("aria-pressed", "true");
  });

  it("navega horizontalmente por toda a área livre sem interferir nos controles ou no drag dos cartões", () => {
    renderPage();

    const board = screen.getByTestId("my-day-board-desktop");
    Object.defineProperty(board, "scrollLeft", { configurable: true, writable: true, value: 120 });
    Object.defineProperty(board, "setPointerCapture", { configurable: true, value: vi.fn() });
    Object.defineProperty(board, "hasPointerCapture", { configurable: true, value: vi.fn(() => true) });
    Object.defineProperty(board, "releasePointerCapture", { configurable: true, value: vi.fn() });

    const pointerDown = createEvent.pointerDown(board);
    Object.defineProperties(pointerDown, {
      button: { value: 0 },
      pointerId: { value: 7 },
      clientX: { value: 500 },
    });
    fireEvent(board, pointerDown);
    expect(board).toHaveClass("cursor-grabbing");
    const pointerMove = createEvent.pointerMove(board);
    Object.defineProperties(pointerMove, {
      pointerId: { value: 7 },
      clientX: { value: 300 },
    });
    fireEvent(board, pointerMove);
    expect(board.scrollLeft).toBe(320);
    const pointerUp = createEvent.pointerUp(board);
    Object.defineProperties(pointerUp, {
      pointerId: { value: 7 },
      clientX: { value: 300 },
    });
    fireEvent(board, pointerUp);
    expect(board).toHaveClass("cursor-grab");

    const cardButton = screen.getByText("Preparar apresentação").closest("button");
    expect(cardButton).not.toBeNull();
    const interactivePointerDown = createEvent.pointerDown(cardButton!);
    Object.defineProperties(interactivePointerDown, {
      button: { value: 0 },
      pointerId: { value: 8 },
      clientX: { value: 400 },
    });
    fireEvent(cardButton!, interactivePointerDown);
    expect(board).toHaveClass("cursor-grab");
    expect(board.scrollLeft).toBe(320);
    expect(screen.getByLabelText("Arrastar Preparar apresentação")).toBeInTheDocument();
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
      sourceItems: [],
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

  it("move cartões entre colunas pelo fluxo real de drag and drop", async () => {
    const moveCard = vi.fn().mockResolvedValue(undefined);
    const calculateCardPosition = vi.fn().mockReturnValue(1536);
    useMyDayBoardMock.mockReturnValue(buildWorkspace({ moveCard, calculateCardPosition }));
    renderPage();

    act(() => {
      dragDropState.handler?.({
        draggableId: "board-card:card-1",
        source: { droppableId: "desktop-column:ideas", index: 0 },
        destination: { droppableId: "desktop-column:doing", index: 0 },
      });
    });

    await waitFor(() => {
      expect(calculateCardPosition).toHaveBeenCalledWith("doing", 0, "card-1");
      expect(moveCard).toHaveBeenCalledWith({
        cardId: "card-1",
        columnId: "doing",
        position: 1536,
      });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("Cartão movido para Em andamento.", expect.objectContaining({
      action: expect.objectContaining({ label: "Desfazer" }),
    }));
    const toastOptions = toastSuccessMock.mock.calls[0][1] as { action: { onClick: () => void } };
    await act(async () => {
      toastOptions.action.onClick();
    });
    await waitFor(() => expect(moveCard).toHaveBeenLastCalledWith({
      cardId: "card-1",
      columnId: "ideas",
      position: 1024,
    }));
  });

  it("aceita soltar um compromisso da agenda sobre uma coluna no mobile", async () => {
    const createCard = vi.fn().mockResolvedValue(undefined);
    const agendaItem = {
      id: "agenda-personal-task-1",
      source: "personal" as const,
      sourceId: "task-1",
      sourceLabel: "Pessoal",
      title: "Revisar pauta",
      context: "Minha agenda",
      description: null,
      dueAt: new Date("2026-09-18T10:00:00"),
      priority: "high" as const,
      path: "/meu-dia",
      allDay: false,
      isOverdue: false,
    };
    useIsMobileMock.mockReturnValue(true);
    useMyDayBoardMock.mockReturnValue(buildWorkspace({ createCard }));
    useMyDayBoardInboxMock.mockReturnValue({
      items: [agendaItem],
      sourceItems: [agendaItem],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    renderPage();

    act(() => {
      dragDropState.handler?.({
        draggableId: "agenda-item:agenda-personal-task-1",
        source: { droppableId: "agenda-inbox", index: 0 },
        destination: { droppableId: "mobile-target:doing", index: 0 },
      });
    });

    await waitFor(() => expect(createCard).toHaveBeenCalledWith(expect.objectContaining({
      boardId: "board-1",
      columnId: "doing",
      title: "Revisar pauta",
    })));
  });

  it("sincroniza automaticamente um cartão já vinculado à agenda", async () => {
    const syncLinkedCards = vi.fn().mockResolvedValue(undefined);
    const workspace = buildWorkspace({ syncLinkedCards });
    useMyDayBoardMock.mockReturnValue({
      ...workspace,
      cards: workspace.cards.map((card) => ({
        ...card,
        title: "Título antigo",
        dueAt: new Date("2026-09-17T09:00:00"),
        priority: "medium",
        linkedPath: "/meu-dia?myDaySource=personal%3Atask-1",
      })),
    });
    useMyDayBoardInboxMock.mockReturnValue({
      items: [],
      sourceItems: [{
        id: "agenda-personal-task-1",
        source: "personal",
        sourceId: "task-1",
        sourceLabel: "Pessoal",
        title: "Título atualizado",
        context: "Minha agenda",
        description: "Descrição da origem",
        dueAt: new Date("2026-09-18T10:00:00"),
        priority: "high",
        path: "/meu-dia",
        allDay: false,
        isOverdue: false,
      }],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    renderPage();

    await waitFor(() => expect(syncLinkedCards).toHaveBeenCalledWith([{
      id: "card-1",
      title: "Título atualizado",
      priority: "high",
      dueAt: new Date("2026-09-18T10:00:00"),
    }]));
    expect(screen.getByText("Vinculado à agenda")).toBeInTheDocument();
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
