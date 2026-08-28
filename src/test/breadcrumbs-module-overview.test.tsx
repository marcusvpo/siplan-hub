import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({ projects: [] }),
}));

import { Breadcrumbs } from "@/components/Layout/Breadcrumbs";

function renderBreadcrumbs(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Breadcrumbs />
    </MemoryRouter>,
  );
}

describe("breadcrumbs das visões gerais", () => {
  it("leva o breadcrumb Assistentes para a rota geral do módulo", () => {
    renderBreadcrumbs("/assistentes/conhecimento");

    expect(screen.getByRole("link", { name: "Assistentes" })).toHaveAttribute(
      "href",
      "/assistentes",
    );
  });

  it("inclui a visão geral de Implantação em rotas que usam outro prefixo", () => {
    renderBreadcrumbs("/projects");

    expect(screen.getByRole("link", { name: "Implantação" })).toHaveAttribute(
      "href",
      "/implantacao",
    );
    expect(screen.getByText("Projetos")).toBeInTheDocument();
  });

  it("mantém chamados dentro do contexto do Dashboard", () => {
    renderBreadcrumbs("/deployments/tickets");

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByText("Consultar Chamados")).toBeInTheDocument();
  });

  it("leva o painel de indicadores de volta à visão geral do Dashboard", () => {
    renderBreadcrumbs("/dashboard/indicadores");

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByText("Painel de Indicadores")).toBeInTheDocument();
  });
});
