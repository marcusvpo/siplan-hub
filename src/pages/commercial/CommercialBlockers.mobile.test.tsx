import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommercialBlockers from "./CommercialBlockers";

const { useCommercialMock, invalidateQueriesMock } = vi.hoisted(() => ({
  useCommercialMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
}));

vi.mock("@/hooks/useCommercial", () => ({
  useCommercial: () => useCommercialMock(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
  };
});

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/ui/rich-text-editor", () => ({
  RichTextEditor: () => <div data-testid="rich-text-editor" />,
}));

const longClientName =
  "Cartório de Registro de Imóveis e Tabelionato com nome muito extenso para o celular";
const longReason =
  "Servidor sem acesso e estações aguardando uma configuração de infraestrutura detalhada e extensa";

const blockedProject = {
  id: "blocked-project",
  client_name: longClientName,
  system_type: "Sistema corporativo com identificação bastante extensa",
  global_status: "in-progress",
  post_status: "pending",
  infra_status: "blocked",
  infra_blocking_reason: longReason,
  infra_workstations_status: "Aguardando liberação técnica das estações",
  infra_server_status: "Servidor ainda indisponível para acesso remoto",
  updated_at: "2026-08-20T12:00:00.000Z",
  ticket_number: "CHAMADO-COM-IDENTIFICADOR-MUITO-LONGO-123456789",
  sold_hours: 24,
  commercial_notes: "",
  tags: [],
};

const blockedProjects = [
  blockedProject,
  ...[1, 2, 3].map((index) => ({
    ...blockedProject,
    id: `blocked-project-${index}`,
    client_name: `Cartório com bloqueio ${index}`,
    updated_at: `2026-08-${20 + index}T12:00:00.000Z`,
    ticket_number: `CHAMADO-${index}`,
  })),
];

describe("Central de Bloqueios no mobile", () => {
  beforeEach(() => {
    localStorage.clear();
    invalidateQueriesMock.mockReset();
    useCommercialMock.mockReturnValue({
      projectsWithClients: blockedProjects,
      isLoadingProjects: false,
    });
  });

  it("mantém filtros, cartões e textos longos dentro da largura disponível", () => {
    render(<CommercialBlockers />);

    expect(screen.getByTestId("commercial-blockers-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
      "md:h-[calc(100vh-6rem)]",
    );
    expect(screen.getByTestId("commercial-blockers-filters")).toHaveClass(
      "min-w-0",
    );
    expect(screen.getByLabelText("Filtrar bloqueios por sistema")).toHaveClass(
      "w-full",
      "min-w-0",
    );

    const card = screen.getAllByTestId("commercial-blocker-card")[0];
    expect(card).toHaveClass("min-w-0", "overflow-hidden");
    expect(screen.getAllByTestId("commercial-blocker-client-name")[0]).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(screen.getAllByTestId("commercial-blocker-reason")[0]).toHaveClass(
      "break-words",
    );
    expect(screen.getAllByText(longReason)[0]).toBeInTheDocument();
  });

  it("abre o detalhamento por teclado com conteúdo e ações empilhados no celular", () => {
    render(<CommercialBlockers />);

    fireEvent.keyDown(screen.getAllByTestId("commercial-blocker-card")[0], {
      key: "Enter",
    });

    const dialog = screen.getByTestId("commercial-blocker-dialog");
    expect(dialog).toHaveClass(
      "max-h-[calc(100dvh-1rem)]",
      "w-[calc(100vw-1rem)]",
      "min-w-0",
      "overflow-x-hidden",
    );
    expect(within(dialog).getByText(longClientName)).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(within(dialog).getByRole("button", { name: "Fechar" })).toHaveClass(
      "w-full",
      "sm:w-auto",
    );
    expect(
      within(dialog).getByRole("button", { name: "Salvar Observações" }),
    ).toHaveClass("w-full", "sm:w-auto");
    expect(
      within(dialog).getByRole("button", { name: "Marcar como Resolvido" }),
    ).toHaveClass("w-full", "sm:w-auto");
  });

  it("oferece estado vazio e limpeza dos filtros no mobile", () => {
    render(<CommercialBlockers />);

    fireEvent.change(screen.getByLabelText("Buscar bloqueio"), {
      target: { value: "bloqueio inexistente" },
    });

    expect(screen.getByTestId("commercial-blockers-empty-state")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.queryByTestId("commercial-blockers-empty-state")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("commercial-blocker-card")).toHaveLength(3);
  });

  it("pagina três bloqueios por padrão no mobile", () => {
    render(<CommercialBlockers />);

    expect(screen.getAllByTestId("commercial-blocker-card")).toHaveLength(3);
    expect(screen.getByTestId("commercial-blockers-pagination")).toHaveTextContent(
      "Mostrando 1–3 de 4",
    );
    expect(screen.getByLabelText("Bloqueios por página")).toHaveTextContent("3");

    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));

    expect(screen.getAllByTestId("commercial-blocker-card")).toHaveLength(1);
    expect(screen.getByTestId("commercial-blockers-pagination")).toHaveTextContent(
      "Mostrando 4–4 de 4",
    );
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });
});
