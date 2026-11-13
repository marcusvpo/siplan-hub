import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261113120000_cs_cx_nps_access_tracking.sql",
  ),
  "utf8",
);
const edgeFunction = readFileSync(
  resolve(process.cwd(), "supabase/functions/cs-cx-nps-public/index.ts"),
  "utf8",
);
const publicPage = readFileSync(
  resolve(process.cwd(), "src/pages/public/PublicNpsResponse.tsx"),
  "utf8",
);

describe("rastreamento de acesso aos links públicos de NPS", () => {
  it("registra eventos e mantém um resumo por solicitação", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.cs_cx_nps_access_events",
    );
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS first_accessed_at");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS last_accessed_at");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS access_count");
    expect(migration).toContain("access_count = access_count + 1");
    expect(migration).toContain(
      "idx_cs_cx_nps_access_events_invitation_date",
    );
  });

  it("protege o histórico com RLS e grava somente pela RPC de serviço", () => {
    expect(migration).toContain(
      "ALTER TABLE public.cs_cx_nps_access_events ENABLE ROW LEVEL SECURITY",
    );
    expect(migration).toContain("TO authenticated");
    expect(migration).toContain(
      "public.has_permission(auth.uid(), 'cs_cx_nps', 'view')",
    );
    expect(migration).toMatch(
      /REVOKE ALL ON TABLE public\.cs_cx_nps_access_events\s+FROM PUBLIC, anon, authenticated/,
    );
    expect(migration).toContain("public.cs_cx_can_view_office_record(");
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.cs_cx_get_public_nps_invitation\([\s\S]+TO service_role/,
    );
  });

  it("não persiste IP e sinaliza que contagem não equivale a visitante único", () => {
    expect(migration).not.toContain("ip_address");
    expect(migration).toContain("não representa visitantes únicos");
    expect(migration).toContain("sem endereço IP");
  });

  it("encaminha localização aproximada e fuso no carregamento público", () => {
    expect(edgeFunction).toContain('"x-vercel-ip-country"');
    expect(edgeFunction).toContain('"cf-ipcountry"');
    expect(edgeFunction).toContain("p_timezone");
    expect(publicPage).toContain(
      'Intl.DateTimeFormat().resolvedOptions().timeZone',
    );
  });
});
