import type { CsCxRequest } from "@/hooks/useCsCxCore";
import { generateCsCxPdfReport, type CsCxReportBlock } from "@/lib/cs-cx-experience-pdf";

const EXECUTION_STATUSES = ["Projeto", "Desenvolvimento", "Em andamento", "Sustentação", "FastTrack"];

export async function printCsCxRequestsReport(
  requests: CsCxRequest[],
  filterDescription: string,
  targetWindow?: Window | null,
) {
  const blocks = requests.map((request): CsCxReportBlock => ({
    title: request.ticket_number || `Solicitação #${request.legacy_id ?? request.id.slice(0, 8)}`,
    subtitle: `${request.registry_office?.name ?? "Cartório removido"} · ${request.status || "Aguardando"}`,
    rows: [
      ["Descrição", request.description ?? "Não informada"],
      ["Módulo", request.module ?? "Não informado"],
      ["Solicitante", request.requester ?? "Não informado"],
      ["Responsável", request.responsible ?? "Não informado"],
      ["Datas", `Solicitação: ${formatDate(request.requested_on)} · Previsão: ${formatDate(request.expected_delivery_on)} · Entrega: ${formatDate(request.delivered_on)}`],
      ["Observações", request.updates.length ? request.updates.map((update) => `${formatDateTime(update.occurred_at)} — ${update.observation}`).join("\n") : request.notes ?? "Nenhuma observação"],
    ],
  }));

  await generateCsCxPdfReport(
    "RELATÓRIO DE SOLICITAÇÕES",
    filterDescription,
    [
      { label: "Solicitações", value: requests.length },
      { label: "Aguardando", value: requests.filter((request) => request.status === "Aguardando").length },
      { label: "Em execução", value: requests.filter((request) => EXECUTION_STATUSES.includes(request.status ?? "")).length },
      { label: "Finalizadas", value: requests.filter((request) => request.status === "Finalizado").length },
    ],
    blocks,
    `relatorio-solicitacoes-${localIsoDate()}.pdf`,
    { mode: "print", targetWindow },
  );
}

function formatDate(value: string | null) {
  if (!value) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
