import { describe, it, expect } from "vitest";
import { unifyAgendaEvents, detectTicketCatalog } from "./agenda-unifier";
import type { ProjectV2 } from "@/types/ProjectV2";
import type { AnalystAgendaEntry } from "@/types/agenda";
import type { Vacation } from "@/hooks/useVacations";

describe("agenda-unifier", () => {
  describe("detectTicketCatalog", () => {
    it("detecta 'legacy' para sistemas Control-M, Global e Siplan Legado", () => {
      expect(detectTicketCatalog("Control-M Notas")).toBe("legacy");
      expect(detectTicketCatalog("Global Protesto")).toBe("legacy");
      expect(detectTicketCatalog("SiplanDOC")).toBe("legacy");
    });

    it("detecta 'orion' para Orion TN, Orion PRO, Siplan NFSe e outros", () => {
      expect(detectTicketCatalog("Orion TN")).toBe("orion");
      expect(detectTicketCatalog("Orion PRO")).toBe("orion");
      expect(detectTicketCatalog("Siplan NFSe")).toBe("orion");
      expect(detectTicketCatalog(null)).toBe("orion");
    });
  });

  describe("unifyAgendaEvents", () => {
    const startDate = new Date("2026-11-02T00:00:00");
    const endDate = new Date("2026-11-06T23:59:59");

    it("desdobra implantação Fase 1 de múltiplos dias em 1 card por dia", () => {
      const mockProject: Partial<ProjectV2> = {
        id: "proj-1",
        clientName: "Cartório Central",
        ticketNumber: "759980",
        systemType: "Orion TN",
        isDeleted: false,
        stages: {
          implementation: {
            status: "in-progress",
            phase1: {
              status: "in-progress",
              startDate: new Date("2026-11-02T12:00:00"),
              endDate: new Date("2026-11-04T12:00:00"),
              responsible: "Julio Araujo",
              isConfirmed: true,
              trainingLocation: "Presencial",
            },
          },
        } as any,
      };

      const events = unifyAgendaEvents({
        projects: [mockProject as ProjectV2],
        startDate,
        endDate,
      });

      // 02/11, 03/11, 04/11 = 3 dias = 3 cards individuais
      expect(events).toHaveLength(3);
      expect(events[0].date).toBe("2026-11-02");
      expect(events[1].date).toBe("2026-11-03");
      expect(events[2].date).toBe("2026-11-04");
      expect(events[0].ticketNumber).toBe("759980");
      expect(events[0].clientName).toBe("Cartório Central");
      expect(events[0].subject).toBe("Implantação (Presencial)");
      expect(events[0].isConfirmed).toBe(true);
      expect(events[0].status).toBe("Confirmada");
      expect(events[0].startTime).toBe("08:30");
      expect(events[0].endTime).toBe("17:30");
    });

    it("sincroniza etapa 2 (Análise de Aderência) automaticamente no dia agendado", () => {
      const mockProject: Partial<ProjectV2> = {
        id: "proj-adh",
        clientName: "Cartório de Notas",
        ticketNumber: "761100",
        systemType: "Orion TN",
        isDeleted: false,
        stages: {
          adherence: {
            status: "in-progress",
            responsible: "Rodrigo Brites",
            endDate: new Date("2026-11-03T12:00:00"), // Agendado Para
          },
        } as any,
      };

      const events = unifyAgendaEvents({
        projects: [mockProject as ProjectV2],
        startDate,
        endDate,
      });

      expect(events).toHaveLength(1);
      expect(events[0].origin).toBe("adherence");
      expect(events[0].date).toBe("2026-11-03");
      expect(events[0].userName).toBe("Rodrigo Brites");
      expect(events[0].subject).toBe("Análise de Aderência");
      expect(events[0].activityType).toBe("aderencia");
      expect(events[0].ticketNumber).toBe("761100");
    });

    it("sincroniza etapa 3 (Conversão de Dados) automaticamente no dia de homologação", () => {
      const mockProject: Partial<ProjectV2> = {
        id: "proj-conv",
        clientName: "Tabelionato de Protesto",
        ticketNumber: "762200",
        systemType: "Global",
        isDeleted: false,
        stages: {
          conversion: {
            status: "in-progress",
            homologationResponsible: "Ricardo Vieira",
            homologationDate: new Date("2026-11-05T12:00:00"), // Agendado Para
            homologationStatus: "Adequado",
          },
        } as any,
      };

      const events = unifyAgendaEvents({
        projects: [mockProject as ProjectV2],
        startDate,
        endDate,
      });

      expect(events).toHaveLength(1);
      expect(events[0].origin).toBe("conversion_homologation");
      expect(events[0].date).toBe("2026-11-05");
      expect(events[0].userName).toBe("Ricardo Vieira");
      expect(events[0].subject).toBe("Homologação da Conversão");
      expect(events[0].activityType).toBe("homologacao");
      expect(events[0].ticketCatalog).toBe("legacy");
      expect(events[0].status).toBe("Adequado");
    });

    it("divide proporcionalmente as horas quando há 2 chamados no mesmo dia para o mesmo analista", () => {
      const manualEntry1: AnalystAgendaEntry = {
        id: "m-1",
        userId: "user-1",
        userName: "Julio Araujo",
        ticketNumber: "7001",
        ticketCatalog: "orion",
        clientName: "Cliente A",
        subject: "Treinamento",
        activityType: "treinamento",
        date: "2026-11-03",
        isAllDay: true,
        createdAt: "2026-10-31",
        updatedAt: "2026-10-31",
      };

      const manualEntry2: AnalystAgendaEntry = {
        id: "m-2",
        userId: "user-1",
        userName: "Julio Araujo",
        ticketNumber: "7002",
        ticketCatalog: "orion",
        clientName: "Cliente B",
        subject: "Configuração",
        activityType: "configuracao",
        date: "2026-11-03",
        isAllDay: true,
        createdAt: "2026-10-31",
        updatedAt: "2026-10-31",
      };

      const events = unifyAgendaEvents({
        manualEntries: [manualEntry1, manualEntry2],
        startDate,
        endDate,
      });

      expect(events).toHaveLength(2);
      // Primeiro chamado metade da manhã: 08:30 às 12:30
      expect(events[0].startTime).toBe("08:30");
      expect(events[0].endTime).toBe("12:30");
      // Segundo chamado metade da tarde: 13:30 às 17:30
      expect(events[1].startTime).toBe("13:30");
      expect(events[1].endTime).toBe("17:30");
    });

    it("divide em 1/3 do dia quando há 3 chamados no mesmo dia para o mesmo analista", () => {
      const entries: AnalystAgendaEntry[] = [1, 2, 3].map((num) => ({
        id: `m-${num}`,
        userId: "user-1",
        userName: "Rodrigo Brites",
        ticketNumber: `700${num}`,
        ticketCatalog: "orion",
        clientName: `Cliente ${num}`,
        subject: `Chamado ${num}`,
        activityType: "chamado",
        date: "2026-11-04",
        isAllDay: true,
        createdAt: "2026-10-31",
        updatedAt: "2026-10-31",
      }));

      const events = unifyAgendaEvents({
        manualEntries: entries,
        startDate,
        endDate,
      });

      expect(events).toHaveLength(3);
      expect(events[0].startTime).toBe("08:30");
      expect(events[0].endTime).toBe("11:30");
      expect(events[1].startTime).toBe("11:30");
      expect(events[1].endTime).toBe("14:30");
      expect(events[2].startTime).toBe("14:30");
      expect(events[2].endTime).toBe("17:30");
    });

    it("preserva horários manuais fixos quando definidos", () => {
      const fixedEntry: AnalystAgendaEntry = {
        id: "fixed-1",
        userId: "user-1",
        userName: "Erik Marques",
        ticketNumber: "8888",
        ticketCatalog: "orion",
        clientName: "Cliente Especial",
        subject: "Reunião de Alinhamento",
        activityType: "reuniao",
        date: "2026-11-05",
        startTime: "10:00",
        endTime: "11:30",
        isAllDay: false,
        createdAt: "2026-10-31",
        updatedAt: "2026-10-31",
      };

      const events = unifyAgendaEvents({
        manualEntries: [fixedEntry],
        startDate,
        endDate,
      });

      expect(events).toHaveLength(1);
      expect(events[0].startTime).toBe("10:00");
      expect(events[0].endTime).toBe("11:30");
      expect(events[0].isAllDay).toBe(false);
    });

    it("sincroniza férias cadastradas de implantador_vacations", () => {
      const mockVacation: Vacation = {
        id: "vac-1",
        implantador_id: "julio-araujo",
        implantador_name: "Julio Araujo",
        start_date: "2026-11-02",
        end_date: "2026-11-03",
        description: "Férias Anuais",
        created_by: null,
        created_at: "2026-10-31",
        updated_at: "2026-10-31",
      };

      const events = unifyAgendaEvents({
        vacations: [mockVacation],
        startDate,
        endDate,
      });

      expect(events).toHaveLength(2);
      expect(events[0].origin).toBe("vacation");
      expect(events[0].userName).toBe("Julio Araujo");
      expect(events[0].subject).toBe("Férias: Férias Anuais");
    });
  });
});
