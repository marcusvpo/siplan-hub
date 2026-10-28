import { beforeEach, describe, expect, it } from "vitest";
import { useFilterStore } from "@/stores/filterStore";

describe("filterStore: status da etapa", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useFilterStore.setState({
      currentStage: "all",
      stageStatus: "all",
      savedFilters: [],
      activeFilterId: null,
    });
  });

  it("inicia uma etapa em andamento e limpa o status ao remover a etapa", () => {
    useFilterStore.getState().setCurrentStage("infra");
    expect(useFilterStore.getState().stageStatus).toBe("in-progress");

    useFilterStore.getState().setStageStatus("done");
    useFilterStore.getState().setCurrentStage("all");

    expect(useFilterStore.getState().stageStatus).toBe("all");
  });

  it("inclui o status da etapa nos filtros salvos", () => {
    useFilterStore.getState().setCurrentStage("adherence");
    useFilterStore.getState().setStageStatus("waiting_adjustment");
    useFilterStore.getState().saveFilter("Aderência em adequação");

    const savedFilter = useFilterStore.getState().savedFilters[0];
    expect(savedFilter.filters.stageStatus).toBe("waiting_adjustment");

    useFilterStore.getState().setCurrentStage("infra");
    useFilterStore.getState().loadFilter(savedFilter.id);

    expect(useFilterStore.getState().currentStage).toBe("adherence");
    expect(useFilterStore.getState().stageStatus).toBe("waiting_adjustment");
  });
});
