import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommercialContacts from "./CommercialContacts";

const { useCommercialMock } = vi.hoisted(() => ({
  useCommercialMock: vi.fn(),
}));

vi.mock("@/hooks/useCommercial", () => ({
  useCommercial: () => useCommercialMock(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const longClientName =
  "Cartório de Registro de Imóveis e Tabelionato com identificação extensa";
const longContactName =
  "Responsável Comercial com nome completo muito extenso para o celular";

const clients = [
  { id: "client-1", name: longClientName },
  { id: "client-2", name: "Segundo cartório" },
];

const contacts = [
  {
    id: "contact-1",
    client_id: "client-1",
    name: longContactName,
    role: "Diretor administrativo e responsável por decisões estratégicas",
    email:
      "responsavel.comercial.com.email.muito.extenso@cartorio-exemplo.com.br",
    phone: "(11) 99999-9999 ramal 123456",
    notes:
      "Observação extensa que precisa quebrar corretamente dentro do cartão no celular.",
    clients: clients[0],
  },
  ...[2, 3, 4].map((index) => ({
    id: `contact-${index}`,
    client_id: "client-2",
    name: `Contato ${index}`,
    role: "Atendimento",
    email: `contato${index}@exemplo.com`,
    phone: `(11) 90000-000${index}`,
    notes: null,
    clients: clients[1],
  })),
];

describe("Contatos comerciais no mobile", () => {
  beforeEach(() => {
    useCommercialMock.mockReturnValue({
      clients,
      contacts,
      isLoadingContacts: false,
      createContact: { mutateAsync: vi.fn(), isPending: false },
      updateContact: { mutateAsync: vi.fn(), isPending: false },
      deleteContact: { mutateAsync: vi.fn(), isPending: false },
    });
  });

  it("usa filtros fluidos, cartões legíveis e três contatos por página", () => {
    render(<CommercialContacts />);

    expect(screen.getByTestId("commercial-contacts-page")).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
      "md:h-[calc(100vh-6rem)]",
    );
    expect(screen.getByTestId("commercial-contacts-filters")).toHaveClass(
      "min-w-0",
    );
    expect(screen.getByLabelText("Filtrar contatos por cliente")).toHaveClass(
      "w-full",
      "min-w-0",
    );
    expect(
      screen.getByTestId("commercial-contacts-client-sidebar"),
    ).toHaveClass("hidden", "lg:flex");

    expect(screen.getAllByTestId("commercial-contact-card")).toHaveLength(3);
    expect(screen.getAllByTestId("commercial-contact-name")[0]).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(screen.getByText(longContactName)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Ações para ${longContactName}` }),
    ).toHaveClass("opacity-100", "lg:opacity-0");

    const pagination = screen.getByTestId("commercial-contacts-pagination");
    expect(pagination).toHaveTextContent("Mostrando 1–3 de 4");
    expect(screen.getByLabelText("Contatos por página")).toHaveTextContent("3");

    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));

    expect(screen.getAllByTestId("commercial-contact-card")).toHaveLength(1);
    expect(pagination).toHaveTextContent("Mostrando 4–4 de 4");
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("mantém o formulário dentro do viewport e empilha os campos no celular", () => {
    render(<CommercialContacts />);

    fireEvent.click(screen.getByRole("button", { name: "Novo Contato" }));

    const dialog = screen.getByTestId("commercial-contact-dialog");
    expect(dialog).toHaveClass(
      "max-h-[calc(100dvh-1rem)]",
      "w-[calc(100vw-1rem)]",
      "min-w-0",
      "overflow-hidden",
    );
    expect(
      within(dialog).getByTestId("commercial-contact-primary-fields"),
    ).toHaveClass("grid-cols-1", "sm:grid-cols-2");
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" }),
    ).toHaveClass("w-full", "sm:w-auto");
    expect(
      within(dialog).getByRole("button", { name: "Salvar Contato" }),
    ).toHaveClass("w-full", "sm:w-auto");
  });

  it("mostra estado vazio e permite limpar os filtros", () => {
    render(<CommercialContacts />);

    fireEvent.change(screen.getByLabelText("Buscar contato"), {
      target: { value: "contato inexistente" },
    });

    expect(
      screen.getByTestId("commercial-contacts-empty-state"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(
      screen.queryByTestId("commercial-contacts-empty-state"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId("commercial-contact-card")).toHaveLength(3);
  });
});
