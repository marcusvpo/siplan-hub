import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DeploymentsEnvironmentConfig from "@/pages/DeploymentsEnvironmentConfig";
import { EnvironmentProjectModal } from "@/components/EnvironmentConfig/EnvironmentProjectModal";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockProjects = [
  {
    id: "proj-1",
    clientName: "Cartório São Paulo",
    ticketNumber: "12345",
    systemType: "Orion TN",
    isDeleted: false,
    stages: {
      environment: {
        status: "in-progress",
        responsible: "Bruno Fernandes",
        kanbanStatus: "in_progress",
        hasPendings: false,
      },
      implementation: {
        phase1: {
          startDate: "2026-12-07T10:00:00.000Z", // Segunda -> Data Limite 04/12/2026
        },
      },
    },
  },
  {
    id: "proj-2",
    clientName: "Cartório Rio de Janeiro",
    ticketNumber: "67890",
    systemType: "Orion REG",
    isDeleted: false,
    stages: {
      environment: {
        status: "in-progress",
        responsible: "",
        kanbanStatus: "not_started",
        hasPendings: false,
      },
      implementation: {
        phase1: {
          startDate: "2026-11-23T10:00:00.000Z",
        },
      },
    },
  },
  {
    id: "proj-franca",
    clientName: "FRANCA - TABELIONATO DE NOTAS E PROTESTO DE LETRAS E TITULOS 02",
    ticketNumber: "759980",
    systemType: "Orion PRO",
    isDeleted: false,
    stages: {
      environment: {
        status: "in-progress",
        responsible: "Alex Silva",
        kanbanStatus: "in_progress",
        hasPendings: false,
      },
      implementation: {
        phase1: {
          startDate: "2026-11-09T10:00:00.000Z",
        },
      },
    },
  },
  {
    id: "proj-3",
    clientName: "Cartório Curitiba",
    ticketNumber: "99999",
    systemType: "Orion PRO",
    isDeleted: false,
    stages: {
      environment: {
        status: "done",
        responsible: "Alex Silva",
        kanbanStatus: "completed",
        hasPendings: true,
      },
      implementation: {
        phase1: {
          startDate: "2026-11-09T10:00:00.000Z",
        },
      },
    },
  },
  {
    id: "proj-future",
    clientName: "Cartório Planejamento Futuro Fase 1",
    ticketNumber: "11111",
    systemType: "Orion TN",
    isDeleted: false,
    stages: {
      environment: {
        status: "todo",
        responsible: "",
        kanbanStatus: "not_started",
        hasPendings: false,
      },
      implementation: {
        phase1: {
          startDate: "2026-12-01T10:00:00.000Z",
        },
      },
    },
  },
  {
    id: "proj-todo-no-date",
    clientName: "Cartório Não Iniciado Sem Data",
    ticketNumber: "44444",
    systemType: "Orion TN",
    isDeleted: false,
    stages: {
      environment: {
        status: "todo",
        responsible: "",
        kanbanStatus: undefined,
        hasPendings: false,
      },
      implementation: {
        phase1: undefined,
      },
    },
  },
  {
    id: "proj-modelos",
    clientName: "Cartório Modelos TN",
    ticketNumber: "22222",
    systemType: "Modelos TN",
    isDeleted: false,
    stages: {
      environment: {
        status: "in-progress",
        responsible: "Bruno Fernandes",
        kanbanStatus: "in_progress",
        hasPendings: false,
      },
      implementation: {
        phase1: {
          startDate: "2026-12-01T10:00:00.000Z",
        },
      },
    },
  },
  {
    id: "proj-fernando",
    clientName: "Cartório Fernando Cruz Extra",
    ticketNumber: "33333",
    systemType: "Orion RTD",
    isDeleted: false,
    stages: {
      environment: {
        status: "in-progress",
        responsible: "Fernando Cruz",
        kanbanStatus: "in_progress",
        hasPendings: false,
      },
      implementation: {
        phase1: {
          startDate: "2026-12-15T10:00:00.000Z",
        },
      },
    },
  },
  {
    id: "proj-ricardo",
    clientName: "Cartório Ricardo Vieira Concluído",
    ticketNumber: "55555",
    systemType: "Orion RTD",
    isDeleted: false,
    stages: {
      environment: {
        status: "done",
        responsible: "Ricardo Vieira",
        kanbanStatus: "completed",
        hasPendings: false,
      },
      implementation: {
        phase1: {
          startDate: "2026-10-10T10:00:00.000Z",
        },
      },
    },
  },
];

vi.mock("@/hooks/useProjectsList", () => ({
  useProjectsList: () => ({
    projects: mockProjects,
    isLoading: false,
  }),
}));

const mockMutateAsync = vi.fn().mockResolvedValue(true);

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({
    updateProject: {
      mutateAsync: mockMutateAsync,
    },
  }),
}));

vi.mock("@/hooks/useProjectDetails", () => ({
  useProjectDetails: (id?: string) => ({
    project: mockProjects.find((p) => p.id === id),
    isLoading: false,
  }),
}));

let mockUser = {
  user: { id: "user-1", email: "bruno.fernandes@siplan.com.br" },
  fullName: "Bruno Fernandes",
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUser,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    isAdmin: false,
    hasPermission: () => true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("DeploymentsEnvironmentConfig Page and Modal", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockUser = {
      user: { id: "user-1", email: "bruno.fernandes@siplan.com.br" },
      fullName: "Bruno Fernandes",
    };
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DeploymentsEnvironmentConfig />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it("deve renderizar o título da página e as 3 colunas do Kanban", () => {
    renderComponent();

    expect(screen.getByText("Configuração de Ambiente")).toBeInTheDocument();
    expect(screen.getByText("Não Iniciados")).toBeInTheDocument();
    expect(screen.getByText("Em Andamento")).toBeInTheDocument();
    expect(screen.getByText("Concluídos")).toBeInTheDocument();
  });

  it("deve exibir os botões de filtro de responsável e ocultar analistas secundários que só possuem concluídos", () => {
    renderComponent();

    // Fixos sempre presentes
    expect(screen.getByRole("button", { name: "Fila Geral" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bruno Fernandes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alex Silva" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sem Responsável" })).toBeInTheDocument();

    // Fernando Cruz tem projeto ativo em andamento: deve ter botão de filtro
    expect(screen.getByRole("button", { name: "Fernando Cruz" })).toBeInTheDocument();

    // Ricardo Vieira tem apenas projeto concluído: NÃO deve ter botão de filtro
    expect(screen.queryByRole("button", { name: "Ricardo Vieira" })).not.toBeInTheDocument();
  });

  it("as pílulas de carga de trabalho no topo devem ser indicadores estáticos de KPI (não botões)", () => {
    renderComponent();

    // Indicadores estáticos renderizam as métricas textuais (aparece no KPI e no botão de filtro)
    expect(screen.getAllByText("Sem Responsável").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Fila Completa")).toBeInTheDocument();

    // Não deve haver botão com o nome "Fila Completa" (é apenas um KPI informativo estático)
    expect(screen.queryByRole("button", { name: /Fila Completa/i })).not.toBeInTheDocument();
  });

  it("deve filtrar projetos ao clicar no botão de responsável Alex Silva", () => {
    renderComponent();

    const alexBtn = screen.getByRole("button", { name: "Alex Silva" });
    fireEvent.click(alexBtn);

    // Deve exibir Cartório Curitiba (de Alex Silva)
    expect(screen.getByText("Cartório Curitiba")).toBeInTheDocument();
    // Não deve exibir Cartório São Paulo (de Bruno Fernandes)
    expect(screen.queryByText("Cartório São Paulo")).not.toBeInTheDocument();
  });

  it("no modal de projeto não assumido: deve exibir 'Assumir Configuração' em destaque e aviso de bloqueio", () => {
    const unassignedProject = mockProjects.find((p) => p.id === "proj-2")!;
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EnvironmentProjectModal
            project={unassignedProject as any}
            isOpen={true}
            onClose={vi.fn()}
            columnId="not_started"
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Deve exibir o botão Assumir Configuração
    expect(screen.getByRole("button", { name: /Assumir Configuração/i })).toBeInTheDocument();
    // Deve exibir o banner de bloqueio de edição
    expect(screen.getByText(/Configuração não assumida — Edição Bloqueada/i)).toBeInTheDocument();
  });

  it("no caso de Franca (já com Alex Silva): NÃO deve exibir 'Assumir Configuração' para Bruno Fernandes", () => {
    const francaProject = mockProjects.find((p) => p.id === "proj-franca")!;
    // Bruno Fernandes logado
    mockUser = {
      user: { id: "user-bruno", email: "bruno.fernandes@siplan.com.br" },
      fullName: "Bruno Fernandes",
    };

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EnvironmentProjectModal
            project={francaProject as any}
            isOpen={true}
            onClose={vi.fn()}
            columnId="in_progress"
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // NÃO pode aparecer o botão de assumir configuração
    expect(screen.queryByRole("button", { name: /Assumir Configuração/i })).not.toBeInTheDocument();
    // Bruno não é o responsável de Franca (é o Alex Silva), então Bruno também não vê Passar Atribuição (pois só Alex pode passar)
    expect(screen.queryByRole("button", { name: /Passar Atribuição/i })).not.toBeInTheDocument();
  });

  it("no caso de Franca na visão de Alex Silva (o responsável): deve exibir o botão 'Passar Atribuição'", () => {
    const francaProject = mockProjects.find((p) => p.id === "proj-franca")!;
    // Alex Silva logado
    mockUser = {
      user: { id: "user-alex", email: "alex.silva@siplan.com.br" },
      fullName: "Alex Silva",
    };

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EnvironmentProjectModal
            project={francaProject as any}
            isOpen={true}
            onClose={vi.fn()}
            columnId="in_progress"
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // NÃO pode aparecer o botão de assumir configuração
    expect(screen.queryByRole("button", { name: /Assumir Configuração/i })).not.toBeInTheDocument();
    // Alex Silva é o responsável, então ele vê o botão de Passar Atribuição!
    expect(screen.getByRole("button", { name: /Passar Atribuição/i })).toBeInTheDocument();
  });

  it("NÃO deve exibir projetos com etapa 4 como 'todo' (Não Iniciado) que NÃO possuam data cadastrada na Fase 1", () => {
    renderComponent();

    // "Cartório Não Iniciado Sem Data" tem status 'todo' e nenhuma data na Fase 1, então não deve aparecer
    expect(screen.queryByText("Cartório Não Iniciado Sem Data")).not.toBeInTheDocument();
  });

  it("DEVE exibir na fila 'Não Iniciados' projetos com data na Fase 1, mesmo que a etapa 4 ainda esteja como 'todo'", () => {
    renderComponent();

    // "Cartório Planejamento Futuro Fase 1" tem data na Fase 1, então deve aparecer no Kanban para visão 360
    expect(screen.getByText("Cartório Planejamento Futuro Fase 1")).toBeInTheDocument();
    // Deve exibir o badge de Aguardando Início Etapa 4
    expect(screen.getByText("Aguardando Início Etapa 4")).toBeInTheDocument();
  });

  it("NÃO deve exibir projetos com sistema 'Modelos TN'", () => {
    renderComponent();

    // "Cartório Modelos TN" tem sistema "Modelos TN", então nunca pode aparecer na esteira de ambiente
    expect(screen.queryByText("Cartório Modelos TN")).not.toBeInTheDocument();
  });

  it("deve gerar botão dinâmico para responsável secundário (Fernando Cruz) e filtrar corretamente", () => {
    renderComponent();

    // Deve identificar Fernando Cruz dinamicamente e criar o botão de filtro
    const fernandoBtn = screen.getByRole("button", { name: "Fernando Cruz" });
    expect(fernandoBtn).toBeInTheDocument();

    // Ao clicar em Fernando Cruz, deve exibir apenas o card dele
    fireEvent.click(fernandoBtn);
    expect(screen.getByText("Cartório Fernando Cruz Extra")).toBeInTheDocument();
    expect(screen.queryByText("Cartório São Paulo")).not.toBeInTheDocument();
    expect(screen.queryByText("Cartório Curitiba")).not.toBeInTheDocument();
  });

  it("ao assumir configuração de projeto que estava com etapa 4 'todo', deve avançar status para 'in-progress'", async () => {
    mockMutateAsync.mockClear();
    const futureProject = mockProjects.find((p) => p.id === "proj-future")!;

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EnvironmentProjectModal
            project={futureProject as any}
            isOpen={true}
            onClose={vi.fn()}
            columnId="not_started"
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const assumeBtn = screen.getByRole("button", { name: /Assumir Configuração/i });
    fireEvent.click(assumeBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-future",
        updates: expect.objectContaining({
          stages: expect.objectContaining({
            environment: expect.objectContaining({
              responsible: "Bruno Fernandes",
              status: "in-progress",
            }),
          }),
        }),
      })
    );
  });

  it("deve renderizar as pílulas de carga de trabalho (Workload Counters) na tela", () => {
    renderComponent();

    // Deve exibir contadores de carga de trabalho de Alex Silva, Bruno Fernandes e Sem Responsável
    expect(screen.getByText("Fila Completa")).toBeInTheDocument();
    expect(screen.getByText(/aguardando analista/i)).toBeInTheDocument();
  });

  it("no modal: deve conter o botão 'Copiar Acessos' e a seção 'Histórico & Timeline do Ambiente'", () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const project = mockProjects.find((p) => p.id === "proj-1")!;

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EnvironmentProjectModal
            project={project as any}
            isOpen={true}
            onClose={vi.fn()}
            columnId="in_progress"
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Botão Copiar Acessos
    const copyBtn = screen.getByRole("button", { name: /Copiar Acessos/i });
    expect(copyBtn).toBeInTheDocument();
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Seção de Timeline
    expect(screen.getByText(/Histórico & Timeline do Ambiente/i)).toBeInTheDocument();
  });
});
