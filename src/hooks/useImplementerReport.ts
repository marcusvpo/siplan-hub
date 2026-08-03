import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsV2 } from "./useProjectsV2";
import type { ProjectV2 } from "@/types/ProjectV2";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ImplementerProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string | null;
}

export interface DetailedInvolvement {
  project: ProjectV2;
  roles: string[];
  isPhase1Lead: boolean;
  involvedStagesText: string;
}

export interface ImplementerInvolvement {
  project: ProjectV2;
  roles: string[];
  isPrimaryImplementer: boolean;
}

export interface Phase1ProjectDetail {
  project: ProjectV2;
  periodText: string;
  presentialDaysText: string;
  statusF1Text: string;
  globalStatusText: string;
  leaderName: string;
  systemType: string;
  implantationType: string;
  observationsBullets: string[];
  roles: string[];
}

export interface StageTimeEntry {
  stage: string;
  label: string;
  avgDays: number;
  benchmarkDays: number;
  count: number;
}

export interface StageRadarEntry {
  subject: string;
  count: number;
  fullMark: number;
}

export interface PhaseMetrics {
  avgDays: number;
  confirmedCount: number;
  totalCount: number;
  confirmedRate: number;
  totalParticipants: number;
  switchTypes: Record<string, number>;
  trainingTypes: Record<string, number>;
}

export interface ImplementerReportData {
  // Profile
  implementer: ImplementerProfile | null;

  // Global counts matching PDF reference
  totalBaseProjects: number;
  totalInvolvedProjectsCount: number;
  totalPhase1ProjectsCount: number;
  phase1CompletedCount: number;
  phase1InProgressCount: number;
  phase1CompletionRate: number;
  phase1SummaryStr: string;

  // Primary Phase 1 projects & details
  phase1ProjectsDetails: Phase1ProjectDetail[];
  allInvolvedProjects: DetailedInvolvement[];
  involvements: ImplementerInvolvement[]; // Alias for backwards compatibility

  // Traditional KPIs & metrics
  totalImplementations: number;
  activeImplementations: number;
  completionRate: number;
  avgImplementationDays: number;
  avgSatisfaction: string;

  // Distributions
  statusDistribution: Record<string, number>;
  healthDistribution: Record<string, number>;
  systemTypeDistribution: Record<string, number>;
  implantationTypeDistribution: Record<string, number>;

  // Radar & Advanced Charts
  stageRadarData: StageRadarEntry[];

  // Timeline
  projectsByMonth: { month: string; count: number }[];

  // Stage analysis
  stageTimeAnalysis: StageTimeEntry[];

  // Phase metrics
  phase1Metrics: PhaseMetrics;
  phase2Metrics: PhaseMetrics;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const daysBetween = (start?: Date | string | null, end?: Date | string | null): number | null => {
  if (!start || !end) return null;
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  return Math.max(0, Math.ceil(Math.abs(e.getTime() - s.getTime()) / 86400000));
};

const safeAvg = (nums: (number | null)[]): number => {
  const valid = nums.filter((n): n is number => n !== null && !isNaN(n));
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
};

const satisfactionMap: Record<string, number> = {
  very_satisfied: 4,
  satisfied: 3,
  neutral: 2,
  dissatisfied: 1,
};

const satisfactionLabels: Record<string, string> = {
  very_satisfied: "Muito Satisfeito",
  satisfied: "Satisfeito",
  neutral: "Neutro",
  dissatisfied: "Insatisfeito",
};

const implantationTypeLabels: Record<string, string> = {
  new: "Novo Cliente (new)",
  migration_siplan: "Migração Siplan (migration_siplan)",
  migration_competitor: "Migração Concorrente",
  upgrade: "Upgrade",
};

// EXCLUDING Infraestrutura and Prep. Ambiente per implementer role boundaries
const stageLabels: Record<string, string> = {
  adherence: "Aderência",
  conversion: "Conversão",
  implementation: "Implementação",
  post: "Pós-Implantação",
};

const fmtDateShort = (d?: Date | string | null): string => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Dynamic Bullet Generation per Project
const generateProjectBullets = (project: ProjectV2, name: string): string[] => {
  const bullets: string[] = [];
  const ph1 = project.stages?.implementation?.phase1;
  const conv = project.stages?.conversion;
  const post = project.stages?.post;
  const implTypeStr = implantationTypeLabels[project.implantationType] || project.implantationType;

  // 1. Core Scope Bullet
  bullets.push(
    `Implantação Presencial da Fase 1: Condução da virada técnica do sistema ${project.systemType} no ${project.clientName} (${implTypeStr}).`
  );

  // 2. Training / Capacity Building Bullet
  if (ph1?.trainingType || ph1?.participantsCount) {
    const loc = ph1.trainingLocation ? ` (${ph1.trainingLocation})` : "";
    const countStr = ph1.participantsCount ? ` com ${ph1.participantsCount} colaboradores` : "";
    bullets.push(
      `Capacitação Operacional: Treinamento ${ph1.trainingType || "presencial"}${loc}${countStr} nos módulos de ${project.specialty || "Notas, Protesto e Registros"}.`
    );
  } else {
    bullets.push(
      `Capacitação em Módulos: Treinamento prático da equipe de escreventes nos fluxos operacionais do ${project.systemType}.`
    );
  }

  // 3. Switchover / Virada Bullet
  if (ph1?.switchType || ph1?.switchStartTime) {
    const times = ph1.switchStartTime ? ` (${ph1.switchStartTime} - ${ph1.switchEndTime || "conclusão"})` : "";
    bullets.push(
      `Virada de Sistema: Virada ${ph1.switchType || "presencial"}${times} realizada com acompanhamento em campo na abertura do cartório.`
    );
  } else {
    bullets.push(
      `Acompanhamento da Virada: Suporte presencial durante a entrada em produção e lavratura dos primeiros atos.`
    );
  }

  // 4. Data Homologation or Specific Post Handover
  if (conv?.dataVolumeGb) {
    bullets.push(
      `Homologação da Conversão: Suporte na conferência da base convertida de dados (${conv.dataVolumeGb} GB).`
    );
  } else if (post?.responsible && post.responsible !== name) {
    bullets.push(
      `Passagem de Bastão: Implantação presencial entregue com sucesso à equipe de pós-implantação (${post.responsible}).`
    );
  } else {
    bullets.push(
      `Conclusão e Entrega: Implantação presencial concluída e homologada com sucesso em produção.`
    );
  }

  // 5. Client Feedback if available
  if (ph1?.clientFeedback) {
    bullets.push(`Feedback do Cliente: "${ph1.clientFeedback}".`);
  }

  // 6. Custom Observations if set
  if (ph1?.observations) {
    const cleanObs = ph1.observations.replace(/<[^>]*>?/gm, "").trim();
    if (cleanObs && !bullets.includes(cleanObs)) {
      bullets.push(`Observações Técnicas: ${cleanObs}`);
    }
  }

  return bullets;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useImplementerReport(implementerId: string | null) {
  const { projects, isLoading: projectsLoading } = useProjectsV2();

  // Fetch implementers from profiles
  const {
    data: implementers,
    isLoading: implementersLoading,
  } = useQuery({
    queryKey: ["implementerProfiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, team")
        .in("team", ["implementation", "implementer"])
        .order("full_name");

      if (error) throw error;

      return (data || []).map((p) => ({
        id: p.id,
        name: p.full_name || p.email || "Sem nome",
        email: p.email || "",
        role: p.role || "user",
        team: p.team,
      })) as ImplementerProfile[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const selectedImplementer = useMemo(
    () => implementers?.find((i) => i.id === implementerId) ?? null,
    [implementers, implementerId]
  );

  // ── Compute report data ──────────────────────────────────────────────────

  const reportData = useMemo((): ImplementerReportData => {
    const allProjects = (projects || []).filter((p) => p.systemType !== "Modelos TN");
    const totalBaseProjects = allProjects.length;

    const empty: ImplementerReportData = {
      implementer: selectedImplementer,
      totalBaseProjects,
      totalInvolvedProjectsCount: 0,
      totalPhase1ProjectsCount: 0,
      phase1CompletedCount: 0,
      phase1InProgressCount: 0,
      phase1CompletionRate: 0,
      phase1SummaryStr: "0 Concluídos / 0 Andam.",
      phase1ProjectsDetails: [],
      allInvolvedProjects: [],
      involvements: [],
      totalImplementations: 0,
      activeImplementations: 0,
      completionRate: 0,
      avgImplementationDays: 0,
      avgSatisfaction: "—",
      statusDistribution: {},
      healthDistribution: {},
      systemTypeDistribution: {},
      implantationTypeDistribution: {},
      stageRadarData: [],
      projectsByMonth: [],
      stageTimeAnalysis: [],
      phase1Metrics: {
        avgDays: 0,
        confirmedCount: 0,
        totalCount: 0,
        confirmedRate: 0,
        totalParticipants: 0,
        switchTypes: {},
        trainingTypes: {},
      },
      phase2Metrics: {
        avgDays: 0,
        confirmedCount: 0,
        totalCount: 0,
        confirmedRate: 0,
        totalParticipants: 0,
        switchTypes: {},
        trainingTypes: {},
      },
    };

    if (!selectedImplementer || !allProjects.length) return empty;

    const name = selectedImplementer.name;

    // ── Build involvements ──────────────────────────────────────────────────

    const allInvolvedProjects: DetailedInvolvement[] = [];
    const involvements: ImplementerInvolvement[] = [];
    const phase1ProjectsDetails: Phase1ProjectDetail[] = [];

    // ONLY include stages where implementers actually work (EXCLUDING Infra & Prep. Ambiente)
    const stageRoleCounts: Record<string, number> = {
      Aderência: 0,
      "Homologação Conversão": 0,
      "Implantação Fase 1": 0,
      "Implantação Fase 2": 0,
      "Pós-Implantação": 0,
    };

    for (const project of allProjects) {
      const roles: string[] = [];
      const involvedStagesList: string[] = [];
      let isPhase1Lead = false;

      // Primary Phase 1 lead checks
      if (project.responsibleImplementation === name || project.stages?.implementation?.phase1?.responsible === name) {
        roles.push("Implantação Fase 1 (Treinamento & Virada)");
        involvedStagesList.push("Implantação Fase 1 (Treinamento & Virada)");
        isPhase1Lead = true;
        stageRoleCounts["Implantação Fase 1"]++;
      }

      if (project.stages?.implementation?.phase2?.responsible === name) {
        roles.push("Implantação Fase 2 (Retorno)");
        involvedStagesList.push("Implantação Fase 2");
        stageRoleCounts["Implantação Fase 2"]++;
      }
      if (project.responsibleAdherence === name) {
        roles.push("Aderência");
        involvedStagesList.push("Aderência");
        stageRoleCounts["Aderência"]++;
      }
      if (project.responsibleConversion === name) {
        roles.push("Homologação Conversão");
        involvedStagesList.push("Homologação Conversão");
        stageRoleCounts["Homologação Conversão"]++;
      }
      if (project.responsiblePost === name) {
        roles.push("Pós-Implantação");
        involvedStagesList.push("Pós-Implantação");
        stageRoleCounts["Pós-Implantação"]++;
      }
      if (project.projectLeader === name) {
        roles.push("Líder do Projeto");
      }

      if (roles.length > 0) {
        allInvolvedProjects.push({
          project,
          roles,
          isPhase1Lead,
          involvedStagesText: involvedStagesList.join(", ") || "Atuação Geral",
        });

        involvements.push({
          project,
          roles,
          isPrimaryImplementer: isPhase1Lead,
        });
      }

      // If Phase 1 Lead, build detailed ficha with dynamic real bullets
      if (isPhase1Lead) {
        const ph1 = project.stages?.implementation?.phase1;
        const startDate = ph1?.trainingStartDate || ph1?.startDate || project.stages?.implementation?.startDate;
        const endDate = ph1?.trainingEndDate || ph1?.endDate || project.stages?.implementation?.endDate;
        const days = daysBetween(startDate, endDate);

        let periodText = "Designado / Planejado";
        let presentialDaysText = "Planejado / Em Andamento";
        if (startDate && endDate) {
          const sStr = fmtDateShort(startDate);
          const eStr = fmtDateShort(endDate);
          if (sStr && eStr) {
            periodText = `${sStr} a ${eStr}`;
          }
        }
        if (days !== null && days > 0) {
          presentialDaysText = `${days} dias presenciais`;
        }

        const isDone = ph1?.status === "done" || project.globalStatus === "done";
        const isDesignated = ph1?.status === "todo" || (!startDate && !endDate);
        const statusF1Text = isDone ? "Concluído" : isDesignated ? "Designado" : "Em Andamento";
        const globalStatusText = project.globalStatus === "done" ? "Concluído" : project.globalStatus === "blocked" ? "Bloqueado" : "Em Andam.";

        // Dynamic bullet generation
        const bullets = generateProjectBullets(project, name);

        phase1ProjectsDetails.push({
          project,
          periodText,
          presentialDaysText,
          statusF1Text,
          globalStatusText,
          leaderName: project.projectLeader || "Bruno Fernandes",
          systemType: project.systemType,
          implantationType: implantationTypeLabels[project.implantationType] || project.implantationType,
          observationsBullets: bullets,
          roles,
        });
      }
    }

    // Radar chart data (excluding Infra and Prep. Ambiente)
    const stageRadarData: StageRadarEntry[] = Object.entries(stageRoleCounts).map(([subject, count]) => ({
      subject,
      count,
      fullMark: Math.max(10, Math.max(...Object.values(stageRoleCounts)) + 2),
    }));

    // ── Global Counters ─────────────────────────────────────────────────────

    const totalInvolvedProjectsCount = allInvolvedProjects.length;
    const totalPhase1ProjectsCount = phase1ProjectsDetails.length;
    const phase1CompletedCount = phase1ProjectsDetails.filter((d) => d.statusF1Text === "Concluído" || d.globalStatusText === "Concluído").length;
    const phase1InProgressCount = totalPhase1ProjectsCount - phase1CompletedCount;
    const phase1CompletionRate = totalPhase1ProjectsCount > 0 ? Math.round((phase1CompletedCount / totalPhase1ProjectsCount) * 1000) / 10 : 0;
    const phase1SummaryStr = `${phase1CompletedCount} Concluídos / ${phase1InProgressCount} Andam.`;

    // ── Traditional KPIs ────────────────────────────────────────────────────

    const primaryProjects = phase1ProjectsDetails.map((d) => d.project);
    const totalImplementations = totalPhase1ProjectsCount;
    const activeImplementations = phase1InProgressCount;
    const completionRate = Math.round(phase1CompletionRate);

    const implDurations = primaryProjects
      .map((p) => daysBetween(p.stages?.implementation?.startDate, p.stages?.implementation?.endDate))
      .filter((d): d is number => d !== null);
    const avgImplementationDays = safeAvg(implDurations);

    // Satisfaction
    const satValues = primaryProjects
      .map((p) => p.stages?.post?.clientSatisfaction)
      .filter((s): s is string => !!s && s in satisfactionMap)
      .map((s) => satisfactionMap[s]);
    let avgSatisfaction = "—";
    if (satValues.length > 0) {
      const avg = satValues.reduce((a, b) => a + b, 0) / satValues.length;
      const closest = Object.entries(satisfactionMap).reduce((prev, [key, val]) =>
        Math.abs(val - avg) < Math.abs(prev[1] - avg) ? [key, val] : prev
      , ["neutral", 2] as [string, number]);
      avgSatisfaction = satisfactionLabels[closest[0]] || "—";
    }

    // ── Distributions ───────────────────────────────────────────────────────

    const statusDistribution: Record<string, number> = {};
    const healthDistribution: Record<string, number> = {};
    const systemTypeDistribution: Record<string, number> = {};
    const implantationTypeDistribution: Record<string, number> = {};

    for (const p of primaryProjects) {
      statusDistribution[p.globalStatus] = (statusDistribution[p.globalStatus] || 0) + 1;
      healthDistribution[p.healthScore] = (healthDistribution[p.healthScore] || 0) + 1;
      systemTypeDistribution[p.systemType] = (systemTypeDistribution[p.systemType] || 0) + 1;
      const implTypeLabel = implantationTypeLabels[p.implantationType] || p.implantationType;
      implantationTypeDistribution[implTypeLabel] = (implantationTypeDistribution[implTypeLabel] || 0) + 1;
    }

    // ── Projects by month ───────────────────────────────────────────────────

    const monthMap: Record<string, number> = {};
    for (const p of primaryProjects) {
      const d = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    }
    const projectsByMonth = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    // ── Stage time analysis (EXCLUDING infra & environment) ────────────────

    const stageKeys = ["adherence", "conversion", "implementation", "post"] as const;

    const stageTimeAnalysis: StageTimeEntry[] = stageKeys.map((stage) => {
      const implDays = primaryProjects
        .map((p) => {
          const s = p.stages?.[stage as keyof typeof p.stages];
          if (!s || typeof s !== "object") return null;
          return daysBetween((s as any).startDate, (s as any).endDate);
        })
        .filter((d): d is number => d !== null);

      const benchDays = allProjects
        .map((p) => {
          const s = p.stages?.[stage as keyof typeof p.stages];
          if (!s || typeof s !== "object") return null;
          return daysBetween((s as any).startDate, (s as any).endDate);
        })
        .filter((d): d is number => d !== null);

      return {
        stage,
        label: stageLabels[stage] || stage,
        avgDays: safeAvg(implDays),
        benchmarkDays: safeAvg(benchDays),
        count: implDays.length,
      };
    });

    // ── Phase metrics ───────────────────────────────────────────────────────

    const computePhaseMetrics = (phaseKey: "phase1" | "phase2"): PhaseMetrics => {
      const phases = primaryProjects
        .map((p) => p.stages?.implementation?.[phaseKey])
        .filter((ph): ph is NonNullable<typeof ph> => !!ph);

      const durations = phases
        .map((ph) => daysBetween(ph.startDate, ph.endDate))
        .filter((d): d is number => d !== null);

      const confirmedCount = phases.filter((ph) => ph.isConfirmed).length;
      const totalParticipants = phases.reduce((sum, ph) => sum + (ph.participantsCount || 0), 0);

      const switchTypes: Record<string, number> = {};
      const trainingTypes: Record<string, number> = {};
      for (const ph of phases) {
        if (ph.switchType) {
          switchTypes[ph.switchType] = (switchTypes[ph.switchType] || 0) + 1;
        }
        if (ph.trainingType) {
          trainingTypes[ph.trainingType] = (trainingTypes[ph.trainingType] || 0) + 1;
        }
      }

      return {
        avgDays: safeAvg(durations),
        confirmedCount,
        totalCount: phases.length,
        confirmedRate: phases.length > 0 ? Math.round((confirmedCount / phases.length) * 100) : 0,
        totalParticipants,
        switchTypes,
        trainingTypes,
      };
    };

    return {
      implementer: selectedImplementer,
      totalBaseProjects,
      totalInvolvedProjectsCount,
      totalPhase1ProjectsCount,
      phase1CompletedCount,
      phase1InProgressCount,
      phase1CompletionRate,
      phase1SummaryStr,
      phase1ProjectsDetails,
      allInvolvedProjects,
      involvements,
      totalImplementations,
      activeImplementations,
      completionRate,
      avgImplementationDays,
      avgSatisfaction,
      statusDistribution,
      healthDistribution,
      systemTypeDistribution,
      implantationTypeDistribution,
      stageRadarData,
      projectsByMonth,
      stageTimeAnalysis,
      phase1Metrics: computePhaseMetrics("phase1"),
      phase2Metrics: computePhaseMetrics("phase2"),
    };
  }, [selectedImplementer, projects]);

  return {
    implementers: implementers || [],
    isLoading: projectsLoading || implementersLoading,
    reportData,
  };
}
