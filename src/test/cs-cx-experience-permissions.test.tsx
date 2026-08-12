import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const hasPermission = vi.fn();
const mutation = { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false };

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));
vi.mock("@/hooks/useModelGenerationJobs", () => ({
  useModelWorkerStatus: () => ({ online: true, busy: false, status: null }),
}));
vi.mock("@/hooks/useCsCxNpsAiReport", () => ({
  useCsCxNpsAiReport: () => ({
    generate: vi.fn(),
    active: undefined,
    latest: undefined,
    latestError: undefined,
  }),
}));
vi.mock("@/hooks/useCsCxCore", () => ({
  useCsCxRegistryOffices: () => ({
    offices: [{ id: "office-1", name: "Cartório Central", active: true }],
  }),
}));
vi.mock("@/hooks/useCsCxEngagement", () => ({
  useCsCxContacts: () => ({ contacts: [] }),
}));
vi.mock("@/hooks/useCsCxNpsSurveys", () => ({
  effectiveInvitationStatus: (invitation: { status: string }) =>
    invitation.status,
  useCsCxNpsSurveys: () => ({
    questionnaires: [],
    invitations: [],
    createInvitation: mutation,
    cancelInvitation: mutation,
    saveQuestionnaire: mutation,
    uploadQuestionnaireBackground: mutation,
    setQuestionnaireActive: mutation,
    setDefaultQuestionnaire: mutation,
  }),
}));
vi.mock("@/hooks/useCsCxExperience", () => ({
  CS_CX_VISIT_STATUSES: ["aberto", "emandamento", "concluido", "reaberto"],
  useCsCxVisits: () => ({
    visits: Array.from({ length: 12 }, (_, index) => ({
      id: `visit-${index + 1}`,
      legacy_id: index + 1,
      registry_office_id: "office-1",
      visitor_profile_id: "profile-1",
      visit_date: "2026-08-10",
      start_time: "09:00:00",
      end_time: "11:00:00",
      status: "aberto",
      objective:
        index === 0 ? "Acompanhar operação" : `Objetivo da visita ${index + 1}`,
      general_notes: null,
      origin: "legacy",
      registry_office: {
        id: "office-1",
        name: index === 0 ? "Cartório Central" : `Cartório ${index + 1}`,
      },
      visitor: {
        id: "profile-1",
        full_name: index === 0 ? "Bruno" : `Visitante ${index + 1}`,
      },
      checklist: [],
      pending_items: [
        {
          id: `pending-${index + 1}`,
          title: "Revisar cadastro",
          description: "Conferir dados",
          priority: "media",
          category: null,
          notes: null,
          due_date: null,
          status: "pendente",
          request_id: null,
        },
      ],
      attachments: [],
    })),
    profiles: [{ id: "profile-1", full_name: "Bruno" }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    saveVisit: mutation,
    setVisitStatus: mutation,
    toggleChecklist: mutation,
    saveChecklistItem: mutation,
    deleteChecklistItem: mutation,
    savePendingItem: mutation,
    deletePendingItem: mutation,
    generateRequest: mutation,
    uploadAttachment: mutation,
    deleteAttachment: mutation,
    downloadAttachment: vi.fn(),
    deleteVisit: mutation,
  }),
  useCsCxNps: () => ({
    responses: Array.from({ length: 12 }, (_, index) => ({
      id: `nps-${index + 1}`,
      legacy_id: index + 1,
      registry_office_id: "office-1",
      responded_at: "2026-08-10T12:00:00Z",
      respondent_name: index === 0 ? "Maria" : `Respondente ${index + 1}`,
      respondent_office:
        index === 0 ? "Cartório Central" : `Cartório ${index + 1}`,
      score: index === 1 ? 8 : index === 2 ? 5 : 10,
      score_reason: index === 0 ? "Ótimo atendimento" : `Motivo ${index + 1}`,
      improvement_suggestion: null,
      classification:
        index === 1 ? "NEUTRO" : index === 2 ? "DETRATOR" : "PROMOTOR",
      origin: "legacy",
      registry_office: {
        id: "office-1",
        name: index === 0 ? "Cartório Central" : `Cartório ${index + 1}`,
      },
    })),
    history: Array.from({ length: 7 }, (_, index) => ({
      id: `history-${index + 1}`,
      registry_office_id: "office-1",
      period_start: `2026-0${index + 1}-01`,
      period_end: `2026-0${index + 1}-28`,
      total_responses: index + 1,
      total_promoters: index + 1,
      total_neutrals: 0,
      total_detractors: 0,
      nps_score: 100,
      registry_office: { id: "office-1", name: `Histórico ${index + 1}` },
    })),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    saveResponse: mutation,
    deleteResponse: mutation,
    importResponses: mutation,
  }),
}));

import CsCxNps from "@/pages/cs-cx/CsCxNps";
import CsCxVisits from "@/pages/cs-cx/CsCxVisits";

function renderPage(page: React.ReactNode, permissions: string[]) {
  hasPermission.mockImplementation((resource: string, action: string) =>
    permissions.includes(`${resource}:${action}`),
  );
  return render(page);
}

describe("CS/CX visitas e NPS — permissões", () => {
  beforeEach(() => hasPermission.mockReset());

  it("mantém visitas em leitura sem liberar escrita", () => {
    renderPage(<CsCxVisits />, []);
    expect(screen.getByText("Acompanhar operação")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /nova visita/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /excluir visita/i }),
    ).not.toBeInTheDocument();
  });

  it("libera criação de visitas com a permissão correta", () => {
    renderPage(<CsCxVisits />, ["cs_cx_visitas:create"]);
    expect(
      screen.getByRole("button", { name: /nova visita/i }),
    ).toBeInTheDocument();
  });

  it("pagina a lista de visitas em blocos compactos", () => {
    renderPage(<CsCxVisits />, []);
    expect(
      screen.getByLabelText("Mostrando 1 a 5 de 12 visitas"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Objetivo da visita 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(screen.getByText("Objetivo da visita 6")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Mostrando 6 a 10 de 12 visitas"),
    ).toBeInTheDocument();
  });

  it("exige permissão de solicitações para gerar uma a partir da visita", () => {
    const { rerender } = renderPage(<CsCxVisits />, ["cs_cx_visitas:edit"]);
    fireEvent.click(screen.getAllByRole("button", { name: /detalhes/i })[0]);
    expect(
      screen.queryByRole("button", { name: /gerar solicitação/i }),
    ).not.toBeInTheDocument();

    hasPermission.mockImplementation((resource: string, action: string) =>
      ["cs_cx_visitas:edit", "cs_cx_registros:create"].includes(
        `${resource}:${action}`,
      ),
    );
    rerender(<CsCxVisits />);
    expect(
      screen.getByRole("button", { name: /gerar solicitação/i }),
    ).toBeInTheDocument();
  });

  it("mantém NPS em leitura sem liberar escrita", () => {
    renderPage(<CsCxNps />, []);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /respostas/i }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /registrar manualmente/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /solicitar nps/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /excluir resposta/i }),
    ).not.toBeInTheDocument();
  });

  it("permite solicitar NPS sem liberar inclusão ou importação de respostas", () => {
    renderPage(<CsCxNps />, ["cs_cx_nps:create"]);
    expect(
      screen.getByRole("button", { name: /solicitar nps/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /registrar manualmente/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /importar arquivo/i }),
    ).not.toBeInTheDocument();
  });

  it("oferece personalização visual por questionário", () => {
    renderPage(<CsCxNps />, ["cs_cx_nps:create"]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /questionários/i }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(
      screen.getByRole("button", { name: /novo questionário/i }),
    );

    expect(screen.getByLabelText("Cor principal")).toBeInTheDocument();
    expect(screen.getByLabelText("Cor de fundo")).toBeInTheDocument();
    expect(screen.getByLabelText(/escolher imagem/i)).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    expect(screen.getByText("Pré-visualização")).toBeInTheDocument();
  });

  it("mantém respostas somente para visualização mesmo com permissão de edição", () => {
    renderPage(<CsCxNps />, ["cs_cx_nps:edit"]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /respostas/i }), {
      button: 0,
      ctrlKey: false,
    });
    expect(
      screen.queryByRole("button", { name: /editar resposta/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: /visualizar resposta/i })[0],
    );
    expect(screen.getByText("Visualizar resposta NPS")).toBeInTheDocument();
    expect(screen.getByText(/somente leitura/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /salvar/i })).not.toBeInTheDocument();
  });

  it("diferencia visualmente promotores, neutros e detratores", () => {
    renderPage(<CsCxNps />, []);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /respostas/i }), {
      button: 0,
      ctrlKey: false,
    });

    for (const badge of screen.getAllByText("Promotor")) {
      expect(badge).toHaveClass("bg-success");
    }
    expect(screen.getByText("Neutro")).toHaveClass("bg-warning");
    expect(screen.getByText("Detrator")).toHaveClass("bg-critical");
  });

  it("pagina respostas e histórico de NPS em blocos compactos", () => {
    renderPage(<CsCxNps />, []);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /respostas/i }), {
      button: 0,
      ctrlKey: false,
    });
    expect(
      screen.getByLabelText("Mostrando 1 a 5 de 12 respostas"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Respondente 6")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /próxima página de respostas/i }),
    );

    expect(screen.getByText("Respondente 6")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Mostrando 6 a 10 de 12 respostas"),
    ).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /histórico/i }), {
      button: 0,
      ctrlKey: false,
    });
    expect(
      screen.getByText("Fechamentos históricos de NPS"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/cada linha representa o resultado de um cartório/i),
    ).toBeInTheDocument();
    expect(screen.getByText("7 fechamentos")).toBeInTheDocument();
    expect(screen.getByText("28 respostas consolidadas")).toBeInTheDocument();
    expect(screen.getAllByText("Zona de excelência")).toHaveLength(5);
    expect(
      screen.getByLabelText("Mostrando 1 a 5 de 7 períodos"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Histórico 6")).not.toBeInTheDocument();
  });

  it("exibe o BI de NPS e restringe a geração com IA pela permissão", () => {
    const { rerender } = renderPage(<CsCxNps />, []);
    expect(screen.getByText("Evolução mensal do NPS")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /gerar relatório com ia/i }),
    ).not.toBeInTheDocument();

    hasPermission.mockImplementation((resource: string, action: string) =>
      ["cs_cx_nps:create"].includes(`${resource}:${action}`),
    );
    rerender(<CsCxNps />);
    expect(
      screen.getByRole("button", { name: /gerar relatório com ia/i }),
    ).toBeInTheDocument();
  });
});
