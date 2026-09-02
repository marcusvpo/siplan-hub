import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConversionIssuesTab } from "./ConversionIssuesTab";

vi.mock("@/hooks/useConversionIssues", () => ({
  useConversionIssues: () => ({
    issues: [],
    isLoading: false,
    createIssue: { mutateAsync: vi.fn() },
    updateIssue: { mutateAsync: vi.fn() },
    resolveIssue: { mutateAsync: vi.fn() },
  }),
}));

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({ projects: [] }),
}));

vi.mock("@/hooks/useTeamAreas", () => ({
  useTeamAreas: () => ({ members: [] }),
}));

describe("layout da aba de pendencias", () => {
  it("mantem filtros compactos e responsivos", () => {
    render(
      <ConversionIssuesTab
        currentUserId="user-1"
        currentUserName="Usuario"
        isConversionTeam
      />,
    );

    expect(screen.getByTestId("conversion-issues-tab")).toHaveClass(
      "space-y-2",
    );
    expect(screen.getByPlaceholderText(/Buscar por cliente/)).toHaveClass(
      "h-10",
      "sm:h-8",
    );
    screen.getAllByRole("combobox").forEach((filter) => {
      expect(filter).toHaveClass("h-10", "sm:h-8");
    });
    expect(screen.getByRole("button", { name: /Relatar/ })).toHaveClass(
      "h-10",
      "sm:h-8",
    );
  });
});
