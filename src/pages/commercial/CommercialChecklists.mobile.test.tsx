import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommercialChecklists from "./CommercialChecklists";
import { DeploymentFormFields } from "@/components/commercial/DeploymentFormFields";
import type { DeploymentFormData } from "@/utils/deployment-template";

const {
  useCommercialChecklistsMock,
  useDeploymentFormsMock,
  useProjectsV2Mock,
} = vi.hoisted(() => ({
  useCommercialChecklistsMock: vi.fn(),
  useDeploymentFormsMock: vi.fn(),
  useProjectsV2Mock: vi.fn(),
}));

vi.mock("@/hooks/useCommercialChecklists", () => ({
  useCommercialChecklists: () => useCommercialChecklistsMock(),
}));

vi.mock("@/hooks/useDeploymentForms", () => ({
  useDeploymentForms: () => useDeploymentFormsMock(),
}));

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => useProjectsV2Mock(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ fullName: "Usuário Comercial" }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({ data: null, isLoading: false }),
  };
});

const longClientName =
  "Cartório de Registro de Imóveis e Tabelionato com identificação muito extensa";

const checklists = [
  {
    id: "checklist-1",
    project_id: "project-1",
    status: "pending",
    responses: {},
    created_at: "2026-08-20T12:00:00.000Z",
    updated_at: "2026-08-20T12:00:00.000Z",
    created_by_name: "Responsável comercial com nome bastante extenso",
    projects: {
      id: "project-1",
      clientName: longClientName,
      ticketNumber: "CHAMADO-COM-IDENTIFICADOR-MUITO-LONGO-123456",
      systemType: "Sistema corporativo com identificação extensa",
      globalStatus: "in-progress",
    },
  },
  ...[2, 3, 4].map((index) => ({
    id: `checklist-${index}`,
    project_id: `project-${index}`,
    status: index === 2 ? "submitted" : "pending",
    responses: {},
    created_at: `2026-08-2${index}T12:00:00.000Z`,
    updated_at: `2026-08-2${index}T12:00:00.000Z`,
    created_by_name: `Comercial ${index}`,
    projects: {
      id: `project-${index}`,
      clientName: `Cartório ${index}`,
      ticketNumber: `CHAMADO-${index}`,
      systemType: "Orion TN",
      globalStatus: "in-progress",
    },
  })),
];

const forms = checklists.map((checklist, index) => ({
  id: `form-${index + 1}`,
  ticket_number: checklist.projects.ticketNumber,
  client_name: checklist.projects.clientName,
  contracted_system: checklist.projects.systemType,
  urgency_level: "normal",
  filled_by: "Usuário Comercial",
  created_at: "2026-08-20T12:00:00.000Z",
}));

describe("Checklists comerciais no mobile", () => {
  beforeEach(() => {
    useCommercialChecklistsMock.mockReturnValue({
      checklists,
      isLoading: false,
      createChecklist: { mutate: vi.fn(), isPending: false },
      deleteChecklist: { mutate: vi.fn(), isPending: false },
    });
    useDeploymentFormsMock.mockReturnValue({
      forms,
      isLoading: false,
      createForm: { mutate: vi.fn(), isPending: false },
      updateForm: { mutate: vi.fn(), isPending: false },
    });
    useProjectsV2Mock.mockReturnValue({
      projects: [],
      isLoading: false,
      updateProject: { mutate: vi.fn(), isPending: false },
    });
  });

  it("organiza filtros, cartões e paginação sem ampliar a tela", () => {
    render(<CommercialChecklists />);

    expect(screen.getByTestId("commercial-checklists-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
      "md:h-[calc(100vh-6rem)]",
    );
    expect(screen.getByTestId("commercial-checklists-filters")).toHaveClass(
      "min-w-0",
    );
    expect(screen.getByLabelText("Filtrar checklists por status")).toHaveClass(
      "w-full",
      "min-w-0",
    );
    expect(screen.getAllByTestId("commercial-checklist-card")).toHaveLength(3);
    expect(
      screen.getAllByTestId("commercial-checklist-client-name")[0],
    ).toHaveClass("min-w-0", "break-words");
    expect(
      screen.getByRole("button", {
        name: `Excluir checklist de ${longClientName}`,
      }),
    ).toHaveClass("opacity-100", "md:opacity-0");

    const pagination = screen.getByTestId("commercial-checklists-pagination");
    expect(pagination).toHaveTextContent("Mostrando 1–3 de 4");
    expect(screen.getByLabelText("Checklists por página")).toHaveTextContent(
      "3",
    );
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(screen.getAllByTestId("commercial-checklist-card")).toHaveLength(1);
    expect(pagination).toHaveTextContent("Mostrando 4–4 de 4");
  });

  it("abre os detalhes em um modal seguro para o viewport", () => {
    render(<CommercialChecklists />);

    fireEvent.keyDown(
      screen.getByRole("button", {
        name: `Abrir checklist de ${longClientName}`,
      }),
      { key: "Enter" },
    );

    const dialog = screen.getByTestId("commercial-checklist-dialog");
    expect(dialog).toHaveClass(
      "max-h-[calc(100dvh-1rem)]",
      "w-[calc(100vw-1rem)]",
      "min-w-0",
      "overflow-hidden",
    );
    expect(within(dialog).getByText(longClientName)).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(within(dialog).getByRole("tablist")).toHaveClass(
      "w-full",
      "grid-cols-2",
    );
    expect(within(dialog).getByRole("button", { name: "Fechar" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
  });

  it("empilha o cabeçalho e as ações do fluxo de criação", () => {
    render(<CommercialChecklists />);

    fireEvent.click(screen.getByRole("button", { name: "Novo Checklist" }));

    expect(screen.getByTestId("commercial-checklist-create-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
    );
    expect(
      screen.getByRole("button", { name: "Voltar para checklists" }),
    ).toHaveClass("shrink-0");
    expect(
      screen.getByRole("button", { name: "Salvar e Liberar Link" }),
    ).toHaveClass("w-full", "whitespace-normal", "sm:w-auto");
    expect(screen.getByRole("combobox")).toHaveClass("w-full", "min-w-0");
  });

  it("mantém as grades do formulário comercial em uma coluna no celular", () => {
    const data = {
      client_name: "Cartório",
      ticket_number: "123",
      contracted_system: "Orion PRO",
      urgency_level: "normal",
      module_lcw: false,
      module_on_hand: false,
      module_sga: false,
      module_editor_modelos: false,
      module_website: false,
      module_other: false,
    } as DeploymentFormData;

    render(<DeploymentFormFields data={data} onChange={vi.fn()} />);

    expect(screen.getByTestId("deployment-form-fields")).toHaveClass("min-w-0");
    expect(screen.getByTestId("deployment-form-hours-grid")).toHaveClass(
      "grid-cols-1",
      "sm:grid-cols-2",
    );
    expect(
      screen.getByTestId("deployment-form-official-contact-grid"),
    ).toHaveClass("grid-cols-1", "sm:grid-cols-3");
  });
});
