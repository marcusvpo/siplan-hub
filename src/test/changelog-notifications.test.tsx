import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
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

let mockHasPermission = vi.fn().mockReturnValue(true);

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: mockHasPermission,
    isAdmin: false,
  }),
}));

const mockDeleteNotification = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();

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

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: mockNotificationsList,
    unreadCount: 2,
    loading: false,
    error: null,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
    refetch: vi.fn(),
  }),
}));

describe("Central de Novidades & Notificações (Changelog)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("renderiza o sino de notificações com a contagem de não lidas", () => {
    render(<NotificationBell />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("exibe abas de filtro por categoria ao abrir o menu", () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Todas (2)")).toBeInTheDocument();
    expect(screen.getByText("Novidades")).toBeInTheDocument();
    expect(screen.getByText("Atividades")).toBeInTheDocument();
  });

  it("filtra notificações pela aba Novidades", () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button"));

    fireEvent.click(screen.getByText("Novidades"));

    expect(screen.getByText("Nova Tela no CS/CX")).toBeInTheDocument();
    expect(screen.queryByText("Nova demanda de conversão")).not.toBeInTheDocument();
  });

  it("permite limpar/excluir uma notificação individualmente", () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button"));

    const clearButtons = screen.getAllByTitle("Limpar notificação");
    expect(clearButtons.length).toBeGreaterThan(0);

    fireEvent.click(clearButtons[0]);
    expect(mockDeleteNotification).toHaveBeenCalledWith("notif-1");
  });
});
