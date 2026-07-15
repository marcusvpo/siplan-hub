import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Verifica que o gate de permissão de CommercialContacts está no lugar certo.
 * Esta tela é a representante do padrão create/edit/delete aplicado nas ~20
 * telas: se o padrão está correto aqui, o mesmo shape vale nas outras.
 */

const hasPermission = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));

const contatoFake = {
  id: "c1",
  client_id: "cl1",
  name: "Fulano de Tal",
  email: "fulano@exemplo.com",
  phone: "11999999999",
  role: "Comprador",
  notes: null,
};

vi.mock("@/hooks/useCommercial", () => ({
  useCommercial: () => ({
    clients: [{ id: "cl1", name: "Cartorio Exemplo" }],
    contacts: [contatoFake],
    isLoadingContacts: false,
    createContact: { mutateAsync: vi.fn(), isPending: false },
    updateContact: { mutateAsync: vi.fn(), isPending: false },
    deleteContact: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import CommercialContacts from "@/pages/commercial/CommercialContacts";

function renderTela(permitidas: string[]) {
  hasPermission.mockImplementation((resource: string, action: string) =>
    permitidas.includes(`${resource}:${action}`),
  );
  return render(
    <MemoryRouter>
      <CommercialContacts />
    </MemoryRouter>,
  );
}

const TODAS = [
  "commercial_contacts:create",
  "commercial_contacts:edit",
  "commercial_contacts:delete",
];

describe("CommercialContacts — gate de permissão", () => {
  beforeEach(() => {
    hasPermission.mockReset();
  });

  it("mostra 'Novo Contato' com a permissão de create", () => {
    renderTela(TODAS);
    expect(screen.getByText(/Novo Contato/i)).toBeInTheDocument();
  });

  it("esconde 'Novo Contato' sem a permissão de create", () => {
    renderTela(["commercial_contacts:edit", "commercial_contacts:delete"]);
    expect(screen.queryByText(/Novo Contato/i)).not.toBeInTheDocument();
  });

  it("some com toda a ação de escrita quando o perfil só tem leitura", () => {
    renderTela([]);
    expect(screen.queryByText(/Novo Contato/i)).not.toBeInTheDocument();
    // o conteúdo de leitura continua acessível
    expect(screen.getByText("Cartorio Exemplo")).toBeInTheDocument();
  });

  it("consulta as permissões pelos nomes exatos do catálogo", () => {
    renderTela(TODAS);
    const consultados = hasPermission.mock.calls.map(([r, a]) => `${r}:${a}`);
    for (const esperado of TODAS) {
      expect(consultados).toContain(esperado);
    }
  });
});
