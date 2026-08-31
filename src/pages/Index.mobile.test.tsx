import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Index from "./Index";

vi.mock("@/components/ProjectManagement/ProjectGrid", () => ({
  ProjectGrid: () => <div>Grade de projetos</div>,
}));

vi.mock("@/components/NewProjectDialog", () => ({
  NewProjectDialog: () => <button>Novo projeto</button>,
}));

vi.mock("@/components/ProjectManagement/ProjectTagsLegendDialog", () => ({
  ProjectTagsLegendDialog: () => <button>Guia</button>,
}));

describe("página de projetos no mobile", () => {
  it("possui rolagem vertical própria e bloqueia estouro horizontal", () => {
    render(<Index />);

    expect(screen.getByTestId("projects-page")).toHaveClass(
      "h-full",
      "overflow-y-auto",
      "overflow-x-hidden",
    );
    expect(screen.getByRole("heading", { name: "Projetos Ativos" })).toHaveClass(
      "text-lg",
      "sm:text-xl",
    );
  });
});
