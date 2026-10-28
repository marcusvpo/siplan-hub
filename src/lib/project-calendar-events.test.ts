import { describe, expect, it } from "vitest";
import type { ImplementationStageV2, ProjectV2 } from "@/types/ProjectV2";
import { CALENDAR_MEMBERS, type CalendarEvent } from "@/types/calendar";
import {
  UNASSIGNED_CALENDAR_MEMBER,
  buildProjectCalendarEvents,
  classifySystemCategory,
  deriveTimelineMembers,
  extractCleanObservations,
  extractUnscheduledPhase1Projects,
  isExcludedTimelineMember,
  normalizeText,
  packEventsIntoLanes,
  resolveCalendarMembersForResponsible,
} from "./project-calendar-events";
import {
  WEEKDAY_HOLIDAYS_2026_2027,
  formatHolidayAlertDescription,
  formatWeekHolidayBadge,
  getWeekdayHoliday,
  getWeekdayHolidaysForWeek,
  getWeekdayHolidaysInRange,
} from "./calendar-holidays";

interface MockProjectOverrides extends Omit<Partial<ProjectV2>, "stages"> {
  implementation?: Partial<ImplementationStageV2>;
}

function createMockProject(overrides: MockProjectOverrides = {}): ProjectV2 {
  const now = new Date("2026-01-10T12:00:00Z");
  const { implementation, ...rest } = overrides;

  return {
    id: rest.id || "proj-1",
    clientName: rest.clientName || "1º Tabelionato de Notas de Campinas",
    ticketNumber: rest.ticketNumber || "CH-1020",
    systemType: rest.systemType || "Orion TN",
    implantationType: "new",
    tags: [],
    priority: rest.priority || "normal",
    projectType: "new",
    healthScore: "ok",
    globalStatus: rest.globalStatus || "in-progress",
    overallProgress: 50,
    projectLeader: "Líder",
    createdAt: now,
    lastUpdatedAt: now,
    lastUpdatedBy: "Tester",
    isDeleted: rest.isDeleted ?? false,
    isArchived: rest.isArchived ?? false,
    soldHours: rest.soldHours ?? 24,
    specialty: rest.specialty ?? "Notas",
    ...rest,
    stages: {
      infra: { status: "done" },
      adherence: {
        status: "done",
        responsible: "Ricardo Vieira",
        endDate: new Date("2026-01-05T12:00:00"),
        hasProductGap: false,
        analysisComplete: true,
      },
      environment: {
        status: "done",
        approvedByInfra: true,
        testAvailable: true,
      },
      conversion: {
        status: "done",
        homologationResponsible: "Rodrigo Brites",
        finishedAt: new Date("2026-01-08T12:00:00"),
      },
      implementation: {
        status: implementation?.status || "in-progress",
        responsible: implementation?.responsible,
        observations: implementation?.observations,
        phase1: {
          status: "in-progress",
          ...implementation?.phase1,
        },
        phase2: {
          status: "todo",
          responsible: "Ricardo Vieira",
          startDate: new Date("2026-03-01T12:00:00"),
          endDate: new Date("2026-03-05T12:00:00"),
          ...implementation?.phase2,
        },
      },
      post: { status: "todo", followupNeeded: false },
    },
  };
}

describe("project-calendar-events", () => {
  describe("CALENDAR_MEMBERS e cores oficiais por sistema", () => {
    it("contém apenas os 5 especialistas ativos com as cores oficiais por sistema", () => {
      expect(CALENDAR_MEMBERS.map((m) => m.id)).toEqual([
        "julio-araujo",
        "rodrigo-mizuno",
        "rodrigo-brites",
        "ricardo-vieira",
        "erik-marques",
      ]);

      const julio = CALENDAR_MEMBERS.find((m) => m.id === "julio-araujo");
      const mizuno = CALENDAR_MEMBERS.find((m) => m.id === "rodrigo-mizuno");
      const brites = CALENDAR_MEMBERS.find((m) => m.id === "rodrigo-brites");
      const vieira = CALENDAR_MEMBERS.find((m) => m.id === "ricardo-vieira");
      const erik = CALENDAR_MEMBERS.find((m) => m.id === "erik-marques");

      expect(julio?.color).toBe("bg-emerald-600");
      expect(mizuno?.color).toBe("bg-blue-600");
      expect(brites?.color).toBe("bg-blue-700");
      expect(vieira?.color).toBe("bg-[#d3123f]");
      expect(erik?.color).toBe("bg-rose-600");
    });
  });

  describe("normalizeText", () => {
    it("remove acentos, converte para minúsculas e normaliza espaços", () => {
      expect(normalizeText("  Júlio   Araújo ")).toBe("julio araujo");
      expect(normalizeText("1º Ofício de Registro de Imóveis")).toBe(
        "1º oficio de registro de imoveis"
      );
      expect(normalizeText(null)).toBe("");
      expect(normalizeText(undefined)).toBe("");
    });
  });

  describe("isExcludedTimelineMember e resolveCalendarMembersForResponsible", () => {
    it("identifica Bruno Matos e Luan Caldeira como excluídos da timeline", () => {
      expect(isExcludedTimelineMember("Bruno Matos")).toBe(true);
      expect(isExcludedTimelineMember("bruno-matos")).toBe(true);
      expect(isExcludedTimelineMember("Bruno")).toBe(true);
      expect(isExcludedTimelineMember("Luan Caldeira")).toBe(true);
      expect(isExcludedTimelineMember("luan-caldeira")).toBe(true);
      expect(isExcludedTimelineMember("Luan")).toBe(true);
      expect(isExcludedTimelineMember("Julio Araujo")).toBe(false);
    });

    it("resolve apelidos e sobrenomes únicos corretamente", () => {
      expect(resolveCalendarMembersForResponsible("Mizuno")).toEqual([
        expect.objectContaining({
          id: "rodrigo-mizuno",
          name: "Rodrigo Mizuno",
          color: "bg-blue-600",
        }),
      ]);
      expect(resolveCalendarMembersForResponsible("Brites")).toEqual([
        expect.objectContaining({
          id: "rodrigo-brites",
          name: "Rodrigo Brites",
          color: "bg-blue-700",
        }),
      ]);
      expect(resolveCalendarMembersForResponsible("Vieira")).toEqual([
        expect.objectContaining({
          id: "ricardo-vieira",
          name: "Ricardo Vieira",
          color: "bg-[#d3123f]",
        }),
      ]);
      expect(resolveCalendarMembersForResponsible("Júlio")).toEqual([
        expect.objectContaining({
          id: "julio-araujo",
          name: "Julio Araujo",
          color: "bg-emerald-600",
        }),
      ]);
      expect(resolveCalendarMembersForResponsible("Erik")).toEqual([
        expect.objectContaining({
          id: "erik-marques",
          name: "Erik Marques",
          color: "bg-rose-600",
        }),
      ]);
    });

    it("resolve múltiplos responsáveis separados por 'e', '/', ',', '&' ou '+' e ignora excluídos", () => {
      const membersE = resolveCalendarMembersForResponsible(
        "Julio Araújo e Rodrigo Mizuno"
      );
      expect(membersE.map((m) => m.id)).toEqual([
        "julio-araujo",
        "rodrigo-mizuno",
      ]);

      const membersSlash = resolveCalendarMembersForResponsible(
        "Brites / Vieira & Erik"
      );
      expect(membersSlash.map((m) => m.id)).toEqual([
        "rodrigo-brites",
        "ricardo-vieira",
        "erik-marques",
      ]);

      expect(resolveCalendarMembersForResponsible("Bruno + Luan")).toEqual([]);
      expect(resolveCalendarMembersForResponsible("Bruno Matos")).toEqual([]);
      expect(resolveCalendarMembersForResponsible("Luan Caldeira")).toEqual([]);
    });

    it("cria CalendarMember dinâmico quando o responsável não está em CALENDAR_MEMBERS e não é excluído", () => {
      const dynamic = resolveCalendarMembersForResponsible("Carlos Eduardo");
      expect(dynamic).toHaveLength(1);
      expect(dynamic[0]).toMatchObject({
        id: "carlos-eduardo",
        name: "Carlos Eduardo",
        initials: "CE",
        role: "Implantador",
      });
    });

    it("retorna lista vazia para valores em branco ou 'A definir'", () => {
      expect(resolveCalendarMembersForResponsible("")).toEqual([]);
      expect(resolveCalendarMembersForResponsible("A definir")).toEqual([]);
      expect(resolveCalendarMembersForResponsible("Sem responsável")).toEqual(
        []
      );
    });
  });

  describe("extractCleanObservations", () => {
    it("extrai texto limpo e itens de observações entre parênteses, HTML e Tiptap JSON", () => {
      const parenResult = extractCleanObservations(
        "Implantação crítica (Cliente pediu foco em REG)\n(Validar selos antes da virada)"
      );
      expect(parenResult.items).toEqual([
        "Implantação crítica",
        "Cliente pediu foco em REG",
        "Validar selos antes da virada",
      ]);

      const htmlResult = extractCleanObservations(
        "<p>Treinamento remoto</p><p>Falar com <strong>Dra. Helena</strong> (Titular)</p>"
      );
      expect(htmlResult.items).toEqual([
        "Treinamento remoto",
        "Falar com Dra. Helena",
        "Titular",
      ]);

      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Base convertida OK" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Acompanhar emissão de certidões" }],
          },
        ],
      });
      const jsonResult = extractCleanObservations(tiptapJson);
      expect(jsonResult.items).toEqual([
        "Base convertida OK",
        "Acompanhar emissão de certidões",
      ]);
    });
  });

  describe("classifySystemCategory", () => {
    it("classifica estritamente REG, PRO, TN e OTHER conforme o sistema único do projeto", () => {
      expect(classifySystemCategory("Orion REG")).toBe("reg");
      expect(classifySystemCategory("Orion PRO")).toBe("pro");
      expect(classifySystemCategory("Orion TN")).toBe("tn");
      expect(classifySystemCategory("Modelos / Notas")).toBe("tn");
      expect(classifySystemCategory("Financeiro")).toBe("other");
    });
  });

  describe("buildProjectCalendarEvents", () => {
    it("extrai exclusivamente da Fase 1 e preenche metadados executivos", () => {
      const project = createMockProject({
        id: "proj-reg-1",
        clientName: "Cartório de Registro de Itu",
        ticketNumber: "CH-5001",
        systemType: "Orion REG",
        soldHours: 32,
        specialty: "Registro de Imóveis",
        implementation: {
          status: "in-progress",
          phase1: {
            status: "in-progress",
            responsible: "Júlio Araújo",
            startDate: new Date("2026-02-02T12:00:00"),
            endDate: new Date("2026-02-06T12:00:00"),
            isConfirmed: true,
            trainingLocation: "Presencial",
            observations: "Virada de chave na segunda (40h presenciais)",
          },
          phase2: {
            status: "todo",
            responsible: "Ricardo Vieira",
            startDate: new Date("2026-02-10T12:00:00"),
            endDate: new Date("2026-02-12T12:00:00"),
          },
        },
      });

      const events = buildProjectCalendarEvents([project]);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: "real-proj-reg-1-p1",
        resourceId: "julio-araujo",
        color: "bg-emerald-600",
        clientName: "Cartório de Registro de Itu",
        ticketNumber: "CH-5001",
        systemType: "Orion REG",
        systemCategory: "reg",
        allResponsibles: ["Julio Araujo"],
        isShared: false,
        isConfirmed: true,
        stageStatus: "in-progress",
        status: "confirmed",
        trainingLocation: "Presencial",
        soldHours: 32,
        specialty: "Registro de Imóveis",
        observationsList: ["Virada de chave na segunda", "40h presenciais"],
      });
    });

    it("ignora eventos cujo responsável é exclusivamente Bruno Matos ou Luan Caldeira", () => {
      const brunoProject = createMockProject({
        id: "proj-bruno",
        clientName: "Cartório Excluído Bruno",
        implementation: {
          status: "in-progress",
          phase1: {
            status: "in-progress",
            responsible: "Bruno Matos",
            startDate: new Date("2026-02-02T12:00:00"),
            endDate: new Date("2026-02-06T12:00:00"),
          },
          phase2: { status: "todo" },
        },
      });

      const luanProject = createMockProject({
        id: "proj-luan",
        clientName: "Cartório Excluído Luan",
        implementation: {
          status: "in-progress",
          phase1: {
            status: "in-progress",
            responsible: "Luan Caldeira",
            startDate: new Date("2026-02-10T12:00:00"),
            endDate: new Date("2026-02-14T12:00:00"),
          },
          phase2: { status: "todo" },
        },
      });

      const events = buildProjectCalendarEvents([brunoProject, luanProject]);
      expect(events).toHaveLength(0);

      const members = deriveTimelineMembers(
        [brunoProject, luanProject],
        events
      );
      expect(members.some((m) => m.id === "bruno-matos")).toBe(false);
      expect(members.some((m) => m.id === "luan-caldeira")).toBe(false);
    });

    it("gera eventos na timeline para múltiplos responsáveis na Fase 1 mantendo a categoria do sistema", () => {
      const project = createMockProject({
        id: "proj-shared",
        clientName: "Cartório Integrado de Santos",
        systemType: "Orion PRO",
        implementation: {
          status: "in-progress",
          phase1: {
            status: "todo",
            responsible: "Julio Araújo e Rodrigo Mizuno",
            startDate: new Date("2026-03-09T12:00:00"),
            endDate: new Date("2026-03-13T12:00:00"),
            isConfirmed: false,
          },
          phase2: { status: "todo" },
        },
      });

      const events = buildProjectCalendarEvents([project]);
      expect(events).toHaveLength(2);
      expect(events.map((e) => e.resourceId)).toEqual([
        "julio-araujo",
        "rodrigo-mizuno",
      ]);
      expect(events[0].systemCategory).toBe("pro");
      expect(events[1].systemCategory).toBe("pro");
      expect(events[0].allResponsibles).toEqual([
        "Julio Araujo",
        "Rodrigo Mizuno",
      ]);
      expect(events[0].status).toBe("planned");
    });

    it("aloca em 'a-definir' quando a Fase 1 possui data mas não tem responsável definido", () => {
      const project = createMockProject({
        id: "proj-unassigned",
        clientName: "Tabelionato Sem Implantador",
        implementation: {
          status: "todo",
          phase1: {
            status: "todo",
            responsible: "",
            startDate: new Date("2026-04-15T12:00:00"),
          },
          phase2: { status: "todo" },
        },
      });

      const events = buildProjectCalendarEvents([project]);
      expect(events).toHaveLength(1);
      expect(events[0].resourceId).toBe(UNASSIGNED_CALENDAR_MEMBER.id);
      expect(events[0].start).toEqual(events[0].end);

      const timelineMembers = deriveTimelineMembers([project], events);
      expect(
        timelineMembers.some((m) => m.id === UNASSIGNED_CALENDAR_MEMBER.id)
      ).toBe(true);
    });
  });

  describe("extractUnscheduledPhase1Projects", () => {
    it("retorna apenas projetos ativos cuja Fase 1 ainda não possui datas definidas e ignora excluídos", () => {
      const unscheduledProj = createMockProject({
        id: "proj-backlog",
        clientName: "2º Registro Civil de Sorocaba",
        ticketNumber: "CH-9900",
        systemType: "Orion TN",
        implementation: {
          status: "todo",
          phase1: {
            status: "todo",
            responsible: "Vieira",
            observations: "(Aguardando liberação do cliente)",
          },
          phase2: { status: "todo" },
        },
      });

      const excludedBacklogProj = createMockProject({
        id: "proj-backlog-bruno",
        clientName: "Tabelionato Bruno",
        implementation: {
          status: "todo",
          phase1: {
            status: "todo",
            responsible: "Bruno Matos",
          },
          phase2: { status: "todo" },
        },
      });

      const scheduledProj = createMockProject({
        id: "proj-scheduled",
        implementation: {
          status: "in-progress",
          phase1: {
            status: "in-progress",
            responsible: "Brites",
            startDate: new Date("2026-02-01T12:00:00"),
            endDate: new Date("2026-02-05T12:00:00"),
          },
          phase2: { status: "todo" },
        },
      });

      const doneProj = createMockProject({
        id: "proj-done",
        globalStatus: "done",
      });

      const list = extractUnscheduledPhase1Projects([
        unscheduledProj,
        excludedBacklogProj,
        scheduledProj,
        doneProj,
      ]);

      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        projectId: "proj-backlog",
        clientName: "2º Registro Civil de Sorocaba",
        ticketNumber: "CH-9900",
        systemCategory: "tn",
        allResponsibles: ["Ricardo Vieira"],
        observationsList: ["Aguardando liberação do cliente"],
      });
    });
  });

  describe("packEventsIntoLanes", () => {
    it("posiciona eventos simultâneos e férias em sub-raias separadas e reutiliza raias livres", () => {
      const evt1: CalendarEvent = {
        id: "evt-1",
        resourceId: "rodrigo-brites",
        title: "Cartório A",
        start: new Date("2026-03-02T12:00:00"),
        end: new Date("2026-03-06T12:00:00"),
        type: "implementation",
      };
      const evt2Overlapping: CalendarEvent = {
        id: "evt-2",
        resourceId: "rodrigo-brites",
        title: "Cartório B (Simultâneo)",
        start: new Date("2026-03-04T12:00:00"),
        end: new Date("2026-03-10T12:00:00"),
        type: "implementation",
      };
      const evt3VacationOverlapping: CalendarEvent = {
        id: "vacation-1",
        resourceId: "rodrigo-brites",
        title: "Férias",
        start: new Date("2026-03-05T12:00:00"),
        end: new Date("2026-03-15T12:00:00"),
        type: "vacation",
      };
      const evt4NonOverlappingWithLane0: CalendarEvent = {
        id: "evt-4",
        resourceId: "rodrigo-brites",
        title: "Cartório C (Sequencial à raia 0)",
        start: new Date("2026-03-07T12:00:00"),
        end: new Date("2026-03-09T12:00:00"),
        type: "implementation",
      };

      const { lanes, laneCount } = packEventsIntoLanes([
        evt2Overlapping,
        evt4NonOverlappingWithLane0,
        evt1,
        evt3VacationOverlapping,
      ]);

      expect(laneCount).toBe(3);
      expect(lanes[0].map((e) => e.id)).toEqual(["evt-1", "evt-4"]);
      expect(lanes[1].map((e) => e.id)).toEqual(["evt-2"]);
      expect(lanes[2].map((e) => e.id)).toEqual(["vacation-1"]);
    });
  });

  describe("WEEKDAY_HOLIDAYS_2026_2027 (Feriados em dias de semana)", () => {
    it("inclui apenas feriados de 2026 e 2027 que caem de Segunda a Sexta-feira", () => {
      expect(WEEKDAY_HOLIDAYS_2026_2027.length).toBeGreaterThanOrEqual(20);

      for (const holiday of WEEKDAY_HOLIDAYS_2026_2027) {
        const dt = new Date(`${holiday.date}T12:00:00`);
        const dayOfWeek = dt.getDay(); // 0 = Dom, 1..5 = Seg..Sex, 6 = Sab
        expect(dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(dayOfWeek).toBeLessThanOrEqual(5);
        expect([2026, 2027]).toContain(holiday.year);
      }

      // 15/11/2026 cai no domingo -> não deve estar na lista
      expect(getWeekdayHoliday("2026-11-15")).toBeNull();
      // 01/05/2027 e 25/12/2027 caem no sábado -> não devem estar na lista
      expect(getWeekdayHoliday("2027-05-01")).toBeNull();
      expect(getWeekdayHoliday("2027-12-25")).toBeNull();
    });

    it("detecta feriados dentro de uma janela de implantação e formata o badge da semana", () => {
      const novWeek = getWeekdayHolidaysForWeek(new Date("2026-11-16T12:00:00"));
      expect(novWeek).toHaveLength(1);
      expect(novWeek[0]).toMatchObject({
        date: "2026-11-20",
        weekdayShort: "Sex",
        shortDate: "20/11",
        name: "Dia da Consciência Negra",
      });
      expect(formatWeekHolidayBadge(novWeek)).toBe("Sex 20/11");

      const carnaval2026 = getWeekdayHolidaysInRange("2026-02-16", "2026-02-20");
      expect(carnaval2026).toHaveLength(2);
      expect(formatWeekHolidayBadge(carnaval2026)).toBe("Seg 16/02 + Ter 17/02");
      expect(formatHolidayAlertDescription(carnaval2026)).toContain("Carnaval");
    });
  });
});

