import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PosChatVisitorDialog } from "@/components/pos-chat/PosChatVisitorDialog";

const visitor = {
  id: "visitor-1",
  name: "Maria Souza",
  sector: "Atendimento",
  last_seen_at: "2026-08-21T14:00:00.000Z",
};

const defaultProps = {
  open: true,
  projectName: "Cartório Central",
  visitors: [],
  currentVisitor: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  onOpenChange: vi.fn(),
  onSelectVisitor: vi.fn().mockResolvedValue(true),
  onRegisterVisitor: vi.fn().mockResolvedValue(true),
};

describe("identificação do usuário no chat pós-implantação", () => {
  it("cadastra nome e setor no primeiro acesso", async () => {
    const onRegisterVisitor = vi.fn().mockResolvedValue(true);
    const onOpenChange = vi.fn();

    render(
      <PosChatVisitorDialog
        {...defaultProps}
        onRegisterVisitor={onRegisterVisitor}
        onOpenChange={onOpenChange}
      />
    );

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

  it("permite selecionar uma pessoa já cadastrada", async () => {
    const onSelectVisitor = vi.fn().mockResolvedValue(true);

    render(
      <PosChatVisitorDialog
        {...defaultProps}
        visitors={[visitor]}
        onSelectVisitor={onSelectVisitor}
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: /Maria Souza/i }));

    await waitFor(() => {
      expect(onSelectVisitor).toHaveBeenCalledWith(visitor);
    });
  });
});
