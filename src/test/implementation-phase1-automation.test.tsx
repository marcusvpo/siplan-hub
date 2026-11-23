import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ImplementationStageV2, ProjectV2 } from "@/types/ProjectV2";
import {
  addBusinessDaysKey,
  applyPhase1UpdatesWithAutomation,
  applyPhase2UpdatesWithAutomation,
  calculatePostImplantationSchedule,
  formatConfirmationTimestamp,
  getNextBusinessDayKey,
  isValidCalendarYearDateKey,
  shouldAutoFinishPhase1,
  shouldAutoFinishPhase2,
  shouldAutoStartPhase1,
  shouldAutoStartPhase2,
  syncPostStageFromImplementation,
  toLocalDateKey,
} from "@/utils/implementation-phase1";
import { SafeDateInput } from "@/components/ui/safe-date-input";
import { transformToDB } from "@/utils/project-transformers";
import { ImplementationStageForm } from "@/components/ProjectManagement/Forms/StageForms/ImplementationStageForm";
import { DeploymentDetailsDialog } from "@/components/ProjectManagement/DeploymentDetailsDialog";

const mockMutateAsync = vi.fn().mockResolvedValue(true);

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({
    updateProject: { mutateAsync: mockMutateAsync },
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ canEditProjects: true }),
}));

vi.mock("@/hooks/useTeamMembers", () => ({
  useTeamMembers: () => ({ members: [] }),
}));

vi.mock("@/hooks/useVacations", () => ({
  useVacations: () => ({
    vacations: [],
    isLoading: false,
    checkVacationConflict: () => ({ hasConflict: false }),
  }),
}));

vi.mock("@/components/ui/rich-text-editor", () => ({
  RichTextEditor: ({ content }: { content?: string }) => (
    <div data-testid="mock-rich-text-editor">{typeof content === "string" ? content : ""}</div>
  ),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return { ...original, useNavigate: () => vi.fn() };
});

describe("Automação da Fase 1 de Implantação, Confirmação e Limpeza de Datas", () => {
  describe("shouldAutoStartPhase1 & applyPhase1UpdatesWithAutomation", () => {
    const fixedNow = new Date(2026, 10, 17, 14, 30, 0); // 17/11/2026 14:30 local

    it("deve auto-ativar para 'in-progress' quando isConfirmed = true e startDate === hoje", () => {
      const result = shouldAutoStartPhase1({
        isConfirmed: true,
        startDate: new Date("2026-11-17T12:00:00"),
        endDate: new Date("2026-11-20T12:00:00"),
        status: "todo",
        globalStatus: "in-progress",
        now: fixedNow,
      });

      expect(result).toBe(true);
    });

    it("deve auto-ativar quando startDate é anterior a hoje dentro do período (ISO com Z e date-only)", () => {
      expect(
        shouldAutoStartPhase1({
          isConfirmed: true,
          startDate: "2026-11-16T15:00:00.000Z",
          endDate: "2026-11-20",
          status: "todo",
          globalStatus: "in-progress",
          now: fixedNow,
        })
      ).toBe(true);

      expect(
        shouldAutoStartPhase1({
          isConfirmed: true,
          startDate: "2026-11-16",
          endDate: undefined,
          status: undefined,
          globalStatus: "in-progress",
          now: fixedNow,
        })
      ).toBe(true);
    });

    it("NÃO deve auto-ativar se isConfirmed = false, startDate > hoje, endDate < hoje ou globalStatus = 'blocked'", () => {
      // isConfirmed = false
      expect(
        shouldAutoStartPhase1({
          isConfirmed: false,
          startDate: "2026-11-17",
          status: "todo",
          globalStatus: "in-progress",
          now: fixedNow,
        })
      ).toBe(false);

      // startDate > hoje
      expect(
        shouldAutoStartPhase1({
          isConfirmed: true,
          startDate: "2026-11-23",
          endDate: "2026-11-27",
          status: "todo",
          globalStatus: "in-progress",
          now: fixedNow,
        })
      ).toBe(false);

      // endDate já passou
      expect(
        shouldAutoStartPhase1({
          isConfirmed: true,
          startDate: "2026-11-10",
          endDate: "2026-11-14",
          status: "todo",
          globalStatus: "in-progress",
          now: fixedNow,
        })
      ).toBe(false);

      // globalStatus = 'blocked' / 'done' / 'archived'
      for (const blockedStatus of ["blocked", "done", "archived"] as const) {
        expect(
          shouldAutoStartPhase1({
            isConfirmed: true,
            startDate: "2026-11-17",
            status: "todo",
            globalStatus: blockedStatus,
            now: fixedNow,
          })
        ).toBe(false);
      }
    });

    it("deve registrar confirmedAt ao confirmar, limpar ao desconfirmar, auto-iniciar se vigente e sincronizar etapa pai", () => {
      const currentStage: ImplementationStageV2 = {
        status: "todo",
        responsible: "Rodrigo Brites",
        phase1: {
          status: "todo",
          responsible: "Rodrigo Brites",
          startDate: new Date("2026-11-17T12:00:00"),
          endDate: new Date("2026-11-20T12:00:00"),
          isConfirmed: false,
        },
        phase2: { status: "todo" },
      };

      const confirmed = applyPhase1UpdatesWithAutomation({
        currentStage,
        phaseUpdates: { isConfirmed: true },
        globalStatus: "in-progress",
        now: fixedNow,
      });

      expect(confirmed.phase1.isConfirmed).toBe(true);
      expect(confirmed.phase1.confirmedAt).toBe(fixedNow.toISOString());
      expect(confirmed.phase1.status).toBe("in-progress");
      expect(confirmed.status).toBe("in-progress");
      expect(confirmed.startDate).toEqual(currentStage.phase1.startDate);
      expect(confirmed.endDate).toEqual(currentStage.phase1.endDate);

      // Alteração manual no status Select deve ser respeitada sem auto-sobrescrever
      const manualBackToTodo = applyPhase1UpdatesWithAutomation({
        currentStage: confirmed,
        phaseUpdates: { status: "todo" },
        globalStatus: "in-progress",
        now: fixedNow,
      });
      expect(manualBackToTodo.phase1.status).toBe("todo");
      expect(manualBackToTodo.status).toBe("todo");

      // Desmarcar confirmação deve limpar confirmedAt
      const unconfirmed = applyPhase1UpdatesWithAutomation({
        currentStage: confirmed,
        phaseUpdates: { isConfirmed: false },
        globalStatus: "in-progress",
        now: fixedNow,
      });
      expect(unconfirmed.phase1.isConfirmed).toBe(false);
      expect(unconfirmed.phase1.confirmedAt).toBeUndefined();
    });
  });

  describe("ImplementationStageForm - Observação de Confirmação e Prevenção de Duplo Toggle", () => {
    it("exibe a observação exata com data/hora formatada quando isConfirmed = true e confirmedAt está definido", () => {
      const confirmedAt = new Date(2026, 10, 17, 15, 42, 0);
      const formatted = formatConfirmationTimestamp(confirmedAt);
      const stage: ImplementationStageV2 = {
        status: "in-progress",
        responsible: "Rodrigo Brites",
        phase1: {
          status: "in-progress",
          responsible: "Rodrigo Brites",
          isConfirmed: true,
          confirmedAt: confirmedAt.toISOString(),
        },
        phase2: { status: "todo" },
      };

      render(
        <ImplementationStageForm
          stage={stage}
          canEditProjects={true}
          onUpdatePhase={vi.fn()}
        />
      );

      const note = screen.getByTestId("phase1-confirmation-note");
      expect(note).toHaveTextContent(
        `Implantação foi confirmada pelo cliente após contato em ${formatted}!`
      );
    });

    it("exibe fallback sem timestamp quando isConfirmed = true e confirmedAt não existe, e não exibe quando isConfirmed = false", () => {
      const stageWithoutTimestamp: ImplementationStageV2 = {
        status: "todo",
        phase1: { status: "todo", isConfirmed: true },
        phase2: { status: "todo" },
      };

      const { rerender } = render(
        <ImplementationStageForm
          stage={stageWithoutTimestamp}
          canEditProjects={true}
          onUpdatePhase={vi.fn()}
        />
      );

      expect(screen.getByTestId("phase1-confirmation-note")).toHaveTextContent(
        "Implantação foi confirmada pelo cliente após contato!"
      );

      rerender(
        <ImplementationStageForm
          stage={{
            ...stageWithoutTimestamp,
            phase1: { status: "todo", isConfirmed: false },
          }}
          canEditProjects={true}
          onUpdatePhase={vi.fn()}
        />
      );

      expect(screen.queryByTestId("phase1-confirmation-note")).not.toBeInTheDocument();
    });

    it("não dispara duplo toggle ao clicar diretamente no Switch de Implantação Confirmada", () => {
      const onUpdatePhase = vi.fn();
      const stage: ImplementationStageV2 = {
        status: "todo",
        phase1: { status: "todo", isConfirmed: false },
        phase2: { status: "todo" },
      };

      render(
        <ImplementationStageForm
          stage={stage}
          canEditProjects={true}
          onUpdatePhase={onUpdatePhase}
        />
      );

      const switchBtnPhase1 = screen.getByRole("switch", { name: /Fase 1/i });
      fireEvent.click(switchBtnPhase1);

      expect(onUpdatePhase).toHaveBeenCalledTimes(1);
      expect(onUpdatePhase).toHaveBeenCalledWith("phase1", { isConfirmed: true });

      const switchBtnPhase2 = screen.getByRole("switch", { name: /Fase 2/i });
      fireEvent.click(switchBtnPhase2);

      expect(onUpdatePhase).toHaveBeenCalledTimes(2);
      expect(onUpdatePhase).toHaveBeenLastCalledWith("phase2", { isConfirmed: true });
    });

    it("limpar os inputs de data Início e Término envia undefined corretamente", () => {
      const onUpdatePhase = vi.fn();
      const stage: ImplementationStageV2 = {
        status: "in-progress",
        phase1: {
          status: "in-progress",
          startDate: new Date("2026-11-16T12:00:00"),
          endDate: new Date("2026-11-20T12:00:00"),
        },
        phase2: { status: "todo" },
      };

      render(
        <ImplementationStageForm
          stage={stage}
          canEditProjects={true}
          onUpdatePhase={onUpdatePhase}
        />
      );

      const startInput = screen.getByDisplayValue("2026-11-16");
      const endInput = screen.getByDisplayValue("2026-11-20");

      fireEvent.change(startInput, { target: { value: "" } });
      expect(onUpdatePhase).toHaveBeenCalledWith("phase1", { startDate: undefined });

      fireEvent.change(endInput, { target: { value: "" } });
      expect(onUpdatePhase).toHaveBeenCalledWith("phase1", { endDate: undefined });
    });
  });

  describe("DeploymentDetailsDialog - Auto-início, Confirmação e Limpeza de Datas", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 17, 10, 0, 0)); // 17/11/2026 10:00 local
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("ao confirmar implantação com startDate === hoje, auto-inicia para 'in-progress', grava confirmedAt e exibe observação", async () => {
      const todayStr = toLocalDateKey(new Date())!;
      const mockProject = {
        id: "proj-auto-start",
        clientName: "Cartório Auto Início",
        ticketNumber: "777001",
        systemType: "Orion TN",
        globalStatus: "in-progress",
        stages: {
          implementation: {
            status: "todo",
            responsible: "Ricardo Vieira",
            phase1: {
              status: "todo",
              responsible: "Ricardo Vieira",
              startDate: new Date(`${todayStr}T12:00:00`),
              endDate: new Date("2026-11-20T12:00:00"),
              isConfirmed: false,
            },
            phase2: { status: "todo" },
          },
        },
      } as unknown as ProjectV2;

      render(
        <DeploymentDetailsDialog
          project={mockProject}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      const switchBtn = screen.getByRole("switch");
      fireEvent.click(switchBtn);

      // Apenas 1 chamada (sem duplo toggle)
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      const callArg = mockMutateAsync.mock.calls[0][0];
      const savedImpl = callArg.updates.stages.implementation;

      expect(savedImpl.status).toBe("in-progress");
      expect(savedImpl.phase1.status).toBe("in-progress");
      expect(savedImpl.phase1.isConfirmed).toBe(true);
      expect(savedImpl.phase1.confirmedAt).toBe(new Date(2026, 10, 17, 10, 0, 0).toISOString());

      // Observação visível imediatamente na UI
      const formatted = formatConfirmationTimestamp(new Date(2026, 10, 17, 10, 0, 0));
      expect(screen.getByTestId("deployment-phase1-confirmation-note")).toHaveTextContent(
        `Implantação foi confirmada pelo cliente após contato em ${formatted}!`
      );
    });

    it("ao limpar datas no DeploymentDetailsDialog, sincroniza undefined e gera null no transformToDB", () => {
      const mockProject = {
        id: "proj-clear-dialog",
        clientName: "Cartório Limpar Datas Modal",
        ticketNumber: "777002",
        systemType: "Orion PRO",
        globalStatus: "in-progress",
        stages: {
          implementation: {
            status: "in-progress",
            responsible: "Rodrigo Mizuno",
            startDate: new Date("2026-11-23T12:00:00"),
            endDate: new Date("2026-11-27T12:00:00"),
            phase1: {
              status: "in-progress",
              responsible: "Rodrigo Mizuno",
              startDate: new Date("2026-11-23T12:00:00"),
              endDate: new Date("2026-11-27T12:00:00"),
              isConfirmed: false,
            },
            phase2: { status: "todo" },
          },
        },
      } as unknown as ProjectV2;

      render(
        <DeploymentDetailsDialog
          project={mockProject}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      const startInput = screen.getByDisplayValue("2026-11-23");
      fireEvent.change(startInput, { target: { value: "" } });
      fireEvent.blur(startInput);

      const endInput = screen.getByDisplayValue("2026-11-27");
      fireEvent.change(endInput, { target: { value: "" } });
      fireEvent.blur(endInput);

      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      const lastUpdates = mockMutateAsync.mock.calls[1][0].updates;
      expect(lastUpdates.stages.implementation.startDate).toBeUndefined();
      expect(lastUpdates.stages.implementation.endDate).toBeUndefined();
      expect(lastUpdates.stages.implementation.phase1.startDate).toBeUndefined();
      expect(lastUpdates.stages.implementation.phase1.endDate).toBeUndefined();

      const dbPayload = transformToDB(lastUpdates, mockProject);
      expect(dbPayload.implementation_start_date).toBeNull();
      expect(dbPayload.implementation_end_date).toBeNull();
    });
  });

  describe("Automação de Fechamento na Sexta-Feira e Pós-Implantação no Próximo Dia Útil (2 Semanas Úteis)", () => {
    it("calcula exatamente Início em 16/11 e Término em 27/11 quando a Fase 1 termina em 13/11 (10 dias úteis / 2 semanas)", () => {
      expect(getNextBusinessDayKey("2026-11-13")).toBe("2026-11-16");
      expect(addBusinessDaysKey("2026-11-16", 9)).toBe("2026-11-27");

      const schedule = calculatePostImplantationSchedule("2026-11-13T15:00:00.000Z");
      expect(schedule).not.toBeNull();
      expect(schedule?.startDateKey).toBe("2026-11-16");
      expect(schedule?.endDateKey).toBe("2026-11-27");
      expect(schedule?.startDate.toISOString().split("T")[0]).toBe("2026-11-16");
      expect(schedule?.endDate.toISOString().split("T")[0]).toBe("2026-11-27");
    });

    it("calcula Início em 02/11 e Término em 13/11 e ativa Pós 'in-progress' para o caso Campinas (Término Fase 1 em 30/10)", () => {
      const mondayNov17 = new Date(2026, 10, 17, 10, 0, 0);
      const implDone: ImplementationStageV2 = {
        status: "done",
        responsible: "Erik Marques",
        phase1: {
          status: "done",
          responsible: "Erik Marques",
          isConfirmed: true,
          startDate: new Date("2026-10-28T15:00:00.000Z"),
          endDate: new Date("2026-10-30T15:00:00.000Z"),
        },
        phase2: { status: "todo" },
      };

      const syncedPost = syncPostStageFromImplementation({
        implementationStage: implDone,
        currentPostStage: { status: "todo", followupNeeded: false },
        globalStatus: "in-progress",
        systemType: "Orion TN",
        now: mondayNov17,
      });

      expect(syncedPost.status).toBe("in-progress");
      expect(toLocalDateKey(syncedPost.startDate)).toBe("2026-11-02");
      expect(toLocalDateKey(syncedPost.endDate)).toBe("2026-11-13");
      expect(toLocalDateKey(syncedPost.supportEndDate)).toBe("2026-11-13");
    });

    it("na sexta-feira (data final = 13/11), finaliza Etapa 5 + Fase 1 e agenda Pós (16/11 a 27/11) mantendo 'todo' até segunda-feira (16/11)", () => {
      const fridayNov13 = new Date(2026, 10, 13, 16, 0, 0); // Sexta 13/11/2026
      const sundayNov15 = new Date(2026, 10, 15, 12, 0, 0); // Domingo 15/11/2026
      const mondayNov16 = new Date(2026, 10, 16, 9, 0, 0); // Segunda 16/11/2026

      expect(
        shouldAutoFinishPhase1({
          isConfirmed: true,
          startDate: "2026-11-09",
          endDate: "2026-11-13",
          status: "in-progress",
          stageStatus: "in-progress",
          globalStatus: "in-progress",
          systemType: "Orion PRO",
          now: fridayNov13,
        })
      ).toBe(true);

      const implOnFriday = applyPhase1UpdatesWithAutomation({
        currentStage: {
          status: "in-progress",
          responsible: "Rodrigo Brites",
          phase1: {
            status: "in-progress",
            responsible: "Rodrigo Brites",
            isConfirmed: true,
            startDate: new Date("2026-11-09T12:00:00"),
            endDate: new Date("2026-11-13T12:00:00"),
          },
          phase2: { status: "todo" },
        },
        phaseUpdates: {},
        globalStatus: "in-progress",
        systemType: "Orion PRO",
        now: fridayNov13,
      });

      expect(implOnFriday.status).toBe("done");
      expect(implOnFriday.phase1.status).toBe("done");

      // Na sexta-feira (13/11), as datas 16/11 e 27/11 já ficam preenchidas, mas o status aguarda segunda-feira
      const postOnFriday = syncPostStageFromImplementation({
        implementationStage: implOnFriday,
        currentPostStage: { status: "todo", followupNeeded: false },
        globalStatus: "in-progress",
        systemType: "Orion PRO",
        now: fridayNov13,
      });
      expect(postOnFriday.status).toBe("todo");
      expect(toLocalDateKey(postOnFriday.startDate)).toBe("2026-11-16");
      expect(toLocalDateKey(postOnFriday.endDate)).toBe("2026-11-27");

      // No domingo (15/11), continua 'todo'
      const postOnSunday = syncPostStageFromImplementation({
        implementationStage: implOnFriday,
        currentPostStage: postOnFriday,
        globalStatus: "in-progress",
        systemType: "Orion PRO",
        now: sundayNov15,
      });
      expect(postOnSunday.status).toBe("todo");

      // Na segunda-feira (16/11 — próximo dia útil), entra automaticamente em "Em Andamento" ('in-progress')!
      const postOnMonday = syncPostStageFromImplementation({
        implementationStage: implOnFriday,
        currentPostStage: postOnSunday,
        globalStatus: "in-progress",
        systemType: "Orion PRO",
        now: mondayNov16,
      });
      expect(postOnMonday.status).toBe("in-progress");
      expect(toLocalDateKey(postOnMonday.startDate)).toBe("2026-11-16");
      expect(toLocalDateKey(postOnMonday.endDate)).toBe("2026-11-27");
    });

    it("ao reverter manualmente Implantação de 'done' para 'todo' enquanto Pós ainda estava 'todo', limpa as datas pré-agendadas do Pós", () => {
      const oldImpl: ImplementationStageV2 = {
        status: "done",
        phase1: {
          status: "done",
          startDate: new Date("2026-11-09T12:00:00"),
          endDate: new Date("2026-11-13T12:00:00"),
        },
        phase2: { status: "todo" },
      };
      const revertedImpl: ImplementationStageV2 = {
        status: "todo",
        phase1: { status: "todo" },
        phase2: { status: "todo" },
      };

      const clearedPost = syncPostStageFromImplementation({
        implementationStage: revertedImpl,
        oldImplementationStage: oldImpl,
        currentPostStage: {
          status: "todo",
          startDate: new Date("2026-11-16T12:00:00.000Z"),
          endDate: new Date("2026-11-27T12:00:00.000Z"),
          supportEndDate: new Date("2026-11-27T12:00:00.000Z"),
          followupNeeded: false,
        },
        globalStatus: "in-progress",
        systemType: "Orion TN",
      });

      expect(clearedPost.status).toBe("todo");
      expect(clearedPost.startDate).toBeUndefined();
      expect(clearedPost.endDate).toBeUndefined();
      expect(clearedPost.supportEndDate).toBeUndefined();
    });
  });

  describe("Proteção contra ano parcial no input de data (SafeDateInput) e Paridade da Fase 2", () => {
    it("formata anos abaixo de 1000 com padding de 4 dígitos evitando erro '2-12-14' e bloqueia automação para anos < 1900", () => {
      expect(toLocalDateKey("0002-12-14T15:06:28.000Z")).toBe("0002-12-14");
      expect(isValidCalendarYearDateKey("0002-12-14")).toBe(false);
      expect(isValidCalendarYearDateKey("2026-12-14")).toBe(true);

      expect(
        shouldAutoStartPhase1({
          isConfirmed: true,
          status: "todo",
          startDate: new Date("0002-12-14T15:06:28.000Z"),
          endDate: new Date("0002-12-18T15:06:28.000Z"),
          globalStatus: "in-progress",
          now: new Date("2026-11-18T12:00:00"),
        })
      ).toBe(false);

      expect(
        shouldAutoFinishPhase1({
          isConfirmed: true,
          status: "todo",
          stageStatus: "todo",
          startDate: new Date("0002-12-14T15:06:28.000Z"),
          endDate: new Date("0002-12-18T15:06:28.000Z"),
          globalStatus: "in-progress",
          systemType: "Orion REG",
          now: new Date("2026-11-18T12:00:00"),
        })
      ).toBe(false);
    });

    it("SafeDateInput mantém rascunho '0002-12-14' durante digitação sem emitir update e comita apenas quando ano completo >= 1900", () => {
      const onDateChange = vi.fn();
      const { container } = render(
        <SafeDateInput value={undefined} onDateChange={onDateChange} />
      );
      const input = container.querySelector('input[type="date"]') as HTMLInputElement;

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "0002-12-14" } });
      expect(input.value).toBe("0002-12-14");
      expect(onDateChange).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: "2026-12-14" } });
      expect(input.value).toBe("2026-12-14");
      expect(onDateChange).toHaveBeenCalledTimes(1);
      expect(toLocalDateKey(onDateChange.mock.calls[0][0])).toBe("2026-12-14");

      // Ao desfocar com valor parcial incompleto, restaura o último valor externo válido
      fireEvent.change(input, { target: { value: "0020-12-14" } });
      fireEvent.blur(input);
      expect(input.value).toBe("");
    });

    it("aplica confirmação e automações na Fase 2 sem alterar Fase 1, Etapa 5 pai ou Pós-Implantação", () => {
      const baseStage: ImplementationStageV2 = {
        status: "done",
        responsible: "Julio Araujo",
        startDate: new Date("2026-11-02T12:00:00"),
        endDate: new Date("2026-11-06T12:00:00"),
        phase1: {
          status: "done",
          responsible: "Julio Araujo",
          isConfirmed: true,
          confirmedAt: "2026-10-20T10:00:00.000Z",
          startDate: new Date("2026-11-02T12:00:00"),
          endDate: new Date("2026-11-06T12:00:00"),
        },
        phase2: {
          status: "todo",
          responsible: "Ricardo Vieira",
          startDate: new Date("2026-11-18T12:00:00"),
          endDate: new Date("2026-11-20T12:00:00"),
        },
      };

      expect(
        shouldAutoStartPhase2({
          isConfirmed: true,
          status: "todo",
          startDate: baseStage.phase2.startDate,
          endDate: baseStage.phase2.endDate,
          globalStatus: "in-progress",
          now: new Date("2026-11-18T09:00:00"),
        })
      ).toBe(true);

      const confirmedResult = applyPhase2UpdatesWithAutomation({
        currentStage: baseStage,
        phaseUpdates: { isConfirmed: true },
        globalStatus: "in-progress",
        systemType: "Orion PRO",
        now: new Date("2026-11-18T14:30:00.000Z"),
      });

      expect(confirmedResult.phase2.isConfirmed).toBe(true);
      expect(confirmedResult.phase2.confirmedAt).toBe("2026-11-18T14:30:00.000Z");
      expect(confirmedResult.phase2.status).toBe("in-progress");
      // Fase 1 e etapa pai permanecem preservadas
      expect(confirmedResult.status).toBe("done");
      expect(confirmedResult.responsible).toBe("Julio Araujo");
      expect(confirmedResult.phase1.status).toBe("done");

      expect(
        shouldAutoFinishPhase2({
          isConfirmed: true,
          status: "in-progress",
          startDate: baseStage.phase2.startDate,
          endDate: baseStage.phase2.endDate,
          globalStatus: "in-progress",
          systemType: "Orion PRO",
          now: new Date("2026-11-20T09:00:00"),
        })
      ).toBe(true);
    });

    it("renderiza interruptor de confirmação, nota de data/hora e + Implantador também na Fase 2", () => {
      const onUpdatePhase = vi.fn();
      const confirmedAt = "2026-11-18T15:00:00.000Z";
      const expectedFormatted = formatConfirmationTimestamp(confirmedAt);
      const stage: ImplementationStageV2 = {
        status: "done",
        responsible: "Julio Araujo",
        phase1: { status: "done", responsible: "Julio Araujo" },
        phase2: {
          status: "todo",
          responsible: "Ricardo Vieira",
          isConfirmed: true,
          confirmedAt,
        },
      };

      render(
        <ImplementationStageForm
          stage={stage}
          canEditProjects={true}
          onUpdatePhase={onUpdatePhase}
        />
      );

      const notePhase2 = screen.getByTestId("phase2-confirmation-note");
      expect(notePhase2.textContent).toContain(
        `Implantação foi confirmada pelo cliente após contato em ${expectedFormatted}!`
      );
      expect(screen.getAllByText("+ Implantador")).toHaveLength(2);
    });
  });
});
