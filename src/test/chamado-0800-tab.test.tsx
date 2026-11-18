import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Chamado0800Tab } from "@/components/ProjectManagement/Tabs/Chamado0800Tab";
import type { ProjectChamado0800Result } from "@/hooks/useChamados0800";
import type { ProjectV2 } from "@/types/ProjectV2";

const { useProjectChamado0800Mock } = vi.hoisted(() => ({
  useProjectChamado0800Mock: vi.fn<(ticketNumber?: string | null) => ProjectChamado0800Result>(),
}));

vi.mock("@/hooks/useChamados0800", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useChamados0800")>(
    "@/hooks/useChamados0800",
  );
  return {
    ...actual,
    useProjectChamado0800: useProjectChamado0800Mock,
  };
});

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createProject(overrides: Partial<ProjectV2> = {}): ProjectV2 {
  return {
    id: "proj-1",
    clientName: "Cartório Modelo de Notas",
    ticketNumber: "746485",
    systemType: "Orion TN",
    globalStatus: "in-progress",
    overallProgress: 50,
    healthScore: "ok",
    priority: "normal",
    projectLeader: "Bruno Fernandes",
    tags: [],
    lastUpdatedAt: new Date("2026-08-10T12:00:00Z"),
    createdAt: new Date("2026-08-01T12:00:00Z"),
    stages: {
      infra: { status: "done" },
      adherence: { status: "done" },
      environment: { status: "in-progress" },
      conversion: { status: "todo" },
      implementation: { status: "todo" },
      post: { status: "todo" },
    },
    timeline: [],
    ...overrides,
  } as unknown as ProjectV2;
}

function createFullHookResult(
  overrides: Partial<ProjectChamado0800Result> = {},
): ProjectChamado0800Result {
  return {
    ticketNumber: "746485",
    hasValidTicket: true,
    chamado: {
      numeroChamado: "746485",
      codigoCliente: "CLI-042",
      nomeCliente: "1º Tabelionato de Notas de Lorena",
      solicitante: "Maria Tabeliã",
      titulo: "Implantação Orion TN — Migração Completa",
      descricao:
        "Linha 1 da solicitação oficial.\nLinha 2 com detalhes do ambiente e escopo comercial.",
      natureza: "Nova implantação",
      status: "Em atendimento",
      criticidade: "Alta",
      software: "Orion TN",
      produto: "Siplan Orion",
      equipeResponsavel: "Implantação - TN/RC",
      analistaResponsavel: "Alex Silva",
      dataAbertura: "2025-11-10",
      abertoEm: "2025-11-10T09:15:00",
      slaPrimeiraRespostaPrevistaEm: "2025-11-10T11:15:00",
      slaPrimeiraRespostaRealEm: "2025-11-10T10:05:00",
      slaVencimentoEm: "2025-11-20T18:00:00",
      slaVencimentoPausado: false,
      slaVencimentoManual: false,
      slaTempoRestanteMinutos: 150,
      syncedAt: "2026-08-10T14:30:00Z",
      tema: "implantação inicial",
    },
    tramites: [
      {
        sequenciaTramite: 2,
        numeroTramite: 2,
        dataTramite: "2025-11-12T16:40:15",
        responsavel: "Bruno Fernandes",
        equipeResponsavel: "Implantação",
        atividade: "Validação de Infraestrutura",
        descricao: "Servidor PostgreSQL validado e acesso liberado.",
      },
      {
        sequenciaTramite: 1,
        numeroTramite: 1,
        dataTramite: "2025-11-10T09:20:05",
        responsavel: "Lunna Santana",
        equipeResponsavel: "Comercial",
        atividade: "Abertura de Implantação",
        descricao: "Horas vendidas: 40h. Sistema anterior: Cartório Fácil.",
      },
    ],
    isLoading: false,
    isChamadoLoading: false,
    isTramitesLoading: false,
    error: null,
    syncing: false,
    syncError: null,
    syncNow: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("Chamado0800Tab", () => {
  it("exibe metadados completos do Ellevo, SLA oficial, descrição e lista de trâmites", () => {
    useProjectChamado0800Mock.mockReturnValue(createFullHookResult());

    render(<Chamado0800Tab project={createProject()} />);

    expect(
      screen.getByRole("link", { name: /Abrir o chamado #746485 no Ellevo/i }),
    ).toHaveAttribute(
      "href",
      "https://sac.siplancontrolm.com.br/indexAtendente.html#/main/paginaurl/Historico.asp/Sol=746485",
    );
    expect(
      screen.getByText("Implantação Orion TN — Migração Completa"),
    ).toBeInTheDocument();
    expect(screen.getByText("Em atendimento")).toBeInTheDocument();
    expect(screen.getByText("Nova implantação")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText("Siplan Orion")).toBeInTheDocument();
    expect(screen.getByText("Orion TN")).toBeInTheDocument();
    expect(screen.getByText("Tema IA: implantação inicial")).toBeInTheDocument();

    expect(screen.getByText("1º Tabelionato de Notas de Lorena")).toBeInTheDocument();
    expect(screen.getByText("Código: CLI-042")).toBeInTheDocument();
    expect(screen.getByText("Maria Tabeliã")).toBeInTheDocument();
    expect(screen.getByText("Implantação - TN/RC")).toBeInTheDocument();
    expect(screen.getByText("Alex Silva")).toBeInTheDocument();
    expect(screen.getByText("10/11/2025 09:15")).toBeInTheDocument();
    expect(screen.getByText("Em aberto")).toBeInTheDocument();
    expect(screen.getByText("SLA Oficial (Ellevo)")).toBeInTheDocument();
    expect(screen.getByText("2 h 30 min")).toBeInTheDocument();
    expect(screen.getByText(/Sincronizado em 10\/08\/2026/)).toBeInTheDocument();

    expect(
      screen.getByText(/Linha 1 da solicitação oficial\./),
    ).toBeInTheDocument();
    expect(screen.getByText("Trâmites (2)")).toBeInTheDocument();
    expect(screen.getByText("Trâmite #2")).toBeInTheDocument();
    expect(screen.getByText("Validação de Infraestrutura")).toBeInTheDocument();
    expect(screen.getByText("12/11/2025 16:40:15")).toBeInTheDocument();
    expect(screen.getByText("Bruno Fernandes")).toBeInTheDocument();
    expect(
      screen.getByText("Servidor PostgreSQL validado e acesso liberado."),
    ).toBeInTheDocument();

    expect(screen.getByText("Trâmite #1")).toBeInTheDocument();
    expect(screen.getByText("Abertura de Implantação")).toBeInTheDocument();
    expect(screen.getByText("10/11/2025 09:20:05")).toBeInTheDocument();
    expect(screen.getByText("Lunna Santana")).toBeInTheDocument();
    expect(
      screen.getByText("Horas vendidas: 40h. Sistema anterior: Cartório Fácil."),
    ).toBeInTheDocument();
  });

  it("permite expandir e recolher descrição longa sem renderizar HTML inseguro", () => {
    const longDescription = "Detalhe importante da conversão.\n".repeat(30);
    useProjectChamado0800Mock.mockReturnValue(
      createFullHookResult({
        chamado: {
          ...createFullHookResult().chamado!,
          descricao: longDescription,
        },
      }),
    );

    render(<Chamado0800Tab project={createProject()} />);

    const expandButton = screen.getByRole("button", { name: /Expandir descrição/i });
    expect(expandButton).toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(screen.getByRole("button", { name: /Ver menos/i })).toBeInTheDocument();
  });

  it("filtra trâmites por texto e alterna a ordenação entre recentes e antigos", () => {
    useProjectChamado0800Mock.mockReturnValue(createFullHookResult());

    render(<Chamado0800Tab project={createProject()} />);

    // Ordem inicial: Mais recentes primeiro (Trâmite #2 antes de Trâmite #1)
    let headings = screen.getAllByText(/^Trâmite #\d+$/).map((el) => el.textContent);
    expect(headings).toEqual(["Trâmite #2", "Trâmite #1"]);

    // Alterna ordenação para Mais antigos primeiro
    const sortTrigger = screen.getByRole("combobox", { name: /Ordenação dos trâmites/i });
    fireEvent.keyDown(sortTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "Mais antigos primeiro" }));

    headings = screen.getAllByText(/^Trâmite #\d+$/).map((el) => el.textContent);
    expect(headings).toEqual(["Trâmite #1", "Trâmite #2"]);

    // Filtra por responsável/descrição
    const searchInput = screen.getByRole("textbox", { name: "Filtrar trâmites" });
    fireEvent.change(searchInput, { target: { value: "postgresql" } });

    expect(screen.getByText("Trâmite #2")).toBeInTheDocument();
    expect(screen.queryByText("Trâmite #1")).not.toBeInTheDocument();
    expect(screen.getByText("Exibindo 1 de 2")).toBeInTheDocument();

    // Limpa filtro
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtro de trâmites" }));
    expect(screen.getByText("Trâmite #1")).toBeInTheDocument();
  });

  it("aciona o botão Sincronizar com Ellevo 0800 e exibe erro de sync sem ocultar os dados", () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    useProjectChamado0800Mock.mockReturnValue(
      createFullHookResult({
        syncNow,
        syncError: "Worker temporariamente indisponível.",
      }),
    );

    render(<Chamado0800Tab project={createProject()} />);

    const syncButton = screen.getByRole("button", {
      name: /Sincronizar com Ellevo 0800/i,
    });
    fireEvent.click(syncButton);
    expect(syncNow).toHaveBeenCalledTimes(1);

    expect(
      screen.getByText("Worker temporariamente indisponível."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Implantação Orion TN — Migração Completa"),
    ).toBeInTheDocument();
  });

  it("exibe empty-state quando não há ticketNumber válido vinculado", () => {
    useProjectChamado0800Mock.mockReturnValue({
      ticketNumber: null,
      hasValidTicket: false,
      chamado: null,
      tramites: [],
      isLoading: false,
      isChamadoLoading: false,
      isTramitesLoading: false,
      error: null,
      syncing: false,
      syncError: null,
      syncNow: vi.fn().mockResolvedValue(undefined),
    });

    render(<Chamado0800Tab project={createProject({ ticketNumber: "" })} />);

    expect(screen.getByText("Nenhum chamado 0800 vinculado")).toBeInTheDocument();
    expect(screen.getByText("Editar Projeto")).toBeInTheDocument();
  });

  it("exibe skeleton de carregamento enquanto busca os dados iniciais", () => {
    useProjectChamado0800Mock.mockReturnValue({
      ticketNumber: "746485",
      hasValidTicket: true,
      chamado: null,
      tramites: [],
      isLoading: true,
      isChamadoLoading: true,
      isTramitesLoading: true,
      error: null,
      syncing: true,
      syncError: null,
      syncNow: vi.fn().mockResolvedValue(undefined),
    });

    render(<Chamado0800Tab project={createProject()} />);

    expect(screen.getByTestId("chamado-0800-loading")).toBeInTheDocument();
    expect(screen.getByText("Sincronizando com o Ellevo 0800")).toBeInTheDocument();
  });
});
