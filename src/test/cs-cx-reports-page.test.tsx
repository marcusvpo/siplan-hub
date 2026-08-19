import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useCsCxRoutines", () => ({
  useCsCxRoutines: () => ({
    models: [{ id: "model-1", legacy_id: 1, name: "Firmas", description: null, active: true, origin: "legacy", products: [], item_count: 1 }],
    routines: Array.from({ length: 12 }, (_, index) => ({
      id: `routine-${index + 1}`, legacy_id: index + 1, registry_office_id: `office-${index + 1}`, routine_model_id: "model-1", active: true,
      applied_at: "2026-08-10T12:00:00.000Z", notes: null, origin: "legacy",
      registry_office: { id: `office-${index + 1}`, name: index === 0 ? "Cartório Central" : `Cartório ${index + 1}` }, routine_model: { id: "model-1", name: "Firmas", description: null },
      items: [{ id: `config-${index + 1}`, active: true, notes: null, analysis_notes: null, analyzed_at: null, model_item: { id: "item-1", name: "Conferência", description: null, sort_order: 1, required: true, category: { id: "category-1", name: "Atendimento", display_color: "#d20037" }, routine_type: { id: "type-1", name: "Operacional" } } }],
    })),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import CsCxReports from "@/pages/cs-cx/CsCxReports";

describe("página de relatórios CS/CX", () => {
  it("exibe indicadores, aplicação e as duas exportações", () => {
    render(<CsCxReports />);
    expect(screen.getByRole("heading", { name: "Relatórios de Rotinas" })).toBeInTheDocument();
    expect(screen.getByText("Cartório Central")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Exportar Excel" })).toBeEnabled();
  });

  it("pagina as aplicações em blocos compactos", () => {
    render(<CsCxReports />);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 aplicações")).toBeInTheDocument();
    expect(screen.queryByText("Cartório 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("Cartório 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 6 a 10 de 12 aplicações")).toBeInTheDocument();
  });
});
