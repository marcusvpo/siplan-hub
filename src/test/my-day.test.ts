import { describe, expect, it } from "vitest";
import type { ProjectV2 } from "@/types/ProjectV2";
import {
  buildMyDayProjects,
  getNextOpenStage,
  isProjectAssignedTo,
  normalizeAssignment,
  toMyDayProject,
} from "@/lib/my-day";

const NOW = new Date("2026-09-16T12:00:00-03:00");

function project(
  overrides: Partial<ProjectV2> & Pick<ProjectV2, "id" | "clientName">,
): ProjectV2 {
  return {
    id: overrides.id,
    clientName: overrides.clientName,
    ticketNumber: "0800-1",
    systemType: "Orion TN",
    implantationType: "new",
    projectType: "new",
    tags: [],
    priority: "normal",
    healthScore: "ok",
    globalStatus: "in-progress",
    overallProgress: 30,
    projectLeader: "Outra Pessoa",
    createdAt: new Date("2026-08-01T12:00:00-03:00"),
    lastUpdatedAt: new Date("2026-09-15T12:00:00-03:00"),
    lastUpdatedBy: "Sistema",
    isDeleted: false,
    isArchived: false,
    stages: {
      infra: { status: "done", responsible: "Outra Pessoa" },
      adherence: { status: "in-progress", responsible: "Bruno Fernandes" },
      environment: { status: "todo", responsible: "" },
      conversion: { status: "todo", responsible: "" },
      implementation: { status: "todo", responsible: "" },
      post: { status: "todo", responsible: "" },
    },
    ...overrides,
  } as ProjectV2;
}

describe("Central de Trabalho / Meu Dia", () => {
  it("normaliza nomes para relacionar responsabilidades", () => {
    expect(normalizeAssignment("  Brúno Fernándes ")).toBe("bruno fernandes");
    expect(
      isProjectAssignedTo(project({ id: "1", clientName: "Cartório A" }), [
        "Bruno Fernandes",
      ]),
    ).toBe(true);
  });

  it("identifica a próxima etapa aberta na ordem do fluxo", () => {
    const nextStage = getNextOpenStage(project({ id: "1", clientName: "Cartório A" }));

    expect(nextStage?.label).toBe("Aderência");
    expect(nextStage?.status).toBe("in-progress");
  });

  it("marca projeto com etapa vencida como prioridade crítica", () => {
    const source = project({
      id: "1",
      clientName: "Cartório A",
      stages: {
        infra: { status: "done", responsible: "" },
        adherence: {
          status: "in-progress",
          responsible: "Bruno Fernandes",
          endDate: new Date("2026-09-10T12:00:00-03:00"),
        },
        environment: { status: "todo", responsible: "" },
        conversion: { status: "todo", responsible: "" },
        implementation: { status: "todo", responsible: "" },
        post: { status: "todo", responsible: "" },
      },
    });

    const result = toMyDayProject(source, NOW);

    expect(result.isOverdue).toBe(true);
    expect(result.tone).toBe("critical");
    expect(result.attentionLabel).toBe("Etapa atrasada");
  });

  it("filtra projetos pessoais e ordena bloqueados antes dos demais", () => {
    const result = buildMyDayProjects(
      [
        project({ id: "normal", clientName: "Normal" }),
        project({ id: "blocked", clientName: "Bloqueado", globalStatus: "blocked" }),
        project({ id: "done", clientName: "Finalizado", globalStatus: "done" }),
        project({
          id: "other",
          clientName: "Outro responsável",
          projectLeader: "Outra Pessoa",
          stages: {
            infra: { status: "in-progress", responsible: "Outra Pessoa" },
            adherence: { status: "todo", responsible: "" },
            environment: { status: "todo", responsible: "" },
            conversion: { status: "todo", responsible: "" },
            implementation: { status: "todo", responsible: "" },
            post: { status: "todo", responsible: "" },
          },
        }),
      ],
      ["Bruno Fernandes"],
      { now: NOW },
    );

    expect(result.map((item) => item.id)).toEqual(["blocked", "normal"]);
  });
});
