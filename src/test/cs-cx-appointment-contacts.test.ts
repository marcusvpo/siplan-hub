import { describe, expect, it } from "vitest";
import type { CsCxContact } from "@/hooks/useCsCxEngagement";
import { deduplicateAppointmentContacts } from "@/lib/cs-cx-appointment-contacts";

function contact(
  id: string,
  name: string,
  officeId: string,
  contactDate: string,
): CsCxContact {
  return {
    id,
    legacy_id: null,
    contact_date: contactDate,
    notes: null,
    pending_items: null,
    product_id: "product-1",
    contact_person: name,
    contact_details: null,
    registry_office_id: officeId,
    ticket_number: null,
    author_profile_id: null,
    created_at: null,
    updated_at: null,
    origin: "hub",
    product: null,
    products: [],
    registry_office: { id: officeId, name: `Cartório ${officeId}` },
    author: null,
  };
}

describe("contatos disponíveis para agendamentos", () => {
  const contacts = [
    contact("aline-old", "Dra. Aline", "office-1", "2026-07-01"),
    contact("aline-new", "  dra. ÁLINE  ", "office-1", "2026-08-20"),
    contact("bruno", "Bruno", "office-1", "2026-08-10"),
    contact("aline-other-office", "Dra. Aline", "office-2", "2026-08-22"),
  ];

  it("mostra cada pessoa uma vez por cartório e usa o registro mais recente", () => {
    const result = deduplicateAppointmentContacts(contacts, "office-1", "");

    expect(result.map((item) => item.id)).toEqual(["bruno", "aline-new"]);
  });

  it("preserva o contato originalmente vinculado durante a edição", () => {
    const result = deduplicateAppointmentContacts(
      contacts,
      "office-1",
      "aline-old",
    );

    expect(result.map((item) => item.id)).toEqual(["bruno", "aline-old"]);
  });

  it("não mistura pessoas de cartórios diferentes quando nenhum está filtrado", () => {
    const result = deduplicateAppointmentContacts(contacts, "", "");

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.id)).toContain("aline-other-office");
  });
});
