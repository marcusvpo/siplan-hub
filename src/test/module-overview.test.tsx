import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hasPermission = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission, isAdmin: false }),
}));

import ModuleOverview from "@/pages/ModuleOverview";

describe("ModuleOverview", () => {
  beforeEach(() => {
    hasPermission.mockReset();
  });

  it("lista somente as áreas permitidas do módulo", () => {
    hasPermission.mockImplementation(
      (resource: string, action: string) =>
        action === "view" && resource === "assistants_knowledge",
    );

    render(
      <MemoryRouter>
        <ModuleOverview moduleName="Assistentes" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Assistentes" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Base de Conhecimento Orion TN/i }),
    ).toHaveAttribute("href", "/assistentes/conhecimento");
    expect(screen.queryByText("Logs & Analytics Pós-Implantação")).not.toBeInTheDocument();
    expect(screen.queryByText("Links e Chats")).not.toBeInTheDocument();
  });

  it("mostra orientação quando nenhuma tela está liberada", () => {
    hasPermission.mockReturnValue(false);

    render(
      <MemoryRouter>
        <ModuleOverview moduleName="Comercial" />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Nenhuma área disponível para o seu perfil."),
    ).toBeInTheDocument();
  });

  it("usa o mesmo padrão e as permissões no módulo Implantadores", () => {
    hasPermission.mockImplementation(
      (resource: string, action: string) =>
        action === "view" && resource === "implantadores_aderencia",
    );

    render(
      <MemoryRouter>
        <ModuleOverview moduleName="Implantadores" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Implantadores" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Editor de Aderência/i })).toHaveAttribute(
      "href",
      "/implantadores/aderencia",
    );
    expect(screen.queryByText("Homologação de Conversões")).not.toBeInTheDocument();
  });

  it("separa a visão geral do painel de indicadores do Dashboard", () => {
    hasPermission.mockImplementation(
      (resource: string, action: string) =>
        action === "view" && resource === "dashboard_view",
    );

    render(
      <MemoryRouter>
        <ModuleOverview moduleName="Dashboard" />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard/indicadores",
    );
    expect(screen.queryByText("Quadro Kanban")).not.toBeInTheDocument();
  });

  it("usa o padrão compartilhado também na visão geral de CS/CX", () => {
    hasPermission.mockImplementation(
      (resource: string, action: string) =>
        action === "view" && resource === "cs_cx_cartorios",
    );

    render(
      <MemoryRouter>
        <ModuleOverview moduleName="CS/CX" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "CS/CX", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cartórios/i })).toHaveAttribute(
      "href",
      "/cs-cx/cartorios",
    );
    expect(screen.queryByText("Solicitações")).not.toBeInTheDocument();
  });

  it("apresenta as telas de horas liberadas na visão geral do SD", () => {
    hasPermission.mockImplementation(
      (resource: string, action: string) =>
        action === "view" && resource === "sd_time_entries",
    );

    render(
      <MemoryRouter>
        <ModuleOverview moduleName="SD" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "SD", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gerenciamento de horas/i })).toHaveAttribute(
      "href",
      "/sd/horas",
    );
    expect(screen.queryByText("Consulta de horas")).not.toBeInTheDocument();
  });
});
