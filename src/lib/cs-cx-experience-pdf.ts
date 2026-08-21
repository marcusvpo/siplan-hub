import type { CsCxNpsResponse, CsCxVisit } from "@/hooks/useCsCxExperience";
import type { NpsAnalytics } from "@/lib/cs-cx-nps-analytics";

export type CsCxReportRow = [label: string, value: string];
export interface CsCxReportBlock { title: string; subtitle: string; rows: CsCxReportRow[] }
export interface CsCxSummaryItem { label: string; value: string | number }
export interface CsCxPdfOutputOptions { mode?: "download" | "print"; targetWindow?: Window | null }
export interface CsCxReportRowLayout {
  labelLines: string[];
  valueLines: string[];
  labelWidth: number;
  valueWidth: number;
  valueOffset: number;
  height: number;
}

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberta", emandamento: "Em andamento", concluido: "Concluída", reaberto: "Reaberta",
};

export async function generateCsCxVisitsPdf(visits: CsCxVisit[], filterDescription: string) {
  const completed = visits.filter((visit) => visit.status === "concluido").length;
  const pending = visits.flatMap((visit) => visit.pending_items).filter((item) => item.status !== "resolvida").length;
  const blocks = visits.map((visit): CsCxReportBlock => ({
    title: visit.registry_office?.name ?? "Cartório removido",
    subtitle: `${formatDate(visit.visit_date)} · ${STATUS_LABELS[visit.status] ?? visit.status}`,
    rows: [
      ["Visitante", visit.visitor?.full_name ?? "Não informado"],
      ["Horário", `${visit.start_time?.slice(0, 5) ?? "Não informado"} – ${visit.end_time?.slice(0, 5) ?? "Não informado"}`],
      ["Objetivo", visit.objective],
      ["Checklist", `${visit.checklist.filter((item) => item.checked).length} de ${visit.checklist.length} itens concluídos`],
      ["Pendências", visit.pending_items.length ? visit.pending_items.map((item) => `${item.title} (${item.priority})`).join("; ") : "Nenhuma"],
      ["Anexos", `${visit.attachments.length} arquivo(s)`],
      ["Observações", visit.general_notes ?? "Não informadas"],
    ],
  }));
  await generateCsCxPdfReport(
    "RELATÓRIO DE VISITAS",
    filterDescription,
    [
      { label: "Visitas", value: visits.length },
      { label: "Concluídas", value: completed },
      { label: "Em acompanhamento", value: visits.length - completed },
      { label: "Pendências abertas", value: pending },
    ],
    blocks,
    `relatorio-visitas-${localIsoDate()}.pdf`,
  );
}

export async function generateCsCxNpsPdf(responses: CsCxNpsResponse[], filterDescription: string) {
  const promoters = responses.filter((item) => item.classification === "PROMOTOR").length;
  const neutrals = responses.filter((item) => item.classification === "NEUTRO").length;
  const detractors = responses.filter((item) => item.classification === "DETRATOR").length;
  const nps = responses.length ? Math.round(((promoters - detractors) / responses.length) * 1000) / 10 : 0;
  const byOffice = Array.from(responses.reduce((groups, response) => {
    const office = response.registry_office?.name ?? response.respondent_office;
    const group = groups.get(office) ?? [];
    group.push(response);
    groups.set(office, group);
    return groups;
  }, new Map<string, CsCxNpsResponse[]>())).sort(([officeA], [officeB]) => officeA.localeCompare(officeB, "pt-BR"));
  const blocks = byOffice.map(([office, officeResponses]): CsCxReportBlock => {
    const officePromoters = officeResponses.filter((item) => item.classification === "PROMOTOR").length;
    const officeDetractors = officeResponses.filter((item) => item.classification === "DETRATOR").length;
    const officeNps = Math.round(((officePromoters - officeDetractors) / officeResponses.length) * 1000) / 10;
    return {
      title: office,
      subtitle: `${officeResponses.length} resposta(s) · NPS ${officeNps}`,
      rows: officeResponses.sort((a, b) => b.responded_at.localeCompare(a.responded_at)).flatMap((response) => [
        [formatDateTime(response.responded_at), `${response.respondent_name} · Nota ${response.score} · ${response.classification}`] as CsCxReportRow,
        ...(response.score_reason ? [["Motivo", response.score_reason] as CsCxReportRow] : []),
        ...(response.improvement_suggestion ? [["Sugestão", response.improvement_suggestion] as CsCxReportRow] : []),
      ]),
    };
  });
  await generateCsCxPdfReport(
    "RELATÓRIO DE NPS",
    filterDescription,
    [
      { label: "NPS geral", value: nps },
      { label: "Promotores", value: promoters },
      { label: "Neutros", value: neutrals },
      { label: "Detratores", value: detractors },
    ],
    blocks,
    `relatorio-nps-${localIsoDate()}.pdf`,
  );
}

export async function generateCsCxNpsAnalysisPdf(
  analytics: NpsAnalytics,
  filterDescription: string,
  aiReport?: string,
) {
  const blocks: CsCxReportBlock[] = [];
  if (aiReport?.trim()) {
    blocks.push({
      title: "ANÁLISE EXECUTIVA COM IA",
      subtitle: "Síntese dos indicadores e da voz dos clientes",
      rows: splitReportRows(aiReport),
    });
  }

  blocks.push({
    title: "EVOLUÇÃO MENSAL",
    subtitle: `${analytics.monthly.length} período(s) com respostas`,
    rows: analytics.monthly.map((month) => [
      month.label,
      `NPS ${month.nps} · Nota média ${month.averageScore} · ${month.responses} resposta(s) · ${month.promoters} promotor(es) · ${month.neutrals} neutro(s) · ${month.detractors} detrator(es)`,
    ]),
  });

  if (analytics.attentionClients.length) {
    blocks.push({
      title: "CLIENTES QUE PRECISAM DE ATENÇÃO",
      subtitle: "Pior nota de cada cartório, ordenada da menor para a maior",
      rows: analytics.attentionClients.map((client) => [
        client.name,
        `Nota ${client.score} · ${client.classification} · ${client.reason || "Motivo não informado"}`,
      ]),
    });
  }

  blocks.push({
    title: "DESEMPENHO POR CARTÓRIO",
    subtitle: "Maior NPS primeiro; empates pela resposta mais recente",
    rows: analytics.byOffice.map((office) => [
      office.name,
      `NPS ${office.nps} · Nota média ${office.averageScore} · ${office.responses} resposta(s) · ${office.promoters} promotor(es) · ${office.neutrals} neutro(s) · ${office.detractors} detrator(es)`,
    ]),
  });

  if (analytics.feedback.length) {
    blocks.push({
      title: "VOZ DO CLIENTE",
      subtitle: `${analytics.feedback.length} resposta(s) com comentário`,
      rows: analytics.feedback.slice(0, 100).flatMap((feedback) => [
        [
          `${feedback.office} · Nota ${feedback.score}`,
          feedback.reason || "Motivo não informado",
        ] as CsCxReportRow,
        ...(feedback.suggestion
          ? [["Sugestão", feedback.suggestion] as CsCxReportRow]
          : []),
      ]),
    });
  }

  if (analytics.additionalQuestions.length) {
    blocks.push({
      title: "PERGUNTAS ADICIONAIS",
      subtitle: `${analytics.additionalQuestions.length} pergunta(s) consolidada(s)`,
      rows: analytics.additionalQuestions.flatMap((question) => [
        [
          question.title,
          [
            `${question.answers} resposta(s)`,
            question.averageScore === null
              ? ""
              : `Nota média ${question.averageScore}/10`,
            question.options.length
              ? question.options
                  .map((option) => `${option.label}: ${option.total}`)
                  .join(" · ")
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
        ] as CsCxReportRow,
        ...question.textSamples.map(
          (sample): CsCxReportRow => [sample.office, sample.answer],
        ),
      ]),
    });
  }

  await generateCsCxPdfReport(
    "BI E RELATÓRIO DE NPS",
    filterDescription,
    [
      { label: "NPS", value: analytics.nps },
      { label: "Nota média", value: analytics.averageScore },
      { label: "Respostas", value: analytics.total },
      { label: "Cartórios", value: analytics.officesCount },
    ],
    blocks,
    `bi-nps-${localIsoDate()}.pdf`,
  );
}

export async function generateCsCxPdfReport(title: string, filterDescription: string, summary: CsCxSummaryItem[], blocks: CsCxReportBlock[], filename: string, output: CsCxPdfOutputOptions = {}) {
  if (!blocks.length) throw new Error("Não há dados no filtro atual para exportar.");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const bottom = pageHeight - 15;
  let y = 0;

  const drawHeader = (continued = false) => {
    pdf.setFillColor(210, 0, 55);
    pdf.rect(0, 0, pageWidth, 4, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(20, 25, 35);
    pdf.text(continued ? `${title} · continuação` : title, margin, 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(95, 105, 120);
    pdf.text(`Siplan HUB · Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 14, { align: "right" });
    y = 22;
  };
  const addPage = () => { pdf.addPage(); drawHeader(true); };
  const ensureSpace = (height: number) => { if (y + height > bottom) addPage(); };

  drawHeader();
  const filterLines = pdf.splitTextToSize(clean(filterDescription), contentWidth) as string[];
  pdf.setFontSize(8);
  pdf.setTextColor(70, 80, 95);
  pdf.text(filterLines, margin, y);
  y += filterLines.length * 3.5 + 5;

  const gap = 3;
  const cardWidth = (contentWidth - gap * (summary.length - 1)) / summary.length;
  summary.forEach((item, index) => {
    const x = margin + index * (cardWidth + gap);
    pdf.setFillColor(247, 249, 252);
    pdf.setDrawColor(225, 230, 237);
    pdf.roundedRect(x, y, cardWidth, 17, 1.5, 1.5, "FD");
    pdf.setFillColor(210, 0, 55);
    pdf.rect(x, y, 1.5, 17, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(35, 45, 60);
    pdf.text(String(item.value), x + 4, y + 7);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(95, 105, 120);
    pdf.text(clean(item.label), x + 4, y + 13);
  });
  y += 23;

  blocks.forEach((block) => {
    ensureSpace(17);
    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "F");
    pdf.setFillColor(210, 0, 55);
    pdf.rect(margin, y, 1.5, 12, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(35, 45, 60);
    pdf.text(clean(block.title), margin + 4, y + 5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(95, 105, 120);
    pdf.text(clean(block.subtitle), margin + 4, y + 9.5);
    y += 15;

    block.rows.forEach(([label, value]) => {
      // Mede ambas as colunas com a fonte mais larga usada na linha. O valor,
      // desenhado em peso normal, fica com uma pequena margem adicional.
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      const row = calculateCsCxReportRowLayout(
        label,
        value,
        contentWidth,
        (text, maxWidth) => pdf.splitTextToSize(text, maxWidth) as string[],
      );
      ensureSpace(row.height);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(70, 80, 95);
      pdf.text(row.labelLines, margin + 2, y + 3.2);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(45, 55, 70);
      pdf.text(row.valueLines, margin + 2 + row.valueOffset, y + 3.2);
      pdf.setDrawColor(235, 238, 243);
      pdf.line(margin, y + row.height - 0.5, pageWidth - margin, y + row.height - 0.5);
      y += row.height;
    });
    y += 5;
  });

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(225, 230, 237);
    pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110, 120, 135);
    pdf.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }
  if (output.mode === "print") {
    pdf.autoPrint();
    const blobUrl = URL.createObjectURL(pdf.output("blob"));
    if (output.targetWindow && !output.targetWindow.closed) {
      output.targetWindow.location.replace(blobUrl);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }
    URL.revokeObjectURL(blobUrl);
  }
  pdf.save(filename);
}

export function calculateCsCxReportRowLayout(
  label: string,
  value: string,
  contentWidth: number,
  splitText: (text: string, maxWidth: number) => string[],
): CsCxReportRowLayout {
  const horizontalInset = 2;
  const columnGap = 4;
  const innerWidth = contentWidth - horizontalInset * 2;
  const labelWidth = Math.min(52, Math.max(36, innerWidth * 0.3));
  const valueWidth = innerWidth - labelWidth - columnGap;
  const labelLines = splitText(clean(label), labelWidth);
  const valueLines = splitText(clean(value), valueWidth);
  const lineHeight = 3.4;

  return {
    labelLines,
    valueLines,
    labelWidth,
    valueWidth,
    valueOffset: labelWidth + columnGap,
    height: Math.max(6, Math.max(labelLines.length, valueLines.length) * lineHeight + 2),
  };
}

function clean(value: string) {
  return (value.trim() || "-").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}
function stripMarkdown(value: string) {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/^[-*+]\s+/gm, "- ")
    .replace(/^\d+\.\s+/gm, "- ");
}
function splitReportRows(value: string): CsCxReportRow[] {
  const normalized = stripMarkdown(value).trim();
  const paragraphs = normalized.split(/\n{2,}/).filter(Boolean);
  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n");
    let current = "";
    for (const line of lines) {
      if (current && current.length + line.length + 1 > 900) {
        chunks.push(current);
        current = "";
      }
      current += `${current ? "\n" : ""}${line}`;
    }
    if (current) chunks.push(current);
  }
  return (chunks.length ? chunks : [normalized]).map((chunk, index) => [
    index === 0 ? "Relatório" : "Continuação",
    chunk,
  ]);
}
function formatDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-"); return `${day}/${month}/${year}`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function localIsoDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
