import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260925120000_sync_adherence_final_notes_to_observations.sql"
  ),
  "utf8"
);

const projectAdherenceFormCode = readFileSync(
  resolve(process.cwd(), "src/pages/ProjectAdherenceForm.tsx"),
  "utf8"
);

const useProjectFormResponseCode = readFileSync(
  resolve(process.cwd(), "src/hooks/useProjectFormResponse.ts"),
  "utf8"
);

describe("replicação de Justificativa / Parecer Técnico para Observações & Detalhes da etapa 2", () => {
  it("contém a trigger atualizada para replicar finalNotes para adherence_observations ao finalizar formulário", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.sync_project_form_response_status()");
    expect(migration).toContain("target_stage = 'adherence'");
    expect(migration).toContain("adherence_observations = CASE");
    expect(migration).toContain("NEW.status IN ('approved', 'approved_with_restrictions', 'rejected')");
    expect(migration).toContain("NEW.data->>'finalNotes'");
  });

  it("aplica a sincronização retroativa para todos os projetos com aderência finalizada", () => {
    expect(migration).toContain("UPDATE public.projects p");
    expect(migration).toContain("adherence_observations = pfr.data->>'finalNotes'");
    expect(migration).toContain("pfr.stage = 'adherence'");
    expect(migration).toContain("pfr.status IN ('approved', 'approved_with_restrictions', 'rejected')");
    expect(migration).toContain("pfr.data->>'finalNotes' IS NOT NULL");
  });

  it("insere o registro de changelog obrigatório no banco", () => {
    expect(migration).toContain("INSERT INTO public.notifications");
    expect(migration).toContain("'changelog'");
    expect(migration).toContain("'release_improvement'");
    expect(migration).toContain("Sincronização do Parecer Técnico de Aderência");
  });

  it("garante a replicação explícita para o projeto no hook useUpsertFormResponse", () => {
    expect(useProjectFormResponseCode).toContain("input.stage === 'adherence'");
    expect(useProjectFormResponseCode).toContain("adherence_observations: input.data.finalNotes");
  });

  it("garante a persistência de adherence_observations ao finalizar no ProjectAdherenceForm", () => {
    expect(projectAdherenceFormCode).toContain("adherence_observations: finalizedData.finalNotes");
  });
});
