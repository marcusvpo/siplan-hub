import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import {
  buildSuggested0800Tramite,
  formatOpNumberDisplay,
  hasSecondary0800Divergence,
  isImplantationTicketTitleEligible,
  isSecondaryClosedIn0800,
  isSecondaryWithCsOrBillingIn0800,
  matchSecondaryTicket,
  OFFICIAL_SECONDARY_PRODUCTS,
  getProjectOrionAdminStatus,
  sanitizeOrionAdminConfig,
} from "@/lib/secondary-products";
import { Breadcrumbs } from "@/components/Layout/Breadcrumbs";
import DeploymentsSecondaryProducts from "@/pages/DeploymentsSecondaryProducts";
import { SecondaryProductsTab } from "@/components/ProjectManagement/Tabs/SecondaryProductsTab";
import { OrionAdminSection } from "@/components/ProjectManagement/Forms/OrionAdminSection";
import type { SecondaryTicketWithLinks } from "@/hooks/useSecondaryTickets";
import type { ProjectV2 } from "@/types/ProjectV2";

const mockTickets: SecondaryTicketWithLinks[] = [
  {
    id: "sec-1",
    ticket_number: "764301",
    client_name: "Tabelionato de Notas de Itaquaquecetuba",
    codigo_cliente: "1234",
    product_code: "orion_ged",
    product_name: "Orion GED",
    titulo_chamado: "Implantação e Treinamento Orion GED",
    op_number: 43822026,
    sales_order_number: 5510,
    hub_status: "deployed_field",
    responsible: "Rodrigo Brites",
    tramited_to_cs: false,
    observations: "Configurado e treinado em campo",
    ellevo_status: "Em Atendimento",
    ellevo_team: "Implantação",
    ellevo_analyst: "Rodrigo Brites",
    ellevo_opened_at: null,
    ellevo_closed_at: null,
    ellevo_last_tramite_at: null,
    ellevo_last_tramite: "Abertura de chamado",
    ellevo_synced_at: null,
    updated_by: "Bruno Fernandes",
    created_at: "2026-10-29T10:00:00Z",
    updated_at: "2026-10-29T12:00:00Z",
    requiresOrionAdmin: false,
    onlySystemType: null,
    linkedProjects: [
      {
        id: "proj-tn-1",
        clientName: "Tabelionato de Notas de Itaquaquecetuba",
        systemType: "Orion TN",
        ticketNumber: "763901",
        globalStatus: "in-progress",
        linkSource: "auto",
      },
      {
        id: "proj-pro-2",
        clientName: "Tabelionato de Notas de Itaquaquecetuba",
        systemType: "Orion PRO",
        ticketNumber: "763904",
        globalStatus: "in-progress",
        linkSource: "auto",
      },
    ],
  },
  {
    id: "sec-2",
    ticket_number: "764302",
    client_name: "Registro Civil de Jandira",
    codigo_cliente: "5678",
    product_code: "lcw",
    product_name: "Livro Caixa Web",
    titulo_chamado: "Implantação e Treinamento Livro Caixa Web",
    op_number: 44102026,
    sales_order_number: null,
    hub_status: "handed_to_sd",
    responsible: "Equipe SD",
    tramited_to_cs: false,
    observations: null,
    ellevo_status: "Aguardando Atendimento",
    ellevo_team: "Service Desk",
    ellevo_analyst: null,
    ellevo_opened_at: null,
    ellevo_closed_at: null,
    ellevo_last_tramite_at: null,
    ellevo_last_tramite: null,
    ellevo_synced_at: null,
    updated_by: null,
    created_at: "2026-10-29T10:00:00Z",
    updated_at: "2026-10-29T12:00:00Z",
    requiresOrionAdmin: true,
    onlySystemType: null,
    linkedProjects: [
      {
        id: "proj-jandira",
        clientName: "Registro Civil de Jandira",
        systemType: "Orion TN",
        ticketNumber: "763500",
        globalStatus: "in-progress",
        linkSource: "auto",
      },
    ],
  },
];

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({ projects: [] }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
    canEditProjects: true,
    isAdmin: true,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "bruno@siplan.com.br", user_metadata: { full_name: "Bruno Fernandes" } },
  }),
}));

vi.mock("@/hooks/useTeamMembers", () => ({
  useTeamMembers: () => ({
    members: [
      { id: "user-1", name: "Rodrigo Brites", active: true },
      { id: "user-2", name: "Marcus Vinicius Ortiz", active: true },
      { id: "user-3", name: "Soraya Molina", active: true },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useSecondaryTickets", () => ({
  useAllSecondaryTickets: () => ({
    data: mockTickets,
    isLoading: false,
    error: null,
  }),
  useProjectSecondaryTickets: (projectId?: string) => ({
    data: projectId === "proj-empty" ? [] : mockTickets,
    isLoading: false,
  }),
  useSecondaryTicketTramites: () => ({
    data: [],
    isLoading: false,
  }),
  useSecondaryProductCatalog: () => ({
    data: [],
    isLoading: false,
  }),
  useSecondaryTicketMutations: () => ({
    updateSecondaryTicket: {
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    },
    linkManualSecondaryTicket: {
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({ linkedCount: 2 }),
    },
    unlinkSecondaryTicket: {
      isPending: false,
      mutate: vi.fn(),
    },
    requestSync0800Now: {
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    },
  }),
}));

function LocationDisplay() {
  const loc = useLocation();
  return <span data-testid="current-url">{`${loc.pathname}${loc.search}`}</span>;
}

describe("Produtos Secundários — regras de negócio, espelho 0800 e esteira", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mantém os 14 produtos oficiais com regras de Orion Admin (apenas LCW, SGA e Cartório On Hand)", () => {
    expect(OFFICIAL_SECONDARY_PRODUCTS).toHaveLength(14);

    const orionEditor = OFFICIAL_SECONDARY_PRODUCTS.find((p) => p.code === "orion_editor");
    expect(orionEditor?.onlySystemType).toBe("Orion TN");

    const adminRequiredCodes = OFFICIAL_SECONDARY_PRODUCTS.filter(
      (p) => p.requiresOrionAdmin
    ).map((p) => p.code);
    expect(adminRequiredCodes).toEqual(["lcw", "sga", "cartorio_on_hand"]);
  });

  it("calcula corretamente a exigência e o status do Orion Admin no projeto", () => {
    // 1. Projeto com Livro Caixa Web (pendente de chaves)
    const pendingProject = {
      products: ["Livro Caixa Web"],
      stages: {
        environment: {
          status: "todo" as const,
          approvedByInfra: false,
          testAvailable: false,
          orionAdminConfig: "",
          orionAdminConfigured: false,
        },
      },
    } as unknown as ProjectV2;

    const status1 = getProjectOrionAdminStatus(pendingProject);
    expect(status1.required).toBe(true);
    expect(status1.isConfigured).toBe(false);
    expect(status1.dependentProducts).toContain("Livro Caixa Web (LCW)");

    // 2. Projeto com chaves inseridas e marcado configurado
    const configuredProject = {
      products: ["SGA"],
      stages: {
        environment: {
          status: "in-progress" as const,
          approvedByInfra: true,
          testAvailable: true,
          orionAdminConfig: "urlAdminCentral=https://admin.siplan.com.br/api\nusuarioAdminCentral=serv",
          orionAdminConfigured: true,
          orionAdminConfiguredBy: "Bruno Fernandes",
        },
      },
    } as unknown as ProjectV2;

    const status2 = getProjectOrionAdminStatus(configuredProject);
    expect(status2.required).toBe(true);
    expect(status2.isConfigured).toBe(true);
    expect(status2.configuredBy).toBe("Bruno Fernandes");

    // 3. Projeto sem produtos dependentes
    const cleanProject = {
      products: ["Orion GED"],
      stages: {
        environment: {
          status: "todo" as const,
          approvedByInfra: false,
          testAvailable: false,
        },
      },
    } as unknown as ProjectV2;

    const status3 = getProjectOrionAdminStatus(cleanProject);
    expect(status3.required).toBe(false);
    expect(status3.isConfigured).toBe(false);
  });

  it("formata número de OP convertendo padrão NNNNYYYY para NNNN/YYYY", () => {
    expect(formatOpNumberDisplay(43822026)).toBe("4382/2026");
    expect(formatOpNumberDisplay(91234)).toBe("91234");
    expect(formatOpNumberDisplay(0)).toBeNull();
    expect(formatOpNumberDisplay(null)).toBeNull();
  });

  it("detecta divergência quando concluído no HUB mas ainda sem passagem para CS/Maria Santos nem encerrado no 0800", () => {
    expect(
      hasSecondary0800Divergence({
        hub_status: "deployed_field",
        tramited_to_cs: false,
        ellevo_status: "Em Atendimento",
        ellevo_analyst: "Rodrigo Brites",
        ellevo_team: "Implantação",
        ellevo_closed_at: null,
      })
    ).toBe(true);

    expect(
      isSecondaryWithCsOrBillingIn0800({
        tramited_to_cs: false,
        ellevo_analyst: "Maria Santos",
        ellevo_team: "CS/CX",
      })
    ).toBe(true);

    expect(
      hasSecondary0800Divergence({
        hub_status: "deployed_field",
        tramited_to_cs: false,
        ellevo_status: "Aguardando Pós",
        ellevo_analyst: "Maria Santos",
        ellevo_team: "CS/CX",
        ellevo_closed_at: null,
      })
    ).toBe(false);

    expect(
      isSecondaryClosedIn0800({
        ellevo_status: "Encerrado",
        ellevo_closed_at: null,
      })
    ).toBe(true);
  });

  it("gera texto de trâmite sugerido referenciando o sistema principal, chamado pai e Maria Santos", () => {
    const tramite = buildSuggested0800Tramite(
      {
        product_name: "Livro Caixa Web",
        hub_status: "deployed_field",
        responsible: "Rodrigo Brites",
        observations: "Treinamento realizado com escreventes.",
      },
      "Orion TN",
      "763901"
    );

    expect(tramite).toContain("Livro Caixa Web");
    expect(tramite).toContain("Orion TN (Chamado principal #763901)");
    expect(tramite).toContain("Maria Santos");
  });

  it("posiciona o breadcrumb de /deployments/secondary-products dentro do módulo Implantação", () => {
    render(
      <MemoryRouter initialEntries={["/deployments/secondary-products"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Implantação" })).toHaveAttribute(
      "href",
      "/implantacao"
    );
    expect(screen.getByText("Produtos Secundários")).toBeInTheDocument();
  });

  it("renderiza a esteira sem rolagem horizontal, filtra divergências e redireciona ao Modal do projeto em /projects", () => {
    render(
      <MemoryRouter initialEntries={["/deployments/secondary-products"]}>
        <DeploymentsSecondaryProducts />
        <LocationDisplay />
      </MemoryRouter>
    );

    const container = screen.getByTestId("deployments-secondary-products-page");
    expect(container).toHaveClass("w-full", "min-w-0", "overflow-x-hidden");

    expect(screen.getAllByText("Orion GED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Livro Caixa Web").length).toBeGreaterThan(0);

    // Filtra apenas chamados que faltam tramitar no 0800 (sec-1)
    fireEvent.click(screen.getByRole("button", { name: /Falta Tramitar 0800/i }));
    expect(screen.getAllByText("Orion GED").length).toBeGreaterThan(0);
    expect(screen.queryByText("Livro Caixa Web")).not.toBeInTheDocument();

    // Clica para abrir especificamente no segundo sistema principal espelhado (Orion PRO #763904)
    const orionProButtons = screen.getAllByRole("button", { name: /Orion PRO/i });
    fireEvent.click(orionProButtons[0]);

    expect(screen.getByTestId("current-url")).toHaveTextContent(
      "/projects?id=proj-pro-2&tab=secondary_products"
    );
  });

  it("aplica a blindagem anti-typo e variação de nomenclatura sem permitir falsos positivos", () => {
    // Typos reais como Cosmópolis (#764751) e omissão de conjunção
    expect(
      isImplantationTicketTitleEligible(
        "OP: 11332/2025 - Implanmtação e Treinamento Orion TN+ Conversão Ciontrol-M TabNot",
        "primary"
      )
    ).toBe(true);
    expect(
      isImplantationTicketTitleEligible(
        "OP: 10811/2025 - Implantação  Treinamento Sistema Orion Protesto",
        "primary"
      )
    ).toBe(true);

    // "Configuração e Treinamento" aceito APENAS para Produtos Secundários (ex: LCW #764775 / #764668), bloqueado para Principais
    expect(
      isImplantationTicketTitleEligible(
        "OP: 11332/2025 - Configuração e Treinamento Livro Caixa Web - Plano Master",
        "secondary"
      )
    ).toBe(true);
    expect(
      isImplantationTicketTitleEligible(
        "OP 12231/2026 - Configuração e Treinamento Orion TN",
        "primary"
      )
    ).toBe(false);

    // Bloqueios estritos: rotinas, IA, pós-implantação e período de teste
    expect(
      isImplantationTicketTitleEligible(
        "OP 12231/2026 - OrionTN 6.0 - Configuração de rotinas e Treinamento",
        "secondary"
      )
    ).toBe(false);
    expect(
      isImplantationTicketTitleEligible(
        "OP: 12185/2026 - Implantação e Treinamento SIPLAN IA",
        "secondary"
      )
    ).toBe(false);
    expect(
      isImplantationTicketTitleEligible(
        "Pós-Implantação e Treinamento Livro Caixa Web",
        "secondary"
      )
    ).toBe(false);
    expect(
      isImplantationTicketTitleEligible(
        "Implantar e treinamento do Livro Caixa Web período de teste",
        "secondary"
      )
    ).toBe(false);
  });

  it("renderiza SecondaryProductsTab nos estados com itens espelhados, estado vazio e modal de vínculo manual responsivo", () => {
    const sampleProject = {
      id: "proj-tn-1",
      clientName: "Tabelionato de Notas de Itaquaquecetuba",
      systemType: "Orion TN",
      ticketNumber: "763901",
      relatedTickets: [],
      stages: {},
    } as unknown as ProjectV2;

    const { unmount } = render(
      <MemoryRouter>
        <SecondaryProductsTab project={sampleProject} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("secondary-products-tab")).toHaveClass("w-full", "min-w-0");
    expect(screen.getByText(/Sincronizado também com Orion PRO \(#763904\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Chaves no Orion Admin \(Etapa 4\)/i)).toBeInTheDocument();

    // Abre o modal de vínculo manual e valida classes responsivas de viewport mobile
    fireEvent.click(screen.getByRole("button", { name: /^Vincular Chamado$/i }));
    expect(screen.getByText("Vincular Produto Secundário")).toBeInTheDocument();
    unmount();

    // Valida estado vazio limpo
    const emptyProject = {
      ...sampleProject,
      id: "proj-empty",
    } as unknown as ProjectV2;

    render(
      <MemoryRouter>
        <SecondaryProductsTab project={emptyProject} />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Nenhum produto secundário vinculado a este projeto")
    ).toBeInTheDocument();
  });

  it("identifica corretamente chamados secundários para redirecionamento por tag, sigla ou número", () => {
    const ticketLcw = {
      ticket_number: "763910",
      product_name: "Livro Caixa Web",
      product_code: "lcw",
    };

    expect(matchSecondaryTicket(ticketLcw, "Livro Caixa Web")).toBe(true);
    expect(matchSecondaryTicket(ticketLcw, "LCW")).toBe(true);
    expect(matchSecondaryTicket(ticketLcw, "763910")).toBe(true);
    expect(matchSecondaryTicket(ticketLcw, "#763910")).toBe(true);
    expect(matchSecondaryTicket(ticketLcw, "SGA")).toBe(false);

    const ticketSga = {
      ticket_number: "763911",
      product_name: "SGA",
      product_code: "sga",
    };
    expect(matchSecondaryTicket(ticketSga, "SGA")).toBe(true);
    expect(matchSecondaryTicket(ticketSga, "Atendimento")).toBe(true);
    expect(matchSecondaryTicket(ticketSga, "763911")).toBe(true);
  });

  describe("sanitizeOrionAdminConfig", () => {
    it("sanitiza árvore JSON do Lexical extraindo texto puro preservando quebras e links", () => {
      const lexicalJson = JSON.stringify({
        root: {
          children: [
            {
              type: "paragraph",
              children: [
                { type: "text", text: "#### ORION ADMIN ####" },
                { type: "linebreak" },
                { type: "text", text: "urlAdminCentral=" },
                {
                  type: "link",
                  children: [{ type: "text", text: "wss://admin.siplan.com.br" }],
                },
                { type: "linebreak" },
                { type: "text", text: "usuarioAdminCentral=cartorio@orion.com.br" },
              ],
            },
          ],
        },
      });

      const sanitized = sanitizeOrionAdminConfig(lexicalJson);
      expect(sanitized).toBe(
        "#### ORION ADMIN ####\nurlAdminCentral=wss://admin.siplan.com.br\nusuarioAdminCentral=cartorio@orion.com.br"
      );
    });

    it("sanitiza conteúdo com tags HTML substituindo tags de bloco e br por quebras de linha", () => {
      const htmlContent = "<p>urlAdminCentral=wss://admin.siplan.com.br</p><br/><div>usuario=teste</div>";
      const sanitized = sanitizeOrionAdminConfig(htmlContent);
      expect(sanitized).toBe("urlAdminCentral=wss://admin.siplan.com.br\n\nusuario=teste");
    });

    it("mantém texto puro já formatado intacto com quebras de linha limpas", () => {
      const plainText = "urlAdminCentral=wss://admin.siplan.com.br\nusuario=teste\ncns=12.345-6";
      expect(sanitizeOrionAdminConfig(plainText)).toBe(plainText);
    });

    it("retorna string vazia para valores nulos, vazios ou indefinidos", () => {
      expect(sanitizeOrionAdminConfig(null)).toBe("");
      expect(sanitizeOrionAdminConfig(undefined)).toBe("");
      expect(sanitizeOrionAdminConfig("")).toBe("");
      expect(sanitizeOrionAdminConfig("   ")).toBe("");
    });
  });

  describe("OrionAdminSection", () => {
    it("exibe badges apenas para URL Central, Usuário e Senha (sem validação de CNS) e botão de importar", () => {
      const mockProject = {
        id: "proj-1",
        clientName: "Cartório de Teste",
        systemType: "Orion TN",
        ticketNumber: "763901",
        stages: {
          environment: {
            status: "todo",
            orionAdminConfig: "",
            orionAdminConfigured: false,
          },
        },
      } as unknown as ProjectV2;

      render(
        <OrionAdminSection
          stage={mockProject.stages.environment as any}
          project={mockProject}
          canEdit={true}
          currentUserName="Bruno Fernandes"
          onUpdate={vi.fn()}
        />
      );

      // Deve exibir os badges de URL Central, Usuário e Senha
      expect(screen.getByText("URL Central")).toBeInTheDocument();
      expect(screen.getByText("Usuário")).toBeInTheDocument();
      expect(screen.getByText("Senha")).toBeInTheDocument();

      // NÃO deve conter validação/badge de CNS
      expect(screen.queryByText("CNS")).toBeNull();

      // Deve conter o botão de importar .properties
      expect(screen.getByRole("button", { name: /importar/i })).toBeInTheDocument();
    });

    it("ativa automaticamente o status Configurado ao preencher ou colar propriedades válidas com as 3 chaves", () => {
      const mockProject = {
        id: "proj-1",
        clientName: "Cartório de Teste",
        systemType: "Orion TN",
        ticketNumber: "763901",
        stages: {
          environment: {
            status: "todo",
            orionAdminConfig: "",
            orionAdminConfigured: false,
          },
        },
      } as unknown as ProjectV2;

      const onUpdateMock = vi.fn();

      render(
        <OrionAdminSection
          stage={mockProject.stages.environment as any}
          project={mockProject}
          canEdit={true}
          currentUserName="Bruno Fernandes"
          onUpdate={onUpdateMock}
        />
      );

      const textarea = screen.getByRole("textbox");

      const validProperties = `#### ORION ADMIN ####\nurlAdminCentral=wss://www.tispcm.com.br/wsSiplan\nurlAdminCentralHttp=https://www.tispcm.com.br\nusuarioAdminCentral=111989.embudasartes@orion.com.br\nsenhaAdminCentral=$2a$10$0JLPOheYnn0cKXA4SnVYOe2PhXbyP56sZ4s4ncnaF/uGFO0zWy/ge\nsenhaAdminCentralHttp=R7kSHPutSxH5lBlZL21rpje3TLtqGh0LJUTq380IYik=`;

      // Simula alteração do textarea contendo as 3 chaves obrigatórias
      fireEvent.change(textarea, { target: { value: validProperties } });

      // Deve disparar onUpdate marcando orionAdminConfigured como true automaticamente
      expect(onUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orionAdminConfigured: true,
          orionAdminConfig: validProperties,
        })
      );
    });
  });
});
