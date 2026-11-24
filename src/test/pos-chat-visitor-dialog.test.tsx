import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PosChatVisitorDialog } from "@/components/pos-chat/PosChatVisitorDialog";

const defaultProps = {
  open: true,
  projectName: "Cartório Central",
  currentVisitor: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  onOpenChange: vi.fn(),
  onRegisterVisitor: vi.fn().mockResolvedValue(true),
};

describe("identificação do usuário no chat pós-implantação", () => {
  it("cadastra nome e setor sem expor lista de outros visitantes do cartório", async () => {
    const onRegisterVisitor = vi.fn().mockResolvedValue(true);
    const onOpenChange = vi.fn();

    render(
      <PosChatVisitorDialog
        {...defaultProps}
        onRegisterVisitor={onRegisterVisitor}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.queryByText("Já usei antes")).not.toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText("Seu nome"), {
      target: { value: "João Lima" },
    });
    fireEvent.change(screen.getByLabelText("Setor do cartório"), {
      target: { value: "Notas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar para o assistente" }));

    await waitFor(() => {
      expect(onRegisterVisitor).toHaveBeenCalledWith("João Lima", "Notas");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
