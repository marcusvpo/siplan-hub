import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ArrowDownUp,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Layers,
  MessageSquare,
  PauseCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Ticket,
  User,
  Users,
  X,
} from "lucide-react";

import { EllevoTicketLink } from "@/components/EllevoTicketLink";
import { statusBadgeClass } from "@/components/ProjectManagement/Chamado0800DetailDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ChamadoTramite,
  useProjectChamado0800,
} from "@/hooks/useChamados0800";
import { elapsedHours, formatSlaDuration, getOfficialSlaState, parseSlaDate } from "@/lib/tickets-sla";
import { cn } from "@/lib/utils";
import { ProjectV2 } from "@/types/ProjectV2";

interface Chamado0800TabProps {
  project: ProjectV2;
}

const DESCRIPTION_COLLAPSE_CHAR_LIMIT = 450;
const DESCRIPTION_COLLAPSE_LINE_LIMIT = 6;

function normalizeSearchText(value?: string | null): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateTimeBr(value?: string, withSeconds = false): string {
  if (!value) return "—";
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, withSeconds ? "dd/MM/yyyy HH:mm:ss" : "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      });
    }
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (!match) return value;

  const [, year, month, day, hour, minute, second] = match;
  if (!hour || !minute) return `${day}/${month}/${year}`;
  const secondsPart = withSeconds ? `:${second || "00"}` : "";
  return `${day}/${month}/${year} ${hour}:${minute}${secondsPart}`;
}

function formatSyncedAtBr(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function formatMinutesReadable(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  if (rounded < 60) return `${Math.max(1, rounded)} min`;
  const totalHours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (totalHours < 24) {
    return mins > 0 ? `${totalHours} h ${mins} min` : `${totalHours} h`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
}

function formatRemainingSla(minutes?: number): string {
  if (minutes === undefined || minutes === null || !Number.isFinite(minutes)) return "—";
  if (minutes < 0) return `Vencido há ${formatMinutesReadable(Math.abs(minutes))}`;
  if (minutes === 0) return "0 min";
  return formatMinutesReadable(minutes);
}

function formatOpenDuration(start?: string, end?: string): string {
  const startDate = parseSlaDate(start);
  if (!startDate) return "—";
  const endDate = end ? parseSlaDate(end, !end.includes("T")) : new Date();
  const hours = elapsedHours(startDate, endDate);
  if (hours === null) return "—";
  return formatSlaDuration(hours);
}

function getTramiteTimestampMs(tramite: ChamadoTramite): number {
  if (!tramite.dataTramite) return 0;
  const parsed = new Date(tramite.dataTramite).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDescriptionPreview(text: string): {
  preview: string;
  isTruncated: boolean;
} {
  const lines = text.split(/\r?\n/);
  const exceedsLines = lines.length > DESCRIPTION_COLLAPSE_LINE_LIMIT;
  const exceedsChars = text.length > DESCRIPTION_COLLAPSE_CHAR_LIMIT;
  if (!exceedsLines && !exceedsChars) {
    return { preview: text, isTruncated: false };
  }

  let candidate = exceedsLines
    ? lines.slice(0, DESCRIPTION_COLLAPSE_LINE_LIMIT).join("\n")
    : text;

  if (candidate.length > DESCRIPTION_COLLAPSE_CHAR_LIMIT) {
    candidate = candidate.slice(0, DESCRIPTION_COLLAPSE_CHAR_LIMIT).trimEnd();
  }

  return { preview: `${candidate}...`, isTruncated: true };
}

function Chamado0800Skeleton({ syncing }: { syncing: boolean }) {
  return (
    <div className="space-y-4 pt-2 w-full max-w-5xl mx-auto min-w-0" data-testid="chamado-0800-loading">
      {syncing && (
        <Alert className="border-primary/25 bg-primary/5">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <AlertTitle className="text-sm font-semibold">
            Sincronizando com o Ellevo 0800
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            Buscando metadados oficiais, SLA e histórico completo de trâmites via vm-worker...
          </AlertDescription>
        </Alert>
      )}
      <Card className="border border-border/60">
        <CardHeader className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="border border-border/60">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border/60">
        <CardHeader className="p-4 sm:p-5">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}

export function Chamado0800Tab({ project }: Chamado0800TabProps) {
  const {
    ticketNumber,
    hasValidTicket,
    chamado,
    tramites,
    isLoading,
    isTramitesLoading,
    error,
    syncing,
    syncError,
    syncNow,
  } = useProjectChamado0800(project.ticketNumber);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [tramiteSearch, setTramiteSearch] = useState("");
  const [tramiteSortOrder, setTramiteSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    setIsDescriptionExpanded(false);
    setTramiteSearch("");
    setTramiteSortOrder("desc");
  }, [ticketNumber]);

  const syncedAtLabel = useMemo(() => formatSyncedAtBr(chamado?.syncedAt), [chamado?.syncedAt]);

  const slaState = useMemo(() => {
    if (!chamado) return null;
    return getOfficialSlaState(chamado);
  }, [chamado]);

  const descriptionContent = useMemo(() => {
    const raw = (chamado?.descricao || "").trim();
    if (!raw) return null;
    const { preview, isTruncated } = getDescriptionPreview(raw);
    return {
      full: raw,
      preview,
      isTruncated,
    };
  }, [chamado?.descricao]);

  const filteredAndSortedTramites = useMemo(() => {
    const normalizedQuery = normalizeSearchText(tramiteSearch);

    const filtered = normalizedQuery
      ? tramites.filter((tramite) => {
          const haystack = normalizeSearchText(
            [
              tramite.descricao,
              tramite.responsavel,
              tramite.equipeResponsavel,
              tramite.atividade,
              tramite.numeroTramite != null ? String(tramite.numeroTramite) : "",
              String(tramite.sequenciaTramite),
            ]
              .filter(Boolean)
              .join(" ")
          );
          return haystack.includes(normalizedQuery);
        })
      : [...tramites];

    filtered.sort((a, b) => {
      const timeDiff = getTramiteTimestampMs(a) - getTramiteTimestampMs(b);
      if (timeDiff !== 0) {
        return tramiteSortOrder === "asc" ? timeDiff : -timeDiff;
      }
      const numA = a.numeroTramite ?? a.sequenciaTramite;
      const numB = b.numeroTramite ?? b.sequenciaTramite;
      return tramiteSortOrder === "asc" ? numA - numB : numB - numA;
    });

    return filtered;
  }, [tramites, tramiteSearch, tramiteSortOrder]);

  if (!hasValidTicket) {
    return (
      <div className="pt-2 w-full max-w-5xl mx-auto min-w-0">
        <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center rounded-xl bg-muted/25 border border-dashed border-border/70">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Ticket className="h-6 w-6" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
            Nenhum chamado 0800 vinculado
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
            Este projeto ainda não possui um número de chamado 0800 válido vinculado.
            Para visualizar os dados oficiais do Ellevo e o histórico de trâmites, preencha o número do chamado em{" "}
            <span className="font-semibold text-foreground">Editar Projeto</span>.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !chamado && tramites.length === 0) {
    return <Chamado0800Skeleton syncing={syncing} />;
  }

  if (error && !chamado) {
    return (
      <div className="space-y-4 pt-2 w-full max-w-5xl mx-auto min-w-0">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o chamado #{ticketNumber}</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs sm:text-sm">
              Ocorreu um erro ao consultar os dados no espelho do Ellevo 0800.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void syncNow()}
              disabled={syncing}
              className="w-full sm:w-auto shrink-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
              {syncing ? "Sincronizando..." : "Sincronizar com Ellevo 0800"}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!chamado) {
    if (syncing) {
      return <Chamado0800Skeleton syncing />;
    }

    return (
      <div className="space-y-4 pt-2 w-full max-w-5xl mx-auto min-w-0">
        {syncError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Falha na sincronização com o Ellevo 0800</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm break-words">
              {syncError}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border border-dashed border-border/70 bg-muted/20">
          <CardContent className="p-6 sm:p-10 flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Ticket className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Chamado</span>
                <EllevoTicketLink
                  ticketNumber={ticketNumber}
                  className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md"
                />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Chamado ainda não encontrado no espelho local
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                Este chamado ainda não foi importado da view do Ellevo para o HUB. Clique abaixo para buscar os dados completos e trâmites sob demanda.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
              Sincronizar com Ellevo 0800
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resolvedTicket = chamado.numeroChamado || ticketNumber;
  const hasAnySlaData = Boolean(
    chamado.slaPrimeiraRespostaPrevistaEm ||
      chamado.slaPrimeiraRespostaRealEm ||
      chamado.slaVencimentoEm ||
      chamado.slaTempoRestanteMinutos !== undefined ||
      chamado.slaVencimentoPausado ||
      chamado.slaVencimentoManual
  );

  const showSoftwareBadge =
    Boolean(chamado.software) &&
    chamado.software?.trim().toLowerCase() !== chamado.produto?.trim().toLowerCase();

  return (
    <div className="space-y-4 pt-2 w-full max-w-5xl mx-auto min-w-0 overflow-x-hidden">
      {/* Cabeçalho Oficial do Chamado */}
      <Card className="overflow-hidden border border-border/60 border-t-4 border-t-primary shadow-sm bg-card">
        <CardHeader className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                  <EllevoTicketLink ticketNumber={resolvedTicket} />
                </span>

                <Badge className={cn("pointer-events-none", statusBadgeClass(chamado.status))}>
                  {chamado.status || "Status não informado"}
                </Badge>

                {chamado.natureza && (
                  <Badge variant="secondary" className="pointer-events-none font-normal max-w-full break-words">
                    {chamado.natureza}
                  </Badge>
                )}

                {chamado.criticidade && (
                  <Badge variant="outline" className="pointer-events-none font-normal gap-1">
                    <ShieldAlert className="h-3 w-3 shrink-0" />
                    {chamado.criticidade}
                  </Badge>
                )}

                {chamado.produto && (
                  <Badge variant="outline" className="pointer-events-none font-normal gap-1">
                    <Layers className="h-3 w-3 shrink-0" />
                    {chamado.produto}
                  </Badge>
                )}

                {showSoftwareBadge && (
                  <Badge variant="outline" className="pointer-events-none font-normal gap-1">
                    <Tag className="h-3 w-3 shrink-0" />
                    {chamado.software}
                  </Badge>
                )}

                {chamado.tema && (
                  <Badge
                    variant="outline"
                    className="pointer-events-none font-normal gap-1 border-indigo-300/60 bg-indigo-50/70 text-indigo-700 dark:border-indigo-700/50 dark:bg-indigo-950/30 dark:text-indigo-300"
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    Tema IA: {chamado.tema}
                  </Badge>
                )}
              </div>

              <CardTitle className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug break-words">
                {chamado.titulo || "Chamado sem título"}
              </CardTitle>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void syncNow()}
                disabled={syncing}
                className="w-full sm:w-auto min-h-9"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5 shrink-0", syncing && "animate-spin")} />
                {syncing ? "Sincronizando..." : "Sincronizar com Ellevo 0800"}
              </Button>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3 shrink-0" />
                {syncedAtLabel
                  ? `Sincronizado em ${syncedAtLabel}`
                  : "Sincronização pendente"}
              </span>
            </div>
          </div>

          {syncError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">
                Erro ao sincronizar com o Ellevo 0800
              </AlertTitle>
              <AlertDescription className="text-xs break-words">
                {syncError}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
      </Card>

      {/* Grid de Metadados Oficiais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border border-border/60 bg-card/80">
          <CardContent className="p-3.5 sm:p-4 min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3 shrink-0 text-primary/80" />
              Serventia
            </p>
            <p className="text-sm font-medium text-foreground break-words">
              {chamado.nomeCliente || "—"}
            </p>
            {chamado.codigoCliente && (
              <p className="text-[11px] text-muted-foreground font-mono">
                Código: {chamado.codigoCliente}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="p-3.5 sm:p-4 min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3 shrink-0 text-primary/80" />
              Solicitante
            </p>
            <p className="text-sm font-medium text-foreground break-words">
              {chamado.solicitante || "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="p-3.5 sm:p-4 min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3 w-3 shrink-0 text-primary/80" />
              Equipe Responsável
            </p>
            <p className="text-sm font-medium text-foreground break-words">
              {chamado.equipeResponsavel || "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="p-3.5 sm:p-4 min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3 shrink-0 text-primary/80" />
              Analista Responsável
            </p>
            <p className="text-sm font-medium text-foreground break-words">
              {chamado.analistaResponsavel || "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="p-3.5 sm:p-4 min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarClock className="h-3 w-3 shrink-0 text-primary/80" />
              Data de Abertura
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatDateTimeBr(chamado.abertoEm || chamado.dataAbertura)}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80">
          <CardContent className="p-3.5 sm:p-4 min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock3 className="h-3 w-3 shrink-0 text-primary/80" />
              Encerramento &amp; Duração
            </p>
            <p className="text-sm font-medium text-foreground">
              {chamado.encerradoEm || chamado.dataEncerramento
                ? formatDateTimeBr(chamado.encerradoEm || chamado.dataEncerramento)
                : "Em aberto"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {chamado.encerradoEm || chamado.dataEncerramento
                ? "Duração: "
                : "Tempo em aberto: "}
              <span className="font-medium text-foreground/90">
                {formatOpenDuration(
                  chamado.abertoEm || chamado.dataAbertura,
                  chamado.encerradoEm || chamado.dataEncerramento
                )}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de SLA Oficial */}
      {hasAnySlaData && slaState && (
        <Card className="border border-border/60 bg-card/80">
          <CardHeader className="p-4 pb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                SLA Oficial (Ellevo)
              </CardTitle>
              <CardDescription className="text-xs">
                Relógios calculados e auditados diretamente na origem.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={cn("pointer-events-none", slaState.className)}>
                {slaState.label}
              </Badge>
              {chamado.slaVencimentoPausado && (
                <Badge
                  variant="outline"
                  className="pointer-events-none gap-1 border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300"
                >
                  <PauseCircle className="h-3 w-3" />
                  SLA Pausado
                </Badge>
              )}
              {chamado.slaVencimentoManual && (
                <Badge variant="outline" className="pointer-events-none text-[11px]">
                  Vencimento manual
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  1ª Resposta Prevista
                </p>
                <p className="mt-0.5 font-medium text-foreground">
                  {formatDateTimeBr(chamado.slaPrimeiraRespostaPrevistaEm)}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  1ª Resposta Real
                </p>
                <p className="mt-0.5 font-medium text-foreground">
                  {chamado.slaPrimeiraRespostaRealEm
                    ? formatDateTimeBr(chamado.slaPrimeiraRespostaRealEm)
                    : "Aguardando"}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Vencimento SLA
                </p>
                <p className="mt-0.5 font-medium text-foreground">
                  {formatDateTimeBr(chamado.slaVencimentoEm)}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tempo Restante / Pausa
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-medium",
                    typeof chamado.slaTempoRestanteMinutos === "number" &&
                      chamado.slaTempoRestanteMinutos < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-foreground"
                  )}
                >
                  {chamado.slaVencimentoPausado
                    ? `Pausado (${formatRemainingSla(chamado.slaTempoRestanteMinutos)})`
                    : formatRemainingSla(chamado.slaTempoRestanteMinutos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Descrição Completa do Chamado */}
      <Card className="border border-border/60 bg-card/80">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Descrição do Chamado
          </CardTitle>
          {descriptionContent?.isTruncated && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
              className="h-8 px-2.5 text-xs shrink-0"
            >
              {isDescriptionExpanded ? (
                <>
                  Ver menos <ChevronUp className="h-3.5 w-3.5 ml-1" />
                </>
              ) : (
                <>
                  Expandir descrição <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {descriptionContent ? (
            <div className="rounded-lg border border-border/50 bg-muted/25 p-3.5 text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
              {isDescriptionExpanded ? descriptionContent.full : descriptionContent.preview}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground italic">
              Nenhuma descrição registrada no Ellevo para este chamado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Histórico Completo de Trâmites */}
      <Card className="border border-border/60 bg-card/80">
        <CardHeader className="p-4 pb-3 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Trâmites ({tramites.length})</span>
            </CardTitle>
            {tramiteSearch.trim() && (
              <span className="text-xs text-muted-foreground">
                Exibindo {filteredAndSortedTramites.length} de {tramites.length}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={tramiteSearch}
                onChange={(e) => setTramiteSearch(e.target.value)}
                placeholder="Filtrar trâmites por texto, responsável, equipe ou atividade..."
                aria-label="Filtrar trâmites"
                className="pl-9 pr-8 h-9 text-xs sm:text-sm"
              />
              {tramiteSearch && (
                <button
                  type="button"
                  onClick={() => setTramiteSearch("")}
                  aria-label="Limpar filtro de trâmites"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Select
              value={tramiteSortOrder}
              onValueChange={(value) =>
                setTramiteSortOrder(value === "asc" ? "asc" : "desc")
              }
            >
              <SelectTrigger
                aria-label="Ordenação dos trâmites"
                className="w-full sm:w-56 h-9 text-xs sm:text-sm shrink-0"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mais recentes primeiro</SelectItem>
                <SelectItem value="asc">Mais antigos primeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-3">
          {isTramitesLoading && tramites.length === 0 ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-border/50 p-3 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : tramites.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center rounded-xl bg-muted/20 border border-dashed border-border/60 space-y-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <h4 className="text-sm font-medium text-foreground">
                Nenhum trâmite sincronizado
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Ainda não há trâmites espelhados para este chamado. Use o botão de sincronização acima para consultar o histórico direto do Ellevo.
              </p>
            </div>
          ) : filteredAndSortedTramites.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl bg-muted/20 border border-dashed border-border/60 space-y-2">
              <Search className="h-7 w-7 text-muted-foreground/40" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Nenhum trâmite encontrado para &ldquo;{tramiteSearch}&rdquo;.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTramiteSearch("")}
              >
                Limpar filtro
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedTramites.map((tramite) => {
                const displayNumber = tramite.numeroTramite ?? tramite.sequenciaTramite;
                return (
                  <article
                    key={`${tramite.sequenciaTramite}-${tramite.numeroTramite ?? "na"}`}
                    className="rounded-lg border border-border/60 bg-background/80 overflow-hidden shadow-xs"
                  >
                    <header className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 bg-muted/30 px-3.5 py-2.5">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-foreground">
                          Trâmite #{displayNumber}
                        </span>
                        {tramite.atividade && (
                          <Badge
                            variant="outline"
                            className="px-2 py-0 text-[11px] font-normal max-w-full break-words"
                          >
                            {tramite.atividade}
                          </Badge>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono shrink-0">
                        <Clock3 className="h-3 w-3 shrink-0" />
                        {formatDateTimeBr(tramite.dataTramite, true)}
                      </span>
                    </header>

                    {(tramite.responsavel || tramite.equipeResponsavel) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3.5 pt-2.5 text-xs text-muted-foreground">
                        {tramite.responsavel && (
                          <span className="inline-flex items-center gap-1 min-w-0 break-words">
                            <User className="h-3 w-3 shrink-0 text-primary/70" />
                            <span>
                              Responsável:{" "}
                              <strong className="font-medium text-foreground">
                                {tramite.responsavel}
                              </strong>
                            </span>
                          </span>
                        )}
                        {tramite.equipeResponsavel && (
                          <span className="inline-flex items-center gap-1 min-w-0 break-words">
                            <Users className="h-3 w-3 shrink-0 text-primary/70" />
                            <span>
                              Equipe:{" "}
                              <strong className="font-medium text-foreground">
                                {tramite.equipeResponsavel}
                              </strong>
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="px-3.5 py-3 text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                      {tramite.descricao?.trim() || "Trâmite sem descrição."}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
