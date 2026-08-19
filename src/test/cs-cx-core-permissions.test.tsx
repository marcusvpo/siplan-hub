import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hasPermission = vi.fn();
const { printRequestsReport } = vi.hoisted(() => ({ printRequestsReport: vi.fn() }));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/cs-cx-requests-report", () => ({
  printCsCxRequestsReport: printRequestsReport,
}));

const mutation = { mutateAsync: vi.fn(), isPending: false };
const updateObservationMutation = { mutateAsync: vi.fn(), isPending: false };
const deleteObservationMutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/useCsCxCore", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/hooks/useCsCxCore")>();
  return {
    ...original,
    useCsCxRegistryOffices: () => ({
      offices: Array.from({ length: 12 }, (_, index) => ({
        id: `office-${index + 1}`,
        legacy_id: 10 + index,
        name: index === 0 ? "Cartório Central" : `Cartório ${index + 1}`,
        sap_code: `SAP-${index + 1}`,
        active: true,
        contact_details: null,
        notes: null,
        origin: "legacy",
        created_at: null,
        analyst_profile_id: index === 0 ? "profile-1" : null,
        analyst: index === 0 ? { id: "profile-1", full_name: "Bruno", email: null } : null,
        products: [],
      })),
      products: [],
      profiles: [{ id: "profile-1", full_name: "Bruno", email: null }],
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
        requested_on: index === 0 ? "2026-08-01" : "2026-07-01",
        expected_delivery_on: null,
        delivered_on: null,
        status: index === 1 ? "Projeto" : index === 2 ? "Desenvolvimento" : index === 3 ? "Em andamento" : index === 4 ? "Finalizado" : "Aguardando",
        notes: null,
        registry_office_id: "office-1",
        author_profile_id: null,
        created_at: null,
        updated_at: null,
        origin: "legacy",
        registry_office: { id: "office-1", name: "Cartório Central" },
        updates: index === 0 ? [{ id: "update-1", observation: "Primeiro retorno", author_profile_id: "profile-1", occurred_at: "2026-08-10T15:00:00Z", origin: "hub", author: { id: "profile-1", full_name: "Bruno", email: null } }] : [],
      })),
      statuses: [
        { id: "status-1", name: "Aguardando", color: "amber", sort_order: 10, active: true, is_system: true },
        { id: "status-2", name: "Projeto", color: "violet", sort_order: 20, active: true, is_system: true },
        { id: "status-3", name: "Sustentação", color: "orange", sort_order: 30, active: true, is_system: false },
        { id: "status-4", name: "FastTrack", color: "fuchsia", sort_order: 40, active: true, is_system: false },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      saveRequest: mutation,
      updateStatus: mutation,
      updateRequestObservation: updateObservationMutation,
      deleteRequestObservation: deleteObservationMutation,
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
  beforeEach(() => {
    hasPermission.mockReset();
    mutation.mutateAsync.mockReset();
    updateObservationMutation.mutateAsync.mockReset();
    deleteObservationMutation.mutateAsync.mockReset();
    printRequestsReport.mockReset();
    printRequestsReport.mockResolvedValue(undefined);
  });

  it("mantém cartórios visíveis e esconde escrita sem permissão", () => {
    renderPage(<CsCxRegistryOffices />, []);
    expect(screen.getByText("Cartório Central")).toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(screen.getByText("Inativos")).toBeInTheDocument();
    expect(screen.queryByText("Importados do legado")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo cartório/i })).not.toBeInTheDocument();
  });

  it("libera criação de cartório com o recurso correto", () => {
    renderPage(<CsCxRegistryOffices />, ["cs_cx_cartorios:create"]);
    expect(screen.getByRole("button", { name: /novo cartório/i })).toBeInTheDocument();
  });

  it("pagina a lista de cartórios em blocos compactos", () => {
    renderPage(<CsCxRegistryOffices />, []);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 cartórios")).toBeInTheDocument();
    expect(screen.queryByText("Cartório 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("Cartório 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 6 a 10 de 12 cartórios")).toBeInTheDocument();
  });

  it("permite visualizar o cadastro do cartório sem permissão de edição", () => {
    renderPage(<CsCxRegistryOffices />, []);
    fireEvent.click(screen.getByRole("button", { name: /visualizar cartório central/i }));

    expect(screen.getByText("Cadastro do cartório")).toBeInTheDocument();
    expect(screen.getByText(/visualização completa, sem alteração/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar cadastro/i })).not.toBeInTheDocument();
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

  it("filtra a lista ao clicar nos cards de resumo", () => {
    renderPage(<CsCxRequests />, []);

    const executionCard = screen.getByRole("button", { name: /filtrar por em execução: 3 solicitações/i });
    fireEvent.click(executionCard);

    expect(executionCard).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Mostrando 1 a 3 de 3 solicitações")).toBeInTheDocument();
    expect(screen.getByText("CH-101")).toBeInTheDocument();
    expect(screen.getByText("CH-102")).toBeInTheDocument();
    expect(screen.getByText("CH-103")).toBeInTheDocument();
    expect(screen.queryByText("CH-123")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /filtrar por total: 12 solicitações/i }));
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 solicitações")).toBeInTheDocument();
  });

  it("filtra solicitações por período e imprime somente o resultado", async () => {
    const openWindow = vi.spyOn(window, "open").mockReturnValue(null);
    renderPage(<CsCxRequests />, []);

    fireEvent.change(screen.getByLabelText("Período inicial da solicitação"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("Período final da solicitação"), { target: { value: "2026-08-31" } });

    expect(screen.getByLabelText("Mostrando 1 a 1 de 1 solicitações")).toBeInTheDocument();
    expect(screen.getByText("CH-123")).toBeInTheDocument();
    expect(screen.queryByText("CH-101")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /imprimir relatório/i }));
    await waitFor(() => expect(printRequestsReport).toHaveBeenCalledTimes(1));
    expect(printRequestsReport.mock.calls[0][0]).toHaveLength(1);
    expect(printRequestsReport.mock.calls[0][1]).toContain("01/08/2026 até 31/08/2026");
    openWindow.mockRestore();
  });

  it("abre o quadro compacto em tela cheia e fecha com Esc", () => {
    renderPage(<CsCxRequests />, []);
    const boardTab = screen.getByRole("tab", { name: /quadro/i });
    fireEvent.mouseDown(boardTab, { button: 0, ctrlKey: false });

    expect(screen.getByText("Fluxo das solicitações").parentElement?.parentElement).toHaveClass("md:absolute");
    expect(screen.getByLabelText("Solicitações em Aguardando")).toHaveClass("overflow-y-auto");
    fireEvent.click(screen.getByRole("button", { name: /abrir quadro em tela cheia/i }));
    expect(screen.getByRole("button", { name: /sair da tela cheia/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: /abrir quadro em tela cheia/i })).toBeInTheDocument();
  });

  it("arrasta uma solicitação para outra coluna e atualiza o status", () => {
    renderPage(<CsCxRequests />, ["cs_cx_registros:edit"]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /quadro/i }), { button: 0, ctrlKey: false });
    const card = screen.getByLabelText("Arrastar CH-123");
    const target = screen.getByLabelText("Projeto: 1 solicitações");
    const dataTransfer = { effectAllowed: "none", dropEffect: "none", setData: vi.fn() };

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    expect(target).toHaveClass("ring-2");
    fireEvent.drop(target, { dataTransfer });

    expect(mutation.mutateAsync).toHaveBeenCalledWith({ id: "request-1", status: "Projeto" });
  });

  it("exibe os novos status e preserva observações anteriores na edição", () => {
    renderPage(<CsCxRequests />, ["cs_cx_registros:edit"]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /quadro/i }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: "Editar CH-123" }));

    expect(screen.getByText("Histórico de observações")).toBeInTheDocument();
    expect(screen.getByText("Primeiro retorno")).toBeInTheDocument();
    expect(screen.getByText("Nova observação")).toBeInTheDocument();
  });

  it("edita e exclui observações anteriores com as permissões corretas", async () => {
    renderPage(<CsCxRequests />, ["cs_cx_registros:edit", "cs_cx_registros:delete"]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /quadro/i }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: "Editar CH-123" }));

    expect(screen.getByRole("dialog")).toHaveClass("sm:max-w-5xl");
    fireEvent.click(screen.getByRole("button", { name: "Editar observação" }));
    fireEvent.change(screen.getByLabelText("Texto da observação"), { target: { value: "Retorno revisado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar observação" }));

    await waitFor(() => expect(updateObservationMutation.mutateAsync).toHaveBeenCalledWith({ id: "update-1", observation: "Retorno revisado" }));

    fireEvent.click(screen.getByRole("button", { name: "Excluir observação" }));
    expect(screen.getByText("Excluir esta observação?")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Excluir observação" }).at(-1)!);

    await waitFor(() => expect(deleteObservationMutation.mutateAsync).toHaveBeenCalledWith("update-1"));
  });
});
