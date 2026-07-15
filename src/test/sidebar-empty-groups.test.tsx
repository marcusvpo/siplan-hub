import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * O incidente de 15/07/2026: o perfil 'user' tinha menu_implantadores.view mas
 * nenhuma tela do módulo. Com as guardas de rota, o menu aparecia e tudo dentro
 * dava "Acesso negado".
 *
 * Estes testes cobrem o caso que faltava: não só "sem permissão → bloqueia",
 * mas "com o menu e sem as telas → não oferece o caminho quebrado".
 */

const hasPermission = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission, isAdmin: false }),
}));

import Home from "@/pages/Home";

function renderHome(permitidas: string[]) {
  hasPermission.mockImplementation((resource: string, action: string) =>
    permitidas.includes(`${resource}:${action}`),
  );
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe("Home — grupo sem subitem acessível", () => {
  beforeEach(() => {
    hasPermission.mockReset();
  });

  // Exatamente o estado do perfil 'user' durante o incidente.
  it("esconde Implantadores quando só o menu está liberado", () => {
    renderHome(["menu_implantadores:view"]);
    expect(screen.queryByText("Implantadores")).not.toBeInTheDocument();
  });

  it("mostra Implantadores quando ao menos uma tela está liberada", () => {
    renderHome(["menu_implantadores:view", "implantadores_home:view"]);
    expect(screen.getByText("Implantadores")).toBeInTheDocument();
  });

  it("esconde Comercial com o menu mas sem nenhuma tela", () => {
    renderHome(["menu_comercial:view"]);
    expect(screen.queryByText("Comercial")).not.toBeInTheDocument();
  });

  it("não mostra nada de módulo para perfil sem permissão alguma", () => {
    renderHome([]);
    expect(screen.queryByText("Implantação")).not.toBeInTheDocument();
    expect(screen.queryByText("Comercial")).not.toBeInTheDocument();
    expect(screen.queryByText("Conversão")).not.toBeInTheDocument();
  });
});
