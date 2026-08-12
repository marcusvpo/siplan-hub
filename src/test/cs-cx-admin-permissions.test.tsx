import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const hasPermission = vi.fn();
const mutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useCsCxRoutines", () => ({
  useCsCxRoutineAdmin: () => ({
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
    categories: [{ id: "category-1", name: "Operacional", description: null, display_color: "#ad0505", active: true, origin: "legacy", item_count: 1 }],
    types: [{ id: "type-1", name: "Firmas", description: null, active: true, origin: "legacy", item_count: 1 }],
    items: [{
      id: "item-1",
      routine_model_id: "model-1",
      name: "Reconhecimento de firma",
      description: null,
      category_id: "category-1",
      routine_type_id: "type-1",
      sort_order: 1,
      required: true,
      default_active: null,
      origin: "legacy",
      category: { id: "category-1", name: "Operacional", display_color: "#ad0505" },
      routine_type: { id: "type-1", name: "Firmas" },
    }],
    products: [{ id: "product-1", name: "Orion" }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    saveModel: mutation,
    deleteModel: mutation,
    saveItem: mutation,
    deleteItem: mutation,
    reorderItem: mutation,
    saveCategory: mutation,
    deleteCategory: mutation,
    saveType: mutation,
    deleteType: mutation,
  }),
}));

import CsCxAdmin from "@/pages/cs-cx/CsCxAdmin";

describe("CS/CX administração — permissões", () => {
  beforeEach(() => hasPermission.mockReset());

  it("exibe os modelos e itens em modo somente leitura", () => {
    hasPermission.mockReturnValue(false);
    render(<CsCxAdmin />);

    expect(screen.getAllByText("Rotinas Firmas")).toHaveLength(2);
    expect(screen.getByText(/Reconhecimento de firma/)).toBeInTheDocument();
    expect(screen.getByText("Somente leitura")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Criar modelo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Novo item/i })).not.toBeInTheDocument();
  });

  it("libera os controles com a permissão manage", () => {
    hasPermission.mockImplementation((resource: string, action: string) => resource === "cs_cx_admin" && action === "manage");
    render(<CsCxAdmin />);

    expect(screen.getByRole("button", { name: "Criar modelo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo item/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar Reconhecimento de firma" })).toBeInTheDocument();
  });
});
