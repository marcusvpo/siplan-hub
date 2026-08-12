import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const hasPermission = vi.fn();
const mutation = { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false };

vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ hasPermission }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useCsCxCore", () => ({
  useCsCxRegistryOffices: () => ({ offices: [{ id: "office-1", name: "Cartório Central" }] }),
}));
vi.mock("@/hooks/useCsCxExperience", () => ({
  CS_CX_VISIT_STATUSES: ["aberto", "emandamento", "concluido", "reaberto"],
  useCsCxVisits: () => ({
    visits: Array.from({ length: 12 }, (_, index) => ({
      id: `visit-${index + 1}`, legacy_id: index + 1, registry_office_id: "office-1", visitor_profile_id: "profile-1",
      visit_date: "2026-08-10", start_time: "09:00:00", end_time: "11:00:00", status: "aberto",
      objective: index === 0 ? "Acompanhar operação" : `Objetivo da visita ${index + 1}`, general_notes: null, origin: "legacy",
      registry_office: { id: "office-1", name: index === 0 ? "Cartório Central" : `Cartório ${index + 1}` }, visitor: { id: "profile-1", full_name: index === 0 ? "Bruno" : `Visitante ${index + 1}` },
      checklist: [], pending_items: [{
        id: `pending-${index + 1}`, title: "Revisar cadastro", description: "Conferir dados", priority: "media",
        category: null, notes: null, due_date: null, status: "pendente", request_id: null,
      }], attachments: [],
    })),
    profiles: [{ id: "profile-1", full_name: "Bruno" }], isLoading: false, error: null, refetch: vi.fn(),
    saveVisit: mutation, setVisitStatus: mutation, toggleChecklist: mutation,
    saveChecklistItem: mutation, deleteChecklistItem: mutation, savePendingItem: mutation,
    deletePendingItem: mutation, generateRequest: mutation, uploadAttachment: mutation,
    deleteAttachment: mutation, downloadAttachment: vi.fn(), deleteVisit: mutation,
  }),
  useCsCxNps: () => ({
    responses: [{
      id: "nps-1", legacy_id: 1, registry_office_id: "office-1", responded_at: "2026-08-10T12:00:00Z",
      respondent_name: "Maria", respondent_office: "Cartório Central", score: 10, score_reason: "Ótimo atendimento",
      improvement_suggestion: null, classification: "PROMOTOR", origin: "legacy",
      registry_office: { id: "office-1", name: "Cartório Central" },
    }],
    history: [], isLoading: false, error: null, refetch: vi.fn(), saveResponse: mutation,
    deleteResponse: mutation, importResponses: mutation,
  }),
}));

import CsCxNps from "@/pages/cs-cx/CsCxNps";
import CsCxVisits from "@/pages/cs-cx/CsCxVisits";

function renderPage(page: React.ReactNode, permissions: string[]) {
  hasPermission.mockImplementation((resource: string, action: string) => permissions.includes(`${resource}:${action}`));
  return render(page);
}

describe("CS/CX visitas e NPS — permissões", () => {
  beforeEach(() => hasPermission.mockReset());

  it("mantém visitas em leitura sem liberar escrita", () => {
    renderPage(<CsCxVisits />, []);
    expect(screen.getByText("Acompanhar operação")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nova visita/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir visita/i })).not.toBeInTheDocument();
  });

  it("libera criação de visitas com a permissão correta", () => {
    renderPage(<CsCxVisits />, ["cs_cx_visitas:create"]);
    expect(screen.getByRole("button", { name: /nova visita/i })).toBeInTheDocument();
  });

  it("pagina a lista de visitas em blocos compactos", () => {
    renderPage(<CsCxVisits />, []);
    expect(screen.getByLabelText("Mostrando 1 a 5 de 12 visitas")).toBeInTheDocument();
    expect(screen.queryByText("Objetivo da visita 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("Objetivo da visita 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Mostrando 6 a 10 de 12 visitas")).toBeInTheDocument();
  });

  it("exige permissão de solicitações para gerar uma a partir da visita", () => {
    const { rerender } = renderPage(<CsCxVisits />, ["cs_cx_visitas:edit"]);
    fireEvent.click(screen.getAllByRole("button", { name: /detalhes/i })[0]);
    expect(screen.queryByRole("button", { name: /gerar solicitação/i })).not.toBeInTheDocument();

    hasPermission.mockImplementation((resource: string, action: string) => [
      "cs_cx_visitas:edit", "cs_cx_registros:create",
    ].includes(`${resource}:${action}`));
    rerender(<CsCxVisits />);
    expect(screen.getByRole("button", { name: /gerar solicitação/i })).toBeInTheDocument();
  });

  it("mantém NPS em leitura sem liberar escrita", () => {
    renderPage(<CsCxNps />, []);
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nova resposta/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir resposta/i })).not.toBeInTheDocument();
  });

  it("libera criação de NPS com a permissão correta", () => {
    renderPage(<CsCxNps />, ["cs_cx_nps:create"]);
    expect(screen.getByRole("button", { name: /nova resposta/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /importar arquivo/i })).toBeInTheDocument();
  });
});
