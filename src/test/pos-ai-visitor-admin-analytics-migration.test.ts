import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260821170000_pos_chat_visitor_admin_analytics.sql",
  ),
  "utf8",
);

describe("analytics administrativo dos usuários do assistente", () => {
  it("respeita os filtros globais de cartório e período", () => {
    expect(migration).toContain("p_project_id UUID DEFAULT NULL");
    expect(migration).toContain("p_days INT DEFAULT 30");
    expect(migration).toContain("message.created_at >= params.since_at");
    expect(migration).toContain("message.project_id = p_project_id");
  });

  it("agrega uso, custo e satisfação por usuário e setor", () => {
    expect(migration).toContain("user_activity AS MATERIALIZED");
    expect(migration).toContain("sector_activity AS MATERIALIZED");
    expect(migration).toContain("'estimated_cost_usd'");
    expect(migration).toContain("'satisfaction_rate'");
    expect(migration).toContain("COUNT(*) FILTER (WHERE message.role = 'assistant') * 0.0025");
  });

  it("expõe a cobertura de identificação somente para usuários autenticados", () => {
    expect(migration).toContain("'identification_rate'");
    expect(migration).toContain("'unidentified_cost_usd'");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_admin_analytics(UUID, INT) FROM PUBLIC",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_admin_analytics(UUID, INT) FROM anon",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_pos_chat_visitor_stats(UUID) FROM anon",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_pos_chat_project_summary(UUID) FROM anon",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_pos_chat_visitor_admin_analytics(UUID, INT) TO authenticated",
    );
  });
});
