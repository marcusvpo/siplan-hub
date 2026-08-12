import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
    visits: [{
      id: "visit-1", legacy_id: 1, registry_office_id: "office-1", visitor_profile_id: "profile-1",
      visit_date: "2026-08-10", start_time: "09:00:00", end_time: "11:00:00", status: "aberto",
      objective: "Acompanhar operação", general_notes: null, origin: "legacy",
      registry_office: { id: "office-1", name: "Cartório Central" }, visitor: { id: "profile-1", full_name: "Bruno" },
      checklist: [], pending_items: [],
    }],
    profiles: [{ id: "profile-1", full_name: "Bruno" }], isLoading: false, error: null, refetch: vi.fn(),
    saveVisit: mutation, setVisitStatus: mutation, toggleChecklist: mutation, deleteVisit: mutation,
  }),
  useCsCxNps: () => ({
    responses: [{
      id: "nps-1", legacy_id: 1, registry_office_id: "office-1", responded_at: "2026-08-10T12:00:00Z",
      respondent_name: "Maria", respondent_office: "Cartório Central", score: 10, score_reason: "Ótimo atendimento",
      improvement_suggestion: null, classification: "PROMOTOR", origin: "legacy",
      registry_office: { id: "office-1", name: "Cartório Central" },
    }],
    history: [], isLoading: false, error: null, refetch: vi.fn(), saveResponse: mutation, deleteResponse: mutation,
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

  it("mantém NPS em leitura sem liberar escrita", () => {
    renderPage(<CsCxNps />, []);
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nova resposta/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir resposta/i })).not.toBeInTheDocument();
  });

  it("libera criação de NPS com a permissão correta", () => {
    renderPage(<CsCxNps />, ["cs_cx_nps:create"]);
    expect(screen.getByRole("button", { name: /nova resposta/i })).toBeInTheDocument();
  });
});
