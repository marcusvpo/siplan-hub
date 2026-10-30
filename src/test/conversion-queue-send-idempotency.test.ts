import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { transformToDB } from "@/utils/project-transformers";
import { ProjectV2, StageStatus } from "@/types/ProjectV2";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261030101500_fix_conversion_queue_sync_and_idempotency.sql",
  ),
  "utf8",
);

describe("Sincronização e Idempotência da Fila de Conversão", () => {
  it("contém script para preencher conversion_sent_at nos projetos com valor NULL que estão na fila", () => {
    expect(migration).toContain("UPDATE public.projects AS p");
    expect(migration).toContain("conversion_sent_at = cq.sent_at::date");
    expect(migration).toContain("p.conversion_sent_at IS NULL");
  });

  it("cria trigger para sincronizar conversion_sent_at quando um item entra na fila", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.sync_conversion_queue_insert_to_project()");
    expect(migration).toContain("AFTER INSERT ON public.conversion_queue");
    expect(migration).toContain("EXECUTE FUNCTION public.sync_conversion_queue_insert_to_project()");
  });

  it("registra aviso de correção no changelog", () => {
    expect(migration).toContain("'release_fix'");
    expect(migration).toContain("'conversion_home'");
    expect(migration).toContain("'/conversion/atividades'");
  });

  it("preserva conversion_sent_at existente se a atualização do estágio não fornecer nova data", () => {
    const existingDate = new Date("2026-10-30T12:00:00.000Z");

    const oldProject = {
      id: "test-proj-1",
      clientName: "Cartório Teste",
      ticketNumber: "123456",
      systemType: "Orion PRO",
      globalStatus: "in-progress",
      stages: {
        conversion: {
          status: "in-progress" as StageStatus,
          responsible: "Ademar",
          sentAt: existingDate,
        },
      },
    } as unknown as ProjectV2;

    const updatedProject = {
      ...oldProject,
      stages: {
        ...oldProject.stages,
        conversion: {
          ...oldProject.stages.conversion,
          observations: "Observação nova sobre a conversão",
          sentAt: undefined, // não informado na edição
        },
      },
    } as unknown as ProjectV2;

    const row = transformToDB(updatedProject, oldProject);
    expect(row.conversion_sent_at).toBe(existingDate.toISOString());
  });
});
