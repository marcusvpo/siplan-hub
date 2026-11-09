import React from 'react';
import { Circle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export type SkillsActivityState = {
  dotClassName: string;
  badgeClassName: string;
  label: string;
  exactFormatted: string | null;
  isOnline: boolean;
};

const formatRelativeElapsed = (elapsedMs: number): string => {
  const minutes = Math.max(1, Math.floor(elapsedMs / (60 * 1000)));
  if (minutes < 60) {
    return `há ${minutes} min`;
  }

  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
  if (hours < 24) {
    return `há ${hours} h`;
  }

  const days = Math.max(1, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
};

function resolveSkillsActivityState(
  lastActivity?: string | null,
  sessionIsActive?: boolean
): SkillsActivityState {
  if (!lastActivity) {
    return {
      dotClassName: 'text-muted-foreground/60 fill-muted-foreground/60',
      badgeClassName: 'border-border/60 bg-muted/40 text-muted-foreground',
      label: 'Nunca acessou',
      exactFormatted: null,
      isOnline: false,
    };
  }

  const lastDate = new Date(lastActivity);
  const lastTimestamp = lastDate.getTime();
  if (Number.isNaN(lastTimestamp)) {
    return {
      dotClassName: 'text-muted-foreground/60 fill-muted-foreground/60',
      badgeClassName: 'border-border/60 bg-muted/40 text-muted-foreground',
      label: 'Nunca acessou',
      exactFormatted: null,
      isOnline: false,
    };
  }

  const exactFormatted = lastDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const elapsedMs = Date.now() - lastTimestamp;

  if (elapsedMs >= 0 && elapsedMs < ONLINE_THRESHOLD_MS) {
    return {
      dotClassName: 'text-emerald-500 fill-emerald-500 animate-pulse',
      badgeClassName:
        'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      label: 'Online',
      exactFormatted,
      isOnline: true,
    };
  }

  // Caso a sessão tenha sido marcada ativa há menos de 2 min no relógio do banco (compensação de fuso/clock)
  if (sessionIsActive && Math.abs(elapsedMs) < 5 * 60 * 1000 && elapsedMs < ONLINE_THRESHOLD_MS) {
    return {
      dotClassName: 'text-emerald-500 fill-emerald-500 animate-pulse',
      badgeClassName:
        'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      label: 'Online',
      exactFormatted,
      isOnline: true,
    };
  }

  const safeElapsedMs = Math.max(elapsedMs, ONLINE_THRESHOLD_MS);
  const label = formatRelativeElapsed(safeElapsedMs);

  if (safeElapsedMs < FIVE_DAYS_MS) {
    return {
      dotClassName: 'text-sky-500 fill-sky-500',
      badgeClassName: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
      label,
      exactFormatted,
      isOnline: false,
    };
  }

  if (safeElapsedMs < FOURTEEN_DAYS_MS) {
    return {
      dotClassName: 'text-amber-500 fill-amber-500',
      badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      label,
      exactFormatted,
      isOnline: false,
    };
  }

  return {
    dotClassName: 'text-rose-500 fill-rose-500',
    badgeClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    label,
    exactFormatted,
    isOnline: false,
  };
}

interface SiplanSkillsActivityIndicatorProps {
  lastActivity?: string | null;
  sessionIsActive?: boolean;
  showExactDateInline?: boolean;
  compact?: boolean;
  className?: string;
}

export const SiplanSkillsActivityIndicator: React.FC<SiplanSkillsActivityIndicatorProps> = ({
  lastActivity,
  sessionIsActive = false,
  showExactDateInline = false,
  compact = false,
  className,
}) => {
  const status = resolveSkillsActivityState(lastActivity, sessionIsActive);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
              compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
              status.badgeClassName,
              className
            )}
          >
            <Circle className={cn('h-2 w-2 shrink-0', status.dotClassName)} />
            <span>{status.label}</span>
            {showExactDateInline && status.exactFormatted && (
              <span className="hidden sm:inline text-[11px] opacity-80 font-normal">
                • {status.exactFormatted}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5">
            <p className="font-semibold">
              Farol de Atividade Siplan Skills: {status.label}
            </p>
            <p className="text-muted-foreground">
              {status.exactFormatted
                ? `Último acesso: ${status.exactFormatted}`
                : 'Nenhum acesso registrado até o momento'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
