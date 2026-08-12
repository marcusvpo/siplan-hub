import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const hasPermission = vi.fn();
const mutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useCsCxCore", () => ({
  useCsCxRegistryOffices: () => ({
    offices: [{ id: "office-1", name: "Cartório Central" }],
  }),
}));

vi.mock("@/hooks/useCsCxRoutines", () => ({
  useCsCxRoutines: () => ({
    models: [{
      id: "model-1",
      legacy_id: 1,
      name: "Rotinas Firmas",
      description: "Modelo principal",
      active: true,
      origin: "legacy",
      products: [{ id: "product-1", name: "Orion" }],
      item_count: 1,
    }],
    routines: [{
      id: "routine-1",
      legacy_id: 1,
      registry_office_id: "office-1",
      routine_model_id: "model-1",
      active: true,
      applied_at: "2026-08-01T00:00:00.000Z",
      notes: null,
      origin: "legacy",
      registry_office: { id: "office-1", name: "Cartório Central" },
      routine_model: { id: "model-1", name: "Rotinas Firmas", description: null },
      items: [{
        id: "config-1",
        active: null,
        notes: null,
        analysis_notes: null,
        analyzed_at: null,
        model_item: {
          id: "item-1",
          name: "Reconhecimento de firma",
          description: null,
          sort_order: 0,
          required: true,
          category: { id: "category-1", name: "Operacional", display_color: "#ad0505" },
          routine_type: { id: "type-1", name: "Firmas" },
        },
      }],
    }],
    history: [{
      id: "history-1",
      legacy_id: 10,
      office_routine_id: "routine-1",
      model_item_id: "item-1",
      action: "ATIVADO",
      previous_status: null,
      new_status: true,
      notes: "Validado com o cliente",
      legacy_user_id: 7,
      actor_profile_id: null,
      occurred_at: "2026-08-10T13:30:00.000Z",
      ip_address: "10.0.10.9",
      origin: "legacy",
      registry_office_name: "Cartório Central",
      routine_model_name: "Rotinas Firmas",
      model_item_name: "Reconhecimento de firma",
      actor_name: "Bruno Fernandes",
    }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    applyRoutine: mutation,
    setRoutineItem: mutation,
    deleteRoutine: mutation,
  }),
}));

import CsCxRoutines from "@/pages/cs-cx/CsCxRoutines";

function renderPage(permissions: string[]) {
  hasPermission.mockImplementation((resource: string, action: string) =>
    permissions.includes(`${resource}:${action}`),
  );
  return render(<CsCxRoutines />);
}

describe("CS/CX rotinas — permissões", () => {
  beforeEach(() => hasPermission.mockReset());

  it("mantém os dados visíveis sem liberar escrita", () => {
    renderPage([]);
    expect(screen.getByText("Cartório Central")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exportar pdf da rotina/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aplicar rotina/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /desvincular rotina/i })).not.toBeInTheDocument();
  });

  it("libera aplicação e exclusão com as permissões corretas", () => {
    renderPage(["cs_cx_rotinas:create", "cs_cx_rotinas:delete"]);
    expect(screen.getByRole("button", { name: /aplicar rotina/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desvincular rotina/i })).toBeInTheDocument();
  });

  it("exibe o histórico detalhado sem exigir permissão de escrita", () => {
    renderPage([]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Histórico" }), { button: 0, ctrlKey: false });

    expect(screen.getByText("Bruno Fernandes")).toBeInTheDocument();
    expect(screen.getByText("Item ativado")).toBeInTheDocument();
    expect(screen.getByText("Validado com o cliente")).toBeInTheDocument();
    expect(screen.getByLabelText("Data inicial do histórico")).toBeInTheDocument();
  });
});
