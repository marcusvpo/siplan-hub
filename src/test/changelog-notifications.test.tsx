import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { NotificationBell } from "@/components/NotificationBell";
import type { Notification } from "@/types/conversion";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
    team: "conversion",
  }),
}));

const mockDeleteNotification = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockRefetch = vi.fn();

const mockNotificationsList: Notification[] = [
  {
    id: "notif-1",
    type: "release_feature",
    title: "Nova Tela no CS/CX",
    message: "Lançamento da tela de gestão de relatórios de CS/CX.",
    actionUrl: "/cs-cx/relatorios",
    read: false,
    createdAt: new Date(),
    permissionResource: "menu_cs_cx",
    category: "changelog",
  },
  {
    id: "notif-2",
    type: "new_demand",
    title: "Nova demanda de conversão",
    message: "Demandas adicionadas para o projeto Cartório 01.",
    read: false,
    createdAt: new Date(),
    category: "operational",
  },
];

let mockNotifications = mockNotificationsList;
let mockLoading = false;
let mockError: string | null = null;

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: mockNotifications.filter(notification => !notification.read).length,
    loading: mockLoading,
    error: mockError,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
    refetch: mockRefetch,
  }),
}));

describe("Central de Novidades & Notificações (Changelog)", () => {
  beforeAll(() => {
    // jsdom não oferece PointerEvent; o Radix precisa de button e ctrlKey.
    vi.stubGlobal("PointerEvent", MouseEvent);
  });
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications = mockNotificationsList;
    mockLoading = false;
    mockError = null;
  });

  function openNotifications() {
    fireEvent.pointerDown(screen.getByRole("button", { name: "Abrir notificações" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    return screen.getByRole("menu", { name: "Notificações" });
  }

  it("renderiza o sino de notificações com a contagem de não lidas", () => {
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Abrir notificações" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("exibe abas de filtro por categoria ao abrir o menu", () => {
    render(<NotificationBell />);
    openNotifications();

    expect(screen.getByText("Todas (2)")).toBeInTheDocument();
    expect(screen.getByText("Novidades")).toBeInTheDocument();
    expect(screen.getByText("Atividades")).toBeInTheDocument();
    expect(mockMarkAllAsRead).toHaveBeenCalledOnce();
  });

  it("filtra notificações pela aba Novidades", () => {
    render(<NotificationBell />);
    openNotifications();

    fireEvent.click(screen.getByRole("menuitem", { name: "Novidades" }));

    expect(screen.getByText("Nova Tela no CS/CX")).toBeInTheDocument();
    expect(screen.queryByText("Nova demanda de conversão")).not.toBeInTheDocument();
    expect(screen.getByRole("menu", { name: "Notificações" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Atividades" }));
    expect(screen.getByText("Nova demanda de conversão")).toBeInTheDocument();
    expect(screen.queryByText("Nova Tela no CS/CX")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Todas (2)" }));
    expect(screen.getByText("Nova Tela no CS/CX")).toBeInTheDocument();
    expect(screen.getByText("Nova demanda de conversão")).toBeInTheDocument();
  });

  it("permite limpar/excluir uma notificação individualmente", () => {
    render(<NotificationBell />);
    openNotifications();
    fireEvent.click(screen.getByRole("menuitem", { name: "Limpar notificação: Nova Tela no CS/CX" }));
    expect(mockDeleteNotification).toHaveBeenCalledWith("notif-1");
    expect(mockMarkAsRead).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("menu", { name: "Notificações" })).toBeInTheDocument();
  });

  it("abre o destino da notificação e marca somente esse item como lido", () => {
    render(<NotificationBell />);
    openNotifications();
    fireEvent.click(screen.getByRole("menuitem", { name: "Abrir notificação: Nova Tela no CS/CX" }));

    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1");
    expect(mockNavigate).toHaveBeenCalledWith("/cs-cx/relatorios");
    expect(mockDeleteNotification).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("mantém exclusão disponível pelo teclado sem abrir a publicação", () => {
    render(<NotificationBell />);
    openNotifications();
    const clear = screen.getByRole("menuitem", { name: "Limpar notificação: Nova Tela no CS/CX" });
    act(() => clear.focus());
    fireEvent.keyDown(clear, { key: "Enter" });

    expect(mockDeleteNotification).toHaveBeenCalledWith("notif-1");
    expect(mockMarkAsRead).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("inclui releases antigos sem categoria changelog no filtro Novidades", () => {
    mockNotifications = [{ ...mockNotificationsList[0], category: "operational", type: "release_fix" }];
    render(<NotificationBell />);
    openNotifications();
    fireEvent.click(screen.getByRole("menuitem", { name: "Novidades" }));
    expect(screen.getByText("Nova Tela no CS/CX")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Atividades" }));
    expect(screen.getByText("Nenhuma atividade recente.")).toBeInTheDocument();
  });

  it("informa o estado vazio e mantém os filtros utilizáveis", () => {
    mockNotifications = [];
    render(<NotificationBell />);
    openNotifications();
    expect(screen.getByText("Nenhuma notificação.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Novidades" }));
    expect(screen.getByText("Nenhuma novidade recente.")).toBeInTheDocument();
    expect(mockMarkAllAsRead).not.toHaveBeenCalled();
  });

  it("expõe o estado de carregamento sem mostrar notificações antigas", () => {
    mockLoading = true;
    render(<NotificationBell />);
    openNotifications();
    expect(screen.getByRole("status", { name: "Carregando notificações" })).toBeInTheDocument();
    expect(screen.queryByText("Nova Tela no CS/CX")).not.toBeInTheDocument();
    expect(mockMarkAllAsRead).not.toHaveBeenCalled();
    const markAll = screen.getByRole("menuitem", { name: "Marcar todas lidas" });
    expect(markAll).toBeDisabled();
    fireEvent.click(markAll);
    fireEvent.keyDown(markAll, { key: "Enter" });
    expect(mockMarkAllAsRead).not.toHaveBeenCalled();
  });

  it("distingue falha de consulta de lista vazia e permite tentar novamente", () => {
    mockError = "Falha na conexão";
    render(<NotificationBell />);
    openNotifications();

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as notificações.");
    expect(screen.queryByText("Nenhuma notificação.")).not.toBeInTheDocument();
    expect(screen.queryByText("Nova Tela no CS/CX")).not.toBeInTheDocument();
    expect(mockMarkAllAsRead).not.toHaveBeenCalled();
    const markAll = screen.getByRole("menuitem", { name: "Marcar todas lidas" });
    expect(markAll).toBeDisabled();
    fireEvent.click(markAll);
    fireEvent.keyDown(markAll, { key: "Enter" });
    expect(mockMarkAllAsRead).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Tentar novamente" }));
    expect(mockRefetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("menu", { name: "Notificações" })).toBeInTheDocument();
  });

  it("preserva texto completo e controles para notificações longas", () => {
    const title = "Atualização " + "sem-espaços".repeat(20);
    const message = "Confira as orientações completas para a implantação. ".repeat(12).trim();
    mockNotifications = [{ ...mockNotificationsList[0], title, message, projectName: "Cartório " + "muito-longo".repeat(15) }];
    render(<NotificationBell />);
    openNotifications();
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: `Abrir notificação: ${title}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: `Limpar notificação: ${title}` }));
    expect(mockDeleteNotification).toHaveBeenCalledWith("notif-1");
  });
});
