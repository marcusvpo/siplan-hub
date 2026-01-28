import { ProjectV2, StageStatus } from "@/types/ProjectV2";

/**
 * Regras de negócio para quando uma etapa está "pronta para iniciar"
 * baseado nas condições das etapas anteriores
 */
export interface StageReadiness {
  stageId: keyof ProjectV2["stages"];
  isReady: boolean;
  reason: string;
  prerequisitesMet: boolean;
}

/**
 * Verifica se todas as pré-condições para iniciar uma etapa foram atendidas
 */
export function getStageReadiness(project: ProjectV2): StageReadiness[] {
  const stages = project.stages;
  
  return [
    {
      stageId: "infra",
      isReady: true, // Sempre pode iniciar
      reason: "Primeira etapa do fluxo",
      prerequisitesMet: true,
    },
    {
      stageId: "adherence",
      isReady: stages.adherence.status === "todo" && stages.infra.status === "done",
      reason: stages.infra.status === "done" 
        ? "✅ Infraestrutura concluída. Pode iniciar análise de aderência."
        : "Aguardando conclusão da Infraestrutura",
      prerequisitesMet: stages.infra.status === "done",
    },
    {
      stageId: "environment",
      isReady: 
        stages.environment.status === "todo" && 
        stages.infra.status === "done" &&
        stages.adherence.status === "done",
      reason: 
        stages.infra.status === "done" && stages.adherence.status === "done"
          ? "✅ Infra e Aderência concluídas. Pode criar ambiente."
          : "Aguardando conclusão de Infra e Aderência",
      prerequisitesMet: stages.infra.status === "done" && stages.adherence.status === "done",
    },
    {
      stageId: "conversion",
      isReady: 
        stages.conversion.status === "todo" &&
        stages.infra.status === "done" &&
        stages.adherence.status === "done",
      reason: 
        stages.infra.status === "done" && stages.adherence.status === "done"
          ? "✅ Pré-requisitos completos. Pode avançar para Conversão."
          : "Aguardando conclusão de Infra e Aderência",
      prerequisitesMet: stages.infra.status === "done" && stages.adherence.status === "done",
    },
    {
      stageId: "implementation",
      isReady: 
        stages.implementation.status === "todo" &&
        stages.conversion.status === "done" &&
        (stages.environment.approvedByInfra === true),
      reason: 
        stages.conversion.status === "done" && stages.environment.approvedByInfra
          ? "✅ Conversão finalizada e Ambiente aprovado. Pronto para Implantação."
          : !stages.environment.approvedByInfra
          ? "Aguardando aprovação do Ambiente pela Infra"
          : "Aguardando conclusão da Conversão",
      prerequisitesMet: 
        stages.conversion.status === "done" && 
        (stages.environment.approvedByInfra === true),
    },
    {
      stageId: "post",
      isReady: 
        stages.post.status === "todo" &&
        stages.implementation.status === "done",
      reason: 
        stages.implementation.status === "done"
          ? "✅ Implantação concluída. Pode iniciar Pós-Implantação."
          : "Aguardando conclusão da Implantação",
      prerequisitesMet: stages.implementation.status === "done",
    },
  ];
}

/**
 * Identifica o gargalo atual do projeto
 */
export interface ProjectBottleneck {
  stage: keyof ProjectV2["stages"] | null;
  stageName: string;
  severity: "none" | "low" | "medium" | "high";
  daysStuck: number;
  reason: string;
  responsiblePerson?: string;
}

/**
 * Representa um único gargalo detectado
 */
export interface BottleneckIssue {
  stage: keyof ProjectV2["stages"];
  stageName: string;
  severity: "low" | "medium" | "high";
  daysStuck: number;
  reason: string;
  responsiblePerson?: string;
  status: StageStatus;
}

/**
 * Calcula quantos dias uma etapa está travada/parada
 * 
 * CAMPO DE REFERÊNCIA: "startDate" representa quando a etapa foi "enviada" ou iniciada
 * - Para Infra, Adherence, Environment: startDate = quando foi enviada
 * - Para Conversion: sentAt (se disponível) ou startDate
 */
function getDaysStuck(stage: { 
  startDate?: Date; 
  sentAt?: Date; 
  lastUpdatedAt?: Date; 
}): number {
  // Para Conversion, prioriza sentAt (campo específico "Enviado Em")
  // Para outras etapas, usa startDate (representa quando foi iniciada/enviada)
  const referenceDate = 
    stage.sentAt ||        // Conversion: "Enviado Em" específico
    stage.startDate ||     // Todas as etapas: data de início/envio
    null;
  
  if (!referenceDate) return 0;
  
  const now = new Date();
  const ref = new Date(referenceDate);
  const diffTime = now.getTime() - ref.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return days > 0 ? days : 0;
}

/**
 * Determina a severidade baseada em dias
 */
function getSeverity(days: number): "low" | "medium" | "high" {
  if (days > 14) return "high";
  if (days > 10) return "medium";
  return "low";
}

/**
 * Identifica TODOS os gargalos ativos do projeto
 * 
 * REGRA DE NEGÓCIO:
 * - Gargalo = Etapa "in-progress" com >7 dias desde "Enviado Em" (startDate)
 * - EXCLUÍDAS: Implantação e Pós-Implantação (lógica não se aplica)
 * - Etapas "blocked" ou "waiting_adjustment" NÃO são gargalos
 * 
 * Retorna array de gargalos detectados, ordenados por severidade e dias
 */
export function identifyBottlenecks(project: ProjectV2): BottleneckIssue[] {
  const stages = project.stages;
  const bottlenecks: BottleneckIssue[] = [];
  
  // APENAS estas etapas podem ter gargalos
  const stageList = [
    { id: "infra" as const, name: "Infraestrutura", data: stages.infra },
    { id: "adherence" as const, name: "Aderência", data: stages.adherence },
    { id: "environment" as const, name: "Ambiente", data: stages.environment },
    { id: "conversion" as const, name: "Conversão", data: stages.conversion },
    // implementation e post EXCLUÍDOS - lógica não se aplica
  ];

  for (const stage of stageList) {
    const status = stage.data.status;
    

    
    // APENAS etapas "in-progress" podem ser gargalos
    if (status !== "in-progress") {
      continue;
    }
    
    const daysStuck = getDaysStuck(stage.data);
    

    
    // Gargalo = Em andamento há mais de 7 dias
    if (daysStuck > 7) {
      const severity = getSeverity(daysStuck);
      
      const reason = `Em andamento há ${daysStuck} ${daysStuck === 1 ? 'dia' : 'dias'} sem atualização`;
      

      
      bottlenecks.push({
        stage: stage.id,
        stageName: stage.name,
        severity,
        daysStuck,
        reason,
        responsiblePerson: stage.data.responsible,
        status,
      });
    }
  }

  // Ordenar por severidade (high > medium > low) e depois por dias
  bottlenecks.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return b.daysStuck - a.daysStuck;
  });

  return bottlenecks;
}

/**
 * Identifica o gargalo PRINCIPAL (mais crítico)
 * Mantido para compatibilidade com código existente
 */
export function identifyBottleneck(project: ProjectV2): ProjectBottleneck {
  const bottlenecks = identifyBottlenecks(project);
  
  if (bottlenecks.length === 0) {
    return {
      stage: null,
      stageName: "Nenhum",
      severity: "none",
      daysStuck: 0,
      reason: "Projeto fluindo normalmente",
    };
  }
  
  // Retorna o primeiro (mais crítico)
  const primary = bottlenecks[0];
  return {
    stage: primary.stage,
    stageName: primary.stageName,
    severity: primary.severity,
    daysStuck: primary.daysStuck,
    reason: primary.reason,
    responsiblePerson: primary.responsiblePerson,
  };
}

/**
 * Retorna a cor apropriada para o indicador de gargalo
 */
export function getBottleneckColor(severity: ProjectBottleneck["severity"]): string {
  switch (severity) {
    case "high":
      return "text-red-600 dark:text-red-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "low":
      return "text-blue-600 dark:text-blue-400";
    default:
      return "text-green-600 dark:text-green-400";
  }
}

/**
 * Retorna o ícone apropriado para o indicador de gargalo
 */
export function getBottleneckIcon(severity: ProjectBottleneck["severity"]): string {
  switch (severity) {
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "🔵";
    default:
      return "🟢";
  }
}
