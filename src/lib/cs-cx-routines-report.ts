import type { CsCxOfficeRoutine, CsCxRoutineModel } from "@/hooks/useCsCxRoutines";
import { generateCsCxPdfReport, type CsCxReportBlock, type CsCxReportRow } from "@/lib/cs-cx-experience-pdf";
import { downloadXlsxWorkbook, type XlsxSheet } from "@/lib/xlsx-export";

export interface RoutineReportAnalytics {
  totalApplications: number;
  activeApplications: number;
  activeItems: number;
  inactiveItems: number;
  pendingItems: number;
  byCategory: Array<{ name: string; total: number; color: string }>;
  byMonth: Array<{ month: string; total: number }>;
  popularModels: Array<{ name: string; total: number }>;
}

export function buildRoutineReportAnalytics(routines: CsCxOfficeRoutine[]): RoutineReportAnalytics {
  const items = routines.flatMap((routine) => routine.items);
  const categoryGroups = new Map<string, { name: string; total: number; color: string }>();
  items.filter((item) => item.active === true).forEach((item) => {
    const category = item.model_item?.category;
    const key = category?.id ?? "uncategorized";
    const current = categoryGroups.get(key) ?? { name: category?.name ?? "Sem categoria", total: 0, color: category?.display_color ?? "#64748b" };
    current.total += 1;
    categoryGroups.set(key, current);
  });

  const monthGroups = new Map<string, number>();
  routines.forEach((routine) => {
    const date = new Date(routine.applied_at);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthGroups.set(key, (monthGroups.get(key) ?? 0) + 1);
  });

  const modelGroups = new Map<string, number>();
  routines.forEach((routine) => {
    const name = routine.routine_model?.name ?? "Modelo removido";
    modelGroups.set(name, (modelGroups.get(name) ?? 0) + 1);
  });

  return {
    totalApplications: routines.length,
    activeApplications: routines.filter((routine) => routine.active).length,
    activeItems: items.filter((item) => item.active === true).length,
    inactiveItems: items.filter((item) => item.active === false).length,
    pendingItems: items.filter((item) => item.active === null).length,
    byCategory: Array.from(categoryGroups.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR")),
    byMonth: Array.from(monthGroups, ([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month)),
    popularModels: Array.from(modelGroups, ([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR")),
  };
}

export async function generateCsCxRoutinePdf(routine: CsCxOfficeRoutine) {
  const analytics = buildRoutineReportAnalytics([routine]);
  await generateCsCxPdfReport(
    "CONFIGURAÇÕES DA ROTINA",
    `${routine.registry_office?.name ?? "Cartório removido"} · ${routine.routine_model?.name ?? "Modelo removido"} · Aplicada em ${formatDateTime(routine.applied_at)}`,
    [
      { label: "Configurações", value: routine.items.length },
      { label: "Ativas", value: analytics.activeItems },
      { label: "Inativas", value: analytics.inactiveItems },
      { label: "A analisar", value: analytics.pendingItems },
    ],
    routineBlocks(routine),
    `rotina-${safeFilename(routine.registry_office?.name ?? "cartorio")}-${localIsoDate()}.pdf`,
  );
}

export async function generateCsCxRoutinesPdf(routines: CsCxOfficeRoutine[], filterDescription: string) {
  const analytics = buildRoutineReportAnalytics(routines);
  const blocks = routines.map((routine): CsCxReportBlock => ({
    title: routine.registry_office?.name ?? "Cartório removido",
    subtitle: `${routine.routine_model?.name ?? "Modelo removido"} · ${routine.active ? "Ativa" : "Inativa"} · ${formatDateTime(routine.applied_at)}`,
    rows: [
      ["Configurações", `${routine.items.length} total · ${routine.items.filter((item) => item.active === true).length} ativas · ${routine.items.filter((item) => item.active === null).length} a analisar`],
      ["Descrição do modelo", routine.routine_model?.description ?? "Sem descrição"],
      ["Observações", routine.notes ?? "Não informadas"],
      ["Itens", routine.items.map((item) => `${item.model_item?.name ?? "Item removido"} (${statusLabel(item.active)})`).join("; ") || "Nenhum item"],
    ],
  }));
  await generateCsCxPdfReport(
    "RELATÓRIO DE ROTINAS",
    filterDescription,
    [
      { label: "Aplicações", value: analytics.totalApplications },
      { label: "Aplicações ativas", value: analytics.activeApplications },
      { label: "Itens ativos", value: analytics.activeItems },
      { label: "A analisar", value: analytics.pendingItems },
    ],
    blocks,
    `relatorio-rotinas-${localIsoDate()}.pdf`,
  );
}

export function buildCsCxRoutinesWorkbook(routines: CsCxOfficeRoutine[], models: CsCxRoutineModel[]): XlsxSheet[] {
  const analytics = buildRoutineReportAnalytics(routines);
  const modelApplications = new Map<string, number>();
  routines.forEach((routine) => modelApplications.set(routine.routine_model_id, (modelApplications.get(routine.routine_model_id) ?? 0) + 1));

  return [
    {
      name: "Resumo Geral",
      rows: [
        ["Métrica", "Valor"],
        ["Total de modelos", models.length],
        ["Modelos ativos", models.filter((model) => model.active).length],
        ["Total de aplicações", analytics.totalApplications],
        ["Aplicações ativas", analytics.activeApplications],
        ["Total de configurações", analytics.activeItems + analytics.inactiveItems + analytics.pendingItems],
        ["Configurações ativas", analytics.activeItems],
        ["Configurações inativas", analytics.inactiveItems],
        ["Configurações a analisar", analytics.pendingItems],
      ],
    },
    {
      name: "Modelos de Rotina",
      rows: [
        ["ID", "Nome", "Descrição", "Ativo", "Total Itens", "Total Aplicações", "Produtos", "Origem"],
        ...models.map((model) => [
          model.legacy_id ?? model.id,
          model.name,
          model.description ?? "",
          yesNo(model.active),
          model.item_count,
          modelApplications.get(model.id) ?? 0,
          model.products.map((product) => product.name).join(", "),
          model.origin === "legacy" ? "Legado" : "HUB",
        ]),
      ],
    },
    {
      name: "Aplicações por Cartório",
      rows: [
        ["ID", "Cartório", "Modelo", "Status", "Total Configurações", "Configurações Ativas", "A Analisar", "Data Aplicação", "Observação", "Origem"],
        ...routines.map((routine) => [
          routine.legacy_id ?? routine.id,
          routine.registry_office?.name ?? "Cartório removido",
          routine.routine_model?.name ?? "Modelo removido",
          routine.active ? "Ativa" : "Inativa",
          routine.items.length,
          routine.items.filter((item) => item.active === true).length,
          routine.items.filter((item) => item.active === null).length,
          formatDateTime(routine.applied_at),
          routine.notes ?? "",
          routine.origin === "legacy" ? "Legado" : "HUB",
        ]),
      ],
    },
    {
      name: "Configurações por Item",
      rows: [
        ["Cartório", "Modelo", "Item", "Categoria", "Tipo", "Status", "Obrigatório", "Data Análise", "Observação da Análise"],
        ...routines.flatMap((routine) => routine.items.map((item) => [
          routine.registry_office?.name ?? "Cartório removido",
          routine.routine_model?.name ?? "Modelo removido",
          item.model_item?.name ?? "Item removido",
          item.model_item?.category?.name ?? "Sem categoria",
          item.model_item?.routine_type?.name ?? "Sem tipo",
          statusLabel(item.active),
          yesNo(Boolean(item.model_item?.required)),
          item.analyzed_at ? formatDateTime(item.analyzed_at) : "",
          item.analysis_notes ?? item.notes ?? "",
        ])),
      ],
    },
  ];
}

export async function generateCsCxRoutinesXlsx(routines: CsCxOfficeRoutine[], models: CsCxRoutineModel[]) {
  if (!routines.length && !models.length) throw new Error("Não há dados no filtro atual para exportar.");
  await downloadXlsxWorkbook(`relatorio-rotinas-${localIsoDate()}.xlsx`, buildCsCxRoutinesWorkbook(routines, models));
}

function routineBlocks(routine: CsCxOfficeRoutine): CsCxReportBlock[] {
  const groups = new Map<string, typeof routine.items>();
  routine.items.forEach((item) => {
    const category = item.model_item?.category?.name ?? "Sem categoria";
    groups.set(category, [...(groups.get(category) ?? []), item]);
  });
  const categoryBlocks = Array.from(groups, ([category, items]) => ({
    title: `Categoria: ${category}`,
    subtitle: `${items.length} configuração(ões)`,
    rows: items.flatMap((item) => [
      [item.model_item?.name ?? "Item removido", `${item.model_item?.routine_type?.name ?? "Sem tipo"} · ${statusLabel(item.active)}${item.model_item?.required ? " · Obrigatório" : ""}`] as CsCxReportRow,
      ...((item.analysis_notes || item.notes) ? [["Observações", item.analysis_notes ?? item.notes ?? ""] as CsCxReportRow] : []),
    ]),
  }));
  return [
    {
      title: "Informações da rotina",
      subtitle: routine.active ? "Aplicação ativa" : "Aplicação inativa",
      rows: [
        ["Modelo", routine.routine_model?.name ?? "Modelo removido"],
        ["Data da aplicação", formatDateTime(routine.applied_at)],
        ["Observações", routine.notes ?? "Não informadas"],
      ],
    },
    ...categoryBlocks,
  ];
}

function statusLabel(active: boolean | null) {
  return active === true ? "Ativo" : active === false ? "Inativo" : "Analisar";
}

function yesNo(value: boolean) { return value ? "Sim" : "Não"; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function localIsoDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function safeFilename(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLocaleLowerCase("pt-BR") || "cartorio"; }
