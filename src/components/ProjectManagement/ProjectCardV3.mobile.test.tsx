import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectV2 } from "@/types/ProjectV2";
import { ProjectCardV3 } from "./ProjectCardV3";

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ canDeleteProjects: true }),
}));

vi.mock("@/components/ProjectManagement/PosSaudeBadge", () => ({
  PosSaudeBadge: () => <span>Pós saudável</span>,
}));

const stage = (status: string) => ({ status });

const project = {
  id: "project-1",
  clientName: "Cliente com um nome bastante extenso que precisa quebrar no celular",
  ticketNumber: "701234",
  systemType: "Orion TN",
  products: [],
  implantationType: "new",
  tags: [],
  priority: "normal",
  projectType: "new",
  healthScore: "ok",
  globalStatus: "in-progress",
  overallProgress: 20,
  projectLeader: "Responsável",
  createdAt: new Date("2026-08-01T12:00:00Z"),
  lastUpdatedAt: new Date("2026-08-30T12:00:00Z"),
  lastUpdatedBy: "Usuário",
  stages: {
    infra: stage("done"),
    adherence: stage("in-progress"),
    conversion: stage("todo"),
    environment: stage("todo"),
    modelosEditor: stage("todo"),
    implementation: stage("todo"),
    post: stage("todo"),
  },
  isDeleted: false,
  isArchived: false,
  TituloChamado: "Título longo do chamado que também deve permanecer legível",
  EtapasProjeto: "Etapa extensa recebida pelo chamado 0800",
} as unknown as ProjectV2;

describe("ProjectCardV3 no mobile", () => {
  it("mantém conteúdo dentro da largura e reorganiza etapas sem rolagem lateral", () => {
    render(
      <ProjectCardV3
        project={project}
        onClick={vi.fn()}
        onAction={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    const card = screen.getByTestId("project-card");
    expect(card).toHaveClass("min-w-0", "overflow-hidden", "md:overflow-visible");

    const clientName = screen.getByText(project.clientName);
    expect(clientName).toHaveClass("break-words", "md:truncate");

    const pipeline = screen.getAllByText("Infra")[0].parentElement?.parentElement;
    expect(pipeline).toHaveClass("grid", "grid-cols-3", "md:flex");
    expect(pipeline).not.toHaveClass("overflow-x-auto");

    expect(
      screen.getByRole("checkbox", { name: `Selecionar projeto ${project.clientName}` }),
    ).toHaveClass("h-5", "w-5", "md:h-3.5", "md:w-3.5");
    expect(
      screen.getByRole("button", { name: `Ações do projeto ${project.clientName}` }),
    ).toHaveClass("h-10", "w-10", "md:h-7", "md:w-7");
  });
});
