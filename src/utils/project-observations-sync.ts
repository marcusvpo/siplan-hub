import { format } from "date-fns";
import type { ProjectV2 } from "@/types/ProjectV2";
import { supabase } from "@/integrations/supabase/client";
import { transformToProjectV3 } from "@/utils/project-transformers";
import {
  createDefaultObservationsState,
  isLexicalContentEmpty,
  isValidLexicalState,
  LEXICAL_FORMAT_BOLD,
  LEXICAL_FORMAT_ITALIC,
  LEXICAL_FORMAT_STRIKETHROUGH,
  makeTextNode,
  STAGE_COLOR_BY_STATUS,
  SUB_BULLET_ITALIC_COLOR,
  syncProjectStagesIntoObservations,
  type LexicalJsonNode,
} from "@/utils/default-project-observations";

export type SyncStageKey =
  | "infra"
  | "adherence"
  | "conversion"
  | "homologation"
  | "environment"
  | "modelosEditor"
  | "implementation";

export interface StageDriftItem {
  stageKey: SyncStageKey;
  label: string;
  currentText: string;
  expectedText: string;
}

export interface ObservationsDriftResult {
  hasDrift: boolean;
  driftedStages: StageDriftItem[];
}

export interface AutoSubBulletEvent {
  stageKey: SyncStageKey;
  text: string;
}

function walkNodeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const rec = node as Record<string, unknown>;
  if (typeof rec.text === "string") return rec.text;
  if (Array.isArray(rec.children)) {
    return rec.children.map(walkNodeText).join("");
  }
  return "";
}

function normalizeForCompare(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function formatShortDate(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, "dd/MM");
}

function formatWindow(start?: Date | string | null, end?: Date | string | null): string | null {
  const s = formatShortDate(start);
  const e = formatShortDate(end);
  if (s && e) return `${s} a ${e}`;
  return s || e || null;
}

const ANCHOR_DEFS: Array<{
  stageKey: SyncStageKey;
  label: string;
  regex: RegExp;
}> = [
  { stageKey: "infra", label: "Análise de Infra", regex: /^an[aá]lise de infra\s*:/i },
  { stageKey: "adherence", label: "Análise de Aderência", regex: /^an[aá]lise de ader[eê]ncia\s*:/i },
  { stageKey: "conversion", label: "Conversão", regex: /^convers[aã]o\s*:/i },
  { stageKey: "homologation", label: "Homologação", regex: /^homologa[cç][aã]o\s*:/i },
  { stageKey: "environment", label: "Config. Ambiente", regex: /^config\.?\s*ambiente\s*:/i },
  {
    stageKey: "modelosEditor",
    label: "Modelos Editor (Orion TN)",
    regex: /^modelos editor(\s*\(orion tn\))?\s*:/i,
  },
  {
    stageKey: "implementation",
    label: "Implantação & Agenda",
    regex: /^(implanta[cç][aã]o|status\s*\/\s*janela)\s*:/i,
  },
];

function extractAnchorLinesFromLexical(content: string | null | undefined): Map<SyncStageKey, string> {
  const map = new Map<SyncStageKey, string>();
  if (!content) return map;

  let parsed: { root?: { children?: LexicalJsonNode[] } };
  try {
    parsed = JSON.parse(content);
  } catch {
    return map;
  }

  const visit = (nodes: LexicalJsonNode[]) => {
    for (const node of nodes) {
      if (node.type === "listitem" && Array.isArray(node.children)) {
        const hasNestedList = (node.children as LexicalJsonNode[]).some(
          (c) => c.type === "list",
        );
        if (hasNestedList) {
          visit(node.children as LexicalJsonNode[]);
          continue;
        }
        const text = walkNodeText(node).trim();
        for (const def of ANCHOR_DEFS) {
          if (def.regex.test(text) && !map.has(def.stageKey)) {
            map.set(def.stageKey, text);
          }
        }
      } else if (Array.isArray(node.children)) {
        visit(node.children as LexicalJsonNode[]);
      }
    }
  };

  if (Array.isArray(parsed?.root?.children)) {
    visit(parsed.root.children);
  }

  return map;
}

/**
 * Compara o estado real das etapas do projeto com as linhas-âncora atuais em
 * Observações Gerais, detectando desatualizações para o Banner Inteligente.
 */
export function computeObservationsDrift(
  currentContent: string | null | undefined,
  project: Partial<ProjectV2>,
): ObservationsDriftResult {
  if (isLexicalContentEmpty(currentContent)) {
    return { hasDrift: false, driftedStages: [] };
  }

  const currentAnchors = extractAnchorLinesFromLexical(currentContent);
  if (currentAnchors.size === 0) {
    return { hasDrift: false, driftedStages: [] };
  }

  const expectedContent = createDefaultObservationsState(project);
  const expectedAnchors = extractAnchorLinesFromLexical(expectedContent);

  const driftedStages: StageDriftItem[] = [];

  for (const def of ANCHOR_DEFS) {
    const curr = currentAnchors.get(def.stageKey);
    const exp = expectedAnchors.get(def.stageKey);
    if (!curr || !exp) continue;

    // Ignora se o esperado for apenas "Não iniciada" ou placeholder vazio "Prevista —"
    // e o usuário tiver preenchido algo manualmente no texto.
    const expAfterColon = exp.replace(def.regex, "").trim();
    const currAfterColon = curr.replace(def.regex, "").trim();
    const expIsDefaultEmpty =
      !expAfterColon ||
      /^n[aã]o iniciada/i.test(expAfterColon) ||
      /^prevista\s*[-—]?$/i.test(expAfterColon) ||
      /^aguardando envio de minutas/i.test(expAfterColon);

    if (expIsDefaultEmpty) continue;

    // Detecta mudança significativa de status/confirmação/responsável/janela
    const normCurr = normalizeForCompare(currAfterColon);
    const normExp = normalizeForCompare(expAfterColon);

    if (normCurr !== normExp) {
      // Evita falso positivo quando o texto atual já contém o núcleo esperado
      // (ex.: usuário adicionou detalhes extras na mesma linha sem mudar o status)
      const expCore = normExp.split("(")[0].trim();
      if (expCore.length >= 4 && normCurr.includes(expCore)) {
        continue;
      }

      driftedStages.push({
        stageKey: def.stageKey,
        label: def.label,
        currentText: currAfterColon || "(vazio)",
        expectedText: expAfterColon,
      });
    }
  }

  return {
    hasDrift: driftedStages.length > 0,
    driftedStages,
  };
}

/**
 * Insere um sub-bullet datado em itálico cinza logo abaixo da linha-âncora da
 * etapa informada (sem duplicar caso já exista um sub-bullet igual).
 */
export function appendStageSubBulletToLexical(
  content: string,
  stageKey: SyncStageKey,
  subBulletText: string,
): string {
  const cleanText = subBulletText.trim();
  if (!cleanText || !isValidLexicalState(content)) return content;

  const anchorDef = ANCHOR_DEFS.find((d) => d.stageKey === stageKey);
  if (!anchorDef) return content;

  const parsed = JSON.parse(content) as { root: { children: LexicalJsonNode[] } };
  const normalizedTarget = normalizeForCompare(cleanText);

  const makeSubItem = (): LexicalJsonNode => ({
    children: [
      makeTextNode(cleanText, {
        format: LEXICAL_FORMAT_ITALIC,
        color: SUB_BULLET_ITALIC_COLOR,
      }),
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "listitem",
    value: 1,
    version: 1,
  });

  const makeSubWrapper = (val: number): LexicalJsonNode => ({
    children: [
      {
        children: [makeSubItem()],
        direction: "ltr",
        format: "",
        indent: 0,
        listType: "bullet",
        start: 1,
        tag: "ul",
        type: "list",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "listitem",
    value: val,
    version: 1,
  });

  let inserted = false;

  const visitList = (listNode: LexicalJsonNode): LexicalJsonNode => {
    if (!Array.isArray(listNode.children)) return listNode;
    const children = [...(listNode.children as LexicalJsonNode[])];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.type !== "listitem" || !Array.isArray(child.children)) continue;

      const hasNestedList = (child.children as LexicalJsonNode[]).some(
        (g) => g.type === "list",
      );
      if (hasNestedList) {
        children[i] = {
          ...child,
          children: (child.children as LexicalJsonNode[]).map((g) =>
            g.type === "list" ? visitList(g) : g,
          ),
        };
        continue;
      }

      const lineText = walkNodeText(child).trim();
      if (!inserted && anchorDef.regex.test(lineText)) {
        // Verifica se o próximo irmão já é um wrapper de sub-bullets
        const next = children[i + 1];
        if (
          next &&
          next.type === "listitem" &&
          Array.isArray(next.children) &&
          (next.children[0] as LexicalJsonNode)?.type === "list" &&
          (next.children[0] as LexicalJsonNode)?.listType === "bullet"
        ) {
          const subList = next.children[0] as LexicalJsonNode;
          const existingSubs = (subList.children as LexicalJsonNode[]) || [];
          const alreadyExists = existingSubs.some(
            (s) => normalizeForCompare(walkNodeText(s)) === normalizedTarget,
          );
          if (!alreadyExists) {
            subList.children = [
              ...existingSubs,
              { ...makeSubItem(), value: existingSubs.length + 1 },
            ];
          }
          inserted = true;
          break;
        }

        // Insere novo wrapper de sub-bullet imediatamente após a linha da etapa
        children.splice(i + 1, 0, makeSubWrapper(i + 2));
        inserted = true;
        break;
      }
    }

    return { ...listNode, children };
  };

  parsed.root.children = parsed.root.children.map((node) =>
    node.type === "list" ? visitList(node) : node,
  );

  return JSON.stringify(parsed);
}

/**
 * Atualiza a linha "Status / Janela:" preservando a data anterior com tachado
 * quando houver reagendamento da Fase 1.
 */
function applyRescheduledPhase1Window(
  content: string,
  previousProject: Partial<ProjectV2> | undefined,
  nextProject: Partial<ProjectV2>,
): string {
  const prevP1 = previousProject?.stages?.implementation?.phase1;
  const nextP1 = nextProject?.stages?.implementation?.phase1;
  if (!nextP1) return content;

  const prevWin = formatWindow(prevP1?.startDate, prevP1?.endDate);
  const nextWin = formatWindow(nextP1.startDate, nextP1.endDate);
  if (!prevWin || !nextWin || prevWin === nextWin) return content;

  if (!isValidLexicalState(content)) return content;
  const parsed = JSON.parse(content) as { root: { children: LexicalJsonNode[] } };

  const statusText = nextP1.isConfirmed ? "Confirmada" : "Prevista";
  const statusColor = nextP1.isConfirmed
    ? STAGE_COLOR_BY_STATUS.done
    : STAGE_COLOR_BY_STATUS["in-progress"];
  const confirmedAt = formatShortDate(nextP1.confirmedAt);

  const newNodes: LexicalJsonNode[] = [
    makeTextNode("Implantação:", { format: LEXICAL_FORMAT_BOLD }),
    makeTextNode(" "),
    makeTextNode(statusText, { color: statusColor }),
    makeTextNode(" - "),
    makeTextNode(prevWin, { format: LEXICAL_FORMAT_STRIKETHROUGH }),
    makeTextNode(" "),
    makeTextNode(nextWin, { format: LEXICAL_FORMAT_BOLD }),
    makeTextNode(
      nextP1.isConfirmed && confirmedAt ? ` (confirmada em ${confirmedAt}) ` : " ",
    ),
  ];

  const visit = (nodes: LexicalJsonNode[]): LexicalJsonNode[] =>
    nodes.map((n) => {
      if (n.type === "listitem" && Array.isArray(n.children)) {
        const text = walkNodeText(n).trim();
        if (/^(implanta[cç][aã]o|status\s*\/\s*janela)\s*:/i.test(text)) {
          return { ...n, children: newNodes };
        }
      }
      if (Array.isArray(n.children)) {
        return { ...n, children: visit(n.children as LexicalJsonNode[]) };
      }
      return n;
    });

  parsed.root.children = visit(parsed.root.children);
  return JSON.stringify(parsed);
}

/**
 * Detecta automaticamente eventos relevantes entre `previousProject` e `nextProject`
 * (Infra, Aderência, Conversão, Homologação, Ambiente e Fase 1) — SEM Bloqueio Comercial —
 * para gerar sub-bullets datados em itálico cinza.
 */
export function detectAutoSubBulletEvents(
  previousProject: Partial<ProjectV2> | undefined,
  nextProject: Partial<ProjectV2>,
): AutoSubBulletEvent[] {
  if (!previousProject?.stages || !nextProject.stages) return [];
  const today = format(new Date(), "dd/MM");
  const events: AutoSubBulletEvent[] = [];

  // 1. Infraestrutura
  const prevInfra = previousProject.stages.infra;
  const nextInfra = nextProject.stages.infra;
  if (prevInfra && nextInfra && prevInfra.status !== nextInfra.status) {
    if (nextInfra.status === "done") {
      events.push({
        stageKey: "infra",
        text: `${today} - Análise de Infraestrutura concluída${nextInfra.responsible ? ` por ${nextInfra.responsible}` : ""}.`,
      });
    }
  }

  // 2. Aderência
  const prevAdh = previousProject.stages.adherence;
  const nextAdh = nextProject.stages.adherence;
  if (prevAdh && nextAdh && prevAdh.status !== nextAdh.status) {
    const labelMap: Record<string, string> = {
      done: "Adequado",
      waiting_adjustment: "Em Adequação",
      blocked: "Inadequado",
    };
    if (labelMap[nextAdh.status]) {
      events.push({
        stageKey: "adherence",
        text: `${today} - Análise de Aderência atualizada para "${labelMap[nextAdh.status]}"${nextAdh.responsible ? ` (${nextAdh.responsible})` : ""}.`,
      });
    }
  }

  // 3. Conversão & Homologação
  const prevConv = previousProject.stages.conversion;
  const nextConv = nextProject.stages.conversion;
  if (prevConv && nextConv) {
    if (prevConv.responsible !== nextConv.responsible && nextConv.responsible?.trim()) {
      events.push({
        stageKey: "conversion",
        text: `${today} - Conversão assumida por ${nextConv.responsible.trim()}.`,
      });
    }
    if (prevConv.status !== nextConv.status && nextConv.status === "done") {
      events.push({
        stageKey: "conversion",
        text: `${today} - Conversão finalizada${nextConv.responsible ? ` por ${nextConv.responsible}` : ""}.`,
      });
    }
    if (
      prevConv.homologationStatus !== nextConv.homologationStatus &&
      nextConv.homologationStatus
    ) {
      events.push({
        stageKey: "homologation",
        text: `${today} - Homologação marcada como "${nextConv.homologationStatus}"${nextConv.homologationResponsible ? ` por ${nextConv.homologationResponsible}` : ""}.`,
      });
    }
  }

  // 4. Ambiente
  const prevEnv = previousProject.stages.environment;
  const nextEnv = nextProject.stages.environment;
  if (prevEnv && nextEnv) {
    if (prevEnv.status !== nextEnv.status && nextEnv.status === "done") {
      events.push({
        stageKey: "environment",
        text: `${today} - Preparação de Ambiente concluída${nextEnv.responsible ? ` por ${nextEnv.responsible}` : ""}.`,
      });
    }
  }

  // 5. Fase 1 (Confirmação / Reagendamento)
  const prevP1 = previousProject.stages.implementation?.phase1;
  const nextP1 = nextProject.stages.implementation?.phase1;
  if (prevP1 && nextP1) {
    if (!prevP1.isConfirmed && nextP1.isConfirmed) {
      const win = formatWindow(nextP1.startDate, nextP1.endDate);
      events.push({
        stageKey: "implementation",
        text: `${today} - Implantação Fase 1 confirmada${win ? ` (${win})` : ""}${nextP1.responsible ? ` - ${nextP1.responsible}` : ""}.`,
      });
    }
  }

  return events;
}

/**
 * Executa a sincronização automática completa das Observações Gerais de um projeto:
 * - Atualiza linhas-âncora das etapas preservando anotações manuais;
 * - Preserva data anterior tachada em caso de reagendamento da Fase 1;
 * - Anexa sub-bullets datados para eventos relevantes das etapas.
 */
export function buildSyncedNotesForProjectUpdate(params: {
  previousProject?: Partial<ProjectV2>;
  nextProject: ProjectV2;
  actorName: string;
  explicitEvents?: AutoSubBulletEvent[];
}): ProjectV2["notes"] | null {
  const { previousProject, nextProject, actorName, explicitEvents = [] } = params;

  // Só atua automaticamente em projetos ativos ou pausados
  if (
    nextProject.globalStatus !== "in-progress" &&
    nextProject.globalStatus !== "blocked"
  ) {
    return null;
  }

  const currentContent = nextProject.notes?.blocks?.[0]?.content || "";
  const { content: syncedBase } = syncProjectStagesIntoObservations(
    currentContent,
    nextProject,
  );

  let nextContent = applyRescheduledPhase1Window(
    syncedBase,
    previousProject,
    nextProject,
  );

  const autoEvents = [
    ...detectAutoSubBulletEvents(previousProject, nextProject),
    ...explicitEvents,
  ];

  for (const ev of autoEvents) {
    nextContent = appendStageSubBulletToLexical(nextContent, ev.stageKey, ev.text);
  }

  if (nextContent === currentContent) {
    return null;
  }

  return {
    id: nextProject.notes?.id || crypto.randomUUID(),
    projectId: nextProject.id,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        content: nextContent,
        checked: false,
      },
    ],
    lastEditedBy: actorName || "Sincronização Automática",
    lastEditedAt: new Date(),
  };
}

/**
 * Helper assíncrono best-effort para sincronizar Observações Gerais no Supabase
 * a partir de telas externas que atualizam etapas diretamente (ex.: /implantadores/aderencia,
 * /conversion/atividades).
 */
export async function syncProjectObservationsInDb(params: {
  projectId: string;
  actorName: string;
  explicitEvents?: AutoSubBulletEvent[];
}): Promise<void> {
  try {
    const { data: row, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", params.projectId)
      .maybeSingle();

    if (error || !row) return;

    const project = transformToProjectV3(row as Record<string, unknown>);
    const nextNotes = buildSyncedNotesForProjectUpdate({
      nextProject: project,
      actorName: params.actorName,
      explicitEvents: params.explicitEvents,
    });

    if (!nextNotes) return;

    await supabase
      .from("projects")
      .update({
        notes: nextNotes as unknown as Record<string, unknown>,
      })
      .eq("id", params.projectId);
  } catch (err) {
    console.warn("[syncProjectObservationsInDb] Falha silenciosa ao espelhar observações:", err);
  }
}
