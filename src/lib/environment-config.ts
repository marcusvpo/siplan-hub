/**
 * Utilitários e regras de negócio do Kanban de Configuração de Ambiente
 */

import { ProjectV2, EnvironmentStageV2, EnvironmentTimelineItem } from "@/types/ProjectV2";

export type EnvironmentKanbanColumnId = "not_started" | "in_progress" | "completed";

export interface EnvironmentUrgencyInfo {
  daysRemaining: number | null;
  urgencyLevel: "done" | "in_progress" | "safe" | "warning" | "danger" | "critical" | "no_date";
  label: string;
  badgeLabel: string;
  cardBorderClass: string;
  cardBgClass: string;
  badgeClass: string;
  isPulsing: boolean;
}

/**
 * Calcula a Data Final limite da configuração de ambiente com base na data de início da Fase 1 (Treinamento & Acompanhamento).
 * Regra: "o último dia útil da semana anterior da data de início de implantação, normalmente a Sexta Feira da semana anterior".
 * Exemplo: se início for 07/12/2026 (segunda-feira), a data final limite é 04/12/2026 (sexta-feira anterior).
 */
export function calculateEnvironmentTargetDate(
  phase1StartDate?: string | Date | null
): Date | null {
  if (!phase1StartDate) return null;

  const start = new Date(phase1StartDate);
  if (isNaN(start.getTime())) return null;

  // Normalizar para meio-dia local para evitar drifts de fuso
  const year = start.getFullYear();
  const month = start.getMonth();
  const date = start.getDate();
  const normalized = new Date(year, month, date, 12, 0, 0, 0);

  const dayOfWeek = normalized.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

  // Dias decorridos desde a segunda-feira da semana da implantação (Segunda = 0, ..., Domingo = 6)
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  // Segunda-feira da semana de início
  const mondayThisWeek = new Date(normalized);
  mondayThisWeek.setDate(normalized.getDate() - daysSinceMonday);

  // Sexta-feira da semana anterior (Segunda - 3 dias)
  const lastFriday = new Date(mondayThisWeek);
  lastFriday.setDate(mondayThisWeek.getDate() - 3);

  return lastFriday;
}

/**
 * Formata a data limite em texto amigável em PT-BR
 */
export function formatEnvironmentTargetDate(targetDate: Date | null): string {
  if (!targetDate) return "Aguardando Datas";

  const d = String(targetDate.getDate()).padStart(2, "0");
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const y = targetDate.getFullYear();

  const weekdayShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][targetDate.getDay()];
  return `${d}/${m}/${y} (${weekdayShort})`;
}

/**
 * Retorna as classes de cor, alertas e animação pulsante com base na coluna e proximidade da data final.
 * Cores altamente destacadas, nítidas e contrastantes tanto no tema claro quanto no escuro.
 */
export function getEnvironmentUrgency(
  targetDate: Date | null,
  columnId: EnvironmentKanbanColumnId,
  hasPendings: boolean = false
): EnvironmentUrgencyInfo {
  // 1. Coluna Concluídos: Verde esmeralda sólido e bem destacado
  if (columnId === "completed") {
    if (hasPendings) {
      return {
        daysRemaining: null,
        urgencyLevel: "done",
        label: "Concluído com Pendências",
        badgeLabel: "Pendências",
        cardBorderClass: "border-l-[6px] border-l-amber-500 border-amber-400 dark:border-amber-600 shadow-sm shadow-amber-500/10",
        cardBgClass: "bg-amber-50/90 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-950/60",
        badgeClass: "bg-amber-600 text-white border-amber-700 font-bold shadow-xs",
        isPulsing: false,
      };
    }

    return {
      daysRemaining: null,
      urgencyLevel: "done",
      label: "Concluído",
      badgeLabel: "Concluído",
      cardBorderClass: "border-l-[6px] border-l-emerald-600 dark:border-l-emerald-500 border-emerald-400/80 dark:border-emerald-600 shadow-sm shadow-emerald-500/10",
      cardBgClass: "bg-emerald-50/90 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60",
      badgeClass: "bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs",
      isPulsing: false,
    };
  }

  // 2. Coluna Em Andamento: Azul Royal bem evidente e contrastante
  if (columnId === "in_progress") {
    return {
      daysRemaining: null,
      urgencyLevel: "in_progress",
      label: "Em Andamento",
      badgeLabel: "Em Execução",
      cardBorderClass: "border-l-[6px] border-l-blue-600 dark:border-l-blue-400 border-blue-400/90 dark:border-blue-500 shadow-md shadow-blue-500/15",
      cardBgClass: "bg-blue-50/95 hover:bg-blue-100/80 dark:bg-blue-950/50 dark:hover:bg-blue-950/70",
      badgeClass: "bg-blue-600 text-white border-blue-700 font-bold shadow-xs",
      isPulsing: false,
    };
  }

  // 3. Coluna Não Iniciados: sem data definida
  if (!targetDate) {
    return {
      daysRemaining: null,
      urgencyLevel: "no_date",
      label: "Aguardando Datas",
      badgeLabel: "Aguardando Datas",
      cardBorderClass: "border-l-[6px] border-l-slate-400 dark:border-l-slate-500 border-border hover:border-slate-400 shadow-xs",
      cardBgClass: "bg-card hover:bg-muted/40",
      badgeClass: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 font-semibold",
      isPulsing: false,
    };
  }

  // 4. Coluna Não Iniciados: cálculo de dias restantes até targetDate
  const today = new Date();
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  const targetNormalized = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12, 0, 0, 0);

  const diffMs = targetNormalized.getTime() - todayNormalized.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // >= 14 dias (2 semanas ou mais): Verde vivo e nítido
  if (diffDays >= 14) {
    return {
      daysRemaining: diffDays,
      urgencyLevel: "safe",
      label: `Faltam ${diffDays} dias`,
      badgeLabel: `Faltam ${diffDays} dias`,
      cardBorderClass: "border-l-[6px] border-l-emerald-500 border-emerald-400 dark:border-emerald-600 shadow-sm shadow-emerald-500/10",
      cardBgClass: "bg-emerald-50/80 hover:bg-emerald-100/70 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/55",
      badgeClass: "bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs",
      isPulsing: false,
    };
  }

  // 7 a 13 dias (semana anterior à data final): Laranja forte bem evidente
  if (diffDays >= 7) {
    return {
      daysRemaining: diffDays,
      urgencyLevel: "warning",
      label: `Atenção: faltam ${diffDays} dias`,
      badgeLabel: `${diffDays} dias restantes`,
      cardBorderClass: "border-l-[6px] border-l-amber-500 border-amber-400 dark:border-amber-500 shadow-md shadow-amber-500/15",
      cardBgClass: "bg-amber-100/80 hover:bg-amber-100 dark:bg-amber-950/45 dark:hover:bg-amber-950/65",
      badgeClass: "bg-amber-500 text-white border-amber-600 font-extrabold shadow-xs",
      isPulsing: false,
    };
  }

  // Dentro da semana da data final (0 a 6 dias): Vermelho vivo pulsante com alto destaque
  if (diffDays >= 0) {
    const isCritical = diffDays <= 2;
    return {
      daysRemaining: diffDays,
      urgencyLevel: isCritical ? "critical" : "danger",
      label: diffDays === 0 ? "Vence Hoje!" : `Crítico: faltam ${diffDays} dia(s)`,
      badgeLabel: diffDays === 0 ? "Vence Hoje!" : `${diffDays}d para o prazo`,
      cardBorderClass: isCritical
        ? "border-l-[8px] border-l-red-600 dark:border-l-red-500 border-red-500 dark:border-red-500 ring-2 ring-red-500/50 shadow-lg shadow-red-500/25"
        : "border-l-[6px] border-l-red-600 border-red-400 dark:border-red-500 shadow-md shadow-red-500/20",
      cardBgClass: isCritical
        ? "bg-red-100/95 hover:bg-red-200/90 dark:bg-red-950/65 dark:hover:bg-red-950/85"
        : "bg-red-50/95 hover:bg-red-100/85 dark:bg-red-950/50 dark:hover:bg-red-950/70",
      badgeClass: "bg-red-600 text-white border-red-700 font-black shadow-md animate-pulse",
      isPulsing: true,
    };
  }

  // Já vencido (< 0 dias): Vermelho crítico piscante com alerta total
  const overdueDays = Math.abs(diffDays);
  return {
    daysRemaining: diffDays,
    urgencyLevel: "critical",
    label: `Atrasado há ${overdueDays} dia(s)!`,
    badgeLabel: `Atrasado (${overdueDays}d)`,
    cardBorderClass: "border-l-[8px] border-l-red-700 dark:border-l-red-500 border-red-600 ring-2 ring-red-600/70 shadow-xl shadow-red-600/35",
    cardBgClass: "bg-red-100 dark:bg-red-950/75 dark:hover:bg-red-950/90",
    badgeClass: "bg-red-700 text-white border-red-800 font-black shadow-md animate-pulse",
    isPulsing: true,
  };
}

/**
 * Valida se o usuário tem privilégio para arrastar cards e gerenciar informações no Kanban:
 * - Usuários admin
 * - Usuários específicos "Alex Silva" e "Bruno Fernandes"
 * - Usuários com permissão explícita environment_config:edit
 */
export function canManageEnvironmentConfig(
  fullName?: string | null,
  isAdmin: boolean = false,
  hasPermission?: (resource: string, action: string) => boolean
): boolean {
  if (isAdmin) return true;

  if (hasPermission && hasPermission("environment_config", "edit")) {
    return true;
  }

  if (fullName) {
    const clean = fullName.trim().toLowerCase();
    const isBruno = clean.includes("bruno") && clean.includes("fernandes");
    const isAlex = clean.includes("alex") && clean.includes("silva");
    if (isBruno || isAlex) return true;
  }

  return false;
}

/**
 * Valida se o usuário logado é exatamente o responsável atribuído ao projeto
 */
export function isUserCurrentResponsible(
  responsibleName?: string | null,
  currentFullName?: string | null,
  currentEmail?: string | null
): boolean {
  if (!responsibleName || !responsibleName.trim()) return false;
  const target = responsibleName.trim().toLowerCase();

  if (currentFullName) {
    const full = currentFullName.trim().toLowerCase();
    if (full === target || full.includes(target) || target.includes(full)) {
      return true;
    }
  }

  if (currentEmail) {
    const mail = currentEmail.toLowerCase();
    if (mail.includes("alex.silva") && target.includes("alex")) return true;
    if (mail.includes("bruno.fernandes") && target.includes("bruno")) return true;
  }

  return false;
}

/**
 * Informações e regras de alerta crítico de SLA de Configuração de Ambiente
 * Alerta em destaque quando faltam poucos dias (quarta/quinta da semana anterior) e o ambiente ainda está pendente
 */
export interface EnvironmentSlaAlert {
  isCritical: boolean;
  isWarning: boolean;
  label: string;
  title: string;
  colorClass: string;
}

export function getEnvironmentSlaAlert(project: ProjectV2): EnvironmentSlaAlert | null {
  if (project.isDeleted) return null;
  const sys = (project.systemType || "").trim().toLowerCase();
  if (sys.includes("modelo")) return null;

  const env = project.stages?.environment;
  const isDone = env?.status === "done" || env?.kanbanStatus === "completed";
  if (isDone) return null;

  const phase1 = project.stages?.implementation?.phase1 as any;
  const start = phase1?.startDate || phase1?.start_date || project.stages?.implementation?.startDate;
  const targetDate = calculateEnvironmentTargetDate(start);
  if (!targetDate) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isUnassigned = !env?.responsible || env.responsible.trim() === "";
  const isTodo = env?.status === "todo" || !env?.status;

  // Alerta Crítico (quarta-feira em diante da semana limite: faltam 2 dias ou menos, ou já venceu):
  if (diffDays <= 2) {
    const overdue = diffDays < 0;
    return {
      isCritical: true,
      isWarning: false,
      label: overdue ? "Ambiente Atrasado!" : isUnassigned ? "SLA Ambiente: Sem Analista!" : "SLA Ambiente Crítico!",
      title: `Alerta Crítico de SLA: Implantação prevista para a próxima semana e a configuração de ambiente ainda ${
        overdue ? "está atrasada" : isUnassigned ? "não foi assumida" : "está pendente de finalização"
      }. Prazo limite: ${formatEnvironmentTargetDate(targetDate)}.`,
      colorClass: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/25 animate-pulse border-red-400",
    };
  }

  // Alerta de Atenção (início da semana limite: faltam 3 a 5 dias, e ainda está não iniciado ou sem analista):
  if (diffDays <= 5 && (isTodo || isUnassigned)) {
    return {
      isCritical: false,
      isWarning: true,
      label: "SLA Ambiente: Atenção",
      title: `Atenção: A data limite de configuração de ambiente é nesta semana (${formatEnvironmentTargetDate(targetDate)}) e o chamado ainda ${
        isTodo ? "não foi iniciado" : "não possui analista atribuído"
      }.`,
      colorClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 border-amber-400",
    };
  }

  return null;
}

/**
 * Fábrica de eventos para a timeline de auditoria da configuração de ambiente
 */
export function createEnvironmentTimelineItem(
  action: EnvironmentTimelineItem["action"],
  author: string,
  description: string
): EnvironmentTimelineItem {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    author: author || "Sistema",
    action,
    description,
  };
}

/**
 * Formata data no formato dd/MM seguro contra fuso horário
 */
function formatDateDayMonth(dateInput?: string | Date | null): string | null {
  if (!dateInput) return null;
  let d: Date;
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      d = new Date(year, month, day, 12, 0, 0, 0);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/**
 * Gera resumo formatado no padrão exato do Teams para envio aos analistas (Alex e Bruno):
 * 
 * Exemplo:
 * FRANCA - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 02
 * #759980
 * Sistema: Orion PRO - [Configurar Ambiente no Servidor do Cartório]
 * Produtos: [Produtos secundários do projeto ou "Nenhum"]
 * Implantação agendada para 09/11 a 13/11 - Brites
 * (Finalizar Configuração até 06/11)
 * 
 * Se não houver datas definidas, exibe:
 * "Aguardando definição de datas para a Implantação"
 */
export function formatEnvironmentConnectionSummary(
  project: ProjectV2,
  detailedStage?: EnvironmentStageV2
): string {
  const clientName = (project.clientName || "Cartório").trim();

  const rawTicket = (project.ticketNumber || "").trim();
  const ticketLine = rawTicket
    ? rawTicket.startsWith("#")
      ? rawTicket
      : `#${rawTicket}`
    : "#S/N";

  const system = (project.systemType || "Orion").trim();
  const systemLine = `Sistema: ${system} - [Configurar Ambiente no Servidor do Cartório]`;

  // Extrair produtos secundários
  const secondaryProductsList: string[] = [];
  if (Array.isArray(project.secondaryProductsNames) && project.secondaryProductsNames.length > 0) {
    project.secondaryProductsNames.forEach((p) => {
      if (p && p.trim()) secondaryProductsList.push(p.trim());
    });
  } else if (Array.isArray(project.products) && project.products.length > 0) {
    project.products.forEach((p) => {
      if (p && p.trim()) secondaryProductsList.push(p.trim());
    });
  }

  const uniqueProducts = Array.from(new Set(secondaryProductsList));
  const productsStr = uniqueProducts.length > 0 ? uniqueProducts.join(", ") : "Nenhum";
  const productsLine = `Produtos: ${productsStr}`;

  // Implantação e Data Final
  const phase1 = project.stages?.implementation?.phase1 as any;
  const startRaw = phase1?.startDate || phase1?.start_date || project.stages?.implementation?.startDate;
  const endRaw = phase1?.endDate || phase1?.end_date || project.stages?.implementation?.endDate;
  const responsible = (
    phase1?.responsible ||
    project.responsibleImplementation ||
    ""
  ).trim();

  const startFormatted = formatDateDayMonth(startRaw);
  const endFormatted = formatDateDayMonth(endRaw);
  const targetDate = calculateEnvironmentTargetDate(startRaw);
  const targetFormatted = formatDateDayMonth(targetDate);

  const lines: string[] = [
    clientName,
    ticketLine,
    systemLine,
    productsLine,
  ];

  if (startFormatted) {
    const dateRange =
      endFormatted && endFormatted !== startFormatted
        ? `${startFormatted} a ${endFormatted}`
        : startFormatted;
    const responsibleSuffix = responsible ? ` - ${responsible}` : "";
    lines.push(`Implantação agendada para ${dateRange}${responsibleSuffix}`);
    if (targetFormatted) {
      lines.push(`(Finalizar Configuração até ${targetFormatted})`);
    }
  } else {
    lines.push("Aguardando definição de datas para a Implantação");
  }

  return lines.join("\n");
}
