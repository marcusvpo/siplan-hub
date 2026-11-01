import React, { useState, useEffect, useMemo } from "react";
import { format, isAfter, isBefore, startOfDay, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarPlus,
  Search,
  Loader2,
  CheckCircle2,
  Building2,
  Laptop,
  Users,
  Clock,
  Calendar as CalendarIcon,
  Palmtree,
  AlertTriangle,
  Layers,
  Archive,
  Briefcase,
  Check,
  ChevronsUpDown,
  Edit3,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EllevoTicketLink } from "@/components/EllevoTicketLink";

import { useAnalystAgenda } from "@/hooks/useAnalystAgenda";
import { useChamado0800ByNumber, type Chamado0800 } from "@/hooks/useChamados0800";
import { statusBadgeClass } from "@/components/ProjectManagement/Chamado0800DetailDialog";
import { useHubCollaborators } from "@/hooks/useHubCollaborators";
import { useVacations } from "@/hooks/useVacations";
import { validateScheduleConflicts } from "@/lib/agenda-conflicts";
import { detectTicketCatalog } from "@/lib/agenda-unifier";
import { normalizeText } from "@/lib/project-calendar-events";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { AgendaActivityType, TicketCatalog, NewAgendaEntryInput, AnalystAgendaEntry } from "@/types/agenda";
import {
  getImplantadorSpecialties,
  getRecommendedSpecialistsForTicket,
  SYSTEM_BADGE_STYLES,
} from "@/constants/implantadorSpecialties";

export interface NewAgendaEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialEndDate?: Date;
  initialUserName?: string;
  initialActivityType?: AgendaActivityType;
  initialSubject?: string;
  editingEntry?: AnalystAgendaEntry | null;
  onSuccess?: () => void;
}

const ACTIVITY_TYPE_OPTIONS: { value: AgendaActivityType; label: string }[] = [
  { value: "chamado", label: "Atendimento a Chamado" },
  { value: "implantacao", label: "Implantação" },
  { value: "visita_qualidade", label: "Visita de Qualidade" },
  { value: "aderencia", label: "Análise de Aderência" },
  { value: "homologacao", label: "Homologação de Conversão" },
  { value: "configuracao", label: "Configuração de Ambiente" },
  { value: "migracao", label: "Migração / Conversão de Dados" },
  { value: "treinamento", label: "Treinamento de Equipe" },
  { value: "apoio_sd", label: "Apoio SD" },
  { value: "compensacao_horas", label: "Compensação de Horas" },
  { value: "reuniao", label: "Reunião / Alinhamento" },
  { value: "outro", label: "Outro / Administrativo" },
];

export function NewAgendaEntryDialog({
  open,
  onOpenChange,
  initialDate,
  initialEndDate,
  initialUserName,
  initialActivityType,
  initialSubject,
  editingEntry,
  onSuccess,
}: NewAgendaEntryDialogProps) {
  // Tabs: 'orion' | 'legacy' | 'internal'
  const [catalogTab, setCatalogTab] = useState<"orion" | "legacy" | "internal">("orion");

  // Dados do Chamado / Atividade
  const [ticketSearchInput, setTicketSearchInput] = useState("");
  const [searchedTicket, setSearchedTicket] = useState<string | null>(null);
  const [loadedTicket, setLoadedTicket] = useState<Chamado0800 | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [subject, setSubject] = useState("");
  const [activityType, setActivityType] = useState<AgendaActivityType>("chamado");
  const [observations, setObservations] = useState("");

  // Responsável
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Período
  const [isBulk, setIsBulk] = useState(false);
  const [startDate, setStartDate] = useState<Date>(initialDate || new Date());
  const [endDate, setEndDate] = useState<Date>(initialDate || new Date());
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [includeWeekendsAndHolidays, setIncludeWeekendsAndHolidays] = useState(false);

  // Horários
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("17:30");

  // Hooks de Suporte
  const queryClient = useQueryClient();
  const { data: collaborators = [], isLoading: collaboratorsLoading } = useHubCollaborators();
  const { vacations } = useVacations();
  const { createEntry, updateEntry, isCreating, isUpdating } = useAnalystAgenda({
    startDate: startDate || new Date(),
    endDate: isBulk ? (endDate || startDate) : (startDate || new Date()),
  });

  const isSubmitting = isCreating || isUpdating;

  // Recomendação inteligente de implantadores com base no chamado
  const recommendation = useMemo(() => {
    if (!loadedTicket) return null;
    return getRecommendedSpecialistsForTicket({
      produto: loadedTicket.produto,
      modulo: (loadedTicket as any).modulo,
      software: loadedTicket.software,
      title: loadedTicket.titulo,
    });
  }, [loadedTicket]);

  // Badge dinâmico de sistema baseado no chamado carregado ou aba ativa
  const systemBadgeLabel = useMemo(() => {
    if (catalogTab === "internal") return "Atividade Interna";
    if (loadedTicket?.software) return loadedTicket.software;
    if (loadedTicket?.produto) return loadedTicket.produto;
    return catalogTab === "orion" ? "Orion" : "Legados";
  }, [catalogTab, loadedTicket]);

  // Query sob demanda do chamado
  const {
    data: fetchedTicket,
    isLoading: ticketQueryLoading,
    isFetching: ticketQueryFetching,
  } = useChamado0800ByNumber(searchedTicket);

  const isSearchingTicket = ticketQueryLoading || ticketQueryFetching;

  // Atualiza estado ao encontrar chamado pela busca
  useEffect(() => {
    if (fetchedTicket) {
      setLoadedTicket(fetchedTicket);
      if (fetchedTicket.nomeCliente) setClientName(fetchedTicket.nomeCliente);
      if (fetchedTicket.codigoCliente) setClientCode(fetchedTicket.codigoCliente);
      if (fetchedTicket.titulo) setSubject(fetchedTicket.titulo);

      // Auto-detecta catálogo (Orion vs Legado)
      const detected = detectTicketCatalog(fetchedTicket.software || fetchedTicket.produto);
      if (catalogTab !== "internal") {
        setCatalogTab(detected);
      }

      // Auto-sugere responsável se analistaResponsavel coincidir com colaborador
      if (fetchedTicket.analistaResponsavel && collaborators.length > 0 && !selectedUserId) {
        const normSearch = normalizeText(fetchedTicket.analistaResponsavel);
        const found = collaborators.find((c) => normalizeText(c.name).includes(normSearch) || normSearch.includes(normalizeText(c.name)));
        if (found) {
          setSelectedUserId(found.id);
          setSelectedUserName(found.name);
        }
      }
    }
  }, [fetchedTicket, collaborators, selectedUserId, catalogTab]);

  // Inicialização / Edição ao abrir modal
  useEffect(() => {
    if (open) {
      if (editingEntry) {
        // Modo Edição
        setTicketSearchInput(editingEntry.ticketNumber || "");
        setSearchedTicket(editingEntry.ticketNumber || null);
        setCatalogTab(editingEntry.ticketCatalog === "legacy" ? "legacy" : "orion");
        setClientName(editingEntry.clientName || "");
        setClientCode(editingEntry.clientCode || "");
        setSubject(editingEntry.subject || "");
        setActivityType(editingEntry.activityType || "chamado");
        setObservations(editingEntry.observations || "");
        setSelectedUserId(editingEntry.userId);
        setSelectedUserName(editingEntry.userName);

        const entryDate = parseISO(editingEntry.date);
        setStartDate(entryDate);
        setEndDate(entryDate);
        setIsBulk(false);

        setIsAllDay(editingEntry.isAllDay ?? true);
        setStartTime(editingEntry.startTime?.slice(0, 5) || "08:30");
        setEndTime(editingEntry.endTime?.slice(0, 5) || "17:30");
        if (editingEntry.ticketData) {
          setLoadedTicket(editingEntry.ticketData as any);
        }
      } else {
        // Modo Criação
        if (initialDate) {
          setStartDate(initialDate);
          if (initialEndDate) {
            setEndDate(initialEndDate);
            setIsBulk(true);
          } else {
            setEndDate(initialDate);
            setIsBulk(false);
          }
        }
        if (initialActivityType) {
          setActivityType(initialActivityType);
          if (initialActivityType === "configuracao") {
            setIsAllDay(true);
          }
        }
        if (initialSubject) {
          setSubject(initialSubject);
        }
        if (initialUserName && collaborators.length > 0) {
          const normInitial = normalizeText(initialUserName);
          const found = collaborators.find((c) => normalizeText(c.name).includes(normInitial) || normInitial.includes(normalizeText(c.name)));
          if (found) {
            setSelectedUserId(found.id);
            setSelectedUserName(found.name);
          }
        }
      }
    } else {
      // Limpeza
      setTicketSearchInput("");
      setSearchedTicket(null);
      setLoadedTicket(null);
      setClientName("");
      setClientCode("");
      setSubject("");
      setObservations("");
      setIsBulk(false);
      setIsAllDay(true);
      setSelectedUserId("");
      setSelectedUserName("");
      setIncludeWeekendsAndHolidays(false);
    }
  }, [open, editingEntry, initialDate, initialEndDate, initialUserName, initialActivityType, initialSubject, collaborators]);

  // Disparo manual da busca por chamado
  const handleSearchTicket = () => {
    const trimmed = ticketSearchInput.trim();
    if (!trimmed) {
      toast.warning("Digite o número do chamado para pesquisar.");
      return;
    }
    setSearchedTicket(trimmed);
  };

  // Cálculo de conflitos (Férias, Feriados e Fins de Semana)
  const conflicts = useMemo(() => {
    if (!selectedUserName || !startDate) return null;
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = isBulk && endDate ? format(endDate, "yyyy-MM-dd") : startStr;

    return validateScheduleConflicts({
      userId: selectedUserId,
      userName: selectedUserName,
      startDate: startStr,
      endDate: endStr,
      vacations,
      includeWeekendsAndHolidays,
    });
  }, [selectedUserId, selectedUserName, startDate, endDate, isBulk, vacations, includeWeekendsAndHolidays]);

  // Salvar Agendamento (Criação ou Edição)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId || !selectedUserName) {
      toast.error("Selecione o analista responsável pelo agendamento.");
      return;
    }

    if (catalogTab !== "internal" && !clientName.trim()) {
      toast.error("Informe o nome do cliente / serventia.");
      return;
    }

    if (!subject.trim()) {
      toast.error("Informe o assunto ou título da atividade.");
      return;
    }

    if (isBulk && isBefore(endDate, startDate)) {
      toast.error("A data de término não pode ser anterior à data de início.");
      return;
    }

    const payload: NewAgendaEntryInput = {
      userId: selectedUserId,
      userName: selectedUserName,
      ticketNumber: catalogTab === "internal" ? (ticketSearchInput.trim() || "INTERNO") : (ticketSearchInput.trim() || "S/N"),
      ticketCatalog: (catalogTab === "legacy" ? "legacy" : "orion") as TicketCatalog,
      clientName: catalogTab === "internal" ? (clientName.trim() || "Atividade Interna Siplan") : clientName.trim(),
      clientCode: clientCode.trim() || null,
      subject: subject.trim(),
      activityType,
      date: format(startDate, "yyyy-MM-dd"),
      endDate: isBulk ? format(endDate, "yyyy-MM-dd") : null,
      startTime: isAllDay ? null : startTime,
      endTime: isAllDay ? null : endTime,
      isAllDay,
      observations: observations.trim() || null,
      ticketData: loadedTicket || null,
      includeWeekendsAndHolidays,
    };

    try {
      if (editingEntry) {
        await updateEntry({
          id: editingEntry.id,
          updates: payload,
        });
      } else {
        await createEntry(payload);
      }

      // Sincronização automática com as etapas do Projeto do HUB (Aderência, Homologação e Preparação de Ambiente)
      if (activityType === "aderencia" || activityType === "homologacao" || activityType === "configuracao") {
        try {
          const rawTicket = (ticketSearchInput || "").replace(/^#/, "").trim();
          let matchedProjectId: string | null = null;

          if (rawTicket && rawTicket !== "INTERNO" && rawTicket !== "S/N") {
            const { data: projByTicket } = await supabase
              .from("projects")
              .select("id, client_name, ticket_number, custom_fields, environment_status")
              .eq("is_deleted", false)
              .eq("ticket_number", rawTicket)
              .maybeSingle();
            if (projByTicket) {
              matchedProjectId = projByTicket.id;
            }
          }

          if (!matchedProjectId && clientName.trim() && catalogTab !== "internal") {
            const { data: projByClient } = await supabase
              .from("projects")
              .select("id, client_name, ticket_number, custom_fields, environment_status")
              .eq("is_deleted", false)
              .ilike("client_name", `%${clientName.trim()}%`)
              .maybeSingle();
            if (projByClient) {
              matchedProjectId = projByClient.id;
            }
          }

          if (matchedProjectId) {
            const dateStr = format(startDate, "yyyy-MM-dd");
            const endDateStr = isBulk && endDate ? format(endDate, "yyyy-MM-dd") : dateStr;

            if (activityType === "aderencia") {
              await supabase
                .from("projects")
                .update({
                  adherence_responsible: selectedUserName,
                  responsible_adherence: selectedUserName,
                  adherence_end_date: dateStr,
                  updated_at: new Date().toISOString(),
                  last_update_by: selectedUserName,
                })
                .eq("id", matchedProjectId);
              toast.success("Etapa 2 (Aderência) do projeto sincronizada com sucesso!");
            } else if (activityType === "homologacao") {
              await supabase
                .from("projects")
                .update({
                  conversion_homologation_responsible: selectedUserName,
                  conversion_homologation_date: dateStr,
                  updated_at: new Date().toISOString(),
                  last_update_by: selectedUserName,
                })
                .eq("id", matchedProjectId);
              toast.success("Etapa 3 (Homologação) do projeto sincronizada com sucesso!");
            } else if (activityType === "configuracao") {
              const { data: currentProj } = await supabase
                .from("projects")
                .select("id, custom_fields, environment_status")
                .eq("id", matchedProjectId)
                .single();

              const existingCustomFields = (currentProj?.custom_fields as Record<string, unknown>) || {};
              const existingTimeline = Array.isArray(existingCustomFields.environment_timeline)
                ? existingCustomFields.environment_timeline
                : [];

              const newTimelineItem = {
                id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                timestamp: new Date().toISOString(),
                author: selectedUserName,
                action: "scheduled",
                description: `Preparação de Ambiente agendada para ${dateStr}${
                  isBulk && endDate ? ` até ${endDateStr}` : ""
                } via Agenda dos Analistas.`,
              };

              const isAlreadyDone = currentProj?.environment_status === "done";
              const nextStatus = isAlreadyDone ? "done" : "in-progress";
              const nextKanbanCol = isAlreadyDone ? "completed" : "in_progress";

              await supabase
                .from("projects")
                .update({
                  environment_responsible: selectedUserName,
                  environment_start_date: dateStr,
                  environment_end_date: endDateStr,
                  environment_status: nextStatus,
                  custom_fields: {
                    ...existingCustomFields,
                    environment_kanban_status: nextKanbanCol,
                    environment_timeline: [newTimelineItem, ...existingTimeline],
                  },
                  updated_at: new Date().toISOString(),
                  last_update_by: selectedUserName,
                })
                .eq("id", matchedProjectId);

              toast.success("Etapa 4 (Preparação de Ambiente) e central Kanban sincronizadas!");
            }

            queryClient.invalidateQueries({ queryKey: ["projectsList"] });
            queryClient.invalidateQueries({ queryKey: ["projectsV3_with_dates"] });
            queryClient.invalidateQueries({ queryKey: ["projectDetails", matchedProjectId] });
            queryClient.invalidateQueries({ queryKey: ["analystAgendaEntries"] });
          }
        } catch (syncErr) {
          console.error("Erro ao sincronizar etapa do projeto:", syncErr);
        }
      }

      toast.success(editingEntry ? "Agendamento atualizado com sucesso!" : "Agendamento criado com sucesso!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar agendamento:", err);
      toast.error(err?.message || "Ocorreu um erro ao salvar o agendamento.");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "AN";
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 max-h-[92vh] flex flex-col">
        {/* CABEÇALHO */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-gradient-to-r from-muted/50 via-background to-muted/30 shrink-0">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {editingEntry ? <Edit3 className="h-5 w-5" /> : <CalendarPlus className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {editingEntry ? "Editar Agendamento de Analista" : "Novo Agendamento na Agenda"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Alocação de chamados 0800, implantações, homologações e compromissos internos
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="hidden sm:inline-flex text-xs px-2 py-0.5 font-semibold">
              {systemBadgeLabel}
            </Badge>
          </div>
        </DialogHeader>

        {/* CORPO DO FORMULÁRIO COM ROLAGEM LIMPA */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 space-y-4">
            {/* ABAS DE CATÁLOGO (ORION vs LEGADO vs INTERNO) */}
            <Tabs
              value={catalogTab}
              onValueChange={(val: any) => {
                setCatalogTab(val);
                if (val === "internal") {
                  setActivityType("reuniao");
                  if (!subject) setSubject("Atividade Interna / Administrativa");
                } else {
                  setActivityType("chamado");
                }
              }}
              className="w-full shrink-0"
            >
              <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/70 overflow-hidden select-none scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <TabsTrigger value="orion" className="h-full py-0 gap-2 text-xs font-semibold whitespace-nowrap">
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <span>Chamados Orion</span>
                </TabsTrigger>
                <TabsTrigger value="legacy" className="h-full py-0 gap-2 text-xs font-semibold whitespace-nowrap">
                  <Archive className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Chamados Legados</span>
                </TabsTrigger>
                <TabsTrigger value="internal" className="h-full py-0 gap-2 text-xs font-semibold whitespace-nowrap">
                  <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>Atividades Internas</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* COLUNA ESQUERDA: DEMANDA & CHAMADO */}
              <div className="space-y-3.5">
                {/* BUSCA POR CHAMADO (SE NÃO FOR INTERNA) */}
                {catalogTab !== "internal" && (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-3 sm:p-3.5">
                    <Label htmlFor="ticket-number" className="text-xs font-semibold flex items-center justify-between">
                      <span>Número do Chamado Ellevo</span>
                      {loadedTicket && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Chamado Vinculado
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="ticket-number"
                          placeholder="Ex: 759980"
                          value={ticketSearchInput}
                          onChange={(e) => setTicketSearchInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearchTicket();
                            }
                          }}
                          className="font-mono tracking-wider text-sm pr-8 h-9"
                        />
                        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSearchTicket}
                        disabled={isSearchingTicket || !ticketSearchInput.trim()}
                        className="shrink-0 gap-1.5 text-xs h-9"
                      >
                        {isSearchingTicket ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                        Buscar
                      </Button>
                    </div>

                    {/* CARD RESUMIDO DO CHAMADO CARREGADO */}
                    {loadedTicket && (
                      <div className="mt-2.5 rounded-lg border border-border/80 bg-background/80 p-2.5 text-xs shadow-2xs space-y-1.5 animate-in fade-in duration-300">
                        <div className="flex flex-wrap items-center justify-between gap-1 border-b pb-1.5">
                          <div className="flex items-center gap-2">
                            <EllevoTicketLink
                              ticketNumber={loadedTicket.numeroChamado}
                              className="font-mono font-semibold text-primary text-xs"
                            />
                            <Badge className={cn("text-[10px] h-4.5 px-1.5 pointer-events-none", statusBadgeClass(loadedTicket.status))}>
                              {loadedTicket.status || "Em Aberto"}
                            </Badge>
                          </div>
                          {loadedTicket.criticidade && (
                            <span className="text-[10px] text-muted-foreground">
                              Criticidade: <strong>{loadedTicket.criticidade}</strong>
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          <p className="flex items-center gap-1.5 truncate text-foreground/90">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{loadedTicket.nomeCliente || "Cliente não informado"}</span>
                          </p>
                          <p className="flex items-center gap-1.5 truncate text-foreground/90">
                            <Laptop className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{loadedTicket.software || loadedTicket.produto || "Software não informado"}</span>
                          </p>
                          <p className="flex items-center gap-1.5 truncate text-muted-foreground sm:col-span-2">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span>Equipe: {loadedTicket.equipeResponsavel || "SD"} {loadedTicket.analistaResponsavel ? `· ${loadedTicket.analistaResponsavel}` : ""}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* RECOMENDAÇÃO INTELIGENTE DE ESPECIALISTAS */}
                    {recommendation && (
                      <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1.5 animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 text-primary font-bold text-[11px]">
                          <Sparkles className="h-3.5 w-3.5 shrink-0" />
                          <span>Especialistas Recomendados para este Chamado</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {recommendation.reason}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {recommendation.recommendedNames.map((name) => {
                            const collabObj = collaborators.find((c) => normalizeText(c.name).includes(normalizeText(name)) || normalizeText(name).includes(normalizeText(c.name)));
                            const isSelected = selectedUserName === name;
                            return (
                              <Button
                                key={name}
                                type="button"
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => {
                                  if (collabObj) {
                                    setSelectedUserId(collabObj.id);
                                    setSelectedUserName(collabObj.name);
                                  } else {
                                    setSelectedUserName(name);
                                  }
                                }}
                                className={cn(
                                  "h-6 text-[10px] px-2 gap-1 rounded-md shadow-2xs",
                                  isSelected && "bg-primary text-primary-foreground font-bold shadow-xs"
                                )}
                              >
                                <Avatar className="h-3.5 w-3.5 text-[8px]">
                                  <AvatarFallback className="bg-primary/20 text-primary text-[8px] font-bold">
                                    {getInitials(name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{name}</span>
                                {isSelected && <Check className="h-2.5 w-2.5 ml-0.5 stroke-[3]" />}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TIPO DE ATIVIDADE */}
                <div className="space-y-1.5">
                  <Label htmlFor="activity-type" className="text-xs font-semibold">
                    Tipo de Atividade *
                  </Label>
                  <Select
                    value={activityType}
                    onValueChange={(val: AgendaActivityType) => {
                      setActivityType(val);
                      if (val === "configuracao") {
                        setIsAllDay(true);
                      }
                    }}
                  >
                    <SelectTrigger id="activity-type" className="text-xs h-9">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPE_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value} className="text-xs">
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CLIENTE / SERVENTIA */}
                <div className="space-y-1.5">
                  <Label htmlFor="client-name" className="text-xs font-semibold">
                    {catalogTab === "internal" ? "Local / Setor" : "Cliente / Serventia *"}
                  </Label>
                  <Input
                    id="client-name"
                    placeholder={catalogTab === "internal" ? "Ex: Sala de Reunião / Matriz" : "Ex: 2º Ofício de Notas"}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required={catalogTab !== "internal"}
                    className="h-9 text-xs"
                  />
                </div>

                {/* ASSUNTO / RESUMO */}
                <div className="space-y-1.5">
                  <Label htmlFor="subject" className="text-xs font-semibold">
                    Assunto / Resumo da Atividade *
                  </Label>
                  <Input
                    id="subject"
                    placeholder="Ex: Treinamento e Acompanhamento Orion Protesto"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* COLUNA DIREITA: ALOCAÇÃO, PERÍODO & HORÁRIOS */}
              <div className="space-y-4">
                {/* DESTAQUE MÁXIMO AO ANALISTA / COLABORADOR RESPONSÁVEL */}
                <div className="space-y-2 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.05] via-primary/[0.02] to-transparent p-3.5 shadow-xs transition-all">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Analista / Colaborador Responsável *</span>
                    </Label>
                    {selectedUserName && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold px-1.5 py-0">
                        Alocado
                      </Badge>
                    )}
                  </div>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className={cn(
                          "w-full justify-between h-10 font-medium px-3 bg-background transition-all",
                          selectedUserName ? "border-primary/50 ring-1 ring-primary/20 shadow-2xs" : "border-dashed border-border/80"
                        )}
                      >
                        {selectedUserName ? (
                          <div className="flex items-center gap-2 truncate">
                            <Avatar className="h-6 w-6 text-[10px] ring-1 ring-primary/30">
                              <AvatarFallback className="bg-primary/15 text-primary font-bold">
                                {getInitials(selectedUserName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate font-semibold text-foreground text-xs">{selectedUserName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 opacity-50" />
                            {collaboratorsLoading ? "Carregando colaboradores..." : "Selecione o analista responsável..."}
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-lg" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar colaborador pelo nome..." className="text-xs" />
                        <CommandList className="max-h-60">
                          <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                          <CommandGroup>
                            {collaborators.map((collab) => {
                              const specs = getImplantadorSpecialties(collab.name);
                              const isRecommended = recommendation?.recommendedNames?.some(
                                (n) => normalizeText(n) === normalizeText(collab.name)
                              );
                              return (
                                <CommandItem
                                  key={collab.id}
                                  value={`${collab.name} ${collab.team || ""} ${specs.join(" ")}`}
                                  onSelect={() => {
                                    setSelectedUserId(collab.id);
                                    setSelectedUserName(collab.name);
                                    setComboboxOpen(false);
                                  }}
                                  className="flex items-center justify-between text-xs py-2 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-6 w-6 text-[10px] shrink-0">
                                      <AvatarFallback className="bg-muted text-foreground">
                                        {getInitials(collab.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-medium truncate">{collab.name}</span>
                                        {isRecommended && (
                                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] px-1 py-0 h-4 font-bold">
                                            ★ Sugerido
                                          </Badge>
                                        )}
                                      </div>
                                      {specs.length > 0 && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          {specs.map((sp) => {
                                            const bStyle = SYSTEM_BADGE_STYLES[sp] || { badgeClass: "bg-muted text-foreground border-border" };
                                            return (
                                              <span
                                                key={sp}
                                                className={cn(
                                                  "text-[9px] px-1.5 py-0 rounded font-semibold border",
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
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {collab.team && specs.length === 0 && (
                                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                        {collab.team}
                                      </Badge>
                                    )}
                                    <Check
                                      className={cn(
                                        "h-4 w-4 text-primary",
                                        selectedUserId === collab.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* PERÍODO E LOTE (BULK) */}
                <div className="rounded-xl border bg-card p-3 space-y-2.5">
                  {!editingEntry && (
                    <div className="flex items-center justify-between pb-1 border-b border-border/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="bulk-toggle" className="text-xs font-semibold cursor-pointer">
                          Agendar em lote (múltiplos dias)
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          Gera 1 card por dia útil (ex: implantação presencial)
                        </p>
                      </div>
                      <Switch
                        id="bulk-toggle"
                        checked={isBulk}
                        onCheckedChange={(checked) => {
                          setIsBulk(checked);
                          if (!checked) setEndDate(startDate);
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                    <div className="space-y-1">
                      <Label className="text-xs">{isBulk ? "Data Inicial *" : "Data do Agendamento *"}</Label>
                      <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal text-xs h-9"
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Selecione..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(d) => {
                              if (d) {
                                setStartDate(d);
                                if (!isBulk || isBefore(endDate, d)) {
                                  setEndDate(d);
                                }
                              }
                              setStartDatePickerOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {isBulk && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <Label className="text-xs">Data Final *</Label>
                        <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal text-xs h-9"
                            >
                              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              {endDate ? format(endDate, "PPP", { locale: ptBR }) : "Selecione..."}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              disabled={(d) => isBefore(d, startDate)}
                              onSelect={(d) => {
                                if (d) setEndDate(d);
                                setEndDatePickerOpen(false);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>

                  {isBulk && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                      <input
                        type="checkbox"
                        id="include-weekends"
                        checked={includeWeekendsAndHolidays}
                        onChange={(e) => setIncludeWeekendsAndHolidays(e.target.checked)}
                        className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <label htmlFor="include-weekends" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                        Incluir fins de semana e feriados no agendamento em lote
                      </label>
                    </div>
                  )}
                </div>

                {/* HORÁRIOS */}
                <div className="rounded-xl border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allday-toggle" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        Dia Todo (08:30 às 17:30)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Aloca expediente padrão com visualização proporcional
                      </p>
                    </div>
                    <Switch
                      id="allday-toggle"
                      checked={isAllDay}
                      onCheckedChange={setIsAllDay}
                    />
                  </div>

                  {!isAllDay && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1 animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <Label htmlFor="start-time" className="text-[11px]">Horário de Início</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="end-time" className="text-[11px]">Horário de Término</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ALERTAS DE CONFLITOS */}
                {conflicts?.hasVacationConflict && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300 text-xs animate-in fade-in">
                    <Palmtree className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold leading-tight text-[11px]">Atenção: Período de Férias do Analista</p>
                      <p className="text-[10px] leading-relaxed opacity-90">
                        <strong>{selectedUserName}</strong> possui férias de <strong>{conflicts.vacationConflicts[0].start_date}</strong> até <strong>{conflicts.vacationConflicts[0].end_date}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* OBSERVAÇÕES */}
                <div className="space-y-1">
                  <Label htmlFor="observations" className="text-xs font-semibold">
                    Observações / Instruções
                  </Label>
                  <Textarea
                    id="observations"
                    placeholder="Instruções para o analista, dados de acesso ou particularidades..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="h-16 text-xs resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER FIXO */}
          <DialogFooter className="p-3 sm:p-4 border-t bg-muted/20 gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs h-9 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingEntry ? "Salvar Alterações" : "Salvar Agendamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
