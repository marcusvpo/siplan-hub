import { format } from "date-fns";
import type { SerializedEditorState } from "lexical";
import type { ProjectV2, StageStatus } from "@/types/ProjectV2";

// Bitmask oficial do Lexical (FORMAT_TEXT_COMMAND)
export const LEXICAL_FORMAT_NORMAL = 0;
export const LEXICAL_FORMAT_BOLD = 1;
export const LEXICAL_FORMAT_ITALIC = 2;
export const LEXICAL_FORMAT_STRIKETHROUGH = 4;
export const LEXICAL_FORMAT_UNDERLINE = 8;

// Cor azul suave para os títulos H3 do modelo padrão
export const OBSERVATIONS_HEADING_COLOR = "#60A5FA";

// Cor cinza para sub-bullets de detalhamento/cobrança em itálico
export const SUB_BULLET_ITALIC_COLOR = "#6B7280";

/**
 * Paleta exata do semáforo de status das Etapas do Siplan HUB
 * (espelhando GeneralInfoTab.tsx e StageCard.tsx).
 */
export const STAGE_TRAFFIC_LIGHT_COLORS = [
  {
    status: "done" as StageStatus,
    label: "Concluído / OK",
    hex: "#10B981", // emerald-500
    tailwind: "emerald-500",
  },
  {
    status: "in-progress" as StageStatus,
    label: "Em Andamento / Em Análise",
    hex: "#3B82F6", // blue-500
    tailwind: "blue-500",
  },
  {
    status: "blocked" as StageStatus,
    label: "Aguardando / Pendência / Bloqueado",
    hex: "#F59E0B", // amber-500
    tailwind: "amber-500",
  },
  {
    status: "waiting_adjustment" as StageStatus,
    label: "Em Adequação / Impeditivo Crítico",
    hex: "#F97316", // orange-500
    tailwind: "orange-500",
  },
] as const;

export const STAGE_COLOR_BY_STATUS: Record<StageStatus, string> = {
  done: "#10B981",
  "in-progress": "#3B82F6",
  blocked: "#F59E0B",
  waiting_adjustment: "#F97316",
  todo: "",
};

const SUPPORTED_NODE_TYPES = new Set([
  "autolink",
  "code",
  "code-highlight",
  "heading",
  "linebreak",
  "link",
  "list",
  "listitem",
  "mention",
  "paragraph",
  "quote",
  "root",
  "tab",
  "text",
]);

export type LexicalJsonNode = Record<string, unknown>;

export function makeTextNode(
  text: string,
  options?: { format?: number; color?: string },
): LexicalJsonNode {
  const color = options?.color?.trim();
  return {
    detail: 0,
    format: options?.format ?? LEXICAL_FORMAT_NORMAL,
    mode: "normal",
    style: color ? `color: ${color};` : "",
    text,
    type: "text",
    version: 1,
  };
}

function makeHeadingNode(text: string, color = OBSERVATIONS_HEADING_COLOR): LexicalJsonNode {
  return {
    children: [makeTextNode(text, { format: LEXICAL_FORMAT_BOLD, color })],
    direction: "ltr",
    format: "",
    indent: 0,
    tag: "h3",
    type: "heading",
    version: 1,
  };
}

function makeChecklistItem(
  children: LexicalJsonNode[],
  value: number,
  checked = false,
): LexicalJsonNode {
  return {
    checked,
    children,
    direction: "ltr",
    format: "",
    indent: 0,
    type: "listitem",
    value,
    version: 1,
  };
}

function makeBulletItem(children: LexicalJsonNode[], value: number): LexicalJsonNode {
  return {
    children,
    direction: "ltr",
    format: "",
    indent: 0,
    type: "listitem",
    value,
    version: 1,
  };
}

function makeNestedListWrapper(nestedList: LexicalJsonNode, value: number): LexicalJsonNode {
  return {
    children: [nestedList],
    direction: null,
    format: "",
    indent: 0,
    type: "listitem",
    value,
    version: 1,
  };
}

function makeListNode(
  listType: "check" | "bullet",
  children: LexicalJsonNode[],
): LexicalJsonNode {
  return {
    children,
    direction: "ltr",
    format: "",
    indent: 0,
    listType,
    start: 1,
    tag: "ul",
    type: "list",
    version: 1,
  };
}

function wrapRoot(children: LexicalJsonNode[]): string {
  return JSON.stringify({
    root: {
      children,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
}

function formatShortDate(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, "dd/MM");
}

function isProjectOrionTN(project?: Partial<ProjectV2> | null): boolean {
  if (!project) return false;
  if (project.systemType === "Orion TN") return true;
  if (
    Array.isArray(project.products) &&
    project.products.some((p) => p === "Orion TN" || p === "OrionTN")
  ) {
    return true;
  }
  return false;
}

function getDefaultAdherenceTeam(systemType?: string): string {
  const normalized = (systemType || "").toLowerCase();
  if (normalized.includes("reg")) return "Julio Araujo";
  if (normalized.includes("pro")) return "Rodrigo Brites / Rodrigo Mizuno";
  if (normalized.includes("tn")) return "Rodrigo Brites / Ricardo Vieira";
  return "Equipe de Implantadores";
}

function getDefaultHomologationResponsible(systemType?: string): string | null {
  const normalized = (systemType || "").toLowerCase();
  if (normalized.includes("reg")) return "Julio Araujo";
  return null;
}

function statusLabel(
  status: StageStatus | undefined,
  stage: "infra" | "adherence" | "conversion" | "environment" | "modelos",
): string {
  switch (status) {
    case "done":
      return stage === "adherence" ? "Adequado" : "Concluída";
    case "in-progress":
      return stage === "adherence" ? "Em análise" : "Em andamento";
    case "blocked":
      return stage === "adherence" ? "Inadequado / Bloqueado" : "Bloqueado";
    case "waiting_adjustment":
      return "Em adequação";
    default:
      return "Não iniciada";
  }
}

const BLOCKING_REASON_LABELS: Record<string, string> = {
  "awaiting-purchase": "Aguardando compra de equipamento",
  "os-upgrade": "Atualização de sistema operacional",
  "network-unstable": "Instabilidade de rede",
  "legacy-conflict": "Conflito com sistema legado",
  "client-access": "Aguardando acesso remoto do cliente",
  other: "Pendência com cliente",
};

function buildInfraInlineNodes(project?: Partial<ProjectV2> | null): {
  nodes: LexicalJsonNode[];
  checked: boolean;
} {
  const labelNode = makeTextNode("Análise de Infra:", { format: LEXICAL_FORMAT_BOLD });
  const infra = project?.stages?.infra;
  if (!infra) {
    return {
      checked: false,
      nodes: [labelNode, makeTextNode(" ")],
    };
  }

  const status = infra.status || "todo";
  const color = STAGE_COLOR_BY_STATUS[status];
  const resp = infra.responsible?.trim() || project?.responsibleInfra?.trim();
  const dispatchDate = formatShortDate(
    infra.infraDispatchedAt || project?.infraDispatchedAt || project?.createdAt,
  );
  const doneDate = formatShortDate(infra.endDate);

  const nodes: LexicalJsonNode[] = [labelNode, makeTextNode(" ")];

  if (status === "todo") {
    nodes.push(makeTextNode("Não iniciada "));
    return { checked: false, nodes };
  }

  nodes.push(makeTextNode(statusLabel(status, "infra"), { color }));

  if (status === "done") {
    const extras: string[] = [];
    if (resp) extras.push(`por ${resp}`);
    if (doneDate) extras.push(`em ${doneDate}`);
    const techSummary = [
      infra.serverStatus ? `Servidor: ${infra.serverStatus}` : null,
      infra.workstationsStatus ? `Estações: ${infra.workstationsStatus}` : null,
    ].filter(Boolean);
    const tail = [
      extras.length ? ` ${extras.join(" ")}` : "",
      techSummary.length ? ` (${techSummary.join(" • ")})` : "",
    ].join("");
    nodes.push(makeTextNode(`${tail} `));
    return { checked: true, nodes };
  }

  if (status === "in-progress") {
    if (resp) {
      nodes.push(
        makeTextNode(
          ` com ${resp}${dispatchDate ? ` (disparado em ${dispatchDate})` : ""} `,
        ),
      );
    } else {
      nodes.push(
        makeTextNode(
          ` (Passado ao Alex Silva e Bruno Fernandes${dispatchDate ? ` em ${dispatchDate}` : ""}) `,
        ),
      );
    }
    return { checked: false, nodes };
  }

  // blocked ou waiting_adjustment
  const reason = infra.blockingReason
    ? BLOCKING_REASON_LABELS[infra.blockingReason] || infra.blockingReason
    : null;
  const detailParts = [resp ? `com ${resp}` : null, reason].filter(Boolean);
  nodes.push(
    makeTextNode(detailParts.length ? ` (${detailParts.join(" - ")}) ` : " "),
  );
  return { checked: false, nodes };
}

function buildAdherenceInlineNodes(project?: Partial<ProjectV2> | null): {
  nodes: LexicalJsonNode[];
  checked: boolean;
} {
  const labelNode = makeTextNode("Análise de Aderência:", { format: LEXICAL_FORMAT_BOLD });
  const adherence = project?.stages?.adherence;
  if (!adherence) {
    return { checked: false, nodes: [labelNode, makeTextNode(" ")] };
  }

  const status = adherence.status || "todo";
  const color = STAGE_COLOR_BY_STATUS[status];
  const resp = adherence.responsible?.trim() || project?.responsibleAdherence?.trim();
  const dispatchDate = formatShortDate(
    adherence.adherenceDispatchedAt || project?.adherenceDispatchedAt || project?.createdAt,
  );
  const doneDate = formatShortDate(adherence.endDate);

  const nodes: LexicalJsonNode[] = [labelNode, makeTextNode(" ")];

  if (status === "todo") {
    nodes.push(makeTextNode("Não iniciada "));
    return { checked: false, nodes };
  }

  nodes.push(makeTextNode(statusLabel(status, "adherence"), { color }));

  if (status === "done") {
    const extras = [resp ? `por ${resp}` : null, doneDate ? `em ${doneDate}` : null].filter(Boolean);
    nodes.push(makeTextNode(extras.length ? ` ${extras.join(" ")} ` : " "));
    return { checked: true, nodes };
  }

  if (status === "in-progress") {
    if (resp) {
      nodes.push(
        makeTextNode(
          ` com ${resp}${dispatchDate ? ` (disparado em ${dispatchDate})` : ""} `,
        ),
      );
    } else {
      const team = getDefaultAdherenceTeam(project?.systemType);
      nodes.push(
        makeTextNode(
          ` (Aguardando agenda dos implantadores - ${team}${dispatchDate ? ` em ${dispatchDate}` : ""}) `,
        ),
      );
    }
  } else if (resp) {
    nodes.push(makeTextNode(` com ${resp} `));
  } else {
    nodes.push(makeTextNode(" "));
  }

  if (adherence.hasProductGap) {
    const gapTag = adherence.devTicket ? `Gap de produto (${adherence.devTicket})` : "Gap de produto";
    nodes.push(makeTextNode(`• ${gapTag} `, { color: "#F97316" }));
  }

  return { checked: false, nodes };
}

function buildConversionInlineNodes(project?: Partial<ProjectV2> | null): {
  nodes: LexicalJsonNode[];
  checked: boolean;
  homologationNodes: LexicalJsonNode[];
  homologationChecked: boolean;
} {
  const convLabel = makeTextNode("Conversão:", { format: LEXICAL_FORMAT_BOLD });
  const homLabel = makeTextNode("Homologação:", { format: LEXICAL_FORMAT_BOLD });
  const conversion = project?.stages?.conversion;

  if (!conversion) {
    return {
      checked: false,
      nodes: [convLabel, makeTextNode(" ")],
      homologationChecked: false,
      homologationNodes: [homLabel, makeTextNode(" ")],
    };
  }

  const status = conversion.status || "todo";
  const color = STAGE_COLOR_BY_STATUS[status];
  const resp = conversion.responsible?.trim() || project?.responsibleConversion?.trim();
  const dispatchDate = formatShortDate(
    conversion.conversionDispatchedAt || project?.conversionDispatchedAt || conversion.sentAt,
  );
  const doneDate = formatShortDate(conversion.finishedAt || conversion.endDate);
  const legacy = project?.legacySystem?.trim();

  const nodes: LexicalJsonNode[] = [convLabel, makeTextNode(" ")];

  if (status === "todo") {
    nodes.push(makeTextNode(legacy ? `Não iniciada (Legado: ${legacy}) ` : "Não iniciada "));
  } else {
    nodes.push(makeTextNode(statusLabel(status, "conversion"), { color }));
    if (status === "done") {
      const extras = [resp ? `por ${resp}` : null, doneDate ? `em ${doneDate}` : null].filter(Boolean);
      nodes.push(makeTextNode(extras.length ? ` ${extras.join(" ")} ` : " "));
    } else if (resp) {
      const meta = [dispatchDate ? `disparado em ${dispatchDate}` : null, legacy ? `Legado: ${legacy}` : null].filter(Boolean);
      nodes.push(makeTextNode(` com ${resp}${meta.length ? ` (${meta.join(" • ")})` : ""} `));
    } else {
      const meta = [
        `Passado à Conversão (Ademar, Luciane e Hugo)${dispatchDate ? ` em ${dispatchDate}` : ""}`,
        legacy ? `Legado: ${legacy}` : null,
      ].filter(Boolean);
      nodes.push(makeTextNode(` (${meta.join(" • ")}) `));
    }
  }

  // Sub-item Homologação
  const homStatus = conversion.homologationStatus;
  const homDone = Boolean(conversion.homologationComplete || homStatus === "Adequado");
  const homResp =
    conversion.homologationResponsible?.trim() ||
    getDefaultHomologationResponsible(project?.systemType);
  const homDate = formatShortDate(conversion.homologationFinishedAt || conversion.homologationDate);

  const homologationNodes: LexicalJsonNode[] = [homLabel, makeTextNode(" ")];
  if (homDone) {
    homologationNodes.push(makeTextNode("Aprovada", { color: "#10B981" }));
    const extras = [homResp ? `por ${homResp}` : null, homDate ? `em ${homDate}` : null].filter(Boolean);
    homologationNodes.push(makeTextNode(extras.length ? ` ${extras.join(" ")} ` : " "));
  } else if (homStatus === "Inadequado") {
    homologationNodes.push(makeTextNode("Inadequada - em ajuste", { color: "#F97316" }));
    homologationNodes.push(makeTextNode(homResp ? ` (${homResp}) ` : " "));
  } else if (homStatus === "Aguardando Adequação" || homStatus === "Parcialmente Adequado") {
    homologationNodes.push(makeTextNode(homStatus, { color: "#F59E0B" }));
    homologationNodes.push(makeTextNode(homResp ? ` (${homResp}) ` : " "));
  } else if (homDate || homResp) {
    homologationNodes.push(makeTextNode("Agendada", { color: "#3B82F6" }));
    const extras = [homResp ? `com ${homResp}` : null, homDate ? `para ${homDate}` : null].filter(Boolean);
    homologationNodes.push(makeTextNode(` (${extras.join(" ")}) `));
  } else if (status === "in-progress") {
    homologationNodes.push(makeTextNode("Aguardando liberação da base ", { color: "#F59E0B" }));
  } else {
    homologationNodes.push(makeTextNode("Não iniciada "));
  }

  return {
    checked: status === "done",
    nodes,
    homologationChecked: homDone,
    homologationNodes,
  };
}

function buildEnvironmentInlineNodes(project?: Partial<ProjectV2> | null): {
  nodes: LexicalJsonNode[];
  checked: boolean;
} {
  const labelNode = makeTextNode("Config. Ambiente:", { format: LEXICAL_FORMAT_BOLD });
  const env = project?.stages?.environment;
  if (!env) {
    return { checked: false, nodes: [labelNode, makeTextNode(" ")] };
  }

  const status = env.status || "todo";
  const color = STAGE_COLOR_BY_STATUS[status];
  const resp = env.responsible?.trim() || project?.responsibleEnvironment?.trim();
  const dispatchDate = formatShortDate(
    env.environmentDispatchedAt || project?.environmentDispatchedAt,
  );
  const doneDate = formatShortDate(env.realDate || env.endDate);

  const needsOrionAdmin = (project?.secondaryProductsNames || []).some((name) =>
    /livro caixa|lcw|sga|on hand/i.test(name),
  );

  const nodes: LexicalJsonNode[] = [labelNode, makeTextNode(" ")];
  if (status === "todo") {
    nodes.push(makeTextNode("Não iniciada "));
    return { checked: false, nodes };
  }

  nodes.push(makeTextNode(statusLabel(status, "environment"), { color }));

  if (status === "done") {
    const extras = [resp ? `por ${resp}` : null, doneDate ? `em ${doneDate}` : null].filter(Boolean);
    nodes.push(makeTextNode(extras.length ? ` ${extras.join(" ")} ` : " "));
  } else if (resp) {
    nodes.push(
      makeTextNode(
        ` com ${resp}${dispatchDate ? ` (disparado em ${dispatchDate})` : ""} `,
      ),
    );
  } else {
    nodes.push(
      makeTextNode(
        ` (Passado ao Alex Silva e Bruno Fernandes${dispatchDate ? ` em ${dispatchDate}` : ""}) `,
      ),
    );
  }

  if (needsOrionAdmin) {
    if (env.orionAdminConfigured) {
      nodes.push(makeTextNode("• Orion Admin OK ", { color: "#10B981" }));
    } else {
      nodes.push(makeTextNode("• Orion Admin pendente ", { color: "#F59E0B" }));
    }
  } else if (env.hasPendings && status !== "done") {
    nodes.push(makeTextNode("• Com pendências ", { color: "#F59E0B" }));
  }

  return { checked: status === "done", nodes };
}

function buildModelosInlineNodes(project?: Partial<ProjectV2> | null): {
  nodes: LexicalJsonNode[];
  checked: boolean;
} {
  const labelNode = makeTextNode("Modelos Editor (Orion TN):", { format: LEXICAL_FORMAT_BOLD });
  const modelos = project?.stages?.modelosEditor;
  const status = modelos?.status || "todo";
  const color = STAGE_COLOR_BY_STATUS[status];
  const resp = modelos?.responsible?.trim();
  const totalSent = modelos?.sentFiles?.length || 0;
  const totalDone = modelos?.sentFiles?.filter((f) => f.isDone).length || 0;

  const nodes: LexicalJsonNode[] = [labelNode, makeTextNode(" ")];
  if (status === "todo") {
    nodes.push(
      makeTextNode("Aguardando envio de minutas (Erik Marques / Bruno Fernandes) "),
    );
    return { checked: false, nodes };
  }

  nodes.push(makeTextNode(statusLabel(status, "modelos"), { color }));
  const extras = [
    resp ? `com ${resp}` : "Erik Marques / Bruno Fernandes",
    totalSent > 0 ? `${totalDone}/${totalSent} minutas` : null,
  ].filter(Boolean);
  nodes.push(makeTextNode(` (${extras.join(" • ")}) `));
  return { checked: status === "done", nodes };
}

function buildImplementationBulletNodes(project?: Partial<ProjectV2> | null): {
  statusWindow: LexicalJsonNode[];
  implantadores: LexicalJsonNode[];
  particularidades: LexicalJsonNode[];
} {
  const impl = project?.stages?.implementation;
  const phase1 = impl?.phase1;
  const p1Start = formatShortDate(phase1?.startDate);
  const p1End = formatShortDate(phase1?.endDate);
  const confirmedAt = formatShortDate(phase1?.confirmedAt);

  // 1. Implantação
  const statusWindow: LexicalJsonNode[] = [
    makeTextNode("Implantação:", { format: LEXICAL_FORMAT_BOLD }),
    makeTextNode(" "),
  ];

  if (impl?.status === "done" || phase1?.status === "done") {
    statusWindow.push(makeTextNode("Concluída", { color: "#10B981" }));
    if (p1Start && p1End) statusWindow.push(makeTextNode(` - ${p1Start} a ${p1End} `));
    else statusWindow.push(makeTextNode(" "));
  } else if (impl?.status === "in-progress" || phase1?.status === "in-progress") {
    statusWindow.push(makeTextNode("Em andamento", { color: "#3B82F6" }));
    if (p1Start && p1End) statusWindow.push(makeTextNode(` - ${p1Start} a ${p1End} `));
    else statusWindow.push(makeTextNode(" "));
  } else if (phase1?.isConfirmed) {
    statusWindow.push(makeTextNode("Confirmada", { color: "#10B981" }));
    const windowText = p1Start && p1End ? ` - ${p1Start} a ${p1End}` : "";
    const confText = confirmedAt ? ` (confirmada em ${confirmedAt})` : "";
    statusWindow.push(makeTextNode(`${windowText}${confText} `));
  } else if (p1Start && p1End) {
    statusWindow.push(makeTextNode("Prevista", { color: "#3B82F6" }));
    statusWindow.push(makeTextNode(` - ${p1Start} a ${p1End} `));
  } else {
    statusWindow.push(makeTextNode("Prevista - "));
  }

  // 2. Implantador
  const respNames = [
    phase1?.responsible?.trim() || project?.responsibleImplementation?.trim(),
    ...(phase1?.additionalResponsibles || []).map((r) => r?.responsible?.trim()),
  ].filter((v): v is string => Boolean(v));
  const uniqueResps = Array.from(new Set(respNames));

  const implantadores: LexicalJsonNode[] = [
    makeTextNode("Implantador:", { format: LEXICAL_FORMAT_BOLD }),
    makeTextNode(uniqueResps.length ? ` ${uniqueResps.join(", ")} ` : " "),
  ];

  // 3. Observações
  const scopeParts: string[] = [];
  if (project?.soldHours) scopeParts.push(`${project.soldHours}h vendidas`);
  if (project?.legacySystem?.trim()) scopeParts.push(`Legado: ${project.legacySystem.trim()}`);
  if (project?.secondaryProductsNames && project.secondaryProductsNames.length > 0) {
    scopeParts.push(`Produtos secundários: ${project.secondaryProductsNames.join(", ")}`);
  }

  const particularidades: LexicalJsonNode[] = [
    makeTextNode("Observações:", { format: LEXICAL_FORMAT_BOLD }),
    makeTextNode(scopeParts.length ? ` ${scopeParts.join(" • ")} ` : " "),
  ];

  return { statusWindow, implantadores, particularidades };
}

/**
 * Gera a string JSON válida do Lexical com o template padrão de Observações Gerais.
 * Quando `project` é informado, preenche dinamicamente os status, responsáveis reais
 * (ou equipe padrão da Matriz RACI), datas de disparo e janela de implantação,
 * incluindo "Modelos Editor (Orion TN)" EXCLUSIVAMENTE quando o projeto for Orion TN.
 */
export function createDefaultObservationsState(project?: Partial<ProjectV2> | null): string {
  const isOrionTN = isProjectOrionTN(project);
  const isModelosTN = project?.systemType === "Modelos TN";

  const infra = buildInfraInlineNodes(project);
  const adherence = buildAdherenceInlineNodes(project);
  const conversion = buildConversionInlineNodes(project);
  const env = buildEnvironmentInlineNodes(project);
  const modelos = isOrionTN ? buildModelosInlineNodes(project) : null;
  const impl = buildImplementationBulletNodes(project);

  const preItems: LexicalJsonNode[] = [];

  if (!isModelosTN) {
    let idx = 1;
    preItems.push(makeChecklistItem(infra.nodes, idx++, infra.checked));
    preItems.push(makeChecklistItem(adherence.nodes, idx++, adherence.checked));
    preItems.push(makeChecklistItem(conversion.nodes, idx++, conversion.checked));

    // Sub-item aninhado em checklist: Homologação
    const nestedHomologationList = makeListNode("check", [
      makeChecklistItem(conversion.homologationNodes, 1, conversion.homologationChecked),
    ]);
    preItems.push(makeNestedListWrapper(nestedHomologationList, idx++));

    preItems.push(makeChecklistItem(env.nodes, idx++, env.checked));

    if (isOrionTN && modelos) {
      preItems.push(makeChecklistItem(modelos.nodes, idx++, modelos.checked));
    }
  } else {
    const modelosOnly = buildModelosInlineNodes(project);
    preItems.push(makeChecklistItem(modelosOnly.nodes, 1, modelosOnly.checked));
  }

  const agendaItems: LexicalJsonNode[] = [
    makeBulletItem(impl.statusWindow, 1),
    makeBulletItem(impl.implantadores, 2),
    makeBulletItem(impl.particularidades, 3),
  ];

  return wrapRoot([
    makeHeadingNode("Pré-Implantação"),
    makeListNode("check", preItems),
    makeHeadingNode("Implantação & Agenda"),
    makeListNode("bullet", agendaItems),
  ]);
}

function walkLexicalText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const rec = node as Record<string, unknown>;
  if (rec.type === "mention" && typeof rec.label === "string") {
    return `${rec.mentionKind === "analyst" ? "@" : "#"}${rec.label}`;
  }
  if (typeof rec.text === "string") return rec.text;
  if (Array.isArray(rec.children)) {
    return rec.children.map(walkLexicalText).join("");
  }
  return "";
}

/**
 * Valida estruturalmente se um objeto/string é um SerializedEditorState suportado
 * pela configuração atual do Lexical no Siplan HUB.
 */
export function isValidLexicalState(value: unknown): value is SerializedEditorState {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return false;
    }
  }

  const checkNode = (node: unknown): boolean => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return false;
    const rec = node as Record<string, unknown>;
    if (
      typeof rec.type !== "string" ||
      !SUPPORTED_NODE_TYPES.has(rec.type) ||
      typeof rec.version !== "number"
    ) {
      return false;
    }
    if (rec.children !== undefined) {
      if (!Array.isArray(rec.children)) return false;
      return rec.children.every(checkNode);
    }
    return true;
  };

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  const root = (parsed as Record<string, unknown>).root;
  if (!checkNode(root)) return false;
  const rootRec = root as Record<string, unknown>;
  return (
    rootRec.type === "root" &&
    Array.isArray(rootRec.children) &&
    rootRec.children.length > 0
  );
}

/**
 * Detecta se o conteúdo de Observações Gerais está vazio (cobrindo null, "",
 * strings só com espaços, arrays vazios ou JSON Lexical sem texto real).
 */
export function isLexicalContentEmpty(content: string | object | null | undefined): boolean {
  if (!content) return true;

  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) return true;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        if ("root" in parsed) {
          return walkLexicalText(parsed.root).trim().length === 0;
        }
        if ("blocks" in parsed && Array.isArray(parsed.blocks)) {
          if (parsed.blocks.length === 0) return true;
          return isLexicalContentEmpty(parsed.blocks[0]?.content);
        }
      }
      return trimmed.length === 0;
    } catch {
      // Texto puro legado
      return trimmed.length === 0;
    }
  }

  if (typeof content === "object") {
    const rec = content as Record<string, unknown>;
    if ("root" in rec) {
      return walkLexicalText(rec.root).trim().length === 0;
    }
    if ("blocks" in rec && Array.isArray(rec.blocks)) {
      if (rec.blocks.length === 0) return true;
      return isLexicalContentEmpty(rec.blocks[0]?.content);
    }
  }

  return true;
}

/**
 * Insere o modelo padrão no topo preservando o conteúdo Lexical existente abaixo.
 */
export function prependDefaultObservationsToLexical(
  existingContent: string | null | undefined,
  project?: Partial<ProjectV2> | null,
): string {
  const defaultState = JSON.parse(createDefaultObservationsState(project)) as {
    root: { children: LexicalJsonNode[] };
  };

  if (isLexicalContentEmpty(existingContent)) {
    return JSON.stringify(defaultState);
  }

  let existingChildren: LexicalJsonNode[] = [];
  if (typeof existingContent === "string") {
    try {
      const parsed = JSON.parse(existingContent);
      if (isValidLexicalState(parsed)) {
        existingChildren = (parsed.root.children as LexicalJsonNode[]) || [];
      } else {
        existingChildren = [
          {
            children: [makeTextNode(existingContent.trim())],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ];
      }
    } catch {
      existingChildren = [
        {
          children: [makeTextNode(existingContent.trim())],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
        },
      ];
    }
  }

  const dividerHeading = makeHeadingNode("Histórico / Anotações Anteriores", "#94A3B8");
  return wrapRoot([...defaultState.root.children, dividerHeading, ...existingChildren]);
}

interface AnchorUpdate {
  prefix: RegExp;
  nodes: LexicalJsonNode[];
  checked?: boolean;
}

/**
 * Sincroniza de forma NÃO-DESTRUTIVA as linhas-âncora das etapas no Lexical existente
 * com o estado atual do `project`, preservando intactos sub-bullets em itálico,
 * cobranças datadas e quaisquer anotações manuais abaixo de cada etapa.
 */
export function syncProjectStagesIntoObservations(
  existingContent: string | null | undefined,
  project: Partial<ProjectV2>,
): { content: string; updatedCount: number } {
  if (isLexicalContentEmpty(existingContent)) {
    return { content: createDefaultObservationsState(project), updatedCount: 1 };
  }

  let parsed: { root?: { children?: LexicalJsonNode[] } };
  try {
    parsed = JSON.parse(existingContent as string);
  } catch {
    return {
      content: prependDefaultObservationsToLexical(existingContent, project),
      updatedCount: 1,
    };
  }

  if (!isValidLexicalState(parsed)) {
    return {
      content: prependDefaultObservationsToLexical(existingContent, project),
      updatedCount: 1,
    };
  }

  const infra = buildInfraInlineNodes(project);
  const adherence = buildAdherenceInlineNodes(project);
  const conversion = buildConversionInlineNodes(project);
  const env = buildEnvironmentInlineNodes(project);
  const isOrionTN = isProjectOrionTN(project);
  const modelos = isOrionTN ? buildModelosInlineNodes(project) : null;
  const impl = buildImplementationBulletNodes(project);

  const anchors: AnchorUpdate[] = [
    { prefix: /^an[aá]lise de infra\s*:/i, nodes: infra.nodes, checked: infra.checked },
    { prefix: /^an[aá]lise de ader[eê]ncia\s*:/i, nodes: adherence.nodes, checked: adherence.checked },
    { prefix: /^convers[aã]o\s*:/i, nodes: conversion.nodes, checked: conversion.checked },
    {
      prefix: /^homologa[cç][aã]o\s*:/i,
      nodes: conversion.homologationNodes,
      checked: conversion.homologationChecked,
    },
    { prefix: /^config\.?\s*ambiente\s*:/i, nodes: env.nodes, checked: env.checked },
    ...(modelos
      ? [{ prefix: /^modelos editor(\s*\(orion tn\))?\s*:/i, nodes: modelos.nodes, checked: modelos.checked }]
      : []),
    { prefix: /^(implanta[cç][aã]o|status\s*\/\s*janela)\s*:/i, nodes: impl.statusWindow },
    { prefix: /^implantador(\(es\)|es)?\s*:/i, nodes: impl.implantadores },
  ];

  let updatedCount = 0;

  const visitList = (node: LexicalJsonNode): LexicalJsonNode => {
    if (!Array.isArray(node.children)) return node;

    const nextChildren = (node.children as LexicalJsonNode[]).map((child) => {
      if (child.type === "list") {
        return visitList(child);
      }

      if (child.type === "listitem" && Array.isArray(child.children)) {
        // Verifica se é wrapper de sub-lista aninhada (contém list como filho)
        const hasNestedList = (child.children as LexicalJsonNode[]).some(
          (grandChild) => grandChild.type === "list",
        );

        if (hasNestedList) {
          return {
            ...child,
            children: (child.children as LexicalJsonNode[]).map((grandChild) =>
              grandChild.type === "list" ? visitList(grandChild) : grandChild,
            ),
          };
        }

        const lineText = walkLexicalText(child).trim();
        const match = anchors.find((a) => a.prefix.test(lineText));
        if (match) {
          updatedCount += 1;
          const nextItem: LexicalJsonNode = {
            ...child,
            children: match.nodes,
          };
          if (typeof child.checked === "boolean" && typeof match.checked === "boolean") {
            nextItem.checked = match.checked;
          }
          return nextItem;
        }
      }

      return child;
    });

    return { ...node, children: nextChildren };
  };

  const clonedRootChildren = (parsed.root!.children as LexicalJsonNode[]).map((child) =>
    child.type === "list" ? visitList(child) : child,
  );

  return {
    content: wrapRoot(clonedRootChildren),
    updatedCount,
  };
}
