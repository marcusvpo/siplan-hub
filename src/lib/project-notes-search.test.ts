import { describe, expect, it } from "vitest";
import {
  ProjectNotesSearchRow,
  indexProjectFreeTextFields,
  searchIndexedProjectNotes,
} from "./project-notes-search";

function makeLexical(parts: Array<{ text: string; format?: number }>): string {
  return JSON.stringify({
    root: {
      type: "root",
      version: 1,
      children: [
        {
          type: "paragraph",
          version: 1,
          children: parts.map((p) => ({
            type: "text",
            version: 1,
            text: p.text,
            format: p.format ?? 0,
          })),
        },
      ],
    },
  });
}

describe("project-notes-search", () => {
  const sampleRow: ProjectNotesSearchRow = {
    id: "proj-1",
    client_name: "1º Ofício de Notas de Curitiba",
    ticket_number: "998877",
    system_type: "Orion TN",
    global_status: "in-progress",
    post_status: "todo",
    project_leader: "Maria Santos",
    updated_at: "2026-11-20T12:00:00Z",
    notes: {
      id: "notes-1",
      blocks: [
        {
          id: "b1",
          type: "paragraph",
          content: makeLexical([
            { text: "Cliente alinhou que existe " },
            { text: "previsão de implantar", format: 1 },
            { text: " no ano que vem devido à reforma do prédio." },
          ]),
        },
      ],
    },
    infra_observations: "Servidor atual possui apenas 8GB de RAM e precisa upgrade.",
    infra_servers: [
      { hostname: "SRV-ORION-01", observations: "Disco SSD quase cheio no servidor principal." },
    ],
    adherence_observations: "Muitas minutas de procuração com cláusulas específicas.",
    adherence_gap_description: "Necessita exportação XML para o tribunal estadual.",
    adherence_final_notes: makeLexical([
      { text: "Aderência aprovada com ressalva para o módulo de reconhecimento de firma." },
    ]),
    conversion_observations: "Base Cartório Moderno com 45GB para migração.",
    environment_observations: "Aguardando liberação da porta 5432 no firewall.",
    modelos_editor_observations: "Cartório enviou 120 modelos DOCX de escrituras.",
    implementation_observations: "Equipe prefere treinamento no período da tarde.",
    implementation_phase1: {
      responsible: "Rodrigo Brites",
      observations: makeLexical([
        { text: "Fase 1 prevista para janeiro do ano que vem com 12 escreventes." },
      ]),
    },
    implementation_phase2: {
      observations: "Retorno opcional para revisão do Livro Caixa Web.",
    },
    post_observations: JSON.stringify({
      v: 2,
      summary: makeLexical([
        { text: "Pós-implantação estável, apenas dúvidas pontuais de selo digital." },
      ]),
      blocks: [
        {
          id: "p1",
          content: makeLexical([
            { text: "Dia 1: ajustada impressora térmica do balcão." },
          ]),
        },
      ],
    }),
  };

  it("encontra frases em campos Lexical mesmo com negrito no meio e sem acentos", () => {
    const indexed = [indexProjectFreeTextFields(sampleRow)];
    const results = searchIndexedProjectNotes(indexed, "previsao de implantar no ano que vem");

    expect(results).toHaveLength(1);
    expect(results[0].projectId).toBe("proj-1");
    expect(results[0].matches[0].sectionKey).toBe("general");
    expect(results[0].matches[0].targetTab).toBe("general");
    expect(results[0].matches[0].isExactPhraseMatch).toBe(true);

    const highlighted = results[0].matches[0].snippetSegments
      .filter((s) => s.highlight)
      .map((s) => s.text)
      .join("");
    expect(highlighted.toLowerCase()).toBe("previsão de implantar no ano que vem");
  });

  it("retorna múltiplas seções quando o termo aparece em Observações Gerais e na Fase 1", () => {
    const indexed = [indexProjectFreeTextFields(sampleRow)];
    const results = searchIndexedProjectNotes(indexed, "ano que vem");

    expect(results).toHaveLength(1);
    const sections = results[0].matches.map((m) => m.fieldKey);
    expect(sections).toContain("general_notes");
    expect(sections).toContain("implementation_phase1_observations");

    const phase1Match = results[0].matches.find(
      (m) => m.fieldKey === "implementation_phase1_observations",
    );
    expect(phase1Match?.targetTab).toBe("steps");
    expect(phase1Match?.targetStepId).toBe("implementation");
  });

  it("não pesquisa em campos estáticos como nome do cliente, responsável, sistema ou status", () => {
    const indexed = [indexProjectFreeTextFields(sampleRow)];

    expect(searchIndexedProjectNotes(indexed, "Curitiba")).toHaveLength(0);
    expect(searchIndexedProjectNotes(indexed, "Maria Santos")).toHaveLength(0);
    expect(searchIndexedProjectNotes(indexed, "Rodrigo Brites")).toHaveLength(0);
    expect(searchIndexedProjectNotes(indexed, "998877")).toHaveLength(0);
    expect(searchIndexedProjectNotes(indexed, "in-progress")).toHaveLength(0);
  });

  it("indexa observações de servidores, gap de aderência, parecer final e blocos v2 de pós-implantação", () => {
    const indexed = [indexProjectFreeTextFields(sampleRow)];

    const srvRes = searchIndexedProjectNotes(indexed, "SSD quase cheio");
    expect(srvRes[0]?.matches[0]?.fieldLabel).toBe("Observações (SRV-ORION-01)");
    expect(srvRes[0]?.matches[0]?.targetStepId).toBe("infra");

    const gapRes = searchIndexedProjectNotes(indexed, "exportacao XML");
    expect(gapRes[0]?.matches[0]?.fieldLabel).toBe("Descrição do Gap de Produto");
    expect(gapRes[0]?.matches[0]?.targetStepId).toBe("adherence");

    const finalNotesRes = searchIndexedProjectNotes(indexed, "reconhecimento de firma");
    expect(finalNotesRes[0]?.matches[0]?.fieldLabel).toBe("Parecer / Notas Finais de Aderência");

    const postSummaryRes = searchIndexedProjectNotes(indexed, "selo digital");
    expect(postSummaryRes[0]?.matches[0]?.fieldLabel).toBe("Resumo Geral do Pós");
    expect(postSummaryRes[0]?.matches[0]?.targetStepId).toBe("post");

    const postBlockRes = searchIndexedProjectNotes(indexed, "impressora termica");
    expect(postBlockRes[0]?.matches[0]?.fieldLabel).toBe("Observações do Pós");
  });

  it("aplica filtros por seção e status do projeto corretamente", () => {
    const pausedRow: ProjectNotesSearchRow = {
      id: "proj-2",
      client_name: "2º Tabelionato de Notas",
      global_status: "blocked",
      post_status: "todo",
      infra_observations: "Projeto pausado com previsão para o ano que vem.",
    };
    const indexed = [
      indexProjectFreeTextFields(sampleRow),
      indexProjectFreeTextFields(pausedRow),
    ];

    expect(
      searchIndexedProjectNotes(indexed, "ano que vem", { sectionFilter: "infra" }),
    ).toHaveLength(1);
    expect(
      searchIndexedProjectNotes(indexed, "ano que vem", { statusFilter: "paused" })[0]
        ?.projectId,
    ).toBe("proj-2");
    expect(
      searchIndexedProjectNotes(indexed, "ano que vem", { statusFilter: "active" })[0]
        ?.projectId,
    ).toBe("proj-1");
  });
});
