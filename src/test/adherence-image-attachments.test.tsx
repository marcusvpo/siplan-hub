import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormRenderer } from "@/components/FormRenderer/FormRenderer";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  convertVisualToJSONSchema,
  convertVisualToUISchema,
  parseJSONSchemaToVisual,
  VisualQuestion,
  VisualQuestionBuilder,
} from "@/components/FormRenderer/VisualQuestionBuilder";
import {
  countIncompleteTitledImageAttachments,
  getCompletedTitledImageAttachments,
} from "@/lib/form-image-attachments";
import { stripLegacyAdherencePhotoField } from "@/lib/adherence-template";

const adherenceQuestions: VisualQuestion[] = [
  {
    id: "section",
    title: "Setor de Firmas",
    type: "section",
    required: false,
  },
  {
    id: "scanner",
    title: "Utiliza scanner?",
    type: "boolean_adherence",
    required: false,
    allowImages: true,
  },
];

describe("imagens por item da análise de aderência", () => {
  it("remove a galeria geral legada e preserva as imagens por item", () => {
    const schema = {
      type: "object",
      required: ["q_fotos", "sec_1"],
      properties: {
        sec_1: {
          type: "object",
          title: "Setor de Firmas",
          properties: {
            q_1_1: {
              type: "object",
              title: "Utiliza scanner?",
              properties: {
                utiliza: { type: "boolean" },
                impacto: { type: "boolean" },
                detalhes: { type: "string" },
                imagens: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
        q_fotos: {
          type: "array",
          title: "Fotos dos Periféricos",
          items: { type: "string" },
        },
      },
    };
    const uiSchema = {
      sec_1: { q_1_1: { "ui:field": "adherenceQuestion" } },
      q_fotos: { "ui:widget": "imageUpload" },
    };

    const sanitized = stripLegacyAdherencePhotoField(schema, uiSchema);

    expect(sanitized.schema.properties).not.toHaveProperty("q_fotos");
    expect(sanitized.schema.required).toEqual(["sec_1"]);
    expect(sanitized.uiSchema).not.toHaveProperty("q_fotos");
    expect(
      sanitized.schema.properties.sec_1.properties.q_1_1.properties.imagens,
    ).toBeDefined();
  });

  it("remove também a chave padrão da antiga galeria", () => {
    const schema = {
      type: "object",
      properties: {
        q_printer_photos: {
          type: "array",
          title: "Título personalizado",
          items: { type: "string" },
        },
      },
    };

    const sanitized = stripLegacyAdherencePhotoField(schema, {
      q_printer_photos: { "ui:widget": "imageUpload" },
    });

    expect(sanitized.schema.properties).toEqual({});
    expect(sanitized.uiSchema).toEqual({});
  });

  it("preserva a configuração ao publicar e reabrir o template", () => {
    const schema = convertVisualToJSONSchema(
      adherenceQuestions,
      "Aderência",
      "Checklist",
    );
    const uiSchema = convertVisualToUISchema(adherenceQuestions);

    expect(schema.properties.sec_1.properties.q_1_1.properties.imagens).toMatchObject({
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
      },
    });
    expect(parseJSONSchemaToVisual(schema, uiSchema)[1].allowImages).toBe(true);
  });

  it("inicia somente a primeira seção aberta e permite expandir ou recolher cada setor", () => {
    const questions: VisualQuestion[] = [
      ...adherenceQuestions,
      {
        id: "section_2",
        title: "Setor de Escrituras",
        type: "section",
        required: false,
      },
      {
        id: "provisional_receipt",
        title: "Recibo Provisório?",
        type: "boolean_adherence",
        required: false,
      },
    ];
    const schema = convertVisualToJSONSchema(questions, "Aderência", "Checklist");
    const uiSchema = convertVisualToUISchema(questions);

    render(
      <FormRenderer
        projectId="project-test"
        schema={schema}
        uiSchema={uiSchema}
        formData={{}}
        showSubmit={false}
      />,
    );

    const firstSection = screen.getByRole("button", {
      name: "Recolher seção Setor de Firmas",
    });
    const secondSection = screen.getByRole("button", {
      name: "Expandir seção Setor de Escrituras",
    });

    expect(firstSection).toHaveAttribute("aria-expanded", "true");
    expect(secondSection).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Utiliza scanner?")).toBeInTheDocument();
    expect(screen.queryByText("Recibo Provisório?")).not.toBeInTheDocument();

    fireEvent.click(secondSection);
    expect(screen.getByText("Recibo Provisório?")).toBeInTheDocument();

    fireEvent.click(firstSection);
    expect(screen.queryByText("Utiliza scanner?")).not.toBeInTheDocument();
  });

  it("oferece formatação completa nas observações dos itens", () => {
    const schema = convertVisualToJSONSchema(
      adherenceQuestions,
      "Aderência",
      "Checklist",
    );
    const uiSchema = convertVisualToUISchema(adherenceQuestions);

    render(
      <FormRenderer
        projectId="project-test"
        schema={schema}
        uiSchema={uiSchema}
        formData={{}}
        showSubmit={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Negrito" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sublinhado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cor do texto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lista com marcadores" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tamanho da fonte")).toBeInTheDocument();
  });

  it("usa o editor completo no campo geral de itens com impacto", () => {
    const baseSchema = convertVisualToJSONSchema(
      adherenceQuestions,
      "Aderência",
      "Checklist",
    );
    const baseUiSchema = convertVisualToUISchema(adherenceQuestions);
    const schema = {
      ...baseSchema,
      properties: {
        ...baseSchema.properties,
        impact_items: {
          type: "string",
          title:
            "Itens com impacto: (descreva os itens que podem ter impacto na implantação)",
        },
      },
    };
    const uiSchema = {
      ...baseUiSchema,
      impact_items: { "ui:widget": "textarea" },
    };

    render(
      <FormRenderer
        projectId="project-test"
        schema={schema}
        uiSchema={uiSchema}
        formData={{}}
        showSubmit={false}
        compact
      />,
    );

    expect(screen.getAllByRole("button", { name: "Negrito" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Cor do texto" })).toHaveLength(2);
  });

  it("aplica densidade compacta sem reduzir os controles de toque no celular", () => {
    const schema = convertVisualToJSONSchema(
      adherenceQuestions,
      "Aderência",
      "Checklist",
    );
    const uiSchema = convertVisualToUISchema(adherenceQuestions);

    const { container } = render(
      <FormRenderer
        projectId="project-test"
        schema={schema}
        uiSchema={uiSchema}
        formData={{}}
        showSubmit={false}
        compact
      />,
    );

    expect(container.querySelector('[data-density="compact"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recolher seção Setor de Firmas" })).toHaveClass("sm:min-h-10");
    const contentEditable = container.querySelector('[contenteditable="true"]');
    expect(contentEditable).toHaveClass("min-h-[76px]");
    expect(screen.getByRole("button", { name: "Sim" })).toHaveClass("h-10", "sm:h-7");
  });

  it("faz o quadro do editor compacto acompanhar a altura do campo", () => {
    const { container } = render(
      <RichTextEditor content="" onChange={() => undefined} compact />,
    );

    const contentEditable = container.querySelector('[contenteditable="true"]');
    expect(contentEditable?.closest(".group")).toHaveClass("min-h-0");
    expect(contentEditable?.closest(".group")).not.toHaveClass("min-h-[200px]");
  });

  it("preserva estilos permitidos ao exibir observações formatadas", () => {
    const content = JSON.stringify({
      root: {
        type: "root",
        children: [
          {
            type: "paragraph",
            format: "left",
            children: [
              {
                type: "text",
                text: "Atenção ao modelo",
                format: 9,
                style: "color: #ef4444; font-size: 18px; background-image: url(javascript:alert(1))",
              },
            ],
          },
        ],
      },
    });

    render(<RichTextContent content={content} />);

    const formattedText = screen.getByText("Atenção ao modelo");
    expect(formattedText).toHaveClass("font-bold");
    expect(formattedText).toHaveStyle({
      color: "#ef4444",
      fontSize: "18px",
      textDecoration: "underline",
    });
    expect(formattedText.style.backgroundImage).toBe("");
  });

  it("aplica e remove a opção de imagens em todas as perguntas de aderência", () => {
    const onChange = vi.fn();
    const questions: VisualQuestion[] = [
      ...adherenceQuestions.map((question) => ({ ...question, allowImages: false })),
      {
        id: "observacao",
        title: "Observação geral",
        type: "text",
        required: false,
      },
    ];

    const { rerender } = render(
      <VisualQuestionBuilder questions={questions} onChange={onChange} kind="adherence" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aplicar a todos" }));
    const appliedQuestions = onChange.mock.calls.at(-1)?.[0] as VisualQuestion[];
    expect(appliedQuestions.find((question) => question.type === "boolean_adherence")?.allowImages).toBe(true);
    expect(appliedQuestions.find((question) => question.type === "text")?.allowImages).toBeUndefined();

    rerender(
      <VisualQuestionBuilder questions={appliedQuestions} onChange={onChange} kind="adherence" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remover de todos" }));
    const clearedQuestions = onChange.mock.calls.at(-1)?.[0] as VisualQuestion[];
    expect(clearedQuestions.find((question) => question.type === "boolean_adherence")?.allowImages).toBe(false);
  });

  it("mostra somente o botão quando ainda não existe imagem", () => {
    const schema = convertVisualToJSONSchema(
      adherenceQuestions,
      "Aderência",
      "Checklist",
    );
    const uiSchema = convertVisualToUISchema(adherenceQuestions);

    render(
      <FormRenderer
        projectId="project-test"
        schema={schema}
        uiSchema={uiSchema}
        formData={{}}
        showSubmit={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Adicionar imagem" })).toBeInTheDocument();
    expect(screen.queryByText("Imagens do item")).not.toBeInTheDocument();
    expect(screen.queryByTestId("adherence-image-card")).not.toBeInTheDocument();
  });

  it("exibe miniatura e título compacto e permite ampliar a imagem", () => {
    const schema = convertVisualToJSONSchema(
      adherenceQuestions,
      "Aderência",
      "Checklist",
    );
    const uiSchema = convertVisualToUISchema(adherenceQuestions);

    render(
      <FormRenderer
        projectId="project-test"
        schema={schema}
        uiSchema={uiSchema}
        formData={{
          sec_1: {
            q_1_1: {
              imagens: [
                {
                  title: "Scanner atual",
                  url: "https://example.com/scanner.png",
                },
              ],
            },
          },
        }}
        showSubmit={false}
      />,
    );

    const imageCard = screen.getByTestId("adherence-image-card");
    expect(within(imageCard).getByRole("img", { name: "Scanner atual" })).toBeInTheDocument();
    expect(within(imageCard).getByLabelText("Título da imagem")).toHaveValue("Scanner atual");

    fireEvent.click(
      within(imageCard).getByRole("button", { name: "Ampliar imagem Scanner atual" }),
    );

    const previewDialog = screen.getByTestId("adherence-image-preview-dialog");
    expect(previewDialog).toHaveAttribute("role", "dialog");
    expect(within(previewDialog).getByRole("heading", { name: "Scanner atual" })).toBeInTheDocument();
    expect(within(previewDialog).getByRole("img", { name: "Scanner atual" })).toHaveAttribute(
      "src",
      "https://example.com/scanner.png",
    );
  });

  it("exige título e arquivo apenas para linhas iniciadas", () => {
    const data = {
      sec_1: {
        q_1_1: {
          imagens: [
            { title: "Scanner", url: "https://example.com/scanner.png" },
            { title: "Sem arquivo", url: "" },
            { title: "", url: "https://example.com/sem-titulo.png" },
            { title: "", url: "" },
          ],
        },
      },
    };

    expect(countIncompleteTitledImageAttachments(data)).toBe(2);
    expect(getCompletedTitledImageAttachments(data.sec_1.q_1_1.imagens)).toHaveLength(2);
  });
});
