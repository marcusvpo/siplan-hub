import type { CsCxContact } from "@/hooks/useCsCxEngagement";
import { normalizeSearchText } from "@/utils/normalize-search";

function contactIdentity(contact: CsCxContact) {
  const normalizedName = normalizeSearchText(contact.contact_person).replace(
    /\s+/g,
    " ",
  );

  return normalizedName
    ? `${contact.registry_office_id}::${normalizedName}`
    : `${contact.registry_office_id}::${contact.id}`;
}

function contactTimestamp(contact: CsCxContact) {
  return Math.max(
    Date.parse(contact.updated_at ?? "") || 0,
    Date.parse(contact.created_at ?? "") || 0,
    Date.parse(contact.contact_date) || 0,
  );
}

export function deduplicateAppointmentContacts(
  contacts: CsCxContact[],
  registryOfficeId: string,
  selectedContactId: string,
) {
  const uniqueContacts = new Map<string, CsCxContact>();

  contacts
    .filter(
      (contact) =>
        !registryOfficeId || contact.registry_office_id === registryOfficeId,
    )
    .forEach((contact) => {
      const identity = contactIdentity(contact);
      const current = uniqueContacts.get(identity);

      if (!current) {
        uniqueContacts.set(identity, contact);
        return;
      }

      const contactIsSelected = contact.id === selectedContactId;
      const currentIsSelected = current.id === selectedContactId;

      if (
        (contactIsSelected && !currentIsSelected) ||
        (!currentIsSelected &&
          contactTimestamp(contact) > contactTimestamp(current))
      ) {
        uniqueContacts.set(identity, contact);
      }
    });

  return [...uniqueContacts.values()].sort((left, right) =>
    normalizeSearchText(left.contact_person).localeCompare(
      normalizeSearchText(right.contact_person),
      "pt-BR",
      {
      sensitivity: "base",
      },
    ),
  );
}
