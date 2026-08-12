import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
    offices: [{ id: "office-1", name: "Cartório Central", active: true }],
    products: [{ id: "product-1", name: "Orion", product_code: "ORI" }],
    error: null,
  }),
}));

vi.mock("@/hooks/useCsCxEngagement", () => ({
  CS_CX_APPOINTMENT_TYPES: ["REUNIAO", "CALL", "VISITA", "OUTRO"],
  CS_CX_APPOINTMENT_STATUSES: ["AGENDADO", "REALIZADO", "CANCELADO", "REMARCADO", "CONCLUIDO"],
  useCsCxContacts: () => ({
    contacts: Array.from({ length: 12 }, (_, index) => ({
      id: `contact-${index + 1}`,
      legacy_id: index + 1,
      contact_date: "2026-08-10",
      notes: "Contato produtivo",
      pending_items: null,
      product_id: "product-1",
      contact_person: index === 0 ? "Maria" : `Pessoa ${index + 1}`,
      contact_details: index === 0 ? "maria@exemplo.com" : `pessoa${index + 1}@exemplo.com`,
      registry_office_id: "office-1",
      ticket_number: null,
      author_profile_id: null,
      created_at: null,
      updated_at: null,
      origin: "legacy",
      product: { id: "product-1", name: "Orion" },
      registry_office: { id: "office-1", name: "Cartório Central" },
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
      notes: null,
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
  beforeEach(() => hasPermission.mockReset());

  it("mantém contatos em leitura e esconde criação", () => {
    renderPage(<CsCxContacts />, []);
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo contato/i })).not.toBeInTheDocument();
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

  it("mantém agenda em leitura e esconde criação", () => {
    renderPage(<CsCxAppointments />, []);
    expect(screen.getByText("Reunião de acompanhamento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo agendamento/i })).not.toBeInTheDocument();
  });

  it("libera criação de agendamentos com a permissão correta", () => {
    renderPage(<CsCxAppointments />, ["cs_cx_agendamentos:create"]);
    expect(screen.getByRole("button", { name: /novo agendamento/i })).toBeInTheDocument();
  });

  it("pagina a lista de agendamentos em blocos compactos", () => {
    renderPage(<CsCxAppointments />, []);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 agendamentos")).toBeInTheDocument();
    expect(screen.queryByText("Agendamento 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("Agendamento 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 6 a 10 de 12 agendamentos")).toBeInTheDocument();
  });
});
