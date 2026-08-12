import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useCsCxRoutines", () => ({
  useCsCxRoutines: () => ({
    models: [{ id: "model-1", legacy_id: 1, name: "Firmas", description: null, active: true, origin: "legacy", products: [], item_count: 1 }],
    routines: [{
      id: "routine-1", legacy_id: 1, registry_office_id: "office-1", routine_model_id: "model-1", active: true,
      applied_at: "2026-08-10T12:00:00.000Z", notes: null, origin: "legacy",
      registry_office: { id: "office-1", name: "Cartório Central" }, routine_model: { id: "model-1", name: "Firmas", description: null },
      items: [{ id: "config-1", active: true, notes: null, analysis_notes: null, analyzed_at: null, model_item: { id: "item-1", name: "Conferência", description: null, sort_order: 1, required: true, category: { id: "category-1", name: "Atendimento", display_color: "#d20037" }, routine_type: { id: "type-1", name: "Operacional" } } }],
    }],
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
});
