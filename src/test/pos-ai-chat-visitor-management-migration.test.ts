import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260828180000_manage_pos_ai_chat_visitors.sql",
  ),
  "utf8",
);

describe("gestao dos usuarios do chat pos-implantacao", () => {
  it("protege edicao e exclusao com a permissao administrativa", () => {
    expect(migration).toContain("manage_pos_ai_chat_visitor");
    expect(migration).toContain("has_permission(auth.uid(), 'pos_ai_logs', 'manage')");
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(migration).toContain("TO authenticated");
  });

  it("substitui a politica ampla por politicas especificas", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Authenticated users can manage pos chat visitors"');
    expect(migration).toContain('CREATE POLICY "Authenticated users can read pos chat visitors"');
    expect(migration).toContain('CREATE POLICY "Assistant managers can update pos chat visitors"');
    expect(migration).toContain('CREATE POLICY "Assistant managers can delete pos chat visitors"');
  });

  it("remove somente o cadastro do usuario e preserva o historico", () => {
    expect(migration).toContain("DELETE FROM public.pos_ai_chat_visitors");
    expect(migration).not.toContain("DELETE FROM public.pos_ai_chat_messages");
    expect(migration).not.toContain("DELETE FROM public.pos_ai_chat_sessions");
  });
});
