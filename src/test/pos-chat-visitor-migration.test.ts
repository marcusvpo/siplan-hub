import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260821163000_identify_pos_chat_visitors.sql"
  ),
  "utf8"
);

describe("identificação dos usuários do chat pós-implantação", () => {
  it("vincula pessoas e mensagens ao projeto do cartório", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.pos_ai_chat_visitors");
    expect(migration).toContain("project_id UUID NOT NULL REFERENCES public.projects(id)");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS visitor_id UUID");
  });

  it("isola sessões e mensagens pelo usuário selecionado", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_pos_chat_visitor_sessions");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_pos_chat_session_messages");
    expect(migration).toContain("message.visitor_id = p_visitor_id");
  });

  it("disponibiliza métricas individuais e remove leitura anônima direta", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_pos_chat_visitor_stats");
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Anon users can read pos_ai_chat_messages for session"'
    );
  });
});
