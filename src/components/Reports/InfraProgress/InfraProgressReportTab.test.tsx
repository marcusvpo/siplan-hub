import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { InfraProgressReportTab } from "./InfraProgressReportTab";
import { ProjectV2 } from "@/types/ProjectV2";

const mockProjects: ProjectV2[] = [
  // 1. Elegível: Bloqueado com Servidor e Estações
  {
    id: "p-1",
    clientName: "Cartório Olimpia Teste",
    ticketNumber: "#759831",
    systemType: "Orion TN",
    globalStatus: "in-progress",
    stages: {
      infra: {
        status: "blocked",
        serverStatus: "Inadequado",
        workstationsStatus: "Adequado",
        responsible: "Alex Silva",
      },
      implementation: {
        status: "todo",
        phase1: {
          status: "todo",
          isConfirmed: false,
          responsible: "Rodrigo Brites",
        },
      },
      post: { status: "todo" },
    },
  } as unknown as ProjectV2,

  // 2. Elegível: Em Andamento com Fase 1 Agendada
  {
    id: "p-2",
    clientName: "Cartório Caçapava Teste",
    ticketNumber: "#763114",
    systemType: "Orion PRO",
    globalStatus: "in-progress",
    stages: {
      infra: {
        status: "in-progress",
        serverStatus: "Adequado",
        workstationsStatus: "Adequado",
        responsible: "Rodrigo Mizuno",
      },
      implementation: {
        status: "todo",
        phase1: {
          status: "todo",
          isConfirmed: true,
          startDate: new Date("2026-11-23T15:00:00.000Z"),
          endDate: new Date("2026-11-27T15:00:00.000Z"),
          responsible: "Rodrigo Mizuno",
          observations: "Implantação conjunta confirmada",
        },
      },
      post: { status: "todo" },
    },
  } as unknown as ProjectV2,

  // 3. NÃO Elegível: Infra Finalizada (done)
  {
    id: "p-3",
    clientName: "Cartório Finalizado",
    ticketNumber: "#999999",
    systemType: "Orion REG",
    globalStatus: "in-progress",
    stages: {
      infra: { status: "done" },
      post: { status: "todo" },
    },
  } as unknown as ProjectV2,

  // 4. NÃO Elegível: Pós-implantação em andamento
  {
    id: "p-4",
    clientName: "Cartório em Pós",
    ticketNumber: "#888888",
    systemType: "Orion REG",
    globalStatus: "in-progress",
    stages: {
      infra: { status: "in-progress" },
      post: { status: "in-progress" },
    },
  } as unknown as ProjectV2,
];

describe("InfraProgressReportTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("filtra apenas os projetos em andamento/bloqueados na infraestrutura", () => {
    render(<InfraProgressReportTab projects={mockProjects} />);

    // Deve exibir p-1 e p-2
    expect(screen.getByText("Cartório Olimpia Teste")).toBeInTheDocument();
    expect(screen.getByText("Cartório Caçapava Teste")).toBeInTheDocument();

    // NÃO deve exibir p-3 (done) nem p-4 (post in-progress)
    expect(screen.queryByText("Cartório Finalizado")).not.toBeInTheDocument();
    expect(screen.queryByText("Cartório em Pós")).not.toBeInTheDocument();
  });

  it("exibe o status da infra com os diagnósticos de hardware no padrão solicitado", () => {
    render(<InfraProgressReportTab projects={mockProjects} />);

    expect(
      screen.getByText("Infra - Bloqueado (Servidor: Inadequado, Estações: Adequado)")
    ).toBeInTheDocument();
  });

  it("exibe a tag de destaque da Fase 1 e o período para projetos agendados", () => {
    render(<InfraProgressReportTab projects={mockProjects} />);

    // Tag de destaque
    expect(screen.getByText("FASE 1: DATA CONFIRMADA")).toBeInTheDocument();

    // Período
    expect(screen.getByText("23/11/2026")).toBeInTheDocument();
    expect(screen.getByText("27/11/2026")).toBeInTheDocument();
  });

  it("exibe o aviso para projetos sem datas de implantação cadastradas", () => {
    render(<InfraProgressReportTab projects={mockProjects} />);

    expect(
      screen.getByText("Sem datas previstas ou confirmadas para a implantação no momento.")
    ).toBeInTheDocument();
    expect(screen.getByText("Rodrigo Brites")).toBeInTheDocument();
  });

  it("salva anotações no localStorage ao digitar", () => {
    render(<InfraProgressReportTab projects={mockProjects} />);

    const textarea = screen.getAllByPlaceholderText(
      "Digite aqui as observações para este projeto..."
    )[0];

    fireEvent.change(textarea, { target: { value: "Aguardando retorno do TI" } });

    expect(localStorage.getItem("siplan_infra_obs_759831")).toBe(
      "Aguardando retorno do TI"
    );
  });
});
