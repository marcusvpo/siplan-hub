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
    models: Array.from({ length: 12 }, (_, index) => ({
      id: `model-${index + 1}`,
      legacy_id: index + 1,
      name: index === 0 ? "Rotinas Firmas" : `Modelo ${index + 1}`,
      description: "Modelo principal",
      active: true,
      origin: "legacy",
      products: [{ id: "product-1", name: "Orion" }],
      item_count: 1,
    })),
    routines: Array.from({ length: 12 }, (_, index) => ({
      id: `routine-${index + 1}`,
      legacy_id: index + 1,
      registry_office_id: "office-1",
      routine_model_id: `model-${index + 1}`,
      active: true,
      applied_at: "2026-08-01T00:00:00.000Z",
      notes: null,
      origin: "legacy",
      registry_office: { id: "office-1", name: index === 0 ? "Cartório Central" : `Cartório ${index + 1}` },
      routine_model: { id: `model-${index + 1}`, name: index === 0 ? "Rotinas Firmas" : `Modelo ${index + 1}`, description: null },
      items: [{
        id: `config-${index + 1}`,
        active: null,
        notes: null,
        analysis_notes: null,
        analyzed_at: null,
        model_item: {
          id: `item-${index + 1}`,
          name: index === 0 ? "Reconhecimento de firma" : `Item ${index + 1}`,
          description: null,
          sort_order: 0,
          required: true,
          category: { id: "category-1", name: "Operacional", display_color: "#ad0505" },
          routine_type: { id: "type-1", name: "Firmas" },
        },
      }],
    })),
    history: Array.from({ length: 12 }, (_, index) => ({
      id: `history-${index + 1}`,
      legacy_id: index + 10,
      office_routine_id: `routine-${index + 1}`,
      model_item_id: `item-${index + 1}`,
      action: index === 0 ? "ATIVADO" : `ACAO_${index + 1}`,
      previous_status: null,
      new_status: index === 0 ? true : null,
      notes: index === 0 ? "Validado com o cliente" : `Registro ${index + 1}`,
      legacy_user_id: 7,
      actor_profile_id: null,
      occurred_at: "2026-08-10T13:30:00.000Z",
      ip_address: "10.0.10.9",
      origin: "legacy",
      registry_office_name: index === 0 ? "Cartório Central" : `Cartório ${index + 1}`,
      routine_model_name: index === 0 ? "Rotinas Firmas" : `Modelo ${index + 1}`,
      model_item_name: "Reconhecimento de firma",
      actor_name: index === 0 ? "Bruno Fernandes" : `Responsável ${index + 1}`,
    })),
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
    expect(screen.getAllByRole("button", { name: /exportar pdf da rotina/i })).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /aplicar rotina/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /desvincular rotina/i })).not.toBeInTheDocument();
  });

  it("libera aplicação e exclusão com as permissões corretas", () => {
    renderPage(["cs_cx_rotinas:create", "cs_cx_rotinas:delete"]);
    expect(screen.getByRole("button", { name: /aplicar rotina/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /desvincular rotina/i })).toHaveLength(5);
  });

  it("pagina aplicações e modelos em blocos compactos", () => {
    renderPage([]);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 aplicações")).toBeInTheDocument();
    expect(screen.queryByText("Cartório 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página de aplicações/i }));
    expect(screen.getByText("Cartório 6")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Modelos" }), { button: 0, ctrlKey: false });
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 modelos")).toBeInTheDocument();
    expect(screen.queryByText("Modelo 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página de modelos/i }));
    expect(screen.getByText("Modelo 6")).toBeInTheDocument();
  });

  it("exibe o histórico detalhado sem exigir permissão de escrita", () => {
    renderPage([]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Histórico" }), { button: 0, ctrlKey: false });

    expect(screen.getByText("Bruno Fernandes")).toBeInTheDocument();
    expect(screen.getByText("Item ativado")).toBeInTheDocument();
    expect(screen.getByText("Validado com o cliente")).toBeInTheDocument();
    expect(screen.getByLabelText("Data inicial do histórico")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 registros")).toBeInTheDocument();
    expect(screen.queryByText("Responsável 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página de registros/i }));
    expect(screen.getByText("Responsável 6")).toBeInTheDocument();
  });

  it("abre a visão consolidada do cartório e permite informar a data da análise", () => {
    renderPage(["cs_cx_rotinas:edit"]);
    expect(screen.queryByRole("button", { name: /^itens$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /analisar cartório e suas rotinas/i })[0]);

    expect(screen.getByText("Análise das rotinas do cartório")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar itens da análise")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 itens da análise")).toBeInTheDocument();
    expect(screen.queryByText("Item 6")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /próxima página de itens da análise/i }));
    expect(screen.getByText("Item 6")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /editar/i })[0]);
    expect(screen.getByLabelText("Data da análise")).toBeInTheDocument();
  });
});
