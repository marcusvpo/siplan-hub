import { describe, expect, it } from "vitest";
import type { CsCxRegistryOffice } from "@/hooks/useCsCxCore";
import { buildCsCxRegistryOfficesReport } from "@/lib/cs-cx-registry-offices-report";

function office(
  overrides: Partial<CsCxRegistryOffice>,
): CsCxRegistryOffice {
  return {
    id: "office-1",
    legacy_id: null,
    name: "Cartório Central",
    sap_code: null,
    active: true,
    contact_details: null,
    notes: null,
    origin: "hub",
    created_at: null,
    created_by: null,
    analyst_profile_id: null,
    analyst: null,
    responsibles: [],
    products: [],
    ...overrides,
  };
}

describe("listagem de cartórios para impressão", () => {
  it("ordena e inclui as informações exibidas na listagem", () => {
    const report = buildCsCxRegistryOfficesReport([
      office({ name: "São Miguel", active: false }),
      office({
        id: "office-2",
        name: "Americana",
        sap_code: "C000010",
        contact_details: "(19) 3475-3370",
        responsibles: [
          {
            id: "responsible-1",
            profile_id: "profile-1",
            profile: {
              id: "profile-1",
              full_name: "Bruna Pomini",
              email: null,
            },
          },
        ],
        products: [
          {
            id: "link-1",
            product_id: "product-1",
            implementation_date: null,
            product: { id: "product-1", name: "OrionTN", product_code: "TN" },
            responsibles: [],
          },
        ],
      }),
    ]);

    expect(report[0].rows[0][0]).toBe("Americana");
    expect(report[0].rows[0][1]).toContain("SAP: C000010");
    expect(report[0].rows[0][1]).toContain("Responsáveis: Bruna Pomini");
    expect(report[0].rows[0][1]).toContain("Produtos: OrionTN");
    expect(report[0].rows[1][1]).toContain("Status: Inativo");
  });
});
