import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hasPermission = vi.fn();
const { printRequestsReport } = vi.hoisted(() => ({ printRequestsReport: vi.fn() }));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "profile-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/cs-cx-requests-report", () => ({
  printCsCxRequestsReport: printRequestsReport,
}));

const mutation = { mutateAsync: vi.fn(), isPending: false };
const routineMutation = { mutateAsync: vi.fn(), isPending: false };
const deleteRoutineMutation = { mutateAsync: vi.fn(), isPending: false };
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
        active: index !== 11,
        contact_details: null,
        notes: null,
        origin: "legacy",
        created_at: index === 0 ? "2026-08-10T12:00:00Z" : index === 1 ? "2026-07-15T12:00:00Z" : "2026-06-01T12:00:00Z",
        created_by: "profile-1",
        analyst_profile_id: index === 0 ? "profile-1" : index === 1 ? "profile-2" : null,
        analyst: index === 0
          ? { id: "profile-1", full_name: "Bruno", email: null }
          : index === 1
            ? { id: "profile-2", full_name: "Henrique", email: null }
            : null,
        responsibles: index === 0
          ? [
            { id: "office-responsible-1", profile_id: "profile-1", profile: { id: "profile-1", full_name: "Bruno", email: null } },
            { id: "office-responsible-2", profile_id: "profile-2", profile: { id: "profile-2", full_name: "Henrique", email: null } },
          ]
          : index === 1
            ? [{ id: "office-responsible-3", profile_id: "profile-2", profile: { id: "profile-2", full_name: "Henrique", email: null } }]
            : [],
        products: index === 0
          ? [{ id: "link-tn", product_id: "product-tn", implementation_date: null, product: { id: "product-tn", name: "OrionTN", product_code: "TN" }, responsibles: [] }]
          : index === 1
            ? [{ id: "link-pro", product_id: "product-pro", implementation_date: null, product: { id: "product-pro", name: "OrionPRO", product_code: "PRO" }, responsibles: [] }]
            : index === 2
              ? [
                { id: "link-tn-3", product_id: "product-tn", implementation_date: null, product: { id: "product-tn", name: "OrionTN", product_code: "TN" }, responsibles: [] },
                { id: "link-pro-3", product_id: "product-pro", implementation_date: null, product: { id: "product-pro", name: "OrionPRO", product_code: "PRO" }, responsibles: [] },
              ]
              : [],
      })),
      products: [
        { id: "product-tn", name: "OrionTN", product_code: "TN" },
        { id: "product-pro", name: "OrionPRO", product_code: "PRO" },
      ],
      profiles: [
        { id: "profile-1", full_name: "Bruno", email: null },
        { id: "profile-2", full_name: "Henrique", email: null },
      ],
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
        author_profile_id: "profile-1",
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

vi.mock("@/hooks/useCsCxRoutines", () => ({
  useCsCxRoutineLinks: () => ({
    models: [
      {
        id: "routine-model-tn",
        name: "Checklist de Rotinas OrionTN",
        active: true,
      },
      {
        id: "routine-model-pro",
        name: "Checklist de Rotinas OrionPRO",
        active: true,
      },
    ],
    routines: [
      {
        id: "office-routine-1",
        registry_office_id: "office-1",
        routine_model_id: "routine-model-tn",
        applied_by: "profile-1",
      },
    ],
    applyRoutine: routineMutation,
    deleteRoutine: deleteRoutineMutation,
  }),
}));

import CsCxRegistryOffices, { matchesRegistryOfficeFilters } from "@/pages/cs-cx/CsCxRegistryOffices";
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
    routineMutation.mutateAsync.mockReset();
    deleteRoutineMutation.mutateAsync.mockReset();
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

  it("vincula um checklist de rotina ao criar um cartório", async () => {
    mutation.mutateAsync.mockResolvedValueOnce("office-new");
    renderPage(<CsCxRegistryOffices />, [
      "cs_cx_cartorios:create",
      "cs_cx_rotinas:create",
    ]);

    fireEvent.click(screen.getByRole("button", { name: /novo cartório/i }));
    fireEvent.change(screen.getByLabelText("Nome do cartório"), {
      target: { value: "Miguelópolis - TNPT" },
    });
    fireEvent.click(
      screen.getByRole("combobox", {
        name: /checklists de rotinas do cartório/i,
      }),
    );
    fireEvent.change(
      screen.getByPlaceholderText(/buscar checklist de rotina/i),
      { target: { value: "oriontn" } },
    );
    fireEvent.click(
      screen.getByRole("option", { name: /checklist de rotinas oriontn/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /salvar cartório/i }));

    await waitFor(() =>
      expect(routineMutation.mutateAsync).toHaveBeenCalledWith({
        registryOfficeId: "office-new",
        routineModelId: "routine-model-tn",
      }),
    );
  });

  it("carrega os checklists já vinculados ao editar o cartório", async () => {
    renderPage(<CsCxRegistryOffices />, [
      "cs_cx_cartorios:edit",
      "cs_cx_rotinas:create",
      "cs_cx_rotinas:delete",
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: /visualizar cartório central/i }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /editar cadastro/i }),
    );

    expect(
      screen.getByRole("combobox", {
        name: /checklists de rotinas do cartório/i,
      }),
    ).toHaveTextContent("Checklist de Rotinas OrionTN");
  });

  it("pagina a lista de cartórios em blocos compactos", () => {
    renderPage(<CsCxRegistryOffices />, []);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 cartórios")).toBeInTheDocument();
    expect(screen.queryByText("Cartório 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("Cartório 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 6 a 10 de 12 cartórios")).toBeInTheDocument();
  });

  it("filtra cartórios por responsável, produtos combinados e período", async () => {
    renderPage(<CsCxRegistryOffices />, []);

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Filtrar cartórios por responsável" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Henrique" }));
    expect(screen.getByText("Cartório 2")).toBeInTheDocument();
    expect(screen.getByText("Cartório Central")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Filtrar cartórios por responsável" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Todos os responsáveis" }));
    expect(screen.getByRole("combobox", { name: "Filtrar cartórios por produtos" })).toBeInTheDocument();

    const officeWithOrionTn = {
      products: [{ product_id: "product-tn" }],
    } as Parameters<typeof matchesRegistryOfficeFilters>[0];
    const officeWithOrionPro = {
      products: [{ product_id: "product-pro" }],
    } as Parameters<typeof matchesRegistryOfficeFilters>[0];
    const officeWithAnotherProduct = {
      products: [{ product_id: "product-other" }],
    } as Parameters<typeof matchesRegistryOfficeFilters>[0];
    const combinedProductFilters = {
      search: "",
      status: "all",
      responsibleProfileId: "all",
      productIds: ["product-tn", "product-pro"],
      dateFrom: "",
      dateTo: "",
    };
    expect(matchesRegistryOfficeFilters(officeWithOrionTn, combinedProductFilters)).toBe(true);
    expect(matchesRegistryOfficeFilters(officeWithOrionPro, combinedProductFilters)).toBe(true);
    expect(matchesRegistryOfficeFilters(officeWithAnotherProduct, combinedProductFilters)).toBe(false);

    fireEvent.change(screen.getByLabelText("Cadastro inicial do cartório"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("Cadastro final do cartório"), { target: { value: "2026-08-31" } });
    expect(screen.getByText("Cartório Central")).toBeInTheDocument();
    expect(screen.queryByText("Cartório 2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 1 a 1 de 1 cartórios")).toBeInTheDocument();
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
