import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { plainTextToLexicalJson, richTextToPlainText } from "@/lib/lexical";

const mocks = vi.hoisted(() => ({
  improve: vi.fn(),
  reset: vi.fn(),
  toast: vi.fn(),
  job: undefined as
    | {
        id: string;
        status: string;
        resultText?: string;
        errorMessage?: string;
      }
    | undefined,
}));

vi.mock("@/hooks/useAiTextImprovement", () => ({
  useAiTextImprovement: () => ({
    improve: mocks.improve,
    reset: mocks.reset,
    job: mocks.job,
    active:
      mocks.job?.status === "pending" || mocks.job?.status === "processing",
    error: null,
  }),
}));
vi.mock("@/hooks/useModelGenerationJobs", () => ({
  useModelWorkerStatus: () => ({ online: true }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock("@/components/ui/rich-text-editor", () => ({
  RichTextEditor: ({
    content,
    onChange,
    editable = true,
  }: {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
  }) => (
    <textarea
      aria-label={editable ? "Editor rico" : "Previa rica"}
      value={content}
      onChange={(event) => onChange(event.target.value)}
      readOnly={!editable}
    />
  ),
}));

import { AiRichTextField } from "@/components/ui/ai-rich-text-field";

function TestField() {
  const [content, setContent] = useState(
    plainTextToLexicalJson("Texto original com informações importantes."),
  );
  return (
    <AiRichTextField
      label="Anotações"
      content={content}
      onChange={setContent}
      requestedBy="profile-1"
      targetField="cs_cx_contact:draft:notes"
    />
  );
}

describe("AiRichTextField", () => {
  beforeEach(() => {
    mocks.improve.mockReset();
    mocks.improve.mockResolvedValue(undefined);
    mocks.reset.mockReset();
    mocks.toast.mockReset();
    mocks.job = undefined;
  });

  it("envia o texto ao Codex sem alterar imediatamente o editor", async () => {
    render(<TestField />);
    const editor = screen.getByLabelText("Editor rico") as HTMLTextAreaElement;
    const original = editor.value;

    fireEvent.click(screen.getByRole("button", { name: "Melhorar com IA" }));

    await waitFor(() => expect(mocks.improve).toHaveBeenCalledWith(original));
    expect(editor.value).toBe(original);
  });

  it("só substitui o texto quando o usuário aceita a sugestão", () => {
    mocks.job = {
      id: "job-1",
      status: "done",
      resultText: "**Texto revisado**\n- Próximo passo confirmado",
    };
    render(<TestField />);
    const editor = screen.getByLabelText("Editor rico") as HTMLTextAreaElement;

    expect(richTextToPlainText(editor.value)).toBe(
      "Texto original com informações importantes.",
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Texto revisado",
    );
    const preview = screen.getByLabelText("Previa rica") as HTMLTextAreaElement;
    expect(JSON.parse(preview.value).root.children[0].children[0].format).toBe(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Substituir pela sugestão" }),
    );

    const updatedEditor = screen.getByLabelText(
      "Editor rico",
    ) as HTMLTextAreaElement;
    expect(richTextToPlainText(updatedEditor.value)).toBe(
      "Texto revisado\n• Próximo passo confirmado",
    );
    expect(mocks.reset).toHaveBeenCalled();
  });
});
