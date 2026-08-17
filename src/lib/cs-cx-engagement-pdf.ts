import type { CsCxAppointment, CsCxContact } from "@/hooks/useCsCxEngagement";
import { generateCsCxPdfReport, type CsCxReportBlock, type CsCxReportRow } from "@/lib/cs-cx-experience-pdf";

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  REUNIAO: "Reunião",
  CALL: "Call",
  VISITA: "Visita",
  OUTRO: "Outro",
};
const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  AGENDADO: "Agendado",
  REALIZADO: "Realizado",
  CANCELADO: "Cancelado",
  REMARCADO: "Remarcado",
  CONCLUIDO: "Concluído",
};

export async function generateCsCxContactsPdf(contacts: CsCxContact[], filterDescription: string) {
  const offices = new Set(contacts.map((contact) => contact.registry_office_id)).size;
  const responsibles = new Set(contacts.map((contact) => contact.author_profile_id).filter(Boolean)).size;
  const blocks = groupByOffice(contacts).map(([office, officeContacts]): CsCxReportBlock => ({
    title: office,
    subtitle: `${officeContacts.length} contato(s)`,
    rows: [...officeContacts].sort((a, b) => b.contact_date.localeCompare(a.contact_date)).flatMap((contact) => [
      [
        formatDate(contact.contact_date),
        `${contact.contact_person} · ${(contact.products ?? (contact.product ? [{ ...contact.product, is_primary: true }] : [])).map((product) => product.name).join(", ") || "Sem produto"}`,
      ] as CsCxReportRow,
      ["Responsável", contact.author?.full_name || contact.author?.email || "Não vinculado"],
      ["Anotações", contact.notes || "Não informadas"],
      ["Pendências", contact.pending_items || "Nenhuma"],
      ...(contact.ticket_number ? [["Chamado", contact.ticket_number] as CsCxReportRow] : []),
    ]),
  }));

  await generateCsCxPdfReport(
    "RELATÓRIO DE CONTATOS",
    filterDescription,
    [
      { label: "Contatos", value: contacts.length },
      { label: "Cartórios", value: offices },
      { label: "Responsáveis", value: responsibles },
      { label: "Com pendências", value: contacts.filter((contact) => contact.pending_items?.trim()).length },
    ],
    blocks,
    `relatorio-contatos-${localIsoDate()}.pdf`,
  );
}

export async function generateCsCxAppointmentsPdf(appointments: CsCxAppointment[], filterDescription: string) {
  const blocks = [...appointments].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map((appointment): CsCxReportBlock => ({
    title: appointment.title,
    subtitle: `${formatDateTime(appointment.starts_at)} · ${APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}`,
    rows: [
      ["Responsável", appointment.responsible?.full_name || appointment.responsible?.email || "Não vinculado"],
      ["Cartório", appointment.registry_office?.name || "Não vinculado"],
      ["Contato", appointment.contact?.contact_person || "Não vinculado"],
      ["Tipo", APPOINTMENT_TYPE_LABELS[appointment.appointment_type] ?? appointment.appointment_type],
      ["Duração", `${appointment.duration_minutes} minutos`],
      ["Local", appointment.location || "Não informado"],
      ["Descrição", appointment.description || "Não informada"],
      ["Resultado", appointment.result || "Não informado"],
    ],
  }));
  const completed = appointments.filter((appointment) => ["REALIZADO", "CONCLUIDO"].includes(appointment.status)).length;
  const canceled = appointments.filter((appointment) => appointment.status === "CANCELADO").length;
  const responsibles = new Set(appointments.map((appointment) => appointment.responsible_profile_id).filter(Boolean)).size;

  await generateCsCxPdfReport(
    "RELATÓRIO DE AGENDAMENTOS",
    filterDescription,
    [
      { label: "Agendamentos", value: appointments.length },
      { label: "Concluídos", value: completed },
      { label: "Cancelados", value: canceled },
      { label: "Responsáveis", value: responsibles },
    ],
    blocks,
    `relatorio-agendamentos-${localIsoDate()}.pdf`,
  );
}

function groupByOffice(contacts: CsCxContact[]) {
  return Array.from(contacts.reduce((groups, contact) => {
    const office = contact.registry_office?.name ?? "Cartório removido";
    const group = groups.get(office) ?? [];
    group.push(contact);
    groups.set(office, group);
    return groups;
  }, new Map<string, CsCxContact[]>())).sort(([officeA], [officeB]) => officeA.localeCompare(officeB, "pt-BR"));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
