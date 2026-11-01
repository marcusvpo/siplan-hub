import React, { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  getISOWeek,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Plus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAgendaPermissions } from "@/hooks/useAgendaPermissions";
import { useHubCollaborators, type HubCollaborator } from "@/hooks/useHubCollaborators";
import { cn } from "@/lib/utils";
import {
  getImplantadorSpecialties,
  SYSTEM_BADGE_STYLES,
} from "@/constants/implantadorSpecialties";

export type AgendaViewMode = "month" | "week" | "day";

export interface ActivityFilterOption {
  id: string;
  label: string;
  dotColor: string;
  category?: "project" | "ticket" | "internal";
}

export const AGENDA_ACTIVITY_OPTIONS: ActivityFilterOption[] = [
  { id: "implantacao", label: "Implantação", dotColor: "bg-emerald-500", category: "project" },
  { id: "visita_qualidade", label: "Visita de Qualidade", dotColor: "bg-rose-500", category: "project" },
  { id: "aderencia", label: "Análise de Aderência", dotColor: "bg-purple-500", category: "project" },
  { id: "homologacao", label: "Homologação de Conversão", dotColor: "bg-amber-500", category: "project" },
  { id: "chamado", label: "Chamados Gerais", dotColor: "bg-emerald-500", category: "ticket" },
  { id: "apoio_sd", label: "Apoio SD", dotColor: "bg-cyan-500", category: "ticket" },
  { id: "configuracao", label: "Configuração de Ambiente", dotColor: "bg-indigo-500", category: "ticket" },
  { id: "migracao", label: "Migração de Servidor", dotColor: "bg-orange-500", category: "ticket" },
  { id: "treinamento", label: "Treinamento de Equipe", dotColor: "bg-teal-500", category: "internal" },
  { id: "compensacao_horas", label: "Compensação de Horas", dotColor: "bg-pink-500", category: "internal" },
  { id: "reuniao", label: "Reunião / Alinhamento", dotColor: "bg-rose-500", category: "internal" },
  { id: "outro", label: "Outros / Administrativo", dotColor: "bg-slate-500", category: "internal" },
];

export const MAX_SELECTED_ANALYSTS = 3;

/**
 * Cores temáticas para distinguir visualmente os até 3 analistas selecionados
 */
const ANALYST_PALETTES = [
  {
    chipBg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-900 dark:text-blue-200",
    avatarBg: "bg-blue-600 text-white",
  },
  {
    chipBg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900",
    text: "text-emerald-900 dark:text-emerald-200",
    avatarBg: "bg-emerald-700 text-white dark:bg-emerald-800 dark:text-emerald-100",
  },
  {
    chipBg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-900",
    text: "text-purple-900 dark:text-purple-200",
    avatarBg: "bg-purple-700 text-white dark:bg-purple-800 dark:text-purple-100",
  },
];

export interface AgendaToolbarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: AgendaViewMode;
  onViewModeChange: (view: AgendaViewMode) => void;

  /** Nomes dos colaboradores selecionados (máx 3) */
  selectedUserNames: string[];
  onSelectedUserNamesChange: (userNames: string[]) => void;

  /** IDs das atividades filtradas */
  selectedActivityTypes: string[];
  onSelectedActivityTypesChange: (types: string[]) => void;

  /** Callback disparado ao clicar em "+ Novo Cadastro" */
  onNewEntry?: () => void;

  /** Callback disparado ao clicar em "⚡ Localizar Janela" */
  onOpenSlotFinder?: () => void;

  className?: string;
}

function getInitials(name?: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPeriodTitle(date: Date, mode: AgendaViewMode): string {
  if (mode === "month") {
    const raw = format(date, "MMMM 'de' yyyy", { locale: ptBR });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (mode === "week") {
    const weekNum = getISOWeek(date);
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });

    const sameMonth = start.getMonth() === end.getMonth();
    const rangeText = sameMonth
      ? `${format(start, "dd")} a ${format(end, "dd 'de' MMM", { locale: ptBR })}`
      : `${format(start, "dd 'de' MMM", { locale: ptBR })} a ${format(end, "dd 'de' MMM", { locale: ptBR })}`;

    return `Semana ${weekNum} • ${rangeText}`;
  }
  return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function AgendaToolbar({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  selectedUserNames,
  onSelectedUserNamesChange,
  selectedActivityTypes,
  onSelectedActivityTypesChange,
  onNewEntry,
  onOpenSlotFinder,
  className,
}: AgendaToolbarProps) {
  const { canCreate } = useAgendaPermissions();
  const { data: rawCollaborators = [], isLoading: loadingCollaborators } = useHubCollaborators();

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [analystsPopoverOpen, setAnalystsPopoverOpen] = useState(false);

  // Ordena os colaboradores alfabeticamente
  const collaborators = useMemo(() => {
    return [...rawCollaborators].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );
  }, [rawCollaborators]);

  // Controles de navegação de data
  const handlePrevious = () => {
    if (viewMode === "month") onDateChange(subMonths(currentDate, 1));
    else if (viewMode === "week") onDateChange(subWeeks(currentDate, 1));
    else onDateChange(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === "month") onDateChange(addMonths(currentDate, 1));
    else if (viewMode === "week") onDateChange(addWeeks(currentDate, 1));
    else onDateChange(addDays(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const handleToggleAnalyst = (collaboratorName: string) => {
    const isSelected = selectedUserNames.includes(collaboratorName);

    if (isSelected) {
      onSelectedUserNamesChange(selectedUserNames.filter((name) => name !== collaboratorName));
      return;
    }

    if (selectedUserNames.length >= MAX_SELECTED_ANALYSTS) {
      toast.warning("Limite de até 3 analistas simultâneos atingido", {
        description:
          "Para adicionar este colaborador, desmarque um dos 3 analistas atualmente selecionados.",
        duration: 4000,
      });
      return;
    }

    onSelectedUserNamesChange([...selectedUserNames, collaboratorName]);
  };

  const handleRemoveAnalyst = (collaboratorName: string) => {
    onSelectedUserNamesChange(selectedUserNames.filter((name) => name !== collaboratorName));
  };

  const handleClearAnalysts = () => {
    onSelectedUserNamesChange([]);
  };

  const handleToggleActivity = (activityId: string) => {
    if (selectedActivityTypes.includes(activityId)) {
      onSelectedActivityTypesChange(
        selectedActivityTypes.filter((id) => id !== activityId)
      );
    } else {
      onSelectedActivityTypesChange([...selectedActivityTypes, activityId]);
    }
  };

  const handleSelectAllActivities = () => {
    onSelectedActivityTypesChange(AGENDA_ACTIVITY_OPTIONS.map((opt) => opt.id));
  };

  const handleClearActivities = () => {
    onSelectedActivityTypesChange([]);
  };

  const hasActivityFilter =
    selectedActivityTypes.length > 0 &&
    selectedActivityTypes.length < AGENDA_ACTIVITY_OPTIONS.length;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/70 bg-card/95 p-3 sm:p-4 shadow-sm backdrop-blur-sm",
        className
      )}
      data-testid="agenda-toolbar"
    >
      {/* LINHA 1: CONTROLES PRINCIPAIS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* BLOCO ESQUERDO: NAVEGAÇÃO DE PERÍODO */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 rounded-lg border-border/80 bg-background/80 px-3 text-xs font-semibold shadow-xs hover:bg-accent hover:text-accent-foreground sm:h-9"
            aria-label="Ir para a data de hoje"
          >
            Hoje
          </Button>

          <div className="inline-flex h-8 items-center rounded-lg border border-border/80 bg-background/80 p-0.5 shadow-xs sm:h-9">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="h-7 w-7 min-h-[32px] min-w-[32px] rounded-md hover:bg-accent hover:text-accent-foreground touch-manipulation"
              aria-label="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 min-h-[32px] px-2 text-xs font-semibold hover:bg-accent hover:text-accent-foreground touch-manipulation sm:px-2.5"
                  aria-label="Selecionar data específica"
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                  <span className="hidden sm:inline">Data</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => {
                    if (date) {
                      onDateChange(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-7 w-7 min-h-[32px] min-w-[32px] rounded-md hover:bg-accent hover:text-accent-foreground touch-manipulation"
              aria-label="Próximo período"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* TÍTULO DO PERÍODO EM DESTAQUE */}
          <h2 className="ml-1 text-sm sm:text-base font-bold tracking-tight text-foreground capitalize">
            {formatPeriodTitle(currentDate, viewMode)}
          </h2>
        </div>

        {/* BLOCO DIREITO: SELETORES E AÇÕES */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Popover de Multi-Seleção de Analistas (com Badges de Especialidade) */}
          <Popover open={analystsPopoverOpen} onOpenChange={setAnalystsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={selectedUserNames.length > 0 ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg border-border/80 text-xs font-semibold shadow-xs sm:h-9 sm:px-3",
                  selectedUserNames.length > 0 &&
                    "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                )}
                aria-label="Filtrar por analistas"
              >
                <Users className="h-3.5 w-3.5 shrink-0 opacity-80" />
                <span>
                  {selectedUserNames.length === 0
                    ? "Analistas"
                    : selectedUserNames.length === 1
                    ? selectedUserNames[0]
                    : `${selectedUserNames.length} Analistas`}
                </span>
                {selectedUserNames.length > 0 && (
                  <Badge
                    variant="default"
                    className="ml-0.5 h-4 min-w-[16px] rounded-full px-1 text-[10px] font-bold"
                  >
                    {selectedUserNames.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-lg" align="end">
              <Command>
                <CommandInput placeholder="Buscar colaborador..." className="text-xs" />
                <div className="flex items-center justify-between border-b px-3 py-1.5 text-[11px] text-muted-foreground">
                  <span>
                    Selecionados: <strong>{selectedUserNames.length}</strong>/{MAX_SELECTED_ANALYSTS}
                  </span>
                  {selectedUserNames.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAnalysts}
                      className="font-medium text-destructive transition-colors hover:underline"
                    >
                      Limpar todos
                    </button>
                  )}
                </div>

                <CommandList className="max-h-64">
                  {loadingCollaborators ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Carregando colaboradores...
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                      <CommandGroup heading="Colaboradores do HUB">
                        {collaborators.map((collab) => {
                          const isSelected = selectedUserNames.includes(collab.name);
                          const isLimitReached =
                            !isSelected && selectedUserNames.length >= MAX_SELECTED_ANALYSTS;
                          const specs = getImplantadorSpecialties(collab.name);

                          return (
                            <CommandItem
                              key={collab.id}
                              value={`${collab.name} ${collab.email} ${collab.team} ${specs.join(" ")}`}
                              onSelect={() => handleToggleAnalyst(collab.name)}
                              className={cn(
                                "flex items-center justify-between px-2.5 py-2 cursor-pointer",
                                isLimitReached && "opacity-60"
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <Avatar className="h-6 w-6 shrink-0 text-[10px]">
                                  <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                                    {getInitials(collab.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate text-xs font-medium text-foreground">
                                    {collab.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="truncate text-[10px] text-muted-foreground">
                                      {collab.team || "Geral"}
                                    </span>
                                    {specs.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        {specs.map((sp) => {
                                          const bStyle = SYSTEM_BADGE_STYLES[sp] || { badgeClass: "bg-muted text-foreground border-border" };
                                          return (
                                            <span
                                              key={sp}
                                              className={cn(
                                                "text-[9px] px-1 py-0 rounded font-semibold border",
                                                bStyle.badgeClass
                                              )}
                                            >
                                              {sp}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                {isLimitReached && (
                                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                    Limite
                                  </span>
                                )}
                                <div
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-sm border transition-colors",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/40"
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Alternador de Visões: Mês | Semana | Dia */}
          <Tabs
            value={viewMode}
            onValueChange={(val) => onViewModeChange(val as AgendaViewMode)}
            className="shrink-0"
          >
            <TabsList className="grid grid-cols-3 h-8 sm:h-9 p-0.5 bg-background/80 border border-border/80 shadow-xs overflow-hidden select-none scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger
                value="month"
                className="h-full py-0 px-2 sm:px-3 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Mês
              </TabsTrigger>
              <TabsTrigger
                value="week"
                className="h-full py-0 px-2 sm:px-3 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Semana
              </TabsTrigger>
              <TabsTrigger
                value="day"
                className="h-full py-0 px-2 sm:px-3 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Dia
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtro Dropdown de Atividades */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={hasActivityFilter ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg border-border/80 text-xs font-semibold shadow-xs sm:h-9 sm:px-3",
                  hasActivityFilter &&
                    "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                )}
                aria-label="Filtrar por tipos de atividade"
              >
                <Filter className="h-3.5 w-3.5 shrink-0 opacity-80" />
                <span className="hidden sm:inline">Atividades</span>
                {hasActivityFilter && (
                  <Badge
                    variant="default"
                    className="ml-0.5 h-4 min-w-[16px] rounded-full px-1 text-[10px] font-bold"
                  >
                    {selectedActivityTypes.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-lg">
              <DropdownMenuLabel className="flex items-center justify-between py-1 text-xs">
                <span>Tipos de Atividade</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllActivities}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={handleClearActivities}
                    className="text-[10px] text-muted-foreground hover:underline font-medium"
                  >
                    Limpar
                  </button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-60 overflow-y-auto">
                {AGENDA_ACTIVITY_OPTIONS.map((item) => {
                  const isChecked = selectedActivityTypes.includes(item.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={item.id}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleActivity(item.id)}
                      className="gap-2 text-xs cursor-pointer"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          item.dotColor
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botão Secundário "⚡ Localizar Janela" */}
          {onOpenSlotFinder && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenSlotFinder}
                    className="h-8 gap-1.5 rounded-lg border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-500/20 shadow-xs sm:h-9 sm:px-3 touch-manipulation active:scale-[0.98]"
                    aria-label="Localizador rápido de janelas de implantação"
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                    <span className="hidden sm:inline">Localizar Janela</span>
                    <span className="sm:hidden">Janelas</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Localizador rápido de janelas livres de implantação (3 a 5 dias úteis)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Botão Primário "+ Novo Cadastro" (Exclusivo para Gestores) */}
          {canCreate && (
            <Button
              type="button"
              onClick={onNewEntry}
              className={cn(
                "h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-sm transition-all sm:h-9 sm:px-3.5 sm:text-sm active:scale-[0.98]",
                "bg-gradient-to-r from-[#9e1c36] via-[#b91c3e] to-[#80142b] text-white hover:from-[#8d1830] hover:via-[#a71937] hover:to-[#731227]",
                "shadow-rose-950/20"
              )}
              aria-label="Abrir formulário de novo cadastro na agenda"
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>+ Novo Cadastro</span>
            </Button>
          )}
        </div>
      </div>

      {/* LINHA 2: CHIPS / BADGES DOS ANALISTAS SELECIONADOS */}
      {selectedUserNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 animate-in fade-in duration-200">
          <span className="text-[11px] font-semibold text-muted-foreground">
            Analistas em exibição:
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {selectedUserNames.map((userName, index) => {
              const palette = ANALYST_PALETTES[index % ANALYST_PALETTES.length];

              return (
                <div
                  key={userName}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-all shadow-2xs",
                    palette.chipBg,
                    palette.border,
                    palette.text
                  )}
                >
                  <Avatar className="h-4 w-4 shrink-0 text-[9px]">
                    <AvatarFallback
                      className={cn(
                        "font-bold leading-none",
                        palette.avatarBg
                      )}
                    >
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>

                  <span className="max-w-[130px] truncate sm:max-w-[180px]">
                    {userName}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveAnalyst(userName)}
                    className="relative ml-1 -mr-0.5 flex h-5 w-5 items-center justify-center rounded-full text-inherit opacity-70 transition-opacity hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 touch-manipulation after:absolute after:-inset-2 after:content-['']"
                    aria-label={`Remover filtro de ${userName}`}
                  >
                    <X className="h-3 w-3 stroke-[2.5]" />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleClearAnalysts}
              className="text-[11px] text-muted-foreground transition-colors hover:text-destructive hover:underline ml-1"
            >
              Limpar todos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
