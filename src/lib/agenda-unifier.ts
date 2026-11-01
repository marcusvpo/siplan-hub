import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import type { ProjectV2 } from "@/types/ProjectV2";
import type { AnalystAgendaEntry, UnifiedAgendaEvent, TicketCatalog, AgendaActivityType } from "@/types/agenda";
import type { Vacation } from "@/hooks/useVacations";
import { normalizeText, resolveCalendarMembersForResponsible } from "./project-calendar-events";
import { extractCleanObservations } from "./project-calendar-events";

export interface UnifyAgendaOptions {
  manualEntries?: AnalystAgendaEntry[];
  projects?: ProjectV2[];
  vacations?: Vacation[];
  startDate: Date;
  endDate: Date;
  selectedUserNames?: string[]; // Se filtrado por usuários
  selectedActivityTypes?: string[]; // Se filtrado por atividades
}

/**
 * Detecta se o software do projeto pertence à linha Orion ou Legada.
 */
export function detectTicketCatalog(systemType?: string | null): TicketCatalog {
  const norm = normalizeText(systemType);
  if (!norm) return "orion";
  if (
    norm.includes("control-m") ||
    norm.includes("controlm") ||
    norm.includes("global") ||
    (norm.includes("siplan") && !norm.includes("nfse"))
  ) {
    return "legacy";
  }
  return "orion";
}

/**
 * Converte data ISO ou Date para string YYYY-MM-DD.
 */
function toDateIso(val: Date | string | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return format(d, "yyyy-MM-dd");
  }
  if (isNaN(val.getTime())) return null;
  return format(val, "yyyy-MM-dd");
}

/**
 * Retorna todos os dias entre startDate e endDate (inclusive) em formato ISO YYYY-MM-DD.
 */
function getDaysInRange(startDate: Date, endDate: Date): string[] {
  const days: string[] = [];
  let current = startOfDay(startDate);
  const end = startOfDay(endDate);

  if (isAfter(current, end)) {
    const temp = current;
    current = end;
  }

  while (!isAfter(current, end)) {
    days.push(format(current, "yyyy-MM-dd"));
    current = addDays(current, 1);
  }
  return days;
}

/**
 * Ordem de prioridade para exibição e divisão de horas no dia:
 * 1. Aderência, Homologação e Preparação de Ambiente (prioridade máxima do projeto)
 * 2. Implantação Fase 1
 * 3. Demais chamados e atividades
 */
function getActivityPriority(event: UnifiedAgendaEvent): number {
  if (
    event.origin === "adherence" ||
    event.origin === "conversion_homologation" ||
    event.origin === "environment_preparation"
  ) {
    return 1;
  }
  if (event.origin === "phase1_implementation") {
    return 2;
  }
  return 3;
}

/**
 * Aplica a regra de divisão proporcional de horas nos eventos do mesmo dia para cada usuário.
 * - 1 evento dia todo: 08:30 às 17:30
 * - 2 eventos dia todo: 1º (08:30 às 12:30), 2º (13:30 às 17:30)
 * - 3 eventos dia todo: 1º (08:30 às 11:30), 2º (11:30 às 14:30), 3º (14:30 às 17:30)
 */
function balanceDayHoursForUser(events: UnifiedAgendaEvent[]): UnifiedAgendaEvent[] {
  // Separa eventos com horário fixo manual daqueles que são dia todo
  const fixedEvents = events.filter((e) => !e.isAllDay && e.startTime && e.endTime);
  const allDayEvents = events.filter((e) => e.isAllDay || !e.startTime || !e.endTime);

  if (allDayEvents.length === 0) {
    return fixedEvents;
  }

  // Ordena os eventos dia todo por prioridade no topo
  allDayEvents.sort((a, b) => getActivityPriority(a) - getActivityPriority(b));

  if (allDayEvents.length === 1) {
    allDayEvents[0].startTime = allDayEvents[0].startTime || "08:30";
    allDayEvents[0].endTime = allDayEvents[0].endTime || "17:30";
  } else if (allDayEvents.length === 2) {
    allDayEvents[0].startTime = "08:30";
    allDayEvents[0].endTime = "12:30";
    allDayEvents[1].startTime = "13:30";
    allDayEvents[1].endTime = "17:30";
  } else {
    // 3 ou mais eventos: divide em 1/3 do dia
    allDayEvents[0].startTime = "08:30";
    allDayEvents[0].endTime = "11:30";
    allDayEvents[1].startTime = "11:30";
    allDayEvents[1].endTime = "14:30";
    for (let i = 2; i < allDayEvents.length; i++) {
      allDayEvents[i].startTime = "14:30";
      allDayEvents[i].endTime = "17:30";
    }
  }

  return [...allDayEvents, ...fixedEvents];
}

/**
 * Unifica todas as fontes de eventos para a Agenda Siplan:
 * 1. Lançamentos manuais de `analyst_agenda_entries`
 * 2. Implantações Fase 1 (desdobradas em 1 card por dia)
 * 3. Análise de Aderência (Etapa 2)
 * 4. Homologação da Conversão (Etapa 3)
 * 5. Preparação de Ambiente & Infraestrutura (Etapa 4)
 * 6. Férias de `implantador_vacations`
 */
export function unifyAgendaEvents({
  manualEntries = [],
  projects = [],
  vacations = [],
  startDate,
  endDate,
  selectedUserNames,
  selectedActivityTypes,
}: UnifyAgendaOptions): UnifiedAgendaEvent[] {
  const startIso = format(startOfDay(startDate), "yyyy-MM-dd");
  const endIso = format(startOfDay(endDate), "yyyy-MM-dd");

  const normalizedUserFilter = selectedUserNames?.map(normalizeText).filter(Boolean);
  const userFilterSet = normalizedUserFilter && normalizedUserFilter.length > 0
    ? new Set(normalizedUserFilter)
    : null;

  const activityFilterSet = selectedActivityTypes && selectedActivityTypes.length > 0
    ? new Set(selectedActivityTypes)
    : null;

  const matchesUser = (name?: string | null): boolean => {
    if (!userFilterSet) return true;
    const norm = normalizeText(name);
    if (!norm) return false;
    for (const filterItem of userFilterSet) {
      if (norm.includes(filterItem) || filterItem.includes(norm)) return true;
    }
    return false;
  };

  const matchesActivity = (type: AgendaActivityType): boolean => {
    if (!activityFilterSet) return true;
    return activityFilterSet.has(type);
  };

  const allEvents: UnifiedAgendaEvent[] = [];

  // 1. Processar Lançamentos Manuais de analyst_agenda_entries
  for (const entry of manualEntries) {
    if (entry.date < startIso || entry.date > endIso) continue;
    if (!matchesUser(entry.userName)) continue;
    if (!matchesActivity(entry.activityType)) continue;

    allEvents.push({
      id: `manual-${entry.id}`,
      rawEntryId: entry.id,
      origin: "manual_entry",
      date: entry.date,
      userId: entry.userId,
      userName: entry.userName,
      ticketNumber: entry.ticketNumber,
      ticketCatalog: entry.ticketCatalog,
      clientName: entry.clientName,
      subject: entry.subject,
      activityType: entry.activityType,
      startTime: entry.startTime,
      endTime: entry.endTime,
      isAllDay: entry.isAllDay,
      observations: entry.observations,
      ticketData: entry.ticketData as any,
      bulkGroupId: entry.bulkGroupId,
    });
  }

  // 2. Processar Projetos do HUB (Fase 1, Aderência, Homologação e Preparação de Ambiente)
  for (const project of projects) {
    if (!project || project.isDeleted) continue;

    const stages = project.stages;
    const ticketNumber = project.ticketNumber || "";
    const catalog = detectTicketCatalog(project.systemType);

    // --- 2.1 Fase 1: Treinamento & Acompanhamento (Desdobramento 1 card por dia) ---
    const phase1 = stages?.implementation?.phase1;
    if (phase1) {
      const p1Start = toDateIso(phase1.startDate);
      const p1End = toDateIso(phase1.endDate) || p1Start;

      if (p1Start && p1End && matchesActivity("implantacao")) {
        const primaryResp = phase1.responsible?.trim() || stages?.implementation?.responsible?.trim() || "";
        const primaryMembers = resolveCalendarMembersForResponsible(primaryResp);
        const effectiveMembers = primaryMembers.length > 0 ? primaryMembers : (primaryResp ? [{ id: primaryResp, name: primaryResp }] : []);

        const days = getDaysInRange(parseISO(p1Start), parseISO(p1End));
        const { text: cleanObs } = extractCleanObservations(phase1.observations || stages?.implementation?.observations);

        for (const member of effectiveMembers) {
          if (!matchesUser(member.name)) continue;

          for (const day of days) {
            if (day < startIso || day > endIso) continue;

            allEvents.push({
              id: `phase1-${project.id}-${member.name}-${day}`,
              origin: "phase1_implementation",
              date: day,
              userName: member.name,
              ticketNumber,
              ticketCatalog: catalog,
              clientName: project.clientName,
              subject: phase1.trainingLocation ? `Implantação (${phase1.trainingLocation})` : "Implantação",
              activityType: "implantacao",
              isAllDay: true,
              isConfirmed: Boolean(phase1.isConfirmed),
              status: phase1.isConfirmed ? "Confirmada" : "Prevista",
              observations: cleanObs || undefined,
              projectId: project.id,
              systemType: project.systemType,
            });
          }
        }

        // Responsáveis Adicionais na Fase 1
        if (Array.isArray(phase1.additionalResponsibles)) {
          for (const addResp of phase1.additionalResponsibles) {
            const addName = addResp.responsible?.trim();
            if (!addName || !matchesUser(addName)) continue;

            const addStart = toDateIso(addResp.startDate) || p1Start;
            const addEnd = toDateIso(addResp.endDate) || addStart;
            const addDays = getDaysInRange(parseISO(addStart), parseISO(addEnd));

            for (const day of addDays) {
              if (day < startIso || day > endIso) continue;

              allEvents.push({
                id: `phase1-add-${project.id}-${addName}-${day}`,
                origin: "phase1_implementation",
                date: day,
                userName: addName,
                ticketNumber,
                ticketCatalog: catalog,
                clientName: project.clientName,
                subject: "Implantação (Apoio)",
                activityType: "implantacao",
                isAllDay: true,
                isConfirmed: Boolean(phase1.isConfirmed),
                status: phase1.isConfirmed ? "Confirmada" : "Prevista",
                projectId: project.id,
                systemType: project.systemType,
              });
            }
          }
        }
      }
    }

    // --- 2.2 Etapa 2: Análise de Aderência (Campo "Agendado Para" = endDate) ---
    const adherence = stages?.adherence;
    if (adherence && matchesActivity("aderencia")) {
      const adhDate = toDateIso(adherence.endDate);
      const adhResp = adherence.responsible?.trim() || project.responsibleAdherence?.trim();

      if (adhDate && adhResp && adhDate >= startIso && adhDate <= endIso && matchesUser(adhResp)) {
        const alreadyHasManual = allEvents.some(
          (e) =>
            e.date === adhDate &&
            e.activityType === "aderencia" &&
            (e.ticketNumber === ticketNumber ||
              e.clientName.toLowerCase() === project.clientName.toLowerCase())
        );

        if (!alreadyHasManual) {
          allEvents.push({
            id: `adherence-${project.id}-${adhDate}`,
            origin: "adherence",
            date: adhDate,
            userName: adhResp,
            ticketNumber,
            ticketCatalog: catalog,
            clientName: project.clientName,
            subject: "Análise de Aderência",
            activityType: "aderencia",
            isAllDay: true,
            status: adherence.status === "done" ? "Concluída" : "Agendada",
            observations: adherence.observations || undefined,
            projectId: project.id,
            systemType: project.systemType,
          });
        }
      }
    }

    // --- 2.3 Etapa 3: Conversão de Dados (Campo "Agendado Para" = homologationDate ou finishedAt) ---
    const conversion = stages?.conversion;
    if (conversion && matchesActivity("homologacao")) {
      const convDate = toDateIso(conversion.homologationDate || conversion.homologationFinishedAt);
      const convResp = conversion.homologationResponsible?.trim();

      if (convDate && convResp && convDate >= startIso && convDate <= endIso && matchesUser(convResp)) {
        const alreadyHasManual = allEvents.some(
          (e) =>
            e.date === convDate &&
            e.activityType === "homologacao" &&
            (e.ticketNumber === ticketNumber ||
              e.clientName.toLowerCase() === project.clientName.toLowerCase())
        );

        if (!alreadyHasManual) {
          allEvents.push({
            id: `conversion-${project.id}-${convDate}`,
            origin: "conversion_homologation",
            date: convDate,
            userName: convResp,
            ticketNumber,
            ticketCatalog: catalog,
            clientName: project.clientName,
            subject: "Homologação da Conversão",
            activityType: "homologacao",
            isAllDay: true,
            status: conversion.homologationStatus || "Agendada",
            observations: conversion.observations || undefined,
            projectId: project.id,
            systemType: project.systemType,
          });
        }
      }
    }

    // --- 2.4 Etapa 4: Preparação de Ambiente & Infraestrutura (Campo "Agendado Para" = startDate ou endDate) ---
    const envStage = stages?.environment;
    if (envStage && matchesActivity("configuracao")) {
      const envDate = toDateIso(envStage.startDate || envStage.endDate);
      const envResp = envStage.responsible?.trim() || project.responsibleEnvironment?.trim();

      if (envDate && envResp && envDate >= startIso && envDate <= endIso && matchesUser(envResp)) {
        const alreadyHasManual = allEvents.some(
          (e) =>
            e.date === envDate &&
            e.activityType === "configuracao" &&
            (e.ticketNumber === ticketNumber ||
              e.clientName.toLowerCase() === project.clientName.toLowerCase())
        );

        if (!alreadyHasManual) {
          allEvents.push({
            id: `environment-${project.id}-${envDate}`,
            origin: "environment_preparation",
            date: envDate,
            userName: envResp,
            ticketNumber,
            ticketCatalog: catalog,
            clientName: project.clientName,
            subject: "Preparação de Ambiente",
            activityType: "configuracao",
            isAllDay: true,
            status: envStage.status === "done" ? "Concluída" : "Agendada",
            observations: envStage.observations || undefined,
            projectId: project.id,
            systemType: project.systemType,
          });
        }
      }
    }
  }

  // 3. Processar Férias de Implantadores (implantador_vacations)
  for (const vacation of vacations) {
    const vName = vacation.implantador_name?.trim();
    if (!vName || !matchesUser(vName)) continue;

    const vStart = toDateIso(vacation.start_date);
    const vEnd = toDateIso(vacation.end_date);
    if (!vStart || !vEnd) continue;

    const days = getDaysInRange(parseISO(vStart), parseISO(vEnd));
    for (const day of days) {
      if (day < startIso || day > endIso) continue;

      allEvents.push({
        id: `vacation-${vacation.id}-${day}`,
        origin: "vacation",
        date: day,
        userName: vName,
        clientName: "Siplan RH / Administrativo",
        ticketNumber: "",
        ticketCatalog: "orion",
        subject: `Férias: ${vacation.description || "Férias Regulamentares"}`,
        activityType: "outro",
        isAllDay: true,
        status: "Férias",
      });
    }
  }

  // 4. Agrupar por (Dia, Usuário) e aplicar o balanceamento de horários proporcional
  const eventsByDayUser = new Map<string, UnifiedAgendaEvent[]>();
  for (const ev of allEvents) {
    const key = `${ev.date}___${normalizeText(ev.userName)}`;
    const group = eventsByDayUser.get(key) || [];
    group.push(ev);
    eventsByDayUser.set(key, group);
  }

  const finalEvents: UnifiedAgendaEvent[] = [];
  eventsByDayUser.forEach((group) => {
    const balanced = balanceDayHoursForUser(group);
    finalEvents.push(...balanced);
  });

  return finalEvents;
}
