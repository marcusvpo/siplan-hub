import type {
  AttachedFile,
  ContentBlock,
  EnvironmentScreenshot,
  GlobalStatus,
  ImplementationPhase,
  OsCredential,
  Phase1ResponsibleAssignment,
  ProjectV2,
  RemoteAccessItem,
  RichContent,
  ServerInfo,
  StageStatus,
  WorkstationInfo,
} from "@/types/ProjectV2";
import type {
  ProjectLogActionType,
  ProjectLogCategory,
  ProjectLogChangeItem,
  TimelineEventType,
} from "@/services/projectLogService";

export interface ComputedProjectAuditEvent {
  type: TimelineEventType;
  category: ProjectLogCategory;
  actionType: ProjectLogActionType;
  tabLabel: string;
  stageId?: string;
  stageLabel?: string;
  fieldLabel: string;
  message: string;
  oldValue: string;
  newValue: string;
  changes: ProjectLogChangeItem[];
}

export const STAGE_STATUS_LABELS: Record<string, string> = {
  todo: "Não Iniciado",
  "in-progress": "Em Andamento",
  done: "Finalizado",
  blocked: "Bloqueado",
  waiting_adjustment: "Aguardando Ajuste",
};

export const GLOBAL_STATUS_LABELS: Record<string, string> = {
  todo: "Não Iniciado",
  "in-progress": "Em Andamento",
  done: "Finalizado",
  blocked: "Pausado",
  archived: "Arquivado",
};

const IMPLANTATION_TYPE_LABELS: Record<string, string> = {
  new: "Nova Implantação",
  migration_siplan: "Migração Siplan",
  migration_competitor: "Migração Concorrente",
  upgrade: "Upgrade",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

const COMPLEXITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  very_high: "Muito Alta",
};

const SATISFACTION_LABELS: Record<string, string> = {
  very_satisfied: "Muito Satisfeito",
  satisfied: "Satisfeito",
  neutral: "Neutro",
  dissatisfied: "Insatisfeito",
};

const EMPTY_VALUE_DISPLAY = "(vazio)";

export function translateStageStatus(status?: StageStatus | string | null): string {
  if (!status) return EMPTY_VALUE_DISPLAY;
  return STAGE_STATUS_LABELS[status] || status;
}

export function translateGlobalStatus(status?: GlobalStatus | string | null): string {
  if (!status) return EMPTY_VALUE_DISPLAY;
  return GLOBAL_STATUS_LABELS[status] || status;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToReadablePlainText(html: string): string {
  let text = html.replace(/\r\n/g, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/(p|div|h[1-6]|blockquote|tr)>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = decodeHtmlEntities(text);
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLexicalText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const rec = node as Record<string, unknown>;

  if (rec.type === "text" && typeof rec.text === "string") {
    return rec.text;
  }
  if (rec.type === "linebreak") {
    return "\n";
  }
  if (rec.type === "tab") {
    return "\t";
  }

  const children = Array.isArray(rec.children) ? rec.children : [];

  if (rec.type === "list") {
    const ordered = rec.listType === "number" || rec.tag === "ol";
    return children
      .map((child, idx) => {
        const itemText = extractLexicalText(child).trim();
        if (!itemText) return "";
        return `${ordered ? `${idx + 1}.` : "•"} ${itemText}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  if (rec.type === "root") {
    return children
      .map((child) => extractLexicalText(child).trimEnd())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  if (rec.type === "paragraph" || rec.type === "heading" || rec.type === "quote" || rec.type === "code") {
    return children.map(extractLexicalText).join("");
  }

  return children.map(extractLexicalText).join("");
}

function extractTiptapText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const rec = node as Record<string, unknown>;

  if (rec.type === "text" && typeof rec.text === "string") {
    return rec.text;
  }
  if (rec.type === "hardBreak") {
    return "\n";
  }

  const content = Array.isArray(rec.content) ? rec.content : [];

  if (rec.type === "doc") {
    return content
      .map((child) => extractTiptapText(child).trimEnd())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  if (rec.type === "bulletList" || rec.type === "orderedList" || rec.type === "taskList") {
    const ordered = rec.type === "orderedList";
    return content
      .map((child, idx) => {
        const inner = extractTiptapText(child).trim();
        if (!inner) return "";
        if (rec.type === "taskList") {
          const checked = Boolean((child as Record<string, unknown>)?.attrs && ((child as Record<string, unknown>).attrs as Record<string, unknown>)?.checked);
          return `${checked ? "[x]" : "[ ]"} ${inner}`;
        }
        return `${ordered ? `${idx + 1}.` : "•"} ${inner}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  return content.map(extractTiptapText).join("");
}

function extractBlocksArrayText(blocks: unknown[]): string {
  const parts: string[] = [];
  for (const rawBlock of blocks) {
    if (!rawBlock || typeof rawBlock !== "object") continue;
    const block = rawBlock as Partial<ContentBlock> & { content?: unknown };
    const text = extractReadableText(block.content);
    if (!text) continue;
    if (block.type === "checkbox") {
      parts.push(`${block.checked ? "[x]" : "[ ]"} ${text}`);
    } else {
      parts.push(text);
    }
  }
  return parts.join("\n\n").trim();
}

/**
 * Converte RichContent, JSON de blocos do Pós (v2), Lexical JSON, TipTap JSON,
 * array de blocos ou HTML bruto em texto puro legível preservando quebras de linha.
 */
export function extractReadableText(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return extractReadableText(parsed);
      } catch {
        // Segue tratamento como HTML ou texto puro
      }
    }

    if (/<[a-z][\s\S]*>/i.test(trimmed)) {
      return htmlToReadablePlainText(trimmed);
    }

    return trimmed.replace(/\r\n/g, "\n");
  }

  if (Array.isArray(value)) {
    return extractBlocksArrayText(value);
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // Formato Pós-Implantação v2: { v: 2, blocks: [{ id, content }], summary: "..." }
    if (obj.v === 2 && Array.isArray(obj.blocks)) {
      const sections: string[] = [];
      const nonEmptyBlocks = obj.blocks
        .map((raw, idx) => ({
          idx,
          text: extractReadableText((raw as { content?: unknown })?.content),
        }))
        .filter((item) => item.text.length > 0);

      if (nonEmptyBlocks.length === 1 && !extractReadableText(obj.summary)) {
        return nonEmptyBlocks[0].text;
      }

      for (const item of nonEmptyBlocks) {
        sections.push(`Bloco ${item.idx + 1}:\n${item.text}`);
      }

      const summaryText = extractReadableText(obj.summary);
      if (summaryText) {
        sections.push(`Resumo Geral:\n${summaryText}`);
      }

      return sections.join("\n\n").trim();
    }

    // RichContent ({ id, projectId, blocks: ContentBlock[] })
    if (Array.isArray(obj.blocks)) {
      return extractBlocksArrayText(obj.blocks);
    }

    // Lexical SerializedEditorState ({ root: { children: [...] } })
    if (obj.root && typeof obj.root === "object") {
      return extractLexicalText(obj.root).trim();
    }

    // TipTap doc ({ type: "doc", content: [...] })
    if (obj.type === "doc" && Array.isArray(obj.content)) {
      return extractTiptapText(obj).trim();
    }

    // Bloco isolado { content: ... }
    if ("content" in obj) {
      return extractReadableText(obj.content);
    }
  }

  return String(value).trim();
}

function parsePostV2Structure(raw?: string): { blocks: string[]; summary: string } | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && parsed.v === 2 && Array.isArray(parsed.blocks)) {
      const blocks = parsed.blocks
        .map((b) => extractReadableText((b as { content?: unknown })?.content))
        .filter(Boolean);
      const summary = extractReadableText(parsed.summary);
      return { blocks, summary };
    }
  } catch {
    return null;
  }
  return null;
}

function normStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function displayStr(value: string): string {
  return value.trim() ? value.trim() : EMPTY_VALUE_DISPLAY;
}

function dateIsoDay(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  return "";
}

function formatDayBr(isoDay: string): string {
  if (!isoDay) return EMPTY_VALUE_DISPLAY;
  const match = isoDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDay;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatDateTimeBr(value: unknown): string {
  if (!value) return EMPTY_VALUE_DISPLAY;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSensitiveLabel(label?: string): boolean {
  return /senha|password|secret|token|pass|chave/i.test(label || "");
}

function maskPasswordValue(value?: string | null): string {
  const clean = normStr(value);
  if (!clean) return EMPTY_VALUE_DISPLAY;
  return "••••••••";
}

function sanitizeOrionAdminPropertiesForLog(config?: string): string {
  const clean = normStr(config);
  if (!clean) return EMPTY_VALUE_DISPLAY;
  return clean
    .split(/\r?\n/)
    .map((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return line;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (isSensitiveLabel(key) && val) {
        return `${key}=••••••••`;
      }
      return line;
    })
    .join("\n");
}

function formatStringList(list?: string[]): string {
  const normalized = (list || []).map((item) => item.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join(", ") : "(nenhum)";
}

function stringListEqual(a?: string[], b?: string[]): boolean {
  const left = [...new Set((a || []).map((x) => x.trim()).filter(Boolean))].sort();
  const right = [...new Set((b || []).map((x) => x.trim()).filter(Boolean))].sort();
  if (left.length !== right.length) return false;
  return left.every((val, i) => val === right[i]);
}

function formatRelatedTickets(list?: { name: string; number: string }[]): string {
  const valid = (list || []).filter((t) => normStr(t.name) || normStr(t.number));
  if (valid.length === 0) return "(nenhum)";
  return valid
    .map((t) => `${normStr(t.name) || "Chamado"} (#${normStr(t.number) || "-"})`)
    .join(", ");
}

function summarizeServers(servers?: ServerInfo[]): string {
  const list = servers || [];
  if (list.length === 0) return "0 servidores";
  const names = list.map((s, idx) => normStr(s.hostname) || `Servidor ${idx + 1}`);
  return `${list.length} servidor(es): ${names.join(", ")}`;
}

function summarizeWorkstations(workstations?: WorkstationInfo[]): string {
  const list = workstations || [];
  if (list.length === 0) return "0 estações";
  const names = list.map(
    (w, idx) => normStr(w.hostname) || normStr(w.user) || `Estação ${idx + 1}`,
  );
  const preview = names.slice(0, 8).join(", ");
  const extra = names.length > 8 ? ` (+${names.length - 8})` : "";
  return `${list.length} estação(ões): ${preview}${extra}`;
}

function summarizeRemoteAccessList(list?: RemoteAccessItem[]): string {
  const items = list || [];
  if (items.length === 0) return "(nenhum acesso remoto)";
  return items
    .map((item, idx) => {
      const sys = normStr(item.system) || `Acesso ${idx + 1}`;
      const idPart = normStr(item.id) ? `ID: ${normStr(item.id)}` : "sem ID";
      const pwdPart = normStr(item.password) ? "senha: ••••••••" : "sem senha";
      const vpnPart =
        item.vpnFiles && item.vpnFiles.length > 0
          ? `, VPN: [${item.vpnFiles.map((f) => f.name).join(", ")}]`
          : "";
      return `${sys} (${idPart}, ${pwdPart}${vpnPart})`;
    })
    .join("\n");
}

function summarizeOsCredentials(list?: OsCredential[]): string {
  const blocks = list || [];
  if (blocks.length === 0) return "(nenhum bloco de servidor)";
  return blocks
    .map((cred, idx) => {
      const title = normStr(cred.title) || normStr(cred.serverName) || `Bloco ${idx + 1}`;
      if (cred.fields && cred.fields.length > 0) {
        const fieldsText = cred.fields
          .map((f) => {
            const lbl = normStr(f.label) || "Campo";
            const val = isSensitiveLabel(lbl)
              ? maskPasswordValue(f.value)
              : displayStr(normStr(f.value));
            return `${lbl}: ${val}`;
          })
          .join(" | ");
        return `${title} -> ${fieldsText}`;
      }
      const legacyParts = [
        cred.serverName ? `Host: ${cred.serverName}` : "",
        cred.serverIp ? `IP: ${cred.serverIp}` : "",
        cred.login ? `Usuário: ${cred.login}` : "",
        cred.password ? `Senha: ••••••••` : "",
      ].filter(Boolean);
      return `${title}${legacyParts.length ? ` -> ${legacyParts.join(" | ")}` : ""}`;
    })
    .join("\n");
}

function summarizeScreenshots(shots?: EnvironmentScreenshot[]): string {
  const list = shots || [];
  if (list.length === 0) return "0 prints";
  return `${list.length} print(s): ${list.map((s) => s.name || s.path).join(", ")}`;
}

function summarizeAttachedFiles(files?: AttachedFile[]): string {
  const list = files || [];
  if (list.length === 0) return "0 arquivo(s)";
  return `${list.length} arquivo(s): ${list
    .map((f) => `${f.name}${f.isDone ? " [Concluído]" : ""}`)
    .join(", ")}`;
}

function summarizeAdditionalResponsibles(list?: Phase1ResponsibleAssignment[]): string {
  const items = list || [];
  if (items.length === 0) return "(nenhum)";
  return items
    .map((item, idx) => {
      const name = normStr(item.responsible) || `Implantador #${idx + 1}`;
      const start = formatDayBr(dateIsoDay(item.startDate));
      const end = formatDayBr(dateIsoDay(item.endDate));
      const dates =
        start !== EMPTY_VALUE_DISPLAY || end !== EMPTY_VALUE_DISPLAY
          ? ` (${start} a ${end})`
          : "";
      return `${name}${dates}`;
    })
    .join("; ");
}

function getStageLabelForProject(
  stageId: keyof ProjectV2["stages"],
  project: ProjectV2,
): string {
  const isModelosTN = project.systemType === "Modelos TN";
  const isOrionTN =
    project.systemType === "Orion TN" ||
    project.systemType === "Modelos TN" ||
    project.products?.includes("Orion TN") ||
    project.products?.includes("OrionTN");

  switch (stageId) {
    case "infra":
      return "1. Análise de Infraestrutura";
    case "adherence":
      return "2. Análise de Aderência";
    case "conversion":
      return "3. Conversão de Dados";
    case "environment":
      return "4. Preparação de Ambiente";
    case "modelosEditor":
      return isModelosTN ? "1. Modelos Editor" : "5. Modelos Editor";
    case "implementation":
      if (isModelosTN) return "2. Implantação & Treinamento";
      return isOrionTN ? "6. Implantação & Treinamento" : "5. Implantação & Treinamento";
    case "post":
      return isOrionTN ? "7. Pós-Implantação" : "6. Pós-Implantação";
    default:
      return String(stageId);
  }
}

export function computeProjectAuditChanges(
  oldProject: ProjectV2,
  newProject: ProjectV2,
): ComputedProjectAuditEvent[] {
  const events: ComputedProjectAuditEvent[] = [];

  const pushSingleField = (params: {
    type?: TimelineEventType;
    category: ProjectLogCategory;
    actionType?: ProjectLogActionType;
    tabLabel: string;
    stageId?: string;
    stageLabel?: string;
    field: string;
    label: string;
    oldValue: string;
    newValue: string;
    message?: string;
  }) => {
    if (params.oldValue === params.newValue) return;
    const actionType = params.actionType || "field_change";
    const type =
      params.type ||
      (actionType === "status_change" ? "status_change" : "field_change");

    const defaultMsg = params.stageLabel
      ? `${params.label} em ${params.stageLabel} alterado`
      : `Campo "${params.label}" alterado na aba ${params.tabLabel}`;

    events.push({
      type,
      category: params.category,
      actionType,
      tabLabel: params.tabLabel,
      stageId: params.stageId,
      stageLabel: params.stageLabel,
      fieldLabel: params.label,
      message: params.message || defaultMsg,
      oldValue: params.oldValue,
      newValue: params.newValue,
      changes: [
        {
          field: params.field,
          label: params.label,
          oldValue: params.oldValue,
          newValue: params.newValue,
        },
      ],
    });
  };

  // =========================================================================
  // 1. ABA "INFORMAÇÕES GERAIS"
  // =========================================================================
  const oldNotesText = extractReadableText(oldProject.notes);
  const newNotesText = extractReadableText(newProject.notes);
  if (oldNotesText !== newNotesText) {
    pushSingleField({
      category: "general",
      tabLabel: "Informações Gerais",
      field: "notes",
      label: "Observações Gerais",
      oldValue: displayStr(oldNotesText),
      newValue: displayStr(newNotesText),
      message: 'Campo "Observações Gerais" alterado na aba Informações Gerais',
    });
  }

  // =========================================================================
  // 2. MODO "EDITAR PROJETO"
  // =========================================================================
  const editScalarFields: Array<{
    field: keyof ProjectV2;
    label: string;
    format?: (val: unknown) => string;
    isStatus?: boolean;
  }> = [
    { field: "clientName", label: "Nome do Cliente" },
    { field: "ticketNumber", label: "Nº Ticket SAC / 0800" },
    { field: "systemType", label: "Sistema Principal" },
    { field: "specialty", label: "Especialidade" },
    {
      field: "implantationType",
      label: "Tipo de Implantação",
      format: (v) =>
        v ? IMPLANTATION_TYPE_LABELS[String(v)] || String(v) : EMPTY_VALUE_DISPLAY,
    },
    { field: "projectType", label: "Tipo de Projeto" },
    {
      field: "globalStatus",
      label: "Status Global",
      isStatus: true,
      format: (v) => translateGlobalStatus(v as string),
    },
    { field: "projectLeader", label: "Líder do Projeto" },
    { field: "opNumber", label: "Nº OP" },
    { field: "salesOrderNumber", label: "Nº Pedido de Venda" },
    {
      field: "soldHours",
      label: "Horas Vendidas",
      format: (v) => (v !== undefined && v !== null && v !== "" ? `${v}h` : EMPTY_VALUE_DISPLAY),
    },
    {
      field: "workHours",
      label: "Horas de Trabalho",
      format: (v) => (v !== undefined && v !== null && v !== "" ? `${v}h` : EMPTY_VALUE_DISPLAY),
    },
    { field: "legacySystem", label: "Sistema Legado" },
    {
      field: "priority",
      label: "Prioridade",
      format: (v) => (v ? PRIORITY_LABELS[String(v)] || String(v) : EMPTY_VALUE_DISPLAY),
    },
    { field: "clientPrimaryContact", label: "Contato Principal do Cliente" },
    { field: "clientEmail", label: "E-mail do Cliente" },
    { field: "clientPhone", label: "Telefone do Cliente" },
    { field: "description", label: "Descrição", format: (v) => displayStr(extractReadableText(v)) },
    {
      field: "specialConsiderations",
      label: "Considerações Especiais",
      format: (v) => displayStr(extractReadableText(v)),
    },
    { field: "contractValue", label: "Valor do Contrato" },
    { field: "paymentMethod", label: "Forma de Pagamento" },
  ];

  for (const cfg of editScalarFields) {
    const oldRaw = oldProject[cfg.field];
    const newRaw = newProject[cfg.field];
    const oldFormatted = cfg.format
      ? cfg.format(oldRaw)
      : displayStr(normStr(oldRaw));
    const newFormatted = cfg.format
      ? cfg.format(newRaw)
      : displayStr(normStr(newRaw));

    if (oldFormatted !== newFormatted) {
      pushSingleField({
        type: cfg.isStatus ? "status_change" : "field_change",
        category: "edit",
        actionType: cfg.isStatus ? "status_change" : "field_change",
        tabLabel: "Editar Projeto",
        field: String(cfg.field),
        label: cfg.label,
        oldValue: oldFormatted,
        newValue: newFormatted,
        message: cfg.isStatus
          ? `Status Global alterado de "${oldFormatted}" para "${newFormatted}"`
          : `Campo "${cfg.label}" alterado de "${oldFormatted}" para "${newFormatted}"`,
      });
    }
  }

  if (!stringListEqual(oldProject.products, newProject.products)) {
    const oldVal = formatStringList(oldProject.products);
    const newVal = formatStringList(newProject.products);
    pushSingleField({
      category: "edit",
      tabLabel: "Editar Projeto",
      field: "products",
      label: "Produtos Adicionais",
      oldValue: oldVal,
      newValue: newVal,
      message: `Produtos Adicionais atualizados na aba Editar Projeto`,
    });
  }

  if (!stringListEqual(oldProject.tags, newProject.tags)) {
    const oldVal = formatStringList(oldProject.tags);
    const newVal = formatStringList(newProject.tags);
    pushSingleField({
      category: "edit",
      tabLabel: "Editar Projeto",
      field: "tags",
      label: "Tags",
      oldValue: oldVal,
      newValue: newVal,
      message: `Tags do projeto atualizadas`,
    });
  }

  const oldTicketsStr = formatRelatedTickets(oldProject.relatedTickets);
  const newTicketsStr = formatRelatedTickets(newProject.relatedTickets);
  if (oldTicketsStr !== newTicketsStr) {
    pushSingleField({
      category: "edit",
      tabLabel: "Editar Projeto",
      field: "relatedTickets",
      label: "Chamados Relacionados",
      oldValue: oldTicketsStr,
      newValue: newTicketsStr,
      message: `Chamados Relacionados atualizados`,
    });
  }

  // =========================================================================
  // 3. ABA "ETAPAS" — TODAS AS 7 ETAPAS
  // =========================================================================
  const compareCommonStage = (
    stageId: keyof ProjectV2["stages"],
    oldStage: Record<string, any> | undefined,
    newStage: Record<string, any> | undefined,
    options?: {
      skipResponsible?: boolean;
      skipDates?: boolean;
      skipObservations?: boolean;
      startLabel?: string;
      endLabel?: string;
    },
  ) => {
    const stageLabel = getStageLabelForProject(stageId, newProject);
    const o = oldStage || {};
    const n = newStage || {};

    // Status
    const oldStatus = translateStageStatus(o.status);
    const newStatus = translateStageStatus(n.status);
    if (oldStatus !== newStatus) {
      pushSingleField({
        type: "status_change",
        category: "stages",
        actionType: "status_change",
        tabLabel: "Etapas",
        stageId,
        stageLabel,
        field: `stages.${stageId}.status`,
        label: "Status",
        oldValue: oldStatus,
        newValue: newStatus,
        message: `Status de ${stageLabel} alterado de "${oldStatus}" para "${newStatus}"`,
      });
    }

    // Responsável
    if (!options?.skipResponsible) {
      const oldResp = normStr(o.responsible);
      const newResp = normStr(n.responsible);
      if (oldResp !== newResp) {
        pushSingleField({
          category: "stages",
          tabLabel: "Etapas",
          stageId,
          stageLabel,
          field: `stages.${stageId}.responsible`,
          label: "Responsável",
          oldValue: displayStr(oldResp),
          newValue: displayStr(newResp),
          message: newResp
            ? `Responsável de ${stageLabel} alterado para "${newResp}"`
            : `Responsável de ${stageLabel} removido`,
        });
      }
    }

    // Datas
    if (!options?.skipDates) {
      const oldStart = dateIsoDay(o.startDate);
      const newStart = dateIsoDay(n.startDate);
      if (oldStart !== newStart) {
        const label = options?.startLabel || "Data de Início";
        pushSingleField({
          category: "stages",
          tabLabel: "Etapas",
          stageId,
          stageLabel,
          field: `stages.${stageId}.startDate`,
          label,
          oldValue: formatDayBr(oldStart),
          newValue: formatDayBr(newStart),
          message: `${label} de ${stageLabel} alterada para ${formatDayBr(newStart)}`,
        });
      }

      const oldEnd = dateIsoDay(o.endDate);
      const newEnd = dateIsoDay(n.endDate);
      if (oldEnd !== newEnd) {
        const label = options?.endLabel || "Data de Término";
        pushSingleField({
          category: "stages",
          tabLabel: "Etapas",
          stageId,
          stageLabel,
          field: `stages.${stageId}.endDate`,
          label,
          oldValue: formatDayBr(oldEnd),
          newValue: formatDayBr(newEnd),
          message: `${label} de ${stageLabel} alterada para ${formatDayBr(newEnd)}`,
        });
      }
    }

    // Observações
    if (!options?.skipObservations) {
      const oldObs = extractReadableText(o.observations);
      const newObs = extractReadableText(n.observations);
      if (oldObs !== newObs) {
        pushSingleField({
          category: "stages",
          tabLabel: "Etapas",
          stageId,
          stageLabel,
          field: `stages.${stageId}.observations`,
          label: "Observações & Detalhes",
          oldValue: displayStr(oldObs),
          newValue: displayStr(newObs),
          message: `Observações & Detalhes alteradas em ${stageLabel}`,
        });
      }
    }
  };

  const compareStageScalar = (
    stageId: keyof ProjectV2["stages"],
    field: string,
    label: string,
    oldRaw: unknown,
    newRaw: unknown,
    formatter?: (v: unknown) => string,
  ) => {
    const stageLabel = getStageLabelForProject(stageId, newProject);
    const oldVal = formatter ? formatter(oldRaw) : displayStr(normStr(oldRaw));
    const newVal = formatter ? formatter(newRaw) : displayStr(normStr(newRaw));
    if (oldVal !== newVal) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId,
        stageLabel,
        field: `stages.${stageId}.${field}`,
        label,
        oldValue: oldVal,
        newValue: newVal,
        message: `Campo "${label}" alterado em ${stageLabel}`,
      });
    }
  };

  // -------------------------------------------------------------------------
  // 3.1. Etapa 1: Infraestrutura
  // -------------------------------------------------------------------------
  const oldInfra = oldProject.stages?.infra;
  const newInfra = newProject.stages?.infra;
  if (oldInfra || newInfra) {
    compareCommonStage("infra", oldInfra, newInfra, {
      startLabel: "Enviado em",
      endLabel: "Finalizado Em",
    });

    compareStageScalar(
      "infra",
      "clientResponsible",
      "Responsável Serventia",
      oldInfra?.clientResponsible,
      newInfra?.clientResponsible,
    );
    compareStageScalar(
      "infra",
      "serverStatus",
      "Status Servidor",
      oldInfra?.serverStatus,
      newInfra?.serverStatus,
    );
    compareStageScalar(
      "infra",
      "workstationsStatus",
      "Status Estações",
      oldInfra?.workstationsStatus,
      newInfra?.workstationsStatus,
    );
    compareStageScalar(
      "infra",
      "workstationsCount",
      "Qtd. de Estações",
      oldInfra?.workstationsCount ?? null,
      newInfra?.workstationsCount ?? null,
      (v) => (v !== null && v !== undefined ? String(v) : EMPTY_VALUE_DISPLAY),
    );
    compareStageScalar(
      "infra",
      "serverInUse",
      "Servidor em Uso Atual",
      oldInfra?.serverInUse,
      newInfra?.serverInUse,
    );
    compareStageScalar(
      "infra",
      "serverNeeded",
      "Servidor Necessário/Cotado",
      oldInfra?.serverNeeded,
      newInfra?.serverNeeded,
    );
    compareStageScalar(
      "infra",
      "technicalNotes",
      "Notas Técnicas de Infraestrutura",
      oldInfra?.technicalNotes,
      newInfra?.technicalNotes,
      (v) => displayStr(extractReadableText(v)),
    );
    compareStageScalar(
      "infra",
      "blockingReason",
      "Motivo de Bloqueio",
      oldInfra?.blockingReason,
      newInfra?.blockingReason,
    );
    compareStageScalar(
      "infra",
      "approvedByInfra",
      "Aprovado pela Infra",
      Boolean(oldInfra?.approvedByInfra),
      Boolean(newInfra?.approvedByInfra),
      (v) => (v ? "Sim" : "Não"),
    );
    compareStageScalar(
      "infra",
      "publicLinkClosed",
      "Status do Link Público",
      Boolean(oldInfra?.publicLinkClosed),
      Boolean(newInfra?.publicLinkClosed),
      (v) => (v ? "Fechado" : "Aberto"),
    );

    if (JSON.stringify(oldInfra?.servers || []) !== JSON.stringify(newInfra?.servers || [])) {
      const stageLabel = getStageLabelForProject("infra", newProject);
      const oldSummary = summarizeServers(oldInfra?.servers);
      const newSummary = summarizeServers(newInfra?.servers);
      const oldJson = JSON.stringify(oldInfra?.servers || []);
      const newJson = JSON.stringify(newInfra?.servers || []);
      const detailedOld =
        oldSummary === newSummary && oldJson !== newJson
          ? `${oldSummary} (detalhes técnicos atualizados)`
          : oldSummary;
      const detailedNew =
        oldSummary === newSummary && oldJson !== newJson
          ? `${newSummary} (especificações modificadas)`
          : newSummary;

      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "infra",
        stageLabel,
        field: "stages.infra.servers",
        label: "Servidores Cadastrados",
        oldValue: detailedOld,
        newValue: detailedNew,
        message: `Lista de servidores atualizada em ${stageLabel}`,
      });
    }

    if (
      JSON.stringify(oldInfra?.workstations || []) !==
      JSON.stringify(newInfra?.workstations || [])
    ) {
      const stageLabel = getStageLabelForProject("infra", newProject);
      const oldSummary = summarizeWorkstations(oldInfra?.workstations);
      const newSummary = summarizeWorkstations(newInfra?.workstations);
      const detailedOld =
        oldSummary === newSummary ? `${oldSummary} (dados anteriores)` : oldSummary;
      const detailedNew =
        oldSummary === newSummary ? `${newSummary} (especificações modificadas)` : newSummary;

      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "infra",
        stageLabel,
        field: "stages.infra.workstations",
        label: "Estações de Trabalho",
        oldValue: detailedOld,
        newValue: detailedNew,
        message: `Lista de estações de trabalho atualizada em ${stageLabel}`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3.2. Etapa 2: Aderência
  // -------------------------------------------------------------------------
  const oldAdherence = oldProject.stages?.adherence;
  const newAdherence = newProject.stages?.adherence;
  if (oldAdherence || newAdherence) {
    compareCommonStage("adherence", oldAdherence, newAdherence, {
      endLabel: "Agendado Para",
    });

    compareStageScalar(
      "adherence",
      "hasProductGap",
      "Existe Gap de Produto?",
      Boolean(oldAdherence?.hasProductGap),
      Boolean(newAdherence?.hasProductGap),
      (v) => (v ? "Sim" : "Não"),
    );
    compareStageScalar(
      "adherence",
      "gapDescription",
      "Descrição do Gap",
      oldAdherence?.gapDescription,
      newAdherence?.gapDescription,
      (v) => displayStr(extractReadableText(v)),
    );
    compareStageScalar(
      "adherence",
      "devTicket",
      "Ticket de Desenvolvimento",
      oldAdherence?.devTicket,
      newAdherence?.devTicket,
    );
    compareStageScalar(
      "adherence",
      "devEstimatedDate",
      "Previsão de Desenvolvimento",
      dateIsoDay(oldAdherence?.devEstimatedDate),
      dateIsoDay(newAdherence?.devEstimatedDate),
      (v) => formatDayBr(String(v || "")),
    );
    compareStageScalar(
      "adherence",
      "gapPriority",
      "Prioridade do Gap",
      oldAdherence?.gapPriority,
      newAdherence?.gapPriority,
      (v) => (v ? PRIORITY_LABELS[String(v)] || String(v) : EMPTY_VALUE_DISPLAY),
    );
    compareStageScalar(
      "adherence",
      "analysisComplete",
      "Análise Concluída",
      Boolean(oldAdherence?.analysisComplete),
      Boolean(newAdherence?.analysisComplete),
      (v) => (v ? "Sim" : "Não"),
    );
    compareStageScalar(
      "adherence",
      "conformityStandards",
      "Padrões de Conformidade",
      oldAdherence?.conformityStandards,
      newAdherence?.conformityStandards,
    );
  }

  // -------------------------------------------------------------------------
  // 3.3. Etapa 3: Conversão de Dados
  // -------------------------------------------------------------------------
  const oldConv = oldProject.stages?.conversion as (ProjectV2["stages"]["conversion"] & { sourceEngine?: string }) | undefined;
  const newConv = newProject.stages?.conversion as (ProjectV2["stages"]["conversion"] & { sourceEngine?: string }) | undefined;
  if (oldConv || newConv) {
    compareCommonStage("conversion", oldConv, newConv, {
      startLabel: "Início da Conversão",
      endLabel: "Finalizado Em",
    });

    compareStageScalar(
      "conversion",
      "sentAt",
      "Enviado para Conversão em",
      dateIsoDay(oldConv?.sentAt),
      dateIsoDay(newConv?.sentAt),
      (v) => formatDayBr(String(v || "")),
    );
    compareStageScalar(
      "conversion",
      "finishedAt",
      "Finalizado na Fila em",
      dateIsoDay(oldConv?.finishedAt),
      dateIsoDay(newConv?.finishedAt),
      (v) => formatDayBr(String(v || "")),
    );
    compareStageScalar(
      "conversion",
      "homologationStatus",
      "Status Homologação",
      oldConv?.homologationStatus,
      newConv?.homologationStatus,
    );
    compareStageScalar(
      "conversion",
      "homologationResponsible",
      "Responsável Homolog.",
      oldConv?.homologationResponsible,
      newConv?.homologationResponsible,
    );
    compareStageScalar(
      "conversion",
      "homologationFinishedAt",
      "Agendado Para (Homolog.)",
      dateIsoDay(oldConv?.homologationFinishedAt),
      dateIsoDay(newConv?.homologationFinishedAt),
      (v) => formatDayBr(String(v || "")),
    );
    compareStageScalar(
      "conversion",
      "homologationDate",
      "Data da Homologação",
      dateIsoDay(oldConv?.homologationDate),
      dateIsoDay(newConv?.homologationDate),
      (v) => formatDayBr(String(v || "")),
    );
    compareStageScalar(
      "conversion",
      "complexity",
      "Complexidade",
      oldConv?.complexity,
      newConv?.complexity,
      (v) => (v ? COMPLEXITY_LABELS[String(v)] || String(v) : EMPTY_VALUE_DISPLAY),
    );
    compareStageScalar(
      "conversion",
      "recordCount",
      "Qtd. de Registros",
      oldConv?.recordCount ?? null,
      newConv?.recordCount ?? null,
      (v) => (v !== null && v !== undefined ? String(v) : EMPTY_VALUE_DISPLAY),
    );
    compareStageScalar(
      "conversion",
      "dataVolumeGb",
      "Volume de Dados (GB)",
      oldConv?.dataVolumeGb ?? null,
      newConv?.dataVolumeGb ?? null,
      (v) => (v !== null && v !== undefined ? `${v} GB` : EMPTY_VALUE_DISPLAY),
    );
    compareStageScalar(
      "conversion",
      "sourceEngine",
      "Sistema / Motor de Origem",
      oldConv?.sourceEngine ?? oldConv?.toolUsed,
      newConv?.sourceEngine ?? newConv?.toolUsed,
    );
    compareStageScalar(
      "conversion",
      "deviations",
      "Desvios Identificados",
      oldConv?.deviations,
      newConv?.deviations,
    );
  }

  // -------------------------------------------------------------------------
  // 3.4. Etapa 4: Preparação de Ambiente (com mascaramento rigoroso de senhas)
  // -------------------------------------------------------------------------
  const oldEnv = oldProject.stages?.environment;
  const newEnv = newProject.stages?.environment;
  if (oldEnv || newEnv) {
    compareCommonStage("environment", oldEnv, newEnv, {
      startLabel: "Enviado em",
      endLabel: "Finalizado Em",
    });

    compareStageScalar(
      "environment",
      "osType",
      "Tipo de Sistema Operacional",
      oldEnv?.osType,
      newEnv?.osType,
    );
    compareStageScalar(
      "environment",
      "osVersion",
      "Versão do Sistema Operacional",
      oldEnv?.osVersion,
      newEnv?.osVersion,
    );
    compareStageScalar(
      "environment",
      "postgresVersion",
      "Versão do PostgreSQL",
      oldEnv?.postgresVersion,
      newEnv?.postgresVersion,
    );
    compareStageScalar(
      "environment",
      "postgresHost",
      "Local de Instalação PostgreSQL (IP/Porta)",
      oldEnv?.postgresHost,
      newEnv?.postgresHost,
    );
    compareStageScalar(
      "environment",
      "postgresUser",
      "Usuário do PostgreSQL",
      oldEnv?.postgresUser,
      newEnv?.postgresUser,
    );

    if (normStr(oldEnv?.postgresPassword) !== normStr(newEnv?.postgresPassword)) {
      const stageLabel = getStageLabelForProject("environment", newProject);
      const oldPwd = normStr(oldEnv?.postgresPassword);
      const newPwd = normStr(newEnv?.postgresPassword);
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "environment",
        stageLabel,
        field: "stages.environment.postgresPassword",
        label: "Senha do PostgreSQL",
        oldValue: maskPasswordValue(oldPwd),
        newValue: newPwd ? "•••••••• (alterada)" : "(removida)",
        message: `Senha do PostgreSQL alterada em ${stageLabel}`,
      });
    }

    if (normStr(oldEnv?.soLogin) !== normStr(newEnv?.soLogin)) {
      compareStageScalar(
        "environment",
        "soLogin",
        "Login do SO",
        oldEnv?.soLogin,
        newEnv?.soLogin,
      );
    }

    if (normStr(oldEnv?.soPassword) !== normStr(newEnv?.soPassword)) {
      const stageLabel = getStageLabelForProject("environment", newProject);
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "environment",
        stageLabel,
        field: "stages.environment.soPassword",
        label: "Senha do SO",
        oldValue: maskPasswordValue(oldEnv?.soPassword),
        newValue: normStr(newEnv?.soPassword) ? "•••••••• (alterada)" : "(removida)",
        message: `Senha do SO alterada em ${stageLabel}`,
      });
    }

    if (normStr(oldEnv?.anydeskId) !== normStr(newEnv?.anydeskId)) {
      compareStageScalar(
        "environment",
        "anydeskId",
        "ID AnyDesk",
        oldEnv?.anydeskId,
        newEnv?.anydeskId,
      );
    }

    if (normStr(oldEnv?.anydeskPassword) !== normStr(newEnv?.anydeskPassword)) {
      const stageLabel = getStageLabelForProject("environment", newProject);
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "environment",
        stageLabel,
        field: "stages.environment.anydeskPassword",
        label: "Senha AnyDesk",
        oldValue: maskPasswordValue(oldEnv?.anydeskPassword),
        newValue: normStr(newEnv?.anydeskPassword) ? "•••••••• (alterada)" : "(removida)",
        message: `Senha AnyDesk alterada em ${stageLabel}`,
      });
    }

    if (
      JSON.stringify(oldEnv?.remoteAccessList || []) !==
      JSON.stringify(newEnv?.remoteAccessList || [])
    ) {
      const stageLabel = getStageLabelForProject("environment", newProject);
      const oldSummary = summarizeRemoteAccessList(oldEnv?.remoteAccessList);
      const newSummary = summarizeRemoteAccessList(newEnv?.remoteAccessList);
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "environment",
        stageLabel,
        field: "stages.environment.remoteAccessList",
        label: "Acessos Remotos",
        oldValue: oldSummary,
        newValue:
          oldSummary === newSummary ? `${newSummary} (credencial alterada)` : newSummary,
        message: `Acessos remotos atualizados em ${stageLabel}`,
      });
    }

    if (
      JSON.stringify(oldEnv?.osCredentials || []) !==
      JSON.stringify(newEnv?.osCredentials || [])
    ) {
      const stageLabel = getStageLabelForProject("environment", newProject);
      const oldSummary = summarizeOsCredentials(oldEnv?.osCredentials);
      const newSummary = summarizeOsCredentials(newEnv?.osCredentials);
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "environment",
        stageLabel,
        field: "stages.environment.osCredentials",
        label: "Credenciais do SO",
        oldValue: oldSummary,
        newValue:
          oldSummary === newSummary ? `${newSummary} (credencial/senha alterada)` : newSummary,
        message: `Credenciais do SO atualizadas em ${stageLabel}`,
      });
    }

    compareStageScalar(
      "environment",
      "orionAdminConfigured",
      "Orion Admin Configurado",
      Boolean(oldEnv?.orionAdminConfigured),
      Boolean(newEnv?.orionAdminConfigured),
      (v) => (v ? "Configurado" : "Pendente"),
    );

    if (normStr(oldEnv?.orionAdminConfig) !== normStr(newEnv?.orionAdminConfig)) {
      const stageLabel = getStageLabelForProject("environment", newProject);
      const oldSanitized = sanitizeOrionAdminPropertiesForLog(oldEnv?.orionAdminConfig);
      const newSanitized = sanitizeOrionAdminPropertiesForLog(newEnv?.orionAdminConfig);
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "environment",
        stageLabel,
        field: "stages.environment.orionAdminConfig",
        label: "Arquivo .properties do Orion Admin",
        oldValue: oldSanitized,
        newValue:
          oldSanitized === newSanitized
            ? `${newSanitized}\n(credencial/senha atualizada)`
            : newSanitized,
        message: `Configuração .properties do Orion Admin atualizada em ${stageLabel}`,
      });
    }

    if (
      JSON.stringify(oldEnv?.screenshots || []) !==
      JSON.stringify(newEnv?.screenshots || [])
    ) {
      const stageLabel = getStageLabelForProject("environment", newProject);
      const oldNames = new Set((oldEnv?.screenshots || []).map((s) => s.name || s.path));
      const newNames = new Set((newEnv?.screenshots || []).map((s) => s.name || s.path));
      const added = [...newNames].filter((n) => !oldNames.has(n));
      const removed = [...oldNames].filter((n) => !newNames.has(n));

      const oldSummary = summarizeScreenshots(oldEnv?.screenshots);
      const newBase = summarizeScreenshots(newEnv?.screenshots);
      const suffixParts: string[] = [];
      if (added.length) suffixParts.push(`Adicionado(s): ${added.join(", ")}`);
      if (removed.length) suffixParts.push(`Removido(s): ${removed.join(", ")}`);
      const newSummary = suffixParts.length ? `${newBase} (${suffixParts.join(" | ")})` : newBase;

      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "environment",
        stageLabel,
        field: "stages.environment.screenshots",
        label: "Prints de Ambiente",
        oldValue: oldSummary,
        newValue: newSummary,
        message: `Prints de Ambiente atualizados em ${stageLabel}`,
      });
    }

    compareStageScalar(
      "environment",
      "kanbanStatus",
      "Status no Painel de Ambiente",
      oldEnv?.kanbanStatus,
      newEnv?.kanbanStatus,
    );
    compareStageScalar(
      "environment",
      "hasPendings",
      "Possui Pendências de Ambiente",
      Boolean(oldEnv?.hasPendings),
      Boolean(newEnv?.hasPendings),
      (v) => (v ? "Sim" : "Não"),
    );
    compareStageScalar(
      "environment",
      "approvedByInfra",
      "Aprovado pela Infra",
      Boolean(oldEnv?.approvedByInfra),
      Boolean(newEnv?.approvedByInfra),
      (v) => (v ? "Sim" : "Não"),
    );
    compareStageScalar(
      "environment",
      "testAvailable",
      "Ambiente de Teste Disponível",
      Boolean(oldEnv?.testAvailable),
      Boolean(newEnv?.testAvailable),
      (v) => (v ? "Sim" : "Não"),
    );
    compareStageScalar(
      "environment",
      "preparationChecklist",
      "Checklist de Preparação",
      oldEnv?.preparationChecklist,
      newEnv?.preparationChecklist,
    );
  }

  // -------------------------------------------------------------------------
  // 3.5. Etapa 5: Modelos Editor
  // -------------------------------------------------------------------------
  const oldModelos = oldProject.stages?.modelosEditor;
  const newModelos = newProject.stages?.modelosEditor;
  if (oldModelos || newModelos) {
    compareCommonStage("modelosEditor", oldModelos, newModelos);

    if (
      JSON.stringify(oldModelos?.sentFiles || []) !==
      JSON.stringify(newModelos?.sentFiles || [])
    ) {
      const stageLabel = getStageLabelForProject("modelosEditor", newProject);
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "modelosEditor",
        stageLabel,
        field: "stages.modelosEditor.sentFiles",
        label: "Modelos Enviados pela Serventia",
        oldValue: summarizeAttachedFiles(oldModelos?.sentFiles),
        newValue: summarizeAttachedFiles(newModelos?.sentFiles),
        message: `Modelos Enviados pela Serventia atualizados em ${stageLabel}`,
      });
    }

    if (
      JSON.stringify(oldModelos?.availableFiles || []) !==
      JSON.stringify(newModelos?.availableFiles || [])
    ) {
      const stageLabel = getStageLabelForProject("modelosEditor", newProject);
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "modelosEditor",
        stageLabel,
        field: "stages.modelosEditor.availableFiles",
        label: "Modelos Disponibilizados pela Siplan",
        oldValue: summarizeAttachedFiles(oldModelos?.availableFiles),
        newValue: summarizeAttachedFiles(newModelos?.availableFiles),
        message: `Modelos Disponibilizados pela Siplan atualizados em ${stageLabel}`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3.6. Etapa 5/6: Implantação & Treinamento (Geral + Fase 1 + Fase 2)
  // -------------------------------------------------------------------------
  const oldImpl = oldProject.stages?.implementation;
  const newImpl = newProject.stages?.implementation;
  if (oldImpl || newImpl) {
    const implStageLabel = getStageLabelForProject("implementation", newProject);

    compareCommonStage("implementation", oldImpl, newImpl, {
      skipResponsible: true,
      skipDates: true,
    });

    const oldP1 = (oldImpl?.phase1 || {}) as ImplementationPhase & { confirmedAt?: string | Date };
    const newP1 = (newImpl?.phase1 || {}) as ImplementationPhase & { confirmedAt?: string | Date };
    const oldP2 = (oldImpl?.phase2 || {}) as ImplementationPhase;
    const newP2 = (newImpl?.phase2 || {}) as ImplementationPhase;

    // Se implementation.responsible mudou diretamente sem phase1.responsible ter mudado
    const oldP1Resp = normStr(oldP1.responsible);
    const newP1Resp = normStr(newP1.responsible);
    if (oldP1Resp !== newP1Resp) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.phase1.responsible",
        label: "Implantador Responsável (Fase 1)",
        oldValue: displayStr(oldP1Resp),
        newValue: displayStr(newP1Resp),
        message: newP1Resp
          ? `Implantador Responsável (Fase 1) definido como "${newP1Resp}"`
          : `Implantador Responsável (Fase 1) removido`,
      });
    } else if (
      normStr(oldImpl?.responsible) !== normStr(newImpl?.responsible) &&
      !newP1Resp
    ) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.responsible",
        label: "Implantador Responsável",
        oldValue: displayStr(normStr(oldImpl?.responsible)),
        newValue: displayStr(normStr(newImpl?.responsible)),
      });
    }

    // Fase 1 Status
    const oldP1Status = translateStageStatus(oldP1.status);
    const newP1Status = translateStageStatus(newP1.status);
    if (oldP1Status !== newP1Status) {
      pushSingleField({
        type: "status_change",
        category: "stages",
        actionType: "status_change",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.phase1.status",
        label: "Status da Fase 1",
        oldValue: oldP1Status,
        newValue: newP1Status,
        message: `Status da Fase 1 (Implantação) alterado de "${oldP1Status}" para "${newP1Status}"`,
      });
    }

    // Fase 1 Confirmação
    if (Boolean(oldP1.isConfirmed) !== Boolean(newP1.isConfirmed)) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.phase1.isConfirmed",
        label: "Implantação Confirmada",
        oldValue: oldP1.isConfirmed ? "Confirmada" : "Não Confirmada",
        newValue: newP1.isConfirmed ? "Confirmada" : "Não Confirmada",
        message: newP1.isConfirmed
          ? "Implantação marcada como Confirmada (Fase 1)"
          : "Confirmação da Implantação removida (Fase 1)",
      });
    }

    // Fase 1 Data de Confirmação
    const oldConfAt = normStr(oldP1.confirmedAt);
    const newConfAt = normStr(newP1.confirmedAt);
    if (oldConfAt !== newConfAt) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.phase1.confirmedAt",
        label: "Data de Confirmação",
        oldValue: oldConfAt ? formatDateTimeBr(oldConfAt) : EMPTY_VALUE_DISPLAY,
        newValue: newConfAt ? formatDateTimeBr(newConfAt) : EMPTY_VALUE_DISPLAY,
      });
    }

    // Fase 1 Datas
    const oldP1Start = dateIsoDay(oldP1.startDate);
    const newP1Start = dateIsoDay(newP1.startDate);
    if (oldP1Start !== newP1Start) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.phase1.startDate",
        label: "Início Fase 1",
        oldValue: formatDayBr(oldP1Start),
        newValue: formatDayBr(newP1Start),
        message: `Início da Fase 1 alterado para ${formatDayBr(newP1Start)}`,
      });
    } else if (
      dateIsoDay(oldImpl?.startDate) !== dateIsoDay(newImpl?.startDate) &&
      !newP1Start
    ) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.startDate",
        label: "Início da Implantação",
        oldValue: formatDayBr(dateIsoDay(oldImpl?.startDate)),
        newValue: formatDayBr(dateIsoDay(newImpl?.startDate)),
      });
    }

    const oldP1End = dateIsoDay(oldP1.endDate);
    const newP1End = dateIsoDay(newP1.endDate);
    if (oldP1End !== newP1End) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.phase1.endDate",
        label: "Término Fase 1",
        oldValue: formatDayBr(oldP1End),
        newValue: formatDayBr(newP1End),
        message: `Término da Fase 1 alterado para ${formatDayBr(newP1End)}`,
      });
    } else if (
      dateIsoDay(oldImpl?.endDate) !== dateIsoDay(newImpl?.endDate) &&
      !newP1End
    ) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.endDate",
        label: "Término da Implantação",
        oldValue: formatDayBr(dateIsoDay(oldImpl?.endDate)),
        newValue: formatDayBr(dateIsoDay(newImpl?.endDate)),
      });
    }

    // Fase 1 Implantadores Adicionais
    const oldAddStr = summarizeAdditionalResponsibles(oldP1.additionalResponsibles);
    const newAddStr = summarizeAdditionalResponsibles(newP1.additionalResponsibles);
    if (oldAddStr !== newAddStr) {
      pushSingleField({
        category: "stages",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.phase1.additionalResponsibles",
        label: "Implantadores Adicionais (Fase 1)",
        oldValue: oldAddStr,
        newValue: newAddStr,
        message: `Implantadores Adicionais da Fase 1 atualizados`,
      });
    }

    // Demais campos Fase 1
    compareStageScalar(
      "implementation",
      "phase1.trainingLocation",
      "Local do Treinamento (Fase 1)",
      oldP1.trainingLocation,
      newP1.trainingLocation,
    );
    compareStageScalar(
      "implementation",
      "phase1.trainingType",
      "Tipo de Treinamento (Fase 1)",
      oldP1.trainingType,
      newP1.trainingType,
    );
    compareStageScalar(
      "implementation",
      "phase1.participantsCount",
      "Qtd. Participantes (Fase 1)",
      oldP1.participantsCount ?? null,
      newP1.participantsCount ?? null,
      (v) => (v !== null && v !== undefined ? String(v) : EMPTY_VALUE_DISPLAY),
    );
    compareStageScalar(
      "implementation",
      "phase1.observations",
      "Observações da Fase 1",
      oldP1.observations,
      newP1.observations,
      (v) => displayStr(extractReadableText(v)),
    );

    // Fase 2 (Possível Retorno)
    const oldP2Status = translateStageStatus(oldP2.status);
    const newP2Status = translateStageStatus(newP2.status);
    if (oldP2Status !== newP2Status) {
      pushSingleField({
        type: "status_change",
        category: "stages",
        actionType: "status_change",
        tabLabel: "Etapas",
        stageId: "implementation",
        stageLabel: implStageLabel,
        field: "stages.implementation.phase2.status",
        label: "Status da Fase 2",
        oldValue: oldP2Status,
        newValue: newP2Status,
        message: `Status da Fase 2 (Possível Retorno) alterado de "${oldP2Status}" para "${newP2Status}"`,
      });
    }

    compareStageScalar(
      "implementation",
      "phase2.responsible",
      "Responsável Fase 2",
      oldP2.responsible,
      newP2.responsible,
    );
    compareStageScalar(
      "implementation",
      "phase2.startDate",
      "Início Fase 2",
      dateIsoDay(oldP2.startDate),
      dateIsoDay(newP2.startDate),
      (v) => formatDayBr(String(v || "")),
    );
    compareStageScalar(
      "implementation",
      "phase2.endDate",
      "Término Fase 2",
      dateIsoDay(oldP2.endDate),
      dateIsoDay(newP2.endDate),
      (v) => formatDayBr(String(v || "")),
    );
    compareStageScalar(
      "implementation",
      "phase2.observations",
      "Observações da Fase 2",
      oldP2.observations,
      newP2.observations,
      (v) => displayStr(extractReadableText(v)),
    );
  }

  // -------------------------------------------------------------------------
  // 3.7. Etapa 6/7: Pós-Implantação
  // -------------------------------------------------------------------------
  const oldPost = oldProject.stages?.post;
  const newPost = newProject.stages?.post;
  if (oldPost || newPost) {
    const postStageLabel = getStageLabelForProject("post", newProject);

    compareCommonStage("post", oldPost, newPost, {
      skipObservations: true,
    });

    compareStageScalar(
      "post",
      "supportEndDate",
      "Término do Acompanhamento 15 dias",
      dateIsoDay(oldPost?.supportEndDate),
      dateIsoDay(newPost?.supportEndDate),
      (v) => formatDayBr(String(v || "")),
    );
    compareStageScalar(
      "post",
      "supportPeriodDays",
      "Período de Suporte (dias)",
      oldPost?.supportPeriodDays ?? null,
      newPost?.supportPeriodDays ?? null,
      (v) => (v !== null && v !== undefined ? `${v} dias` : EMPTY_VALUE_DISPLAY),
    );
    compareStageScalar(
      "post",
      "benefitsDelivered",
      "Benefícios Entregues",
      oldPost?.benefitsDelivered,
      newPost?.benefitsDelivered,
    );
    compareStageScalar(
      "post",
      "challengesFound",
      "Desafios Encontrados",
      oldPost?.challengesFound,
      newPost?.challengesFound,
    );
    compareStageScalar(
      "post",
      "roiEstimated",
      "ROI Estimado",
      oldPost?.roiEstimated,
      newPost?.roiEstimated,
    );
    compareStageScalar(
      "post",
      "clientSatisfaction",
      "Satisfação do Cliente",
      oldPost?.clientSatisfaction,
      newPost?.clientSatisfaction,
      (v) => (v ? SATISFACTION_LABELS[String(v)] || String(v) : EMPTY_VALUE_DISPLAY),
    );
    compareStageScalar(
      "post",
      "recommendations",
      "Recomendações",
      oldPost?.recommendations,
      newPost?.recommendations,
    );
    compareStageScalar(
      "post",
      "followupNeeded",
      "Necessita Follow-up",
      Boolean(oldPost?.followupNeeded),
      Boolean(newPost?.followupNeeded),
      (v) => (v ? "Sim" : "Não"),
    );
    compareStageScalar(
      "post",
      "followupDate",
      "Data de Follow-up",
      dateIsoDay(oldPost?.followupDate),
      dateIsoDay(newPost?.followupDate),
      (v) => formatDayBr(String(v || "")),
    );

    // Observações do Pós-Implantação (suporta blocos v2 + Resumo Geral separadamente)
    const oldPostV2 = parsePostV2Structure(oldPost?.observations);
    const newPostV2 = parsePostV2Structure(newPost?.observations);
    if (oldPostV2 || newPostV2) {
      const oldBlocksText = oldPostV2
        ? oldPostV2.blocks.map((b, i) => `Bloco ${i + 1}:\n${b}`).join("\n\n")
        : extractReadableText(oldPost?.observations);
      const newBlocksText = newPostV2
        ? newPostV2.blocks.map((b, i) => `Bloco ${i + 1}:\n${b}`).join("\n\n")
        : extractReadableText(newPost?.observations);

      if (oldBlocksText !== newBlocksText) {
        pushSingleField({
          category: "stages",
          tabLabel: "Etapas",
          stageId: "post",
          stageLabel: postStageLabel,
          field: "stages.post.observations.blocks",
          label: "Observações & Detalhes (Blocos)",
          oldValue: displayStr(oldBlocksText),
          newValue: displayStr(newBlocksText),
          message: `Blocos de Observações alterados em ${postStageLabel}`,
        });
      }

      const oldSummaryText = oldPostV2 ? oldPostV2.summary : "";
      const newSummaryText = newPostV2 ? newPostV2.summary : "";
      if (oldSummaryText !== newSummaryText) {
        pushSingleField({
          category: "stages",
          tabLabel: "Etapas",
          stageId: "post",
          stageLabel: postStageLabel,
          field: "stages.post.observations.summary",
          label: "Resumo Geral (Pós-Implantação)",
          oldValue: displayStr(oldSummaryText),
          newValue: displayStr(newSummaryText),
          message: `Resumo Geral alterado em ${postStageLabel}`,
        });
      }
    } else {
      const oldPostObs = extractReadableText(oldPost?.observations);
      const newPostObs = extractReadableText(newPost?.observations);
      if (oldPostObs !== newPostObs) {
        pushSingleField({
          category: "stages",
          tabLabel: "Etapas",
          stageId: "post",
          stageLabel: postStageLabel,
          field: "stages.post.observations",
          label: "Observações & Detalhes",
          oldValue: displayStr(oldPostObs),
          newValue: displayStr(newPostObs),
          message: `Observações & Detalhes alteradas em ${postStageLabel}`,
        });
      }
    }
  }

  return events;
}
