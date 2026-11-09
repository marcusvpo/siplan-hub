import React, { useState } from 'react';
import { ProjectV2 } from '@/types/ProjectV2';
import { useSiplanSkillsIntegration } from '@/hooks/useSiplanSkillsIntegration';
import { SiplanSkillsActivityIndicator } from './SiplanSkillsActivityIndicator';
import { SiplanSkillsCard } from './SiplanSkillsCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Copy, Check, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SiplanSkillsHeaderButtonProps {
  project?: ProjectV2 | null;
  onNavigateToCard?: () => void;
  className?: string;
}

/**
 * Botão Siplan Skills no cabeçalho do modal de projeto, estilizado com o mesmo
 * design e animação Uiverse pulsante do OrionAdminAnimatedButton, mas com paleta
 * exclusiva (Indigo quando ativo/provisionado, Orange quando pendente/sem acesso),
 * acompanhado do Farol de Atividade e botão rápido de cópia.
 * Ao clicar, abre o popup/modal dedicado com toda a seção "Siplan Skills — Acesso do Cartório".
 */
export function SiplanSkillsHeaderButton({
  project,
  className,
}: SiplanSkillsHeaderButtonProps) {
  const {
    isEligible,
    credentials,
    isProvisioned,
    needsSync,
    parsedSuggestion,
    copyCredentials,
  } = useSiplanSkillsIntegration(project);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isEligible || !project?.id) {
    return null;
  }

  const isHealthyProvisioned = Boolean(isProvisioned && credentials && !needsSync);

  const handleCopyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyCredentials();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buttonLabel =
    isProvisioned && credentials
      ? needsSync
        ? `Skills: Sincronizar (${credentials.username})`
        : `Skills: ${credentials.username}`
      : 'Skills: Sem Acesso';

  const buttonTooltip =
    isProvisioned && credentials
      ? needsSync
        ? `Novo sistema Orion detectado para ${credentials.username}. Clique para abrir o painel do Siplan Skills e sincronizar.`
        : `Siplan Skills ativo (${credentials.username}). Clique para abrir os detalhes e credenciais do cartório.`
      : `Siplan Skills pendente (sugestão: ${parsedSuggestion.username}). Clique para abrir e criar o acesso automático.`;

  return (
    <>
      <div className={cn('inline-flex flex-wrap items-center gap-1.5 shrink-0', className)}>
        {/* Botão Animado Uiverse (mesma arquitetura e animação pulsante do OrionAdminAnimatedButton, cor Indigo / Orange) */}
        <div className="relative inline-flex items-center shrink-0">
          {!isHealthyProvisioned ? (
            <>
              <span className="absolute -inset-1 rounded-full bg-orange-500/30 animate-pulse pointer-events-none" />
              <span className="absolute -inset-1.5 rounded-full border-2 border-orange-500/40 animate-ping pointer-events-none opacity-40 [animation-duration:2.5s]" />
            </>
          ) : (
            <span className="absolute -inset-0.5 rounded-full bg-indigo-500/20 animate-pulse pointer-events-none" />
          )}

          <button
            type="button"
            onClick={() => setIsPopupOpen(true)}
            title={buttonTooltip}
            data-testid="siplan-skills-header-trigger"
            className={cn(
              'group relative flex items-center justify-center gap-1 h-8 px-6 sm:px-7',
              'rounded-full text-[11px] font-bold tracking-wide cursor-pointer overflow-hidden select-none',
              'transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-95',
              isHealthyProvisioned
                ? 'text-indigo-600 dark:text-indigo-400 shadow-[0_0_0_2px_rgba(99,102,241,0.85)] hover:shadow-[0_0_0_12px_transparent] active:shadow-[0_0_0_4px_rgba(99,102,241,0.95)]'
                : 'text-orange-600 dark:text-orange-400 shadow-[0_0_0_2px_rgba(249,115,22,0.85)] hover:shadow-[0_0_0_12px_transparent] active:shadow-[0_0_0_4px_rgba(249,115,22,0.95)]',
              'hover:rounded-[10px]'
            )}
          >
            {/* Círculo expansivo de fundo (.circle) */}
            <span
              className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full opacity-0 pointer-events-none',
                'transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'group-hover:w-80 group-hover:h-80 group-hover:opacity-100',
                isHealthyProvisioned
                  ? 'bg-indigo-600 dark:bg-indigo-500'
                  : 'bg-orange-600 dark:bg-orange-500'
              )}
            />

            {/* Seta 1 (.arr-1: visível na direita inicialmente, sai pela direita no hover) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={cn(
                'absolute right-2.5 w-3.5 h-3.5 z-10 pointer-events-none',
                'transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'group-hover:right-[-35%] group-hover:fill-white',
                isHealthyProvisioned
                  ? 'fill-indigo-600 dark:fill-indigo-400'
                  : 'fill-orange-600 dark:fill-orange-400'
              )}
            >
              <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
            </svg>

            {/* Seta 2 (.arr-2: escondida à esquerda inicialmente, entra no hover) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={cn(
                'absolute left-[-35%] w-3.5 h-3.5 z-10 pointer-events-none',
                'transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'group-hover:left-2.5 group-hover:fill-white',
                isHealthyProvisioned
                  ? 'fill-indigo-600 dark:fill-indigo-400'
                  : 'fill-orange-600 dark:fill-orange-400'
              )}
            >
              <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
            </svg>

            {/* Texto (.text: desloca no hover e troca de cor) */}
            <span
              className={cn(
                'relative z-10 transition-all duration-700 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                '-translate-x-1.5 group-hover:translate-x-1.5 group-hover:text-white font-extrabold',
                isHealthyProvisioned
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-orange-600 dark:text-orange-400'
              )}
            >
              {buttonLabel}
            </span>
          </button>
        </div>

        {/* Farol de Atividade + Botão rápido de Copiar quando já provisionado */}
        {isProvisioned && credentials && (
          <div className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 pl-1 pr-1 py-0.5">
            <SiplanSkillsActivityIndicator
              lastActivity={credentials.lastActivity}
              sessionIsActive={credentials.sessionIsActive}
              compact
            />
            <button
              type="button"
              onClick={handleCopyClick}
              title="Copiar credenciais completas do Siplan Skills no formato oficial"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-indigo-600 transition-colors hover:bg-indigo-500/20 dark:text-indigo-300"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal / Popup dedicado da seção Siplan Skills — Acesso do Cartório */}
      <Dialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b bg-muted/30 px-4 py-3 text-left sm:px-5">
            <div className="flex items-center gap-2 pr-8">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-bold sm:text-base">
                  Siplan Skills — {project.clientName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Gerenciamento automatizado de usuário, token de acesso, conteúdos liberados e farol de atividade.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            <SiplanSkillsCard project={project} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
