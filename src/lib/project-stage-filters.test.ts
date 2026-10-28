import { describe, expect, it } from "vitest";
import {
  getStageStatusOptions,
  matchesProjectStageFilter,
} from "@/lib/project-stage-filters";

describe("filtros de etapa dos projetos", () => {
  const project = {
    stages: {
      infra: { status: "done" as const },
      adherence: { status: "waiting_adjustment" as const },
      conversion: { status: "in-progress" as const },
    },
  };

  it("filtra a etapa selecionada pelo status escolhido", () => {
    expect(matchesProjectStageFilter(project, "infra", "done")).toBe(true);
    expect(matchesProjectStageFilter(project, "infra", "in-progress")).toBe(false);
    expect(matchesProjectStageFilter(project, "conversion", "in-progress")).toBe(true);
  });

  it("aceita todos os status somente quando a etapa existe", () => {
    expect(matchesProjectStageFilter(project, "infra", "all")).toBe(true);
    expect(matchesProjectStageFilter(project, "post", "all")).toBe(false);
    expect(matchesProjectStageFilter(project, "all", "blocked")).toBe(true);
  });

  it("exclui etapas que não se aplicam a projetos exclusivos de Modelos TN", () => {
    const modelosTnProject = {
      systemType: "ModelosTN",
      stages: {
        infra: { status: "todo" as const },
        adherence: { status: "todo" as const },
        implementation: { status: "todo" as const },
        post: { status: "todo" as const },
      },
    };

    expect(matchesProjectStageFilter(modelosTnProject, "infra", "todo")).toBe(false);
    expect(matchesProjectStageFilter(modelosTnProject, "adherence", "all")).toBe(false);
    expect(matchesProjectStageFilter(modelosTnProject, "post", "todo")).toBe(false);
    expect(
      matchesProjectStageFilter(modelosTnProject, "implementation", "todo"),
    ).toBe(true);
  });

  it("oferece os rótulos específicos da etapa de aderência", () => {
    expect(getStageStatusOptions("adherence")).toEqual(
      expect.arrayContaining([
        { value: "in-progress", label: "Em Análise" },
        { value: "done", label: "Adequado" },
        { value: "blocked", label: "Inadequado" },
        { value: "waiting_adjustment", label: "Em Adequação" },
      ]),
    );
    expect(getStageStatusOptions("infra")).not.toEqual(
      expect.arrayContaining([{ value: "waiting_adjustment", label: "Em Adequação" }]),
    );
  });
});
