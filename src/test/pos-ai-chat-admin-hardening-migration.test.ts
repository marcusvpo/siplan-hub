import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260828200000_harden_pos_ai_chat_admin.sql"),
  "utf8",
);

describe("robustez da central de links e chats", () => {
  it("cria links avulsos por uma RPC transacional e auditada", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.create_pos_ai_chat_link");
    expect(migration).toContain("COALESCE(p_project_id, gen_random_uuid())");
    expect(migration).toContain("pos_chat_link_created");
    expect(migration).toContain("has_permission(auth.uid(), 'pos_ai_logs', 'manage')");
  });

  it("pagina conversas, usuários e calcula os indicadores no servidor", () => {
    expect(migration).toContain("get_pos_ai_chat_conversations_page");
    expect(migration).toContain("get_pos_ai_chat_visitors_page");
    expect(migration).toContain("get_pos_ai_chat_links_admin");
    expect(migration).toContain("OFFSET (v_page - 1) * v_page_size");
  });

  it("desativa usuários sem apagar a atribuição histórica", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true");
    expect(migration).toContain("pos_chat_user_deactivated");
    expect(migration).not.toContain("DELETE FROM public.pos_ai_chat_visitors");
    expect(migration).toContain("AND visitor.is_active");
  });

  it("audita limpeza de conversas e alterações administrativas", () => {
    expect(migration).toContain("INSERT INTO public.audit_logs");
    expect(migration).toContain("pos_chat_conversations_cleared_all");
    expect(migration).toContain("pos_chat_link_disabled");
  });
});
