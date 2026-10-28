import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AdvancedFilters } from "@/components/ProjectManagement/AdvancedFilters";
import { useFilterStore } from "@/stores/filterStore";

describe("AdvancedFilters", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    window.dispatchEvent(new Event("resize"));
    useFilterStore.setState({
      searchQuery: "",
      viewPreset: "active",
      healthScore: "all",
      currentStage: "all",
      stageStatus: "all",
      projectLeader: "",
      systemType: "",
      sortOrder: "uat-desc",
      dateFrom: "",
      dateTo: "",
      savedFilters: [],
      activeFilterId: null,
      isFilterPanelOpen: true,
      status: "all",
    });
  });

  it("exibe o subfiltro fluido em 320 px somente após selecionar uma etapa", () => {
    render(<AdvancedFilters leaders={[]} systemTypes={[]} />);

    expect(
      screen.queryByTestId("project-stage-status-filter"),
    ).not.toBeInTheDocument();

    act(() => useFilterStore.getState().setCurrentStage("infra"));

    const subfilter = screen.getByTestId("project-stage-status-filter");
    expect(subfilter).toBeVisible();
    expect(subfilter).toHaveClass("w-full");
    expect(screen.getByText("Status de Infraestrutura")).toBeVisible();
    expect(screen.getAllByText("Em Andamento").length).toBeGreaterThan(0);
  });
});
