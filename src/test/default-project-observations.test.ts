import { describe, expect, it } from "vitest";
import {
  createDefaultObservationsState,
  isLexicalContentEmpty,
  isValidLexicalState,
  prependDefaultObservationsToLexical,
  syncProjectStagesIntoObservations,
  STAGE_TRAFFIC_LIGHT_COLORS,
} from "@/utils/default-project-observations";
import { richTextToPlainText } from "@/lib/lexical";
import type { ProjectV2 } from "@/types/ProjectV2";

function makeBaseProject(overrides: Partial<ProjectV2> = {}): Partial<ProjectV2> {
  return {
    id: "proj-1",
    clientName: "Cartório Teste",
    systemType: "Orion PRO",
    legacySystem: "Cartório Moderno",
    soldHours: 40,
    createdAt: new Date("2026-11-23T10:00:00Z"),
    stages: {
      infra: {
        status: "in-progress",
        infraDispatchedAt: new Date("2026-11-23T10:00:00Z"),
      },
      adherence: {
        status: "in-progress",
        hasProductGap: false,
        analysisComplete: false,
        adherenceDispatchedAt: new Date("2026-11-23T10:00:00Z"),
      },
      conversion: {
        status: "todo",
      },
      environment: {
        status: "todo",
        approvedByInfra: false,
        testAvailable: false,
      },
      implementation: {
        status: "todo",
        phase1: {
          status: "todo",
          isConfirmed: false,
        },
      },
      post: {
        status: "todo",
      },
    } as ProjectV2["stages"],
    ...overrides,
  };
}

describe("default-project-observations", () => {
  it("gera SerializedEditorState Lexical válido com estrutura padrão e espaço normal fora do bold", () => {
    const json = createDefaultObservationsState();
    expect(isValidLexicalState(json)).toBe(true);
    expect(isLexicalContentEmpty(json)).toBe(false);

    const parsed = JSON.parse(json);
    const rootChildren = parsed.root.children;
    expect(rootChildren[0].type).toBe("heading");
    expect(rootChildren[0].tag).toBe("h3");
    expect(rootChildren[1].type).toBe("list");
    expect(rootChildren[1].listType).toBe("check");
    expect(rootChildren[2].type).toBe("heading");
    expect(rootChildren[3].type).toBe("list");
    expect(rootChildren[3].listType).toBe("bullet");

    // Primeiro item do checklist tem texto bold + nó de espaço normal fora do bold
    const infraItem = rootChildren[1].children[0];
    expect(infraItem.children[0].format).toBe(1);
    expect(infraItem.children[1].format).toBe(0);
    expect(infraItem.children[1].text).toBe(" ");

    // Sub-item aninhado de Homologação presente
    const plain = richTextToPlainText(json);
    expect(plain).toContain("Pré-Implantação");
    expect(plain).toContain("Análise de Infra:");
    expect(plain).toContain("Homologação:");
    expect(plain).toContain("Implantação & Agenda");
    expect(plain).toContain("Implantação:");
    expect(plain).toContain("Implantador:");
    expect(plain).toContain("Observações:");
    expect(plain).not.toContain("—");
  });

  it("inclui Modelos Editor (Orion TN) EXCLUSIVAMENTE para projetos Orion TN", () => {
    const proJson = createDefaultObservationsState(makeBaseProject({ systemType: "Orion PRO" }));
    const regJson = createDefaultObservationsState(makeBaseProject({ systemType: "Orion REG" }));
    const tnJson = createDefaultObservationsState(makeBaseProject({ systemType: "Orion TN" }));

    expect(richTextToPlainText(proJson)).not.toContain("Modelos Editor");
    expect(richTextToPlainText(regJson)).not.toContain("Modelos Editor");
    expect(richTextToPlainText(tnJson)).toContain("Modelos Editor (Orion TN):");
  });

  it("preenche dinamicamente disparos automáticos e Matriz RACI quando etapas estão em andamento sem responsável", () => {
    const tnProject = makeBaseProject({ systemType: "Orion TN" });
    const plainTn = richTextToPlainText(createDefaultObservationsState(tnProject));
    expect(plainTn).toContain("Passado ao Alex Silva e Bruno Fernandes em 23/11");
    expect(plainTn).toContain("Aguardando agenda dos implantadores - Rodrigo Brites / Ricardo Vieira");
    expect(plainTn).not.toContain("—");

    const regProject = makeBaseProject({ systemType: "Orion REG" });
    const plainReg = richTextToPlainText(createDefaultObservationsState(regProject));
    expect(plainReg).toContain("Julio Araujo");
  });

  it("detecta corretamente conteúdos vazios vs preenchidos em isLexicalContentEmpty", () => {
    expect(isLexicalContentEmpty(null)).toBe(true);
    expect(isLexicalContentEmpty(undefined)).toBe(true);
    expect(isLexicalContentEmpty("")).toBe(true);
    expect(isLexicalContentEmpty("   ")).toBe(true);
    expect(
      isLexicalContentEmpty(
        JSON.stringify({
          root: {
            children: [{ type: "paragraph", children: [], version: 1 }],
            type: "root",
            version: 1,
          },
        }),
      ),
    ).toBe(true);

    expect(isLexicalContentEmpty("Cliente pediu contato após 14h")).toBe(false);
    expect(isLexicalContentEmpty(createDefaultObservationsState())).toBe(false);
  });

  it("sincroniza linhas das etapas de forma não-destrutiva preservando sub-bullets manuais", () => {
    const initial = makeBaseProject({ systemType: "Orion PRO" });
    const baseJson = JSON.parse(createDefaultObservationsState(initial));

    // Insere um sub-bullet manual logo após Análise de Infra
    baseJson.root.children[1].children.splice(1, 0, {
      type: "listitem",
      value: 2,
      direction: null,
      format: "",
      indent: 0,
      version: 1,
      children: [
        {
          type: "list",
          listType: "bullet",
          tag: "ul",
          start: 1,
          direction: "ltr",
          format: "",
          indent: 0,
          version: 1,
          children: [
            {
              type: "listitem",
              value: 1,
              direction: "ltr",
              format: "",
              indent: 0,
              version: 1,
              children: [
                {
                  type: "text",
                  text: "21/11 — Cobrado TI do cartório sobre firewall",
                  format: 2,
                  style: "color: #6B7280;",
                  detail: 0,
                  mode: "normal",
                  version: 1,
                },
              ],
            },
          ],
        },
      ],
    });

    const updatedProject = makeBaseProject({
      systemType: "Orion PRO",
      stages: {
        ...initial.stages!,
        infra: {
          status: "done",
          responsible: "Alex Silva",
          endDate: new Date("2026-11-24T12:00:00Z"),
        },
      },
    });

    const { content, updatedCount } = syncProjectStagesIntoObservations(
      JSON.stringify(baseJson),
      updatedProject,
    );

    expect(updatedCount).toBeGreaterThan(0);
    expect(isValidLexicalState(content)).toBe(true);

    const plain = richTextToPlainText(content);
    expect(plain).toContain("Concluída por Alex Silva em 24/11");
    expect(plain).toContain("21/11 — Cobrado TI do cartório sobre firewall");

    const parsedUpdated = JSON.parse(content);
    expect(parsedUpdated.root.children[1].children[0].checked).toBe(true);
  });

  it("insere modelo padrão no topo preservando texto existente abaixo", () => {
    const merged = prependDefaultObservationsToLexical("Texto antigo do analista");
    expect(isValidLexicalState(merged)).toBe(true);
    const plain = richTextToPlainText(merged);
    expect(plain).toContain("Pré-Implantação");
    expect(plain).toContain("Histórico / Anotações Anteriores");
    expect(plain).toContain("Texto antigo do analista");
  });

  it("expõe as 4 cores exatas do semáforo de etapas do HUB", () => {
    expect(STAGE_TRAFFIC_LIGHT_COLORS.map((c) => c.hex)).toEqual([
      "#10B981",
      "#3B82F6",
      "#F59E0B",
      "#F97316",
    ]);
  });
});
