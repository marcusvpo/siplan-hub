import { useState, useMemo } from "react";
import { useVacations, Vacation, VacationInput } from "@/hooks/useVacations";
import { usePermissions } from "@/hooks/usePermissions";
import { CALENDAR_MEMBERS, CalendarMember } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  isWithinInterval,
  differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Palmtree,
  AlertCircle,
  AlertTriangle,
  Search,
  Users,
  Clock,
  CalendarDays,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminListPager } from "@/components/Admin/AdminListPagination";
import { useAdminListPagination } from "@/hooks/useAdminListPagination";
import { normalizeText } from "@/lib/project-calendar-events";

export default function VacationManagement() {
  const {
    vacations,
    isLoading,
    addVacation,
    updateVacation,
    deleteVacation,
    checkOverlapWithExisting,
  } = useVacations();

  // Permissões do recurso de férias
  const { hasPermission } = usePermissions();
  const canCreateVacations = hasPermission("vacations", "create");
  const canEditVacations = hasPermission("vacations", "edit");
  const canDeleteVacations = hasPermission("vacations", "delete");

  // Estado das Abas e Filtros
  const [activeTab, setActiveTab] = useState<"by-implantador" | "all-list">(
    "by-implantador"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in-progress" | "scheduled" | "completed"
  >("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  // Modais de Criação/Edição e Exclusão
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [vacationToDelete, setVacationToDelete] = useState<string | null>(null);
  const [isPreselectedMember, setIsPreselectedMember] = useState(false);

  const [formData, setFormData] = useState<VacationInput>({
    implantador_name: "",
    implantador_id: null,
    start_date: "",
    end_date: "",
    description: "",
  });

  // Lista unificada de membros (CALENDAR_MEMBERS + eventuais membros adicionais presentes em vacations)
  const allMembers = useMemo<CalendarMember[]>(() => {
    const list = [...CALENDAR_MEMBERS];
    const knownIds = new Set(list.map((m) => m.id));
    const knownNames = new Set(list.map((m) => normalizeText(m.name)));

    vacations.forEach((v) => {
      const norm = normalizeText(v.implantador_name);
      if (!knownNames.has(norm) && v.implantador_id && !knownIds.has(v.implantador_id)) {
        knownIds.add(v.implantador_id);
        knownNames.add(norm);
        list.push({
          id: v.implantador_id,
          name: v.implantador_name,
          initials: v.implantador_name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase(),
          role: "Implantador",
          color: "bg-slate-600",
          defaultSystem: "Geral",
        });
      }
    });

    return list;
  }, [vacations]);

  // Helpers de Status e Duração
  const getVacationStatus = (vacation: Vacation) => {
    const today = new Date();
    try {
      const start = parseISO(vacation.start_date);
      const end = parseISO(vacation.end_date);

      if (isWithinInterval(today, { start, end })) {
        return {
          id: "in-progress" as const,
          label: "Em andamento",
          variant: "default" as const,
          className:
            "bg-emerald-600 hover:bg-emerald-700 text-white font-bold animate-pulse",
        };
      }
      if (isBefore(today, start)) {
        return {
          id: "scheduled" as const,
          label: "Agendada",
          variant: "secondary" as const,
          className:
            "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-semibold",
        };
      }
      return {
        id: "completed" as const,
        label: "Concluída",
        variant: "outline" as const,
        className: "text-muted-foreground",
      };
    } catch {
      return {
        id: "scheduled" as const,
        label: "Agendada",
        variant: "secondary" as const,
        className: "",
      };
    }
  };

  const getDurationDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0;
    try {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      const diff = differenceInCalendarDays(e, s);
      return diff >= 0 ? diff + 1 : 0;
    } catch {
      return 0;
    }
  };

  const getMemberColor = (implantadorId: string | null) => {
    if (!implantadorId) return "bg-gray-500";
    const member = allMembers.find((m) => m.id === implantadorId);
    return member?.color || "bg-gray-500";
  };

  // KPIs Executivos
  const kpiStats = useMemo(() => {
    const today = new Date();
    const totalPeriods = vacations.length;

    const uniqueMembers = new Set(
      vacations.map((v) => normalizeText(v.implantador_name))
    );

    let inProgressCount = 0;
    let nextVacation: { vacation: Vacation; daysToStart: number } | null = null;

    vacations.forEach((v) => {
      try {
        const start = parseISO(v.start_date);
        const end = parseISO(v.end_date);
        if (isWithinInterval(today, { start, end })) {
          inProgressCount++;
        } else if (isBefore(today, start)) {
          const daysToStart = differenceInCalendarDays(start, today);
          if (!nextVacation || daysToStart < nextVacation.daysToStart) {
            nextVacation = { vacation: v, daysToStart };
          }
        }
      } catch {
        // Ignora data inválida
      }
    });

    return {
      totalPeriods,
      uniqueMembersCount: uniqueMembers.size,
      totalTeamMembers: allMembers.length,
      inProgressCount,
      nextVacation,
    };
  }, [vacations, allMembers]);

  // Lista filtrada para a visualização geral
  const filteredVacations = useMemo(() => {
    return vacations.filter((v) => {
      // Filtro de busca de texto
      if (searchQuery.trim()) {
        const query = normalizeText(searchQuery);
        const matchesName = normalizeText(v.implantador_name).includes(query);
        const matchesDesc = normalizeText(v.description || "").includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Filtro por implantador
      if (memberFilter !== "all") {
        const matchesId = v.implantador_id === memberFilter;
        const matchesName =
          normalizeText(v.implantador_name) === normalizeText(memberFilter);
        if (!matchesId && !matchesName) return false;
      }

      // Filtro de status
      if (statusFilter !== "all") {
        const status = getVacationStatus(v);
        if (status.id !== statusFilter) return false;
      }

      return true;
    });
  }, [vacations, searchQuery, memberFilter, statusFilter]);

  const pagination = useAdminListPagination(filteredVacations);

  // Manipulação de Formulário e Modais
  const resetForm = () => {
    setFormData({
      implantador_name: "",
      implantador_id: null,
      start_date: "",
      end_date: "",
      description: "",
    });
    setEditingVacation(null);
    setIsPreselectedMember(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenCreateForMember = (member: CalendarMember) => {
    resetForm();
    setFormData({
      implantador_name: member.name,
      implantador_id: member.id,
      start_date: "",
      end_date: "",
      description: "",
    });
    setIsPreselectedMember(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (vacation: Vacation) => {
    setEditingVacation(vacation);
    setFormData({
      implantador_name: vacation.implantador_name,
      implantador_id: vacation.implantador_id,
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      description: vacation.description || "",
    });
    setIsPreselectedMember(false);
    setDialogOpen(true);
  };

  const handleMemberSelect = (memberId: string) => {
    const member = allMembers.find((m) => m.id === memberId);
    if (member) {
      setFormData((prev) => ({
        ...prev,
        implantador_name: member.name,
        implantador_id: member.id,
      }));
    }
  };

  // Validação em tempo real do modal
  const formValidation = useMemo(() => {
    const isEndDateBeforeStart =
      Boolean(formData.start_date) &&
      Boolean(formData.end_date) &&
      formData.end_date < formData.start_date;

    const durationDays = getDurationDays(formData.start_date, formData.end_date);

    const overlap =
      formData.implantador_name && formData.start_date && formData.end_date
        ? checkOverlapWithExisting(
            formData.implantador_id || formData.implantador_name,
            formData.start_date,
            formData.end_date,
            editingVacation?.id
          )
        : null;

    return {
      isEndDateBeforeStart,
      durationDays,
      overlap,
      isValid:
        Boolean(formData.implantador_name) &&
        Boolean(formData.start_date) &&
        Boolean(formData.end_date) &&
        !isEndDateBeforeStart,
    };
  }, [formData, editingVacation, checkOverlapWithExisting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValidation.isValid) return;

    if (editingVacation) {
      if (!canEditVacations) return;
      await updateVacation.mutateAsync({ id: editingVacation.id, ...formData });
    } else {
      if (!canCreateVacations) return;
      await addVacation.mutateAsync(formData);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDeleteClick = (id: string) => {
    setVacationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!canDeleteVacations) return;
    if (vacationToDelete) {
      await deleteVacation.mutateAsync(vacationToDelete);
      setDeleteDialogOpen(false);
      setVacationToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-0 sm:space-y-6 sm:p-6 max-w-7xl mx-auto">
      {/* Cabeçalho Executivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <Palmtree className="h-6 w-6" />
            </div>
            Gestão de Escala e Férias
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cadastre múltiplos períodos de férias para cada implantador. Todas as datas são
            sincronizadas em tempo real com a Timeline em{" "}
            <span className="font-semibold text-foreground">/calendar</span> e alertam em novos
            agendamentos da Fase 1.
          </p>
        </div>
        {canCreateVacations && (
          <Button
            onClick={handleOpenCreate}
            className="w-full bg-[#d3123f] hover:bg-[#b01034] text-white shadow-md sm:w-auto font-bold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Novo Período
          </Button>
        )}
      </div>

      {/* Cards de KPIs Executivos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="border border-border/80 bg-card shadow-sm hover:border-primary/40 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Total de Períodos</span>
              <Palmtree className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {kpiStats.totalPeriods}
              </span>
              <span className="text-xs text-muted-foreground">cadastrados</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Múltiplos períodos por implantador
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-sm hover:border-primary/40 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Implantadores</span>
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {kpiStats.uniqueMembersCount}
              </span>
              <span className="text-xs text-muted-foreground">
                de {kpiStats.totalTeamMembers} membros
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Com descanso agendado</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-sm hover:border-primary/40 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Em Andamento</span>
              <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {kpiStats.inProgressCount}
              </span>
              <span className="text-xs text-muted-foreground">neste momento</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Colaboradores ausentes hoje</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-sm hover:border-primary/40 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Próximo Período</span>
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            {kpiStats.nextVacation ? (
              <div className="mt-2">
                <div className="truncate text-sm font-bold text-foreground">
                  {kpiStats.nextVacation.vacation.implantador_name}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span>
                    {format(parseISO(kpiStats.nextVacation.vacation.start_date), "dd/MM/yyyy")}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    (em {kpiStats.nextVacation.daysToStart} dias)
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm font-bold text-muted-foreground">Nenhum no radar</div>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">Próxima saída planejada</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Integração com /calendar */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300/80 bg-amber-50/70 p-3.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-extrabold text-amber-900 dark:text-amber-300">
            Sincronização 100% Automática com a Timeline de Implantações (/calendar)
          </p>
          <p className="text-amber-800/90 dark:text-amber-200/90">
            Você pode cadastrar <strong>inúmeros períodos de férias</strong> para o mesmo
            implantador (ex: recesso de fim de ano, férias regulares de 15/30 dias, licenças). Cada
            período é plotado automaticamente na raia do implantador na Timeline e protege contra
            conflitos de agendamento na Fase 1.
          </p>
        </div>
      </div>

      {/* Tabs de Visualização: Por Implantador vs Lista Geral */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "by-implantador" | "all-list")}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="by-implantador" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Por Implantador</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {allMembers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all-list" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Lista Geral Cronológica</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {vacations.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador ou motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: VISÃO POR IMPLANTADOR (Cards com Múltiplos Períodos)                */}
        {/* ========================================================================= */}
        <TabsContent
          value="by-implantador"
          forceMount
          className="space-y-4 mt-0 data-[state=inactive]:hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMembers
              .filter((m) => {
                if (!searchQuery.trim()) return true;
                const q = normalizeText(searchQuery);
                return (
                  normalizeText(m.name).includes(q) ||
                  normalizeText(m.role).includes(q) ||
                  normalizeText(m.defaultSystem || "").includes(q)
                );
              })
              .map((member) => {
                // Períodos de férias pertencentes a este implantador
                const memberVacations = vacations
                  .filter((v) => {
                    const matchesId = v.implantador_id === member.id;
                    const matchesName =
                      normalizeText(v.implantador_name) === normalizeText(member.name);
                    return matchesId || matchesName;
                  })
                  .sort((a, b) => a.start_date.localeCompare(b.start_date));

                const totalDays = memberVacations.reduce(
                  (acc, v) => acc + getDurationDays(v.start_date, v.end_date),
                  0
                );

                return (
                  <Card
                    key={member.id}
                    className="flex flex-col border border-border/80 bg-card shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Header do Card com Avatar e Ação de Adicionar */}
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm",
                              member.color || "bg-rose-600"
                            )}
                          >
                            {member.initials ||
                              member.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold text-foreground leading-tight">
                              {member.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                                {member.defaultSystem || member.role}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Botão para adicionar novo período diretamente para este implantador */}
                        {canCreateVacations && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCreateForMember(member)}
                            className="h-8 text-xs font-semibold hover:border-primary hover:text-primary gap-1"
                            title={`Adicionar novo período de férias para ${member.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>+ Período</span>
                          </Button>
                        )}
                      </div>

                      {/* Resumo de dias e períodos */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
                        <span className="font-medium">
                          {memberVacations.length === 0
                            ? "Nenhum período agendado"
                            : memberVacations.length === 1
                            ? "1 período cadastrado"
                            : `${memberVacations.length} períodos cadastrados`}
                        </span>
                        {totalDays > 0 && (
                          <span className="font-bold text-foreground">
                            {totalDays} {totalDays === 1 ? "dia" : "dias corridos"}
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    {/* Lista dos Períodos Cadastrados deste Implantador */}
                    <CardContent className="p-4 flex-1 flex flex-col justify-between">
                      {memberVacations.length === 0 ? (
                        <div className="my-auto py-6 text-center text-muted-foreground">
                          <Palmtree className="h-8 w-8 mx-auto mb-2 opacity-30 text-rose-500" />
                          <p className="text-xs">Sem férias cadastradas</p>
                          {canCreateVacations && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCreateForMember(member)}
                              className="mt-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              + Cadastrar 1º período
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {memberVacations.map((vacation, idx) => {
                            const status = getVacationStatus(vacation);
                            const duration = getDurationDays(
                              vacation.start_date,
                              vacation.end_date
                            );

                            return (
                              <div
                                key={vacation.id}
                                className="group relative rounded-lg border border-border/70 bg-background/50 p-3 hover:border-primary/40 hover:bg-background transition-all"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-foreground">
                                        Período #{idx + 1}
                                      </span>
                                      <Badge
                                        variant={status.variant}
                                        className={cn("text-[10px] py-0 px-1.5", status.className)}
                                      >
                                        {status.label}
                                      </Badge>
                                    </div>

                                    {/* Datas formatadas */}
                                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span>
                                        {format(parseISO(vacation.start_date), "dd/MM/yyyy")} a{" "}
                                        {format(parseISO(vacation.end_date), "dd/MM/yyyy")}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground font-normal">
                                        ({duration}d)
                                      </span>
                                    </div>

                                    {/* Observação / Motivo */}
                                    {vacation.description && (
                                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                                        "{vacation.description}"
                                      </p>
                                    )}
                                  </div>

                                  {/* Ações do Período */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => handleOpenEdit(vacation)}
                                      disabled={!canEditVacations}
                                      title="Editar este período"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {canDeleteVacations && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteClick(vacation.id)}
                                        title="Excluir este período"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: LISTA GERAL CRONOLÓGICA (Tabela Paginada mobile-card-table)         */}
        {/* ========================================================================= */}
        <TabsContent
          value="all-list"
          forceMount
          className="space-y-4 mt-0 data-[state=inactive]:hidden"
        >
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Todos os Períodos de Férias
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Exibindo {filteredVacations.length} período(s) de férias cadastrados no total
                  </CardDescription>
                </div>

                {/* Filtros da Tabela */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="in-progress">Em andamento</SelectItem>
                      <SelectItem value="scheduled">Agendadas</SelectItem>
                      <SelectItem value="completed">Concluídas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={memberFilter} onValueChange={setMemberFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Implantador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Colaboradores</SelectItem>
                      {allMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredVacations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Palmtree className="h-12 w-12 mx-auto mb-3 opacity-30 text-rose-500" />
                  <p className="font-semibold text-sm">Nenhum período de férias encontrado</p>
                  <p className="text-xs mt-1">Ajuste os filtros ou adicione novos períodos</p>
                </div>
              ) : (
                <div className="mobile-card-table w-full overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Implantador</TableHead>
                        <TableHead>Período de Férias</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Descrição / Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.pageItems.map((vacation) => {
                        const status = getVacationStatus(vacation);
                        const duration = getDurationDays(vacation.start_date, vacation.end_date);

                        return (
                          <TableRow key={vacation.id}>
                            <TableCell data-label="Implantador">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "h-3 w-3 rounded-full shrink-0",
                                    getMemberColor(vacation.implantador_id)
                                  )}
                                />
                                <span className="font-bold text-foreground">
                                  {vacation.implantador_name}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell data-label="Período">
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <span>
                                  {format(parseISO(vacation.start_date), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                                <span className="text-muted-foreground">até</span>
                                <span>
                                  {format(parseISO(vacation.end_date), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell data-label="Duração">
                              <span className="text-xs font-medium text-muted-foreground">
                                {duration} {duration === 1 ? "dia" : "dias corridos"}
                              </span>
                            </TableCell>

                            <TableCell
                              data-label="Descrição"
                              className="max-w-xs truncate text-xs text-muted-foreground"
                            >
                              {vacation.description || "-"}
                            </TableCell>

                            <TableCell data-label="Status">
                              <Badge
                                variant={status.variant}
                                className={cn("text-[10px]", status.className)}
                              >
                                {status.label}
                              </Badge>
                            </TableCell>

                            <TableCell data-label="Ações" className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleOpenEdit(vacation)}
                                  disabled={!canEditVacations}
                                  title="Editar período"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {canDeleteVacations && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteClick(vacation.id)}
                                    title="Excluir período"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="p-3 border-t">
                    <AdminListPager
                      page={pagination.page}
                      pageSize={pagination.pageSize}
                      total={filteredVacations.length}
                      totalPages={pagination.totalPages}
                      onPageChange={pagination.setPage}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* DIALOG DE CADASTRO / EDIÇÃO DE PERÍODO                                     */}
      {/* ========================================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palmtree className="h-5 w-5 text-rose-600" />
              {editingVacation ? "Editar Período de Férias" : "Cadastrar Período de Férias"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingVacation
                ? "Altere os dados deste período de descanso."
                : "Defina o colaborador e o período de descanso. Você pode cadastrar múltiplos períodos para o mesmo implantador."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seleção do Implantador */}
            <div className="space-y-1.5">
              <Label htmlFor="implantador" className="text-xs font-semibold">
                Implantador Responsável
              </Label>
              {isPreselectedMember ? (
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        getMemberColor(formData.implantador_id)
                      )}
                    />
                    <span>{formData.implantador_name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Fixado
                  </Badge>
                </div>
              ) : (
                <Select
                  value={formData.implantador_id || ""}
                  onValueChange={handleMemberSelect}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o implantador" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn("h-2.5 w-2.5 rounded-full shrink-0", member.color)}
                          />
                          <span className="font-medium">{member.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({member.defaultSystem || member.role})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Intervalo de Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs font-semibold">
                  Data de Início
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end_date" className="text-xs font-semibold">
                  Data de Término
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Pílula de Duração Estimada */}
            {formData.start_date && formData.end_date && !formValidation.isEndDateBeforeStart && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Duração estimada:
                </span>
                <span className="font-bold text-foreground">
                  {formValidation.durationDays}{" "}
                  {formValidation.durationDays === 1 ? "dia" : "dias corridos"}
                </span>
              </div>
            )}

            {/* Erro se data fim for menor que data início */}
            {formValidation.isEndDateBeforeStart && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>A data de término deve ser igual ou posterior à data de início.</span>
              </div>
            )}

            {/* Alerta de Sobreposição com outro período existente do mesmo implantador */}
            {formValidation.overlap && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/60 bg-amber-500/10 p-2.5 text-xs text-amber-950 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Atenção: Sobreposição de Período</p>
                  <p className="text-[11px] leading-tight text-amber-900/90 dark:text-amber-200/90">
                    Este período colide com férias já existentes de{" "}
                    <strong>
                      {format(parseISO(formValidation.overlap.start_date), "dd/MM/yyyy")} a{" "}
                      {format(parseISO(formValidation.overlap.end_date), "dd/MM/yyyy")}
                    </strong>{" "}
                    de {formValidation.overlap.implantador_name}.
                  </p>
                </div>
              </div>
            )}

            {/* Observações / Motivo */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Observações / Motivo (opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Ex: Férias regulares de verão, recesso de final de ano..."
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#d3123f] hover:bg-[#b01034] text-white font-bold"
                disabled={
                  !formValidation.isValid ||
                  (editingVacation ? !canEditVacations : !canCreateVacations)
                }
              >
                {editingVacation ? "Salvar Alterações" : "Cadastrar Período"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmar Exclusão de Período
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja excluir este período de férias? A exclusão removerá o bloqueio
              correspondente na Timeline de Implantações (/calendar).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
