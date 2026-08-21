import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PosChatHistorySidebar } from "@/components/pos-chat/PosChatHistorySidebar";

const defaultProps = {
  sessions: [],
  currentSessionId: "session-1",
  onSelectSession: vi.fn(),
  onNewSession: vi.fn(),
  onOpen: vi.fn(),
  onClose: vi.fn(),
  onRenameSession: vi.fn().mockResolvedValue(true),
  onDeleteSession: vi.fn().mockResolvedValue(true),
  onExportSession: vi.fn().mockResolvedValue(true),
  cartorioName: "Cartório Central",
};

const session = {
  session_id: "session-1",
  title: "Consulta de protocolos",
  first_message: "Como consultar protocolos?",
  last_message: "Abra o menu de protocolos.",
  total_messages: 2,
  user_messages: 1,
  started_at: "2026-08-21T10:00:00.000Z",
  last_message_at: "2026-08-21T10:01:00.000Z",
  helpful_count: 0,
  unhelpful_count: 0,
};

describe("barra de histórico do chat pós-implantação", () => {
  it("exibe somente o controle interno para recolher quando aberta", () => {
    render(<PosChatHistorySidebar {...defaultProps} isOpen />);

    expect(
      screen.getByRole("button", { name: "Ocultar histórico" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Exibir histórico de conversas" }),
    ).not.toBeInTheDocument();
  });

  it("mantém um rail compacto com ações ao ser recolhida", () => {
    const onOpen = vi.fn();
    const onNewSession = vi.fn();

    render(
      <PosChatHistorySidebar
        {...defaultProps}
        isOpen={false}
        onOpen={onOpen}
        onNewSession={onNewSession}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Exibir histórico de conversas" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Iniciar nova conversa" }),
    );

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onNewSession).toHaveBeenCalledOnce();
  });

  it("renomeia uma conversa pelo menu de ações", async () => {
    const onRenameSession = vi.fn().mockResolvedValue(true);
    render(
      <PosChatHistorySidebar
        {...defaultProps}
        isOpen
        sessions={[session]}
        onRenameSession={onRenameSession}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Ações da conversa Consulta de protocolos" }),
      { key: "Enter", code: "Enter" },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Renomear" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Título da conversa" }), {
      target: { value: "Protocolos em aberto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(onRenameSession).toHaveBeenCalledWith("session-1", "Protocolos em aberto");
    });
  });

  it("exporta e exclui uma conversa somente após confirmação", async () => {
    const onExportSession = vi.fn().mockResolvedValue(true);
    const onDeleteSession = vi.fn().mockResolvedValue(true);
    render(
      <PosChatHistorySidebar
        {...defaultProps}
        isOpen
        sessions={[session]}
        onExportSession={onExportSession}
        onDeleteSession={onDeleteSession}
      />,
    );

    const actions = screen.getByRole("button", {
      name: "Ações da conversa Consulta de protocolos",
    });
    fireEvent.keyDown(actions, { key: "Enter", code: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Exportar .txt" }));
    expect(onExportSession).toHaveBeenCalledWith("session-1");

    fireEvent.keyDown(actions, { key: "Enter", code: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Excluir" }));
    expect(onDeleteSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Excluir conversa" }));
    await waitFor(() => {
      expect(onDeleteSession).toHaveBeenCalledWith("session-1");
    });
  });
});
