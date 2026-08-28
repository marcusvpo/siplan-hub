import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260828120000_create_pos_ai_chat_links.sql"
  ),
  "utf8"
);

describe("central de links e chats do assistente", () => {
  it("permite links vinculados a projeto ou clientes avulsos", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.pos_ai_chat_links");
    expect(migration).toContain("project_id UUID UNIQUE REFERENCES public.projects(id)");
    expect(migration).toContain("client_name TEXT NOT NULL");
  });

  it("mantém os UUIDs e links públicos já existentes", () => {
    expect(migration).toContain("INSERT INTO public.pos_ai_chat_links");
    expect(migration).toContain("project.id,");
    expect(migration).toContain("ON CONFLICT (id) DO NOTHING");
  });

  it("resolve o acesso público por link sem exigir um projeto", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.is_pos_chat_link_enabled");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_pos_assistant_project_info");
    expect(migration).toContain("DROP CONSTRAINT IF EXISTS pos_ai_chat_messages_project_id_fkey");
  });
});
