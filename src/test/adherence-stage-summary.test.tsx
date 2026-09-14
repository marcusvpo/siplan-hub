import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AdherenceStageForm } from "@/components/ProjectManagement/Forms/StageForms/AdherenceStageForm";
import { plainTextToLexicalJson } from "@/lib/lexical";
import { AdherenceStageV2 } from "@/types/ProjectV2";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  toast: vi.fn(),
  responseData: {
    finalVerdict: "Não Aderente / Impeditivo",
    finalNotes: "",
  } as Record<string, unknown>,
}));

vi.mock("@/hooks/useFormTemplates", () => ({
  useActiveTemplate: () => ({
    data: {
      id: "template-1",
      schema_json: { type: "object", properties: {} },
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useProjectFormResponse", () => ({
  useProjectFormResponse: () => ({
    data: {
      id: "response-1",
      project_id: "project-1",
      template_id: "template-1",
      stage: "adherence",
      data: mocks.responseData,
      status: "rejected",
      created_at: "2026-09-14T12:00:00.000Z",
      updated_at: "2026-09-14T12:00:00.000Z",
    },
    isLoading: false,
  }),
  useUpsertFormResponse: () => ({
    mutate: mocks.mutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ isAdmin: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const stage: AdherenceStageV2 = {
  status: "in-progress",
  hasProductGap: false,
  analysisComplete: false,
};

const emptyLexicalState = JSON.stringify({
  root: {
    children: [
      {
        children: [],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
        textFormat: 0,
        textStyle: "",
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

const renderStage = () =>
  render(
    <MemoryRouter>
      <AdherenceStageForm
        projectId="project-1"
        systemType="Orion TN"
        stage={stage}
        canEditProjects
        onUpdate={vi.fn()}
      />
    </MemoryRouter>,
  );

describe("resumo da etapa de Análise de Aderência", () => {
  beforeEach(() => {
    mocks.responseData.finalVerdict = "Não Aderente / Impeditivo";
    mocks.responseData.finalNotes = "";
  });

  it("não exibe o JSON de um parecer final vazio", () => {
    mocks.responseData.finalNotes = emptyLexicalState;

    renderStage();

    expect(
      screen.getByText("Nenhuma justificativa ou parecer final registrado."),
    ).toBeInTheDocument();
    expect(screen.queryByText(emptyLexicalState)).not.toBeInTheDocument();
  });

  it("renderiza o texto legível do parecer final preenchido", () => {
    mocks.responseData.finalNotes = plainTextToLexicalJson(
      "Bloqueio operacional confirmado.",
    );

    renderStage();

    expect(
      screen.getByText("Bloqueio operacional confirmado."),
    ).toBeInTheDocument();
  });
});
