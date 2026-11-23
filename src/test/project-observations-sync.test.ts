import { describe, expect, it } from "vitest";
import {
  createDefaultObservationsState,
  isLexicalContentEmpty,
  isValidLexicalState,
  LEXICAL_FORMAT_BOLD,
  LEXICAL_FORMAT_STRIKETHROUGH,
} from "@/utils/default-project-observations";
import {
  appendStageSubBulletToLexical,
  buildSyncedNotesForProjectUpdate,
  computeObservationsDrift,
} from "@/utils/project-observations-sync";
import { richTextToPlainText } from "@/lib/lexical";
import type { ProjectV2 } from "@/types/ProjectV2";

function makeProject(overrides: Partial<ProjectV2> = {}): ProjectV2 {
  return {
    id: "proj-sync-1",
    clientName: "Cartório Simulação",
    ticketNumber: "755241",
    systemType: "Orion TN",
    implantationType: "new",
    tags: [],
    priority: "normal",
    projectType: "new",
    healthScore: "ok",
    globalStatus: "in-progress",
    overallProgress: 20,
    projectLeader: "Bruno Fernandes",
    legacySystem: "Escriba",
    soldHours: 120,
    createdAt: new Date("2026-11-20T10:00:00Z"),
    lastUpdatedAt: new Date("2026-11-23T10:00:00Z"),
    lastUpdatedBy: "Bruno Fernandes",
    isDeleted: false,
    isArchived: false,
    stages: {
      infra: { status: "in-progress", infraDispatchedAt: new Date("2026-11-20T10:00:00Z") },
      adherence: {
        status: "in-progress",
        hasProductGap: false,
        analysisComplete: false,
        adherenceDispatchedAt: new Date("2026-11-20T10:00:00Z"),
      },
      conversion: { status: "todo" },
      environment: { status: "todo", approvedByInfra: false, testAvailable: false },
      modelosEditor: { status: "todo" },
      implementation: {
        status: "todo",
        phase1: {
          status: "todo",
          isConfirmed: false,
          startDate: new Date("2026-12-01T12:00:00Z"),
          endDate: new Date("2026-12-05T12:00:00Z"),
        },
        phase2: {
          status: "todo",
          isConfirmed: false,
        },
      },
      post: { status: "todo", followupNeeded: false },
    },
    ...overrides,
  };
}

describe("project-observations-sync (simulação ponta a ponta)", () => {
  it("detecta desatualização (drift) quando etapas avançam e zera drift após sincronização", () => {
    const initial = makeProject();
    const initialLex = createDefaultObservationsState(initial);

    const advanced: ProjectV2 = {
      ...initial,
      stages: {
        ...initial.stages,
        infra: {
          ...initial.stages.infra,
          status: "done",
          responsible: "Alex Silva",
          endDate: new Date("2026-11-23T12:00:00Z"),
        },
        implementation: {
          ...initial.stages.implementation,
          phase1: {
            ...initial.stages.implementation.phase1!,
            isConfirmed: true,
            confirmedAt: new Date("2026-11-23T12:00:00Z"),
            responsible: "Rodrigo Brites",
          },
        },
      },
    };

    const driftBefore = computeObservationsDrift(initialLex, advanced);
    expect(driftBefore.hasDrift).toBe(true);
    expect(driftBefore.driftedStages.map((d) => d.stageKey)).toContain("infra");
    expect(driftBefore.driftedStages.map((d) => d.stageKey)).toContain("implementation");

    const syncedNotes = buildSyncedNotesForProjectUpdate({
      previousProject: initial,
      nextProject: {
        ...advanced,
        notes: {
          id: "n1",
          projectId: advanced.id,
          blocks: [{ id: "b1", type: "paragraph", content: initialLex }],
          lastEditedBy: "Maria Santos",
          lastEditedAt: new Date(),
        },
      },
      actorName: "Alex Silva",
    });

    expect(syncedNotes).not.toBeNull();
    const syncedContent = syncedNotes!.blocks[0].content;
    expect(isValidLexicalState(syncedContent)).toBe(true);

    const driftAfter = computeObservationsDrift(syncedContent, advanced);
    expect(driftAfter.hasDrift).toBe(false);
  });

  it("espelha automaticamente Aderência, Conversão (assumir/finalizar) e Reagendamento Fase 1 com data antiga tachada", () => {
    const p0 = makeProject();
    const lex0 = createDefaultObservationsState(p0);
    // Adiciona sub-bullet manual para garantir preservação
    const lexWithManual = appendStageSubBulletToLexical(
      lex0,
      "conversion",
      "21/11 — Cobrado TI do cartório sobre senha do backup",
    );

    const p1: ProjectV2 = {
      ...p0,
      notes: {
        id: "n1",
        projectId: p0.id,
        blocks: [{ id: "b1", type: "paragraph", content: lexWithManual }],
        lastEditedBy: "Maria Santos",
        lastEditedAt: new Date(),
      },
      stages: {
        ...p0.stages,
        adherence: {
          ...p0.stages.adherence,
          status: "done",
          responsible: "Ricardo Vieira",
          analysisComplete: true,
        },
        conversion: {
          ...p0.stages.conversion,
          status: "done",
          responsible: "Ademar Souza",
        },
        implementation: {
          ...p0.stages.implementation,
          phase1: {
            status: "todo",
            isConfirmed: true,
            confirmedAt: new Date("2026-11-23T12:00:00Z"),
            startDate: new Date("2026-12-08T12:00:00Z"),
            endDate: new Date("2026-12-12T12:00:00Z"),
            responsible: "Rodrigo Brites",
          },
        },
      },
    };

    const synced = buildSyncedNotesForProjectUpdate({
      previousProject: p0,
      nextProject: p1,
      actorName: "Maria Santos",
    });

    expect(synced).not.toBeNull();
    const nextLex = synced!.blocks[0].content;
    expect(isValidLexicalState(nextLex)).toBe(true);

    const plain = richTextToPlainText(nextLex);
    // Sub-bullet manual preservado
    expect(plain).toContain("21/11 — Cobrado TI do cartório sobre senha do backup");
    // Eventos automáticos anexados
    expect(plain).toContain('Análise de Aderência atualizada para "Adequado"');
    expect(plain).toContain("Conversão assumida por Ademar Souza");
    expect(plain).toContain("Conversão finalizada por Ademar Souza");
    expect(plain).toContain("Implantação Fase 1 confirmada");
    // Responsável atualizado
    expect(plain).toContain("Rodrigo Brites");

    // Confirma data antiga tachada (format=4) e nova data em negrito (format=1)
    const parsed = JSON.parse(nextLex);
    const agendaList = parsed.root.children[3];
    const statusWindowItem = agendaList.children[0];
    const hasStrikeOld = statusWindowItem.children.some(
      (n: { format?: number; text?: string }) =>
        n.format === LEXICAL_FORMAT_STRIKETHROUGH && n.text === "01/12 a 05/12",
    );
    const hasBoldNew = statusWindowItem.children.some(
      (n: { format?: number; text?: string }) =>
        n.format === LEXICAL_FORMAT_BOLD && n.text === "08/12 a 12/12",
    );
    expect(hasStrikeOld).toBe(true);
    expect(hasBoldNew).toBe(true);
  });

  it("valida e extrai texto de nós MentionNode (@analista e #etapa) no Lexical", () => {
    const withMentions = JSON.stringify({
      root: {
        type: "root",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "paragraph",
            version: 1,
            direction: "ltr",
            format: "",
            indent: 0,
            children: [
              {
                type: "text",
                version: 1,
                text: "Alinhar com ",
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
              },
              {
                type: "mention",
                version: 1,
                mentionKind: "analyst",
                mentionId: "alex-silva",
                label: "Alex Silva",
              },
              {
                type: "text",
                version: 1,
                text: " sobre ",
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
              },
              {
                type: "mention",
                version: 1,
                mentionKind: "stage",
                mentionId: "adherence",
                label: "Aderência",
                route: "/implantadores/aderencia",
              },
            ],
          },
        ],
      },
    });

    expect(isValidLexicalState(withMentions)).toBe(true);
    expect(isLexicalContentEmpty(withMentions)).toBe(false);
    expect(richTextToPlainText(withMentions)).toBe("Alinhar com @Alex Silva sobre #Aderência");
  });
});
