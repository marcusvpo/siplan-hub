import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SdAttendanceBi from "@/pages/sd/SdAttendanceBi";

const hookState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/hooks/useSdAttendanceBi", () => ({
  useSdAttendanceBi: () => hookState.current,
}));

vi.mock("recharts", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Empty = () => null;
  return {
    Bar: Empty,
    BarChart: Container,
    CartesianGrid: Empty,
    Cell: Empty,
    Legend: Empty,
    Line: Empty,
    LineChart: Container,
    Pie: Container,
    PieChart: Container,
    ResponsiveContainer: Container,
    Tooltip: Empty,
    XAxis: Empty,
    YAxis: Empty,
  };
});

const biData = {
  metrics: {
    total_minutes: 600,
    manual_minutes: 240,
    imported_minutes: 360,
    ticket_count: 6,
    classified_ticket_count: 5,
    analyst_count: 1,
    entry_count: 8,
    average_entry_minutes: 75,
    average_ticket_minutes: 100,
    overtime_minutes: 20,
    rework_minutes: 10,
    contract_minutes: 500,
  },
  daily: [{ work_date: "2026-08-31", total_minutes: 600, manual_minutes: 240, imported_minutes: 360, ticket_count: 6 }],
  by_group: [{ group_name: "SD - Protesto", total_minutes: 600, manual_minutes: 240, imported_minutes: 360, analyst_count: 1, ticket_count: 6 }],
  by_analyst: [{ user_id: "user-1", user_name: "Analista Teste", user_email: null, attendance_group: "SD - Protesto", total_minutes: 600, manual_minutes: 240, imported_minutes: 360, ticket_count: 6, entry_count: 8, average_entry_minutes: 75, worked_days: 1 }],
  by_nature: [{ nature: "Configuração", total_minutes: 600, ticket_count: 6, entry_count: 8 }],
  by_activity: [{ activity: "Atendimento", total_minutes: 600, ticket_count: 6, entry_count: 8 }],
  by_product: [{ product: "Orion", total_minutes: 600, ticket_count: 6, entry_count: 8 }],
  by_hour: [{ hour_of_day: 9, total_minutes: 600, entry_count: 8 }],
  top_tickets: Array.from({ length: 6 }, (_, index) => ({
    ticket_number: String(1001 + index),
    ticket_title: `Chamado ${index + 1}`,
    client_name: "Cliente teste",
    nature: "Configuração",
    product: "Orion",
    total_minutes: 100 - index,
    analyst_count: 1,
    entry_count: index + 1,
  })),
  filters: {
    analysts: [{ user_id: "user-1", user_name: "Analista Teste", user_email: null, attendance_group: "SD - Protesto" }],
    groups: ["SD - Protesto"],
    natures: ["Configuração"],
    products: ["Orion"],
  },
};

function queryState(isFetching = false) {
  return {
    data: biData,
    isLoading: false,
    isError: false,
    isFetching,
    refetch: vi.fn(),
  };
}

describe("interações do BI de atendimento", () => {
  beforeEach(() => {
    hookState.current = queryState();
  });

  it("preserva a aba ativa enquanto os filtros atualizam os dados", () => {
    const { rerender } = render(<SdAttendanceBi />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Equipes e analistas" }), { button: 0, ctrlKey: false });

    expect(screen.getByRole("tab", { name: "Equipes e analistas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Performance dos analistas")).toBeInTheDocument();

    hookState.current = queryState(true);
    rerender(<SdAttendanceBi />);

    expect(screen.getByRole("tab", { name: "Equipes e analistas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Atualizando dados");
  });

  it("navega pelas páginas dos chamados", () => {
    render(<SdAttendanceBi />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Chamados" }), { button: 0, ctrlKey: false });

    expect(screen.getByText("#1001")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página dos chamados" }));

    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.getByText("#1006")).toBeInTheDocument();
    expect(screen.queryByText("#1001")).not.toBeInTheDocument();
  });

  it("inicia com os filtros recolhidos no celular e permite expandir", () => {
    const desktopWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    try {
      render(<SdAttendanceBi />);

      expect(screen.queryByLabelText("Data inicial do BI")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Abrir filtros do BI" }));
      expect(screen.getByLabelText("Data inicial do BI")).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: desktopWidth });
    }
  });
});
