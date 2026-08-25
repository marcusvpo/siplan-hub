import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260825110000_cs_cx_nps_by_product.sql",
  ),
  "utf8",
);

describe("NPS segmentado por produto", () => {
  it("persiste o produto no convite e na resposta", () => {
    expect(migration).toMatch(
      /ALTER TABLE public\.cs_cx_nps_invitations[\s\S]+ADD COLUMN IF NOT EXISTS product_id UUID/,
    );
    expect(migration).toMatch(
      /ALTER TABLE public\.cs_cx_nps_responses[\s\S]+ADD COLUMN IF NOT EXISTS product_id UUID/,
    );
    expect(migration).toMatch(/set_cs_cx_nps_response_product/);
    expect(migration).toMatch(/Produto OrionTN não encontrado/);
    expect(migration).toMatch(
      /UPDATE public\.cs_cx_nps_responses[\s\S]+SET product_id = orion_tn_id/,
    );
  });

  it("valida que o produto pertence ao cartório antes de criar o link", () => {
    expect(migration).toMatch(/p_product_id UUID/);
    expect(migration).toMatch(/cs_cx_registry_office_products/);
    expect(migration).toMatch(
      /Produto não está vinculado ao cartório selecionado/,
    );
  });

  it("expõe o produto no formulário público", () => {
    expect(migration).toMatch(/'product_id', invitation\.product_id/);
    expect(migration).toMatch(/'product_name', product\.name/);
  });

  it("permite corrigir apenas o produto com validação de acesso", () => {
    expect(migration).toMatch(/cs_cx_update_nps_response_product/);
    expect(migration).toMatch(/cs_cx_can_manage_owned/);
    expect(migration).toMatch(
      /UPDATE public\.cs_cx_nps_responses\s+SET product_id = p_product_id/,
    );
    expect(migration).toMatch(
      /UPDATE public\.cs_cx_nps_invitations\s+SET product_id = p_product_id/,
    );
  });
});
