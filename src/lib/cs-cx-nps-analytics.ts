import type { CsCxNpsResponse } from "@/hooks/useCsCxExperience";

export interface NpsAnalyticsFilters {
  startDate: string;
  endDate: string;
  officeId: string;
}

export interface NpsAnalyticsPoint {
  key: string;
  label: string;
  responses: number;
  promoters: number;
  neutrals: number;
  detractors: number;
  nps: number;
  averageScore: number;
}

export interface NpsOfficeAnalytics extends NpsAnalyticsPoint {
  officeId: string;
  name: string;
}

export interface NpsFeedbackItem {
  id: string;
  office: string;
  score: number;
  classification: CsCxNpsResponse["classification"];
  respondedAt: string;
  reason: string | null;
  suggestion: string | null;
}

export interface NpsQuestionAnalytics {
  key: string;
  title: string;
  type: string;
  answers: number;
  averageScore: number | null;
  options: Array<{ label: string; total: number }>;
  textSamples: Array<{ office: string; answer: string }>;
}

export interface NpsAnalytics {
  responses: CsCxNpsResponse[];
  total: number;
  promoters: number;
  neutrals: number;
  detractors: number;
  nps: number;
  averageScore: number;
  officesCount: number;
  monthly: NpsAnalyticsPoint[];
  byOffice: NpsOfficeAnalytics[];
  feedback: NpsFeedbackItem[];
  additionalQuestions: NpsQuestionAnalytics[];
  trendDelta: number | null;
}

export const EMPTY_NPS_FILTERS: NpsAnalyticsFilters = {
  startDate: "",
  endDate: "",
  officeId: "all",
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function officeName(response: CsCxNpsResponse) {
  return (
    response.registry_office?.name ||
    response.respondent_office ||
    "Cartório não informado"
  );
}

function metrics(
  responses: CsCxNpsResponse[],
): Omit<NpsAnalyticsPoint, "key" | "label"> {
  const promoters = responses.filter(
    (item) => item.classification === "PROMOTOR",
  ).length;
  const neutrals = responses.filter(
    (item) => item.classification === "NEUTRO",
  ).length;
  const detractors = responses.filter(
    (item) => item.classification === "DETRATOR",
  ).length;
  return {
    responses: responses.length,
    promoters,
    neutrals,
    detractors,
    nps: responses.length
      ? rounded(((promoters - detractors) / responses.length) * 100)
      : 0,
    averageScore: responses.length
      ? rounded(
          responses.reduce((sum, response) => sum + response.score, 0) /
            responses.length,
        )
      : 0,
  };
}

export function filterNpsResponses(
  responses: CsCxNpsResponse[],
  filters: NpsAnalyticsFilters,
) {
  return responses.filter((response) => {
    const responseDate = response.responded_at.slice(0, 10);
    return (
      (!filters.startDate || responseDate >= filters.startDate) &&
      (!filters.endDate || responseDate <= filters.endDate) &&
      (filters.officeId === "all" ||
        response.registry_office_id === filters.officeId)
    );
  });
}

export function buildNpsAnalytics(
  responses: CsCxNpsResponse[],
  filters: NpsAnalyticsFilters = EMPTY_NPS_FILTERS,
): NpsAnalytics {
  const filtered = filterNpsResponses(responses, filters);
  const totals = metrics(filtered);

  const monthlyGroups = new Map<string, CsCxNpsResponse[]>();
  const officeGroups = new Map<
    string,
    { id: string; name: string; responses: CsCxNpsResponse[] }
  >();
  const questionGroups = new Map<
    string,
    {
      title: string;
      type: string;
      answers: number;
      scores: number[];
      options: Map<string, number>;
      textSamples: Array<{ office: string; answer: string }>;
    }
  >();

  for (const response of filtered) {
    const month = response.responded_at.slice(0, 7);
    monthlyGroups.set(month, [...(monthlyGroups.get(month) ?? []), response]);

    const id = response.registry_office_id || officeName(response);
    const current = officeGroups.get(id) ?? {
      id,
      name: officeName(response),
      responses: [],
    };
    current.responses.push(response);
    officeGroups.set(id, current);

    for (const question of response.questionnaire_snapshot?.questions ?? []) {
      if (question.semantic_key) continue;
      const answer = response.answers?.[question.id];
      if (answer === undefined || answer === null || answer === "") continue;
      if (Array.isArray(answer) && !answer.length) continue;
      const key = `${question.type}:${question.title.trim().toLocaleLowerCase("pt-BR")}`;
      const group = questionGroups.get(key) ?? {
        title: question.title,
        type: question.type,
        answers: 0,
        scores: [],
        options: new Map<string, number>(),
        textSamples: [],
      };
      group.answers += 1;
      if (typeof answer === "number") group.scores.push(answer);
      if (question.type === "single_choice" || question.type === "multiple_choice") {
        const choices = Array.isArray(answer) ? answer : [answer];
        for (const choice of choices) {
          const label = String(choice).trim();
          if (label) group.options.set(label, (group.options.get(label) ?? 0) + 1);
        }
      } else if (
        (question.type === "text" || question.type === "textarea") &&
        typeof answer === "string" &&
        answer.trim()
      ) {
        group.textSamples.push({
          office: officeName(response),
          answer: answer.trim(),
        });
      }
      questionGroups.set(key, group);
    }
  }

  const monthly = [...monthlyGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, monthResponses]) => ({
      key,
      label: monthFormatter.format(new Date(`${key}-01T12:00:00Z`)),
      ...metrics(monthResponses),
    }));

  const byOffice = [...officeGroups.values()]
    .map((group) => ({
      key: group.id,
      officeId: group.id,
      name: group.name,
      label: group.name,
      ...metrics(group.responses),
    }))
    .sort(
      (left, right) =>
        left.nps - right.nps ||
        right.responses - left.responses ||
        left.name.localeCompare(right.name, "pt-BR"),
    );

  const feedback = filtered
    .filter(
      (response) =>
        response.score_reason?.trim() ||
        response.improvement_suggestion?.trim(),
    )
    .sort((left, right) => {
      const priority = { DETRATOR: 0, NEUTRO: 1, PROMOTOR: 2 } as const;
      return (
        priority[left.classification] - priority[right.classification] ||
        right.responded_at.localeCompare(left.responded_at)
      );
    })
    .map((response) => ({
      id: response.id,
      office: officeName(response),
      score: response.score,
      classification: response.classification,
      respondedAt: response.responded_at,
      reason: response.score_reason?.trim() || null,
      suggestion: response.improvement_suggestion?.trim() || null,
    }));

  const additionalQuestions = [...questionGroups.entries()]
    .map(([key, group]) => ({
      key,
      title: group.title,
      type: group.type,
      answers: group.answers,
      averageScore: group.scores.length
        ? rounded(
            group.scores.reduce((sum, score) => sum + score, 0) /
              group.scores.length,
          )
        : null,
      options: [...group.options.entries()]
        .map(([label, total]) => ({ label, total }))
        .sort((left, right) => right.total - left.total),
      textSamples: group.textSamples.slice(0, 50),
    }))
    .sort((left, right) => right.answers - left.answers);

  return {
    responses: filtered,
    total: totals.responses,
    promoters: totals.promoters,
    neutrals: totals.neutrals,
    detractors: totals.detractors,
    nps: totals.nps,
    averageScore: totals.averageScore,
    officesCount: byOffice.length,
    monthly,
    byOffice,
    feedback,
    additionalQuestions,
    trendDelta:
      monthly.length > 1
        ? rounded(
            monthly[monthly.length - 1].nps -
              monthly[monthly.length - 2].nps,
          )
        : null,
  };
}

export function npsFilterDescription(
  filters: NpsAnalyticsFilters,
  office?: string,
) {
  const period =
    filters.startDate || filters.endDate
      ? `${formatDate(filters.startDate) || "início"} a ${formatDate(filters.endDate) || "hoje"}`
      : "Todo o período";
  return `${period} · ${office || "Todos os cartórios"}`;
}

export function buildNpsAiSource(
  analytics: NpsAnalytics,
  filterDescription: string,
) {
  const latest = analytics.monthly.at(-1);
  const previous = analytics.monthly.at(-2);
  const priorities = analytics.byOffice.slice(0, 5);
  const feedback = analytics.feedback.slice(0, 100);
  const omitted = Math.max(0, analytics.feedback.length - feedback.length);

  return [
    "RELATÓRIO EXECUTIVO DE NPS",
    "",
    `Recorte analisado: ${filterDescription}.`,
    `Foram consideradas ${analytics.total} respostas de ${analytics.officesCount} cartório(s).`,
    `O NPS do recorte é ${analytics.nps}, com nota média ${analytics.averageScore}.`,
    `A distribuição é de ${analytics.promoters} promotores, ${analytics.neutrals} neutros e ${analytics.detractors} detratores.`,
    "",
    "**Evolução**",
    latest
      ? `No período mais recente (${latest.label}), o NPS foi ${latest.nps}, com ${latest.responses} resposta(s).`
      : "Não há períodos com respostas no recorte.",
    previous && latest
      ? `Em relação a ${previous.label}, houve variação de ${analytics.trendDelta} ponto(s) de NPS.`
      : "Ainda não há dois períodos mensais para comparar a tendência.",
    "",
    "**Cartórios que exigem atenção**",
    ...(priorities.length
      ? priorities.map(
          (office) =>
            `- ${office.name}: NPS ${office.nps}, nota média ${office.averageScore}, ${office.responses} resposta(s), ${office.detractors} detrator(es) e ${office.neutrals} neutro(s).`,
        )
      : ["- Nenhum cartório no recorte."]),
    "",
    "**Voz do cliente disponível para análise**",
    ...(feedback.length
      ? feedback.map((item) =>
          [
            `- ${item.office}; nota ${item.score}; ${item.classification}.`,
            item.reason ? `Motivo: ${compact(item.reason, 500)}.` : "",
            item.suggestion
              ? `Sugestão: ${compact(item.suggestion, 500)}.`
              : "",
          ]
            .filter(Boolean)
            .join(" "),
        )
      : ["- Nenhum comentário textual no recorte."]),
    omitted
      ? `- ${omitted} comentário(s) adicional(is) foram omitidos por limite de processamento.`
      : "",
    "",
    "**Resultados das perguntas adicionais**",
    ...(analytics.additionalQuestions.length
      ? analytics.additionalQuestions.flatMap((question) => [
          `- ${question.title}: ${question.answers} resposta(s)${question.averageScore === null ? "" : `; nota média ${question.averageScore}/10`}${question.options.length ? `; opções: ${question.options.map((option) => `${option.label} (${option.total})`).join(", ")}` : ""}.`,
          ...question.textSamples.map(
            (sample) =>
              `- ${question.title} · ${sample.office}: ${compact(sample.answer, 500)}`,
          ),
        ])
      : ["- O recorte não possui respostas para perguntas adicionais."]),
    "",
    "**Plano de ação baseado nos dados**",
    analytics.detractors
      ? `- Priorizar contato de recuperação com os ${analytics.detractors} detrator(es) do recorte.`
      : "- Não há detratores no recorte; manter as práticas associadas aos promotores.",
    analytics.neutrals
      ? `- Investigar oportunidades de evolução com os ${analytics.neutrals} cliente(s) neutro(s).`
      : "- Não há respostas neutras no recorte.",
    priorities[0]
      ? `- Começar o acompanhamento por ${priorities[0].name}, considerando também a amostra de ${priorities[0].responses} resposta(s).`
      : "",
    analytics.total < 20
      ? `- Interpretar percentuais com cautela: a amostra possui somente ${analytics.total} resposta(s).`
      : "- Acompanhar a evolução mensal e validar se os temas dos comentários se repetem.",
  ]
    .filter(Boolean)
    .join("\n");
}

function compact(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max
    ? `${normalized.slice(0, max).trim()}…`
    : normalized;
}

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
