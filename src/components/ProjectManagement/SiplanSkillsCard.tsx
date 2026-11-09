import React, { useState } from 'react';
import { ProjectV2 } from '@/types/ProjectV2';
import { useSiplanSkillsIntegration } from '@/hooks/useSiplanSkillsIntegration';
import { usePermissions } from '@/hooks/usePermissions';
import { SiplanSkillsActivityIndicator } from './SiplanSkillsActivityIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  GraduationCap,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Pencil,
  X,
  ExternalLink,
  ShieldCheck,
  Calendar,
  KeyRound,
  UserCheck,
  Layers,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeSkillsUsername } from '@/utils/skills-username-generator';

interface SiplanSkillsCardProps {
  project: ProjectV2;
}

function formatExpirationBr(isoDate?: string | null): string {
  if (!isoDate) return '-';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return isoDate;
}

function formatLastActivityBr(isoDate?: string | null): string | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function SiplanSkillsCard({ project }: SiplanSkillsCardProps) {
  const { canEditProjects } = usePermissions();
  const {
    isEligible,
    isLoadingLiveStatus,
    refetchLiveStatus,
    siblingProjects,
    orionSystems,
    credentials,
    isProvisioned,
    needsSync,
    parsedSuggestion,
    provisionSkillsAccess,
    isProvisioning,
    updateSkillsUsername,
    isUpdatingUsername,
    copyCredentials,
  } = useSiplanSkillsIntegration(project);

  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'token' | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');

  if (!isEligible) {
    return null;
  }

  const handleCopyFull = async () => {
    const ok = await copyCredentials();
    if (ok) {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  const handleCopySingleField = async (value: string, field: 'username' | 'token') => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast({
      title: field === 'username' ? 'Usuário copiado!' : 'Token copiado!',
      description: value,
    });
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleStartEditUsername = () => {
    setUsernameDraft(credentials?.username || parsedSuggestion.username);
    setIsEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    const cleaned = sanitizeSkillsUsername(usernameDraft);
    if (!cleaned || cleaned === credentials?.username) {
      setIsEditingUsername(false);
      return;
    }
    try {
      await updateSkillsUsername(cleaned);
      setIsEditingUsername(false);
    } catch {
      // Erro tratado pelo hook
    }
  };

  const handleProvisionOrSync = async () => {
    if (!canEditProjects) return;
    try {
      await provisionSkillsAccess(undefined);
    } catch {
      // Erro tratado pelo hook
    }
  };

  const hasMultipleProjects = siblingProjects.length > 1;
  const releasedProductsList =
    credentials?.productsReleased && credentials.productsReleased.length > 0
      ? credentials.productsReleased
      : parsedSuggestion.expectedProducts;

  const exactLastActivityFormatted = formatLastActivityBr(credentials?.lastActivity);

  const clientDisplayName =
    parsedSuggestion.cleanCartorioName || project.clientName || credentials?.cartorioNome || '';

  return (
    <div
      id="siplan-skills-access-card"
      data-testid="siplan-skills-access-card"
      className={cn(
        'w-full min-w-0 rounded-xl border p-3.5 shadow-sm transition-all sm:p-4',
        isProvisioned && !needsSync
          ? 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.06] via-card to-card'
          : isProvisioned && needsSync
            ? 'border-amber-500/45 bg-gradient-to-br from-amber-500/[0.08] via-card to-card'
            : 'border-primary/25 bg-gradient-to-br from-primary/[0.05] via-card to-card'
      )}
    >
      {/* Cabeçalho do Card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                isProvisioned && !needsSync
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : isProvisioned && needsSync
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'border-primary/30 bg-primary/10 text-primary'
              )}
            >
              <GraduationCap className="h-4 w-4" />
            </div>

            <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              Siplan Skills — Acesso do Cartório
            </h3>

            {isProvisioned && !needsSync ? (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
              >
                <ShieldCheck className="mr-1 h-3 w-3" />
                Ativo no Skills
              </Badge>
            ) : isProvisioned && needsSync ? (
              <Badge
                variant="outline"
                className="border-amber-500/50 bg-amber-500/15 text-[11px] font-bold text-amber-800 dark:text-amber-300"
              >
                Sincronização de Sistema Pendente
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary"
              >
                Pronto para Criação Automática
              </Badge>
            )}

            {isProvisioned && credentials && (
              <SiplanSkillsActivityIndicator
                lastActivity={credentials.lastActivity}
                sessionIsActive={credentials.sessionIsActive}
              />
            )}

            {hasMultipleProjects && (
              <Badge
                variant="secondary"
                className="gap-1 text-[11px] font-semibold"
                title={`Este cartório possui ${siblingProjects.length} projetos Orion vinculados no HUB (${orionSystems.join(', ')}). O acesso do Skills é unificado entre eles.`}
              >
                <Layers className="h-3 w-3 text-primary" />
                Unificado: {orionSystems.join(' + ')}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {isProvisioned
              ? credentials?.observacoes || parsedSuggestion.expectedObservacoes
              : `Cria automaticamente o cartório, usuário padronizado e libera os conteúdos de ${orionSystems.join(' e ')} no Siplan Skills.`}
          </p>
        </div>

        {/* Botões Principais de Ação */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isProvisioned && credentials ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handleCopyFull}
                title={`Copia:\nhttps://skills.siplan.com.br/\n\n${clientDisplayName}\nUsuário: ${credentials.username}\nToken de Acesso: ${credentials.loginToken}`}
                className="h-9 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {copiedFull ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Acesso Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar Acesso Completo
                  </>
                )}
              </Button>

              {canEditProjects && (
                <Button
                  type="button"
                  size="sm"
                  variant={needsSync ? 'default' : 'outline'}
                  disabled={isProvisioning}
                  onClick={handleProvisionOrSync}
                  className="h-9 gap-1.5 text-xs font-semibold"
                  title="Sincroniza os sistemas Orion deste cartório e renova/valida as permissões no banco do Siplan Skills"
                >
                  {isProvisioning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {needsSync ? 'Sincronizar Novo Sistema' : 'Ressincronizar'}
                </Button>
              )}

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => window.open(credentials.portalUrl || 'https://skills.siplan.com.br/', '_blank')}
                title="Abrir portal Siplan Skills em nova aba"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          ) : (
            canEditProjects && (
              <Button
                type="button"
                size="sm"
                disabled={isProvisioning}
                onClick={handleProvisionOrSync}
                className="h-9 w-full gap-1.5 text-xs font-bold sm:w-auto"
              >
                {isProvisioning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Criando e liberando conteúdos...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Criar Usuário e Gerar Acesso Skills
                  </>
                )}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Corpo com Credenciais ou Prévia Automática */}
      {isProvisioned && credentials ? (
        <div className="mt-3.5 space-y-3 border-t border-border/60 pt-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Bloco 1: Usuário */}
            <div className="flex flex-col justify-between rounded-lg border bg-background/80 p-2.5">
              <div className="flex items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Usuário (Login)
                </span>
                {canEditProjects && !isEditingUsername && (
                  <button
                    type="button"
                    onClick={handleStartEditUsername}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Editar nome de usuário no Siplan Skills"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                )}
              </div>

              {isEditingUsername ? (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Input
                    value={usernameDraft}
                    onChange={(e) => setUsernameDraft(sanitizeSkillsUsername(e.target.value))}
                    placeholder="ex: 01tnpt.araraquara"
                    className="h-8 font-mono text-xs"
                    disabled={isUpdatingUsername}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveUsername();
                      } else if (e.key === 'Escape') {
                        setIsEditingUsername(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={isUpdatingUsername}
                    onClick={handleSaveUsername}
                    title="Salvar novo nome de usuário"
                  >
                    {isUpdatingUsername ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    disabled={isUpdatingUsername}
                    onClick={() => setIsEditingUsername(false)}
                    title="Cancelar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm font-extrabold text-foreground">
                    {credentials.username}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopySingleField(credentials.username, 'username')}
                    title="Copiar apenas o usuário"
                  >
                    {copiedField === 'username' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Bloco 2: Token de Acesso */}
            <div className="flex flex-col justify-between rounded-lg border bg-background/80 p-2.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                Token de Acesso
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm font-extrabold text-foreground">
                  {credentials.loginToken}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopySingleField(credentials.loginToken, 'token')}
                  title="Copiar apenas o token de acesso"
                >
                  {copiedField === 'token' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Bloco 3: Farol de Atividade (Sincronizado com Siplan Skills) */}
            <div className="flex flex-col justify-between rounded-lg border bg-background/80 p-2.5">
              <div className="flex items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  Farol de Atividade
                </span>
                <button
                  type="button"
                  onClick={() => refetchLiveStatus()}
                  disabled={isLoadingLiveStatus}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  title="Atualizar status de atividade em tempo real no Siplan Skills"
                >
                  <RefreshCw className={cn('h-3 w-3', isLoadingLiveStatus && 'animate-spin')} />
                </button>
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <SiplanSkillsActivityIndicator
                    lastActivity={credentials.lastActivity}
                    sessionIsActive={credentials.sessionIsActive}
                    compact
                  />
                </div>
                <span className="truncate text-[11px] text-muted-foreground">
                  {exactLastActivityFormatted
                    ? `Último: ${exactLastActivityFormatted}`
                    : 'Sem registro de login'}
                </span>
              </div>
            </div>

            {/* Bloco 4: Expiração e UF */}
            <div className="flex flex-col justify-between rounded-lg border bg-background/80 p-2.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Expiração do Acesso
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">
                  {formatExpirationBr(credentials.expirationDate)}
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  UF: SP
                </Badge>
              </div>
            </div>
          </div>

          {/* Conteúdos liberados na Etapa 3 */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="mr-1 text-[11px] font-semibold text-muted-foreground">
              Conteúdos Liberados:
            </span>
            {releasedProductsList.map((prod) => (
              <Badge
                key={prod.produto_id}
                variant="outline"
                className="bg-background/90 text-[11px] font-medium text-foreground"
              >
                <span className="mr-1 text-muted-foreground">{prod.sistema_nome}:</span>
                <span className="font-semibold">{prod.produto_nome}</span>
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-2.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground">
            <span>
              Usuário automático:{' '}
              <strong className="font-mono text-foreground">{parsedSuggestion.username}</strong>
            </span>
            <span>
              Validade automática:{' '}
              <strong className="text-foreground">
                {formatExpirationBr(parsedSuggestion.defaultExpirationDate)}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {parsedSuggestion.expectedProducts.map((prod) => (
              <Badge
                key={prod.produto_id}
                variant="outline"
                className="bg-background/70 text-[10px] font-medium"
              >
                {prod.produto_nome}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
