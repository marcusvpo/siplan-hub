import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useChamados0800", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useChamados0800")>(
    "@/hooks/useChamados0800",
  );
  return {
    ...actual,
    useChamadoTramites: () => ({ tramites: [], isLoading: false, error: null }),
  };
});

import { Chamado0800DetailDialog } from "@/components/ProjectManagement/Chamado0800DetailDialog";

describe("Detalhes do chamado no mobile", () => {
  it("usa largura segura, metadados verticais e abas ajustáveis", () => {
    render(
      <Chamado0800DetailDialog
        chamado={{
          numeroChamado: "90001",
          titulo: "Chamado com um título extenso que precisa quebrar em várias linhas",
          nomeCliente: "Cartório com nome muito extenso para uma única linha no celular",
          solicitante: "Solicitante com nome completo",
          status: "Em atendimento",
          dataAbertura: "2026-08-01",
          descricao: "Descrição do chamado.",
        }}
        onClose={vi.fn()}
        showTramites
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass(
      "w-[calc(100vw-1rem)]",
      "overflow-x-hidden",
      "p-4",
    );

    const metadata = screen.getByText("Serventia").parentElement?.parentElement;
    expect(metadata).toHaveClass("grid-cols-1", "sm:grid-cols-2");
    expect(screen.getByText("Cartório com nome muito extenso para uma única linha no celular")).toHaveClass(
      "break-words",
    );
    expect(screen.getByRole("tablist")).toHaveClass("w-full", "grid-cols-2");
  });
});
