import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { signOut, logActivity } = vi.hoisted(() => ({
  signOut: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", email: "admin@siplan.com.br" },
    role: "admin",
    loading: false,
    permissionsLoaded: true,
    signOut,
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    canManageUsers: true,
    hasPermission: () => true,
  }),
}));

vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ theme: "light" }),
}));

vi.mock("@/services/activityLogger", () => ({
  activityLogger: { log: logActivity },
}));

import AdminLayout from "@/layouts/AdminLayout";

function renderAdminLayout() {
  return render(
    <MemoryRouter initialEntries={["/admin/roles"]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="roles" element={<div>Conteúdo de perfis</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("menu lateral do painel administrativo", () => {
  beforeEach(() => {
    localStorage.removeItem("admin-sidebar-collapsed");
    signOut.mockReset();
    logActivity.mockReset();
  });

  it("recolhe no desktop e salva a preferência", () => {
    renderAdminLayout();

    const sidebar = screen.getByRole("complementary", {
      name: "Navegação administrativa",
    });
    expect(sidebar).toHaveAttribute("data-collapsed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Recolher menu lateral" }));

    expect(sidebar).toHaveAttribute("data-collapsed", "true");
    expect(localStorage.getItem("admin-sidebar-collapsed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Expandir menu lateral" }),
    ).toBeInTheDocument();
  });

  it("restaura o estado recolhido salvo anteriormente", () => {
    localStorage.setItem("admin-sidebar-collapsed", "true");
    renderAdminLayout();

    expect(
      screen.getByRole("complementary", { name: "Navegação administrativa" }),
    ).toHaveAttribute("data-collapsed", "true");
  });

  it("mantém a gaveta móvel fechada por padrão e permite abrir e fechar", () => {
    renderAdminLayout();

    const sidebar = screen.getByRole("complementary", {
      name: "Navegação administrativa",
    });
    const trigger = screen.getByRole("button", { name: "Abrir menu lateral" });

    expect(sidebar).toHaveAttribute("data-mobile-open", "false");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(sidebar).toHaveAttribute("data-mobile-open", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(sidebar).toHaveAttribute("data-mobile-open", "false");
  });
});
