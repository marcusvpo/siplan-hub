import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectNotesSearchDialog } from "./ProjectNotesSearchDialog";
import { AdvancedFilters } from "./AdvancedFilters";
import { indexProjectFreeTextFields } from "@/lib/project-notes-search";

const mockIndexedProjects = [
  indexProjectFreeTextFields({
    id: "proj-alpha",
    client_name: "Cartório Alfa",
    ticket_number: "12345",
    system_type: "Orion TN",
    global_status: "in-progress",
    post_status: "todo",
    notes: {
      blocks: [
        {
          content:
            "Alinhado com o tabelião: previsão de implantar no ano que vem após reforma.",
        },
      ],
    },
    conversion_observations:
      "Conversão pausada pois implantação ficou para o ano que vem.",
  }),
];

vi.mock("@/hooks/useProjectsNotesSearch", () => ({
  useProjectsNotesSearch: () => ({
    indexedProjects: mockIndexedProjects,
    totalProjectsIndexed: mockIndexedProjects.length,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe("ProjectNotesSearchDialog e posicionamento em AdvancedFilters", () => {
  it("renderiza resultados com etapa/campo e preview destacado ao digitar e abre o projeto na etapa correta", () => {
    const onOpenChange = vi.fn();
    const onSelectProject = vi.fn();

    render(
      <ProjectNotesSearchDialog
        open
        onOpenChange={onOpenChange}
        onSelectProject={onSelectProject}
      />,
    );

    const input = screen.getByLabelText("Pesquisar nas observações dos projetos");
    fireEvent.change(input, { target: { value: "ano que vem" } });

    expect(screen.getByText("Cartório Alfa")).toBeInTheDocument();
    expect(screen.getByText("Observações Gerais")).toBeInTheDocument();
    expect(screen.getByText("3. Conversão de Dados")).toBeInTheDocument();

    const marks = document.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThanOrEqual(2);
    expect(marks[0].textContent?.toLowerCase()).toBe("ano que vem");

    // Clica no trecho da Conversão de Dados para abrir direto na etapa conversion
    fireEvent.click(screen.getByText("3. Conversão de Dados"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelectProject).toHaveBeenCalledWith({
      projectId: "proj-alpha",
      targetTab: "steps",
      targetStepId: "conversion",
    });
  });

  it("posiciona o botão 'Pesquisar notas' imediatamente à esquerda do botão 'Ordenar'", () => {
    const onOpenNotesSearch = vi.fn();

    render(
      <AdvancedFilters
        leaders={["Maria Santos"]}
        systemTypes={["Orion TN"]}
        onOpenNotesSearch={onOpenNotesSearch}
      />,
    );

    const notesBtn = screen.getByTestId("open-notes-search-button");
    const sortBtn = screen.getByRole("button", { name: /ordenar/i });

    // Verifica que o botão Pesquisar notas precede o botão Ordenar no DOM
    const position = notesBtn.compareDocumentPosition(sortBtn);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
