import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectAdherenceForm from "@/pages/ProjectAdherenceForm";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  refetchResponse: vi.fn(),
  toast: vi.fn(),
  upsertFormResponse: vi.fn(),
}));

const draftResponse = {
  id: "response-1",
  project_id: "project-1",
  template_id: "template-1",
  stage: "adherence" as const,
  data: {},
  status: "draft" as const,
  created_at: "2026-09-09T12:00:00.000Z",
  updated_at: "2026-09-09T12:00:00.000Z",
};

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...original,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ id: "project-1" }),
  };
});

vi.mock("@/hooks/useFormTemplates", () => ({
  useActiveTemplate: () => ({
    data: {
      id: "template-1",
      version: 1,
      schema_json: { type: "object", properties: {} },
      ui_json: {},
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useProjectFormResponse", () => ({
  useProjectFormResponse: () => ({
    data: draftResponse,
    isLoading: false,
    refetch: mocks.refetchResponse,
  }),
  useUpsertFormResponse: () => ({
    mutateAsync: mocks.upsertFormResponse,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useProjectDetails", () => ({
  useProjectDetails: () => ({
    project: {
      id: "project-1",
      clientName: "Cartório Teste",
      ticketNumber: "12345",
      systemType: "Orion TN",
      responsibleAdherence: "Implantador Teste",
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ isAdmin: false, canEditProjects: true }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/components/FormRenderer/FormRenderer", () => ({
  FormRenderer: ({
    onChange,
  }: {
    onChange: (change: { formData: Record<string, unknown> }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ formData: { sec_1: { q_1: "Sim" } } })}
    >
      Alterar resposta
    </button>
  ),
}));

vi.mock("@/components/ui/ai-rich-text-field", () => ({
  AiRichTextField: () => null,
}));

describe("salvamento do rascunho da análise de aderência", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.refetchResponse.mockReset();
    mocks.toast.mockReset();
    mocks.upsertFormResponse.mockReset();
    mocks.upsertFormResponse.mockImplementation(async (input: unknown) => ({
      ...draftResponse,
      data: (input as { data: Record<string, unknown> }).data,
      updated_at: "2026-09-09T12:34:00.000Z",
    }));
  });

  it("salva automaticamente depois da pausa na edição", async () => {
    render(<ProjectAdherenceForm />);

    fireEvent.click(screen.getByRole("button", { name: "Alterar resposta" }));
    expect(screen.getByTestId("adherence-draft-save-status")).toHaveTextContent(
      "Alterações pendentes",
    );

    await waitFor(() => expect(mocks.upsertFormResponse).toHaveBeenCalledTimes(1), {
      timeout: 2500,
    });
    expect(mocks.upsertFormResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: "project-1",
        stage: "adherence",
        status: "draft",
        data: { sec_1: { q_1: "Sim" } },
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("adherence-draft-save-status")).toHaveTextContent(
        "Rascunho salvo às",
      );
    });
  });

  it("permite salvar manualmente sem finalizar o formulário", async () => {
    render(<ProjectAdherenceForm />);

    fireEvent.click(screen.getByRole("button", { name: "Alterar resposta" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() => expect(mocks.upsertFormResponse).toHaveBeenCalledTimes(1));
    expect(mocks.upsertFormResponse).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft" }),
    );
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Rascunho salvo" }),
    );
    expect(mocks.upsertFormResponse).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" }),
    );
  });
});
