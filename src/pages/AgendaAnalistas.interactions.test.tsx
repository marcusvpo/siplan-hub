import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AgendaAnalistas from "./AgendaAnalistas";
import { unifyAgendaEvents } from "@/lib/agenda-unifier";
import {
  extractContactDetails,
  getCriticidadeBadgeConfig,
} from "@/components/agenda/AgendaEntryDetailDialog";
import type { ProjectV2 } from "@/types/ProjectV2";
import type { UnifiedAgendaEvent, AnalystAgendaEntry } from "@/types/agenda";
import { toast } from "sonner";

// Mocks dos módulos do sistema
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockEvents: UnifiedAgendaEvent[] = [
  {
    id: "manual-1",
    rawEntryId: "entry-1",
    userName: "Maria Santos",
    userId: "428879ee-95b3-429f-a48e-2fba91da9ff8",
    ticketNumber: "759900",
    ticketCatalog: "orion",
    clientName: "Cartório Modelo SP",
    subject: "Treinamento Orion TN",
    activityType: "implantacao",
    date: "2026-10-15",
    startTime: "08:30",
    endTime: "17:30",
    isAllDay: true,
    origin: "manual_entry",
    isConfirmed: true,
    status: "Confirmada",
  },
  {
    id: "adh-proj-1",
    userName: "Lunna Santana",
    userId: "c9bc1cb5-29d5-426e-b178-bedc76cdfbd0",
    projectId: "proj-1",
    ticketNumber: "759901",
    ticketCatalog: "orion",
    clientName: "Cartório Central",
    subject: "Análise de Aderência Orion",
    activityType: "aderencia",
    date: "2026-10-15",
    startTime: "08:30",
    endTime: "12:30",
    isAllDay: false,
    origin: "adherence",
    isConfirmed: true,
    status: "Agendada",
  },
];

vi.mock("@/hooks/useAnalystAgenda", () => ({
  useAnalystAgenda: () => ({
    events: mockEvents,
    holidays: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createEntry: vi.fn(),
    createBulkEntries: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    isDeleting: false,
    isUpdating: false,
  }),
}));

vi.mock("@/hooks/useHubCollaborators", () => ({
  useHubCollaborators: () => ({
    data: [
      {
        id: "428879ee-95b3-429f-a48e-2fba91da9ff8",
        name: "Maria Santos",
        fullName: "Maria Santos",
        email: "maria.santos@siplan.com.br",
        team: "Implantação",
      },
      {
        id: "c9bc1cb5-29d5-426e-b178-bedc76cdfbd0",
        name: "Lunna Santana",
        fullName: "Lunna Santana",
        email: "lunna.santana@siplan.com.br",
        team: "Implantação",
      },
      {
        id: "collab-3",
        name: "Carlos Eduardo",
        fullName: "Carlos Eduardo",
        email: "carlos.eduardo@siplan.com.br",
        team: "Implantação",
      },
      {
        id: "collab-4",
        name: "Julio Araujo",
        fullName: "Julio Araujo",
        email: "julio.araujo@siplan.com.br",
        team: "Implantação",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useAgendaPermissions", () => ({
  useAgendaPermissions: () => ({
    isManager: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManage: true,
    userEmail: "maria.santos@siplan.com.br",
    restrictedTooltip: "",
  }),
}));

vi.mock("@/hooks/useChamados0800", () => ({
  useChamado0800ByNumber: () => ({
    data: {
      numero_chamado: "759900",
      cliente: "Cartório Modelo SP",
      solicitante: "João da Silva (11) 98765-4321 joao@cartorio.com.br",
      titulo: "Treinamento Orion TN",
      sistema: "Orion TN",
      descricao: "Solicitação de treinamento completo para novos escreventes",
      criticidade: "Alta",
    },
    isLoading: false,
  }),
  useChamadoTramites: () => ({
    tramites: [
      {
        numeroTramite: 1,
        sequenciaTramite: 1,
        data: "2026-10-10 14:00",
        responsavel: "Maria Santos",
        equipeResponsavel: "Implantação",
        atividade: "Agendamento confirmado",
        descricao: "Data alinhada com o tabelião responsável.",
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useProjectDetails", () => ({
  useProjectDetails: (projectId?: string | null) => ({
    project: projectId
      ? ({
          id: projectId,
          clientName: "Cartório Modelo SP",
          systemType: "Orion TN",
          healthScore: "good",
          globalStatus: "active",
          stages: {},
        } as unknown as ProjectV2)
      : null,
    isLoading: false,
  }),
}));

function renderAgendaApp(initialUrl = "/agenda-analistas?date=2026-10-15&view=month&analysts=Maria%20Santos") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <AgendaAnalistas />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AgendaAnalistas — Suíte Abrangente de Interações & Regras de Negócio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. NAVEGAÇÃO E ATALHOS DE TECLADO
  // --------------------------------------------------------------------------
  describe("Navegação e Atalhos de Teclado", () => {
    it("permite alternar entre as visões de Mês, Semana e Dia via botões de abas", async () => {
      renderAgendaApp();

      const monthTab = screen.getByRole("tab", { name: /Mês/i });
      const weekTab = screen.getByRole("tab", { name: /Semana/i });
      const dayTab = screen.getByRole("tab", { name: /Dia/i });

      expect(monthTab).toHaveAttribute("data-state", "active");

      // Alterna para Semana via teclado
      fireEvent.keyDown(weekTab, { key: "Enter" });
      await waitFor(() => {
        expect(weekTab).toHaveAttribute("data-state", "active");
      });

      // Alterna para Dia via teclado
      fireEvent.keyDown(dayTab, { key: "Enter" });
      await waitFor(() => {
        expect(dayTab).toHaveAttribute("data-state", "active");
      });
    });

    it("responde a atalhos de teclado ('W' para Semana, 'D' para Dia, 'M' para Mês, 'T' para Hoje)", async () => {
      renderAgendaApp();

      const weekTab = screen.getByRole("tab", { name: /Semana/i });
      const dayTab = screen.getByRole("tab", { name: /Dia/i });
      const monthTab = screen.getByRole("tab", { name: /Mês/i });

      // Tecla 'W' -> Muda para Semana
      fireEvent.keyDown(window, { key: "w" });
      await waitFor(() => {
        expect(weekTab).toHaveAttribute("data-state", "active");
      });

      // Tecla 'D' -> Muda para Dia
      fireEvent.keyDown(window, { key: "d" });
      await waitFor(() => {
        expect(dayTab).toHaveAttribute("data-state", "active");
      });

      // Tecla 'M' -> Volta para Mês
      fireEvent.keyDown(window, { key: "m" });
      await waitFor(() => {
        expect(monthTab).toHaveAttribute("data-state", "active");
      });

      // Tecla 'T' -> Aciona retorno para a data de hoje sem quebrar
      fireEvent.keyDown(window, { key: "t" });
      expect(monthTab).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. FILTRO MULTI-ANALISTAS E LIMITE DE 3
  // --------------------------------------------------------------------------
  describe("Filtro Multi-Analistas e Limitação Estrita", () => {
    it("bloqueia a seleção de um 4º analista emitindo toast de aviso", async () => {
      // Inicia a URL já com 3 analistas selecionados
      renderAgendaApp(
        "/agenda-analistas?date=2026-10-15&view=month&analysts=Maria%20Santos,Lunna%20Santana,Carlos%20Eduardo"
      );

      // Abre o popover de analistas / responsáveis
      const analystPopoverBtn = screen.getByRole("button", {
        name: /Filtrar por responsável/i,
      });
      fireEvent.click(analystPopoverBtn);

      // Procura o 4º analista não selecionado: Julio Araujo
      const fourthAnalystCheckbox = await screen.findByText("Julio Araujo");
      fireEvent.click(fourthAnalystCheckbox);

      // Verifica se o toast.warning foi invocado com a mensagem correta
      expect(toast.warning).toHaveBeenCalledWith(
        "Limite de até 3 analistas simultâneos atingido",
        expect.objectContaining({
          description: expect.stringContaining("desmarque um dos 3 analistas"),
        })
      );
    });

    it("permite remover analista selecionado clicando no chip de remoção", async () => {
      renderAgendaApp(
        "/agenda-analistas?date=2026-10-15&view=month&analysts=Maria%20Santos"
      );

      // O botão de remoção do chip de Maria Santos deve estar visível
      const removeBtn = screen.getByRole("button", {
        name: /Remover filtro de Maria Santos/i,
      });
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);

      // Após clique, o chip é removido
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Remover filtro de Maria Santos/i })).toBeNull();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. DIVISÃO PROPORCIONAL DE HORAS (REGRA DE NEGÓCIO DA AGENDA SIPLAN)
  // --------------------------------------------------------------------------
  describe("Cálculo de Horas Proporcionais em Dias Multi-Atividades", () => {
    it("atribui o dia inteiro (08:30 às 17:30) para 1 única atividade no dia", () => {
      const singleProject: Partial<ProjectV2> = {
        id: "proj-single",
        clientName: "Cartório Único",
        ticketNumber: "1001",
        systemType: "Orion TN",
        stages: {
          adherence: {
            status: "in-progress",
            responsible: "Maria Santos",
            endDate: new Date("2026-10-15T12:00:00"),
          },
        } as any,
      };

      const events = unifyAgendaEvents({
        projects: [singleProject as ProjectV2],
        startDate: new Date("2026-10-15T00:00:00"),
        endDate: new Date("2026-10-15T23:59:59"),
      });

      expect(events).toHaveLength(1);
      expect(events[0].startTime).toBe("08:30");
      expect(events[0].endTime).toBe("17:30");
    });

    it("divide o dia em 2 metades (08:30-12:30 e 13:30-17:30) para 2 atividades no mesmo dia", () => {
      const projectA: Partial<ProjectV2> = {
        id: "proj-a",
        clientName: "Cartório A",
        ticketNumber: "1002",
        systemType: "Orion TN",
        stages: {
          adherence: {
            status: "in-progress",
            responsible: "Maria Santos",
            endDate: new Date("2026-10-15T12:00:00"),
          },
        } as any,
      };

      const manualEntry: AnalystAgendaEntry = {
        id: "entry-m",
        userId: "428879ee-95b3-429f-a48e-2fba91da9ff8",
        userName: "Maria Santos",
        ticketNumber: "1003",
        ticketCatalog: "orion",
        clientName: "Cartório B",
        subject: "Configuração de Backup",
        activityType: "configuracao",
        date: "2026-10-15",
        startTime: null,
        endTime: null,
        isAllDay: true,
        createdAt: "2026-10-01T10:00:00Z",
        updatedAt: "2026-10-01T10:00:00Z",
      };

      const events = unifyAgendaEvents({
        projects: [projectA as ProjectV2],
        manualEntries: [manualEntry],
        startDate: new Date("2026-10-15T00:00:00"),
        endDate: new Date("2026-10-15T23:59:59"),
      });

      expect(events).toHaveLength(2);
      // O evento prioritário de Aderência fica na parte da manhã
      const adherenceEvent = events.find((e) => e.origin === "adherence");
      const manualEvt = events.find((e) => e.origin === "manual_entry");

      expect(adherenceEvent?.startTime).toBe("08:30");
      expect(adherenceEvent?.endTime).toBe("12:30");
      expect(manualEvt?.startTime).toBe("13:30");
      expect(manualEvt?.endTime).toBe("17:30");
    });

    it("divide o dia em 3 partes (08:30-11:30, 11:30-14:30 e 14:30-17:30) para 3 atividades no mesmo dia", () => {
      const manualEntries: AnalystAgendaEntry[] = [
        {
          id: "m1",
          userId: "428879ee-95b3-429f-a48e-2fba91da9ff8",
          userName: "Maria Santos",
          ticketNumber: "111",
          ticketCatalog: "orion",
          clientName: "Cartório Alpha",
          subject: "Atividade 1",
          activityType: "chamado",
          date: "2026-10-15",
          startTime: null,
          endTime: null,
          isAllDay: true,
          createdAt: "2026-10-01T10:00:00Z",
          updatedAt: "2026-10-01T10:00:00Z",
        },
        {
          id: "m2",
          userId: "428879ee-95b3-429f-a48e-2fba91da9ff8",
          userName: "Maria Santos",
          ticketNumber: "222",
          ticketCatalog: "orion",
          clientName: "Cartório Beta",
          subject: "Atividade 2",
          activityType: "chamado",
          date: "2026-10-15",
          startTime: null,
          endTime: null,
          isAllDay: true,
          createdAt: "2026-10-01T10:00:00Z",
          updatedAt: "2026-10-01T10:00:00Z",
        },
        {
          id: "m3",
          userId: "428879ee-95b3-429f-a48e-2fba91da9ff8",
          userName: "Maria Santos",
          ticketNumber: "333",
          ticketCatalog: "orion",
          clientName: "Cartório Gamma",
          subject: "Atividade 3",
          activityType: "chamado",
          date: "2026-10-15",
          startTime: null,
          endTime: null,
          isAllDay: true,
          createdAt: "2026-10-01T10:00:00Z",
          updatedAt: "2026-10-01T10:00:00Z",
        },
      ];

      const events = unifyAgendaEvents({
        projects: [],
        manualEntries,
        startDate: new Date("2026-10-15T00:00:00"),
        endDate: new Date("2026-10-15T23:59:59"),
      });

      expect(events).toHaveLength(3);
      expect(events[0].startTime).toBe("08:30");
      expect(events[0].endTime).toBe("11:30");
      expect(events[1].startTime).toBe("11:30");
      expect(events[1].endTime).toBe("14:30");
      expect(events[2].startTime).toBe("14:30");
      expect(events[2].endTime).toBe("17:30");
    });
  });

  // --------------------------------------------------------------------------
  // 4. MODAL DE DETALHES E AÇÕES (COPIAR RESUMO, CONTATOS, LINKS)
  // --------------------------------------------------------------------------
  describe("Modal de Detalhes da Atividade & Operações", () => {
    it("abre o diálogo de detalhes ao clicar no card de um agendamento", async () => {
      renderAgendaApp();

      // Clica no card de Treinamento Orion TN através do role button
      const card = screen.getByRole("button", { name: /Cartório Modelo SP/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: "Treinamento Orion TN" })
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Copiar Resumo/i })).toBeInTheDocument();
      });
    });

    it("copia o resumo executivo para a área de transferência com sucesso", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      renderAgendaApp();

      // Abre detalhes clicando no card
      const card = screen.getByRole("button", { name: /Cartório Modelo SP/i });
      fireEvent.click(card);

      const copyBtn = await screen.findByRole("button", { name: /Copiar Resumo/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith(
          "Resumo do agendamento copiado para a área de transferência!"
        );
      });
    });

    it("extrai corretamente telefone, email e gera link de WhatsApp do solicitante", () => {
      const contact = extractContactDetails(
        "Dr. Carlos Alberto (11) 99876-5432 carlos@cartorio.com.br",
        "Atendimento com urgência para implantação"
      );

      expect(contact.nome).toBe("Dr. Carlos Alberto");
      expect(contact.telefone).toBe("(11) 99876-5432");
      expect(contact.email).toBe("carlos@cartorio.com.br");
      expect(contact.whatsappUrl).toBe("https://wa.me/5511998765432");
    });

    it("retorna estilo correto para criticidade Alta e Crítica", () => {
      const alta = getCriticidadeBadgeConfig("Alta");
      expect(alta.label).toBe("Alta");
      expect(alta.className).toContain("text-amber-800");

      const critica = getCriticidadeBadgeConfig("Urgente / Crítica");
      expect(critica.className).toContain("text-rose-700");
    });
  });
});
