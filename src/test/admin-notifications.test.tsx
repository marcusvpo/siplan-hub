import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import type { Notification } from "@/types/conversion";

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDeleteNotification = vi.fn();
const mockRefetch = vi.fn();

const mockNotifications: Notification[] = [
  {
    id: "notif-env-1",
    type: "new_demand",
    title: "Nova Preparação de Ambiente",
    message: "Ambiente pendente para Cartório Teste 1.",
    stage: "environment",
    priority: "high",
    read: false,
    createdAt: new Date(),
    projectName: "Cartório Teste 1",
    actionUrl: "/deployments/environment-config",
  },
  {
    id: "notif-conv-1",
    type: "assignment",
    title: "Conversão Assumida",
    message: "Ademar Souza assumiu a conversão de Cartório Teste 2.",
    stage: "conversion",
    priority: "normal",
    read: true,
    readAt: new Date(),
    createdAt: new Date(),
    projectName: "Cartório Teste 2",
    actionUrl: "/conversion/atividades",
  },
  {
    id: "notif-infra-1",
    type: "issue_reported",
    title: "Infraestrutura Bloqueada",
    message: "Servidor local inacessível para Cartório Teste 3.",
    stage: "infra",
    priority: "urgent",
    read: false,
    createdAt: new Date(),
    projectName: "Cartório Teste 3",
    actionUrl: "/projects?id=proj-3",
  },
];

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    loading: false,
    error: null,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
    refetch: mockRefetch,
  }),
}));

describe("Painel de Gestão de Notificações (/admin/notifications)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o cabeçalho e os KPIs executivos consolidados", () => {
    render(<AdminNotifications />);

    expect(screen.getByText("Central de Notificações")).toBeInTheDocument();
    expect(screen.getByText("Alertas Pendentes")).toBeInTheDocument();
    expect(screen.getByText("Urgentes Não Lidos")).toBeInTheDocument();
    expect(screen.getByText("Fila de Ambiente")).toBeInTheDocument();
    expect(screen.getByText("Fila de Conversão")).toBeInTheDocument();

    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it("exibe todas as notificações e permite filtrar por busca textual", () => {
    render(<AdminNotifications />);

    expect(screen.getByText("Nova Preparação de Ambiente")).toBeInTheDocument();
    expect(screen.getByText("Conversão Assumida")).toBeInTheDocument();
    expect(screen.getByText("Infraestrutura Bloqueada")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Buscar cliente/);
    fireEvent.change(searchInput, { target: { value: "Cartório Teste 2" } });

    expect(screen.getByText("Conversão Assumida")).toBeInTheDocument();
    expect(screen.queryByText("Nova Preparação de Ambiente")).not.toBeInTheDocument();
    expect(screen.queryByText("Infraestrutura Bloqueada")).not.toBeInTheDocument();
  });

  it("filtra por etapa de projeto ao selecionar a aba correspondente", () => {
    render(<AdminNotifications />);

    const conversionTab = screen.getByRole("tab", { name: "3. Conversão" });
    fireEvent.mouseDown(conversionTab, { button: 0, ctrlKey: false });

    expect(screen.getByText("Conversão Assumida")).toBeInTheDocument();
    expect(screen.queryByText("Nova Preparação de Ambiente")).not.toBeInTheDocument();
    expect(screen.queryByText("Infraestrutura Bloqueada")).not.toBeInTheDocument();
  });

  it("permite marcar como lida e excluir uma notificação", () => {
    render(<AdminNotifications />);

    const markReadBtns = screen.getAllByTitle("Marcar como lida");
    fireEvent.click(markReadBtns[0]);
    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-env-1");

    const deleteBtns = screen.getAllByTitle("Excluir notificação");
    fireEvent.click(deleteBtns[0]);
    expect(mockDeleteNotification).toHaveBeenCalledWith("notif-env-1");
  });
});
