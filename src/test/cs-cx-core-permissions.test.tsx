import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hasPermission = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/useCsCxCore", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/hooks/useCsCxCore")>();
  return {
    ...original,
    useCsCxRegistryOffices: () => ({
      offices: [{
        id: "office-1",
        legacy_id: 10,
        name: "Cartório Central",
        sap_code: "SAP-1",
        active: true,
        contact_details: null,
        notes: null,
        origin: "legacy",
        created_at: null,
        products: [],
      }],
      products: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      saveOffice: mutation,
      deleteOffice: mutation,
    }),
    useCsCxRequests: () => ({
      requests: Array.from({ length: 12 }, (_, index) => ({
        id: `request-${index + 1}`,
        legacy_id: 20 + index,
        ticket_number: index === 0 ? "CH-123" : `CH-${100 + index}`,
        description: index === 0 ? "Ajustar integração" : `Solicitação ${index + 1}`,
        module: "Notas",
        requester: "Maria",
        responsible: "João",
        requested_on: "2026-08-01",
        expected_delivery_on: null,
        delivered_on: null,
        status: "Aguardando",
        notes: null,
        registry_office_id: "office-1",
        author_profile_id: null,
        created_at: null,
        updated_at: null,
        origin: "legacy",
        registry_office: { id: "office-1", name: "Cartório Central" },
      })),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      saveRequest: mutation,
      updateStatus: mutation,
      deleteRequest: mutation,
    }),
  };
});

import CsCxRegistryOffices from "@/pages/cs-cx/CsCxRegistryOffices";
import CsCxRequests from "@/pages/cs-cx/CsCxRequests";

function renderPage(page: React.ReactNode, permissions: string[]) {
  hasPermission.mockImplementation((resource: string, action: string) =>
    permissions.includes(`${resource}:${action}`),
  );
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("CS/CX — ações por permissão", () => {
  beforeEach(() => hasPermission.mockReset());

  it("mantém cartórios visíveis e esconde escrita sem permissão", () => {
    renderPage(<CsCxRegistryOffices />, []);
    expect(screen.getByText("Cartório Central")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo cartório/i })).not.toBeInTheDocument();
  });

  it("libera criação de cartório com o recurso correto", () => {
    renderPage(<CsCxRegistryOffices />, ["cs_cx_cartorios:create"]);
    expect(screen.getByRole("button", { name: /novo cartório/i })).toBeInTheDocument();
  });

  it("mantém solicitações visíveis e esconde escrita sem permissão", () => {
    renderPage(<CsCxRequests />, []);
    expect(screen.getByText("CH-123")).toBeInTheDocument();
    expect(screen.getByText("Ajustar integração")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nova solicitação/i })).not.toBeInTheDocument();
  });

  it("libera criação de solicitação com o recurso correto", () => {
    renderPage(<CsCxRequests />, ["cs_cx_registros:create"]);
    expect(screen.getByRole("button", { name: /nova solicitação/i })).toBeInTheDocument();
  });

  it("pagina a lista de solicitações em blocos compactos", () => {
    renderPage(<CsCxRequests />, []);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 solicitações")).toBeInTheDocument();
    expect(screen.queryByText("CH-105")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("CH-105")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 6 a 10 de 12 solicitações")).toBeInTheDocument();
  });

  it("abre o quadro compacto em tela cheia e fecha com Esc", () => {
    renderPage(<CsCxRequests />, []);
    const boardTab = screen.getByRole("tab", { name: /quadro/i });
    fireEvent.mouseDown(boardTab, { button: 0, ctrlKey: false });

    expect(screen.getByLabelText("Solicitações em Aguardando")).toHaveClass("overflow-y-auto");
    fireEvent.click(screen.getByRole("button", { name: /abrir quadro em tela cheia/i }));
    expect(screen.getByRole("button", { name: /sair da tela cheia/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: /abrir quadro em tela cheia/i })).toBeInTheDocument();
  });
});
