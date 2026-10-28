import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Accordion } from "@/components/ui/accordion";
import { CollapsibleFieldSection } from "./CollapsibleFieldSection";
import { StageCard } from "./StageCard";

vi.mock("@/components/ui/autocomplete-input", () => ({
  AutocompleteInput: () => null,
}));

vi.mock("@/components/ProjectManagement/Forms/ObservationsWithAI", () => ({
  ObservationsWithAI: () => null,
}));

describe("blocos expansíveis da preparação de ambiente", () => {
  it("destaca a configuração no Orion Admin e explica a ação disponível", () => {
    render(
      <CollapsibleFieldSection title="Configuração no Orion Admin">
        <p>Conteúdo da configuração</p>
      </CollapsibleFieldSection>,
    );

    const trigger = screen.getByRole("button", {
      name: "Expandir Configuração no Orion Admin",
    });

    expect(trigger).toHaveClass("min-h-11", "w-full", "text-left");
    expect(trigger).toHaveTextContent("Clique para expandir");
    expect(trigger.parentElement).toHaveClass("border-primary/40", "bg-primary/5");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveTextContent("Clique para recolher");
    expect(trigger.parentElement).toHaveClass("border-neutral-200", "bg-neutral-50/30");
    expect(trigger.parentElement).not.toHaveClass("border-primary/40", "bg-primary/5");
    expect(screen.getByText("Conteúdo da configuração")).toBeVisible();
  });

  it("destaca os dados de conexão e mantém seu conteúdo recolhido até o clique", () => {
    render(
      <Accordion type="single" defaultValue="environment" collapsible>
        <StageCard
          id="environment"
          label="4. Preparação de Ambiente"
          status="in-progress"
          responsible=""
          onUpdate={() => undefined}
          specificFieldsTitle="Dados de conexão"
          collapsibleSpecificFields
        >
          <p>Campo de conexão</p>
        </StageCard>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", {
      name: "Expandir campos específicos",
    });

    expect(trigger).toHaveClass("min-h-11", "w-full", "text-left");
    expect(trigger).toHaveTextContent("Dados de conexão");
    expect(trigger).toHaveTextContent("Clique para expandir");
    expect(screen.queryByText("Campo de conexão")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger.parentElement?.parentElement).toHaveClass(
      "border-neutral-200",
      "bg-neutral-50/30",
    );
    expect(screen.getByText("Campo de conexão")).toBeVisible();
  });
});
