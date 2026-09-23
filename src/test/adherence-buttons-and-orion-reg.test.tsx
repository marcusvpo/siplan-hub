import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormRenderer } from "@/components/FormRenderer/FormRenderer";

describe("AdherenceQuestionField - Botões de Aderência e Rótulos Ergonômicos", () => {
  const mockSchema = {
    type: "object",
    title: "Aderência Teste",
    properties: {
      sec_1: {
        type: "object",
        title: "1. Seção de Teste",
        properties: {
          q_1_1: {
            type: "object",
            title: "Como funciona o fluxo de trabalho?",
            properties: {
              valor: { type: "string", title: "Resposta" },
              impacto: { type: "boolean", title: "Possui algum impacto?", default: false },
              detalhes: { type: "string", title: "Detalhes do Impacto" },
            },
          },
          q_1_2: {
            type: "object",
            title: "A serventia utiliza recurso digital?",
            properties: {
              utiliza: { type: "boolean", title: "Utiliza?", default: false },
              impacto: { type: "boolean", title: "Possui algum impacto?", default: false },
              detalhes: { type: "string", title: "Detalhes do Impacto" },
            },
          },
        },
      },
    },
  };

  const mockUiSchema = {
    sec_1: {
      q_1_1: {
        "ui:field": "adherenceQuestion",
        valor: {
          "ui:widget": "textarea",
        },
      },
      q_1_2: {
        "ui:field": "adherenceQuestion",
      },
    },
  };

  it("renderiza botões de avaliação claros: Aderente, Ponto de Atenção e Não Aderente", () => {
    const onChange = vi.fn();
    render(
      <FormRenderer
        schema={mockSchema}
        uiSchema={mockUiSchema}
        formData={{}}
        onChange={onChange}
      />
    );

    // Deve exibir o rótulo de avaliação de aderência
    expect(screen.getAllByText("Avaliação de Aderência:")).toHaveLength(2);

    // Deve conter botões para cada classificação
    const aderenteBtns = screen.getAllByRole("button", { name: /Aderente/i });
    expect(aderenteBtns.length).toBeGreaterThanOrEqual(2);

    const atencaoBtns = screen.getAllByRole("button", { name: /Ponto de Atenção/i });
    expect(atencaoBtns.length).toBeGreaterThanOrEqual(2);

    const naoAderenteBtns = screen.getAllByRole("button", { name: /Não Aderente/i });
    expect(naoAderenteBtns.length).toBeGreaterThanOrEqual(2);
  });

  it("exibe rótulos amigáveis para pergunta de texto e pergunta booleana", () => {
    render(
      <FormRenderer
        schema={mockSchema}
        uiSchema={mockUiSchema}
        formData={{}}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Situação Atual / Resposta:")).toBeInTheDocument();
    expect(screen.getByText("Utiliza na Serventia?")).toBeInTheDocument();
  });

  it("dispara onChange com nivel_impacto correto ao clicar em Ponto de Atenção e Não Aderente", () => {
    const onChange = vi.fn();
    render(
      <FormRenderer
        schema={mockSchema}
        uiSchema={mockUiSchema}
        formData={{}}
        onChange={onChange}
      />
    );

    const atencaoBtns = screen.getAllByRole("button", { name: /Ponto de Atenção/i });
    fireEvent.click(atencaoBtns[0]);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.formData?.sec_1?.q_1_1?.nivel_impacto).toBe("ATENÇÃO");
    expect(lastCall.formData?.sec_1?.q_1_1?.impacto).toBe(true);
  });
});
