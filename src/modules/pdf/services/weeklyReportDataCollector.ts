import fs from "node:fs";
import path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { calculateEnvironmentTargetDate, getEnvironmentUrgency } from "@/lib/environment-config";
import type {
  WeeklyExecutiveReportData,
  WeeklyReportReferencePeriod,
  WeeklyReportKpis,
  AdvancedProjectItem,
  StartingPhase1Item,
  InfraGargaloItem,
  EnvironmentDeadlineItem,
  DeploymentScheduleItem,
  ConversionQueueAnalystGroup,
  StartingPostImplantationItem,
  PlatformChangelogItem,
  AiExecutiveSummary,
} from "../types/weeklyReport";

/**
 * Obtém ou cria o cliente do Supabase compatível tanto com o Vite (frontend)
 * quanto com scripts executados via Node/tsx no ambiente Antigravity.
 */
function getSupabaseClient(): SupabaseClient {
  let url = "";
  let key = "";

  // 1. Tentar ler de import.meta.env (Vite)
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      url = (import.meta.env.VITE_SUPABASE_URL as string) || "";
      key = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string) ||
            (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "";
    }
  } catch {
    /* ambiente Node */
  }

  // 2. Se vazio, tentar ler de process.env (Node / tsx)
  if (!url && typeof process !== "undefined" && process.env) {
    url = process.env.VITE_SUPABASE_URL || "";
    key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  }

  // 3. Fallback: carregar manualmente do arquivo .env se estiver no Node
  if ((!url || !key) && typeof process !== "undefined") {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, "utf-8").split("\n");
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.startsWith("VITE_SUPABASE_URL=")) {
            url = line.replace("VITE_SUPABASE_URL=", "").replace(/["']/g, "").trim();
          } else if (line.startsWith("VITE_SUPABASE_SERVICE_ROLE_KEY=")) {
            key = line.replace("VITE_SUPABASE_SERVICE_ROLE_KEY=", "").replace(/["']/g, "").trim();
          } else if (!key && line.startsWith("VITE_SUPABASE_PUBLISHABLE_KEY=")) {
            key = line.replace("VITE_SUPABASE_PUBLISHABLE_KEY=", "").replace(/["']/g, "").trim();
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!url || !key) {
    throw new Error("Credenciais do Supabase não encontradas no ambiente ou no .env!");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function formatDateBr(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Calcula os períodos de referência da semana anterior (concluída) e semana atual (em curso).
 */
export function calculateReferencePeriods(baseDate: Date = new Date()): WeeklyReportReferencePeriod {
  const dayOfWeek = baseDate.getDay(); // 0 = Domingo, 1 = Segunda
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  // Segunda-feira desta semana
  const currentMonday = new Date(baseDate);
  currentMonday.setDate(baseDate.getDate() - daysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  // Domingo desta semana
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);
  currentSunday.setHours(23, 59, 59, 999);

  // Segunda-feira da semana passada
  const prevMonday = new Date(currentMonday);
  prevMonday.setDate(currentMonday.getDate() - 7);
  prevMonday.setHours(0, 0, 0, 0);

  // Domingo da semana passada
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  prevSunday.setHours(23, 59, 59, 999);

  return {
    startDate: formatDateBr(prevMonday),
    endDate: formatDateBr(prevSunday),
    currentWeekStartDate: formatDateBr(currentMonday),
    currentWeekEndDate: formatDateBr(currentSunday),
    previousWeekStartDate: formatDateBr(prevMonday),
    previousWeekEndDate: formatDateBr(prevSunday),
    weekNumber: getWeekNumber(baseDate),
    year: baseDate.getFullYear(),
  };
}

/**
 * Coleta todos os dados de negócio do Supabase em tempo real para a composição do relatório.
 */
export async function collectWeeklyExecutiveReportData(
  customAiSummary?: Partial<AiExecutiveSummary>,
  baseDate: Date = new Date()
): Promise<WeeklyExecutiveReportData> {
  const supabase = getSupabaseClient();
  const periods = calculateReferencePeriods(baseDate);

  const dayOfWeek = baseDate.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const currentMonday = new Date(baseDate);
  currentMonday.setDate(baseDate.getDate() - daysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);
  currentSunday.setHours(23, 59, 59, 999);

  const prevMonday = new Date(currentMonday);
  prevMonday.setDate(currentMonday.getDate() - 7);
  prevMonday.setHours(0, 0, 0, 0);

  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  prevSunday.setHours(23, 59, 59, 999);

  // 1. Buscar todos os projetos ativos
  const { data: rawProjects, error: projError } = await supabase
    .from("projects")
    .select(`
      id, client_name, ticket_number, system_type, global_status, priority,
      infra_status, infra_responsible, infra_start_date, infra_end_date, infra_blocking_reason, infra_observations,
      environment_status, environment_responsible, environment_start_date, environment_end_date,
      conversion_status, conversion_responsible,
      implementation_status, implementation_responsible, implementation_start_date, implementation_end_date,
      post_status, post_responsible, post_start_date, post_end_date,
      updated_at, created_at, is_deleted, is_archived
    `)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .or("is_archived.is.null,is_archived.eq.false");

  if (projError) {
    throw new Error(`Erro ao buscar projetos no Supabase: ${projError.message}`);
  }

  // Filtrar projetos excluindo Modelos TN
  const projects = (rawProjects || []).filter((p) => p.system_type !== "Modelos TN");

  // 2. Buscar fila de conversão
  const { data: queueItems } = await supabase
    .from("conversion_queue")
    .select("id, project_id, assigned_to_name, queue_status, priority, estimated_completion, notes")
    .not("queue_status", "in", '("completed","cancelled")');

  // Mapear nomes de clientes para a fila de conversão
  const clientNameByProjectId = new Map<string, string>();
  for (const p of projects) {
    if (p.id) clientNameByProjectId.set(p.id, p.client_name || "Cartório sem nome");
  }

  // 3. Buscar notificações do tipo changelog
  const { data: changelogRows } = await supabase
    .from("notifications")
    .select("title, message, created_at, type")
    .eq("category", "changelog")
    .order("created_at", { ascending: false })
    .limit(8);

  // 4. Buscar histórico recente de auditoria (audit_logs)
  const { data: auditRows } = await supabase
    .from("audit_logs")
    .select("action, details, created_at")
    .in("action", ["project_stage_updated", "project_status_changed"])
    .gte("created_at", prevMonday.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  // ==========================================
  // PROCESSAMENTO DAS SEÇÕES DE NEGÓCIO
  // ==========================================

  // A) Projetos que avançaram de etapa
  const advancedProjects: AdvancedProjectItem[] = [];
  const processedProjectIds = new Set<string>();

  if (auditRows && auditRows.length > 0) {
    for (const log of auditRows) {
      const details = (log.details as Record<string, unknown>) || {};
      const projId = (details.projectId || details.project_id) as string;
      if (projId && !processedProjectIds.has(projId)) {
        processedProjectIds.add(projId);
        const project = projects.find((p) => p.id === projId);
        advancedProjects.push({
          id: projId,
          clientName: (details.projectName as string) || project?.client_name || "Cartório",
          ticketNumber: project?.ticket_number || undefined,
          systemType: project?.system_type || undefined,
          currentStage: (details.newValue as string) || (details.field as string) || "Etapa Atualizada",
          updatedAt: formatDateBr(log.created_at),
          responsible: (details.userName as string) || project?.implementation_responsible || "Equipe",
        });
      }
    }
  }

  // Fallback: se houver poucos audit_logs registrados, buscar projetos com updated_at recente na semana anterior
  if (advancedProjects.length === 0) {
    for (const p of projects) {
      if (p.updated_at) {
        const uDate = new Date(p.updated_at);
        if (uDate >= prevMonday && uDate <= prevSunday) {
          advancedProjects.push({
            id: p.id,
            clientName: p.client_name || "Cartório",
            ticketNumber: p.ticket_number || undefined,
            systemType: p.system_type || undefined,
            currentStage: p.implementation_status || p.global_status || "Em Andamento",
            updatedAt: formatDateBr(p.updated_at),
            responsible: p.implementation_responsible || p.infra_responsible || "Equipe",
          });
        }
      }
    }
  }

  // B) Projetos iniciando a implantação ("Fase 1 Treinamento & Acompanhamento") nesta semana
  const startingPhase1Projects: StartingPhase1Item[] = [];
  for (const p of projects) {
    if (p.implementation_start_date) {
      const start = new Date(p.implementation_start_date);
      if (start >= currentMonday && start <= currentSunday) {
        startingPhase1Projects.push({
          id: p.id,
          clientName: p.client_name || "Cartório",
          ticketNumber: p.ticket_number || undefined,
          startDate: formatDateBr(p.implementation_start_date),
          endDate: formatDateBr(p.implementation_end_date),
          responsible: p.implementation_responsible || "A definir",
          systemType: p.system_type || "Geral",
          status: p.implementation_status || "Planejado",
        });
      }
    }
  }

  // C) Projetos aguardando liberação de Infraestrutura (Gargalos mais antigos em andamento)
  const infraGargalos: InfraGargaloItem[] = [];
  const nowTime = baseDate.getTime();
  for (const p of projects) {
    if (p.infra_status === "in_progress" || p.infra_status === "blocked") {
      let daysWaiting = 0;
      if (p.infra_start_date) {
        const startDate = new Date(p.infra_start_date);
        daysWaiting = Math.max(0, Math.floor((nowTime - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (p.created_at) {
        const created = new Date(p.created_at);
        daysWaiting = Math.max(0, Math.floor((nowTime - created.getTime()) / (1000 * 60 * 60 * 24)));
      }

      infraGargalos.push({
        id: p.id,
        clientName: p.client_name || "Cartório",
        ticketNumber: p.ticket_number || undefined,
        startDate: formatDateBr(p.infra_start_date || p.created_at),
        daysWaiting,
        responsible: p.infra_responsible || "Equipe Infra",
        blockingReason: p.infra_blocking_reason || undefined,
        observations: p.infra_observations || undefined,
      });
    }
  }
  // Ordenar pelos que estão esperando há mais tempo
  infraGargalos.sort((a, b) => b.daysWaiting - a.daysWaiting);

  // D) Configurações de Ambiente necessárias para esta semana (/deployments/environment-config)
  const environmentDeadlines: EnvironmentDeadlineItem[] = [];
  for (const p of projects) {
    if (p.environment_status !== "done" && p.environment_status !== "completed") {
      const targetDate = calculateEnvironmentTargetDate(p.implementation_start_date);
      if (targetDate) {
        const urgency = getEnvironmentUrgency(targetDate, "in_progress");
        const daysDiff = Math.ceil((targetDate.getTime() - nowTime) / (1000 * 60 * 60 * 24));

        // Considerar prazos desta semana ou itens que já estão críticos/atrasados
        const isThisWeek = targetDate >= currentMonday && targetDate <= currentSunday;
        const isUrgentOrLate = urgency.urgencyLevel === "critical" || urgency.urgencyLevel === "danger" || daysDiff <= 7;

        if (isThisWeek || isUrgentOrLate) {
          environmentDeadlines.push({
            id: p.id,
            clientName: p.client_name || "Cartório",
            ticketNumber: p.ticket_number || undefined,
            targetDate: formatDateBr(targetDate),
            daysRemaining: daysDiff,
            urgencyLevel: urgency.urgencyLevel,
            responsible: p.environment_responsible || "Luciane Lima / Equipe",
            phase1StartDate: formatDateBr(p.implementation_start_date),
          });
        }
      }
    }
  }
  // Ordenar do mais urgente para o mais folgado
  environmentDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // E) Implantações confirmadas vs previstas
  const deploymentsSchedule: DeploymentScheduleItem[] = [];
  const futureHorizon = new Date(baseDate);
  futureHorizon.setDate(baseDate.getDate() + 45); // Próximos 45 dias

  for (const p of projects) {
    if (p.implementation_start_date) {
      const start = new Date(p.implementation_start_date);
      if (start >= currentMonday && start <= futureHorizon) {
        const isConfirmed = p.implementation_status === "confirmed" ||
          p.implementation_status === "in_progress" ||
          (p.priority === "high" || p.priority === "urgent");

        deploymentsSchedule.push({
          id: p.id,
          clientName: p.client_name || "Cartório",
          ticketNumber: p.ticket_number || undefined,
          startDate: formatDateBr(p.implementation_start_date),
          endDate: formatDateBr(p.implementation_end_date),
          responsible: p.implementation_responsible || "A definir",
          systemType: p.system_type || "Siplan",
          status: p.implementation_status || "Previsto",
          isConfirmed,
        });
      }
    }
  }
  deploymentsSchedule.sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // F) Fila de Conversão por Responsável
  const conversionMap = new Map<string, ConversionQueueAnalystGroup>();
  for (const item of queueItems || []) {
    const rawAnalyst = item.assigned_to_name?.trim() || "Fila Geral (Sem Responsável)";
    if (!conversionMap.has(rawAnalyst)) {
      conversionMap.set(rawAnalyst, {
        analystName: rawAnalyst,
        totalActive: 0,
        inProgress: 0,
        waiting: 0,
        homologation: 0,
        items: [],
      });
    }

    const group = conversionMap.get(rawAnalyst)!;
    group.totalActive++;

    const status = (item.queue_status || "").toLowerCase();
    if (status.includes("progress") || status.includes("executando")) {
      group.inProgress++;
    } else if (status.includes("homolog") || status.includes("validacao")) {
      group.homologation++;
    } else {
      group.waiting++;
    }

    const cName = clientNameByProjectId.get(item.project_id) || "Cartório ID: " + item.project_id?.slice(0, 8);
    group.items.push({
      clientName: cName,
      status: item.queue_status || "Pendente",
      priority: item.priority || 1,
      estimatedCompletion: item.estimated_completion ? formatDateBr(item.estimated_completion) : undefined,
    });
  }
  const conversionQueueGroups = Array.from(conversionMap.values()).sort((a, b) => b.totalActive - a.totalActive);

  // G) Implantações iniciando o Pós-Implantação nesta semana
  // REGRA: Fase 1 encerrada na semana anterior (entre prevMonday e prevSunday) -> Pós inicia na currentMonday com duração de 2 semanas
  const startingPostProjects: StartingPostImplantationItem[] = [];
  const postEndDateCalc = new Date(currentMonday);
  postEndDateCalc.setDate(currentMonday.getDate() + 14); // 2 semanas de pós

  for (const p of projects) {
    if (p.implementation_end_date) {
      const impEnd = new Date(p.implementation_end_date);
      // Se a Fase 1 terminou na semana anterior
      if (impEnd >= prevMonday && impEnd <= prevSunday) {
        startingPostProjects.push({
          id: p.id,
          clientName: p.client_name || "Cartório",
          ticketNumber: p.ticket_number || undefined,
          phase1EndDate: formatDateBr(p.implementation_end_date),
          postStartDate: formatDateBr(currentMonday),
          postEndDate: formatDateBr(postEndDateCalc),
          responsible: p.post_responsible || p.implementation_responsible || "Equipe Pós-Implantação",
          systemType: p.system_type || undefined,
        });
      }
    }
  }

  // H) Changelog da Plataforma
  const platformChangelog: PlatformChangelogItem[] = (changelogRows || []).map((c) => ({
    title: c.title || "Atualização Siplan HUB",
    message: c.message || "",
    date: formatDateBr(c.created_at),
    type: c.type || "release_improvement",
  }));

  // I) Consolidação de KPIs
  const kpis: WeeklyReportKpis = {
    totalActiveProjects: projects.length,
    advancedStagesLastWeekCount: advancedProjects.length,
    startingPhase1ThisWeekCount: startingPhase1Projects.length,
    startingPostThisWeekCount: startingPostProjects.length,
    infraGargalosCount: infraGargalos.length,
    environmentUrgentCount: environmentDeadlines.filter((e) => e.daysRemaining <= 3).length,
    activeConversionsCount: (queueItems || []).length,
    criticalHealthCount: projects.filter((p) => p.priority === "urgent" || p.infra_status === "blocked").length,
  };

  // J) Parecer Executivo da IA (Antigravity Brain)
  const defaultAiSummary: AiExecutiveSummary = {
    overview: `Durante a semana anterior (${periods.startDate} a ${periods.endDate}), foram monitorados ${kpis.totalActiveProjects} projetos ativos na esteira. A operação registra ${kpis.startingPhase1ThisWeekCount} cartórios iniciando a Fase 1 de Treinamento e Acompanhamento nesta semana corrente, e ${kpis.startingPostThisWeekCount} cartório(s) em transição direta para a fase de Pós-Implantação de duas semanas. Identificou-se atenção crítica para ${kpis.infraGargalosCount} projetos com liberação de infraestrutura pendente, exigindo alinhamento técnico urgente para não postergar as agendas homologadas.`,
    highlights: [
      `${kpis.advancedStagesLastWeekCount} movimentações de avanço de etapa registradas e consolidadas no período.`,
      `${kpis.startingPhase1ThisWeekCount} implantações presenciais e remotas (Fase 1) iniciando pontualmente nesta semana.`,
      `${platformChangelog.length} melhorias técnicas e novos recursos entregues no Siplan HUB, fortalecendo a produtividade operacional.`,
    ],
    criticalRisks: [
      `${infraGargalos.slice(0, 2).map((i) => `${i.clientName} (${i.daysWaiting} dias em análise de infra)`).join(", ") || "Sem gargalos críticos de infraestrutura"}.`,
      `${environmentDeadlines.filter((e) => e.daysRemaining <= 3).length} ambiente(s) com prazo de entrega imediato (SLA crítico) para suportar as viradas de chave.`,
      `Concentração na fila de conversão com ${kpis.activeConversionsCount} demandas abertas sob acompanhamento.`,
    ],
    strategicActions: [
      "Priorizar o contato imediato com o suporte de TI dos cartórios com análise de infraestrutura estagnada há mais de 10 dias.",
      "Garantir a finalização antecipada dos arquivos de configuração dos ambientes com virada programada para a próxima semana.",
      "Acompanhar de perto a primeira semana dos cartórios que acabaram de entrar em Pós-Implantação para manter o índice de satisfação elevado.",
    ],
  };

  const aiExecutiveSummary: AiExecutiveSummary = {
    overview: customAiSummary?.overview || defaultAiSummary.overview,
    highlights: customAiSummary?.highlights && customAiSummary.highlights.length > 0
      ? customAiSummary.highlights
      : defaultAiSummary.highlights,
    criticalRisks: customAiSummary?.criticalRisks && customAiSummary.criticalRisks.length > 0
      ? customAiSummary.criticalRisks
      : defaultAiSummary.criticalRisks,
    strategicActions: customAiSummary?.strategicActions && customAiSummary.strategicActions.length > 0
      ? customAiSummary.strategicActions
      : defaultAiSummary.strategicActions,
  };

  return {
    title: "Relatório Executivo Semanal de Implantação",
    subtitle: `Semana ${periods.weekNumber}/${periods.year} • Período de Análise: ${periods.startDate} a ${periods.endDate}`,
    generatedAt: new Date().toLocaleString("pt-BR"),
    generatedBy: "Antigravity AI • Siplan HUB Executive Assistant",
    referencePeriod: periods,
    kpis,
    aiExecutiveSummary,
    advancedProjects,
    startingPhase1Projects,
    infraGargalos,
    environmentDeadlines,
    deploymentsSchedule,
    conversionQueueGroups,
    startingPostProjects,
    platformChangelog,
  };
}
