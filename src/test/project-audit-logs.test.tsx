import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ProjectV2 } from "@/types/ProjectV2";
import type { TimelineEventRecord } from "@/hooks/useTimelineEvents";

const mocks = vi.hoisted(() => ({
  timelineEvents: [] as TimelineEventRecord[],
  isLoadingTimeline: false,
  insertedRows: [] as Array<Record<string, unknown>>,
  getUserMock: vi.fn(),
  profileSingleMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mocks.getUserMock(...args),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mocks.profileSingleMock(),
            }),
          }),
        };
      }
      if (table === "timeline_events") {
        return {
          insert: (payload: Record<string, unknown>) => {
            mocks.insertedRows.push(payload);
            return Promise.resolve({ error: null });
          },
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({ data: mocks.timelineEvents, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    },
  },
}));

vi.mock("@/hooks/useTimelineEvents", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useTimelineEvents")>(
    "@/hooks/useTimelineEvents",
  );
  return {
    ...actual,
    useTimelineEvents: () => ({
      data: mocks.timelineEvents,
      isLoading: mocks.isLoadingTimeline,
    }),
  };
});

import {
  computeProjectAuditChanges,
  extractReadableText,
} from "@/utils/project-audit-diff";
import {
  clearActorCache,
  clearProjectViewDeduplicationCache,
  recordProjectViewLog,
  resolveCurrentActor,
} from "@/services/projectLogService";
import { LogsTab } from "@/components/ProjectManagement/Tabs/LogsTab";

function makeLexicalJson(lines: string[]): string {
  return JSON.stringify({
    root: {
      type: "root",
      version: 1,
      direction: "ltr",
      format: "",
      indent: 0,
      children: lines.map((line) => ({
        type: "paragraph",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: line
          ? [
              {
                type: "text",
                version: 1,
                text: line,
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
              },
            ]
          : [],
      })),
    },
  });
}

function createBaseProject(overrides: Partial<ProjectV2> = {}): ProjectV2 {
  return {
    id: "proj-audit-1",
    clientName: "1º Ofício de Notas de Araraquara",
    ticketNumber: "770123",
    systemType: "Orion TN",
    specialty: "Notas",
    implantationType: "new",
    projectType: "new",
    tags: ["Prioridade"],
    priority: "normal",
    healthScore: "ok",
    globalStatus: "in-progress",
    overallProgress: 40,
    projectLeader: "Bruno Fernandes",
    soldHours: 40,
    legacySystem: "Cartório XYZ",
    products: ["LCW"],
    relatedTickets: [{ name: "LCW", number: "770200" }],
    createdAt: new Date("2026-10-01T12:00:00Z"),
    lastUpdatedAt: new Date("2026-10-10T12:00:00Z"),
    lastUpdatedBy: "Bruno Fernandes",
    isDeleted: false,
    isArchived: false,
    notes: {
      id: "notes-1",
      projectId: "proj-audit-1",
      blocks: [
        {
          id: "blk-1",
          type: "paragraph",
          content: makeLexicalJson(["Observação inicial do cartório", "Segunda linha"]),
        },
      ],
      lastEditedBy: "Bruno Fernandes",
      lastEditedAt: new Date("2026-10-10T12:00:00Z"),
    },
    stages: {
      infra: {
        status: "todo",
        responsible: "Alex Silva",
        clientResponsible: "João Técnico",
        serverStatus: "Adequado",
        workstationsStatus: "Adequado",
        workstationsCount: 10,
        serverInUse: "Dell T340",
        serverNeeded: "Dell T350",
        technicalNotes: "Infraestrutura avaliada",
        publicLinkClosed: false,
        servers: [{ hostname: "SRV-CARTORIO-01", os: "Windows Server 2022" }],
        workstations: [{ hostname: "EST-01", user: "Maria" }],
        observations: makeLexicalJson(["Obs infra antes"]),
      },
      adherence: {
        status: "todo",
        responsible: "Bruno Fernandes",
        hasProductGap: false,
        gapDescription: "",
        analysisComplete: false,
        observations: "",
      },
      conversion: {
        status: "todo",
        responsible: "Ademar Souza",
        homologationStatus: "Aguardando Adequação",
        homologationResponsible: "Luciane Lima",
        recordCount: 1000,
        observations: "",
      },
      environment: {
        status: "todo",
        responsible: "Hugo Januário",
        approvedByInfra: true,
        testAvailable: false,
        osType: "Linux",
        osVersion: "Ubuntu 22.04",
        postgresVersion: "Versão 17",
        postgresHost: "192.168.0.10:5432",
        postgresUser: "postgres",
        postgresPassword: "OldPgPassword!123",
        orionAdminConfigured: false,
        orionAdminConfig:
          "urlAdminCentral=wss://admin.siplan.com.br\nsenhaAdminCentral=SegredoOrion123",
        remoteAccessList: [
          { system: "AnyDesk", id: "111222333", password: "OldRemotePassword!" },
        ],
        osCredentials: [
          {
            id: "cred-1",
            title: "Servidor Linux",
            fields: [
              { id: "f-ip", label: "IP", value: "192.168.0.10" },
              { id: "f-usr", label: "Usuário", value: "root" },
              { id: "f-pwd", label: "Senha", value: "SenhaSuperSecreta123" },
            ],
          },
        ],
        screenshots: [{ path: "proj-audit-1/print1.png", name: "print1.png" }],
      },
      modelosEditor: {
        status: "todo",
        responsible: "Maria Santos",
        sentFiles: [
          {
            id: "m1",
            name: "Procuracao.docx",
            path: "proj-audit-1/Procuracao.docx",
            size: 1024,
            uploadedAt: "2026-10-05T10:00:00Z",
            isDone: false,
          },
        ],
        availableFiles: [],
      },
      implementation: {
        status: "todo",
        responsible: "Julio Araujo",
        phase1: {
          status: "todo",
          isConfirmed: false,
          responsible: "Julio Araujo",
          additionalResponsibles: [],
          startDate: new Date("2026-11-16T12:00:00Z"),
          endDate: new Date("2026-11-20T12:00:00Z"),
          trainingLocation: "Presencial",
          observations: makeLexicalJson(["Planejamento inicial Fase 1"]),
        },
        phase2: {
          status: "todo",
          responsible: "",
          observations: "",
        },
      },
      post: {
        status: "todo",
        responsible: "Lunna Santana",
        followupNeeded: false,
        observations: JSON.stringify({
          v: 2,
          blocks: [
            { id: "b1", content: makeLexicalJson(["Dia 1 pós tranquilo"]) },
          ],
          summary: makeLexicalJson(["Resumo anterior"]),
        }),
      },
    },
    ...overrides,
  };
}

describe("Auditoria e Logs do Projeto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertedRows = [];
    mocks.timelineEvents = [];
    mocks.isLoadingTimeline = false;
    clearActorCache();
    clearProjectViewDeduplicationCache();

    mocks.getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "marcus.ortiz@siplan.com.br",
          user_metadata: { full_name: "Marcus Ortiz Meta" },
        },
      },
    });
    mocks.profileSingleMock.mockResolvedValue({
      data: {
        full_name: "Marcus Ortiz",
        email: "marcus.ortiz@siplan.com.br",
        role: "admin",
      },
    });
  });

  describe("extractReadableText e computeProjectAuditChanges", () => {
    it("extrai texto legível de Lexical, HTML e blocos v2 do Pós-Implantação sem despejar JSON bruto", () => {
      const lexical = makeLexicalJson(["Linha 1", "Linha 2"]);
      expect(extractReadableText(lexical)).toBe("Linha 1\nLinha 2");

      const html = "<p>Parágrafo <strong>negrito</strong></p><br/><ul><li>Item A</li></ul>";
      expect(extractReadableText(html)).toBe("Parágrafo negrito\n\n• Item A");

      const emptyLexical = makeLexicalJson([""]);
      expect(extractReadableText(emptyLexical)).toBe("");

      const postV2 = JSON.stringify({
        v: 2,
        blocks: [{ id: "1", content: makeLexicalJson(["Bloco único"]) }],
        summary: makeLexicalJson(["Resumo final"]),
      });
      expect(extractReadableText(postV2)).toBe("Bloco 1:\nBloco único\n\nResumo Geral:\nResumo final");
    });

    it("detecta alteração em Observações Gerais na aba Informações Gerais com antes e depois legíveis", () => {
      const oldProj = createBaseProject();
      const newProj = createBaseProject({
        notes: {
          ...oldProj.notes!,
          blocks: [
            {
              id: "blk-new",
              type: "paragraph",
              content: makeLexicalJson(["Observação atualizada", "Confirmado com titular"]),
            },
          ],
        },
      });

      const events = computeProjectAuditChanges(oldProj, newProj);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: "field_change",
        category: "general",
        actionType: "field_change",
        tabLabel: "Informações Gerais",
        fieldLabel: "Observações Gerais",
        oldValue: "Observação inicial do cartório\nSegunda linha",
        newValue: "Observação atualizada\nConfirmado com titular",
      });
      expect(events[0].message).toContain("Observações Gerais");
      expect(events[0].message).toContain("Informações Gerais");
    });

    it("detecta alterações nas 7 etapas, modo Editar Projeto e mascara senhas em Preparação de Ambiente", () => {
      const oldProj = createBaseProject();
      const newProj = createBaseProject({
        clientName: "1º Ofício de Notas de Araraquara - Atualizado",
        globalStatus: "blocked",
        products: ["LCW", "SGA"],
        stages: {
          ...oldProj.stages,
          infra: {
            ...oldProj.stages.infra,
            status: "done",
            clientResponsible: "Carlos TI",
            publicLinkClosed: true,
            servers: [
              { hostname: "SRV-CARTORIO-01", os: "Windows Server 2022" },
              { hostname: "SRV-BACKUP-02", os: "Ubuntu 24.04" },
            ],
            workstations: [
              { hostname: "EST-01", user: "Maria" },
              { hostname: "EST-02", user: "Pedro" },
            ],
          },
          adherence: {
            ...oldProj.stages.adherence,
            hasProductGap: true,
            gapDescription: "Necessita integração com selo estadual",
          },
          conversion: {
            ...oldProj.stages.conversion,
            sentAt: new Date("2026-10-12T12:00:00Z"),
            homologationStatus: "Adequado",
            homologationResponsible: "Rodrigo Brites",
            homologationFinishedAt: new Date("2026-10-20T12:00:00Z"),
            toolUsed: "Firebird 2.5",
          },
          environment: {
            ...oldProj.stages.environment,
            osType: "Windows",
            postgresHost: "192.168.0.20:5432",
            postgresPassword: "NewPgPassword!999",
            orionAdminConfigured: true,
            orionAdminConfig:
              "urlAdminCentral=wss://admin.siplan.com.br\nsenhaAdminCentral=NovaSenhaSecreta!456",
            remoteAccessList: [
              { system: "AnyDesk", id: "111222333", password: "NewRemotePassword!" },
            ],
            osCredentials: [
              {
                id: "cred-1",
                title: "Servidor Linux",
                fields: [
                  { id: "f-ip", label: "IP", value: "192.168.0.20" },
                  { id: "f-usr", label: "Usuário", value: "siplan" },
                  { id: "f-pwd", label: "Senha", value: "NovaSenhaSuperSecreta999" },
                ],
              },
            ],
            screenshots: [
              { path: "proj-audit-1/print1.png", name: "print1.png" },
              { path: "proj-audit-1/print2.png", name: "print2.png" },
            ],
          },
          modelosEditor: {
            ...oldProj.stages.modelosEditor!,
            sentFiles: [
              {
                id: "m1",
                name: "Procuracao.docx",
                path: "proj-audit-1/Procuracao.docx",
                size: 1024,
                uploadedAt: "2026-10-05T10:00:00Z",
                isDone: true,
              },
            ],
            availableFiles: [
              {
                id: "a1",
                name: "Procuracao.json",
                path: "proj-audit-1/Procuracao.json",
                size: 512,
                uploadedAt: "2026-10-06T10:00:00Z",
              },
            ],
          },
          implementation: {
            ...oldProj.stages.implementation,
            phase1: {
              ...oldProj.stages.implementation.phase1,
              status: "in-progress",
              isConfirmed: true,
              responsible: "Ricardo Vieira",
              additionalResponsibles: [
                {
                  id: "add-1",
                  responsible: "Julio Araujo",
                  startDate: new Date("2026-11-16T12:00:00Z"),
                  endDate: new Date("2026-11-18T12:00:00Z"),
                },
              ],
              observations: makeLexicalJson(["Treinamento confirmado presencialmente"]),
            },
            phase2: {
              ...oldProj.stages.implementation.phase2,
              status: "in-progress",
              isConfirmed: true,
              responsible: "Ricardo Vieira",
              additionalResponsibles: [
                {
                  id: "add-p2-1",
                  responsible: "Rodrigo Brites",
                  startDate: new Date("2026-11-23T12:00:00Z"),
                  endDate: new Date("2026-11-24T12:00:00Z"),
                },
              ],
              observations: makeLexicalJson(["Retorno agendado"]),
            },
          },
          post: {
            ...oldProj.stages.post,
            supportEndDate: new Date("2026-12-05T12:00:00Z"),
            observations: JSON.stringify({
              v: 2,
              blocks: [
                { id: "b1", content: makeLexicalJson(["Dia 1 pós tranquilo", "Dia 2 sem chamados"]) },
              ],
              summary: makeLexicalJson(["Resumo atualizado pela gestão"]),
            }),
          },
        },
      });

      const events = computeProjectAuditChanges(oldProj, newProj);
      const byField = new Map(events.map((e) => [e.changes[0]?.field, e]));

      // Edição de Projeto
      expect(byField.get("clientName")?.newValue).toContain("Atualizado");
      expect(byField.get("globalStatus")?.oldValue).toBe("Em Andamento");
      expect(byField.get("globalStatus")?.newValue).toBe("Pausado");
      expect(byField.get("products")?.newValue).toBe("LCW, SGA");

      // Infra
      expect(byField.get("stages.infra.status")?.oldValue).toBe("Não Iniciado");
      expect(byField.get("stages.infra.status")?.newValue).toBe("Finalizado");
      expect(byField.get("stages.infra.clientResponsible")?.newValue).toBe("Carlos TI");
      expect(byField.get("stages.infra.publicLinkClosed")?.newValue).toBe("Fechado");
      expect(byField.get("stages.infra.servers")?.newValue).toContain("SRV-BACKUP-02");
      expect(byField.get("stages.infra.workstations")?.newValue).toContain("EST-02");

      // Aderência
      expect(byField.get("stages.adherence.hasProductGap")?.newValue).toBe("Sim");
      expect(byField.get("stages.adherence.gapDescription")?.newValue).toBe(
        "Necessita integração com selo estadual",
      );

      // Conversão
      expect(byField.get("stages.conversion.homologationStatus")?.newValue).toBe("Adequado");
      expect(byField.get("stages.conversion.homologationResponsible")?.newValue).toBe(
        "Rodrigo Brites",
      );
      expect(byField.get("stages.conversion.sourceEngine")?.newValue).toBe("Firebird 2.5");

      // Ambiente + Mascaramento de senhas
      const pgPwdEvent = byField.get("stages.environment.postgresPassword");
      expect(pgPwdEvent).toBeDefined();
      expect(pgPwdEvent?.oldValue).toBe("••••••••");
      expect(pgPwdEvent?.newValue).toContain("••••••••");
      expect(JSON.stringify(events)).not.toContain("OldPgPassword!123");
      expect(JSON.stringify(events)).not.toContain("NewPgPassword!999");
      expect(JSON.stringify(events)).not.toContain("OldRemotePassword!");
      expect(JSON.stringify(events)).not.toContain("NewRemotePassword!");
      expect(JSON.stringify(events)).not.toContain("SenhaSuperSecreta123");
      expect(JSON.stringify(events)).not.toContain("NovaSenhaSuperSecreta999");
      expect(JSON.stringify(events)).not.toContain("SegredoOrion123");
      expect(JSON.stringify(events)).not.toContain("NovaSenhaSecreta!456");

      expect(byField.get("stages.environment.orionAdminConfig")?.newValue).toContain(
        "senhaAdminCentral=••••••••",
      );
      expect(byField.get("stages.environment.screenshots")?.newValue).toContain("print2.png");

      // Modelos Editor
      expect(byField.get("stages.modelosEditor.sentFiles")?.newValue).toContain("[Concluído]");
      expect(byField.get("stages.modelosEditor.availableFiles")?.newValue).toContain(
        "Procuracao.json",
      );

      // Implantação Fase 1 e Fase 2
      expect(byField.get("stages.implementation.phase1.isConfirmed")?.newValue).toBe("Confirmada");
      expect(byField.get("stages.implementation.phase1.responsible")?.newValue).toBe(
        "Ricardo Vieira",
      );
      expect(byField.get("stages.implementation.phase1.additionalResponsibles")?.newValue).toContain(
        "Julio Araujo",
      );
      expect(byField.get("stages.implementation.phase2.status")?.newValue).toBe("Em Andamento");
      expect(byField.get("stages.implementation.phase2.isConfirmed")?.newValue).toBe("Confirmada");
      expect(byField.get("stages.implementation.phase2.additionalResponsibles")?.newValue).toContain(
        "Rodrigo Brites",
      );

      // Pós-Implantação (blocos + resumo separados)
      expect(byField.get("stages.post.supportEndDate")?.newValue).toBe("05/12/2026");
      expect(byField.get("stages.post.observations.blocks")?.newValue).toContain(
        "Dia 2 sem chamados",
      );
      expect(byField.get("stages.post.observations.summary")?.newValue).toBe(
        "Resumo atualizado pela gestão",
      );
    });

    it("não gera falso positivo de responsável de implantação quando valores normalizados são iguais", () => {
      const oldProj = createBaseProject();
      const newProj = createBaseProject({
        stages: {
          ...oldProj.stages,
          implementation: {
            ...oldProj.stages.implementation,
            responsible: "Julio Araujo ",
            phase1: {
              ...oldProj.stages.implementation.phase1,
              responsible: "Julio Araujo",
            },
          },
        },
      });

      const events = computeProjectAuditChanges(oldProj, newProj);
      expect(events).toHaveLength(0);
    });
  });

  describe("projectLogService (ator real e deduplicação de visualização)", () => {
    it("resolve o nome real da tabela profiles e deduplica visualizações repetidas na mesma janela", async () => {
      const actor = await resolveCurrentActor();
      expect(actor).toEqual({
        userId: "user-123",
        fullName: "Marcus Ortiz",
        email: "marcus.ortiz@siplan.com.br",
        role: "admin",
      });

      const first = await recordProjectViewLog("proj-audit-1", "modal");
      const duplicate = await recordProjectViewLog("proj-audit-1", "modal");
      const pageOpen = await recordProjectViewLog("proj-audit-1", "page");

      expect(first).toBe(true);
      expect(duplicate).toBe(false);
      expect(pageOpen).toBe(true);
      expect(mocks.insertedRows).toHaveLength(2);
      expect(mocks.insertedRows[0]).toMatchObject({
        project_id: "proj-audit-1",
        type: "project_view",
        author: "Marcus Ortiz",
        message: "Projeto visualizado no modal",
      });
      expect(mocks.insertedRows[1]).toMatchObject({
        project_id: "proj-audit-1",
        type: "project_view",
        author: "Marcus Ortiz",
        message: "Projeto visualizado na página de detalhes",
      });
    });
  });

  describe("LogsTab UI", () => {
    const sampleEvents: TimelineEventRecord[] = [
      {
        id: "evt-view-1",
        project_id: "proj-audit-1",
        type: "project_view",
        author: "Marcus Ortiz",
        message: "Projeto visualizado no modal",
        timestamp: "2026-11-17T14:30:15.000Z",
        metadata: {
          category: "view",
          actionType: "project_view",
          tabLabel: "Visualização do Projeto",
          source: "modal",
          userEmail: "marcus.ortiz@siplan.com.br",
          userRole: "admin",
        },
      },
      {
        id: "evt-field-1",
        project_id: "proj-audit-1",
        type: "field_change",
        author: "Bruno Fernandes",
        message: 'Campo "Observações Gerais" alterado na aba Informações Gerais',
        timestamp: "2026-11-17T13:10:00.000Z",
        metadata: {
          category: "general",
          actionType: "field_change",
          tabLabel: "Informações Gerais",
          fieldLabel: "Observações Gerais",
          userEmail: "bruno@siplan.com.br",
          userRole: "admin",
          changes: [
            {
              field: "notes",
              label: "Observações Gerais",
              oldValue: "Texto anterior das observações",
              newValue: "Texto novo confirmado com a serventia",
            },
          ],
        },
      },
      {
        id: "evt-btn-1",
        project_id: "proj-audit-1",
        type: "button_action",
        author: "Hugo Januário",
        message: "Exportado relatório em PDF da Análise Pós-Implantação",
        timestamp: "2026-11-17T11:05:40.000Z",
        metadata: {
          category: "pos_analysis",
          actionType: "button_action",
          tabLabel: "Análise Pós-Implantação",
          stageId: "post",
          stageLabel: "Pós-Implantação",
          buttonLabel: "Exportar PDF",
        },
      },
      {
        id: "evt-stage-1",
        project_id: "proj-audit-1",
        type: "status_change",
        author: "Alex Silva",
        message: 'Status de 1. Análise de Infraestrutura alterado de "Não Iniciado" para "Finalizado"',
        timestamp: "2026-11-16T10:00:00.000Z",
        metadata: {
          category: "stages",
          actionType: "status_change",
          tabLabel: "Etapas",
          stageId: "infra",
          stageLabel: "1. Análise de Infraestrutura",
          fieldLabel: "Status",
          changes: [
            {
              field: "stages.infra.status",
              label: "Status",
              oldValue: "Não Iniciado",
              newValue: "Finalizado",
            },
          ],
        },
      },
    ];

    it("renderiza KPIs, linhas expansíveis com Como estava antes / Como ficou depois e permite retrair", () => {
      mocks.timelineEvents = sampleEvents;
      render(<LogsTab project={createBaseProject()} />);

      expect(screen.getByText("Projeto visualizado no modal")).toBeInTheDocument();
      expect(
        screen.getByText('Campo "Observações Gerais" alterado na aba Informações Gerais'),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Exportado relatório em PDF da Análise Pós-Implantação"),
      ).toBeInTheDocument();

      // Antes de expandir, o bloco detalhado não deve estar visível
      expect(screen.queryByTestId("log-details-evt-field-1")).not.toBeInTheDocument();

      // Expande a linha de alteração de campo
      const fieldRow = screen.getByTestId("log-row-evt-field-1");
      const toggleBtn = within(fieldRow).getByRole("button");
      fireEvent.click(toggleBtn);

      const details = screen.getByTestId("log-details-evt-field-1");
      expect(details).toBeInTheDocument();
      expect(within(details).getByText("Como estava antes")).toBeInTheDocument();
      expect(within(details).getByText("Texto anterior das observações")).toBeInTheDocument();
      expect(within(details).getByText("Como ficou depois")).toBeInTheDocument();
      expect(
        within(details).getByText("Texto novo confirmado com a serventia"),
      ).toBeInTheDocument();
      expect(within(details).getByText("bruno@siplan.com.br • admin")).toBeInTheDocument();

      // Retrai ao clicar novamente
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId("log-details-evt-field-1")).not.toBeInTheDocument();

      // Expandir todos / Retrair todos
      fireEvent.click(screen.getByRole("button", { name: /Expandir todos/i }));
      expect(screen.getByTestId("log-details-evt-view-1")).toBeInTheDocument();
      expect(screen.getByTestId("log-details-evt-field-1")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Retrair todos/i }));
      expect(screen.queryByTestId("log-details-evt-view-1")).not.toBeInTheDocument();
    });

    it("filtra corretamente por busca textual, aba/módulo, tipo de ação, etapa e usuário", async () => {
      mocks.timelineEvents = sampleEvents;
      render(<LogsTab project={createBaseProject()} />);

      // 1. Busca textual pelo conteúdo anterior/novo
      const searchInput = screen.getByLabelText("Buscar nos logs");
      fireEvent.change(searchInput, {
        target: { value: "confirmado com a serventia" },
      });
      expect(
        screen.getByText('Campo "Observações Gerais" alterado na aba Informações Gerais'),
      ).toBeInTheDocument();
      expect(screen.queryByText("Projeto visualizado no modal")).not.toBeInTheDocument();

      // Limpar filtros
      fireEvent.click(screen.getByRole("button", { name: /Limpar filtros/i }));
      expect(screen.getByText("Projeto visualizado no modal")).toBeInTheDocument();

      // 2. Filtro por Aba / Módulo
      fireEvent.keyDown(
        screen.getByRole("combobox", { name: "Filtrar por Aba ou Módulo" }),
        { key: "ArrowDown" },
      );
      fireEvent.click(await screen.findByRole("option", { name: "Visualizações" }));
      expect(screen.getByText("Projeto visualizado no modal")).toBeInTheDocument();
      expect(
        screen.queryByText("Exportado relatório em PDF da Análise Pós-Implantação"),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Limpar filtros/i }));

      // 3. Filtro por Tipo de Ação
      fireEvent.keyDown(
        screen.getByRole("combobox", { name: "Filtrar por Tipo de Ação" }),
        { key: "ArrowDown" },
      );
      fireEvent.click(await screen.findByRole("option", { name: "Ação / Botão" }));
      expect(
        screen.getByText("Exportado relatório em PDF da Análise Pós-Implantação"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Projeto visualizado no modal")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Limpar filtros/i }));

      // 4. Filtro por Etapa
      fireEvent.keyDown(
        screen.getByRole("combobox", { name: "Filtrar por Etapa" }),
        { key: "ArrowDown" },
      );
      fireEvent.click(
        await screen.findByRole("option", { name: "1. Análise de Infraestrutura" }),
      );
      expect(
        screen.getByText(
          'Status de 1. Análise de Infraestrutura alterado de "Não Iniciado" para "Finalizado"',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText("Projeto visualizado no modal")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Limpar filtros/i }));

      // 5. Filtro por Usuário
      fireEvent.keyDown(
        screen.getByRole("combobox", { name: "Filtrar por Usuário" }),
        { key: "ArrowDown" },
      );
      fireEvent.click(await screen.findByRole("option", { name: "Marcus Ortiz" }));
      expect(screen.getByText("Projeto visualizado no modal")).toBeInTheDocument();
      expect(screen.queryByText("Exportado relatório em PDF da Análise Pós-Implantação")).not.toBeInTheDocument();
    });
  });
});
