import React from 'react';
import { ProjectV2 } from '@/types/ProjectV2';
import { Badge } from '@/components/ui/badge';
import {
  extractSkillsCredentialsFromFields,
  useSkillsBatchActivity,
} from '@/hooks/useSiplanSkillsIntegration';
import { isEligibleSkillsSystemType } from '@/utils/skills-username-generator';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function computeCompactActivity(
  lastActivity?: string | null,
  sessionIsActive?: boolean
): {
  dotClass: string;
  shortLabel: string;
  fullTooltip: string;
} {
  if (!lastActivity) {
    return {
      dotClass: 'bg-slate-300',
      shortLabel: 'Nunca acessou',
      fullTooltip: 'Nenhum login registrado no Siplan Skills até o momento',
    };
  }

  const parsed = new Date(lastActivity);
  if (Number.isNaN(parsed.getTime())) {
    return {
      dotClass: 'bg-slate-300',
      shortLabel: 'Nunca acessou',
      fullTooltip: 'Nenhum login registrado no Siplan Skills até o momento',
    };
  }

  const exactBr = parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const elapsedMs = Date.now() - parsed.getTime();
  const isOnline = Boolean(sessionIsActive) && elapsedMs < ONLINE_THRESHOLD_MS;

  if (isOnline) {
    return {
      dotClass: 'bg-emerald-300 animate-ping',
      shortLabel: 'Online',
      fullTooltip: `Online agora no Siplan Skills (Última atividade: ${exactBr})`,
    };
  }

  const safeElapsed = Math.max(elapsedMs, ONLINE_THRESHOLD_MS);
  const minutes = Math.max(1, Math.floor(safeElapsed / (60 * 1000)));
  const hours = Math.floor(safeElapsed / (60 * 60 * 1000));
  const days = Math.max(1, Math.floor(safeElapsed / (24 * 60 * 60 * 1000)));

  const shortLabel =
    minutes < 60
      ? `há ${minutes}m`
      : hours < 24
        ? `há ${hours}h`
        : `há ${days}d`;

  if (safeElapsed < FIVE_DAYS_MS) {
    return {
      dotClass: 'bg-sky-300',
      shortLabel,
      fullTooltip: `Acesso recente (${shortLabel}) — Último login: ${exactBr}`,
    };
  }

  if (safeElapsed < FOURTEEN_DAYS_MS) {
    return {
      dotClass: 'bg-amber-300',
      shortLabel,
      fullTooltip: `Acesso moderado (${shortLabel}) — Último login: ${exactBr}`,
    };
  }

  return {
    dotClass: 'bg-rose-300',
    shortLabel,
    fullTooltip: `Inativo (${shortLabel}) — Último login: ${exactBr}`,
  };
}

interface SiplanSkillsCardBadgeProps {
  project: ProjectV2;
}

/**
 * Tag dinâmica do Siplan Skills exibida no canto superior direito dos cards em /projects.
 * Cores exclusivas para não conflitar com as demais tags existentes:
 * - Acesso Criado: Indigo (bg-indigo-600) + Farol de Atividade ao vivo
 * - Sem Acesso: Orange (bg-orange-600)
 */
export const SiplanSkillsCardBadge: React.FC<SiplanSkillsCardBadgeProps> = ({ project }) => {
  const isEligible = isEligibleSkillsSystemType(project.systemType);
  const { data: batchActivityMap } = useSkillsBatchActivity(isEligible);

  if (!isEligible) {
    return null;
  }

  const stored = extractSkillsCredentialsFromFields(project.customFields);

  if (!stored) {
    return (
      <Badge
        data-testid="project-card-skills-badge-pending"
        className="text-[9px] px-2 py-0.5 font-bold shadow-lg border-2 border-background bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/20 flex items-center gap-1"
        title="Siplan Skills: Acesso ainda não criado para este cartório. Abra o projeto e clique em 'Skills: Sem Acesso' no cabeçalho para criar automaticamente."
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 animate-pulse" />
        <span>Skills: Sem Acesso</span>
      </Badge>
    );
  }

  const liveRecord = batchActivityMap?.[stored.cartorioId];
  const effectiveLastActivity = liveRecord
    ? liveRecord.last_activity
    : stored.lastActivity;
  const effectiveIsActive = liveRecord
    ? liveRecord.session_is_active
    : stored.sessionIsActive;

  const activity = computeCompactActivity(effectiveLastActivity, effectiveIsActive);

  return (
    <Badge
      data-testid="project-card-skills-badge-active"
      className="text-[9px] px-2 py-0.5 font-bold shadow-lg border-2 border-background bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 flex items-center gap-1.5"
      title={`Siplan Skills Ativo — Usuário: ${stored.username} | ${activity.fullTooltip}`}
    >
      <GraduationCap className="w-2.5 h-2.5 shrink-0 text-indigo-100" />
      <span>Skills: {stored.username}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-0 text-[8.5px] font-semibold text-white">
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', activity.dotClass)} />
        <span>{activity.shortLabel}</span>
      </span>
    </Badge>
  );
};
