import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hasPermission = vi.fn();
const permissionsLoaded = vi.fn(() => true);

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ permissionsLoaded: permissionsLoaded() }),
}));

import { RequirePermission } from "@/components/auth/RequirePermission";

const Protegido = () => <div>conteudo secreto</div>;

function renderGuard(resource = "reports", action?: string) {
  return render(
    <MemoryRouter>
      <RequirePermission resource={resource} action={action}>
        <Protegido />
      </RequirePermission>
    </MemoryRouter>,
  );
}

describe("RequirePermission", () => {
  beforeEach(() => {
    hasPermission.mockReset();
    permissionsLoaded.mockReturnValue(true);
  });

  it("renderiza o conteúdo quando o perfil tem a permissão", () => {
    hasPermission.mockReturnValue(true);
    renderGuard();
    expect(screen.getByText("conteudo secreto")).toBeInTheDocument();
  });

  it("bloqueia e não renderiza o conteúdo sem a permissão", () => {
    hasPermission.mockReturnValue(false);
    renderGuard();
    expect(screen.queryByText("conteudo secreto")).not.toBeInTheDocument();
    expect(screen.getByText("Acesso negado")).toBeInTheDocument();
  });

  it("checa a ação 'view' por padrão", () => {
    hasPermission.mockReturnValue(true);
    renderGuard("kanban");
    expect(hasPermission).toHaveBeenCalledWith("kanban", "view");
  });

  it("respeita a ação explícita", () => {
    hasPermission.mockReturnValue(true);
    renderGuard("commercial_checklist_questions", "manage");
    expect(hasPermission).toHaveBeenCalledWith(
      "commercial_checklist_questions",
      "manage",
    );
  });

  // Negar antes das permissões chegarem mostraria "Acesso negado" a quem tem
  // acesso, e o usuário sairia da tela achando que perdeu permissão.
  it("não nega enquanto as permissões ainda estão carregando", () => {
    permissionsLoaded.mockReturnValue(false);
    hasPermission.mockReturnValue(false);
    renderGuard();
    expect(screen.queryByText("Acesso negado")).not.toBeInTheDocument();
    expect(screen.queryByText("conteudo secreto")).not.toBeInTheDocument();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });
});
