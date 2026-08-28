import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260828163000_clear_pos_ai_chat_conversations.sql",
  ),
  "utf8",
);

describe("limpeza do historico de conversas do assistente", () => {
  it("permite limpar conversas selecionadas ou todo o historico", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.clear_pos_ai_chat_conversations");
    expect(migration).toContain("IF p_delete_all THEN");
    expect(migration).toContain("jsonb_to_recordset(p_conversations)");
    expect(migration).toContain("DELETE FROM public.pos_ai_chat_messages");
    expect(migration).toContain("DELETE FROM public.pos_ai_chat_sessions");
  });

  it("restringe a exclusao a gestores dos logs do assistente", () => {
    expect(migration).toContain("public.has_permission(auth.uid(), 'pos_ai_logs', 'manage')");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.clear_pos_ai_chat_conversations");
    expect(migration).toContain("TO authenticated");
  });
});
