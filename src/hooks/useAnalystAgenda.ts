import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, addDays, isAfter } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsV2 } from "@/hooks/useProjectsV2";
import { useVacations } from "@/hooks/useVacations";
import { getWeekdayHolidaysInRange } from "@/lib/calendar-holidays";
import { unifyAgendaEvents } from "@/lib/agenda-unifier";
import type { AnalystAgendaEntry, NewAgendaEntryInput, UnifiedAgendaEvent } from "@/types/agenda";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface UseAnalystAgendaProps {
  startDate: Date;
  endDate: Date;
  selectedUserNames?: string[];
  selectedActivityTypes?: string[];
}

export function useAnalystAgenda({
  startDate,
  endDate,
  selectedUserNames = [],
  selectedActivityTypes = [],
}: UseAnalystAgendaProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjectsV2();
  const { vacations, isLoading: vacationsLoading } = useVacations();

  const startIso = format(startOfDay(startDate), "yyyy-MM-dd");
  const endIso = format(startOfDay(endDate), "yyyy-MM-dd");

  // 1. Busca os lançamentos manuais no Supabase
  const {
    data: manualEntries = [],
    isLoading: entriesLoading,
    error: entriesError,
    refetch,
  } = useQuery<AnalystAgendaEntry[]>({
    queryKey: ["analystAgendaEntries", startIso, endIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyst_agenda_entries")
        .select("*")
        .gte("date", startIso)
        .lte("date", endIso)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("Erro ao carregar analyst_agenda_entries:", error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        ticketNumber: row.ticket_number,
        ticketCatalog: row.ticket_catalog,
        clientName: row.client_name,
        clientCode: row.client_code,
        subject: row.subject,
        activityType: row.activity_type,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        isAllDay: row.is_all_day,
        observations: row.observations,
        ticketData: row.ticket_data,
        bulkGroupId: row.bulk_group_id,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    staleTime: 30_000,
  });

  // 2. Feriados do período
  const holidays = useMemo(() => {
    return getWeekdayHolidaysInRange(startDate, endDate);
  }, [startDate, endDate]);

  // 3. Unificação de todos os eventos
  const events = useMemo(() => {
    return unifyAgendaEvents({
      manualEntries,
      projects,
      vacations,
      startDate,
      endDate,
      selectedUserNames,
      selectedActivityTypes,
    });
  }, [
    manualEntries,
    projects,
    vacations,
    startDate,
    endDate,
    selectedUserNames,
    selectedActivityTypes,
  ]);

  // 4. Métricas e KPIs
  const kpiStats = useMemo(() => {
    const totalEvents = events.length;
    const implementations = events.filter((e) => e.activityType === "implantacao").length;
    const adherenceAndHomolog = events.filter((e) => e.activityType === "aderencia" || e.activityType === "homologacao").length;
    const tickets = events.filter((e) => e.activityType === "chamado" || e.activityType === "apoio_sd" || e.activityType === "configuracao" || e.activityType === "migracao").length;

    // Contagem de dias distintos com atividade
    const distinctDays = new Set(events.map((e) => e.date)).size;

    return {
      totalEvents,
      implementations,
      adherenceAndHomolog,
      tickets,
      distinctDays,
      holidaysCount: holidays.length,
    };
  }, [events, holidays]);

  // 5. Mutação de Criação (Suporte a Lançamento Único e Lote / Bulk)
  const createEntryMutation = useMutation({
    mutationFn: async (input: NewAgendaEntryInput) => {
      const datesToSchedule: string[] = [];

      if (input.endDate && input.endDate !== input.date) {
        // Modo em lote (Bulk)
        let cur = startOfDay(new Date(`${input.date}T12:00:00`));
        const end = startOfDay(new Date(`${input.endDate}T12:00:00`));

        while (!isAfter(cur, end)) {
          const dayOfWeek = cur.getDay(); // 0 = Dom, 6 = Sáb
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          if (input.includeWeekendsAndHolidays || !isWeekend) {
            datesToSchedule.push(format(cur, "yyyy-MM-dd"));
          }
          cur = addDays(cur, 1);
        }
      } else {
        datesToSchedule.push(input.date);
      }

      if (datesToSchedule.length === 0) {
        throw new Error("Nenhuma data válida selecionada para agendamento.");
      }

      const bulkGroupId = datesToSchedule.length > 1 ? crypto.randomUUID() : null;

      const rowsToInsert = datesToSchedule.map((dateStr) => ({
        user_id: input.userId,
        user_name: input.userName,
        ticket_number: input.ticketNumber,
        ticket_catalog: input.ticketCatalog,
        client_name: input.clientName,
        client_code: input.clientCode || null,
        subject: input.subject,
        activity_type: input.activityType,
        date: dateStr,
        start_time: input.isAllDay ? null : input.startTime || null,
        end_time: input.isAllDay ? null : input.endTime || null,
        is_all_day: input.isAllDay,
        observations: input.observations || null,
        ticket_data: (input.ticketData || {}) as any,
        bulk_group_id: bulkGroupId,
        created_by: user?.id || null,
      }));

      const { data, error } = await supabase
        .from("analyst_agenda_entries")
        .insert(rowsToInsert as any)
        .select();

      if (error) {
        console.error("Erro ao inserir analyst_agenda_entries:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      const count = Array.isArray(data) ? data.length : 1;
      toast.success(
        count > 1
          ? `${count} agendamentos cadastrados com sucesso em lote!`
          : "Agendamento cadastrado com sucesso!"
      );
      queryClient.invalidateQueries({ queryKey: ["analystAgendaEntries"] });
    },
    onError: (err: any) => {
      toast.error(`Falha ao cadastrar agendamento: ${err.message || "Erro desconhecido"}`);
    },
  });

  // 6. Mutação de Atualização
  const updateEntryMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<NewAgendaEntryInput>;
    }) => {
      const payload: Record<string, unknown> = {};
      if (updates.userId !== undefined) payload.user_id = updates.userId;
      if (updates.userName !== undefined) payload.user_name = updates.userName;
      if (updates.ticketNumber !== undefined) payload.ticket_number = updates.ticketNumber;
      if (updates.ticketCatalog !== undefined) payload.ticket_catalog = updates.ticketCatalog;
      if (updates.clientName !== undefined) payload.client_name = updates.clientName;
      if (updates.clientCode !== undefined) payload.client_code = updates.clientCode;
      if (updates.subject !== undefined) payload.subject = updates.subject;
      if (updates.activityType !== undefined) payload.activity_type = updates.activityType;
      if (updates.date !== undefined) payload.date = updates.date;
      if (updates.isAllDay !== undefined) {
        payload.is_all_day = updates.isAllDay;
        payload.start_time = updates.isAllDay ? null : updates.startTime || null;
        payload.end_time = updates.isAllDay ? null : updates.endTime || null;
      }
      if (updates.observations !== undefined) payload.observations = updates.observations;
      if (updates.ticketData !== undefined) payload.ticket_data = updates.ticketData;

      const { data, error } = await supabase
        .from("analyst_agenda_entries")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Agendamento atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["analystAgendaEntries"] });
    },
    onError: (err: any) => {
      toast.error(`Falha ao atualizar agendamento: ${err.message || "Erro desconhecido"}`);
    },
  });

  // 7. Mutação de Exclusão (com suporte a remover em lote)
  const deleteEntryMutation = useMutation({
    mutationFn: async ({
      id,
      deleteAllInBulk = false,
      bulkGroupId,
    }: {
      id: string;
      deleteAllInBulk?: boolean;
      bulkGroupId?: string | null;
    }) => {
      let query = supabase.from("analyst_agenda_entries").delete();

      if (deleteAllInBulk && bulkGroupId) {
        query = query.eq("bulk_group_id", bulkGroupId);
      } else {
        query = query.eq("id", id);
      }

      const { error } = await query;
      if (error) throw error;
      return { id, deleteAllInBulk };
    },
    onSuccess: ({ deleteAllInBulk }) => {
      toast.success(
        deleteAllInBulk
          ? "Todos os agendamentos da sequência foram removidos com sucesso!"
          : "Agendamento removido da agenda!"
      );
      queryClient.invalidateQueries({ queryKey: ["analystAgendaEntries"] });
    },
    onError: (err: any) => {
      toast.error(`Falha ao remover agendamento: ${err.message || "Erro desconhecido"}`);
    },
  });

  return {
    events,
    holidays,
    kpiStats,
    isLoading: entriesLoading || projectsLoading || vacationsLoading,
    error: entriesError,
    refetch,
    createEntry: createEntryMutation.mutateAsync,
    isCreating: createEntryMutation.isPending,
    updateEntry: updateEntryMutation.mutateAsync,
    isUpdating: updateEntryMutation.isPending,
    deleteEntry: deleteEntryMutation.mutateAsync,
    isDeleting: deleteEntryMutation.isPending,
  };
}
