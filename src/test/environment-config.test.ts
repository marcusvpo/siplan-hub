import { describe, it, expect } from "vitest";
import {
  calculateEnvironmentTargetDate,
  formatEnvironmentTargetDate,
  getEnvironmentUrgency,
  canManageEnvironmentConfig,
  isUserCurrentResponsible,
  getEnvironmentSlaAlert,
  createEnvironmentTimelineItem,
  formatEnvironmentConnectionSummary,
} from "@/lib/environment-config";
import { ProjectV2 } from "@/types/ProjectV2";

describe("environment-config helpers", () => {
  describe("calculateEnvironmentTargetDate", () => {
    it("deve calcular a sexta-feira da semana anterior quando o início for numa segunda-feira", () => {
      // Exemplo do usuário: se o início for 07/12/2026 (segunda), data limite é 04/12/2026 (sexta anterior)
      const target = calculateEnvironmentTargetDate("2026-12-07T10:00:00.000Z");
      expect(target).not.toBeNull();
      expect(target!.getFullYear()).toBe(2026);
      expect(target!.getMonth()).toBe(11); // Dezembro = 11 (0-indexed)
      expect(target!.getDate()).toBe(4);
      expect(target!.getDay()).toBe(5); // Sexta-feira
    });

    it("deve calcular a mesma sexta-feira da semana anterior quando o início for numa quarta-feira daquela semana", () => {
      // 09/12/2026 (quarta-feira)
      const target = calculateEnvironmentTargetDate("2026-12-09T10:00:00.000Z");
      expect(target).not.toBeNull();
      expect(target!.getDate()).toBe(4);
      expect(target!.getMonth()).toBe(11);
      expect(target!.getDay()).toBe(5);
    });

    it("deve retornar null se não houver data", () => {
      expect(calculateEnvironmentTargetDate(undefined)).toBeNull();
      expect(calculateEnvironmentTargetDate(null)).toBeNull();
      expect(calculateEnvironmentTargetDate("")).toBeNull();
    });
  });

  describe("formatEnvironmentTargetDate", () => {
    it("deve formatar data com dia da semana em PT-BR", () => {
      const date = new Date(2026, 11, 4, 12, 0, 0); // 04/12/2026
      const formatted = formatEnvironmentTargetDate(date);
      expect(formatted).toBe("04/12/2026 (Sex)");
    });

    it("deve retornar 'Aguardando Datas' quando nulo", () => {
      expect(formatEnvironmentTargetDate(null)).toBe("Aguardando Datas");
    });
  });

  describe("getEnvironmentUrgency", () => {
    it("deve retornar cor azul viva com borda marcante para em andamento", () => {
      const urgency = getEnvironmentUrgency(new Date(2026, 11, 4), "in_progress");
      expect(urgency.urgencyLevel).toBe("in_progress");
      expect(urgency.cardBorderClass).toContain("border-l-blue-600");
      expect(urgency.cardBgClass).toContain("bg-blue-50");
      expect(urgency.badgeClass).toContain("bg-blue-600");
      expect(urgency.isPulsing).toBe(false);
    });

    it("deve retornar cor verde esmeralda viva para concluído sem pendências", () => {
      const urgency = getEnvironmentUrgency(new Date(2026, 11, 4), "completed", false);
      expect(urgency.urgencyLevel).toBe("done");
      expect(urgency.cardBorderClass).toContain("border-l-emerald-600");
      expect(urgency.cardBgClass).toContain("bg-emerald-50");
      expect(urgency.isPulsing).toBe(false);
    });

    it("deve destacar pendências em concluído com borda e badge âmbar/laranja sólidas", () => {
      const urgency = getEnvironmentUrgency(new Date(2026, 11, 4), "completed", true);
      expect(urgency.urgencyLevel).toBe("done");
      expect(urgency.label).toContain("Pendências");
      expect(urgency.cardBorderClass).toContain("border-l-amber-500");
      expect(urgency.badgeClass).toContain("bg-amber-600");
    });

    it("deve retornar neutro para não iniciado sem data", () => {
      const urgency = getEnvironmentUrgency(null, "not_started");
      expect(urgency.urgencyLevel).toBe("no_date");
      expect(urgency.label).toBe("Aguardando Datas");
    });
  });

  describe("canManageEnvironmentConfig", () => {
    it("deve conceder acesso para admin", () => {
      expect(canManageEnvironmentConfig("Outro Nome", true)).toBe(true);
    });

    it("deve conceder acesso para Bruno Fernandes mesmo sem ser admin", () => {
      expect(canManageEnvironmentConfig("Bruno Fernandes", false)).toBe(true);
      expect(canManageEnvironmentConfig("bruno fernandes", false)).toBe(true);
    });

    it("deve conceder acesso para Alex Silva mesmo sem ser admin", () => {
      expect(canManageEnvironmentConfig("Alex Silva", false)).toBe(true);
      expect(canManageEnvironmentConfig("alex silva", false)).toBe(true);
    });

    it("deve conceder acesso com permissão explícita", () => {
      const hasPerm = (r: string, a: string) => r === "environment_config" && a === "edit";
      expect(canManageEnvironmentConfig("Outro Analista", false, hasPerm)).toBe(true);
    });

    it("deve negar permissão para usuário comum", () => {
      const hasPerm = (r: string, a: string) => r === "environment_config" && a === "view";
      expect(canManageEnvironmentConfig("João Silveira", false, hasPerm)).toBe(false);
    });
  });

  describe("isUserCurrentResponsible", () => {
    it("deve identificar corretamente quando o usuário for o responsável", () => {
      expect(isUserCurrentResponsible("Alex Silva", "Alex Silva", "alex.silva@siplan.com.br")).toBe(true);
      expect(isUserCurrentResponsible("Bruno Fernandes", "Bruno Fernandes", "bruno.fernandes@siplan.com.br")).toBe(true);
    });

    it("deve retornar false quando não for o responsável", () => {
      expect(isUserCurrentResponsible("Alex Silva", "Bruno Fernandes", "bruno.fernandes@siplan.com.br")).toBe(false);
      expect(isUserCurrentResponsible("", "Alex Silva", "alex.silva@siplan.com.br")).toBe(false);
      expect(isUserCurrentResponsible(null, "Alex Silva", "alex.silva@siplan.com.br")).toBe(false);
    });
  });

  describe("getEnvironmentSlaAlert", () => {
    it("deve retornar alerta crítico quando faltam poucos dias ou vencido", () => {
      // Data de implantação próxima (amanhã ou hoje)
      const mockProj: Partial<ProjectV2> = {
        id: "proj-sla",
        clientName: "Cartório Alerta",
        systemType: "Orion TN",
        isDeleted: false,
        stages: {
          environment: { status: "todo", responsible: "" } as any,
          implementation: {
            phase1: {
              startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 dias à frente -> targetDate sexta anterior já venceu ou vence hoje
            },
          } as any,
        } as any,
      };

      const alert = getEnvironmentSlaAlert(mockProj as ProjectV2);
      expect(alert).not.toBeNull();
      expect(alert!.isCritical).toBe(true);
      expect(alert!.colorClass).toContain("bg-red-600");
    });

    it("deve retornar null se o ambiente já estiver concluído", () => {
      const mockProj: Partial<ProjectV2> = {
        id: "proj-done",
        clientName: "Cartório Pronto",
        systemType: "Orion TN",
        isDeleted: false,
        stages: {
          environment: { status: "done", responsible: "Alex Silva" } as any,
          implementation: {
            phase1: {
              startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
            },
          } as any,
        } as any,
      };

      expect(getEnvironmentSlaAlert(mockProj as ProjectV2)).toBeNull();
    });

    it("deve retornar null para projetos de Modelos TN", () => {
      const mockProj: Partial<ProjectV2> = {
        id: "proj-modelos",
        systemType: "Modelos TN",
        isDeleted: false,
        stages: {
          environment: { status: "todo" } as any,
          implementation: { phase1: { startDate: new Date().toISOString() } } as any,
        } as any,
      };

      expect(getEnvironmentSlaAlert(mockProj as ProjectV2)).toBeNull();
    });
  });

  describe("createEnvironmentTimelineItem", () => {
    it("deve criar item de timeline com id, timestamp e autor", () => {
      const item = createEnvironmentTimelineItem("assigned", "Alex Silva", "Assumiu o chamado.");
      expect(item.id).toMatch(/^evt-/);
      expect(item.author).toBe("Alex Silva");
      expect(item.action).toBe("assigned");
      expect(item.description).toBe("Assumiu o chamado.");
      expect(item.timestamp).toBeTruthy();
    });
  });

  describe("formatEnvironmentConnectionSummary", () => {
    it("deve gerar o template exato para o Teams com cliente, chamado, sistema, produtos e datas", () => {
      const mockFranca: Partial<ProjectV2> = {
        clientName: "FRANCA - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 02",
        ticketNumber: "759980",
        systemType: "Orion PRO",
        secondaryProductsNames: ["Livro Caixa Web", "SGA"],
        stages: {
          implementation: {
            phase1: {
              startDate: "2026-11-09T10:00:00.000Z",
              endDate: "2026-11-13T10:00:00.000Z",
              responsible: "Brites",
            } as any,
          } as any,
        } as any,
      };

      const summary = formatEnvironmentConnectionSummary(mockFranca as ProjectV2);

      const expected = [
        "FRANCA - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 02",
        "#759980",
        "Sistema: Orion PRO - [Configurar Ambiente no Servidor do Cartório]",
        "Produtos: Livro Caixa Web, SGA",
        "Implantação agendada para 09/11 a 13/11 - Brites",
        "(Finalizar Configuração até 06/11)",
      ].join("\n");

      expect(summary).toBe(expected);
    });

    it("quando não houver datas de implantação definidas, deve gerar o trecho 'Aguardando definição de datas para a Implantação'", () => {
      const mockSemData: Partial<ProjectV2> = {
        clientName: "Cartório Sem Data",
        ticketNumber: "111222",
        systemType: "Orion TN",
        products: [],
        stages: {
          implementation: {
            phase1: {
              startDate: undefined,
              endDate: undefined,
            } as any,
          } as any,
        } as any,
      };

      const summary = formatEnvironmentConnectionSummary(mockSemData as ProjectV2);

      const expected = [
        "Cartório Sem Data",
        "#111222",
        "Sistema: Orion TN - [Configurar Ambiente no Servidor do Cartório]",
        "Produtos: Nenhum",
        "Aguardando definição de datas para a Implantação",
      ].join("\n");

      expect(summary).toBe(expected);
    });
  });
});
