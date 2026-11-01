import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  subMonths,
  addMonths,
  subWeeks,
  addWeeks,
  subDays,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Plus,
  RotateCw,
  Printer,
  AlertTriangle,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Users,
  ServerCog,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAnalystAgenda } from "@/hooks/useAnalystAgenda";
import { useHubCollaborators } from "@/hooks/useHubCollaborators";
import { useAgendaPermissions } from "@/hooks/useAgendaPermissions";
import { useAgendaKeyboardShortcuts } from "@/hooks/useAgendaKeyboardShortcuts";
import {
  AgendaToolbar,
  type AgendaViewMode,
  AGENDA_ACTIVITY_OPTIONS,
} from "@/components/agenda/AgendaToolbar";
import { AgendaKpiStrip } from "@/components/agenda/AgendaKpiStrip";
import { AgendaMonthView } from "@/components/agenda/AgendaMonthView";
import { AgendaWeekView } from "@/components/agenda/AgendaWeekView";
import { AgendaDayView } from "@/components/agenda/AgendaDayView";
import { NewAgendaEntryDialog } from "@/components/agenda/NewAgendaEntryDialog";
import { AgendaEntryDetailDialog } from "@/components/agenda/AgendaEntryDetailDialog";
import {
  AgendaSlotFinderDialog,
  type SlotFinderSystem,
} from "@/components/agenda/AgendaSlotFinderDialog";
import { cn } from "@/lib/utils";
import type {
  UnifiedAgendaEvent,
  AnalystAgendaEntry,
  AgendaActivityType,
} from "@/types/agenda";

/**
 * Implantadores Siplan prioritários para atalhos rápidos do Gate
 */
const DEFAULT_IMPLANTADORES = [
  "Ricardo Vieira",
  "Rodrigo Mizuno",
  "Rodrigo Brites",
  "Julio Araújo",
  "Erik Marques",
  "Fernando Cruz",
];

/**
 * Analistas de Preparação de Ambiente & Infraestrutura
 */
const INFRA_RESPONSIBLES = [
  "Bruno Fernandes",
  "Alex Silva",
];

export default function AgendaAnalistas() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Leitura inicial e sincronização de URL Search Params
  const initialView = (searchParams.get("view") as AgendaViewMode) || "week";
  const validViews: AgendaViewMode[] = ["month", "week", "day"];
  const safeViewMode = validViews.includes(initialView) ? initialView : "week";

  const initialDateStr = searchParams.get("date");
  const parsedInitialDate = initialDateStr
    ? (() => {
        try {
          const d = parseISO(`${initialDateStr}T12:00:00`);
          return isNaN(d.getTime()) ? new Date() : d;
        } catch {
          return new Date();
        }
      })()
    : new Date();

  const initialAnalystsParam = searchParams.get("analysts");
  const initialAnalysts = initialAnalystsParam
    ? initialAnalystsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const initialActivitiesParam = searchParams.get("activities");
  const initialActivities = initialActivitiesParam
    ? initialActivitiesParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Estados Locais
  const [viewMode, setViewMode] = useState<AgendaViewMode>(safeViewMode);
  const [currentDate, setCurrentDate] = useState<Date>(parsedInitialDate);
  const [selectedUserNames, setSelectedUserNames] = useState<string[]>(initialAnalysts);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>(initialActivities);

  // Controle de Modais
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [newEntryInitialDate, setNewEntryInitialDate] = useState<Date | undefined>(undefined);
  const [newEntryInitialEndDate, setNewEntryInitialEndDate] = useState<Date | undefined>(undefined);
  const [newEntryInitialUserName, setNewEntryInitialUserName] = useState<string | undefined>(undefined);
  const [newEntryInitialActivityType, setNewEntryInitialActivityType] = useState<AgendaActivityType | undefined>(undefined);
  const [newEntryInitialSubject, setNewEntryInitialSubject] = useState<string | undefined>(undefined);
  const [editingEntry, setEditingEntry] = useState<AnalystAgendaEntry | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<UnifiedAgendaEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Controle do Localizador de Janelas de Implantação
  const [isSlotFinderOpen, setIsSlotFinderOpen] = useState(false);

  // Mobile: Toggle de visibilidade da barra de KPIs
  const [isKpiStripExpandedMobile, setIsKpiStripExpandedMobile] = useState(false);

  // Hooks de Dados e Permissões
  const { data: collaborators = [] } = useHubCollaborators();
  const { canCreate } = useAgendaPermissions();

  // 2. Cálculo do intervalo de busca para o TanStack Query
  const { queryStartDate, queryEndDate } = useMemo(() => {
    if (viewMode === "month") {
      return {
        queryStartDate: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
        queryEndDate: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
      };
    }
    if (viewMode === "week") {
      return {
        queryStartDate: startOfWeek(currentDate, { weekStartsOn: 1 }),
        queryEndDate: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return {
      queryStartDate: startOfDay(currentDate),
      queryEndDate: endOfDay(currentDate),
    };
  }, [currentDate, viewMode]);

  // Carga dos eventos unificados
  const {
    events,
    holidays,
    isLoading,
    error,
    refetch,
  } = useAnalystAgenda({
    startDate: queryStartDate,
    endDate: queryEndDate,
    selectedUserNames,
    selectedActivityTypes,
  });

  // 3. Atualização sincronizada de URL Search Params
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("view", viewMode);
        next.set("date", format(currentDate, "yyyy-MM-dd"));

        if (selectedUserNames.length > 0) {
          next.set("analysts", selectedUserNames.join(","));
        } else {
          next.delete("analysts");
        }

        if (
          selectedActivityTypes.length > 0 &&
          selectedActivityTypes.length < AGENDA_ACTIVITY_OPTIONS.length
        ) {
          next.set("activities", selectedActivityTypes.join(","));
        } else {
          next.delete("activities");
        }

        return next;
      },
      { replace: true }
    );
  }, [viewMode, currentDate, selectedUserNames, selectedActivityTypes, setSearchParams]);

  // Handlers de Abertura de Modais
  const handleOpenNewEntry = useCallback(
    (opts?: {
      date?: Date;
      endDate?: Date;
      userName?: string;
      collaboratorId?: string;
      activityType?: AgendaActivityType;
      subject?: string;
    }) => {
      setEditingEntry(null);
      setNewEntryInitialDate(opts?.date || currentDate);
      setNewEntryInitialEndDate(opts?.endDate);
      setNewEntryInitialActivityType(opts?.activityType);
      setNewEntryInitialSubject(opts?.subject);

      let targetUserName = opts?.userName;
      if (!targetUserName && opts?.collaboratorId) {
        const found = collaborators.find((c) => c.id === opts.collaboratorId);
        if (found) targetUserName = found.name;
      }
      if (!targetUserName && selectedUserNames.length === 1) {
        targetUserName = selectedUserNames[0];
      }

      setNewEntryInitialUserName(targetUserName);
      setIsNewEntryOpen(true);
    },
    [currentDate, selectedUserNames, collaborators]
  );

  const handleSelectSlot = useCallback(
    (slot: { system: SlotFinderSystem; userName: string; startDate: Date; endDate: Date }) => {
      handleOpenNewEntry({
        date: slot.startDate,
        endDate: slot.endDate,
        userName: slot.userName,
        activityType: "implantacao",
        subject: `Implantação ${slot.system}`,
      });
    },
    [handleOpenNewEntry]
  );

  const handleOpenDetail = useCallback((event: UnifiedAgendaEvent) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  }, []);

  const handleStartEditFromDetail = useCallback((evt: UnifiedAgendaEvent) => {
    const rawId = evt.rawEntryId || evt.id.replace(/^manual-/, "");
    const entryToEdit: AnalystAgendaEntry = {
      id: rawId,
      userId: evt.userId || "",
      userName: evt.userName,
      ticketNumber: evt.ticketNumber || "",
      ticketCatalog: evt.ticketCatalog || "orion",
      clientName: evt.clientName,
      clientCode: null,
      subject: evt.subject,
      activityType: evt.activityType,
      date: evt.date,
      startTime: evt.startTime || null,
      endTime: evt.endTime || null,
      isAllDay: evt.isAllDay,
      observations: evt.observations || null,
      ticketData: (evt.ticketData as any) || null,
      bulkGroupId: evt.bulkGroupId || null,
      createdBy: null,
      createdAt: "",
      updatedAt: "",
    };

    setEditingEntry(entryToEdit);
    setNewEntryInitialDate(parseISO(`${evt.date}T12:00:00`));
    setNewEntryInitialEndDate(undefined);
    setNewEntryInitialActivityType(undefined);
    setNewEntryInitialSubject(undefined);
    setNewEntryInitialUserName(evt.userName);
    setIsDetailOpen(false);
    setIsNewEntryOpen(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Atalhos de teclado avançados (T, D, W, M, Setas, N, R, P)
  useAgendaKeyboardShortcuts({
    onToday: () => setCurrentDate(new Date()),
    onViewChange: setViewMode,
    onPrevious: () => {
      if (viewMode === "month") setCurrentDate((d) => subMonths(d, 1));
      else if (viewMode === "week") setCurrentDate((d) => subWeeks(d, 1));
      else setCurrentDate((d) => subDays(d, 1));
    },
    onNext: () => {
      if (viewMode === "month") setCurrentDate((d) => addMonths(d, 1));
      else if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
      else setCurrentDate((d) => addDays(d, 1));
    },
    onNewEntry: () => handleOpenNewEntry(),
    onRefresh: () => refetch(),
    onPrint: handlePrint,
    canCreate,
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1600px] mx-auto w-full">
      {/* CABEÇALHO DA TELA (TÍTULO, DESCRIÇÃO E AÇÕES RÁPIDAS) */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary shadow-2xs border border-primary/20">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Agenda dos Analistas
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Escala oficial de implantações, homologações, aderências, configurações e atendimentos
              </p>
            </div>
          </div>
        </div>

        {/* Ações Globais: Atualizar e Imprimir */}
        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="h-8 gap-1.5 rounded-lg border-border/80 px-2.5 text-xs font-semibold shadow-xs hover:bg-accent hover:text-accent-foreground sm:h-9 sm:px-3 touch-manipulation"
                  aria-label="Atualizar agenda agora"
                >
                  <RotateCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Recarregar eventos do Supabase (Atalho: R)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 gap-1.5 rounded-lg border-border/80 px-2.5 text-xs font-semibold shadow-xs hover:bg-accent hover:text-accent-foreground sm:h-9 sm:px-3 touch-manipulation"
                  aria-label="Imprimir visão atual da agenda"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Imprimir ou salvar como PDF (Atalho: P)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* CABEÇALHO EXCLUSIVO PARA IMPRESSÃO EM PAPEL / PDF */}
      <div className="hidden print:block mb-4 space-y-1 border-b pb-2">
        <h1 className="text-lg font-bold">Siplan HUB — Agenda Oficial de Analistas</h1>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            <strong>Período:</strong> {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()} ({viewMode === "month" ? "Visão Mensal" : viewMode === "week" ? "Visão Semanal" : "Visão Diária"})
          </span>
          <span>
            <strong>Filtro de Analistas:</strong> {selectedUserNames.length > 0 ? selectedUserNames.join(", ") : "Todos os Analistas"}
          </span>
          <span>
            <strong>Total de Atividades:</strong> {events.length}
          </span>
        </div>
      </div>

      {/* FAIXA DE KPIS COM SUPORTE MOBILE */}
      <section className="print:hidden space-y-2">
        <div className="flex sm:hidden items-center justify-between py-1">
          <button
            type="button"
            aria-expanded={isKpiStripExpandedMobile}
            onClick={() => setIsKpiStripExpandedMobile(!isKpiStripExpandedMobile)}
            className="flex min-h-[44px] items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground touch-manipulation active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
          >
            <span>Métricas e Indicadores do Mês</span>
            {isKpiStripExpandedMobile ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <span className="text-[11px] text-muted-foreground font-semibold tabular-nums">
            {events.length} atividades
          </span>
        </div>

        <div className={cn("transition-all duration-200", !isKpiStripExpandedMobile && "hidden sm:block")}>
          <AgendaKpiStrip
            events={events}
            selectedDate={currentDate}
            selectedUserNames={selectedUserNames}
            holidays={holidays}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* BARRA DE FERRAMENTAS COMPLETA (AGENDA TOOLBAR) */}
      <div className="print:hidden">
        <AgendaToolbar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedUserNames={selectedUserNames}
          onSelectedUserNamesChange={setSelectedUserNames}
          selectedActivityTypes={selectedActivityTypes}
          onSelectedActivityTypesChange={setSelectedActivityTypes}
          onNewEntry={() => handleOpenNewEntry()}
          onOpenSlotFinder={() => setIsSlotFinderOpen(true)}
        />
      </div>

      {/* ÁREA DE CONTEÚDO PRINCIPAL: ESTADOS E VISÕES */}
      <main className="min-h-0 flex-1">
        {/* ESTADO DE ERRO */}
        {error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-destructive">Falha ao carregar a Agenda dos Analistas</h3>
              <p className="text-xs text-muted-foreground max-w-md">
                {(error as any)?.message || "Ocorreu um erro ao consultar as tabelas do Supabase."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
        ) : selectedUserNames.length === 0 ? (
          /* GATE INICIAL: ALERTA PARA SELECIONAR RESPONSÁVEL (ANTI-SOBRECARGA VISUAL) */
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-b from-primary/[0.04] via-card to-background p-8 sm:p-14 text-center space-y-5 animate-in fade-in duration-300">
            <div className="relative">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary shadow-sm border border-primary/25">
                <Users className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
                !
              </div>
            </div>

            <div className="max-w-lg space-y-2">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Selecione um Responsável para abrir a agenda
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Para não sobrecarregar a visualização com atividades de todos os colaboradores simultaneamente, utilize o botão <strong>"Analistas"</strong> no topo ou escolha um dos responsáveis nos atalhos rápidos abaixo:
              </p>
            </div>

            {/* Quick-pick cards focados especificamente nos Implantadores */}
            <div className="w-full max-w-2xl pt-1 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Atalhos Rápidos — Implantadores:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {DEFAULT_IMPLANTADORES.map((implantadorName) => {
                    const collab = collaborators.find((c) =>
                      c.name.toLowerCase().includes(implantadorName.toLowerCase()) ||
                      implantadorName.toLowerCase().includes(c.name.toLowerCase())
                    );
                    const targetName = collab ? collab.name : implantadorName;
                    const initials = implantadorName
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <button
                        key={implantadorName}
                        type="button"
                        onClick={() => setSelectedUserNames([targetName])}
                        className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card hover:bg-primary/5 hover:border-primary/50 px-3.5 py-2 text-xs font-semibold text-foreground transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-95 touch-manipulation cursor-pointer"
                      >
                        <Avatar className="h-6 w-6 text-[10px]">
                          <AvatarFallback className="bg-primary/15 text-primary font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{implantadorName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick-pick cards para Preparação de Ambiente & Infraestrutura */}
              <div className="pt-2 border-t border-border/40">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center justify-center gap-1.5">
                  <ServerCog className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Atalhos Rápidos — Preparação de Ambiente & Infraestrutura:</span>
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {INFRA_RESPONSIBLES.map((infraName) => {
                    const collab = collaborators.find((c) =>
                      c.name.toLowerCase().includes(infraName.toLowerCase()) ||
                      infraName.toLowerCase().includes(c.name.toLowerCase())
                    );
                    const targetName = collab ? collab.name : infraName;
                    const initials = infraName
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <button
                        key={infraName}
                        type="button"
                        onClick={() => setSelectedUserNames([targetName])}
                        className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card hover:bg-indigo-500/10 hover:border-indigo-500/50 px-3.5 py-2 text-xs font-semibold text-foreground transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-95 touch-manipulation cursor-pointer"
                      >
                        <Avatar className="h-6 w-6 text-[10px]">
                          <AvatarFallback className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{infraName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          /* ESTADO DE CARREGAMENTO (SKELETON ELEGANTE) */
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-xl border border-border/60 bg-card p-3 shadow-2xs space-y-2.5 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : events.length === 0 && selectedUserNames.length === 0 && selectedActivityTypes.length === 0 ? (
          /* ESTADO VAZIO ABSOLUTO */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/60 p-12 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Nenhuma atividade no período</h3>
              <p className="text-xs text-muted-foreground max-w-md">
                Não há implantações, homologações, aderências ou chamados registrados para o período selecionado.
              </p>
            </div>
            {canCreate && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenNewEntry()}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar primeiro agendamento
              </Button>
            )}
          </div>
        ) : (
          /* RENDERIZAÇÃO DA VISÃO SELECIONADA */
          <div className="animate-in fade-in duration-200">
            {viewMode === "month" && (
              <AgendaMonthView
                currentDate={currentDate}
                events={events}
                selectedUserNames={selectedUserNames}
                onEventClick={handleOpenDetail}
                onDayClick={(date) => {
                  setCurrentDate(date);
                  setViewMode("day");
                }}
                onNewEntry={(date) => handleOpenNewEntry({ date })}
                canCreate={canCreate}
              />
            )}

            {viewMode === "week" && (
              <AgendaWeekView
                currentDate={currentDate}
                events={events}
                selectedUserNames={selectedUserNames}
                onCardClick={handleOpenDetail}
                onDateSelect={(date) => {
                  setCurrentDate(date);
                  setViewMode("day");
                }}
                onTimeSlotClick={(dateIso, _time, collabId) =>
                  handleOpenNewEntry({
                    date: parseISO(`${dateIso}T12:00:00`),
                    collaboratorId: collabId,
                  })
                }
              />
            )}

            {viewMode === "day" && (
              <AgendaDayView
                currentDate={currentDate}
                events={events}
                selectedUserNames={selectedUserNames}
                onCardClick={handleOpenDetail}
                onTimeSlotClick={(dateIso, _time, collabId) =>
                  handleOpenNewEntry({
                    date: parseISO(`${dateIso}T12:00:00`),
                    collaboratorId: collabId,
                  })
                }
              />
            )}
          </div>
        )}
      </main>

      {/* MODAL DE NOVO CADASTRO / EDIÇÃO */}
      <NewAgendaEntryDialog
        open={isNewEntryOpen}
        onOpenChange={setIsNewEntryOpen}
        initialDate={newEntryInitialDate}
        initialEndDate={newEntryInitialEndDate}
        initialUserName={newEntryInitialUserName}
        initialActivityType={newEntryInitialActivityType}
        initialSubject={newEntryInitialSubject}
        editingEntry={editingEntry}
        onSuccess={() => {
          setIsNewEntryOpen(false);
          refetch();
        }}
      />

      {/* MODAL DE DETALHES DO EVENTO SELECIONADO */}
      <AgendaEntryDetailDialog
        event={selectedEvent}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleStartEditFromDetail}
        onDeleteSuccess={() => refetch()}
      />

      {/* MODAL DO LOCALIZADOR DE JANELAS DE IMPLANTAÇÃO (SLOT FINDER) */}
      <AgendaSlotFinderDialog
        open={isSlotFinderOpen}
        onOpenChange={setIsSlotFinderOpen}
        events={events}
        onSelectSlot={handleSelectSlot}
      />
    </div>
  );
}
