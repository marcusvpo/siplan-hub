import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hasPermission = vi.fn();
const mutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "profile-1" } }),
}));
vi.mock("@/hooks/useAiTextImprovement", () => ({
  useAiTextImprovement: () => ({
    improve: vi.fn(),
    reset: vi.fn(),
    job: undefined,
    active: false,
    error: null,
  }),
}));
vi.mock("@/hooks/useModelGenerationJobs", () => ({
  useModelWorkerStatus: () => ({ online: true, busy: false, status: null }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useCsCxCore", () => ({
  useCsCxRegistryOffices: () => ({
    offices: [
      { id: "office-1", name: "Cartório Central", active: true },
      { id: "office-2", name: "Cartório Norte", active: true },
      { id: "office-3", name: "Cartório Sul", active: true },
    ],
    products: [{ id: "product-1", name: "Orion", product_code: "ORI" }],
    error: null,
  }),
  useCsCxRequests: () => ({
    requests: [],
    statuses: [
      { id: "status-1", name: "Aguardando", active: true, is_system: true, sort_order: 1 },
      { id: "status-2", name: "Em andamento", active: true, is_system: false, sort_order: 2 },
    ],
    saveRequest: mutation,
    deleteRequest: mutation,
  }),
}));

vi.mock("@/hooks/useCsCxEngagement", () => ({
  CS_CX_APPOINTMENT_TYPES: ["REUNIAO", "CALL", "VISITA", "OUTRO"],
  CS_CX_APPOINTMENT_STATUSES: ["AGENDADO", "REALIZADO", "CANCELADO", "REMARCADO", "CONCLUIDO"],
  useCsCxContacts: () => ({
    contacts: Array.from({ length: 12 }, (_, index) => ({
      id: `contact-${index + 1}`,
      legacy_id: index + 1,
      contact_date:
        index === 11
          ? new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      notes: "Contato produtivo",
      pending_items:
        index === 0
          ? '{"root":{"children":[{"children":[{"text":"Acompanhar chamado pendente"}],"type":"paragraph"}]}}'
          : null,
      product_id: "product-1",
      contact_person: index === 0 ? "Maria" : `Pessoa ${index + 1}`,
      contact_details: index === 0 ? "maria@exemplo.com" : `pessoa${index + 1}@exemplo.com`,
      registry_office_id: index === 11 ? "office-3" : "office-1",
      ticket_number: null,
      author_profile_id: "profile-1",
      created_at: null,
      updated_at: null,
      origin: "legacy",
      product: { id: "product-1", name: "Orion" },
      products: [{ id: "product-1", name: "Orion", is_primary: true }],
      author: { id: "profile-1", full_name: "Bruno", email: null },
      registry_office:
        index === 11
          ? { id: "office-3", name: "Cartório Sul" }
          : { id: "office-1", name: "Cartório Central" },
    })),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    saveContact: mutation,
    deleteContact: mutation,
  }),
  useCsCxAppointments: () => ({
    appointments: Array.from({ length: 12 }, (_, index) => ({
      id: `appointment-${index + 1}`,
      legacy_id: index + 2,
      title: index === 0 ? "Reunião de acompanhamento" : `Agendamento ${index + 1}`,
      starts_at: "2026-08-15T13:00:00.000Z",
      duration_minutes: 60,
      appointment_type: "REUNIAO",
      status: "AGENDADO",
      registry_office_id: "office-1",
      contact_id: "contact-1",
      responsible_profile_id: "profile-1",
      created_by: "profile-1",
      description: null,
      location: "Online",
      notes: index === 0 ? "Observação cadastrada" : null,
      result: null,
      realized_at: null,
      canceled_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      origin: "legacy",
      registry_office: { id: "office-1", name: "Cartório Central" },
      contact: { id: "contact-1", contact_person: "Maria" },
      responsible: { id: "profile-1", full_name: "Bruno", email: null },
    })),
    profiles: [{ id: "profile-1", full_name: "Bruno", email: null }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    saveAppointment: mutation,
    setAppointmentStatus: mutation,
    deleteAppointment: mutation,
  }),
}));

import CsCxAppointments from "@/pages/cs-cx/CsCxAppointments";
import CsCxContacts from "@/pages/cs-cx/CsCxContacts";

function renderPage(page: React.ReactNode, permissions: string[]) {
  hasPermission.mockImplementation((resource: string, action: string) =>
    permissions.includes(`${resource}:${action}`),
  );
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("CS/CX contatos e agendamentos — permissões", () => {
  beforeEach(() => {
    hasPermission.mockReset();
    mutation.mutateAsync.mockReset();
    mutation.mutateAsync.mockResolvedValue(undefined);
  });

  it("mantém contatos em leitura e esconde criação", () => {
    renderPage(<CsCxContacts />, []);
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /visualizar contato de maria/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo contato/i })).not.toBeInTheDocument();
  });

  it("abre os detalhes do contato em modo somente leitura", () => {
    renderPage(<CsCxContacts />, []);

    fireEvent.click(
      screen.getByRole("button", { name: /visualizar contato de maria/i }),
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("Visualizar contato");
    expect(screen.getByRole("dialog")).toHaveTextContent("Cartório Central");
    expect(screen.getByRole("dialog")).toHaveTextContent("maria@exemplo.com");
    expect(screen.getByRole("dialog")).toHaveTextContent("Contato produtivo");
    expect(screen.queryByRole("button", { name: /salvar contato/i })).not.toBeInTheDocument();
  });

  it("libera criação de contatos com a permissão correta", () => {
    renderPage(<CsCxContacts />, ["cs_cx_contatos:create"]);
    expect(screen.getByRole("button", { name: /novo contato/i })).toBeInTheDocument();
  });

  it("pagina a lista de contatos em blocos compactos", () => {
    renderPage(<CsCxContacts />, []);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 contatos")).toBeInTheDocument();
    expect(screen.queryByText("Pessoa 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("Pessoa 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 6 a 10 de 12 contatos")).toBeInTheDocument();
  });

  it("oferece relatório, filtro por responsável e seleção de vários produtos", () => {
    renderPage(<CsCxContacts />, ["cs_cx_contatos:create"]);
    expect(screen.getByRole("button", { name: /exportar pdf/i })).toBeInTheDocument();
    expect(screen.getByText("Todos os responsáveis")).toBeInTheDocument();
    expect(screen.getByText("Todas as interações")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /novo contato/i }));
    expect(screen.getByRole("combobox", { name: /produtos do contato/i })).toBeInTheDocument();
  });

  it("abre o diálogo de nova solicitação a partir do modal de contato", () => {
    renderPage(<CsCxContacts />, ["cs_cx_contatos:create", "cs_cx_registros:create"]);

    fireEvent.click(screen.getByRole("button", { name: /novo contato/i }));
    const newRequestBtn = screen.getByRole("button", { name: /nova solicitação/i });
    expect(newRequestBtn).toBeInTheDocument();

    fireEvent.click(newRequestBtn);
    expect(screen.getByText("Nova solicitação (Registros)")).toBeInTheDocument();
  });

  it("filtra apenas contatos com pendências pelo card de métrica e pelo select", () => {
    renderPage(<CsCxContacts />, []);

    expect(screen.getByText("Pessoa 2")).toBeInTheDocument();

    // Clica na métrica "Com pendências"
    const pendingMetricCard = screen.getByText("Com pendências");
    fireEvent.click(pendingMetricCard);

    // Deve filtrar mostrando somente Maria
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.queryByText("Pessoa 2")).not.toBeInTheDocument();

    // Desativa clicando no card novamente
    fireEvent.click(pendingMetricCard);
    expect(screen.getByText("Pessoa 2")).toBeInTheDocument();
  });

  it("permite expandir o formulário de contato para tela cheia", () => {
    renderPage(<CsCxContacts />, ["cs_cx_contatos:create"]);
    fireEvent.click(screen.getByRole("button", { name: /novo contato/i }));

    const expand = screen.getByRole("button", {
      name: /ver formulário em tela cheia/i,
    });
    expect(screen.getAllByRole("button", { name: "Negrito" })).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Lista com marcadores" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Lista numerada" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Melhorar com IA" }),
    ).toHaveLength(2);
    fireEvent.click(expand);

    expect(screen.getByRole("dialog")).toHaveClass("h-[100dvh]");
    expect(
      screen.getByRole("button", { name: /sair da tela cheia/i }),
    ).toBeInTheDocument();
  });

  it("exibe o painel de cartórios que precisam de atenção", () => {
    renderPage(<CsCxContacts />, []);

    fireEvent.click(
      screen.getByRole("button", { name: /painel de atenção/i }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Cartórios que precisam de atenção");
    expect(dialog).toHaveTextContent("Cartório Norte");
    expect(dialog).toHaveTextContent("Nunca registrado");
    expect(dialog).toHaveTextContent("Cartório Sul");
    expect(dialog).toHaveTextContent("90+ dias");
    expect(dialog).toHaveTextContent("A atenção começa após 30 dias");
  });

  it("inicia um contato pelo painel com o cartório preenchido", () => {
    renderPage(<CsCxContacts />, ["cs_cx_contatos:create"]);
    fireEvent.click(
      screen.getByRole("button", { name: /painel de atenção/i }),
    );
    const northRow = screen.getByText("Cartório Norte").closest("tr");
    expect(northRow).not.toBeNull();
    fireEvent.click(within(northRow!).getByRole("button", { name: /registrar contato/i }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Novo contato");
    expect(
      screen.getByRole("combobox", { name: /cartórios do contato/i }),
    ).toHaveTextContent("Cartório Norte");
  });

  it("cria o mesmo contato para vários cartórios em uma única confirmação", async () => {
    renderPage(<CsCxContacts />, ["cs_cx_contatos:create"]);
    fireEvent.click(screen.getByRole("button", { name: /novo contato/i }));

    fireEvent.click(
      screen.getByRole("combobox", { name: /cartórios do contato/i }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Cartório Central" }));
    fireEvent.click(screen.getByRole("option", { name: "Cartório Norte" }));

    fireEvent.click(
      screen.getByRole("combobox", { name: /produtos do contato/i }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Orion" }));

    const contactPerson = screen.getByText("Pessoa de contato *")
      .parentElement?.querySelector("input");
    expect(contactPerson).not.toBeNull();
    fireEvent.change(contactPerson!, { target: { value: "Maria" } });

    fireEvent.click(
      screen.getByRole("button", { name: /salvar 2 contatos/i }),
    );

    await waitFor(() => expect(mutation.mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutation.mutateAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ registry_office_id: "office-1" }),
    );
    expect(mutation.mutateAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ registry_office_id: "office-2" }),
    );
  });

  it("mantém o período em duas linhas antes de telas 2xl", () => {
    renderPage(<CsCxContacts />, []);

    const filters = screen.getByLabelText("Data final").parentElement;
    expect(filters).toHaveClass("xl:grid-cols-[minmax(240px,1fr)_190px_170px]");
    expect(filters).toHaveClass(
      "2xl:grid-cols-[minmax(240px,1fr)_190px_170px_180px_145px_145px]",
    );
  });

  it("mantém agenda em leitura e esconde criação", () => {
    renderPage(<CsCxAppointments />, []);
    expect(screen.getByText("Reunião de acompanhamento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo agendamento/i })).not.toBeInTheDocument();
  });

  it("libera criação de agendamentos com a permissão correta", () => {
    renderPage(<CsCxAppointments />, ["cs_cx_agendamentos:create"]);
    expect(screen.getByRole("button", { name: /novo agendamento/i })).toBeInTheDocument();
  });

  it("permite informar cartório e contato livres para um cliente lead", () => {
    renderPage(<CsCxAppointments />, ["cs_cx_agendamentos:create"]);
    fireEvent.click(screen.getByRole("button", { name: /novo agendamento/i }));

    expect(screen.queryByLabelText("Cartório do lead")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /cliente lead/i }));

    expect(screen.getByLabelText("Cartório do lead")).toBeRequired();
    expect(screen.getByLabelText("Contato do lead")).toBeRequired();
    expect(screen.queryByText("Sem cartório")).not.toBeInTheDocument();
    expect(screen.queryByText("Sem contato")).not.toBeInTheDocument();
  });

  it("permite adicionar e remover várias observações no agendamento", () => {
    renderPage(<CsCxAppointments />, ["cs_cx_agendamentos:create"]);
    fireEvent.click(screen.getByRole("button", { name: /novo agendamento/i }));

    expect(screen.getByLabelText("Observação 1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Observação 1"), {
      target: { value: "Confirmar participantes" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /adicionar observação/i }),
    );

    expect(screen.getByLabelText("Observação 2")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /remover observação 1/i }),
    );
    expect(screen.getByLabelText("Observação 1")).toHaveValue("");
  });

  it("pagina a lista de agendamentos em blocos compactos", () => {
    renderPage(<CsCxAppointments />, []);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 agendamentos")).toBeInTheDocument();
    expect(screen.queryByText("Agendamento 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("Agendamento 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 6 a 10 de 12 agendamentos")).toBeInTheDocument();
  });

  it("oferece relatório e filtros de responsável e período nos agendamentos", () => {
    renderPage(<CsCxAppointments />, []);
    expect(screen.getByRole("button", { name: /exportar pdf/i })).toBeInTheDocument();
    expect(screen.getByText("Todos os responsáveis")).toBeInTheDocument();
    expect(screen.getByLabelText("Data inicial do agendamento")).toBeInTheDocument();
    expect(screen.getByLabelText("Data final do agendamento")).toBeInTheDocument();
  });
});
