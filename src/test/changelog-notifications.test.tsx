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
    role: "admin",
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
  useNotifications: () => {
    const unreadCount = mockNotifications.filter((n) => !n.read).length;
    const operationalUnreadCount = mockNotifications.filter(
      (n) => !n.read && n.category !== "changelog" && !n.type?.startsWith("release_")
    ).length;
    const changelogUnreadCount = mockNotifications.filter(
      (n) => !n.read && (n.category === "changelog" || n.type?.startsWith("release_"))
    ).length;

    return {
      notifications: mockNotifications,
      unreadCount,
      operationalUnreadCount,
      changelogUnreadCount,
      loading: mockLoading,
      error: mockError,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      deleteNotification: mockDeleteNotification,
      refetch: mockRefetch,
    };
  },
}));

describe("Central de Novidades & Notificações (Changelog)", () => {
  beforeAll(() => {
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

  it("renderiza o sino de notificações com a contagem de atividades operacionais não lidas", () => {
    render(<NotificationBell />);
    expect(screen.getByRole("button", { name: "Abrir notificações" })).toBeInTheDocument();
    // Badge numérico alerta exclusivamente atividades operacionais pendentes (1 atividade pendente)
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("exibe as abas de filtro (Todas, Atividades e Novidades) ao abrir o menu", () => {
    render(<NotificationBell />);
    openNotifications();

    expect(screen.getByText(/Todas \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Atividades \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Novidades \(1\)/)).toBeInTheDocument();
    expect(mockMarkAllAsRead).toHaveBeenCalledOnce();

    // Na aba padrão Todas, exibe tanto atividade quanto novidade
    expect(screen.getByText("Nova demanda de conversão")).toBeInTheDocument();
    expect(screen.getByText("Nova Tela no CS/CX")).toBeInTheDocument();
  });

  it("filtra notificações ao alternar para a aba Novidades", () => {
    render(<NotificationBell />);
    openNotifications();

    fireEvent.click(screen.getByRole("menuitem", { name: /Novidades/ }));

    expect(screen.getByText("Nova Tela no CS/CX")).toBeInTheDocument();
    expect(screen.queryByText("Nova demanda de conversão")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: /Atividades/ }));
    expect(screen.getByText("Nova demanda de conversão")).toBeInTheDocument();
    expect(screen.queryByText("Nova Tela no CS/CX")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: /Todas/ }));
    expect(screen.getByText("Nova demanda de conversão")).toBeInTheDocument();
    expect(screen.getByText("Nova Tela no CS/CX")).toBeInTheDocument();
  });

  it("permite limpar/excluir uma notificação individualmente", () => {
    render(<NotificationBell />);
    openNotifications();
    fireEvent.click(screen.getByRole("menuitem", { name: "Limpar notificação: Nova demanda de conversão" }));
    expect(mockDeleteNotification).toHaveBeenCalledWith("notif-2");
    expect(mockMarkAsRead).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("menu", { name: "Notificações" })).toBeInTheDocument();
  });

  it("abre o destino da notificação e marca somente esse item como lido", () => {
    render(<NotificationBell />);
    openNotifications();
    fireEvent.click(screen.getByRole("menuitem", { name: /Novidades/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Abrir notificação: Nova Tela no CS/CX" }));

    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1");
    expect(mockNavigate).toHaveBeenCalledWith("/cs-cx/relatorios");
    expect(mockDeleteNotification).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("informa o estado vazio e mantém os filtros utilizáveis", () => {
    mockNotifications = [];
    render(<NotificationBell />);
    openNotifications();
    expect(screen.getByText("Nenhuma notificação.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Atividades/ }));
    expect(screen.getByText("Nenhuma atividade pendente no momento.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Novidades/ }));
    expect(screen.getByText("Nenhuma novidade recente.")).toBeInTheDocument();
    expect(mockMarkAllAsRead).not.toHaveBeenCalled();
  });

  it("exibe atalho para Central de Notificações do Administrador no rodapé", () => {
    render(<NotificationBell />);
    openNotifications();
    const adminLink = screen.getByText("Central de Gestão de Notificações");
    expect(adminLink).toBeInTheDocument();
    fireEvent.click(adminLink);
    expect(mockNavigate).toHaveBeenCalledWith("/admin/notifications");
  });

  it("expõe o estado de carregamento sem mostrar notificações antigas", () => {
    mockLoading = true;
    render(<NotificationBell />);
    openNotifications();
    expect(screen.getByRole("status", { name: "Carregando notificações" })).toBeInTheDocument();
    expect(screen.queryByText("Nova Tela no CS/CX")).not.toBeInTheDocument();
    expect(mockMarkAllAsRead).not.toHaveBeenCalled();
  });

  it("distingue falha de consulta de lista vazia e permite tentar novamente", () => {
    mockError = "Falha na conexão";
    render(<NotificationBell />);
    openNotifications();

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as notificações.");
    expect(screen.queryByText("Nova Tela no CS/CX")).not.toBeInTheDocument();
    expect(mockMarkAllAsRead).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Tentar novamente" }));
    expect(mockRefetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("menu", { name: "Notificações" })).toBeInTheDocument();
  });
});
