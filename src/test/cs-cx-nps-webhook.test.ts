import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isValidWebhookToken, parseNpsWebhookPayload } from "../../supabase/functions/_shared/cs-cx-nps-webhook";

describe("webhook NPS CS/CX", () => {
  it("exige correspondência integral do segredo", () => {
    expect(isValidWebhookToken("segredo-forte", "segredo-forte")).toBe(true);
    expect(isValidWebhookToken("segredo-forte", "segredo-fraco")).toBe(false);
    expect(isValidWebhookToken("segredo-forte", null)).toBe(false);
    expect(isValidWebhookToken("", "segredo-forte")).toBe(false);
  });

  it("preserva o contrato do Power Automate e separa respondente/cartório", () => {
    expect(parseNpsWebhookPayload({
      data: "12/08/2026 10:30:00",
      respondente: "Maria - Cartório Central",
      pontuacao: "9.8",
      motivo: "Ótimo atendimento",
      sugestao: "Continuar assim",
    })).toMatchObject({
      respondentName: "Maria",
      officeName: "Cartório Central",
      score: 9,
      scoreReason: "Ótimo atendimento",
      improvementSuggestion: "Continuar assim",
    });
  });

  it("aceita data ISO e formato americano com AM/PM", () => {
    const iso = parseNpsWebhookPayload({ data: "2026-08-12T13:00:00Z", nome_cartorio: "Ana - Central", pontuacao: 10 });
    const american = parseNpsWebhookPayload({ data: "8/12/2026 1:30:00 PM", respondente: "João - Central", pontuacao: 8 });
    expect(iso.respondedAt).toBe("2026-08-12T13:00:00.000Z");
    expect(new Date(american.respondedAt).getHours()).toBe(13);
  });

  it("mantém a função pública sem JWT, mas protege a escrita pela service role", () => {
    const config = readFileSync(resolve(process.cwd(), "supabase/config.toml"), "utf8");
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260812103000_cs_cx_nps_webhook.sql"), "utf8");
    expect(config).toMatch(/\[functions\.cs-cx-nps-webhook\]\s+verify_jwt = false/);
    expect(migration).toMatch(/REVOKE ALL[\s\S]+FROM PUBLIC, anon, authenticated/);
    expect(migration).toMatch(/GRANT EXECUTE[\s\S]+TO service_role/);
  });
});
